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
import { fold, sortBy, unique, groupBy, esc } from './util.js';

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
  'ruled': 'ruled by', 'ruled by': 'ruled', 'ruled from': 'seat of',
  'ruled (myth)': 'ruled by (myth)', 'ruled by (myth)': 'ruled (myth)',
  'king of': 'ruled by', 'king of (myth)': 'ruled by (myth)',
  'queen of': 'ruled by', 'born at': 'birthplace of', 'birthplace of': 'born at',
  // The curated period child-lists above (CHILD_REL) are the single
  // biggest source of un-inverted relations in the dataset -- every
  // period has dozens of children, so leaving these unmapped means most
  // of a period's own key events/figures/sites/artefacts/texts show up
  // on THEIR OWN page only as a contentless "related to" back to the
  // period, with no hint of what the connection actually was.
  'key event': 'key event of', 'key figure': 'key figure of',
  'key site': 'key site of', 'key artefact': 'key artefact of',
  'key text': 'key text of',
  // Also high-frequency across hand-authored content (dozens of uses
  // each): a place hosting an event, and a place/work being where
  // another work is set.
  'site': 'site of', 'site of': 'site',
  'setting': 'set in', 'setting of': 'set in',
  'included': 'part of',
  // Symmetric -- "contemporary" is the same fact read from either side,
  // so both spellings map onto the one already-standard label rather
  // than falling back to a contentless "related to".
  'contemporary with': 'contemporary with', 'contemporary': 'contemporary with',
  // 'performed by' already exists on events like Alexander crossing to
  // Troy; 'preceded' reuses the 'followed' half of the existing
  // 'followed by'/'followed' pair rather than inventing a near-synonym.
  'performed by': 'performed', 'preceded': 'followed',
  // The military/command vocabulary -- who led, fought, opposed, or was
  // defeated where -- is the next-largest uncovered cluster after the
  // period child-lists (~130 authored instances across people, places,
  // battles and wars), and just as mechanically invertible.
  'led': 'led by', 'led by': 'led',
  'commanded at': 'commanded by', 'commanded': 'commanded by', 'commanded by': 'commanded',
  'combatant': 'combatant', 'fought': 'fought',
  'fought at': 'combatant', 'fought in': 'combatant', 'defeated at': 'combatant',
  'opposed': 'opposed by', 'opposed by': 'opposed',
  'victor': 'victor at', 'served': 'served by',
  // A myth-place visited in the course of a journey (every Odyssey stop
  // authors this toward Odysseus), and myth-place-of-departure.
  'visited by (myth)': 'visited (myth)',
  'departs from (myth)': 'departure point (myth)',
  // The Odyssey's own leg-by-leg geography, e.g. Ismarus's "route from"
  // Troy -- Troy's page should read "route to: Ismarus", not generic.
  'route from': 'route to',

  // ---- Place/period anchoring ----
  // "centre of" is the single most common remaining verb (a site or city
  // naming the period it anchors); the period's own page should say which
  // centres it had, not list them as "related to".
  'centre of': 'major centre', 'cult centre of': 'cult centre',
  'cult centre in': 'cult centre', 'temple centre in': 'temple centre',
  'major centre in': 'major centre', 'capital in': 'capital',
  'city-kingdom of': 'city-kingdom', 'territory of': 'territory',
  'sanctuary of': 'sanctuary', 'principal sanctuary of': 'principal sanctuary',
  'homeland of': 'homeland', 'from': 'origin of', 'near': 'near',
  'lived in': 'home of', 'worked in': 'workplace of', 'worked at': 'workplace of',
  'died at': 'death place of', 'buried in': 'burial place of',
  'made at': 'production site of', 'produced at': 'production site of',
  'written at': 'writing site of', 'staged at': 'staged', 'staged in': 'staged',
  'taught in': 'teaching site of', 'initiated at': 'initiation site of',
  'erected at': 'site of', 'attested at': 'attests', 'attested in': 'attests',
  'found in': 'findspot of', 'findspot': 'found at',
  'flourished in': 'flourishing of', 'circulated in': 'circulation of',
  'administered from': 'administrative seat of', 'satrapal seat of': 'satrapal seat',
  'currency of': 'currency', 'language of': 'language',
  'oracle in': 'oracle', 'temple at': 'temple of', 'festival at': 'festival of',
  'statue at': 'statue', 'depicted at': 'depicts', 'commemorated at': 'commemorates',
  'athletic context': 'athletic context for', 'trade network with': 'trade network with',
  'traded via': 'trade route for', 'grain route for': 'grain route',
  'transmission route': 'transmission route',

  // ---- Periods: beginnings, endings, and who moved them ----
  'began': 'begins with', 'marks start of': 'begins with',
  'ended at': 'ended', 'abandoned in': 'abandonment of',
  'destroyed in': 'destroyed', 'destroyed': 'destroyed in',
  'ruler': 'ruled during', 'tyrant of': 'ruled by', 'regent of': 'regent',
  'regent for': 'regent', 'general of': 'general', 'ruled': 'ruled by',
  'advanced': 'advanced by', 'shaped': 'shaped by', 'revealed': 'revealed by',
  'enabled': 'enabled by', 'caused': 'caused by', 'helped cause': 'contributing cause',
  'led to': 'resulted from', 'disrupted': 'disrupted by', 'expanded': 'expanded by',
  'diminished': 'diminished by', 'redefined': 'redefined by',
  'continued': 'continued by', 'completed': 'completed by',
  'annexed': 'annexed by', 'sacked': 'sacked by', 'burned': 'burned by',
  'resisted': 'resisted by', 'named': 'named by', 'named after': 'name source of',
  'follows': 'followed by', 'anticipated': 'anticipated by',
  'influenced': 'influenced by', 'inspired': 'inspired by',
  'introduced': 'introduced by', 'advocated': 'advocated by',
  'developed': 'developed by', 'created': 'created by', 'produced': 'produced by',
  'wrote during': 'written during',

  // ---- Texts and what they are about ----
  'narrates': 'narrated in', 'describes': 'described in',
  'discusses': 'discussed in', 'analyses': 'analysed in',
  'chronicled': 'chronicled by', 'recorded': 'recorded by',
  'celebrates': 'celebrated in', 'quoted': 'quotes',
  'subject': 'subject of', 'includes life of': 'biography in',
  'main source for': 'main source', 'evidence for': 'evidenced by',
  'features': 'features in', 'features in': 'features',
  'wrote about': 'written about by', 'writing system': 'writing system of',
  'depicts scene from': 'scene depicted in', 'depicted on': 'depicts',
  'possibly depicts': 'possibly depicted in', 'alludes to': 'alluded to in',
  'references': 'referenced in', 'referenced in': 'references',
  'responds to': 'answered by', 'attacks': 'attacked in',
  'dedicated to': 'dedication to', 'delivered at': 'venue for',
  'attributed to': 'attributed work', 'foundation attributed to': 'credited with founding',

  // ---- People to people ----
  'brother of': 'sibling of', 'sister of': 'sibling of', 'sibling of': 'sibling of',
  'kinsman of': 'kinsman of', 'descendant of': 'ancestor of',
  'claimed descent from': 'claimed ancestor of', 'son-in-law of': 'father-in-law of',
  'rival of': 'rival of', 'allied with': 'allied with', 'linked to': 'linked to',
  'associated with': 'associated with', 'connected to': 'connected to',
  'compared to': 'compared with', 'compared with': 'compared with',
  'contrasted with': 'contrasted with', 'contemporary of': 'contemporary with',
  'contemporary practice with': 'contemporary practice with',
  'panhellenic peer': 'panhellenic peer', 'Ionian peer': 'Ionian peer',
  'corresponded with': 'corresponded with', 'related to': 'related to',
  'advised': 'advised by', 'advised at': 'adviser at', 'consulted': 'consulted by',
  'honoured': 'honoured by', 'confronted': 'confronted by', 'pursued': 'pursued by',
  'sought': 'sought by', 'avenging': 'avenged by', 'accused of profaning': 'profanation alleged by',
  'defected to': 'received defector', 'appealed to': 'appealed to by',
  'campaigned in': 'campaign of', 'participated in': 'participant',
  'fought for': 'fought for by', 'killed at': 'death place of', 'killed in': 'death place of',
  'commanded in': 'commanded by', 'besieged at': 'besieged by', 'defended': 'defended by',
  'won at': 'won by', 'lost at': 'lost by', 'against': 'opposed by',

  // ---- Myth and cult ----
  'chief god of': 'chief god', 'worshipped at': 'cult of', 'oracle of': 'oracle',
  'rival oracle': 'rival oracle', 'aspect of': 'aspect', 'counterpart of': 'counterpart of',
  'hero of': 'hero', 'myth of': 'myth', 'myth connection': 'myth connection',
  'cult introduced to': 'cult introduced from', 'invoked': 'invoked by',
  'demanded sacrifice from': 'sacrificed to', 'angered at': 'angered',
  'encountered (myth)': 'encountered by (myth)', 'possibly linked to': 'possibly linked to',
  'possibly records': 'possibly recorded in', 'possibly contains': 'possibly contained in',
  'used': 'used by', 'used at': 'use site of', 'style of': 'exemplified by',
  'built on': 'built over by', 'reinterpreted': 'reinterpreted by',
  'surprised': 'surprised by', 'survived': 'survived by', 'witnessed': 'witnessed by',
  'suspected': 'suspected by', 'implicated': 'implicated by',
  'legislated for': 'legislator', 'endowed': 'endowed by', 'bequeathed to Rome': 'bequest from',
  'gained influence via': 'source of influence for', 'strategic in': 'strategic site',
  'secured at': 'secured', 'contested during': 'contested', 'recognised at': 'recognised',
  'sourced from': 'source of', 'sourced': 'sourced from', 'linked site to': 'site linked to',
  'researched': 'researched by', 'analysed': 'analysed by',
  'decipherment parallel': 'decipherment parallel', 'polychromy parallel': 'polychromy parallel',
  'decipherment confirmed at': 'confirmed decipherment of',
  'shares architect with': 'shares architect with',
  'Phoenician connections with': 'Phoenician connections with',
  'monuments of': 'monuments', 'near findspot of': 'findspot near',
  'imposed through': 'imposed', 'ordered': 'ordered by', 'context': 'context for',
  'restored under': 'restorer of', 'presupposes': 'presupposed by',
  'looted during': 'looting of', 'tracks games of': 'games tracked in',
  'responded to': 'prompted', 'founded on advice of': 'advised founding of',
};

