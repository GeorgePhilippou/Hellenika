/* ============================================================
   Hellenika — Sources

   Content lives in content/sources/*.md (one file per source,
   `kind` distinguishing ancient primary texts from modern
   scholarship). This file loads the compiled data/sources.json —
   see scripts/compile-content.mjs.
   ============================================================ */

import { loadJSON } from './_load-json.js';

export const sources = await loadJSON(import.meta.url, './sources.json');

/** Ordered list for the Sources view. */
export const sourceList = Object.entries(sources)
  .map(([id, s]) => ({ id, ...s }))
  .sort((a, b) => a.author.localeCompare(b.author));

export const ancientSources = sourceList.filter((s) => s.kind === 'ancient');
export const modernSources = sourceList.filter((s) => s.kind === 'modern');
