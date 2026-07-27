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

export function createTimeline(canvas, {
  periods,
  markers = [],       // [{ year, entity }]
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

  /* ---------- Layout: assign period bands to lanes ---------- */
  function layoutPeriods() {
    // Periods carry an authored lane so overlapping eras stay legible
    // (Minoan and Mycenaean genuinely coexist for three centuries).
    const laneCount = Math.max(...periods.map((p) => p.lane ?? 0)) + 1;
    const top = 14;
    const avail = H - AXIS_H - top - 58;
    const laneH = Math.max(26, (avail - LANE_GAP * (laneCount - 1)) / laneCount);
    return periods.map((p) => ({
      p,
      lane: p.lane ?? 0,
      y: top + (p.lane ?? 0) * (laneH + LANE_GAP),
      h: laneH,
    }));
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

    /* --- period bands --- */
    const laid = layoutPeriods();
    for (const { p, y, h } of laid) {
      const x0 = xOf(p.start), x1 = xOf(p.end);
      if (x1 < -40 || x0 > W + 40) continue;
      const w = Math.max(2, x1 - x0);
      const colour = cssVar(`--p-${p.tint}`);
      const isHot = hot?.kind === 'period' && hot.id === p.id;

      // Band
      ctx.save();
      roundRect(ctx, x0, y, w, h, 7);
      const grad = ctx.createLinearGradient(x0, y, x0, y + h);
      grad.addColorStop(0, shade(colour, 0.1));
      grad.addColorStop(1, shade(colour, -0.14));
      ctx.fillStyle = grad;
      ctx.globalAlpha = isHot ? 1 : 0.94;
      ctx.fill();

      // Peak (florescence) marker, where the data defines one
      if (p.peakStart != null && p.peakEnd != null) {
        const px0 = xOf(p.peakStart), px1 = xOf(p.peakEnd);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.max(x0, px0), y + 3, Math.max(1, Math.min(x1, px1) - Math.max(x0, px0)), h - 6);
      }
      ctx.restore();

      if (isHot) {
        ctx.save();
        roundRect(ctx, x0, y, w, h, 7);
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
        ctx.font = `600 ${Math.min(13, h * 0.42)}px ${cssVar('--font-ui') || 'system-ui'}`;
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
          const lx = clamp(visL + 10, visL + 10, Math.max(visL + 10, visR - tw - 10));
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,.5)';
          ctx.shadowBlur = 4;
          ctx.fillText(label, lx, y + h / 2);
        }
        ctx.restore();
      }

      hitRegions.push({ kind: 'period', id: p.id, x0, x1, y0: y, y1: y + h, data: p });
    }

    /* --- event markers --- */
    const markerY = H - AXIS_H - 26;
    const shown = new Map(); // collision map keyed by rounded x
    for (const m of markers) {
      const x = xOf(m.year);
      if (x < -6 || x > W + 6) continue;
      const key = Math.round(x / 11);
      if (shown.has(key)) { shown.get(key).n++; continue; }
      shown.set(key, { x, m, n: 1 });
    }
    // When markers are densely packed the "+n" counts collide into noise.
    const dense = shown.size > 0 && (W / shown.size) < 26;

    for (const { x, m, n } of shown.values()) {
      const isHot = hot?.kind === 'marker' && hot.id === m.entity.id;
      const colour = cssVar(`--p-${m.entity.tint}`);
      const r = isHot ? 6 : 4;

      ctx.beginPath();
      ctx.moveTo(x, markerY - 9);
      ctx.lineTo(x, markerY + 5);
      ctx.strokeStyle = colour;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(x, markerY, r, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (n > 1 && !dense) {
        ctx.fillStyle = text3;
        ctx.font = `600 9px ${cssVar('--font-ui') || 'system-ui'}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(n), x, markerY + 16);
        ctx.textAlign = 'left';
      }

      hitRegions.push({
        kind: 'marker', id: m.entity.id,
        x0: x - 7, x1: x + 7, y0: markerY - 10, y1: markerY + 10,
        data: m.entity,
      });
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
    canvas.style.cursor = h ? 'pointer' : 'grab';
    if (changed) onHover?.(h, { x: px, y: py });
    schedule();
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0 && dragging) {
      dragging = false;
      canvas.classList.remove('dragging');
      canvas.style.cursor = hot ? 'pointer' : 'grab';
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
    if (h.kind === 'period') onPeriodClick?.(h.data);
    else onMarkerClick?.(h.data);
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
