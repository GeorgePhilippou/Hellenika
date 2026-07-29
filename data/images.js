/* ============================================================
   Hellenika — Image title overrides

   Images are resolved live from Wikipedia by title match on the
   entity's name (see js/components/images.js). Most names resolve
   automatically once a leading "The/A/An" and a trailing
   parenthetical are stripped — but a good number collide with a
   disambiguation page, a redirect to something else, or simply use
   different phrasing on Wikipedia than the entity's display name.

   Content lives in content/images/*.md (one file per override,
   plus a single skip--all.md holding the skip list). This file
   loads the compiled data/images.json — see
   scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

const { overrides, skip } = await loadJSON(import.meta.url, './images.json');

export const imageOverrides = overrides;
export const imageSkip = new Set(skip);
