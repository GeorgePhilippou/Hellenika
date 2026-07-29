/* ============================================================
   Hellenika — Writing systems, languages, empires and regions

   Content lives in content/culture/*.md. This file loads the
   compiled data/culture.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const culture = await loadJSON(import.meta.url, './culture.json');

export const cultureById = new Map(culture.map((c) => [c.id, c]));
