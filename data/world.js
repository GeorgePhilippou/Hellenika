/* ============================================================
   Hellenika — World History context

   Lightweight timeline-only annotations for civilizations beyond
   Greece — the ones Greek history was in constant contact with.
   Content (worldPeriods/worldEvents) lives in content/world/*.md;
   this file loads the compiled data/world.json — see
   scripts/compile-content.mjs. WORLD_LANES is app configuration
   (which lane label maps to which row on the ribbon), not authored
   content, so it stays a literal here rather than moving to
   content/.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const WORLD_LANES = ['Egypt', 'Near East', 'Rome', 'Carthage', 'Indus Valley & Vedic India', 'Dynastic China'];

const { worldPeriods, worldEvents } = await loadJSON(import.meta.url, './world.json');
export { worldPeriods, worldEvents };
