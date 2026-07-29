/* ============================================================
   Hellenika — Geography

   Rendering strategy: the canvas is filled with land, then SEAS
   are painted on top, then ISLANDS are painted back as land.
   This needs far fewer coordinates than outlining every landmass
   and keeps the Mediterranean shape recognisable at every zoom.

   All coordinates are [longitude, latitude] in degrees. Outlines
   are deliberately generalised — this is a schematic historical
   atlas, not a survey map.

   Content (seas/islands/rivers/territories/routes) lives in
   content/geo/*.md; this file loads the compiled data/geo.json —
   see scripts/compile-content.mjs. EXTENT is the map's projection
   bounds, not authored content, so it stays a literal here rather
   than moving to content/.
   ============================================================ */

import { loadJSON } from './_load-json.js';

/* ---------- Map extent ---------- */
export const EXTENT = { lonMin: -8, lonMax: 78, latMin: 20, latMax: 50 };

const {
  seas, islands, rivers, territories, routes,
} = await loadJSON(import.meta.url, './geo.json');

export { seas, islands, rivers, territories, routes };

/* ---------- Helpers ---------- */
export const territoriesAt = (year) =>
  territories.filter((t) => year >= t.from && year <= t.to);

export const routesAt = (year) =>
  routes.filter((r) => year >= r.from && year <= r.to);
