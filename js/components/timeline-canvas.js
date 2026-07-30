/* ============================================================
   Hellenika — Interactive timeline canvas

   A canvas rather than DOM nodes: the dataset can grow to
   thousands of markers without the browser building thousands
   of elements, and dragging stays at 60fps.

   Layout follows a printed "history spread" convention: a single
   Ancient Greece ribbon with dated events called out above it,
   a shared axis, and a World Empires ribbon with its own dated
   events called out below it.

   Interaction model
     · drag horizontally to pan
     · wheel / pinch to zoom about the pointer
     · click a period band to open it
     · click an event marker to open that entity
   ============================================================ */

import { clamp, fitCanvas, animate, easeOutCubic, fmtYear, prefersReducedMotion } from '../util.js';
import { TIME_MIN, TIME_MAX } from '../store.js';

const PAD_L = 14, PAD_R = 14;
const WORLD_LANE_GAP = 4;

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

  /**
   * Collapse the 11 real (and genuinely overlapping) Greek periods into a
   * single non-overlapping sequence for the ribbon — a printed timeline
   * has one row, not three. Periods are walked in start order and each
   * one owns the ribbon from where the previous one left off until the
   * *next* period begins — whether that next period cuts it short (a
   * real overlap, e.g. Bronze Age Collapse interrupting Mycenaean) or
   * starts later (a gap, e.g. the ~30 years between the Collapse ending
   * and the Dark Age's own start date, which the Collapse's segment
   * simply absorbs). Once a period has been superseded it is never
   * revisited — earlier logic picked "whichever period is narrowest at
   * this point in time" independently at every instant, which let a
   * period reappear after something later had already taken over, which
   * read as a chronology error even though the underlying dates were
   * correct.
   */
  function ribbonSegments(items) {
    const sorted = [...items].sort((a, b) => a.start - b.start);
    const segs = [];
    let cursor = sorted.length ? sorted[0].start : 0;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const next = sorted[i + 1];
      const start = Math.max(p.start, cursor);
      const end = next ? next.start : p.end;
      if (end <= start) continue; // fully swallowed by an earlier, later-starting period
      segs.push({ start, end, period: p });
      cursor = end;
    }
    return segs;
  }
  const GREEK_RIBBON = ribbonSegments(periods);

  const WORLD_LANES_N = WORLD_LANE_TINTS.length;

  /* ---------- Layout: assign world bands to lanes within a vertical budget --------- */
  function layoutBand(items, laneCount, topY, availHeight, minLaneH, gap = WORLD_LANE_GAP) {
    const laneH = Math.max(minLaneH, (availHeight - gap * (laneCount - 1)) / laneCount);
    return items.map((p) => ({
      p,
      lane: p.lane ?? 0,
      y: topY + (p.lane ?? 0) * (laneH + gap),
      h: laneH,
    }));
  }

  const GREEK_RIBBON_H = 46;
  const GREEK_LINE_H = 21;
  const AXIS_BAND_H = 30;      // shared rule + year labels, between the two ribbons
  const WORLD_LANE_H = 13;
  const WORLD_RIBBON_H = WORLD_LANES_N * WORLD_LANE_H + (WORLD_LANES_N - 1) * WORLD_LANE_GAP;
  const WORLD_LINE_H = 14;
  const DIVIDER_H = 20;

  /**
   * Vertical budget for the whole canvas, top to bottom:
   *   Greek events (called out upward) → Greek ribbon → shared axis →
   *   World divider → World ribbon → World events (called out downward).
   * Every section but the two event zones is a fixed height; the event
   * zones absorb whatever canvas height is left over and turn it into
   * more tiers, so a tall canvas spreads events out further rather than
   * sitting on empty margin.
   */
  function layoutMetrics() {
    const gap = 22;
    const fixedH = GREEK_RIBBON_H + gap + AXIS_BAND_H + gap + DIVIDER_H + WORLD_RIBBON_H;
    const margin = 20;
    const flexible = Math.max(160, H - fixedH - margin);
    const greekEventsH = Math.max(90, flexible * 0.6);
    const worldEventsH = Math.max(56, flexible * 0.4);
    const greekTiers = Math.max(3, Math.floor((greekEventsH - 14) / GREEK_LINE_H));
    const worldTiers = Math.max(2, Math.floor((worldEventsH - 12) / WORLD_LINE_H));

    let y = Math.max(10, margin / 2);
    y += greekEventsH;
    const greekEventsBaseline = y - 10;
    const greekTop = y;
    y += GREEK_RIBBON_H + gap;
    const axisY = y;
    y += AXIS_BAND_H + gap;
    const dividerY = y + DIVIDER_H * 0.6;
    y += DIVIDER_H;
    const worldTop = y;
    y += WORLD_RIBBON_H;
    const worldEventsBaseline = y + 8;

    return { greekEventsBaseline, greekTiers, greekTop, axisY, dividerY, worldTop, worldEventsBaseline, worldTiers };
  }

  /* ---------- Draw ---------- */
  function draw() {
    raf = null;
    ({ w: W, h: H } = fitCanvas(canvas, ctx));

    const surface = cssVar('--surface');
    const text = cssVar('--text');
    const text3 = cssVar('--text-3');
    const border = cssVar('--border');
    const accent = cssVar('--accent');
    const uiFont = cssVar('--font-ui') || 'system-ui';

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, W, H);

    hitRegions = [];

    const metrics = layoutMetrics();

    /* --- vertical grid: full height, one shared scale for both ribbons --- */
    const step = tickStep();
    const first = Math.ceil(vStart / step) * step;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yr = first; yr <= vEnd; yr += step) {
      const x = Math.round(xOf(yr)) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    ctx.stroke();

    ctx.font = `700 10px ${uiFont}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = text3;
    ctx.fillText('ANCIENT GREECE', PAD_L, metrics.greekTop - 8);

    /* --- Greek events: dated callouts stacked upward off the ribbon --- */
    const eventColour = cssVar('--text-2');
    drawBulletEvents({
      items: markers.map((m) => ({ year: m.year, entity: m.entity })),
      baselineY: metrics.greekEventsBaseline,
      dir: -1, tiers: metrics.greekTiers, lineH: GREEK_LINE_H,
      hotKind: 'marker',
      colorOf: () => eventColour,
      fmt: (it) => `${fmtYear(it.entity.start)}  ${it.entity.name}`,
    });

    /* --- Greek ribbon: a single non-overlapping row --- */
    const greekBase = cssVar('--p-ribbon-greece');
    GREEK_RIBBON.forEach((seg, idx) => {
      const x0 = xOf(seg.start), x1 = xOf(seg.end);
      if (x1 < -40 || x0 > W + 40) return;
      const w = Math.max(1, x1 - x0);
      const p = seg.period;
      const colour = shade(greekBase, idx % 2 === 0 ? 0.14 : -0.16);
      const isHot = hot?.kind === 'period' && hot.id === p.id;

      ctx.fillStyle = colour;
      ctx.globalAlpha = isHot ? 1 : 0.92;
      ctx.fillRect(x0, metrics.greekTop, w, GREEK_RIBBON_H);
      ctx.globalAlpha = 1;

      // A hairline seam between segments — sharp, chart-like divisions
      // rather than the soft rounded blocks this replaced.
      ctx.strokeStyle = surface;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1 + 0.5, metrics.greekTop);
      ctx.lineTo(x1 + 0.5, metrics.greekTop + GREEK_RIBBON_H);
      ctx.stroke();

      if (isHot) {
        ctx.strokeStyle = text;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 1, metrics.greekTop + 1, w - 2, GREEK_RIBBON_H - 2);
      }

      // Two-line label — dates over name — degrading to name-only, then
      // nothing, exactly as the width allows. The date shown is this
      // *segment's* visible span, not the period's own full date range —
      // where an earlier, longer period is interrupted by a later one
      // (Mycenaean, cut short by the Bronze Age Collapse) the ribbon
      // itself is showing only its first part, so the date should say so.
      const visL = Math.max(x0, 4), visR = Math.min(x1, W - 4);
      const avail = visR - visL;
      if (avail > 58) {
        const dateStr = `${fmtYear(seg.start)} – ${fmtYear(seg.end)}`;
        ctx.font = `600 9px ${uiFont}`;
        const fitsDate = ctx.measureText(dateStr).width + 16 <= avail;

        ctx.font = `700 12px ${uiFont}`;
        const nameFits = (s) => ctx.measureText(s).width + 16 <= avail;
        const nameCandidates = [p.name, ...(p.altNames || []).slice().sort((a, b) => a.length - b.length), p.name.split(' ')[0]];
        const name = nameCandidates.find(nameFits);

        if (name) {
          const lx = clamp(visL + 8, visL + 8, Math.max(visL + 8, visR - 8));
          ctx.fillStyle = '#fff';
          if (fitsDate) {
            ctx.font = `600 9px ${uiFont}`;
            ctx.globalAlpha = 0.85;
            ctx.fillText(dateStr, lx, metrics.greekTop + 17);
            ctx.globalAlpha = 1;
            ctx.font = `700 12px ${uiFont}`;
            ctx.fillText(name, lx, metrics.greekTop + 33);
          } else {
            ctx.fillText(name, lx, metrics.greekTop + GREEK_RIBBON_H / 2 + 4);
          }
        }
      }

      hitRegions.push({ kind: 'period', id: p.id, x0, x1, y0: metrics.greekTop, y1: metrics.greekTop + GREEK_RIBBON_H, data: p });
    });

    /* --- Shared axis: one scale read by both ribbons --- */
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, metrics.axisY + 0.5);
    ctx.lineTo(W, metrics.axisY + 0.5);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = `600 11px ${uiFont}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    for (let yr = first; yr <= vEnd; yr += step) {
      const x = xOf(yr);
      if (x < 24 || x > W - 24) continue;
      ctx.fillText(fmtYear(yr), x, metrics.axisY + 18);
    }
    ctx.textAlign = 'left';

    /* --- World context --- */
    if (worldPeriods.length) {
      ctx.font = `700 10px ${uiFont}`;
      ctx.fillStyle = text3;
      ctx.fillText('WORLD EMPIRES AND KINGDOMS', PAD_L, metrics.dividerY + 3);

      /* --- World ribbon: multi-lane, same flat sharp-cornered style --- */
      const worldBase = cssVar('--p-ribbon-world');
      const worldLaid = layoutBand(worldPeriods, WORLD_LANES_N, metrics.worldTop, WORLD_RIBBON_H, WORLD_LANE_H, WORLD_LANE_GAP);
      const laneSeen = {};
      for (const { p, y, h } of worldLaid) {
        const x0 = xOf(p.start), x1 = xOf(p.end);
        if (x1 < -40 || x0 > W + 40) continue;
        const w = Math.max(1, x1 - x0);
        const laneIdx = laneSeen[p.lane ?? 0] = (laneSeen[p.lane ?? 0] ?? -1) + 1;
        const colour = shade(worldBase, laneIdx % 2 === 0 ? 0.12 : -0.16);
        const isHot = hot?.kind === 'world-period' && hot.id === p.id;

        ctx.fillStyle = colour;
        ctx.globalAlpha = isHot ? 0.9 : 0.62;
        ctx.fillRect(x0, y, w, h);
        ctx.globalAlpha = 1;

        if (w > 46) {
          ctx.font = `600 ${Math.min(11, h * 0.62)}px ${uiFont}`;
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
        }

        hitRegions.push({ kind: 'world-period', id: p.id, x0, x1, y0: y, y1: y + h, data: p });
      }

      /* --- World events: dated callouts stacked downward off the ribbon --- */
      drawBulletEvents({
        items: worldEvents.map((e) => ({ year: e.year, entity: e })),
        baselineY: metrics.worldEventsBaseline,
        dir: 1, tiers: metrics.worldTiers, lineH: WORLD_LINE_H,
        hotKind: 'world-marker', muted: true,
        colorOf: () => text3,
        fmt: (it) => `${fmtYear(it.entity.year)}  ${it.entity.name}`,
      });
    }

    /**
     * A printed-page convention: a small bullet at the event's exact year,
     * the date-and-name text running rightward from it — no leader line,
     * no shared spine. Tiers stack away from the ribbon (upward for Greek,
     * downward for World); an event that doesn't fit any tier at the
     * current zoom is simply dropped, the same "zoom in to see more"
     * degrade the period labels already use, rather than clutter.
     */
    function drawBulletEvents({ items, baselineY, dir, tiers, lineH, hotKind, fmt, colorOf, muted = false }) {
      const visible = [];
      const seen = new Set();
      for (const it of items) {
        const x = xOf(it.year);
        if (x < -6 || x > W + 6) continue;
        const key = Math.round(x / 10);
        if (seen.has(key)) continue;
        seen.add(key);
        visible.push({ ...it, x });
      }
      visible.sort((a, b) => a.x - b.x);

      ctx.font = `${muted ? 500 : 600} ${muted ? 9.5 : 11.5}px ${uiFont}`;
      const BULLET_GAP = 11, GUTTER = 20;
      const rowsRight = new Array(tiers).fill(-Infinity);
      const placed = [];
      for (const it of visible) {
        const label = fmt(it);
        const tw = ctx.measureText(label).width;
        // Never let a label's text run past the canvas edge.
        if (it.x + BULLET_GAP + tw > W - PAD_R) continue;
        let tier = -1;
        for (let t = 0; t < tiers; t++) {
          if (it.x - 4 >= rowsRight[t]) { tier = t; break; }
        }
        if (tier < 0) continue;
        rowsRight[tier] = it.x + BULLET_GAP + tw + GUTTER;
        placed.push({ ...it, label, tw, tier });
      }

      for (const it of placed) {
        const isHot = hot?.kind === hotKind && hot.id === it.entity.id;
        const colour = colorOf(it.entity);
        const legendary = it.entity.legendary === true || it.entity.type === 'myth';
        const y = baselineY + dir * (8 + it.tier * lineH);

        ctx.beginPath();
        ctx.arc(it.x, y - 3.5, isHot ? 3.6 : 2.8, 0, Math.PI * 2);
        if (legendary) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.3;
          ctx.fillStyle = surface;
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = colour;
          ctx.fill();
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = isHot ? text : (muted ? text3 : text);
        ctx.fillText(it.label, it.x + BULLET_GAP, y);

        hitRegions.push({
          kind: hotKind, id: it.entity.id,
          x0: it.x - 5, x1: it.x + BULLET_GAP + it.tw + 4,
          y0: Math.min(y - 12, y + 4), y1: Math.max(y - 12, y + 4),
          data: it.entity,
        });
      }
    }

    /* --- playhead (the year scrubber position) ---
       A thin, translucent guide rather than a hard line, so it marks the
       current year without cutting through bar and event labels it
       happens to cross. */
    if (playhead != null && playhead >= vStart && playhead <= vEnd) {
      const x = xOf(playhead);
      ctx.save();
      ctx.strokeStyle = cssVar('--accent');
      ctx.lineWidth = 1.25;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, 8, 4, 0, Math.PI * 2);
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
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.restore();
    }
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

/** Lighten (amount > 0) or darken (< 0) a hex colour. */
function shade(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const adj = (v) => {
    const n = parseInt(v, 16);
    const out = amount >= 0 ? n + (255 - n) * amount : n * (1 + amount);
    return Math.round(clamp(out, 0, 255)).toString(16).padStart(2, '0');
  };
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}
