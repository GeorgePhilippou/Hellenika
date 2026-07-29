import fs from 'node:fs';
import { EXTENT, territories, routes } from '../data/geo.js';

const errors = [];
const warnings = [];
const ids = new Set();
const validKinds = new Set([
  'polity', 'league', 'culture', 'regional',
  'campaign', 'hypothesis', 'network', 'road',
]);
const tokenText = fs.readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const tintTokens = new Set([...tokenText.matchAll(/--p-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const between = (a, b, p) =>
  p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0])
  && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
const segmentsIntersect = (a, b, c, d) => {
  const abC = orient(a, b, c), abD = orient(a, b, d);
  const cdA = orient(c, d, a), cdB = orient(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  const eps = 1e-9;
  return (Math.abs(abC) < eps && between(a, b, c))
    || (Math.abs(abD) < eps && between(a, b, d))
    || (Math.abs(cdA) < eps && between(c, d, a))
    || (Math.abs(cdB) < eps && between(c, d, b));
};

function ringIntersections(ring) {
  const hits = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    for (let j = i + 1; j < ring.length; j++) {
      if (j === i || j === i + 1 || (i === 0 && j === ring.length - 1)) continue;
      const c = ring[j], d = ring[(j + 1) % ring.length];
      if (segmentsIntersect(a, b, c, d)) hits.push(`${i}-${i + 1}/${j}-${(j + 1) % ring.length}`);
    }
  }
  return hits;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi) inside = !inside;
  }
  return inside;
}

for (const item of [...territories, ...routes]) {
  const shapes = item.ring ? [item.ring] : item.paths ?? [item.path];
  const minimum = item.ring ? 3 : 2;

  if (!item.id || ids.has(item.id)) errors.push(`Duplicate or missing id: ${item.id || '(missing)'}`);
  ids.add(item.id);
  if (!item.name) errors.push(`Missing name: ${item.id}`);
  if (item.from > item.to) errors.push(`Reversed date range: ${item.id}`);
  if (!shapes.length || shapes.some((shape) => !shape || shape.length < minimum)) {
    errors.push(`Too few coordinates: ${item.id}`);
  }
  if (item.tint && !tintTokens.has(item.tint)) errors.push(`Unknown tint "${item.tint}": ${item.id}`);
  if (item.kind && !validKinds.has(item.kind)) warnings.push(`Unrecognised kind "${item.kind}": ${item.id}`);

  for (const shape of shapes) {
    for (const point of shape ?? []) {
      if (!Array.isArray(point) || point.length !== 2 || point.some((n) => !Number.isFinite(n))) {
        errors.push(`Malformed coordinate: ${item.id}`);
        continue;
      }
      const [lon, lat] = point;
      if (lon < EXTENT.lonMin || lon > EXTENT.lonMax || lat < EXTENT.latMin || lat > EXTENT.latMax) {
        errors.push(`Coordinate outside map extent: ${item.id} [${lon}, ${lat}]`);
      }
    }
    if (item.ring) {
      const hits = ringIntersections(shape);
      if (hits.length) errors.push(`Self-intersecting territory ring: ${item.id} (${hits.join(', ')})`);
      if (item.labelAt && !pointInRing(item.labelAt, shape)) {
        errors.push(`Territory label anchor outside ring: ${item.id} [${item.labelAt.join(', ')}]`);
      }
    }
  }
}

const blankYears = [];
for (let year = -3200; year <= -30; year++) {
  if (!territories.some((t) => year >= t.from && year <= t.to)) blankYears.push(year);
}
if (blankYears.length) {
  const ranges = [];
  for (const year of blankYears) {
    const last = ranges.at(-1);
    if (last && year === last[1] + 1) last[1] = year;
    else ranges.push([year, year]);
  }
  warnings.push(`No territory or culture-zone coverage: ${ranges.map(([a, b]) => `${a}…${b}`).join(', ')}`);
}

const coverageGroups = new Map();
for (const territory of territories) {
  if (!territory.coverageGroup) continue;
  if (!coverageGroups.has(territory.coverageGroup)) coverageGroups.set(territory.coverageGroup, []);
  coverageGroups.get(territory.coverageGroup).push(territory);
}
for (const [group, phases] of coverageGroups) {
  const ranges = phases
    .map((phase) => [phase.from, phase.to, phase.id])
    .sort((a, b) => a[0] - b[0]);
  let coveredTo = ranges[0][1];
  for (const [from, to, id] of ranges.slice(1)) {
    if (from > coveredTo + 1) {
      errors.push(`Coverage gap in "${group}": ${coveredTo + 1}…${from - 1} before ${id}`);
    }
    coveredTo = Math.max(coveredTo, to);
  }
}

console.log(`Geo validation: ${territories.length} territories/phases, ${routes.length} routes`);
if (coverageGroups.size) {
  console.log(`Regional coverage groups: ${[...coverageGroups.keys()].join(', ')}`);
}
for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);
if (errors.length) process.exitCode = 1;
else console.log('Geo validation passed.');
