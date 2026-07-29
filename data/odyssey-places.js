/* ============================================================
   Hellenika — The Odyssey's places

   Content lives in content/odyssey-places/*.md. This file loads
   the compiled data/odyssey-places.json — see
   scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const odysseyPlaces = await loadJSON(import.meta.url, './odyssey-places.json');
