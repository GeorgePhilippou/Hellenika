/* ============================================================
   Hellenika — content verification

   Deep-equality check, per entity, of the compiled data/*.json
   against .tmp/legacy-snapshot.json (captured by
   migrate-to-content.mjs directly from the *original* data/*.js
   arrays, before those files were replaced with JSON-loading
   shims). This is the safety net for the migration: every one of
   the ~960 entities across all 16 categories is checked, not a
   sample.
   ============================================================ */

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CATEGORIES } from './content-schema.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA_DIR = `${ROOT}data`;
const SNAPSHOT_PATH = `${ROOT}.tmp/legacy-snapshot.json`;

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error('No .tmp/legacy-snapshot.json found — run migrate-to-content.mjs first.');
  process.exit(1);
}
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

let checked = 0;
let mismatches = 0;

function keyFor(entity, index) {
  if (entity && typeof entity === 'object' && 'key' in entity) return `key=${entity.key}`;
  if (entity && typeof entity === 'object' && 'id' in entity) return `id=${entity.id}`;
  return `#${index}`;
}

function compareArray(cat, group, expected, actual) {
  if (expected.length !== actual.length) {
    console.error(`  [${cat}/${group}] length mismatch: expected ${expected.length}, got ${actual.length}`);
    mismatches++;
    return;
  }
  // Journeys can legitimately repeat `id` (Alexander visits Babylon
  // twice), so pair up by array position, which both the legacy array
  // and the compiled array preserve via `_order` / source order.
  for (let i = 0; i < expected.length; i++) {
    checked++;
    try {
      assert.deepStrictEqual(actual[i], expected[i]);
    } catch (err) {
      mismatches++;
      console.error(`  [${cat}/${group}] mismatch at index ${i} (${keyFor(expected[i], i)}):`);
      console.error(`    ${err.message.split('\n').slice(0, 6).join('\n    ')}`);
    }
  }
}

function compareObject(cat, group, expected, actual) {
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  if (expectedKeys.join(',') !== actualKeys.join(',')) {
    console.error(`  [${cat}/${group}] key set mismatch`);
    mismatches++;
    return;
  }
  for (const k of expectedKeys) {
    checked++;
    try {
      assert.deepStrictEqual(actual[k], expected[k]);
    } catch (err) {
      mismatches++;
      console.error(`  [${cat}/${group}] mismatch at key ${k}:`);
      console.error(`    ${err.message.split('\n').slice(0, 6).join('\n    ')}`);
    }
  }
}

for (const [cat, def] of Object.entries(CATEGORIES)) {
  const json = JSON.parse(fs.readFileSync(`${DATA_DIR}/${cat}.json`, 'utf8'));
  const multiGroup = def.groups.length > 1;

  for (const group of def.groups) {
    const expected = snapshot[cat][group.name];
    const actual = multiGroup ? json[group.name] : json;

    if (Array.isArray(expected)) compareArray(cat, group.name, expected, actual);
    else compareObject(cat, group.name, expected, actual);
  }
}

console.log(`\nChecked ${checked} records across ${Object.keys(CATEGORIES).length} categories.`);
if (mismatches) {
  console.error(`${mismatches} mismatch(es) found. See above.`);
  process.exit(1);
} else {
  console.log('All records match the pre-migration data exactly.');
}
