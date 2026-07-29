/* ============================================================
   Hellenika — one-time migration: data/*.js -> content/*.md files

   Reads today's data/*.js modules exactly as they are (nothing is
   modified or deleted by this script) and writes one Markdown file
   per entity into content/<category>/. Structured/nested fields
   (claims, relations, stops, rings, ...) go into YAML frontmatter
   verbatim; narrative prose fields become marker-delimited sections
   in the Markdown body (see scripts/lib/content-io.mjs).

   Also writes a legacy snapshot (.tmp/legacy-snapshot.json) of every
   entity as imported here, *before* the thin JSON-loading shims
   replace data/*.js. That snapshot is the baseline the later
   verify-content.mjs script diffs the rebuilt data against.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES } from './content-schema.mjs';
import { slug, splitEntity, toMarkdown } from './lib/content-io.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = path.join(ROOT, 'content');
const TMP_DIR = path.join(ROOT, '.tmp');

// data/*.js exports the arrays/objects this script consumes.
import * as periodsMod from '../data/periods.js';
import * as peopleMod from '../data/people.js';
import * as placesMod from '../data/places.js';
import * as eventsMod from '../data/events.js';
import * as artefactsMod from '../data/artefacts.js';
import * as textsMod from '../data/texts.js';
import * as mythMod from '../data/myth.js';
import * as odysseyPlacesMod from '../data/odyssey-places.js';
import * as cultureMod from '../data/culture.js';
import * as collectionsMod from '../data/collections.js';
import * as quizzesMod from '../data/quizzes.js';
import * as sourcesMod from '../data/sources.js';
import * as worldMod from '../data/world.js';
import * as journeysMod from '../data/journeys.js';
import * as geoMod from '../data/geo.js';
import * as imagesMod from '../data/images.js';

/** Maps a schema group name to the actual array/object currently
 *  exported from the corresponding data/*.js module. */
const SOURCE = {
  periods: periodsMod.periods,
  people: peopleMod.people,
  places: placesMod.places,
  events: eventsMod.events,
  artefacts: artefactsMod.artefacts,
  texts: textsMod.texts,
  mythology: mythMod.mythology,
  odysseyPlaces: odysseyPlacesMod.odysseyPlaces,
  culture: cultureMod.culture,
  collections: collectionsMod.collections,
  quizzes: quizzesMod.quizzes,
  gameModes: quizzesMod.gameModes,
  sources: sourcesMod.sources, // object keyed by id
  worldPeriods: worldMod.worldPeriods,
  worldEvents: worldMod.worldEvents,
  odysseyJourney: journeysMod.odysseyJourney,
  alexanderJourney: journeysMod.alexanderJourney,
  alexanderFoundations: journeysMod.alexanderFoundations,
  alexanderTerritoryStages: journeysMod.alexanderTerritoryStages,
  seas: geoMod.seas,
  islands: geoMod.islands,
  rivers: geoMod.rivers,
  territories: geoMod.territories,
  routes: geoMod.routes,
  overrides: imagesMod.imageOverrides, // flat id -> string
  skip: imagesMod.imageSkip, // Set of ids
};

// Deliberately not wiped first: this script only ever (re-)writes the
// filenames it expects to produce, and is safe to re-run. (On some
// mounted/networked filesystems deleting or renaming files isn't
// permitted even though creating and overwriting them is — this script
// avoids relying on delete/rename entirely so it works either way.)
fs.mkdirSync(CONTENT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const snapshot = {}; // category -> group -> array/object, exactly as read here
let fileCount = 0;
let entityCount = 0;

for (const [category, def] of Object.entries(CATEGORIES)) {
  const catDir = path.join(CONTENT_DIR, category);
  fs.mkdirSync(catDir, { recursive: true });
  const multiGroup = def.groups.length > 1;
  snapshot[category] = {};

  for (const group of def.groups) {
    const data = SOURCE[group.name];
    const prefix = multiGroup ? `${group.name}--` : '';

    if (group.kind === 'flat-map') {
      // images.js imageOverrides: id -> plain string (Wikipedia title).
      // No prose, no nested structure — one tiny frontmatter-only file
      // per entry, holding the id and the override value.
      const entries = Object.entries(data);
      snapshot[category][group.name] = Object.fromEntries(entries);
      entries.forEach(([id, wikipediaTitle], i) => {
        const fm = { id, wikipediaTitle, _order: i };
        const filePath = path.join(catDir, `${prefix}${slug(id)}.md`);
        fs.writeFileSync(filePath, toMarkdown(fm, []));
        fileCount++; entityCount++;
      });
      continue;
    }

    if (group.kind === 'id-list') {
      // images.js imageSkip: a bare Set of ids. Modelled as a single
      // document holding the list — there's no per-entity content here,
      // just a curated set, so one file is the honest shape.
      const ids = [...data];
      snapshot[category][group.name] = ids;
      const filePath = path.join(catDir, `${prefix}all.md`);
      fs.writeFileSync(filePath, toMarkdown({ ids }, []));
      fileCount++;
      continue;
    }

    // shape: 'object' (sources.js) — normalise to [id, record] pairs;
    // shape: 'array' — already [{id, ...}]. Both end up as (id, raw) pairs.
    const pairs = Array.isArray(data)
      ? data.map((raw) => [raw.id, raw])
      : Object.entries(data).map(([id, rec]) => [id, { id, ...rec }]);

    snapshot[category][group.name] = data;

    pairs.forEach(([id, raw], i) => {
      const { frontmatter, sections } = splitEntity(raw, group.prose);
      frontmatter._order = i;
      // Filenames use `id` for readability, except where a journey stop's
      // `key` is the true unique handle — a journey can legitimately visit
      // the same entity twice (e.g. Alexander's campaign passes through
      // Babylon both outbound and on the return march), so two stops can
      // share one `id` while their `key`s differ.
      const fileKey = raw.key ?? id;
      const filePath = path.join(catDir, `${prefix}${slug(fileKey)}.md`);
      fs.writeFileSync(filePath, toMarkdown(frontmatter, sections));
      fileCount++; entityCount++;
    });
  }
}

fs.writeFileSync(path.join(TMP_DIR, 'legacy-snapshot.json'), JSON.stringify(snapshot));

console.log(`Migrated ${entityCount} entities into ${fileCount} files under content/.`);
console.log(`Legacy snapshot written to .tmp/legacy-snapshot.json for later verification.`);
