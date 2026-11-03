# Learning from Ancient Cyprus: analysis and plan for Hellenika

Analysis of <https://www.ancientcyprus.com>, taken from the pages and scripts the site serves
publicly (3 Nov 2026), and a plan for bringing the same depth to Hellenika while keeping
Hellenika's own strengths. This document records what was observed and what is proposed. It
is not a copy brief: layout ideas and structure are fair to learn from; their text, images and
code are not ours to reuse.

## 1. Who and how

- **One author.** Alexis Drakopoulos, a Greek Cypriot software engineer (MSc Computational Applied
  Mathematics, now a machine-learning engineer at a bank). Published by the Antiquity Preservation
  Fund, which he founded. Non-commercial, free, self-funded. No university or museum affiliation
  is stated on the pages read.
- **Stack.** Next.js (React) built with Turbopack, prerendered, hosted as static files on S3 behind
  CloudFront, media on a separate CDN subdomain. Map is hand-built SVG over a hillshade PNG, not a
  tile library.
- **Method.** Their editorial standards and AI policy state that every fact comes from a named
  source, that AI only works on material put in front of it, and that people make all dating and
  attribution decisions.

The lesson is that one person can reach this scale by treating the site as a structured database
that generates pages, not as hand-written pages.

## 2. What the site actually is

It is a set of cross-linked **registers** plus narrative layers on top, not a wiki of articles.

| Layer | What it holds | Scale seen |
|---|---|---|
| Registers | People, institutions, documents, tombs, objects, collections, archive items, lectures | 7,965 people, 7,180 connections, 1,309 institutions, 5,584 documents |
| Sites | One rich page per site, filterable by period, type, keyword | 34 listed, ~12 with full pages |
| History by period | Neolithic to Cypro-Archaic overview pages | 5 |
| Compendium / Courses | Teaching layer: pottery compendium, end-to-end course | Grouped by section (Daily Life, Mortuary Practices, Weapons & Armor...) |
| Articles / News | Thematic essays; news with a mandatory "Original source" box | Ongoing |
| Map | Time-stepper with 17 periods, true-length strip, site counts | One page |
| Trust pages | Editorial standards, AI policy, corrections, heritage protection | 4+ |

### Anatomy of one site page (Enkomi)

1. **Summary paragraph**, then a **period ribbon** showing which of 11 periods the site was used in.
2. **Local map** with graticule, scale bar, contour interval, neighbouring sites, coordinates in
   degrees-minutes-seconds, plus "Open in the map".
3. **Fact box:** also called (5 alternative names), type, district, political note, period,
   occupied dates, fieldwork by mission and year, key measurements, sanctuaries, where the main
   finds are held, excavation status, coordinates.
4. **24 headed sections**, from "The site and its harbour" through "Levels and dates", the
   buildings, "Enkomi and Alashiya" (the identification debate, with both sides stated), to
   "Abandonment" and "Visiting".
5. **Linked records:** finds, collection objects, excavation history, archive items.
6. **Dense references** (about 150 citation anchors on one page).
7. **Sidebars:** related news and a list of lectures.

Two things stand out. Chronological disagreements are written into the prose
("Dikaios placed its beginning in Middle Cypriot III; Crewe's restudy puts it in Late Cypriot IA").
And contested identifications are laid out as debates, not asserted.

## 3. Where Hellenika already matches or beats it

- Every claim carries an **evidence type** and a **confidence level**. Ancient Cyprus states its
  standards in prose; Hellenika enforces them in the data.
- Myth is structurally separated from history.
- Relationship graph with automatically derived inverse links.
- Offline support, command palette, timeline, journeys, quizzes.
- A validation suite (`npm test`) that can enforce quality rules.

Hellenika currently has 455 entities, 155 places and 252 people files, 334 sources. Each entity
carries claims and a `sources` list, but a claim does not yet point to a specific source or page,
and there is no register layer.

## 4. Gap list (what to add)

**A. Per-claim citation.** Today `sources` sits at entity level. Add an optional
`cite: [{src, loc}]` to each claim (`loc` = page, section, line, inscription number). Rule:
no `established` or `strong` claim without a `cite`. This is the single biggest step toward
"academically solid".

