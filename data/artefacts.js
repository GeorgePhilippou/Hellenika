/* ============================================================
   Hellenika — Artefacts

   Content lives in content/artefacts/*.md. This file loads the
   compiled data/artefacts.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const artefacts = await loadJSON(import.meta.url, './artefacts.json');

export const artefactsById = new Map(artefacts.map((a) => [a.id, a]));
