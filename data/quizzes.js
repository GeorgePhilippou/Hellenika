/* ============================================================
   Hellenika — Learning mode

   Content lives in content/quizzes/*.md (quizzes--*.md and
   gameModes--*.md). This file loads the compiled
   data/quizzes.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

const { quizzes, gameModes } = await loadJSON(import.meta.url, './quizzes.json');
export { quizzes, gameModes };

export const quizById = new Map(quizzes.map((q) => [q.id, q]));
export const gameModeById = new Map(gameModes.map((g) => [g.id, g]));
