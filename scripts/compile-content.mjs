/* ============================================================
   Hellenika — content build: content/*.md files -> data/*.json

   Compiles every content/<category>/*.md file back into the
   data/<category>.json the thin data/*.js loader shims fetch at
   runtime. Run this (`npm run content:build`) after editing any
   file under content/.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES } from './content-schema.mjs';
import { fromMarkdown, joinEntity } from './lib/content-io.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_DIR = path.join(ROOT, 'data');

let totalEntities = 0;
let totalFiles = 0;

for (const [category, def] of Object.entries(CATEGORIES)) {
  const catDir = path.join(CONTENT_DIR, category);
  const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.md'));
  const multiGroup = def.groups.length > 1;

  // Bucket every file's parsed contents by which group it belongs to.
  const byGroup = new Map(def.groups.map((g) => [g.name, []]));
  for (const file of files) {
    const groupName = multiGroup ? file.split('--')[0] : def.groups[0].name;
    const bucket = byGroup.get(groupName);
    if (!bucket) throw new Error(`${category}/${file}: unrecognised group prefix "${groupName}"`);
    const text = fs.readFileSync(path.join(catDir, file), 'utf8');
    const parsed = fromMarkdown(text);
    if (parsed.frontmatter._ignore) continue; // see that file's own `_reason`
    bucket.push(parsed);
    totalFiles++;
  }

  const output = {};
  for (const group of def.groups) {
    const parsed = byGroup.get(group.name);

    if (group.kind === 'id-list') {
      const [{ frontmatter }] = parsed;
      output[group.name] = frontmatter.ids;
      continue;
    }

    if (group.kind === 'flat-map') {
      const sorted = parsed
        .map(({ frontmatter }) => frontmatter)
        .sort((a, b) => a._order - b._order);
      output[group.name] = Object.fromEntries(sorted.map((fm) => [fm.id, fm.wikipediaTitle]));
      totalEntities += sorted.length;
      continue;
    }

    const entities = parsed
      .map(({ frontmatter, sections }) => {
        const { _order, ...fm } = frontmatter;
        return { _order, entity: joinEntity(fm, sections) };
      })
      .sort((a, b) => a._order - b._order)
      .map((x) => x.entity);
    totalEntities += entities.length;

    if (def.shape === 'object' && def.groups.length === 1) {
      // sources.js: keyed by id, not an array of {id, ...}.
      const obj = {};
      for (const e of entities) {
        const { id, ...rest } = e;
        obj[id] = rest;
      }
      output[group.name] = obj;
    } else {
      output[group.name] = entities;
    }
  }

  const jsonValue = multiGroup ? output : output[def.groups[0].name];
  fs.writeFileSync(path.join(DATA_DIR, `${category}.json`), JSON.stringify(jsonValue));
}

console.log(`Compiled ${totalEntities} entities from ${totalFiles} content files into data/*.json.`);
