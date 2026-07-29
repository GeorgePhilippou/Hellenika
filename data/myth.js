/* ============================================================
   Hellenika — Mythology and religion

   Content lives in content/myth/*.md. This file loads the
   compiled data/myth.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const mythology = await loadJSON(import.meta.url, './myth.json');

export const mythById = new Map(mythology.map((m) => [m.id, m]));
export const deities = mythology.filter((m) => m.type === 'deity');
export const mythFigures = mythology.filter((m) => m.type === 'myth');
