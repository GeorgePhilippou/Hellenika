/* ============================================================
   Hellenika — Historical map canvas

   A real slippy map: Web Mercator, raster basemap tiles, with the
   historical layers drawn on top in the same projection.

   The basemap is deliberately label-free — modern borders and city
   names would contradict the whole point. If tiles cannot be
   reached the hand-built vector coastline is drawn instead, so the
   map still works offline.

   Painting order: basemap → (fallback coastline) → rivers →
   territories → routes → markers → focus → labels.

   Territory opacity eases in and out over a few years either side
   of its window, so the political map dissolves rather than snaps
   as the year scrubber moves.
   ============================================================ */

import { clamp, fitCanvas, animate, easeOutCubic, prefersReducedMotion } from '../util.js';
import { seas, islands, rivers, territories, routes, EXTENT } from '../../data/geo.js';
import { PROVIDERS, TILE_SIZE, lonLatToWorld, worldToLonLat, drawTiles } from './tiles.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

/** Years over which a territory fades in and out. */
const FADE = 12;

// scale = 2**zoom, in "world pixels per zoom-0 world unit" (world is 256px
// at zoom 0). The full Mediterranean extent naturally fits at scale ~20;
// the floor must sit well below that or fitBounds() gets clamped into an
// over-zoomed view whenever it asks to show something wide.
const MIN_SCALE = 6;        // most of the globe
const MAX_SCALE = 200000;   // street-level

