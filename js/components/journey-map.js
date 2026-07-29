/* ============================================================
   Hellenika — Narrative journey map

   A smaller sibling to map-canvas.js for fixed, ordered narrative
   sequences (Odysseus's voyage, Alexander's conquest) rather than
   a time-scrubbed historical map. Shares the tile/projection layer
   and arrow-drawing helpers with map-canvas.js, but has none of its
   year/layer/territory-fade machinery — a journey is a fixed path,
   not a moment in time.

   Painting order: basemap → territory backdrop (optional) →
   curved route and travelling ship → numbered places and labels.
   ============================================================ */

import {
  clamp, fitCanvas, animate, easeOutCubic, easeInOutCubic, prefersReducedMotion,
} from '../util.js';
import { PROVIDERS, lonLatToWorld, worldToLonLat, drawTiles } from './tiles.js';
import { drawArrowHead, pointAtFraction, wheelZoomFactor } from './map-draw-utils.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

const MIN_SCALE = 6;
const MAX_SCALE = 200000;

export function createJourneyMap(canvas, {
  stops = [],          // [{ id, order, name, note, coords:[lat,lon], tint, entity }]
  territories = [],    // optional static backdrop: [{ ring:[[lon,lat],...], tint }]
  foundations = [],    // progressive secondary markers: [{ coords, revealAt, status }]
  basemap = 'relief',
  locked = false,
  showRoute = true,
  traveller = 'ship',
  onHover,
  onStopClick,
  onTravelStart,
  onTravelEnd,
} = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const eventScope = new AbortController();

  let W = 0, H = 0;
  let scale = 1024, tx = 0, ty = 0;
  let fitted = false;
  let pendingFly = null;
  let hot = null;
  let hotRegionId = null;
  let hitRegions = [];
  let raf = null;
  let current = { basemap };
  const stopKey = (stop) => stop?.key || stop?.id;
  let activeId = stopKey(stops[0]) ?? null;
  let travelIndex = 0;
  let territoryProgress = 1;
  let cancelTravel = null;
  let cancelFly = null;
  let destroyed = false;

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
    const lons = stops.map((s) => s.coords[1]);
    const lats = stops.map((s) => s.coords[0]);
    for (const stop of stops) {
      for (const [lat, lon] of stop.via || []) {
        lons.push(lon);
        lats.push(lat);
      }
    }
    for (const territory of territories) {
      for (const [lon, lat] of territory.ring || []) {
        lons.push(lon);
        lats.push(lat);
      }
    }
    for (const foundation of foundations) {
      lats.push(foundation.coords[0]);
      lons.push(foundation.coords[1]);
    }
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  }

  function fitAll() {
    if (!stops.length) return;
    ({ scale, tx, ty } = fitBounds(stopBounds(), locked ? 0.08 : 0.18));
  }

  function curvedSegment(a, b, curve = 0, steps = 36) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = (a[0] + b[0]) / 2 - dy * curve;
    const cy = (a[1] + b[1]) / 2 + dx * curve;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      points.push([
        u * u * a[0] + 2 * u * t * cx + t * t * b[0],
        u * u * a[1] + 2 * u * t * cy + t * t * b[1],
      ]);
    }
    return points;
  }

  /**
   * Repeated Chaikin corner-cutting turns curated sea waypoints into a
   * continuous, non-jagged course without overshooting onto nearby land.
   * Four passes produce enough intermediate points for both the stroke and
   * the travelling ship to move fluidly.
   */
  function smoothWaypoints(nodes, passes = 4) {
    let points = nodes;
    for (let pass = 0; pass < passes; pass++) {
      const smoothed = [points[0]];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        smoothed.push(
          [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
          [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
        );
      }
      smoothed.push(points[points.length - 1]);
      points = smoothed;
    }
    return points;
  }

  function routeLegs(ordered) {
    const legs = [];
    for (let i = 1; i < ordered.length; i++) {
      const from = ordered[i - 1];
      const to = ordered[i];
      const nodes = [
        toScreen(from.coords[1], from.coords[0]),
        ...(to.via || []).map(([lat, lon]) => toScreen(lon, lat)),
        toScreen(to.coords[1], to.coords[0]),
      ];
      const points = nodes.length > 2
        ? smoothWaypoints(nodes)
        : curvedSegment(nodes[0], nodes[1], to.curve || 0);
      legs.push(points);
    }
    return legs;
  }

  function strokePath(points, colour, width, alpha = 1) {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Rotating an icon by its raw heading makes it flip fully upside-down
   * whenever travel points generally leftward (heading ~180°) — a boat's
   * mast/sail ends up pointing into the sea instead of the sky. Mirroring
   * horizontally for leftward headings, instead of continuing the spin
   * past vertical, keeps the mast pointing up no matter which way the
   * route runs.
   */
  function uprightTransform(angle) {
    const flip = Math.cos(angle) < 0;
    return { flip, rotated: flip ? Math.PI - angle : angle };
  }

  function drawShip(position, dark) {
    ctx.save();
    ctx.translate(position.x, position.y);
    const { flip, rotated } = uprightTransform(position.angle);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(rotated);
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = dark ? '#f8efe0' : '#28160f';
    ctx.strokeStyle = dark ? '#28160f' : '#fff8ed';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.quadraticCurveTo(0, 11, 13, 3);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(-1, 15, -14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-1, 4);
    ctx.lineTo(-1, -12);
    ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fillStyle = '#c55d38';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** A plain travelling arrow for Alexander's route — no pole, no
      pennant, just a clean pointer in the direction of travel. */
  function drawStandard(position, dark) {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.angle);
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, 9);
    ctx.lineTo(-8, -9);
    ctx.closePath();
    ctx.fillStyle = '#9d3151';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = dark ? '#f8efe0' : '#28160f';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  const territoryAlpha = (territory) => {
    if (territory.revealAt == null) return 1;
    const from = territory.revealFrom ?? territory.revealAt - 1;
    const span = Math.max(0.001, territory.revealAt - from);
    return clamp((territoryProgress - from) / span, 0, 1);
  };

  const foundationAlpha = (foundation) => {
    const from = foundation.revealFrom ?? foundation.revealAt - 0.15;
    const span = Math.max(0.001, foundation.revealAt - from);
    return clamp((territoryProgress - from) / span, 0, 1);
  };

  /* ---------- Draw ---------- */
  function draw() {
    if (destroyed) return;
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

    /* --- cumulative territory backdrop --- */
    const visibleTerritories = territories
      .map((territory) => ({ territory, alpha: territoryAlpha(territory) }))
      .filter(({ alpha }) => alpha > 0);
    for (const { territory: t, alpha } of visibleTerritories) {
      ctx.save();
      ctx.beginPath();
      t.ring.forEach(([lon, lat], i) => {
        const [x, y] = toScreen(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      // Matches the main historical map's bold "colour region" treatment
      // for political territories (see map-canvas.js) so the journey views
      // share the same atlas look rather than a fainter wash.
      ctx.globalAlpha = 0.6 * alpha;
      ctx.fillStyle = cssVar(`--p-${t.tint}`);
      ctx.fill();
      ctx.restore();
    }
    for (const { territory: t, alpha } of visibleTerritories) {
      ctx.save();
      ctx.beginPath();
      t.ring.forEach(([lon, lat], i) => {
        const [x, y] = toScreen(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.globalAlpha = 0.9 * alpha;
      ctx.strokeStyle = cssVar(`--p-${t.tint}`);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }
    for (const { territory: t, alpha } of visibleTerritories) {
      if (!t.stageLabel || !t.labelAt || alpha < 0.55) continue;
      const [x, y] = toScreen(t.labelAt[0], t.labelAt[1]);
      ctx.save();
      ctx.globalAlpha = clamp((alpha - 0.55) / 0.45, 0, 1) * 0.9;
      ctx.font = `700 9px ${cssVar('--font-ui') || 'system-ui'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = dark ? 'rgba(12,16,20,.94)' : 'rgba(255,251,241,.96)';
      ctx.fillStyle = cssVar(`--p-${t.tint}`);
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(t.stageLabel.toUpperCase(), x, y);
      ctx.fillText(t.stageLabel.toUpperCase(), x, y);
      ctx.restore();
    }

    /* --- progressively revealed Alexandrian foundations --- */
    const foundationPoints = foundations
      .map((foundation) => {
        const alpha = foundationAlpha(foundation);
        const [x, y] = toScreen(foundation.coords[1], foundation.coords[0]);
        return { foundation, alpha, x, y };
      })
      .filter(({ alpha }) => alpha > 0);

    for (const { foundation, alpha, x, y } of foundationPoints) {
      // Same solid-dot-with-contrast-ring language as the numbered stops
      // below (just smaller, and uncoloured by traveller order), rather
      // than the rotated-square "diamond" this used to be — the diamond
      // read as an unrelated marker type instead of a place on the route.
      // A confirmed foundation is a plain filled dot; an attributed or
      // disputed one adds a second, dashed ring to flag the uncertainty,
      // instead of hollowing out the marker itself.
      const r = 5;
      const colour = cssVar('--p-hellenistic');
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(0,0,0,.4)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = dark ? '#f8efe0' : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (foundation.status !== 'attested') {
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
      }
      ctx.restore();

      hitRegions.push({
        id: `foundation:${foundation.id}`,
        stop: { ...foundation, kind: 'foundation' },
        x,
        y,
        r: 10,
        clickable: false,
      });
    }

    /* --- curved route, travelling ship and numbered places --- */
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

      const legs = routeLegs(ordered);
      if (showRoute && legs.length) {
        const routeColour = cssVar('--accent');
        ctx.save();
        ctx.shadowColor = dark ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.85)';
        ctx.shadowBlur = 3;
        for (const leg of legs) strokePath(leg, routeColour, 3, 0.82);
        ctx.restore();

        const legIndex = Math.min(legs.length - 1, Math.max(0, Math.floor(travelIndex)));
        const legFraction = travelIndex >= legs.length ? 1 : travelIndex - legIndex;

        // Skip the arrowhead on whichever leg the traveller icon is
        // currently on — the ship/standard's own rotation already shows
        // direction there, and the two shapes otherwise land on top of
        // each other and read as one lumpy icon.
        legs.forEach((leg, i) => {
          if (i === legIndex && legFraction < 1) return;
          const arrow = pointAtFraction(leg, 0.78);
          drawArrowHead(ctx, arrow.x, arrow.y, arrow.angle, 5.5, routeColour);
        });

        const travellerPosition = pointAtFraction(legs[legIndex], legFraction);
        if (traveller === 'standard') drawStandard(travellerPosition, dark);
        else drawShip(travellerPosition, dark);
      }

      // Numbered markers
      for (const { s, x, y } of points) {
        const isHot = stopKey(hot) === stopKey(s) || activeId === stopKey(s);
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

        hitRegions.push({ id: stopKey(s), stop: s, x, y, r: r + 5 });
      }

      // Every stop gets a readable name. Try several sides so labels remain
      // visible in dense areas without drawing a route through them.
      const placed = points.map(({ x, y }) => ({
        x0: x - 11, y0: y - 11, x1: x + 11, y1: y + 11,
      })).concat(foundationPoints.map(({ x, y }) => ({
        x0: x - 8, y0: y - 8, x1: x + 8, y1: y + 8,
      })));
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

      // Foundation labels are secondary to numbered stops but should still
      // read clearly as place names — bold, same size as the stop labels —
      // rather than a faint afterthought next to a mystery marker.
      ctx.font = `700 11px ${cssVar('--font-ui') || 'system-ui'}`;
      for (const { foundation, alpha, x, y } of foundationPoints) {
        if (alpha < 0.7) continue;
        const label = foundation.shortLabel || foundation.name;
        const w = ctx.measureText(label).width;
        const options = [
          { x: x + 12, y: y - 11 },
          { x: x + 12, y: y + 12 },
          { x: x - w - 12, y: y - 11 },
          { x: x - w - 12, y: y + 12 },
          { x: x - w / 2, y: y - 17 },
          { x: x - w / 2, y: y + 18 },
        ];
        const p = options.find((option) => {
          const box = {
            x0: option.x - 3, y0: option.y - 8,
            x1: option.x + w + 3, y1: option.y + 8,
          };
          return box.x0 >= 2 && box.x1 <= W - 2 && box.y0 >= 2 && box.y1 <= H - 2
            && !placed.some((q) => !(box.x1 < q.x0 || box.x0 > q.x1 || box.y1 < q.y0 || box.y0 > q.y1));
        });
        if (!p) continue;
        const box = { x0: p.x - 3, y0: p.y - 8, x1: p.x + w + 3, y1: p.y + 8 };
        placed.push(box);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dark ? 'rgba(12,16,20,.84)' : 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.roundRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0, 4);
        ctx.fill();
        ctx.fillStyle = cssVar('--p-hellenistic');
        ctx.fillText(label, p.x, p.y + 0.5);
        ctx.restore();
      }
    }
  }

  function schedule() {
    if (!destroyed && raf == null) raf = requestAnimationFrame(draw);
  }

  /* ---------- Interaction ---------- */
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  const pointers = new Map();
  let pinch = 0;
  const hitAt = (px, py) => {
    // Later-painted items take pointer priority. This keeps a numbered stop
    // interactive when it shares coordinates with a foundation marker.
    for (let i = hitRegions.length - 1; i >= 0; i--) {
      const region = hitRegions[i];
      if (Math.hypot(region.x - px, region.y - py) <= region.r) return region;
    }
    return null;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (locked) return;
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
    const h = hitAt(px, py);
    if ((h?.id ?? null) !== hotRegionId) {
      hotRegionId = h?.id ?? null;
      hot = h ? h.stop : null;
      canvas.style.cursor = h ? (h.clickable === false ? 'help' : 'pointer') : 'grab';
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
    if (hot) {
      hot = null;
      hotRegionId = null;
      onHover?.(null);
      schedule();
    }
  }, { signal: eventScope.signal });

  canvas.addEventListener('click', (e) => {
    if (moved > 6) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const h = hitAt(px, py);
    if (h && h.clickable !== false) onStopClick?.(h.stop);
  }, { signal: eventScope.signal });

  function zoomAbout(px, py, factor) {
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = next;
    schedule();
  }

  canvas.addEventListener('wheel', (e) => {
    if (locked) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey);
    zoomAbout(e.clientX - rect.left, e.clientY - rect.top, factor);
  }, { passive: false, signal: eventScope.signal });

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute(
    'aria-label',
    locked
      ? 'Guided journey map. Select a numbered stop to follow the route.'
      : 'Journey map. Arrow keys pan, plus and minus zoom.',
  );
  canvas.addEventListener('keydown', (e) => {
    if (locked) return;
    const step = 50;
    if (e.key === 'ArrowLeft') { tx += step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { tx -= step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { ty += step; schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { ty -= step; schedule(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomAbout(W / 2, H / 2, 1.3); e.preventDefault(); }
    else if (e.key === '-') { zoomAbout(W / 2, H / 2, 0.77); e.preventDefault(); }
  }, { signal: eventScope.signal });

  const ro = new ResizeObserver(() => { fitted = false; schedule(); });
  ro.observe(canvas);

  /* ---------- API ---------- */
  const api = {
    setBasemap(id) { current.basemap = id; schedule(); },

    flyTo(bounds, pad) {
      if (W === 0) { pendingFly = { bounds, pad }; schedule(); return; }
      const target = fitBounds(bounds, pad);
      if (prefersReducedMotion()) { ({ scale, tx, ty } = target); schedule(); return; }
      cancelFly?.();
      const from = { scale, tx, ty };
      cancelFly = animate({
        from: 0, to: 1, duration: 560, ease: easeOutCubic,
        onUpdate: (t) => {
          scale = Math.exp(Math.log(from.scale) + (Math.log(target.scale) - Math.log(from.scale)) * t);
          tx = from.tx + (target.tx - from.tx) * t;
          ty = from.ty + (target.ty - from.ty) * t;
          schedule();
        },
        onDone: () => { cancelFly = null; },
      });
    },

    /** Focus a single stop by id, with a tight zoom. */
    focusStop(id) {
      const s = stops.find((x) => stopKey(x) === id || x.id === id);
      if (!s) return;
      const pad = 0.6;
      api.flyTo([s.coords[1] - pad, s.coords[0] - pad, s.coords[1] + pad, s.coords[0] + pad], 0.5);
    },

    travelTo(id) {
      const target = stops.findIndex((stop) => stopKey(stop) === id);
      if (target < 0) return;
      activeId = id;
      cancelTravel?.();
      onTravelStart?.(stops[target]);
      if (prefersReducedMotion()) {
        travelIndex = target;
        territoryProgress = target + 1;
        schedule();
        onTravelEnd?.(stops[target]);
        return;
      }
      const distance = Math.abs(target - travelIndex);
      cancelTravel = animate({
        from: travelIndex,
        to: target,
        duration: clamp(900 + distance * 620, 1100, 5200),
        ease: easeInOutCubic,
        onUpdate: (value) => {
          travelIndex = value;
          territoryProgress = value + 1;
          schedule();
        },
        onDone: () => {
          travelIndex = target;
          territoryProgress = target + 1;
          cancelTravel = null;
          schedule();
          onTravelEnd?.(stops[target]);
        },
      });
      schedule();
    },

    reset() { fitted = false; fitAll(); schedule(); },
    zoomIn() { zoomAbout(W / 2, H / 2, 1.4); },
    zoomOut() { zoomAbout(W / 2, H / 2, 0.71); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelTravel?.();
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
