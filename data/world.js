/* ============================================================
   Hellenika — World History context

   Lightweight timeline-only annotations for civilizations beyond
   Greece — the ones Greek history was in constant contact with —
   plus two collections for the #/world known-world overview (its
   own independent time range; see js/views/world.js):
   worldTerritories (shaded map regions) and worldSites (archaeological-
   site point markers for places outside the core Greek-world entity
   graph in data/places.js — these never had direct Greek contact, so
   they stay lightweight annotations here rather than full entities
   with claims and a dedicated page, the same reasoning that already
   applies to worldPeriods/worldEvents). Content lives in
   content/world/*.md; this file loads the compiled data/world.json —
   see scripts/compile-content.mjs. WORLD_LANES is app configuration
   (which lane label maps to which row on the timeline ribbon), not
   authored content, so it stays a literal here rather than moving to
   content/.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const WORLD_LANES = ['Egypt', 'Near East', 'Rome', 'Carthage', 'Indus Valley & Vedic India', 'Dynastic China'];

const {
  worldPeriods, worldEvents, worldTerritories, worldSites,
} = await loadJSON(import.meta.url, './world.json');
export {
  worldPeriods, worldEvents, worldTerritories, worldSites,
};