export function createMap(canvas, {
  markers = [],
  year = -450,
  layers = {},
  /** Optional entity always plotted and highlighted, whatever the layers say. */
  focus = null,
  /** Basemap: 'relief' | 'physical' | 'plain' | 'none' */
  basemap = 'relief',
  onMarkerClick,
  onHover,
} = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });

  let W = 0, H = 0;
  let scale = 1024, tx = 0, ty = 0;   // screen = world*scale + t, world in z0 px
  let fitted = false;
  let pendingFly = null;
  let hot = null;
  let hitRegions = [];
  let raf = null;
  let onLegend = null;
  let current = { year, layers, markers, basemap };

  /* ---------- Projection ---------- */
  const toScreen = (lon, lat) => {
    const [wx, wy] = lonLatToWorld(lon, lat);
    return [wx * scale + tx, wy * scale + ty];
  };
  const fromScreen = (px, py) => worldToLonLat((px - tx) / scale, (py - ty) / scale);

  function fitBounds([lonMin, latMin, lonMax, latMax], pad = 0.12) {
    const [ax, ay] = lonLatToWorld(lonMin, latMax);
    const [bx, by] = lonLatToWorld(lonMax, latMin);
    const w = (bx - ax) * (1 + pad), h = (by - ay) * (1 + pad);
    const s = clamp(Math.min(W / w, H / h), MIN_SCALE, MAX_SCALE);
    return { scale: s, tx: W / 2 - ((ax + bx) / 2) * s, ty: H / 2 - ((ay + by) / 2) * s };
  }

  function fitExtent() {
    const t = fitBounds([EXTENT.lonMin, EXTENT.latMin, EXTENT.lonMax, EXTENT.latMax], 0.02);
    ({ scale, tx, ty } = t);
  }

  /* ---------- Path helpers ---------- */
  function tracePath(ring, close = true) {
    ctx.beginPath();
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = toScreen(ring[i][0], ring[i][1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (close) ctx.closePath();
  }

  function territoryAlpha(t, y) {
    if (y < t.from - FADE || y > t.to + FADE) return 0;
    let a = 1;
    if (y < t.from) a = (y - (t.from - FADE)) / FADE;
    else if (y > t.to) a = 1 - (y - t.to) / FADE;
    return clamp(a, 0, 1) * (t.opacity ?? 0.7);
  }

  /* ---------- Draw ---------- */
  function draw() {
    raf = null;
    ({ w: W, h: H } = fitCanvas(canvas, ctx));
    if (!fitted && W > 0) { fitExtent(); fitted = true; }
    if (pendingFly && W > 0) {
      const { bounds, pad } = pendingFly;
      pendingFly = null;
      ({ scale, tx, ty } = fitBounds(bounds, pad));
    }

    const { year: y, layers: L, markers: M, basemap: bm } = current;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';

    hitRegions = [];

    /* --- basemap --- */
    ctx.fillStyle = dark ? '#0b1219' : '#e7eef2';
    ctx.fillRect(0, 0, W, H);

    let tiled = false;
    const provider = PROVIDERS[bm];
    if (provider) {
      tiled = drawTiles(ctx, { provider, scale, tx, ty, W, H, dark, onLoad: schedule });
    }

    if (!tiled) {
      // Offline / provider-down fallback: the hand-built vector world.
      const landCol = dark ? '#33302a' : '#eae4d7';
      const seaCol = dark ? '#0e1a24' : '#d3e6f0';
      ctx.fillStyle = landCol;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = seaCol;
      for (const s of seas) { tracePath(s.ring); ctx.fill(); }
      ctx.fillStyle = landCol;
      ctx.strokeStyle = dark ? '#454037' : '#dcd4c2';
      ctx.lineWidth = 0.6;
      for (const i of islands) { tracePath(i.ring); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = dark ? '#4a6274' : '#8fb2c4';
      ctx.lineWidth = 1.1;
      for (const s of seas) { tracePath(s.ring); ctx.stroke(); }

      if (scale > 2200) {
        ctx.strokeStyle = dark ? '#22384a' : '#b6d5e5';
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        for (const r of rivers) { tracePath(r.path, false); ctx.stroke(); }
      }
    }

    /* --- territories --- */
    const legend = [];
    if (L.territories !== false) {
      for (const t of territories) {
        const a = territoryAlpha(t, y);
        if (a <= 0.01) continue;
        const colour = cssVar(`--p-${t.tint}`);
        ctx.save();
        tracePath(t.ring);
        ctx.globalAlpha = a * (tiled ? 0.42 : 0.55);
        ctx.fillStyle = colour;
        ctx.fill();
        ctx.globalAlpha = Math.min(1, a * 1.15);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
        if (a > 0.35) legend.push({ name: t.name, tint: t.tint });
      }
    }

    /* --- routes --- */
    if (L.routes) {
      for (const r of routes) {
        if (y < r.from || y > r.to) continue;
        ctx.save();
        ctx.strokeStyle = cssVar(`--p-${r.tint}`);
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.9;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (r.dashed) ctx.setLineDash([7, 5]);
        // A dark halo keeps routes readable over busy terrain.
        ctx.shadowColor = dark ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.75)';
        ctx.shadowBlur = 3;
        tracePath(r.path, false);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* --- markers --- */
    const labelCandidates = [];

    // Project everything visible first, then greedily merge markers that
    // would land within a few pixels of each other into one cluster pin.
    // Without this, tightly-packed regions (central Greece, the Cyclades)
    // collapse into an indistinguishable stack of overlapping dots.
    const projected = [];
    for (const m of M) {
      const e = m.entity ?? m;
      if (!e.coords) continue;
      if (!layerAllows(L, e.type)) continue;
      const [x, py] = toScreen(e.coords[1], e.coords[0]);
      if (x < -20 || x > W + 20 || py < -20 || py > H + 20) continue;
      projected.push({ e, x, y: py });
    }

    const CLUSTER_R = 22;
    const groups = [];
    const used = new Set();
    for (let i = 0; i < projected.length; i++) {
      if (used.has(i)) continue;
      const group = [projected[i]];
      used.add(i);
      for (let j = i + 1; j < projected.length; j++) {
        if (used.has(j)) continue;
        if (Math.hypot(projected[i].x - projected[j].x, projected[i].y - projected[j].y) <= CLUSTER_R) {
          group.push(projected[j]);
          used.add(j);
        }
      }
      groups.push(group);
    }

    for (const group of groups) {
      if (group.length === 1) {
        const { e, x, y: py } = group[0];
        const isHot = hot?.id === e.id;
        const colour = cssVar(`--p-${e.tint}`);
        const shape = e.type === 'battle' || e.type === 'war' ? 'battle'
                    : e.type === 'city' ? 'city' : 'site';
        const r = isHot ? 6.5 : shape === 'city' ? 5 : 4;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        if (shape === 'battle') {
          ctx.moveTo(x - r, py - r); ctx.lineTo(x + r, py + r);
          ctx.moveTo(x + r, py - r); ctx.lineTo(x - r, py + r);
          ctx.strokeStyle = colour;
          ctx.lineWidth = 2.4;
          ctx.stroke();
        } else if (shape === 'city') {
          ctx.arc(x, py, r, 0, Math.PI * 2);
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = dark ? '#12110f' : '#fff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          ctx.rect(x - r * 0.85, py - r * 0.85, r * 1.7, r * 1.7);
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = dark ? '#12110f' : '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();

        hitRegions.push({ id: e.id, entity: e, x, y: py, r: r + 5 });
        labelCandidates.push({ e, x, y: py, r, isHot, isCluster: false });
      } else {
        const x = group.reduce((s, g) => s + g.x, 0) / group.length;
        const py = group.reduce((s, g) => s + g.y, 0) / group.length;
        const r = Math.min(6 + group.length * 1.1, 13);
        const colour = cssVar('--text-2');

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, py, r, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = dark ? '#12110f' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = dark ? '#12110f' : '#fff';
        ctx.font = `700 ${r < 9 ? 9 : 10}px ${cssVar('--font-ui') || 'system-ui'}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(group.length), x, py + 0.5);
        ctx.textAlign = 'start';
        ctx.restore();

        const pseudo = {
          name: `${group.length} places`,
          typeLabel: 'Cluster — click to zoom in',
          region: null, start: null, end: null,
        };
        hitRegions.push({ cluster: true, members: group.map((g) => g.e), entity: pseudo, x, y: py, r: r + 5 });
        labelCandidates.push({ e: pseudo, x, y: py, r, isHot: false, isCluster: true });
      }
    }

    /* --- focus marker --- */
    if (focus?.coords) {
      const [fx, fy] = toScreen(focus.coords[1], focus.coords[0]);
      const colour = cssVar(`--p-${focus.tint}`);
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx, fy, 12, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(fx, fy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = dark ? '#12110f' : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* --- labels, with simple collision avoidance --- */
    if (L.labels !== false) {
      ctx.font = `600 11px ${cssVar('--font-ui') || 'system-ui'}`;
      ctx.textBaseline = 'middle';
      const placed = [];
      labelCandidates.sort((a, b) => (b.isHot - a.isHot) || (rank(a.e.type) - rank(b.e.type)));

      for (const c of labelCandidates) {
        if (!c.isHot && placed.length > 44) break;
        if (!c.isHot && !c.isCluster && scale < 1600 && c.e.type !== 'city') continue;
        const text = c.e.name;
        const w = ctx.measureText(text).width;
        const bx = c.x + c.r + 5, by = c.y;
        const box = { x0: bx - 3, y0: by - 8, x1: bx + w + 3, y1: by + 8 };
        if (!c.isHot && placed.some((p) => overlap(p, box))) continue;
        placed.push(box);

        ctx.save();
        ctx.fillStyle = dark ? 'rgba(12,16,20,.80)' : 'rgba(255,255,255,.86)';
        roundRect(ctx, box.x0, box.y0 + 2, box.x1 - box.x0, 15, 4);
        ctx.fill();
        ctx.fillStyle = c.isHot ? cssVar('--accent-text') : cssVar('--text');
        ctx.fillText(text, bx, by + 0.5);
        ctx.restore();
      }
    }

    /* --- attribution --- */
    if (tiled && provider) {
      const label = `© ${provider.attribution}`;
      ctx.save();
      ctx.font = `500 9px ${cssVar('--font-ui') || 'system-ui'}`;
      ctx.textBaseline = 'bottom';
      const w = ctx.measureText(label).width;
      ctx.fillStyle = dark ? 'rgba(12,16,20,.6)' : 'rgba(255,255,255,.7)';
      ctx.fillRect(W - w - 12, H - 15, w + 12, 15);
      ctx.fillStyle = cssVar('--text-3');
      ctx.fillText(label, W - w - 6, H - 3);
      ctx.restore();
    }

    onLegend?.(legend);
  }

  const rank = (t) => ({ city: 0, site: 1, battle: 2 }[t] ?? 3);
  const overlap = (a, b) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);

  function layerAllows(L, type) {
    if (type === 'city') return L.cities !== false;
    if (type === 'site') return L.sites !== false;
    if (type === 'battle' || type === 'war') return L.battles !== false;
    return false;
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
      hot = h ? h.entity : null;
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
    if (!h) return;
    if (h.cluster) {
      const lons = h.members.map((m) => m.coords[1]);
      const lats = h.members.map((m) => m.coords[0]);
      const pad = 0.35;
      api.flyTo([
        Math.min(...lons) - pad, Math.min(...lats) - pad,
        Math.max(...lons) + pad, Math.max(...lats) + pad,
      ], 0.6);
    } else {
      onMarkerClick?.(h.entity);
    }
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
    zoomAbout(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.88 : 1.14);
  }, { passive: false });

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Historical map of the Greek world. Arrow keys pan, plus and minus zoom.');
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
    setYear(y) { current.year = y; schedule(); },
    setLayers(l) { current.layers = l; schedule(); },
    setMarkers(m) { current.markers = m; schedule(); },
    setBasemap(id) { current.basemap = id; schedule(); },
    getBasemap: () => current.basemap,
    onLegend(fn) { onLegend = fn; schedule(); },
    zoomIn() { zoomAbout(W / 2, H / 2, 1.4); },
    zoomOut() { zoomAbout(W / 2, H / 2, 0.71); },
    reset() { fitExtent(); schedule(); },

    /** Animate to a lon/lat bounding box. */
    flyTo(bounds, pad) {
      if (W === 0) { pendingFly = { bounds, pad }; schedule(); return; }
      const target = fitBounds(bounds, pad);
      if (prefersReducedMotion()) {
        ({ scale, tx, ty } = target); schedule(); return;
      }
      const from = { scale, tx, ty };
      animate({
        from: 0, to: 1, duration: 620, ease: easeOutCubic,
        onUpdate: (t) => {
          // Interpolate zoom logarithmically so the fly feels linear.
          scale = Math.exp(Math.log(from.scale) + (Math.log(target.scale) - Math.log(from.scale)) * t);
          tx = from.tx + (target.tx - from.tx) * t;
          ty = from.ty + (target.ty - from.ty) * t;
          schedule();
        },
      });
    },

    focusAegean() { api.flyTo([19, 34, 30, 42]); },
    focusEmpire() { api.flyTo([16, 23, 78, 46]); },
    destroy() { ro.disconnect(); if (raf) cancelAnimationFrame(raf); },
  };

  schedule();
  return api;
}

/* ---------- helpers ---------- */
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
