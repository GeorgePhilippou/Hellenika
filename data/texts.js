/* ============================================================
   Hellenika — Texts

   Content lives in content/texts/*.md. This file loads the
   compiled data/texts.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const texts = await loadJSON(import.meta.url, './texts.json');

export const textsById = new Map(texts.map((t) => [t.id, t]));