// "<verb> by" is mechanically invertible -- the other side of "chronicled
// by Thucydides" is "chronicled". That one rule covers ~40 low-frequency
// passive verbs ('issued by', 'analysed by', 'besieged by', 'sculpted
// by' ...) that would each otherwise need a hand-written map entry, and
// keeps the map to the cases where the inverse isn't just the active
// voice. Anything still unmatched falls back to a generic label.
const inverseOf = (rel) => {
  if (INVERSE[rel]) return INVERSE[rel];
  if (rel.endsWith(' by')) return rel.slice(0, -' by'.length);
  return 'related to';
};

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
// Recorded per-entity (not just the bare set of missing ids) so
// validate-content.mjs can point at exactly which content file needs
// fixing, not just which id is missing.
const missingRelations = [];
for (const e of entities.values()) {
  e.relations = e.relations.filter((r) => {
    if (entities.has(r.id)) return true;
    missingRelations.push({ entityId: e.id, targetId: r.id });
    return false;
  });
  // Stable, readable ordering: authored links first, then alphabetical.
  e.relations = sortBy(e.relations, (r) => (r.derived ? 1 : 0), (r) => entities.get(r.id).sortName);
}
if (missingRelations.length) {
  const uniqueTargets = [...new Set(missingRelations.map((m) => m.targetId))].sort();
  console.info(`[Hellenika] ${uniqueTargets.length} relation target(s) not yet in the dataset:`, uniqueTargets);
}

