# Hellenika

An interactive atlas of the Ancient Greek world, **3200 BC – 30 BC**, explored through
time, space, relationships and evidence.

Not an encyclopaedia. A connected graph of 300+ entities where every factual claim
carries the kind of evidence it rests on and how confident anyone is entitled to be.

**Live:** <https://georgephilippou.github.io/Hellenika/>

---

## Running it

No build step, no dependencies. Any static server works — but ES modules need HTTP,
so opening `index.html` from the filesystem will not work.

```bash
python3 serve.py 8931
```

Then open <http://localhost:8931>. `serve.py` sends `no-store` so edits show up on
reload without cache-busting.

---

## What's in it

| | |
|---|---|
| Entities | 376 |
| Relationships | 1,294 (authored and automatically derived inverse links) |
| Evidence-tagged claims | 1,920 |
| Sources cited | 288 |
| Mapped locations | 100+ |
| Curated collections | 10 |

By kind: 11 periods · 84 people · 32 cities · 41 sites · 61 artefacts · 42 events ·
26 battles · 4 wars · 25 texts · 28 mythological figures · 11 deities · 3 empires ·
1 kingdom · 3 writing systems · 1 language · 3 regions.

---

## The two ideas that shape everything

### 1. Every claim is tagged

Most history writing presents everything in one voice: *"The Minoans built palaces at
Knossos"* and *"Minoan society was matriarchal"* read identically, though one is
established beyond dispute and the other is a speculation that has been losing ground
for eighty years.

Every claim here carries two tags:

- **Evidence type** — archaeological, literary, epigraphic, numismatic, linguistic,
  ancient tradition, modern consensus, modern debate
- **Confidence** — established → strong → probable → debated → speculative → legendary

This doesn't make the site neutral. It makes the reasoning visible, so you can
disagree with it.

### 2. Mythology is structurally separated

Myth pages don't use the historical page template. They separate:

- the story as told
- the earliest surviving source for it
- its religious function
- any possible historical background
- what archaeology actually shows
- later reinterpretation

Separation isn't dismissal — a myth with no historical basis can still be the most
important thing a society believed, and the pages say so.

---

## Architecture

```
index.html          app shell
serve.py            dev server (no-store headers)
css/
  tokens.css        design tokens — colour, type, space, motion, both themes
  base.css          reset, typography, layout primitives
  components.css    cards, chips, buttons, palette, switches
  views.css         per-view layouts
js/
  main.js           bootstrap, routing table, command palette, shortcuts
  db.js             entity graph: merge, index, derive inverse relations, search
  router.js         hash router
  store.js          observable app state (year, theme, layers, bookmarks, progress)
  util.js           dates, easing, projection, DPR canvas fitting, storage
  icons.js          inline SVG icon set
  components/
    timeline-canvas.js   draggable/zoomable timeline
    map-canvas.js        historical map with time-driven territories
    graph.js             force-directed relationship graph
    ui.js                shared HTML fragments
  views/            one module per route
data/
  periods · people · places · events · artefacts · texts · myth · culture
  sources · collections · quizzes · geo
```

### Why canvas for timeline, map and graph

The dataset is designed to grow to thousands of entities. Canvas keeps the DOM small
and dragging at 60fps; a DOM-node-per-marker approach would not survive that.

### Inverse relationships are derived

Writing this once in `places.js`:

```js
{ id: 'knossos', relations: [{ id: 'arthur-evans', rel: 'excavated by' }] }
```

automatically produces `Knossos → excavated` on Arthur Evans' page. `db.js` walks every
authored relation, inverts the label via a lookup table, and injects the reverse edge.
That's what keeps ~1,100 connections consistent without maintaining both directions by
hand, and it's why adding one entity immediately enriches every entity it touches.

### Adding data

Add the record to the relevant file in `data/`. If it's a new file, import it in
`db.js` and add it to `SOURCES_OF_TRUTH`. Nothing else needs to change — indices,
search, facets, the map layer, timeline markers and the graph all derive from the
merged set. Relations pointing at ids that don't exist yet are dropped with an
`console.info` listing them, so forward references are safe.

### View lifecycle

A view returns its root node and may set `root.__mount`, called by the router
immediately *after* the node is in the document. Anything needing layout — canvas
sizing, observers, listeners — goes there. This deliberately avoids
`requestAnimationFrame`, which browsers throttle in background tabs and which would
otherwise leave views blank until focused.

---

## Keyboard

| Key | Action |
|---|---|
| `/` or `⌘K` | Search everything |
| `t` `m` `e` `h` | Timeline, Map, Explore, Home |
| `r` | Random entity |
| `←` `→` | Pan timeline / map |
| `+` `−` | Zoom |
| `0` | Reset timeline view |
| `Esc` | Close palette or sheet |

---

## Images and the map

**Images** are resolved live from Wikipedia, not bundled — this project can't itself
clear rights on hundreds of museum photographs, and Wikipedia's own hosting and
attribution already solves that problem. `data/images.js` holds a hand-checked title
override table (some entity names collide with disambiguation pages, or Wikipedia's
"page image" is a locator map rather than a photo — both were audited and fixed or
skipped rather than shown wrong). `js/components/images.js` resolves titles via the
MediaWiki API, batches requests, caches results in `localStorage`, and fades photos in
over each entity's type glyph as they arrive — so first paint is instant and never
blocks on network. Every photo links back to its Wikipedia source, which is where the
real attribution and licensing detail lives. Entities with no suitable photo (most
Bronze Age individuals, many process-events) keep their glyph rather than show
something wrong or irrelevant — that's a deliberate choice, not a gap to fill.

**The map** is a real Web Mercator slippy map (`js/components/tiles.js`): live
label-free raster tiles (Esri shaded relief, or CARTO Plain) with historical
territories, routes and markers drawn on top in the same projection. A vector fallback
(the original hand-built coastline) renders automatically if the tile providers are
unreachable, so the map still works offline. Switch basemaps from the panel on
`#/map`. Territories and borders are still schematic, generalised polygons — that part
hasn't changed, since ancient political control was rarely a line on a map at all.

**Chronology.** The Aegean Bronze Age has two competing chronologies. This site uses
the *high* chronology (Theran eruption c. 1620–1600 BC, on radiocarbon and ice-core
evidence). Where a date is load-bearing, the page says which way it leans.

**Perspective.** Nearly every surviving source was written by literate elite men, mostly
Athenian. Women, the enslaved, metics and the rural poor were the large majority and
appear mainly when someone else needed to mention them. Pages flag that gap where they
can.

**Coverage.** 306 entities is a foundation, not completeness — the Greek world had well
over a thousand poleis. Coverage is weighted toward cases where the *evidence* is
interesting rather than toward exhaustiveness.

---

## Corrections

The evidence tags are the mechanism for catching errors: if a claim is marked
*established* and you know it's contested, that's a bug in the data rather than a
difference of opinion.
