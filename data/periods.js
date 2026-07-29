/* ============================================================
   Hellenika — Periods

   Content lives in content/periods/*.md (one file per period,
   YAML frontmatter + plain-prose body). This file just loads the
   compiled data/periods.json and exposes the same API every other
   module already imports — see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const periods = await loadJSON(import.meta.url, './periods.json');

/** Fast lookup by id. */
export const periodById = new Map(periods.map((p) => [p.id, p]));

/** Periods active in a given year, most specific first. */
export function periodsAt(year) {
  return periods.filter((p) => year >= p.start && year <= p.end);
}

/** The single best period label for a year (narrowest span wins). */
export function primaryPeriodAt(year) {
  const active = periodsAt(year);
  if (!active.length) return null;
  return active.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
}
