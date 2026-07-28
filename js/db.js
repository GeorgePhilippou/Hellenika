/* ============================================================
   Hellenika — Entity graph

   Every data file contributes to one flat entity map. On load we:
     1. normalise each record to a common shape
     2. build type / tag / period indices
     3. derive INVERSE relations, so a link written once in
        `knossos` also appears on `arthur-evans`
     4. build a folded search index

   Adding a new data file means importing it and adding it to
   SOURCES_OF_TRUTH below. Nothing else needs to change.
   ============================================================ */

import { periods } from '../data/periods.js';
import { people } from '../data/people.js';
import { places } from '../data/places.js';
import { events } from '../data/events.js';
import { artefacts } from '../data/artefacts.js';
import { texts } from '../data/texts.js';
import { mythology } from '../data/myth.js';
import { odysseyPlaces } from '../data/odyssey-places.js';
import { culture } from '../data/culture.js';
import { sources } from '../data/sources.js';
import { collections } from '../data/collections.js';
import { fold, sortBy, unique, groupBy } from './util.js';

const SOURCES_OF_TRUTH = [periods, people, places, events, artefacts, texts, mythology, odysseyPlaces, culture];

/* ---------- Type metadata ---------- */
export const TYPE_META = {
  period:       { label: 'Period',        plural: 'Periods',        order: 1 },
  civilisation: { label: 'Civilisation',  plural: 'Civilisations',  order: 2 },
  person:       { label: 'Person',        plural: 'People',         order: 3 },
  city:         { label: 'City',          plural: 'Cities',         order: 4 },
  site:         { label: 'Site',          plural: 'Sites',          order: 5 },
  battle:       { label: 'Battle',        plural: 'Battles',        order: 6 },
  war:          { label: 'War',           plural: 'Wars',           order: 7 },
  event:        { label: 'Event',         plural: 'Events',         order: 8 },
  artefact:     { label: 'Artefact',      plural: 'Artefacts',      order: 9 },
  text:         { label: 'Text',          plural: 'Texts',          order: 10 },
  myth:         { label: 'Mythology',     plural: 'Mythology',      order: 11 },
  deity:        { label: 'Deity',         plural: 'Deities',        order: 12 },
  empire:       { label: 'Empire',        plural: 'Empires',        order: 13 },
  kingdom:      { label: 'Kingdom',       plural: 'Kingdoms',       order: 14 },
  writing:      { label: 'Writing system',plural: 'Writing systems',order: 15 },
  language:     { label: 'Language',      plural: 'Languages',      order: 16 },
  region:       { label: 'Region',        plural: 'Regions',        order: 17 },
  museum:       { label: 'Museum',        plural: 'Museums',        order: 18 },
  dynasty:      { label: 'Dynasty',       plural: 'Dynasties',      order: 19 },
};

/* ---------- Evidence & confidence metadata ---------- */
export const EVIDENCE_META = {
  archaeological: { label: 'Archaeological', desc: 'Excavated material remains — structures, objects, deposits.' },
  literary:       { label: 'Literary',       desc: 'Written narrative sources composed as texts to be read.' },
  epigraphic:     { label: 'Epigraphic',     desc: 'Inscriptions on stone, clay or metal, usually contemporary.' },
  numismatic:     { label: 'Numismatic',     desc: 'Coins: their designs, metal, weight and find distribution.' },
  linguistic:     { label: 'Linguistic',     desc: 'Evidence from language structure, script and etymology.' },
  tradition:      { label: 'Ancient tradition', desc: 'What ancient people believed, reported as belief rather than fact.' },
  consensus:      { label: 'Scholarly consensus', desc: 'A settled modern conclusion drawn from combined evidence.' },
  debate:         { label: 'Scholarly debate',    desc: 'An open modern question with credible positions on more than one side.' },
};

export const CONFIDENCE_META = {
  established: { label: 'Established', rank: 6, desc: 'Multiple independent lines of evidence. No serious dissent.' },
  strong:      { label: 'Strong evidence', rank: 5, desc: 'Well supported and widely accepted, with minor open questions.' },
  probable:    { label: 'Probable', rank: 4, desc: 'The best current explanation, but not decisively demonstrated.' },
  debated:     { label: 'Debated', rank: 3, desc: 'Specialists actively disagree; the evidence underdetermines the answer.' },
  speculative: { label: 'Speculative', rank: 2, desc: 'A proposal worth stating that the evidence does not currently support.' },
  legendary:   { label: 'Legendary', rank: 1, desc: 'Known only from myth or tradition, with no independent corroboration.' },
};

