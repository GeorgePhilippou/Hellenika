/* ============================================================
   Hellenika — Interactive timeline canvas

   A canvas rather than DOM nodes: the dataset can grow to
   thousands of markers without the browser building thousands
   of elements, and dragging stays at 60fps.

   Interaction model
     · drag horizontally to pan
     · wheel / pinch to zoom about the pointer
     · click a period band to open it
     · click an event marker to open that entity
   ============================================================ */

import { clamp, fitCanvas, animate, easeOutCubic, fmtYear, prefersReducedMotion } from '../util.js';
import { TIME_MIN, TIME_MAX } from '../store.js';

const PAD_L = 14, PAD_R = 14;
const AXIS_H = 30;
const LANE_GAP = 8;

/** Read a CSS custom property from the document root. */
const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

const WORLD_LANE_TINTS = ['world-egypt', 'world-neareast', 'world-rome', 'world-carthage', 'world-india', 'world-china'];

export function createTimeline(canvas, {
  periods,
  markers = [],       // [{ year, entity }]
  worldPeriods = [],  // lightweight "rest of the world" context bands
  worldEvents = [],   // [{ id, name, year, lane, note }]
  onPeriodClick,
  onMarkerClick,
  onHover,
  onViewChange,
}) {
  const ctx = canvas.getContext('2d', { alpha: false });

  // View state: [viewStart, viewEnd] in years.
  let vStart = TIME_MIN, vEnd = TIME_MAX;
  let W = 0, H = 0;
  let hot = null;             // hovered hit-region
  let cursorYear = null;      // year under the pointer
  let playhead = null;        // externally driven year marker
  let hitRegions = [];
  let raf = null;

  const span = () => vEnd - vStart;
  const xOf = (y) => PAD_L + ((y - vStart) / span()) * (W - PAD_L - PAD_R);
  const yearAt = (x) => vStart + ((x - PAD_L) / (W - PAD_L - PAD_R)) * span();

  /**
   * Tick spacing is chosen from available pixels, not just the year span,
   * so labels never collide on a narrow screen.
   */
  function tickStep() {
    const s = span();
    const usable = Math.max(1, W - PAD_L - PAD_R);
    const MIN_LABEL_PX = W < 520 ? 92 : 78;
    // Smallest step that still leaves room for its label.
    for (const step of [1, 5, 10, 25, 50, 100, 250, 500, 1000]) {
      if ((step / s) * usable >= MIN_LABEL_PX) return step;
    }
    return 1000;
  }

  /* ---------- Layout: assign bands to lanes within a vertical budget ----------
     Shared by the Greek period ribbon and the World-context band below it —
     both are "items with a lane number get stacked into equal-height rows
     inside some (topY, availHeight) box." Only the budget differs. */
  function layoutBand(items, laneCount, topY, availHeight, minLaneH, gap = LANE_GAP) {
    const laneH = Math.max(minLaneH, (availHeight - gap * (laneCount - 1)) / laneCount);
    return items.map((p) => ({
      p,
      lane: p.lane ?? 0,
      y: topY + (p.lane ?? 0) * (laneH + gap),
      h: laneH,
    }));
  }

  const GREEK_LANES = Math.max(...periods.map((p) => p.lane ?? 0)) + 1;
  const WORLD_LANES_N = WORLD_LANE_TINTS.length;

  // Bar rows are flat and fixed-height now (no more stretch-to-fit blocks),
  // so the vertical budget is a straightforward top-to-bottom stack rather
  // than a flexible 70/30 split.
  const GREEK_LANE_H = 24, GREEK_LANE_GAP = 4;
  const WORLD_LANE_H = 12, WORLD_LANE_GAP = 3;
  const GREEK_EVENTS_H = 70;   // spine + up to 3 stacked label tiers
  const WORLD_EVENTS_H = 48;   // spine + up to 2 stacked label tiers

  /**
   * Vertical budget for the whole canvas, top to bottom:
   *   top gap → Greek period bars → Greek events (own line) → divider →
   *   World period bars → World events → axis.
   * Each section has a fixed height; any extra canvas height becomes
   * breathing room between sections rather than stretching the bars.
   */
  function layoutMetrics() {
    const greekRibbonH = GREEK_LANES * GREEK_LANE_H + (GREEK_LANES - 1) * GREEK_LANE_GAP;
    const worldRibbonH = WORLD_LANES_N * WORLD_LANE_H + (WORLD_LANES_N - 1) * WORLD_LANE_GAP;
    const dividerH = 20;

    const contentH = greekRibbonH + GREEK_EVENTS_H + dividerH + worldRibbonH + WORLD_EVENTS_H;
    const available = Math.max(contentH, H - AXIS_H - 16);
    const slack = Math.max(0, available - contentH);
    // Distribute slack across the four gaps between sections.
    const gap = 14 + slack / 4;

    let y = Math.max(10, gap * 0.5);
    const greekTop = y;
    y += greekRibbonH + gap;
    const greekEventsTop = y;
    const greekSpineY = greekEventsTop + GREEK_EVENTS_H - 10;
    y += GREEK_EVENTS_H + gap;
    const dividerY = y + dividerH * 0.6;
    y += dividerH + gap * 0.6;
    const worldTop = y;
    y += worldRibbonH + gap * 0.7;
    const worldEventsTop = y;
    const worldSpineY = worldEventsTop + WORLD_EVENTS_H - 8;

    return {
      greekTop, greekRibbonH,
      greekEventsTop, greekSpineY,
      dividerY,
      worldTop, worldRibbonH,
      worldEventsTop, worldSpineY,
    };
  }

  /**
   * Places dated markers on a single labelled "events line": a spine with
   * a dot per marker, and — where there's room — a short leader up to a
   * text label stacked into whichever of `tiers` vertical rows doesn't
   * collide with a label already placed there. Markers that don't fit
   * any tier still get their dot, just no label (same degrade-gracefully
   * approach as the period band labels).
   */
  function placeEventLabels(sorted, { tiers, lineH, fmt }) {
    const rowsRight = new Array(tiers).fill(-Infinity);
    const placed = [];
    for (const item of sorted) {
      const label = fmt(item);
      const tw = ctx.measureText(label).width;
      const half = tw / 2;
      let tier = -1;
      for (let t = 0; t < tiers; t++) {
        if (item.x - half - 6 >= rowsRight[t]) { tier = t; break; }
      }
      if (tier >= 0) {
        rowsRight[tier] = item.x + half;
        placed.push({ ...item, label, tier, tw });
      } else {
        placed.push({ ...item, label: null, tier: -1, tw: 0 });
      }
    }
    return placed;
  }

  /* ---------- Draw ---------- */
  function draw() {
    raf = null;
    ({ w: W, h: H } = fitCanvas(canvas, ctx));

    const surface = cssVar('--surface');
    const text = cssVar('--text');
    const text3 = cssVar('--text-3');
    const border = cssVar('--border');

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, W, H);

    hitRegions = [];

    /* --- vertical grid --- */
    const step = tickStep();
    const first = Math.ceil(vStart / step) * step;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = first; y <= vEnd; y += step) {
      const x = Math.round(xOf(y)) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H - AXIS_H);
    }
    ctx.stroke();

    const metrics = layoutMetrics();
    const uiFont = cssVar('--font-ui') || 'system-ui';

    /* --- Greek period bars: a flat, clean line of segments --- */
    ctx.font = `700 10px ${uiFont}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = text3;
    ctx.fillText('ANCIENT GREECE', PAD_L, metrics.greekTop - 6);

    const laid = layoutBand(periods, GREEK_LANES, metrics.greekTop, metrics.greekRibbonH, GREEK_LANE_H, GREEK_LANE_GAP);
    for (const { p, y, h } of laid) {
      const x0 = xOf(p.start), x1 = xOf(p.end);
      if (x1 < -40 || x0 > W + 40) continue;
      const w = Math.max(2, x1 - x0);
      const colour = cssVar(`--p-${p.tint}`);
      const isHot = hot?.kind === 'period' && hot.id === p.id;

      // Flat, solid segment — no gradient, no drop shadow. The clean
      // colour-block-in-a-row is the whole point of this redesign.
      ctx.save();
      roundRect(ctx, x0, y, w, h, 3);
      ctx.fillStyle = colour;
      ctx.globalAlpha = isHot ? 1 : 0.92;
      ctx.fill();
      ctx.restore();

      if (isHot) {
        ctx.save();
        roundRect(ctx, x0, y, w, h, 3);
        ctx.strokeStyle = text;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Label — only when the full name genuinely fits inside the band.
      // A clipped half-word ("ellenistic Period") reads as a rendering
      // bug; the hover tooltip covers the narrow cases instead.
      if (w > 54) {
        ctx.save();
        ctx.font = `600 ${Math.min(12, h * 0.46)}px ${uiFont}`;
        ctx.textBaseline = 'middle';
        // Degrade gracefully: full name → shortest alias → first word → none.
        const PAD = 10;
        const fits = (s) => ctx.measureText(s).width + PAD <= w;
        const candidates = [
          p.name,
          ...(p.altNames || []).slice().sort((a, b) => a.length - b.length),
          p.name.split(' ')[0],
        ];
        const label = candidates.find(fits);
        const tw = label ? ctx.measureText(label).width : 0;
        if (label) {
          // Keep the label inside the visible portion of a part-scrolled band.
          const visL = Math.max(x0, 4), visR = Math.min(x1, W - 4);
          const lx = clamp(visL + 9, visL + 9, Math.max(visL + 9, visR - tw - 9));
          ctx.fillStyle = '#fff';
          ctx.fillText(label, lx, y + h / 2 + 0.5);
        }
        ctx.restore();
      }

      hitRegions.push({ kind: 'period', id: p.id, x0, x1, y0: y, y1: y + h, data: p });
    }

    /* --- Greek events: a separate labelled line beneath the periods --- */
    drawEventRow({
      items: markers.map((m) => ({ year: m.year, entity: m.entity })),
      spineY: metrics.greekSpineY,
      tiers: 3,
      lineH: 15,
      dotR: 3.5,
      hotKind: 'marker',
      colorOf: (e) => cssVar(`--p-${e.tint}`),
      fmt: (it) => `${fmtYear(it.entity.start)} ${it.entity.name}`,
    });

    /* --- World context: divider --- */
    if (worldPeriods.length) {
      ctx.save();
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, metrics.dividerY - 6);
      ctx.lineTo(W - PAD_R, metrics.dividerY - 6);
      ctx.stroke();
      ctx.fillStyle = text3;
      ctx.font = `700 10px ${uiFont}`;
      ctx.textBaseline = 'alphabetic';
      const label = 'WORLD EMPIRES AND KINGDOMS';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = surface;
      ctx.fillRect(PAD_L, metrics.dividerY - 6 - 7, tw + 12, 14);
      ctx.fillStyle = text3;
      ctx.fillText(label, PAD_L + 6, metrics.dividerY + 1);
      ctx.restore();

      /* --- World context: period bars (thinner, muted, same flat style) --- */
      const worldLaid = layoutBand(worldPeriods, WORLD_LANES_N, metrics.worldTop, metrics.worldRibbonH, WORLD_LANE_H, WORLD_LANE_GAP);
      for (const { p, y, h } of worldLaid) {
        const x0 = xOf(p.start), x1 = xOf(p.end);
        if (x1 < -40 || x0 > W + 40) continue;
        const w = Math.max(2, x1 - x0);
        const colour = cssVar(`--p-${WORLD_LANE_TINTS[p.lane ?? 0]}`);
        const isHot = hot?.kind === 'world-period' && hot.id === p.id;

        ctx.save();
        roundRect(ctx, x0, y, w, h, 2);
        ctx.fillStyle = colour;
        ctx.globalAlpha = isHot ? 0.9 : 0.62;
        ctx.fill();
        ctx.restore();

        if (w > 46) {
          ctx.save();
          ctx.font = `600 ${Math.min(11, h * 0.6)}px ${uiFont}`;
          ctx.textBaseline = 'middle';
          const PAD = 8;
          const fits = (s) => ctx.measureText(s).width + PAD <= w;
          const label = [p.name, p.name.split(' ')[0]].find(fits);
          if (label) {
            const visL = Math.max(x0, 4), visR = Math.min(x1, W - 4);
            const tw2 = ctx.measureText(label).width;
            const lx = clamp(visL + 7, visL + 7, Math.max(visL + 7, visR - tw2 - 7));
            ctx.fillStyle = '#fff';
            ctx.fillText(label, lx, y + h / 2 + 0.5);
          }
          ctx.restore();
        }

        hitRegions.push({ kind: 'world-period', id: p.id, x0, x1, y0: y, y1: y + h, data: p });
      }

      /* --- World context: labelled events line --- */
      drawEventRow({
        items: worldEvents.map((e) => ({ year: e.year, entity: e })),
        spineY: metrics.worldSpineY,
        tiers: 2,
        lineH: 13,
        dotR: 2.5,
        hotKind: 'world-marker',
        muted: true,
        colorOf: (e) => cssVar(`--p-${WORLD_LANE_TINTS[e.lane ?? 0]}`),
        fmt: (it) => `${fmtYear(it.entity.year)} ${it.entity.name}`,
      });
    }

    /**
     * Shared renderer for both the Greek and World "events line": a thin
     * spine, a dot per marker, and — where a marker survives collision
     * placement — a short leader up to a stacked text label.
     */
    function drawEventRow({ items, spineY, tiers, lineH, dotR, hotKind, fmt, colorOf, muted = false }) {
      // Collapse near-duplicate x positions so the spine doesn't look like
      // static at low zoom; keep the earliest of each cluster as the anchor.
      const visible = [];
      const seen = new Map();
      for (const it of items) {
        const x = xOf(it.year);
        if (x < -6 || x > W + 6) continue;
        const key = Math.round(x / 10);
        if (seen.has(key)) { seen.get(key).n++; continue; }
        const rec = { ...it, x, n: 1 };
        seen.set(key, rec);
        visible.push(rec);
      }
      visible.sort((a, b) => a.x - b.x);

      ctx.save();
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, spineY);
      ctx.lineTo(W - PAD_R, spineY);
      ctx.stroke();
      ctx.restore();

      ctx.font = `${muted ? 500 : 600} ${muted ? 9.5 : 10.5}px ${uiFont}`;
      const placed = placeEventLabels(visible, { tiers, lineH, fmt });

      for (const it of placed) {
        const isHot = hot?.kind === hotKind && hot.id === it.entity.id;
        const colour = colorOf(it.entity);
        const legendary = it.entity.legendary === true || it.entity.type === 'myth';

        if (it.label != null) {
          const labelY = spineY - 6 - it.tier * lineH;
          ctx.save();
          ctx.strokeStyle = colour;
          ctx.globalAlpha = isHot ? 0.85 : 0.45;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(it.x, spineY - dotR);
          ctx.lineTo(it.x, labelY + 3);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = isHot ? text : (muted ? text3 : text);
          ctx.fillText(it.label, it.x, labelY);
          ctx.textAlign = 'left';
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(it.x, spineY, isHot ? dotR + 1.5 : dotR, 0, Math.PI * 2);
        if (legendary) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.4;
          ctx.fillStyle = surface;
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.strokeStyle = surface;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        if (it.n > 1) {
          ctx.fillStyle = text3;
          ctx.font = `600 8.5px ${uiFont}`;
          ctx.textAlign = 'center';
          ctx.fillText(`+${it.n - 1}`, it.x, spineY + dotR + 10);
          ctx.textAlign = 'left';
          ctx.font = `${muted ? 500 : 600} ${muted ? 9.5 : 10.5}px ${uiFont}`;
        }

        hitRegions.push({
          kind: hotKind, id: it.entity.id,
          x0: it.x - 7, x1: it.x + 7, y0: spineY - 10, y1: spineY + 10,
          data: it.n > 1 ? { ...it.entity, n: it.n } : it.entity,
        });
      }
    }

    /* --- playhead (the year scrubber position) --- */
    if (playhead != null && playhead >= vStart && playhead <= vEnd) {
      const x = xOf(playhead);
      ctx.save();
      ctx.strokeStyle = cssVar('--accent');
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H - AXIS_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 8, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = cssVar('--accent');
      ctx.fill();
      ctx.restore();
    }

    /* --- cursor guide --- */
    if (cursorYear != null && !dragging) {
      const x = xOf(cursorYear);
      ctx.save();
      ctx.strokeStyle = text3;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H - AXIS_H);
      ctx.stroke();
      ctx.restore();
    }

    /* --- axis --- */
    ctx.fillStyle = surface;
    ctx.fillRect(0, H - AXIS_H, W, AXIS_H);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(0, H - AXIS_H + 0.5);
    ctx.lineTo(W, H - AXIS_H + 0.5);
    ctx.stroke();

    ctx.fillStyle = text3;
    ctx.font = `500 11px ${cssVar('--font-ui') || 'system-ui'}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (let y = first; y <= vEnd; y += step) {
      const x = xOf(y);
      if (x < 24 || x > W - 24) continue;
      ctx.fillText(fmtYear(y), x, H - AXIS_H / 2);
    }
    ctx.textAlign = 'left';
  }

  function schedule() {
    if (raf == null) raf = requestAnimationFrame(draw);
  }

  /* ---------- Hit testing ---------- */
  function hitAt(px, py) {
    // Markers first — they sit on top and are small.
    for (const r of hitRegions) {
      if (r.kind !== 'marker') continue;
      if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return r;
    }
    for (const r of hitRegions) {
      if (r.kind !== 'period') continue;
      if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return r;
    }
    // World context — hover-only, checked last (lowest priority).
    for (const r of hitRegions) {
      if (r.kind !== 'world-marker') continue;
      if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return r;
    }
    for (const r of hitRegions) {
      if (r.kind !== 'world-period') continue;
      if (px >= r.x0 && px <= r.x1 && py >= r.y0 && py <= r.y1) return r;
    }
    return null;
  }

  /* ---------- Zoom & pan ---------- */
  const MIN_SPAN = 40;          // never zoom closer than a 40-year window
  const MAX_SPAN = TIME_MAX - TIME_MIN;

  function setView(a, b, { notify = true } = {}) {
    let s = clamp(b - a, MIN_SPAN, MAX_SPAN);
    let start = a;
    // Keep the window inside the overall range.
    if (start < TIME_MIN) start = TIME_MIN;
    if (start + s > TIME_MAX) start = TIME_MAX - s;
    vStart = start;
    vEnd = start + s;
    schedule();
    if (notify) onViewChange?.({ start: vStart, end: vEnd });
  }

  function zoomAbout(clientX, factor) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const anchor = yearAt(px);
    const t = (anchor - vStart) / span();
    const newSpan = clamp(span() * factor, MIN_SPAN, MAX_SPAN);
    setView(anchor - t * newSpan, anchor - t * newSpan + newSpan);
  }

  /* ---------- Pointer handling ---------- */
  let dragging = false;
  let dragMoved = 0;
  let lastX = 0;
  const pointers = new Map();
  let pinchDist = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e.clientX);
    if (pointers.size === 1) {
      dragging = true;
      dragMoved = 0;
      lastX = e.clientX;
      canvas.classList.add('dragging');
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.abs(a - b);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;

    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.clientX);

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.abs(a - b);
      if (pinchDist > 0 && d > 0) {
        zoomAbout((a + b) / 2, pinchDist / d);
        pinchDist = d;
      }
      return;
    }

    if (dragging) {
      const dx = e.clientX - lastX;
      dragMoved += Math.abs(dx);
      lastX = e.clientX;
      const dy = -(dx / (W - PAD_L - PAD_R)) * span();
      setView(vStart + dy, vEnd + dy);
      return;
    }

    cursorYear = yearAt(px);
    const h = hitAt(px, py);
    const changed = h?.id !== hot?.id;
    hot = h;
    const clickable = h?.kind === 'period' || h?.kind === 'marker';
    canvas.style.cursor = clickable ? 'pointer' : 'grab';
    if (changed) onHover?.(h, { x: px, y: py });
    schedule();
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0 && dragging) {
      dragging = false;
      canvas.classList.remove('dragging');
      canvas.style.cursor = (hot?.kind === 'period' || hot?.kind === 'marker') ? 'pointer' : 'grab';
      schedule();
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('pointerleave', () => {
    cursorYear = null;
    if (hot) { hot = null; onHover?.(null); }
    schedule();
  });

  canvas.addEventListener('click', (e) => {
    // Suppress the click that ends a drag.
    if (dragMoved > 5) return;
    const rect = canvas.getBoundingClientRect();
    const h = hitAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!h) return;
    // World context is hover-only — it isn't a real page to open.
    if (h.kind === 'period') onPeriodClick?.(h.data);
    else if (h.kind === 'marker') onMarkerClick?.(h.data);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Trackpads send horizontal deltas for pans and vertical for zoom.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const dy = (e.deltaX / (W - PAD_L - PAD_R)) * span();
      setView(vStart + dy, vEnd + dy);
    } else {
      zoomAbout(e.clientX, e.deltaY > 0 ? 1.12 : 1 / 1.12);
    }
  }, { passive: false });

  /* ---------- Keyboard ---------- */
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label',
    'Interactive timeline from 3200 BC to 30 BC. Arrow keys pan, plus and minus zoom.');
  canvas.addEventListener('keydown', (e) => {
    const nudge = span() * 0.12;
    if (e.key === 'ArrowLeft') { setView(vStart - nudge, vEnd - nudge); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setView(vStart + nudge, vEnd + nudge); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomAbout(canvas.getBoundingClientRect().left + W / 2, 1 / 1.25); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomAbout(canvas.getBoundingClientRect().left + W / 2, 1.25); e.preventDefault(); }
    else if (e.key === '0') { api.reset(); e.preventDefault(); }
  });

  /* ---------- Resize ---------- */
  const ro = new ResizeObserver(schedule);
  ro.observe(canvas);

  /* ---------- Public API ---------- */
  const api = {
    draw: schedule,
    setMarkers(next) { markers = next; schedule(); },
    setPlayhead(year) { playhead = year; schedule(); },
    getView: () => ({ start: vStart, end: vEnd }),

    /** Animate the viewport to a range. */
    focus(a, b, { pad = 0.12, instant = false } = {}) {
      const s = (b - a) || 100;
      const target = { a: a - s * pad, b: b + s * pad };
      if (instant || prefersReducedMotion()) { setView(target.a, target.b); return; }
      const from = { a: vStart, b: vEnd };
      animate({
        from: 0, to: 1, duration: 520, ease: easeOutCubic,
        onUpdate: (t) => setView(from.a + (target.a - from.a) * t, from.b + (target.b - from.b) * t, { notify: false }),
        onDone: () => onViewChange?.({ start: vStart, end: vEnd }),
      });
    },

    focusPeriod(p) { api.focus(p.start, p.end); },
    reset() { api.focus(TIME_MIN, TIME_MAX, { pad: 0 }); },
    zoomIn() { zoomAbout(canvas.getBoundingClientRect().left + W / 2, 1 / 1.3); },
    zoomOut() { zoomAbout(canvas.getBoundingClientRect().left + W / 2, 1.3); },

    destroy() { ro.disconnect(); if (raf) cancelAnimationFrame(raf); },
  };

  schedule();
  return api;
}

/* ---------- Canvas helpers ---------- */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
