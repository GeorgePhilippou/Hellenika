/* ============================================================
   Hellenika — People

   Content lives in content/people/*.md. This file loads the
   compiled data/people.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const people = await loadJSON(import.meta.url, './people.json');

export const peopleById = new Map(people.map((p) => [p.id, p]));