export const CONFIDENCE_ORDER = ['established', 'strong', 'probable', 'debated', 'speculative', 'legendary'];

/* ---------- Period tint resolution ---------- */
export const TINTS = [
  'earlybronze', 'minoan', 'mycenaean', 'collapse', 'darkage',
  'archaic', 'classical', 'macedon', 'alexander', 'hellenistic', 'roman',
];
export const tintVar = (tint) => `var(--p-${TINTS.includes(tint) ? tint : 'classical'})`;

/* ============================================================
   Build the graph
   ============================================================ */

const entities = new Map();

function normalise(raw) {
  const e = {
    // identity
    id: raw.id,
    name: raw.name,
    altNames: raw.altNames || [],
    type: raw.type || 'event',
    subtype: raw.subtype || null,
    // classification
    tint: raw.tint || 'classical',
    tags: raw.tags || [],
    // time
    start: raw.start ?? null,
    end: raw.end ?? null,
    approx: !!raw.approx,
    floruit: !!raw.floruit,
    modern: !!raw.modern,
    legendary: !!raw.legendary,
    peakStart: raw.peakStart ?? null,
    peakEnd: raw.peakEnd ?? null,
    lane: raw.lane ?? null,
    // space
    coords: raw.coords || null,
    region: raw.region || null,
    // prose
    summary: raw.summary || '',
    significance: raw.significance || '',
    body: raw.body || raw.overview || '',
    // period-specific prose blocks
    politics: raw.politics || null,
    warfare: raw.warfare || null,
    cultureNote: raw.culture || null,
    boundaryNote: raw.boundaryNote || null,
    // mythology-specific blocks (kept strictly separate from history)
    myth: raw.myth || null,
    earliestSource: raw.earliestSource || null,
    religious: raw.religious || null,
    historicalBackground: raw.historicalBackground || null,
    archaeology: raw.archaeology || null,
    laterInterpretation: raw.laterInterpretation || null,
    // domain-specific fields
    author: raw.author || null,
    language: raw.language || null,
    survival: raw.survival || null,
    material: raw.material || null,
    museum: raw.museum || null,
    domain: raw.domain || null,
    status: raw.status || null,
    signs: raw.signs || null,
    combatants: raw.combatants || null,
    outcome: raw.outcome || null,
    // evidence & references
    claims: raw.claims || [],
    sources: raw.sources || [],
    external: raw.external || [],
    // relations (outgoing, as authored)
    relations: (raw.relations || []).filter((r) => r && r.id),
    // curated child lists on periods
    keyEvents: raw.keyEvents || [],
    people: raw.people || [],
    sites: raw.sites || [],
    artefacts: raw.artefacts || [],
    texts: raw.texts || [],
  };
  // Derived
  e.typeLabel = TYPE_META[e.type]?.label || e.type;
  e.searchText = fold([e.name, ...e.altNames, e.summary, e.region, e.subtype].filter(Boolean).join(' '));
  e.sortName = fold(e.name.replace(/^(the|a|an)\s+/i, ''));
  return e;
}

for (const collection of SOURCES_OF_TRUTH) {
  for (const raw of collection) {
    if (entities.has(raw.id)) {
      console.warn(`[Hellenika] Duplicate entity id: ${raw.id}`);
      continue;
    }
    entities.set(raw.id, normalise(raw));
  }
}

/* ---------- Curated period child-lists become relations ---------- */
const CHILD_REL = {
  keyEvents: 'key event', people: 'key figure', sites: 'key site',
  artefacts: 'key artefact', texts: 'key text',
};
for (const e of entities.values()) {
  if (e.type !== 'period') continue;
  for (const [field, rel] of Object.entries(CHILD_REL)) {
    for (const id of e[field]) {
      if (!e.relations.some((r) => r.id === id)) e.relations.push({ id, rel });
    }
  }
}

