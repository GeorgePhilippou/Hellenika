/* ============================================================
   Hellenika — Raster tile layer

   Web Mercator slippy tiles, drawn straight onto the map canvas.
   Basemaps are deliberately label-free: modern city names and
   national borders would contradict everything the map is for.

   Tiles are cached in memory per session. Failed tiles are
   remembered too, so a dead provider is not re-requested on
   every frame.
   ============================================================ */

export const TILE_SIZE = 256;

/**
 * Providers. `y` before `x` in the Esri path is not a typo — its REST
 * tile service orders them that way.
 */
export const PROVIDERS = {
  relief: {
    id: 'relief',
    name: 'Shaded relief',
    url: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/${z}/${y}/${x}`,
    maxZoom: 13,
    attribution: 'Esri, USGS, NOAA',
    /** Tint applied over the tiles so the basemap sinks behind the data. */
    wash: { light: 'rgba(250,247,240,0.30)', dark: 'rgba(10,16,22,0.62)' },
  },
  physical: {
    id: 'physical',
    name: 'Physical',
    url: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/${z}/${y}/${x}`,
    maxZoom: 8,
    attribution: 'Esri, US National Park Service',
    wash: { light: 'rgba(250,247,240,0.22)', dark: 'rgba(10,16,22,0.66)' },
  },
  plain: {
    id: 'plain',
    name: 'Plain',
    url: (z, x, y, dark) =>
      `https://a.basemaps.cartocdn.com/${dark ? 'dark' : 'light'}_nolabels/${z}/${x}/${y}.png`,
    maxZoom: 15,
    attribution: 'CARTO, OpenStreetMap contributors',
    wash: { light: 'rgba(255,255,255,0)', dark: 'rgba(0,0,0,0)' },
  },
};

/* ---------- Projection: Web Mercator, in zoom-0 pixels ---------- */

/** [lon, lat] → world pixel coordinates at zoom 0 (0…256). */
export function lonLatToWorld(lon, lat) {
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const s = Math.sin((clampedLat * Math.PI) / 180);
  return [
    ((lon + 180) / 360) * TILE_SIZE,
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE_SIZE,
  ];
}

/** World pixel coordinates at zoom 0 → [lon, lat]. */
export function worldToLonLat(x, y) {
  const lon = (x / TILE_SIZE) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (y / TILE_SIZE);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lon, lat];
}

/* ---------- Tile cache ---------- */

const cache = new Map();   // key → HTMLImageElement (complete) or 'pending'
const failed = new Set();
let inFlight = 0;
const MAX_PARALLEL = 12;
const queue = [];

function pump(onLoad) {
  while (inFlight < MAX_PARALLEL && queue.length) {
    const { key, url } = queue.shift();
    inFlight++;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      inFlight--;
      cache.set(key, img);
      onLoad?.();
      pump(onLoad);
    };
    img.onerror = () => {
      inFlight--;
      cache.delete(key);
      failed.add(key);
      pump(onLoad);
    };
    img.src = url;
  }
}

/**
 * Returns a loaded image for a tile, or null while it is still loading.
 * `onLoad` is called whenever a queued tile arrives, so the caller can redraw.
 */
function getTile(provider, z, x, y, dark, onLoad) {
  const key = `${provider.id}/${dark ? 'd' : 'l'}/${z}/${x}/${y}`;
  if (failed.has(key)) return null;
  const hit = cache.get(key);
  if (hit && hit !== 'pending') return hit;
  if (hit === 'pending') return null;

  cache.set(key, 'pending');
  queue.push({ key, url: provider.url(z, x, y, dark) });
  pump(onLoad);
  return null;
}

/** Best already-cached ancestor tile, used to fill gaps while loading. */
function getAncestor(provider, z, x, y, dark) {
  for (let dz = 1; dz <= 4; dz++) {
    const az = z - dz;
    if (az < 0) break;
    const ax = Math.floor(x / 2 ** dz);
    const ay = Math.floor(y / 2 ** dz);
    const img = cache.get(`${provider.id}/${dark ? 'd' : 'l'}/${az}/${ax}/${ay}`);
    if (img && img !== 'pending') return { img, az, ax, ay, dz };
  }
  return null;
}

/**
 * Draw the basemap.
 *
 * @param ctx      canvas 2D context
 * @param opts.scale  pixels per zoom-0 world pixel (i.e. 2**zoom)
 * @param opts.tx/ty  translation, screen = world*scale + t
 * @param opts.W/H    canvas size in CSS pixels
 * @returns true if at least one tile was painted
 */
export function drawTiles(ctx, { provider, scale, tx, ty, W, H, dark, onLoad }) {
  const zoom = Math.log2(scale);
  const z = Math.max(0, Math.min(provider.maxZoom, Math.round(zoom)));
  const n = 2 ** z;
  const tileWorld = TILE_SIZE / n;          // tile size in zoom-0 world pixels
  const tileScreen = tileWorld * scale;     // tile size on screen

  // Visible world-coordinate window.
  const wx0 = (0 - tx) / scale, wx1 = (W - tx) / scale;
  const wy0 = (0 - ty) / scale, wy1 = (H - ty) / scale;

  const x0 = Math.floor(wx0 / tileWorld), x1 = Math.ceil(wx1 / tileWorld);
  const y0 = Math.max(0, Math.floor(wy0 / tileWorld));
  const y1 = Math.min(n, Math.ceil(wy1 / tileWorld));

  let painted = 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let ty_ = y0; ty_ < y1; ty_++) {
    for (let tx_ = x0; tx_ < x1; tx_++) {
      // Wrap horizontally so panning past the antimeridian still paints.
      const wrapped = ((tx_ % n) + n) % n;
      const sx = tx_ * tileWorld * scale + tx;
      const sy = ty_ * tileWorld * scale + ty;
      // +1 avoids hairline seams from sub-pixel rounding.
      const size = Math.ceil(tileScreen) + 1;

      const img = getTile(provider, z, wrapped, ty_, dark, onLoad);
      if (img) {
        ctx.drawImage(img, Math.floor(sx), Math.floor(sy), size, size);
        painted++;
        continue;
      }
      // Fill from a coarser cached tile while this one loads.
      const anc = getAncestor(provider, z, wrapped, ty_, dark);
      if (anc) {
        const f = 2 ** anc.dz;
        const sub = TILE_SIZE / f;
        const ox = (wrapped % f) * sub;
        const oy = (ty_ % f) * sub;
        ctx.drawImage(anc.img, ox, oy, sub, sub, Math.floor(sx), Math.floor(sy), size, size);
        painted++;
      }
    }
  }

  // Wash the basemap back so overlays stay legible.
  const wash = provider.wash[dark ? 'dark' : 'light'];
  if (painted && wash && !wash.endsWith('0)')) {
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  return painted > 0;
}

export const tileStats = () => ({ cached: cache.size, failed: failed.size, queued: queue.length });
