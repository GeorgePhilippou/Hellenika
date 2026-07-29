/* ============================================================
   Hellenika — Collections

   Content lives in content/collections/*.md. This file loads the
   compiled data/collections.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const collections = await loadJSON(import.meta.url, './collections.json');

export const collectionsById = new Map(collections.map((c) => [c.id, c]));
