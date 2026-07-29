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
    // Each tile is recoloured once, on load, to an exact flat two-tone
    // image (see recolorTile below) — land is literally this orange RGB,
    // sea is literally black (dark mode) or white (light mode). CARTO's
    // dark_nolabels tiles turned out to render water as the *lighter*
    // pixel and land as the darker one (the reverse of light_nolabels),
    // hence landIsDarker differing between the two.
    //
    // `threshold` is a FIXED luminance split, not computed per tile.
    // Sampled directly off CARTO's real tiles: light-theme sea sits at
    // ~208–216, land at ~250; dark-theme land sits at ~9, sea at ~38 —
    // so 232 / 24 sit safely in the gap. A per-tile adaptive threshold
    // (that tile's own min/max midpoint) sounds more precise but breaks
    // completely on any tile that's a single uniform colour — open sea
    // far from any coastline, for instance — because min equals max
    // there, and the boundary comparison then classifies the *entire*
    // tile as land regardless of what colour it actually is. That's the
    // solid orange rectangle bug: a whole tile of real Mediterranean
    // open water, uniformly one shade, flipped to 100% land.
    recolor: {
      light: { land: [214, 101, 32], sea: [255, 255, 255], landIsDarker: false, threshold: 232 },
      dark: { land: [232, 140, 60], sea: [0, 0, 0], landIsDarker: true, threshold: 24 },
    },
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

const cache = new Map();   // key → HTMLImageElement or <canvas> (complete) or 'pending'
const failed = new Set();
let inFlight = 0;
const MAX_PARALLEL = 12;
const queue = [];

/**
 * Recolours a loaded tile image to an exact flat two-tone image: every
 * pixel is classified land or sea by a fixed luminance threshold (see
 * the `recolor` comment on the 'plain' provider above for why it's
 * fixed rather than computed per tile) and then set to a literal RGB,
 * not tinted. A translucent hue-preserving wash can't turn an
 * already-near-white or already-near-black pixel into a different,
 * visibly distinct colour — this replaces the pixel outright, so the
 * result matches "land orange / sea black-or-white" exactly rather than
 * approximately.
 */
function recolorTile(img, { land, sea, landIsDarker, threshold }) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0);

  const imageData = octx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // transparent tile padding, e.g. antimeridian edges
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const isLand = landIsDarker ? lum <= threshold : lum >= threshold;
    const [r, g, b] = isLand ? land : sea;
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  octx.putImageData(imageData, 0, 0);
  return off;
}

function pump(onLoad) {
  while (inFlight < MAX_PARALLEL && queue.length) {
    const { key, url, recolor } = queue.shift();
    inFlight++;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      inFlight--;
      try {
        cache.set(key, recolor ? recolorTile(img, recolor) : img);
      } catch {
        // Canvas got tainted (e.g. the CDN didn't send CORS headers this
        // time) — fall back to the plain, untinted tile rather than
        // losing it entirely.
        cache.set(key, img);
      }
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
  const recolor = provider.recolor?.[dark ? 'dark' : 'light'];
  queue.push({ key, url: provider.url(z, x, y, dark), recolor });
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

  // Wash the basemap back so overlays stay legible. ('plain' doesn't use
  // this — its tiles are already recoloured to an exact flat colour per
  // pixel when loaded, see recolorTile — but 'relief'/'physical' still
  // need a translucent wash so photographic tile detail doesn't fight
  // with the data drawn on top.)
  const wash = provider.wash?.[dark ? 'dark' : 'light'];
  if (painted && wash && !wash.endsWith('0)')) {
    ctx.save();
    if (provider.washMode) ctx.globalCompositeOperation = provider.washMode;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  ctx.restore();

  return painted > 0;
}

export const tileStats = () => ({ cached: cache.size, failed: failed.size, queued: queue.length });
