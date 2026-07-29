/* ============================================================
   Hellenika — Cities and archaeological sites

   Content lives in content/places/*.md. This file loads the
   compiled data/places.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const places = await loadJSON(import.meta.url, './places.json');

export const placesById = new Map(places.map((p) => [p.id, p]));
export const cities = places.filter((p) => p.type === 'city');
export const sites = places.filter((p) => p.type === 'site');
