/* ============================================================
   Hellenika — content round-trip verification

   Compile the Markdown content tree in memory and compare it with
   the checked-in data/*.json files. This catches authoring/output
   drift without rewriting the working tree.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { CATEGORIES } from './content-schema.mjs';
import { fromMarkdown, joinEntity } from './lib/content-io.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_DIR = path.join(ROOT, 'data');

let totalEntities = 0;
let totalFiles = 0;
const mismatches = [];

function compileCategory(category, def) {
  const catDir = path.join(CONTENT_DIR, category);
  const files = fs.readdirSync(catDir).filter((file) => file.endsWith('.md'));
  const multiGroup = def.groups.length > 1;
  const byGroup = new Map(def.groups.map((group) => [group.name, []]));

  for (const file of files) {
    const groupName = multiGroup ? file.split('--')[0] : def.groups[0].name;
    const bucket = byGroup.get(groupName);
    if (!bucket) throw new Error(`${category}/${file}: unrecognised group prefix "${groupName}"`);

    const text = fs.readFileSync(path.join(catDir, file), 'utf8');
    const parsed = fromMarkdown(text);
    if (parsed.frontmatter._ignore) continue;
    bucket.push(parsed);
    totalFiles++;
  }

  const output = {};
  for (const group of def.groups) {
    const parsed = byGroup.get(group.name);

    if (group.kind === 'id-list') {
      output[group.name] = parsed[0].frontmatter.ids;
      continue;
    }

    if (group.kind === 'flat-map') {
      const sorted = parsed
        .map(({ frontmatter }) => frontmatter)
        .sort((a, b) => a._order - b._order);
      output[group.name] = Object.fromEntries(
        sorted.map((frontmatter) => [frontmatter.id, frontmatter.wikipediaTitle])
      );
      totalEntities += sorted.length;
      continue;
    }

    const entities = parsed
      .map(({ frontmatter, sections }) => {
        const { _order, ...fields } = frontmatter;
        return { _order, entity: joinEntity(fields, sections) };
      })
      .sort((a, b) => a._order - b._order)
      .map(({ entity }) => entity);
    totalEntities += entities.length;

    if (def.shape === 'object' && def.groups.length === 1) {
      output[group.name] = Object.fromEntries(
        entities.map(({ id, ...fields }) => [id, fields])
      );
    } else {
      output[group.name] = entities;
    }
  }

  return multiGroup ? output : output[def.groups[0].name];
}

for (const [category, def] of Object.entries(CATEGORIES)) {
  const compiled = compileCategory(category, def);
  const checkedIn = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, `${category}.json`), 'utf8')
  );

  try {
    assert.deepStrictEqual(checkedIn, compiled);
  } catch {
    mismatches.push(category);
  }
}

if (mismatches.length) {
  console.error(`Content output is stale for: ${mismatches.join(', ')}`);
  console.error('Run npm run content:build and inspect the resulting data changes.');
  process.exit(1);
}

console.log(
  `Content round-trip passed: ${totalEntities} records from ${totalFiles} Markdown files match data/*.json.`
);
