#!/usr/bin/env node
/* ============================================================
   Hellenika — image resolution audit

   Every entity page tries to resolve a Wikipedia photo live, by
   title match on the entity's name (js/components/images.js). This
   script runs that exact same resolution offline, against every
   entity in every category that gets an entity page, and reports:

     MISSING   - no thumbnail resolved, and not deliberately skipped.
                 These render as the plain glyph placeholder on the
                 live site -- the bug the user is seeing.
     REDIRECT  - resolved, but through a title normalisation/redirect
                 substantial enough to be worth a human glance (catches
                 the "Nike" -> shoe-brand-instead-of-goddess class of
                 silent wrong-image bug that a bare thumbnail check
                 can't see).
     TINY      - resolved to a thumbnail under 120px on its long edge,
                 usually a coat-of-arms/coin/icon rather than a real
                 photo, and worth a second look.
     SKIPPED   - in imageSkip. Expected to have no photo; not a bug.

   Usage: node scripts/check-images.mjs [--json]
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API = 'https://en.wikipedia.org/w/api.php';
const THUMB_SIZE = 640;
const BATCH = 45;

const CATEGORY_FILES = [
  'periods', 'people', 'places', 'events', 'artefacts',
  'texts', 'myth', 'odyssey-places', 'culture',
];

function loadJSON(name) {
  return JSON.parse(readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
}

function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/* ---------- gather every entity that gets a hero photo slot ---------- */

const images = loadJSON('images');
const imageOverrides = images.overrides;
const imageSkip = new Set(images.skip);

const entities = [];
for (const file of CATEGORY_FILES) {
  const arr = loadJSON(file);
  for (const e of arr) entities.push({ id: e.id, name: e.name, type: e.type, category: file });
}

function titleFor(entity) {
  if (imageSkip.has(entity.id)) return null;
  if (imageOverrides[entity.id]) return imageOverrides[entity.id];
  return entity.name.replace(/^(the|a|an)\s+/i, '').replace(/\s*\(.*?\)\s*$/, '').trim();
}

const titleForId = new Map();
const byTitleKey = new Map(); // folded title -> { title, ids: [] }
const skipped = [];

for (const e of entities) {
  if (imageSkip.has(e.id)) { skipped.push(e); continue; }
  const t = titleFor(e);
  titleForId.set(e.id, t);
  const key = fold(t);
  if (!byTitleKey.has(key)) byTitleKey.set(key, { title: t, ids: [] });
  byTitleKey.get(key).ids.push(e.id);
}

console.log(`Entities total: ${entities.length}`);
console.log(`Deliberately skipped (imageSkip): ${skipped.length}`);
console.log(`To resolve: ${entities.length - skipped.length} (${byTitleKey.size} unique titles)\n`);

/* ---------- batch-resolve against the live Wikipedia API, exactly as
   js/components/images.js's flush() does ---------- */

const resolved = new Map(); // id -> entry | null

const groups = [...byTitleKey.values()];
for (let i = 0; i < groups.length; i += BATCH) {
  const batch = groups.slice(i, i + BATCH);
  const titles = batch.map((g) => g.title);
  const url = `${API}?action=query&format=json&origin=*&redirects=1`
    + `&prop=pageimages|pageprops&piprop=thumbnail|name&pithumbsize=${THUMB_SIZE}`
    + `&titles=${encodeURIComponent(titles.join('|'))}`;

  let json;
  try {
    const res = await fetch(url);
    json = await res.json();
  } catch (err) {
    console.error(`Batch ${i / BATCH + 1} failed: ${err.message}`);
    for (const g of batch) for (const id of g.ids) resolved.set(id, { error: true });
    continue;
  }

  const pages = Object.values(json.query?.pages || {});
  const normMap = new Map((json.query?.normalized || []).map((x) => [x.from, x.to]));
  const redirMap = new Map((json.query?.redirects || []).map((x) => [x.from, x.to]));

  for (const g of batch) {
    let t = g.title;
    if (normMap.has(t)) t = normMap.get(t);
    if (redirMap.has(t)) t = redirMap.get(t);
    const page = pages.find((p) => p.title === t);
    const isDisambig = !!(page?.pageprops && 'disambiguation' in page.pageprops);
    const entry = (page && page.thumbnail && !isDisambig)
      ? {
          resolvedTitle: page.title,
          src: page.thumbnail.source,
          w: page.thumbnail.width,
          h: page.thumbnail.height,
        }
      : null;
    for (const id of g.ids) resolved.set(id, entry);
  }
  process.stderr.write(`.`);
}
process.stderr.write('\n\n');

/* ---------- classify ---------- */

const missing = [];
const redirected = [];
const tiny = [];
const ok = [];

for (const e of entities) {
  if (imageSkip.has(e.id)) continue;
  const startTitle = titleForId.get(e.id);
  const entry = resolved.get(e.id);
  if (!entry || entry.error) { missing.push({ ...e, startTitle, error: entry?.error }); continue; }
  const longEdge = Math.max(entry.w, entry.h);
  const isRedirectWorthChecking = fold(entry.resolvedTitle) !== fold(startTitle)
    && !fold(entry.resolvedTitle).includes(fold(startTitle).split(' ')[0])
    && !fold(startTitle).includes(fold(entry.resolvedTitle).split(' ')[0]);
  if (isRedirectWorthChecking) redirected.push({ ...e, startTitle, resolvedTitle: entry.resolvedTitle, w: entry.w, h: entry.h });
  else if (longEdge < 120) tiny.push({ ...e, startTitle, resolvedTitle: entry.resolvedTitle, w: entry.w, h: entry.h });
  else ok.push({ ...e, startTitle, resolvedTitle: entry.resolvedTitle, w: entry.w, h: entry.h });
}

console.log(`OK (photo resolved cleanly): ${ok.length}`);
console.log(`MISSING (no photo -> placeholder glyph): ${missing.length}`);
console.log(`REDIRECT (resolved through a title mismatch worth eyeballing): ${redirected.length}`);
console.log(`TINY (thumbnail under 120px -- likely an icon/coin, not a photo): ${tiny.length}`);
console.log(`SKIPPED (imageSkip, intentional): ${skipped.length}\n`);

function printGroup(title, list) {
  if (!list.length) return;
  console.log(`\n=== ${title} (${list.length}) ===`);
  for (const e of list) {
    const extra = e.resolvedTitle ? ` -> "${e.resolvedTitle}" (${e.w}x${e.h})` : (e.error ? ' [fetch error]' : '');
    console.log(`  [${e.category}] ${e.id} — "${e.startTitle}"${extra}`);
  }
}

printGroup('MISSING', missing);
printGroup('REDIRECT — verify', redirected);
printGroup('TINY thumbnail', tiny);

if (process.argv.includes('--json')) {
  writeFileSync(
    path.join(ROOT, 'scripts', 'image-audit-report.json'),
    JSON.stringify({ missing, redirected, tiny, okCount: ok.length, skippedCount: skipped.length }, null, 2),
  );
  console.log('\nWrote scripts/image-audit-report.json');
}