/* ---------- Prose autolinking index ---------- */
// Entity names written into body prose were inert text. Around 1,150
// such mentions exist, and half of them name an entity the entry does
// not even list under Connections -- so a reader meeting "Linear B" in
// a sentence had no route from that sentence to Linear B. This index
// lets prose link the first mention of each entity (see linkEntities in
// components/ui.js). Names are matched longest-first so that a
// qualified form always beats the bare one it contains.

// Unambiguous inside the dataset, but ambiguous in the world -- a bare
// match would usually resolve to the wrong entity, so never link these.
const NO_AUTOLINK = new Set([
  // The dataset's bare "Salamis" is the Cypriot city, but nearly every
  // mention in prose is the 480 BC naval battle off Attica, the island
  // it was fought beside, or Ajax's home. Battle and city are both
  // reachable under their full names.
  'Salamis',
]);

// Qualified forms that must outrank a shorter, commoner name. Longest
// -first matching then steers "Egyptian Thebes" to Waset instead of
// letting the bare "Thebes" claim it for Boeotia.
const EXTRA_NAMES = [
  ['Egyptian Thebes', 'waset-thebes'],
  ['Cyprian Salamis', 'salamis-cyprus'],
];

const nameOwners = new Map();
const claimName = (name, id) => {
  if (!name || name.length < 5 || NO_AUTOLINK.has(name)) return;
  if (!nameOwners.has(name)) nameOwners.set(name, new Set());
  nameOwners.get(name).add(id);
};
for (const e of entities.values()) {
  claimName(e.name, e.id);
  // "The Parthenon Frieze" is written as "the Parthenon Frieze"
  // mid-sentence far more often than with the article attached.
  claimName(e.name.replace(/^The /, ''), e.id);
}
// A name claimed by two entities can't be resolved from the text alone
// ("Histories" is both Herodotus' and Polybius'), so it links to neither.
const linkNames = new Map();
for (const [name, owners] of nameOwners) {
  if (owners.size === 1) linkNames.set(name, [...owners][0]);
}
for (const [name, id] of EXTRA_NAMES) {
  if (entities.has(id)) linkNames.set(name, id);
}

/** Entity names safe to link from prose, longest first. */
export const AUTOLINK = {
  byName: linkNames,
  // Built against esc()'d text, since linking runs after escaping.
  pattern: linkNames.size
    ? new RegExp(
      `\\b(${[...linkNames.keys()]
        .sort((a, b) => b.length - a.length)
        .map((n) => esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')})\\b`,
      'g',
    )
    : null,
};

/* ============================================================
   Public API
   ============================================================ */

export const ALL = Array.from(entities.values());
export const get = (id) => entities.get(id) || null;
export const has = (id) => entities.has(id);
export const count = ALL.length;
/** Authored relations whose target id doesn't exist in the dataset --
 * dropped from `relations` above, kept here so validate-content.mjs can
 * fail the build on them instead of only logging a console.info. */
export const MISSING_RELATIONS = missingRelations;

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