/* ---------- Inverse relations ---------- */
const INVERSE = {
  'father of': 'son of', 'son of': 'father of', 'mother of': 'child of',
  'taught': 'taught by', 'taught by': 'taught', 'student of': 'teacher of',
  'excavated by': 'excavated', 'excavated': 'excavated by',
  'discovered by': 'discovered', 'discovered': 'discovered by',
  'deciphered by': 'deciphered', 'deciphered': 'deciphered by',
  'founded by': 'founded', 'founded': 'founded by',
  'defeated': 'defeated by', 'defeated by': 'defeated',
  'won': 'won by', 'lost': 'lost by',
  'followed by': 'followed', 'followed': 'followed by',
  'succeeded by': 'succeeded', 'succeeded': 'succeeded by',
  'led to': 'resulted from', 'resulted from': 'led to',
  'ended by': 'ended', 'ended': 'ended by',
  'part of': 'includes', 'includes': 'part of',
  'found at': 'findspot of', 'findspot of': 'found at',
  'written by': 'wrote', 'wrote': 'written by',
  'composed by': 'composed', 'composed': 'composed by',
  'depicts': 'depicted in', 'depicted in': 'depicts',
  'period': 'includes', 'contains': 'in',
};

const inverseOf = (rel) => INVERSE[rel] || 'related to';

for (const e of entities.values()) {
  for (const r of e.relations) {
    const target = entities.get(r.id);
    if (!target) continue;
    const already = target.relations.some((x) => x.id === e.id);
    if (already) continue;
    target.relations.push({ id: e.id, rel: inverseOf(r.rel), derived: true });
  }
}

// Drop relations pointing at ids that do not exist, and report them once.
const missing = new Set();
for (const e of entities.values()) {
  e.relations = e.relations.filter((r) => {
    if (entities.has(r.id)) return true;
    missing.add(r.id);
    return false;
  });
  // Stable, readable ordering: authored links first, then alphabetical.
  e.relations = sortBy(e.relations, (r) => (r.derived ? 1 : 0), (r) => entities.get(r.id).sortName);
}
if (missing.size) {
  console.info(`[Hellenika] ${missing.size} relation target(s) not yet in the dataset:`, [...missing].sort());
}

/* ============================================================
   Public API
   ============================================================ */

export const ALL = Array.from(entities.values());
export const get = (id) => entities.get(id) || null;
export const has = (id) => entities.has(id);
export const count = ALL.length;

export const byType = groupBy(ALL, (e) => e.type);
export const typesPresent = sortBy(
  [...byType.keys()],
  (t) => TYPE_META[t]?.order ?? 99
);

export const ofType = (...types) => ALL.filter((e) => types.includes(e.type));

/** Datable entities (excludes modern archaeologists and undated records). */
export const datable = ALL.filter((e) => e.start != null && !e.modern);

/** Entities alive / in use / in existence at a given year. */
export function entitiesAt(year, { types = null } = {}) {
  return ALL.filter((e) => {
    if (e.modern || e.start == null) return false;
    if (types && !types.includes(e.type)) return false;
    const end = e.end ?? e.start;
    return year >= e.start && year <= end;
  });
}

/** Entities with map coordinates visible at a given year. */
export function mapPointsAt(year) {
  return ALL.filter((e) => {
    if (!e.coords || e.modern) return false;
    if (e.start == null) return false;
    const end = e.end ?? e.start;
    return year >= e.start && year <= end;
  });
}

/** Immediate neighbours in the relationship graph. */
export function neighbours(id) {
  const e = get(id);
  if (!e) return [];
  return e.relations
    .map((r) => ({ ...r, entity: get(r.id) }))
    .filter((r) => r.entity);
}

/** Neighbours grouped by the type of the target entity. */
export function neighboursByType(id) {
  return groupBy(neighbours(id), (n) => n.entity.type);
}

/** Two-hop subgraph for the relationship visualisation. */
export function subgraph(id, { depth = 1, maxNodes = 26 } = {}) {
  const root = get(id);
  if (!root) return { nodes: [], links: [] };

  const nodes = new Map([[id, { id, entity: root, depth: 0 }]]);
  const links = [];
  let frontier = [id];

  for (let d = 1; d <= depth; d++) {
    const next = [];
    for (const from of frontier) {
      for (const n of neighbours(from)) {
        links.push({ source: from, target: n.id, rel: n.rel });
        if (!nodes.has(n.id) && nodes.size < maxNodes) {
          nodes.set(n.id, { id: n.id, entity: n.entity, depth: d });
          next.push(n.id);
        }
      }
    }
    frontier = next;
  }

  // Keep only links whose endpoints both survived the node cap.
  const kept = new Set(nodes.keys());
  return {
    nodes: [...nodes.values()],
    links: links.filter((l) => kept.has(l.source) && kept.has(l.target)),
  };
}

