/* ============================================================
   Hellenika — content schema

   The single source of truth for how each data/*.js file's content
   maps onto content/<category>/<id>.md files, shared by the
   migration script (data/*.js -> content/*.md files) and the compile
   script (content/*.md files -> data/*.json).

   Per category:
     shape   'array'  — data file exports a plain array of entities.
             'object' — data file exports a plain object keyed by id
                        (sources.js).
             'map'    — data file exports a flat id -> scalar map, not
                        a list of richer entities (images.js overrides).
     groups  For files that export more than one collection (geo.js,
             journeys.js, quizzes.js, world.js), one entry per
             collection. `name` must match the JSON key used to store
             that collection. `prose` lists the fields (if any) that
             hold long-form narrative and should live in the Markdown
             body instead of frontmatter. Every other own-field on an
             entity — however nested (claims, relations, stops,
             questions, rings, paths, ...) — stays in frontmatter
             exactly as authored, per the project's content decision:
             only narrative prose fields move to the body.
   ============================================================ */

export const CATEGORIES = {
  periods: {
    file: 'periods.js',
    shape: 'array',
    groups: [{ name: 'periods', prose: ['summary', 'significance', 'overview', 'politics', 'warfare', 'culture', 'boundaryNote'] }],
  },
  people: {
    file: 'people.js',
    shape: 'array',
    groups: [{ name: 'people', prose: ['summary', 'significance', 'body'] }],
  },
  places: {
    file: 'places.js',
    shape: 'array',
    groups: [{ name: 'places', prose: ['summary', 'significance', 'body'] }],
  },
  events: {
    file: 'events.js',
    shape: 'array',
    groups: [{ name: 'events', prose: ['summary', 'body'] }],
  },
  artefacts: {
    file: 'artefacts.js',
    shape: 'array',
    groups: [{ name: 'artefacts', prose: ['summary', 'body'] }],
  },
  texts: {
    file: 'texts.js',
    shape: 'array',
    groups: [{ name: 'texts', prose: ['summary', 'body'] }],
  },
  myth: {
    file: 'myth.js',
    shape: 'array',
    groups: [{
      name: 'mythology',
      prose: ['summary', 'myth', 'earliestSource', 'religious', 'historicalBackground', 'archaeology', 'laterInterpretation'],
    }],
  },
  'odyssey-places': {
    file: 'odyssey-places.js',
    shape: 'array',
    groups: [{
      name: 'odysseyPlaces',
      prose: ['summary', 'myth', 'earliestSource', 'historicalBackground', 'archaeology'],
    }],
  },
  culture: {
    file: 'culture.js',
    shape: 'array',
    groups: [{ name: 'culture', prose: ['summary', 'body'] }],
  },
  collections: {
    file: 'collections.js',
    shape: 'array',
    groups: [{ name: 'collections', prose: ['summary', 'intro'] }],
  },
  quizzes: {
    file: 'quizzes.js',
    shape: 'array',
    groups: [
      { name: 'quizzes', prose: ['summary'] },
      { name: 'gameModes', prose: ['summary'] },
    ],
  },
  sources: {
    file: 'sources.js',
    shape: 'object',
    groups: [{ name: 'sources', prose: ['note'] }],
  },
  world: {
    file: 'world.js',
    shape: 'array',
    groups: [
      { name: 'worldPeriods', prose: ['note'] },
      { name: 'worldEvents', prose: ['note'] },
    ],
  },
  journeys: {
    file: 'journeys.js',
    shape: 'array',
    groups: [
      { name: 'odysseyJourney', prose: ['note', 'connection'] },
      { name: 'alexanderJourney', prose: ['note', 'connection'] },
      { name: 'alexanderFoundations', prose: ['note'] },
      { name: 'alexanderTerritoryStages', prose: [] },
    ],
  },
  geo: {
    file: 'geo.js',
    shape: 'array',
    groups: [
      { name: 'seas', prose: [] },
      { name: 'islands', prose: [] },
      { name: 'rivers', prose: [] },
      { name: 'territories', prose: [] },
      { name: 'routes', prose: [] },
    ],
  },
  images: {
    file: 'images.js',
    shape: 'map',
    // imageOverrides: flat id -> Wikipedia title string (no nested fields,
    // no prose — see the migration report for why the file's explanatory
    // // comments aren't carried into per-entry frontmatter).
    // imageSkip: a bare Set of ids, modelled as one document holding a list.
    groups: [
      { name: 'overrides', prose: [], kind: 'flat-map' },
      { name: 'skip', prose: [], kind: 'id-list' },
    ],
  },
};

/** Marker line used to delimit named prose sections inside a body file. */
export const FIELD_MARKER = (field) => `<!-- field: ${field} -->`;
export const FIELD_MARKER_RE = /^<!-- field: ([a-zA-Z0-9_]+) -->\s*$/;
