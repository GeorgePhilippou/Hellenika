import {
  ALL,
  EVIDENCE_META,
  CONFIDENCE_META,
  getSource,
} from '../js/db.js';

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

const errors = [];
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

  for (const [index, claim] of entity.claims.entries()) {
    if (!EVIDENCE_META[claim.evidence]) {
      errors.push(`${entity.id}: claim ${index + 1} has unknown evidence "${claim.evidence}"`);
    }
    if (!CONFIDENCE_META[claim.confidence]) {
      errors.push(`${entity.id}: claim ${index + 1} has unknown confidence "${claim.confidence}"`);
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

if (errors.length) {
  console.error(`\nContent validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Content validation passed.');
}