/** All claims across the dataset, for the evidence overview. */
export function allClaims() {
  const out = [];
  for (const e of ALL) {
    for (const c of e.claims) out.push({ ...c, entity: e });
  }
  return out;
}

export function claimStats() {
  const byConfidence = new Map(CONFIDENCE_ORDER.map((k) => [k, 0]));
  const byEvidence = new Map(Object.keys(EVIDENCE_META).map((k) => [k, 0]));
  let total = 0;
  for (const e of ALL) {
    for (const c of e.claims) {
      total++;
      if (byConfidence.has(c.confidence)) byConfidence.set(c.confidence, byConfidence.get(c.confidence) + 1);
      if (byEvidence.has(c.evidence)) byEvidence.set(c.evidence, byEvidence.get(c.evidence) + 1);
    }
  }
  return { total, byConfidence, byEvidence };
}

/* ---------- Sources ---------- */
export const getSource = (id) => sources[id] || null;

/** Which entities cite a given source. */
export function entitiesCiting(sourceId) {
  return ALL.filter((e) => e.sources.includes(sourceId));
}

export function sourceUsage() {
  const counts = new Map();
  for (const e of ALL) {
    for (const s of e.sources) counts.set(s, (counts.get(s) || 0) + 1);
  }
  return counts;
}

/* ---------- Collections ---------- */
export { collections };
export const getCollection = (id) => collections.find((c) => c.id === id) || null;

/* ============================================================
   Search
   ============================================================ */

const searchIndex = ALL.map((e) => ({
  id: e.id,
  name: e.name,
  fname: fold(e.name),
  alt: e.altNames.map(fold),
  text: e.searchText,
  type: e.type,
  entity: e,
}));

/**
 * Ranked search. Exact and prefix matches on the name outrank
 * alternative names, which outrank summary matches.
 */
export function search(query, { limit = 30, types = null } = {}) {
  const q = fold(query.trim());
  if (!q) return [];

  const results = [];
  for (const row of searchIndex) {
    if (types && !types.includes(row.type)) continue;
    let score = 0;

    if (row.fname === q) score = 1000;
    else if (row.fname.startsWith(q)) score = 800 - row.fname.length;
    else if (row.alt.some((a) => a === q)) score = 700;
    else if (row.alt.some((a) => a.startsWith(q))) score = 600;
    else if (row.fname.includes(q)) score = 400 - row.fname.indexOf(q);
    else if (row.alt.some((a) => a.includes(q))) score = 300;
    else if (row.text.includes(q)) score = 150 - Math.min(120, row.text.indexOf(q) / 4);

    if (score > 0) {
      // Nudge periods and major types up so structural pages surface first.
      const boost = { period: 40, civilisation: 30, person: 12, city: 10, site: 8 }[row.type] || 0;
      results.push({ entity: row.entity, score: score + boost });
    }
  }

  results.sort((a, b) => b.score - a.score || a.entity.sortName.localeCompare(b.entity.sortName));
  return results.slice(0, limit).map((r) => r.entity);
}

/** A stable, interesting starting set for empty search state. */
export const featured = [
  'knossos', 'alexander-the-great', 'antikythera-mechanism', 'linear-b',
  'trojan-war-traditional', 'parthenon-built', 'sparta', 'theran-eruption',
].map(get).filter(Boolean);

/* ---------- Random / discovery ---------- */
export function randomEntity(filter = () => true) {
  const pool = ALL.filter(filter);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

export function randomN(n, filter = () => true) {
  const pool = ALL.filter(filter).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/* ---------- Diagnostics (visible in the About view) ---------- */
export const stats = {
  entities: ALL.length,
  byType: Object.fromEntries(typesPresent.map((t) => [t, byType.get(t).length])),
  relations: ALL.reduce((n, e) => n + e.relations.length, 0) / 2,
  claims: claimStats().total,
  sources: Object.keys(sources).length,
  collections: collections.length,
  withCoords: ALL.filter((e) => e.coords).length,
};

console.info(
  `[Hellenika] ${stats.entities} entities · ${Math.round(stats.relations)} relationships · ` +
  `${stats.claims} evidence-tagged claims · ${stats.sources} sources`
);
