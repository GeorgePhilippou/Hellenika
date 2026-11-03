import {
  ALL,
  EVIDENCE_META,
  CONFIDENCE_META,
  MILESTONE_KINDS,
  getSource,
  MISSING_RELATIONS,
} from '../js/db.js';
import { sourceList } from '../data/sources.js';

const MIN = {
  narrativeWords: 90,
  summaryWords: 12,
  claims: 3,
  sources: 2,
  authoredRelations: 2,
};

const MYTH_FIELDS = [
  'myth',
  'earliestSource',
  'religious',
  'historicalBackground',
  'archaeology',
  'laterInterpretation',
];

const words = (value) => String(value || '')
  .trim()
  .split(/\s+/)
  .filter(Boolean).length;

function narrativeWords(entity) {
  if (entity.type === 'myth' || entity.type === 'deity') {
    return MYTH_FIELDS.reduce((total, field) => total + words(entity[field]), 0);
  }
  return [
    entity.body,
    entity.politics,
    entity.warfare,
    entity.cultureNote,
  ].reduce((total, value) => total + words(value), 0);
}

// Stricter bar for entries that declare `standard: full` in their frontmatter.
// These are the in-depth pages (see docs/editorial-content-standard.md): every
// strong claim is traceable to a named work and, where possible, a location in it.
const FULL = { claims: 8, sources: 5, bodySections: 5, citedShare: 1 };
const STRONG = new Set(['established', 'strong']);
const ACCESS = new Set(['open', 'paywalled', 'print']);

const errors = [];
let cited = 0;
let strong = 0;
let strongCited = 0;
const fullEntries = [];
const typeStats = new Map();

