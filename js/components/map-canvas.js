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
import {
  projectPath, pathLength, pointAtFraction, drawArrowHead, wheelZoomFactor,
} from './map-draw-utils.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

/** Default transition widths. Political frontiers change promptly;
    archaeological distributions can dissolve more gradually. */
const POLITICAL_FADE = 2;
const REGIONAL_FADE = 8;
const CULTURE_FADE = 16;

/* ---------- Atlas palette ----------
   The offline vector fallback is the map's default look now — a hand-
   drawn historical atlas rather than a gap-filler for when tiles fail —
   so it gets its own warm, aged-paper palette rather than reusing the
   plain light/dark surface colours. */
// Land uses a plain, saturated orange rather than reusing any political
// tint colour (e.g. --p-classical is a similar terracotta) — territory
// fills need to read clearly against the base map, not vanish into it.
const ATLAS = {
  light: {
    land: '#d9772e', landEdge: '#ffffff', sea: '#ffffff', seaEdge: '#ffffff',
    river: '#7a3320', grain: 'rgba(107,74,42,0.05)', vignette: 'rgba(59,41,20,0.16)',
  },
  dark: {
    land: '#d9772e', landEdge: '#000000', sea: '#000000', seaEdge: '#000000',
    river: '#e8ac6e', grain: 'rgba(0,0,0,0.12)', vignette: 'rgba(0,0,0,0.4)',
  },
};

/** A small tiled paper-grain pattern, built once per canvas 2D context
    and reused every frame — cheap texture without per-frame cost. */
