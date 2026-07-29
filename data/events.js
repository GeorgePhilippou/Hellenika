/* ============================================================
   Hellenika — Events, wars and battles

   Content lives in content/events/*.md. This file loads the
   compiled data/events.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const events = await loadJSON(import.meta.url, './events.json');

export const eventsById = new Map(events.map((e) => [e.id, e]));
export const battles = events.filter((e) => e.type === 'battle');
export const wars = events.filter((e) => e.type === 'war');