for (const entity of ALL) {
  const narrative = narrativeWords(entity);
  const summary = words(entity.summary);
  const authoredRelations = entity.relations.filter((relation) => !relation.derived).length;

  const checks = [
    [narrative >= MIN.narrativeWords, `narrative ${narrative}/${MIN.narrativeWords} words`],
    [summary >= MIN.summaryWords, `summary ${summary}/${MIN.summaryWords} words`],
    [entity.claims.length >= MIN.claims, `claims ${entity.claims.length}/${MIN.claims}`],
    [entity.sources.length >= MIN.sources, `sources ${entity.sources.length}/${MIN.sources}`],
    [authoredRelations >= MIN.authoredRelations, `authored relations ${authoredRelations}/${MIN.authoredRelations}`],
  ];

  for (const [passes, message] of checks) {
    if (!passes) errors.push(`${entity.id}: ${message}`);
  }

  for (const sourceId of entity.sources) {
    if (!getSource(sourceId)) errors.push(`${entity.id}: unknown source "${sourceId}"`);
  }

  // Dangling relation targets are silently dropped by js/db.js before
  // `entity.relations` ever reaches here, so they can't be caught by
  // looping over entity.relations the way sources/claims are above --
  // js/db.js records what it dropped in MISSING_RELATIONS instead.
  for (const { targetId } of MISSING_RELATIONS.filter((m) => m.entityId === entity.id)) {
    errors.push(`${entity.id}: relation target "${targetId}" does not exist`);
  }

  for (const [index, claim] of entity.claims.entries()) {
    const at = `${entity.id}: claim ${index + 1}`;
    const isStrong = STRONG.has(claim.confidence);
    if (isStrong) strong += 1;
    if (claim.cite !== undefined && !Array.isArray(claim.cite)) {
      errors.push(`${at} cite must be a list of { src, loc } objects`);
    }
    const cites = Array.isArray(claim.cite) ? claim.cite : [];
    if (cites.length) { cited += 1; if (isStrong) strongCited += 1; }
    for (const c of cites) {
      if (!c || typeof c.src !== 'string') { errors.push(`${at} has a cite without a src`); continue; }
      if (!getSource(c.src)) errors.push(`${at} cites unknown source "${c.src}"`);
      else if (!entity.sources.includes(c.src)) errors.push(`${at} cites "${c.src}", which is not in the entry's sources list`);
      if (c.loc !== undefined && !String(c.loc).trim()) errors.push(`${at} cite for "${c.src}" has an empty loc`);
    }
    if (!EVIDENCE_META[claim.evidence]) {
      errors.push(`${entity.id}: claim ${index + 1} has unknown evidence "${claim.evidence}"`);
    }
    if (!CONFIDENCE_META[claim.confidence]) {
      errors.push(`${entity.id}: claim ${index + 1} has unknown confidence "${claim.confidence}"`);
    }
  }

  for (const [index, m] of entity.milestones.entries()) {
    const at = `${entity.id}: milestone ${index + 1}`;
    if (!Number.isFinite(m.year)) errors.push(`${at} needs a numeric year`);
    if (!MILESTONE_KINDS[m.kind]) errors.push(`${at} has unknown kind "${m.kind}"`);
    if (words(m.text) < 6) errors.push(`${at} needs a sentence of text`);
    if (m.confidence && !CONFIDENCE_META[m.confidence]) {
      errors.push(`${at} has unknown confidence "${m.confidence}"`);
    }
  }

  if (entity.standard === 'full') {
    fullEntries.push(entity.id);
    const at = `${entity.id} (standard: full)`;
    const sections = (entity.body.match(/^## .+$/gm) || []).length;
    if (entity.claims.length < FULL.claims) errors.push(`${at}: claims ${entity.claims.length}/${FULL.claims}`);
    if (entity.sources.length < FULL.sources) errors.push(`${at}: sources ${entity.sources.length}/${FULL.sources}`);
    if (sections < FULL.bodySections) errors.push(`${at}: body sections ${sections}/${FULL.bodySections}`);
    for (const [index, claim] of entity.claims.entries()) {
      if (STRONG.has(claim.confidence) && !(Array.isArray(claim.cite) && claim.cite.length)) {
        errors.push(`${at}: ${claim.confidence} claim ${index + 1} has no cite ("${claim.text.slice(0, 50)}...")`);
      }
    }
    for (const q of entity.identification) {
      if (!q.question || !Array.isArray(q.positions) || q.positions.length < 2) {
        errors.push(`${at}: identification needs a question and at least two positions`);
      }
    }
  }

  const stats = typeStats.get(entity.type) || {
    count: 0,
    narrativeWords: 0,
    claims: 0,
    sources: 0,
  };
  stats.count += 1;
  stats.narrativeWords += narrative;
  stats.claims += entity.claims.length;
  stats.sources += entity.sources.length;
  typeStats.set(entity.type, stats);
}

// Source records: every source needs author, year and title; optional
// locators must be well formed so citations stay checkable.
for (const src of sourceList) {
  const at = `source ${src.id}`;
  if (!src.author) errors.push(`${at}: missing author`);
  if (!src.title) errors.push(`${at}: missing title`);
  if (src.kind === 'modern' && !Number.isFinite(src.year) && !src.undated) errors.push(`${at}: modern work needs a numeric year (or undated: true for a web page with no stated date)`);
  if (src.doi && !/^10\.\d{4,9}\/\S+$/.test(src.doi)) errors.push(`${at}: malformed doi "${src.doi}"`);
  if (src.url && !/^https?:\/\//.test(src.url)) errors.push(`${at}: url must be http(s)`);
  if (src.access && !ACCESS.has(src.access)) errors.push(`${at}: access must be open, paywalled or print`);
}

console.log(`Content validation: ${ALL.length} entries`);
console.log(
  `Minimums: ${MIN.narrativeWords} narrative words, ${MIN.summaryWords} summary words, `
  + `${MIN.claims} claims, ${MIN.sources} sources, ${MIN.authoredRelations} authored relations`,
);

for (const [type, stats] of typeStats) {
  const average = (value) => (value / stats.count).toFixed(1);
  console.log(
    `${type.padEnd(12)} ${String(stats.count).padStart(3)} entries · `
    + `${average(stats.narrativeWords)} words · `
    + `${average(stats.claims)} claims · ${average(stats.sources)} sources`,
  );
}

const totalClaims = ALL.reduce((n, e) => n + e.claims.length, 0);
console.log(
  `Citations: ${cited}/${totalClaims} claims carry a cite; `
  + `${strongCited}/${strong} established/strong claims cited. `
  + `${fullEntries.length} entr${fullEntries.length === 1 ? 'y' : 'ies'} at standard "full"${fullEntries.length ? `: ${fullEntries.join(', ')}` : ''}.`,
);

if (errors.length) {
  console.error(`\nContent validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Content validation passed.');
}
