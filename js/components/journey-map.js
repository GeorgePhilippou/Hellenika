/* ============================================================
   Hellenika — Narrative journey map

   A smaller sibling to map-canvas.js for fixed, ordered narrative
   sequences (Odysseus's voyage, Alexander's conquest) rather than
   a time-scrubbed historical map. Shares the tile/projection layer
   and arrow-drawing helpers with map-canvas.js, but has none of its
   year/layer/territory-fade machinery — a journey is a fixed path,
   not a moment in time.

   Painting order: basemap → territory backdrop (optional) →
   numbered places and labels → hover highlight.
   ============================================================ */

import { clamp, fitCanvas, animate, easeOutCubic, prefersReducedMotion } from '../util.js';
import { PROVIDERS, lonLatToWorld, worldToLonLat, drawTiles } from './tiles.js';
import { wheelZoomFactor } from './map-draw-utils.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

const MIN_SCALE = 6;
const MAX_SCALE = 200000;

export function createJourneyMap(canvas, {
  stops = [],          // [{ id, order, name, note, coords:[lat,lon], tint, entity }]
  territories = [],    // optional static backdrop: [{ ring:[[lon,lat],...], tint }]
  basemap = 'relief',
  onHover,
  onStopClick,
} = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });

  let W = 0, H = 0;
  let scale = 1024, tx = 0, ty = 0;
  let fitted = false;
  let pendingFly = null;
  let hot = null;
  let hitRegions = [];
  let raf = null;
  let current = { basemap };

  const toScreen = (lon, lat) => {
    const [wx, wy] = lonLatToWorld(lon, lat);
    return [wx * scale + tx, wy * scale + ty];
  };

  function fitBounds([lonMin, latMin, lonMax, latMax], pad = 0.18) {
    const [ax, ay] = lonLatToWorld(lonMin, latMax);
    const [bx, by] = lonLatToWorld(lonMax, latMin);
    const w = (bx - ax) * (1 + pad), h = (by - ay) * (1 + pad);
    const s = clamp(Math.min(W / w, H / h), MIN_SCALE, MAX_SCALE);
    return { scale: s, tx: W / 2 - ((ax + bx) / 2) * s, ty: H / 2 - ((ay + by) / 2) * s };
  }

  function stopBounds() {
    const lons = stops.map((s) => s.coords[1]), lats = stops.map((s) => s.coords[0]);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  }

  function fitAll() {
    if (!stops.length) return;
    ({ scale, tx, ty } = fitBounds(stopBounds()));
  }

  /* ---------- Draw ---------- */
  function draw() {
    raf = null;
    ({ w: W, h: H } = fitCanvas(canvas, ctx));
    if (!fitted && W > 0) { fitAll(); fitted = true; }
    if (pendingFly && W > 0) {
      const { bounds, pad } = pendingFly;
      pendingFly = null;
      ({ scale, tx, ty } = fitBounds(bounds, pad));
    }

    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    hitRegions = [];

    ctx.fillStyle = dark ? '#0b1219' : '#e7eef2';
    ctx.fillRect(0, 0, W, H);

    const provider = PROVIDERS[current.basemap];
    if (provider) drawTiles(ctx, { provider, scale, tx, ty, W, H, dark, onLoad: schedule });

    /* --- territory backdrop (static, no year-fade) --- */
    for (const t of territories) {
      ctx.save();
      ctx.beginPath();
      t.ring.forEach(([lon, lat], i) => {
        const [x, y] = toScreen(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = cssVar(`--p-${t.tint}`);
      ctx.fill();
      ctx.restore();
    }
    for (const t of territories) {
      ctx.save();
      ctx.beginPath();
      t.ring.forEach(([lon, lat], i) => {
        const [x, y] = toScreen(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = cssVar(`--p-${t.tint}`);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    /* --- numbered places (the connecting route is intentionally omitted) --- */
    if (stops.length) {
      const ordered = stops.slice().sort((a, b) => a.order - b.order);

      // Jitter repeat visits to the same coordinates (e.g. Alexander enters,
      // then later dies in, Babylon) so both markers stay individually readable.
      const seenKeys = new Map();
      const points = ordered.map((s) => {
        const key = s.coords.join(',');
        const n = seenKeys.get(key) ?? 0;
        seenKeys.set(key, n + 1);
        const [x, y] = toScreen(s.coords[1], s.coords[0]);
        const jitter = n * 10;
        return { s, x: x + jitter, y: y + jitter };
      });

      // Numbered markers
      for (const { s, x, y } of points) {
        const isHot = hot?.id === s.id;
        const r = isHot ? 12 : 10;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = cssVar(`--p-${s.tint || 'mycenaean'}`);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = dark ? '#12110f' : '#fff';
        ctx.lineWidth = isHot ? 2.5 : 1.8;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${r < 11 ? 10 : 11}px ${cssVar('--font-ui') || 'system-ui'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(s.order), x, y + 0.5);
        ctx.textAlign = 'start';
        ctx.restore();

        hitRegions.push({ id: s.id, stop: s, x, y, r: r + 5 });
      }

      // Every stop gets a readable name. Try several sides so labels remain
      // visible in dense areas without drawing a route through them.
      const placed = points.map(({ x, y }) => ({
        x0: x - 11, y0: y - 11, x1: x + 11, y1: y + 11,
      }));
      const labelledIds = new Set();
      ctx.font = `600 11px ${cssVar('--font-ui') || 'system-ui'}`;
      ctx.textBaseline = 'middle';
      for (const { s, x, y } of points) {
        if (labelledIds.has(s.id)) continue;
        labelledIds.add(s.id);
        const w = ctx.measureText(s.name).width;
        const options = [
          { x: x + 15, y },
          { x: x + 15, y: y - 20 },
          { x: x + 15, y: y + 20 },
          { x: x - w - 15, y },
          { x: x - w - 15, y: y - 20 },
          { x: x - w - 15, y: y + 20 },
          { x: x - w / 2, y: y + 19 },
          { x: x - w / 2, y: y - 19 },
          { x: x - w / 2, y: y + 36 },
          { x: x - w / 2, y: y - 36 },
        ];
        const p = options.find((o) => {
          const box = { x0: o.x - 3, y0: o.y - 8, x1: o.x + w + 3, y1: o.y + 8 };
          return box.x0 >= 2 && box.x1 <= W - 2 && box.y0 >= 2 && box.y1 <= H - 2
            && !placed.some((q) => !(box.x1 < q.x0 || box.x0 > q.x1 || box.y1 < q.y0 || box.y0 > q.y1));
        });
        if (!p) continue;
        const box = { x0: p.x - 3, y0: p.y - 8, x1: p.x + w + 3, y1: p.y + 8 };
        placed.push(box);
        ctx.save();
        ctx.fillStyle = dark ? 'rgba(12,16,20,.84)' : 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.roundRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0, 4);
        ctx.fill();
        ctx.fillStyle = cssVar('--text');
        ctx.fillText(s.name, p.x, p.y + 0.5);
        ctx.restore();
      }
    }
  }

  function schedule() { if (raf == null) raf = requestAnimationFrame(draw); }

  /* ---------- Interaction ---------- */
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  const pointers = new Map();
  let pinch = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add('dragging');
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) {
        const rect = canvas.getBoundingClientRect();
        zoomAbout((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, d / pinch);
        pinch = d;
      }
      return;
    }

    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      tx += dx; ty += dy;
      schedule();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const h = hitRegions.find((r) => Math.hypot(r.x - px, r.y - py) <= r.r);
    if (h?.id !== hot?.id) {
      hot = h ? h.stop : null;
      canvas.style.cursor = h ? 'pointer' : 'grab';
      onHover?.(hot, { x: px, y: py });
      schedule();
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (pointers.size === 0) { dragging = false; canvas.classList.remove('dragging'); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (hot) { hot = null; onHover?.(null); schedule(); }
  });

  canvas.addEventListener('click', (e) => {
    if (moved > 6) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const h = hitRegions.find((r) => Math.hypot(r.x - px, r.y - py) <= r.r);
    if (h) onStopClick?.(h.stop);
  });

  function zoomAbout(px, py, factor) {
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = next;
    schedule();
  }

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey);
    zoomAbout(e.clientX - rect.left, e.clientY - rect.top, factor);
  }, { passive: false });

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Journey map. Arrow keys pan, plus and minus zoom.');
  canvas.addEventListener('keydown', (e) => {
    const step = 50;
    if (e.key === 'ArrowLeft') { tx += step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { tx -= step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { ty += step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { ty -= step; schedule(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomAbout(W / 2, H / 2, 1.3); e.preventDefault(); }
    else if (e.key === '-') { zoomAbout(W / 2, H / 2, 0.77); e.preventDefault(); }
  });

  const ro = new ResizeObserver(() => { fitted = false; schedule(); });
  ro.observe(canvas);

  /* ---------- API ---------- */
  const api = {
    setBasemap(id) { current.basemap = id; schedule(); },

    flyTo(bounds, pad) {
      if (W === 0) { pendingFly = { bounds, pad }; schedule(); return; }
      const target = fitBounds(bounds, pad);
      if (prefersReducedMotion()) { ({ scale, tx, ty } = target); schedule(); return; }
      const from = { scale, tx, ty };
      animate({
        from: 0, to: 1, duration: 560, ease: easeOutCubic,
        onUpdate: (t) => {
          scale = Math.exp(Math.log(from.scale) + (Math.log(target.scale) - Math.log(from.scale)) * t);
          tx = from.tx + (target.tx - from.tx) * t;
          ty = from.ty + (target.ty - from.ty) * t;
          schedule();
        },
      });
    },

    /** Focus a single stop by id, with a tight zoom. */
    focusStop(id) {
      const s = stops.find((x) => x.id === id);
      if (!s) return;
      const pad = 0.6;
      api.flyTo([s.coords[1] - pad, s.coords[0] - pad, s.coords[1] + pad, s.coords[0] + pad], 0.5);
    },

    reset() { fitted = false; fitAll(); schedule(); },
    zoomIn() { zoomAbout(W / 2, H / 2, 1.4); },
    zoomOut() { zoomAbout(W / 2, H / 2, 0.71); },
    destroy() { ro.disconnect(); if (raf) cancelAnimationFrame(raf); },
  };

  schedule();
  return api;
}
