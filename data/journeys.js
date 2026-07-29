/* ============================================================
   Hellenika — Journey map curation

   "Which entities, in what order, with what one-line caption" for
   the narrative journey-map modes. Content lives in
   content/journeys/*.md; this file loads the compiled
   data/journeys.json — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

const {
  odysseyJourney, alexanderJourney, alexanderFoundations, alexanderTerritoryStages,
} = await loadJSON(import.meta.url, './journeys.json');

export { odysseyJourney, alexanderJourney, alexanderFoundations, alexanderTerritoryStages };

export const alexanderTerritoryIds = alexanderTerritoryStages.map((stage) => stage.id);