const grainPatterns = new WeakMap();
function grainPattern(ctx, colour) {
  const key = colour;
  let byColour = grainPatterns.get(ctx);
  if (!byColour) { byColour = new Map(); grainPatterns.set(ctx, byColour); }
  if (byColour.has(key)) return byColour.get(key);

  const size = 96;
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  const octx = off.getContext('2d');
  octx.fillStyle = colour;
  let seed = 1337;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 260; i++) {
    octx.globalAlpha = 0.3 + rand() * 0.7;
    octx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  const pattern = ctx.createPattern(off, 'repeat');
  byColour.set(key, pattern);
  return pattern;
}

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
  onTerritoryClick,
  territoryEntityId,
  territoryExternalUrl,
  onHover,
  /** Small preview maps (e.g. an entity page's Location panel) shouldn't
      capture drag/wheel/keyboard input -- a wheel-zoomable canvas sitting
      in a scrollable sidebar hijacks the page's own scroll the moment the
      cursor passes over it, leaving the map panned or zoomed to some
      confusing, unrequested view. Set false for a static, look-only map. */
  interactive = true,
} = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const eventScope = new AbortController();

  let W = 0, H = 0;
  let scale = 1024, tx = 0, ty = 0;   // screen = world*scale + t, world in z0 px
  let fitted = false;
  let pendingFly = null;
  let hot = null;
  let hitRegions = [];
  let routeHitRegions = [];
  let territoryHitRegions = [];
  let raf = null;
  let onLegend = null;
  let current = { year, layers, markers, basemap };
  let cancelFly = null;
  let destroyed = false;

  const pointSegmentDistanceSq = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    const u = lenSq ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq, 0, 1) : 0;
    const ex = p[0] - (a[0] + u * dx), ey = p[1] - (a[1] + u * dy);
    return ex * ex + ey * ey;
  };

  function stableInteriorPoint(ring) {
    let twiceArea = 0, cx = 0, cy = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const cross = a[0] * b[1] - b[0] * a[1];
      twiceArea += cross;
      cx += (a[0] + b[0]) * cross;
      cy += (a[1] + b[1]) * cross;
      minX = Math.min(minX, a[0]); maxX = Math.max(maxX, a[0]);
      minY = Math.min(minY, a[1]); maxY = Math.max(maxY, a[1]);
    }
    const centroid = Math.abs(twiceArea) > 1e-9
      ? [cx / (3 * twiceArea), cy / (3 * twiceArea)]
      : [(minX + maxX) / 2, (minY + maxY) / 2];
    if (pointInPolygon(centroid[0], centroid[1], ring)) return centroid;

    // Concave polygons can have a centroid outside their boundary. Pick a
    // stable interior grid point with the most clearance from every edge.
    let best = null, bestDistance = -1;
    for (let gy = 1; gy < 12; gy++) {
      for (let gx = 1; gx < 12; gx++) {
        const p = [minX + (maxX - minX) * gx / 12, minY + (maxY - minY) * gy / 12];
        if (!pointInPolygon(p[0], p[1], ring)) continue;
        let distance = Infinity;
        for (let i = 0; i < ring.length; i++) {
          distance = Math.min(distance, pointSegmentDistanceSq(p, ring[i], ring[(i + 1) % ring.length]));
        }
        if (distance > bestDistance) { best = p; bestDistance = distance; }
      }
    }
    return best ?? ring[0];
  }

  const territoryLabelAnchors = new Map(
    territories.map((t) => [t.id, t.labelAt ?? stableInteriorPoint(t.ring)]),
  );

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

  function traceSmoothRing(ring) {
    const pts = ring.map(([lon, lat]) => toScreen(lon, lat));
    if (pts.length < 3) { tracePath(ring); return; }
    // Round only the immediate corner. The former midpoint-based curve
    // consumed half of every edge, turning sparse historical reconstructions
    // into large circular lobes at some zoom levels.
    const radius = 7;
    const corners = pts.map((p, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const next = pts[(i + 1) % pts.length];
      const prevLen = Math.hypot(prev[0] - p[0], prev[1] - p[1]) || 1;
      const nextLen = Math.hypot(next[0] - p[0], next[1] - p[1]) || 1;
      const prevT = Math.min(0.18, radius / prevLen);
      const nextT = Math.min(0.18, radius / nextLen);
      return {
        p,
        entry: [p[0] + (prev[0] - p[0]) * prevT, p[1] + (prev[1] - p[1]) * prevT],
        exit: [p[0] + (next[0] - p[0]) * nextT, p[1] + (next[1] - p[1]) * nextT],
      };
    });
    ctx.beginPath();
    ctx.moveTo(corners[0].entry[0], corners[0].entry[1]);
    for (let i = 0; i < corners.length; i++) {
      const c = corners[i], next = corners[(i + 1) % corners.length];
      ctx.quadraticCurveTo(c.p[0], c.p[1], c.exit[0], c.exit[1]);
      ctx.lineTo(next.entry[0], next.entry[1]);
    }
    ctx.closePath();
  }

  function traceSmoothScreenPath(pts) {
    ctx.beginPath();
    if (!pts.length) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], next = pts[i + 1];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + next[0]) / 2, (p[1] + next[1]) / 2);
    }
    if (pts.length > 1) ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }

  function territoryAlpha(t, y) {
    const fade = t.fade ?? (t.kind === 'culture'
      ? CULTURE_FADE
      : (t.kind === 'regional' || t.kind === 'league') ? REGIONAL_FADE : POLITICAL_FADE);
    if (y < t.from - fade || y > t.to + fade) return 0;
    let a = 1;
    if (y < t.from) a = (y - (t.from - fade)) / fade;
    else if (y > t.to) a = 1 - (y - t.to) / fade;
    const base = t.opacity ?? (t.kind === 'culture' ? 0.45 : t.kind === 'regional' ? 0.5 : 0.7);
    return clamp(a, 0, 1) * base;
  }

  /* ---------- Draw ---------- */
  function draw() {
    if (destroyed) return;
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
      // The map's default look: a hand-drawn historical atlas, not just
      // an offline gap-filler — warm parchment, ink coastlines, a paper
      // grain, and a soft vignette toward the edges.
      const pal = dark ? ATLAS.dark : ATLAS.light;
      ctx.fillStyle = pal.land;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = pal.sea;
      for (const s of seas) { tracePath(s.ring); ctx.fill(); }
      ctx.fillStyle = pal.land;
      ctx.strokeStyle = pal.landEdge;
      ctx.lineWidth = 0.8;
      for (const i of islands) { tracePath(i.ring); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = pal.seaEdge;
      ctx.lineWidth = 1.3;
      for (const s of seas) { tracePath(s.ring); ctx.stroke(); }

      if (scale > 2200) {
        ctx.strokeStyle = pal.river;
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        for (const r of rivers) { tracePath(r.path, false); ctx.stroke(); }
      }

      // Paper grain and a soft vignette over the whole scene. (The canvas
      // is created with alpha:false, so clearRect paints opaque black
      // rather than transparent — there's no cheap way to mask the grain
      // to land only, and grain over the sea reads fine anyway.)
      ctx.save();
      ctx.fillStyle = grainPattern(ctx, pal.grain);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.save();
      const vr = Math.max(W, H) * 0.75;
      const vg = ctx.createRadialGradient(W / 2, H / 2, vr * 0.55, W / 2, H / 2, vr);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, pal.vignette);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    /* --- territories ---
       Two passes rather than fill-then-stroke-per-territory: transitional
       years can have 3-4 overlapping claims, and stacking opaque-ish fills
       compounds (two 0.5-alpha fills already cover a pixel at ~0.75) into
       an unreadable blended wash. Lighter fills plus a dedicated outline
       pass drawn on top of every fill keeps every boundary crisp no
       matter how many territories overlap. */
    const legend = [];
    const territoryLabelCandidates = [];
    territoryHitRegions = [];
    if (L.territories !== false) {
      const active = territories
        .map((t) => ({ t, a: territoryAlpha(t, y) }))
        .filter(({ a }) => a > 0.01);

      for (const { t, a } of active) {
        ctx.save();
        traceSmoothRing(t.ring);
        // Political fills read as a solid atlas "colour region" (the
        // reference look) — only leagues/cultures/regional layers, which
        // routinely sit on top of an underlying polity fill, stay washy
        // so both remain legible together. Overlapping polities are rare
        // (POLITICAL_FADE is only 2 years) so a bold fill rarely muddies.
        const boldFill = t.kind === 'polity';
        ctx.globalAlpha = a * (boldFill ? (tiled ? 0.58 : 0.66) : (tiled ? 0.26 : 0.34));
        ctx.fillStyle = cssVar(`--p-${t.tint}`);
        ctx.fill();
        ctx.restore();
      }
      for (const { t, a } of active) {
        ctx.save();
        traceSmoothRing(t.ring);
        ctx.globalAlpha = Math.min(1, a * 1.2);
        ctx.strokeStyle = cssVar(`--p-${t.tint}`);
        ctx.lineWidth = 2;
        if (t.kind === 'culture') ctx.setLineDash([5, 5]);
        else if (t.kind === 'regional' || t.kind === 'league') ctx.setLineDash([10, 4]);
        ctx.stroke();
        ctx.restore();
        if (a > 0.35) {
          legend.push({ name: t.name, tint: t.tint, kind: t.kind, certainty: t.certainty });

          // Size from the projected territory, but position from a fixed
          // geographic anchor. Clipping the bounding box to the viewport made
          // names visibly "swim" whenever the user panned or zoomed.
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const [lon, lat] of t.ring) {
            const [px, py] = toScreen(lon, lat);
            if (px < minX) minX = px; if (px > maxX) maxX = px;
            if (py < minY) minY = py; if (py > maxY) maxY = py;
          }
          const [anchorLon, anchorLat] = territoryLabelAnchors.get(t.id);
          const [labelX, labelY] = toScreen(anchorLon, anchorLat);
          const bw = Math.max(0, Math.min(W, maxX - minX));
          const bh = Math.max(0, Math.min(H, maxY - minY));
          if (labelX >= 8 && labelX <= W - 8 && labelY >= 8 && labelY <= H - 8) {
            territoryLabelCandidates.push({ t, a, cx: labelX, cy: labelY, bw, bh });
          }
          const screenRing = t.ring.map(([lon, lat]) => toScreen(lon, lat));
          territoryHitRegions.push({
            territory: t,
            ring: screenRing,
            area: bw * bh,
          });
        }
      }
      territoryHitRegions.sort((a, b) => a.area - b.area);
    }

    /* --- routes --- */
    routeHitRegions = [];
    if (L.routes) {
      for (const r of routes) {
        if (y < r.from || y > r.to) continue;
        // A fixed pair, not the period-tint palette: a route drawn in its
        // own period's colour can land on same-tinted territory and vanish
        // into it (e.g. Alexander's route crossing "Alexander"-tint land).
        const colour = cssVar(`--p-${r.tint}`);
        const rawPaths = r.paths ?? [r.path];

        for (const rawPath of rawPaths) {
          const pts = projectPath(rawPath, toScreen);
          ctx.save();
          ctx.strokeStyle = colour;
          ctx.lineWidth = r.kind === 'campaign' ? 3 : 2.4;
          ctx.globalAlpha = r.phaseTo != null && y > r.phaseTo ? 0.42 : 0.9;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          if (r.kind === 'hypothesis') ctx.setLineDash([2, 6]);
          else if (r.dashed) ctx.setLineDash([7, 5]);
          // A dark halo keeps routes readable over busy terrain.
          ctx.shadowColor = dark ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.75)';
          ctx.shadowBlur = 3;
          traceSmoothScreenPath(pts);
          ctx.stroke();
          ctx.restore();

          // Only ordered campaigns get arrows. Trade and colonisation
          // networks are connections, not one sequential itinerary.
          const len = pathLength(pts);
          if (len > 30 && r.kind === 'campaign' && (r.phaseTo == null || y <= r.phaseTo)) {
            ctx.save();
            ctx.shadowColor = dark ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.95)';
            ctx.shadowBlur = 2;
            for (const frac of [0.32, 0.64, 0.88]) {
              const p = pointAtFraction(pts, frac);
              drawArrowHead(ctx, p.x, p.y, p.angle, 8, colour);
            }
            ctx.restore();
          }

          // Sparse hover targets along every path (checked after markers,
          // so a marker sitting on a route always wins the hit test).
          const step = 16;
          for (let d = 0; d <= len; d += step) {
            const p = pointAtFraction(pts, len ? d / len : 0);
            routeHitRegions.push({ route: r, x: p.x, y: p.y, r: 7 });
          }
        }
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
        // "event" (sieges, foundings, deaths, disasters -- the catch-all
        // type) reads as a point-in-time historical event, same as a
        // battle, so it shares the crossed-blades mark rather than the
        // plain site square. Artefacts get their own diamond so a findspot
        // pin is never mistaken for the site itself sitting right next to it.
        const shape = e.type === 'battle' || e.type === 'war' || e.type === 'event' ? 'battle'
                    : e.type === 'city' ? 'city'
                    : e.type === 'artefact' ? 'artefact' : 'site';
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
        } else if (shape === 'artefact') {
          ctx.translate(x, py);
          ctx.rotate(Math.PI / 4);
          ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = dark ? '#12110f' : '#fff';
          ctx.lineWidth = 1.5;
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
      ctx.textBaseline = 'middle';
      const placed = [];
      const placedPlaceLabels = [];
      const placedTerritoryLabels = new Set();

      // Territory names, drawn on the shape itself (atlas-style), placed
      // before marker labels so empire names win the collision contest —
      // biggest territories first, since they have the most room to fit.
      territoryLabelCandidates
        .sort((a, b) => (b.bw * b.bh) - (a.bw * a.bh))
        .forEach((c) => {
          if (c.bw < 42 || c.bh < 20) return; // too small on screen to letter
          const fontSize = clamp(Math.round(Math.sqrt(c.bw * c.bh) / 11), 9, 20);
          ctx.font = `700 ${fontSize}px ${cssVar('--font-ui') || 'system-ui'}`;
          const text = (c.t.label || c.t.name).toUpperCase();
          if (placedTerritoryLabels.has(text)) return;
          const spacing = fontSize * 0.1;
          const w = textWidthSpaced(ctx, text, spacing);
          if (!c.t.labelAt && w > c.bw * 1.45) return; // would badly overflow its territory
          const box = { x0: c.cx - w / 2 - 4, y0: c.cy - fontSize / 2 - 3, x1: c.cx + w / 2 + 4, y1: c.cy + fontSize / 2 + 3 };
          if (placed.some((p) => overlap(p, box))) return;
          placed.push(box);
          placedTerritoryLabels.add(text);

          ctx.save();
          ctx.globalAlpha = Math.max(0.82, Math.min(1, c.a * 1.45));
          ctx.fillStyle = cssVar(`--p-${c.t.tint}`);
          ctx.strokeStyle = dark ? 'rgba(10,10,8,.9)' : 'rgba(247,241,224,.94)';
          ctx.lineWidth = Math.max(2.5, fontSize * 0.22);
          ctx.lineJoin = 'round';
          drawSpacedText(ctx, text, c.cx, c.cy, spacing, true);
          ctx.restore();
        });

      ctx.font = `600 11px ${cssVar('--font-ui') || 'system-ui'}`;
      labelCandidates.sort((a, b) => (b.isHot - a.isHot) || (rank(a.e.type) - rank(b.e.type)));

      for (const c of labelCandidates) {
        if (!c.isHot && placedPlaceLabels.length > 44) break;
        const text = c.e.name;
        const w = ctx.measureText(text).width;
        const options = [
          { x: c.x + c.r + 5, y: c.y },
          { x: c.x - c.r - w - 5, y: c.y },
          { x: c.x - w / 2, y: c.y + c.r + 10 },
          { x: c.x - w / 2, y: c.y - c.r - 10 },
        ];
        const pos = options.find((o) => {
          const b = { x0: o.x - 3, y0: o.y - 8, x1: o.x + w + 3, y1: o.y + 8 };
          return b.x0 >= 2 && b.x1 <= W - 2 && b.y0 >= 2 && b.y1 <= H - 2
            && !placedPlaceLabels.some((p) => overlap(p, b));
        });
        if (!pos && !c.isHot) continue;
        const bx = pos?.x ?? options[0].x, by = pos?.y ?? options[0].y;
        const box = { x0: bx - 3, y0: by - 8, x1: bx + w + 3, y1: by + 8 };
        placedPlaceLabels.push(box);

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
  function pointInPolygon(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > y) !== (yj > y))
        && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function layerAllows(L, type) {
    if (type === 'city') return L.cities !== false;
    if (type === 'site') return L.sites !== false;
    // Plain "event" is folded into the same Battles toggle as battle/war --
    // it's the catch-all type for point-in-time historical events (sieges,
    // foundings, deaths, disasters), the same broad category the layer was
    // already meant to cover, not just pitched battles.
    if (type === 'battle' || type === 'war' || type === 'event') return L.battles !== false;
    if (type === 'artefact') return L.artefacts !== false;
    return false;
  }

  function schedule() {
    if (!destroyed && raf == null) raf = requestAnimationFrame(draw);
  }

  /* ---------- Interaction ---------- */
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  const pointers = new Map();
  let pinch = 0;

  function zoomAbout(px, py, factor) {
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = next;
    schedule();
  }

  // Static preview maps (the entity page's small Location panel) skip all
  // of this: no drag, no wheel/pinch zoom, no keyboard panning. Without
  // this a wheel-zoomable canvas sitting in a scrollable sidebar hijacks
  // the page's own scroll the instant the cursor passes over it, leaving
  // the map panned or zoomed to some confusing, unrequested view -- which
  // is exactly what was reported as a "broken" shape on an entity page.
  if (interactive) {
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
    }, { signal: eventScope.signal });

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
      let nextHot = h ? h.entity : null;
      let clickable = !!h;
      if (!h) {
        const rh = routeHitRegions.find((r) => Math.hypot(r.x - px, r.y - py) <= r.r);
        if (rh) {
          nextHot = {
            id: `route:${rh.route.id}`, name: rh.route.name, typeLabel: 'Route',
            start: rh.route.from, end: rh.route.to, region: null,
          };
        }
      }
      if (!nextHot) {
        const th = territoryHitRegions.find((r) => pointInPolygon(px, py, r.ring));
        if (th) {
          const t = th.territory;
          const entityId = territoryEntityId?.(t) ?? t.entityId ?? null;
          const externalUrl = entityId ? null : territoryExternalUrl?.(t) ?? null;
          const typeLabel = t.kind === 'culture' ? 'Archaeological culture zone'
            : t.kind === 'league' ? 'Alliance / hegemony'
            : t.kind === 'regional' ? 'Regional reconstruction'
            : 'Political territory';
          nextHot = {
            id: `territory:${t.id}`, name: t.name, typeLabel,
            start: t.from, end: t.to, region: null, entityId,
            certainty: t.certainty, sourceUrl: externalUrl,
            sourceLabel: externalUrl ? 'Read on Wikipedia' : null,
          };
          clickable = Boolean(entityId || externalUrl);
        }
      }
      if (nextHot?.id !== hot?.id) {
        hot = nextHot;
        canvas.style.cursor = clickable ? 'pointer' : 'grab';
        onHover?.(hot, { x: px, y: py });
        schedule();
      }
    }, { signal: eventScope.signal });

    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0) { dragging = false; canvas.classList.remove('dragging'); }
    };
    canvas.addEventListener('pointerup', end, { signal: eventScope.signal });
    canvas.addEventListener('pointercancel', end, { signal: eventScope.signal });
    canvas.addEventListener('pointerleave', () => {
      if (hot) { hot = null; onHover?.(null); schedule(); }
    }, { signal: eventScope.signal });

    canvas.addEventListener('click', (e) => {
      if (moved > 6) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const h = hitRegions.find((r) => Math.hypot(r.x - px, r.y - py) <= r.r);
      if (h?.cluster) {
        const lons = h.members.map((m) => m.coords[1]);
        const lats = h.members.map((m) => m.coords[0]);
        const pad = 0.35;
        api.flyTo([
          Math.min(...lons) - pad, Math.min(...lats) - pad,
          Math.max(...lons) + pad, Math.max(...lats) + pad,
        ], 0.6);
        return;
      }
      if (h) {
        onMarkerClick?.(h.entity);
        return;
      }
      const th = territoryHitRegions.find((r) => pointInPolygon(px, py, r.ring));
      if (th) {
        const entityId = territoryEntityId?.(th.territory) ?? th.territory.entityId ?? null;
        const externalUrl = entityId ? null : territoryExternalUrl?.(th.territory) ?? null;
        if (entityId || externalUrl) onTerritoryClick?.(th.territory, entityId, externalUrl);
      }
    }, { signal: eventScope.signal });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey);
      zoomAbout(e.clientX - rect.left, e.clientY - rect.top, factor);
    }, { passive: false, signal: eventScope.signal });

    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute(
      'aria-label',
      'Historical map of the Greek world. Arrow keys pan, plus and minus zoom. Select a territory to open its Hellenika entry or Wikipedia article.',
    );
    canvas.addEventListener('keydown', (e) => {
      const step = 50;
      if (e.key === 'ArrowLeft') { tx += step; schedule(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { tx -= step; schedule(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { ty += step; schedule(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { ty -= step; schedule(); e.preventDefault(); }
      else if (e.key === '+' || e.key === '=') { zoomAbout(W / 2, H / 2, 1.3); e.preventDefault(); }
      else if (e.key === '-') { zoomAbout(W / 2, H / 2, 0.77); e.preventDefault(); }
    }, { signal: eventScope.signal });
  }

  // Redraw at the new size, but don't re-run the one-time initial fit --
  // ResizeObserver reliably fires once immediately on observe(), often
  // *after* the mount-time flyTo() has already resolved its pendingFly
  // and set `fitted = true`. Resetting `fitted` here made that follow-up
  // callback re-run fitExtent() with no pendingFly left to restore the
  // intended view, silently snapping any freshly-flown-to map (e.g. the
  // entity page's mini-map) back to the full, unzoomed extent. A real
  // resize should keep the current view and just re-fit the canvas to
  // its new pixel size, the same way any map UI behaves.
  const ro = new ResizeObserver(() => { schedule(); });
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
      cancelFly?.();
      const from = { scale, tx, ty };
      cancelFly = animate({
        from: 0, to: 1, duration: 620, ease: easeOutCubic,
        onUpdate: (t) => {
          // Interpolate zoom logarithmically so the fly feels linear.
          scale = Math.exp(Math.log(from.scale) + (Math.log(target.scale) - Math.log(from.scale)) * t);
          tx = from.tx + (target.tx - from.tx) * t;
          ty = from.ty + (target.ty - from.ty) * t;
          schedule();
        },
        onDone: () => { cancelFly = null; },
      });
    },

    focusAegean() { api.flyTo([19, 34, 30, 42]); },
    focusEasternMediterranean() { api.flyTo([19, 22, 40, 43]); },
    focusEmpire() { api.flyTo([EXTENT.lonMin, EXTENT.latMin, EXTENT.lonMax, EXTENT.latMax], 0.03); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFly?.();
      eventScope.abort();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      canvas.classList.remove('dragging');
    },
  };

  schedule();
  return api;
}

/* ---------- helpers ---------- */
// Letter-spaced text, centred on (cx, cy) — canvas has no native
// letter-spacing, so this lays out and draws glyph-by-glyph. Used for
// territory names so they read like atlas labels rather than UI chrome.
function textWidthSpaced(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return text.length ? w - spacing : 0;
}
function drawSpacedText(ctx, text, cx, cy, spacing, outline = false) {
  const total = textWidthSpaced(ctx, text, spacing);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'start';
  let x = cx - total / 2;
  for (const ch of text) {
    if (outline) ctx.strokeText(ch, x, cy);
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prevAlign;
}

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