**B. Richer site template.** Add fields shown in the Cyprus fact box: `altNames` (already there),
`occupied` (range, with `approx`), `fieldwork[]` (mission, directors, years), `heldIn[]`,
`excavationStatus`, `coordPrecision`, `identification[]` (candidate identities with who
proposes/rejects), `chronologyNotes[]` (where scholars disagree on dates), `visiting`.

**C. Section structure for major sites.** A fixed list of optional headed sections (setting,
discovery and excavation, levels and dates, buildings, finds, writing, tombs, identification
debates, decline, visiting) rendered from Markdown headings, with a sticky table of contents.

**D. Registers** (new top-level views, each a filterable index plus detail pages):
1. **People**: excavators, scholars, collectors, ancient authors, rulers. Extend the 252
   existing people with `role`, `born/died`, `nationality`, `institution`, connections.
2. **Institutions**: museums, excavation schools (ASCSA, BSA, DAI, EFA, ...), universities.
3. **Documents**: the 334 sources grown into a register of editions, reports and articles,
   each with the entities it supports.
4. **Collections / objects**: object records with museum, accession number, findspot, date,
   licence of image.
5. **Inscriptions and texts**: epigraphic corpus entries (IG, SEG numbers).

**E. Period overview pages**, one per period, with a time-stepper map and a site-count strip.

**F. Teaching layer.** A compendium (pottery styles, architecture, coinage, writing systems) and
short courses built from existing entities.

**G. Trust pages.** Editorial standards, AI policy, corrections log, sources policy, heritage
and looting statement. Hellenika's `docs/editorial-content-standard.md` is the seed.

**H. Discoverability.** `sitemap.xml`, `robots.txt`, per-entity canonical URLs, schema.org
markup. Hash routing is the obstacle; options are a build step that emits one static HTML file
per entity, or a switch to History-API routes with a `404.html` fallback on GitHub Pages.

## 5. Source strategy ("solid academically")

Principle (same as theirs): **nothing enters the data from memory.** Each fact is taken from a
source we can name and that a reader can check. Draft text may be written by an assistant, but
only from material retrieved in that session, and every factual sentence must carry a `cite`.

Open sources worth using (each needs to be allowed on the network list and each has its own
licence, which the `sources` record must store):

| Need | Source |
|---|---|
| Ancient place IDs, coordinates, names | Pleiades, Wikidata, Trismegistos Geo |
| Ancient texts | Perseus, Scaife, Wikisource, Theoi (for myth) |
| Inscriptions | PHI Greek Inscriptions, Packard, SEG/IG indices |
| Excavation data | Open Context, Archaeology Data Service, Arachne (DAI) |
| Objects and images | Metropolitan Museum Open Access, British Museum, Louvre, Europeana, Wikimedia Commons |
| Bibliography | OpenAlex, Crossref, Internet Archive, DOAJ |
| Maps | Natural Earth, SRTM (for the hillshade), AWMC base layers |

Paywalled scholarship (JSTOR and similar) cannot be read here. Where a claim depends on it,
record it as `cite` to the published work only if we have actually seen the passage;
otherwise the claim stays at `probable` or below or does not go in.

Quality gates to add to `npm test`:
- every `established`/`strong` claim has a `cite` that resolves to a `sources` entry
- every `sources` entry has author, year, title, and a stable link (DOI, URL, or catalogue ID)
- every image has a licence and credit
- no entity page ships with fewer than N claims for its kind (site, person...)
- external IDs (Pleiades, Wikidata) validated for format

## 6. Phased plan

1. **Foundations (schema + trust).** Per-claim `cite`, richer site fields, validator rules,
   trust pages. Retrofit existing entities with `cite` where the source is already named.
2. **One pilot site at full depth.** Pick one major site (e.g. Knossos or Mycenae), build it to
   the Enkomi level with 15-20 sections and a real reference list, to prove the template and
   the workflow.
3. **Registers.** People and Documents first (they already exist as data), then Institutions,
   then Objects.
4. **Period pages and time-stepper map.**
5. **Teaching layer and discoverability.**
6. **Scale up** site by site, prioritised by teaching value, with the pipeline from section 5.

## 7. Decisions needed

1. Which phase to start with (recommended: 1, then 2).
2. Pilot site for phase 2.
3. Which source domains to allow on the network list (section 5 table).
4. Routing change for SEO (build step vs History-API routes) — can wait until phase 5.
