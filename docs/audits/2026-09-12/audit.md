# Hellenika: content, evidence and study-readiness audit

12 September 2026 · Repository baseline `72690a6` · Scope: the existing site and a proposed comprehensive study resource.

## Assessment

Hellenika has a substantial foundation: 401 connected entries, roughly 98,500 words of narrative, a working chronology and map, deliberately separated mythological registers, and a sizeable bibliography. It is already useful for discovering subjects and following connections. It is **not yet a dependable, comprehensive course or reference work for studying the Greek world**.

The main obstacle is not simply the number of entries. The site needs more reliable relationships and date semantics, traceable citations, sustained explanations of institutions and ideas, and a structured route through its material. Expanding the current pattern of short biographies and battles alone would leave those weaknesses intact.

The highest priorities are to repair misleading information already presented, make evidence verifiable, and build the missing explanatory chapters. Roman and Byzantine history should be an explicit expansion with its own curriculum, not an implied continuation already covered by the existing “Roman Conquest” period.

## What was audited, and what this establishes

- Inventoried all 401 runtime entities across nine entity datasets, all 2,015 claim records, all 1,694 raw authored relationship records, and all 288 bibliography records.
- Checked entity/source references, date ordering, data structure, category coverage, narrative lengths, confidence labels, and the Markdown-to-runtime-data round trip.
- Ran each project validation suite separately because the consolidated runner stops at its first failure. Checked syntax in all 54 JavaScript/module files covered by the existing runner.
- Inspected the rendering, graph derivation, search, chronology, quizzes, collections and map data model. Reproduced relationship and search problems by importing the actual runtime graph.
- Viewed the live homepage, Hera entry and learning page; the homepage confirms the same 401-entity/2,015-claim/288-source totals. Inspected a screenshot of the Hera layout.
- Read selected major narratives and mythology entries closely, including the Classical and Roman-conquest overviews, Socrates, Plato, Aristotle, Anaxagoras, Sappho, Cleopatra, Actium, Cleopatra’s death, Hera, Hephaestus, Oedipus and Aphrodite. Checked selected historical claims against primary texts and specialist publications below.

This is a corpus-wide **coverage and structural audit with targeted factual verification**. It is not a certification of all prose, all 2,015 claims, every bibliographic title, every image, every quiz answer or every map polygon. An entry not named as faulty has not thereby passed a scholarly fact-check. No completeness percentage is defensible without first agreeing a syllabus. The proposed additions below are an editorial curriculum, not a claim that there is a finite list of “all Greek history.”

Companions: [complete linked inventory](inventory.md), [machine-readable inventory and authored edges](inventory.json), [validation output](validation.txt).

## Current holdings

| Content | Count | Interpretation |
|---|---:|---|
| Periods | 11 | Overlapping framework from 3200 to 30 BCE; no Roman-imperial or Byzantine sequence |
| People | 84 | Includes five modern researchers; 12 classified as philosophers |
| Cities / archaeological sites | 36 / 45 | Strong Aegean, sanctuary and Cypriot coverage; uneven wider Greek geography |
| Battles / wars / other events | 26 / 4 / 42 | Classification is inconsistent: some war subjects are typed as events |
| Artefacts | 61 | A useful material-culture foundation |
| Texts | 25 | Introductions to selected works, not a source reader |
| Myth / deity entries | 37 / 19 | Includes 14 Odyssey-place records; not 56 individual mythological characters |
| Empires / kingdoms / regions | 3 / 1 / 3 | Political and geographical contextual records |
| Writing systems / languages | 3 / 1 | Useful beginnings; not a Greek-language course |
| Bibliography | 288 | 266 modern and 22 ancient records; this is a record count, not verification of all citations |
| Claims | 2,015 | Every claim object has evidence/confidence tags; none has a structured source citation |
| Collections | 10 | Bronze Age, Homer/Troy, Persia, Athens, Sparta, Alexander, Hellenistic world and method |
| Written quizzes | 5 | 29 questions altogether |
| Generated game modes | 6 | Useful revision mechanisms, with chronology issues described below |
| Map territories/phases / routes | 132 / 23 | Schematic reconstructions; geometric validation is not historical verification |

Median narrative length is 203 words, ranging from 91 to 1,112; total 98,483 words using the inventory’s prose-field definition. A 90-word editorial minimum prevents stubs but cannot establish adequate treatment of democracy, philosophical systems, economic structures or major wars.

The runtime displays 1,386 relationships using its own graph statistic, including generated links. The raw data contains 1,694 directed authored records, including reciprocal relationships. These are different measures and must not be interpreted as independent documented historical facts.

The README is stale: it contains multiple different totals (including 376 and 306), outdated basemap instructions, and authoring guidance that still directs people to data files. Current authoring is Markdown under `content/`, compiled to JSON. Treat the inventory and actual runtime as the baseline.

## Strengths to preserve

1. **Connected study.** People, places, events, objects and texts can explain one another rather than sitting in isolated articles.
2. **Attention to uncertainty.** Distinguishing evidence types and confidence is useful, provided those judgments become traceable.
3. **Separate myth registers.** Story, attestation, religion, archaeology and reception are a sound starting structure. The dedicated mythology overview explicitly acknowledges variants.
4. **Material and regional breadth.** Bronze Age sites, objects, scripts and the relatively rich Cypriot coverage prevent the whole site becoming a sequence of Athenian politicians.
5. **Map caution already present.** Existing documentation distinguishes cultural distributions, polities, leagues and regional reconstructions. Preserve these distinctions and explicit uncertainty.
6. **Maintainable content pipeline.** All 1,160 compiled records from 1,161 Markdown files match their checked-in JSON. These totals include auxiliary records beyond the 401 main entities.

## Findings requiring correction

Priorities: P1 = misleading teaching material or foundational study gap; P2 = substantial depth, navigation or maintenance improvement. “Confirmed” below means reproduced from the current data/code or directly compared with an identified source. “Review” means the current wording needs specialist checking before a definitive replacement.

| ID | Priority / status | Finding and evidence | Required improvement |
|---|---|---|---|
| A01 | P1, confirmed | All 2,015 claim objects contain only `text`, `evidence`, `confidence`. Bibliographies attach to entries, not individual claims. | Give each claim one or more source IDs with book/section, page, inscription, object or fragment reference; distinguish supporting and dissenting sources. |
| A02 | P1, confirmed | All 288 bibliography records lack structured URL, DOI/ISBN, publisher and edition fields. Some titles/notes may contain contextual details, but references are not consistently resolvable. Entity bibliography renders plain text. | Add stable identifiers, editions/translators and links; make claims lead to the actual passage or scholarly argument. |
| A03 | P1, confirmed | Runtime graph gives Hera `father of` Hephaestus and `son of` Kronos. `son of → father of` and `father of → son of` assume sex; reverse derivation is not semantically safe. | Use parent/child semantics or explicitly validated parent roles. Audit every kinship edge and its inverse. |
| A04 | P1, confirmed | `content/myth/oedipus.md` points `father of` to `antigone`; that ID is the tragedy in `content/texts/antigone.md`. | Create a distinct Antigone character ID; separate author/work/character relations and validate allowed endpoint types. |
| A05 | P1, confirmed | Hephaestus’s prose acknowledges alternative parentage, but graph edges assert Zeus and Hera without source or variant qualifiers. All authored edges contain only `id` and `rel`. | Store tradition/source, uncertainty and qualifications on relations; allow variant genealogies rather than one apparently canonical tree. |
| A06 | P1, confirmed | Inverse generation checks only whether a link to the other entity exists. One existing relation can suppress a different inverse relation between the same pair. | Preserve multiple relationships between two entities, deduplicating by relation meaning as well as endpoints. |
| A07 | P1, confirmed live | Hera’s header and Facts show “1400–390 BC” as generic dates, with no explanation of what begins or ends. All 56 myth/deity records have numeric dates. | Separate story chronology, first surviving attestation, cult history and modern scholarly dating. Never imply a deity’s lifespan or cessation of worship from a display interval. |
| A08 | P1, confirmed code | `datedPool()` in `js/views/learn.js` excludes modern records but not myth/deity/legendary records. Games can treat their stored dates as historical answers. | Exclude unsuitable records or explicitly quiz the date of an attestation. Respect approximate/range dates in scoring. |
| A09 | P1, confirmed against primary text | Socrates’s biography says he proposed free meals “rather than a plausible fine,” omitting his eventual proposal of thirty minas with guarantors. | Explain the sequence of counterproposals, using Plato, *Apology* 36–38, especially 38b. [Primary text](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0170%3Atext%3DApol.%3Apage%3D38). |
| A10 | P1, confirmed misleading summary | The Classical overview says “Thebes in turn falls at Mantinea in 362.” This collapses battlefield outcome, Epaminondas’s death and the subsequent limits of Theban leadership. | Replace with a precise explanation of the battle and its inconclusive wider consequences. Xenophon describes competing victory claims and greater disorder, not a straightforward fall of Thebes. [*Hellenica* 7.5.26–27](https://www.perseus.tufts.edu/hopper/text?doc=Xen.+Hell.+7.5&lang=original). |
| A11 | P1, confirmed outdated framing | Cleopatra and death-of-Cleopatra narratives call Roman Egypt the emperor’s “personal possession.” That turns direct imperial administration into private ownership. | Describe a Roman province governed through an equestrian prefect, with access restrictions; explain the older interpretation if relevant. Huebner explicitly identifies the private-possession model as dated. [Publisher excerpt, p. 6](https://assets.cambridge.org/97811084/55701/excerpt/9781108455701_excerpt.pdf). |
| A12 | P2, confirmed missing qualification | Sappho’s page celebrates the 2014 papyri without explaining the later provenance controversy. | Add the provenance problem and retraction context, carefully separating acquisition history from textual authenticity. [Society for Classical Studies statement](https://classicalstudies.org/annual-meeting/comment-abstract-dirk-obbink). |
| A13 | P1, confirmed internal wording error | Anaxagoras’s narrative groups the sun-as-incandescent-stone account among “strikingly correct astronomical claims.” Reporting a historical hypothesis is not endorsing it as modern solar physics. | Separate what he proposed, why it mattered and what is scientifically correct. Also qualify disputed biographical chronology. [Specialist overview](https://plato.stanford.edu/entries/anaxagoras/). |
| A14 | P2, review | Plato’s Academy is presented as operating for roughly nine centuries to its final closure. This needs distinctions between the original institution and later Athenian Platonism. Other rhetorical absolutes include “exactly twice” for Socrates’s political interventions. | Perform a targeted review of institutional continuity, biographical anecdotes and absolute claims; provide passage-level evidence before keeping them. |
| A15 | P2, confirmed | Six editorial-validator issues affect Tamassos, Marion, Lapithos, Hala Sultan Tekke and Choirokoitia: five insufficient authored-link counts and one insufficient source count. | Supply genuinely relevant sources and connections rather than meeting numerical thresholds with filler. |
| A16 | P2, confirmed | Two territory label anchors lie outside their rings: `t-egypt-nk-levant` and `t-ptolemaic-early-levant`. | Check intended territorial meaning and reposition the label or correct geometry as appropriate. |
| A17 | P1, confirmed code/live | Search indexes names, aliases, summaries, region and subtype, but not body text or claims. Runtime search for “metics” gives no result; “Forms” returns reforms-related entries rather than Plato’s discussion. | Add concept-aware full-text search and exact-word handling, with visible matched passages. |
| A18 | P1, confirmed live/code | Learning and collections routes work, but are absent from the main navigation and homepage/footer links inspected. | Make “Study” a visible entry point containing reading routes, collections and exercises. |

Additional editorial review should remove sweeping or dismissive formulations. Hera’s page, for example, describes a “shrill literary character” and contrasts myth as entertainment with cult as practice too categorically. Prefer analysis of particular authors, genres and rituals over a single psychological portrait. This is an editorial recommendation, not a claim that the entire entry is false.

## Evidence and research method

981 claims are labelled established and 647 strong: about 81% of the claim list. That distribution does not prove overconfidence, but the absence of claim citations makes those judgments difficult to assess. The site defines established as multiple independent lines of evidence with no serious dissent; a single literary report or ancient anecdote does not automatically meet that definition.

The homepage/footer promise that every claim is tagged overstates the implementation. Only the selected claim lists carry tags; the much larger body prose contains additional assertions. Either narrow the public wording or extend citation/annotation coverage into narrative.

Recommended citation model: a claim has an evidence basis, confidence rationale, source reference, locator and review status. For an ancient author, include passage, composition date, distance from the events and relevant bias; for archaeology, include object/site context, dating method and publication; for contested interpretation, identify the competing positions. Bibliographic quantity must not substitute for actually checking the cited work.

Add a visible editorial status such as “draft,” “sources checked,” “specialist reviewed,” plus last review date. Keep factual confidence separate from editorial review status: a confidently written sentence can still be unchecked. Do not infer a consensus merely because several popular summaries repeat it.

## Coverage by subject and what should be added

“Missing” here means missing as a dedicated entity or structured treatment unless otherwise stated. A name may already occur in another page. The complete inventory lets an editor check that distinction before creating anything.

| Area | Current position | Priority additions or deeper treatment |
|---|---|---|
| Bronze Age and early Greece | Comparatively strong palaces, scripts, objects and collapse framework | Palace administration, households and labour, trade evidence, burial practice, chronology methods, distinction between material culture and language/ethnicity; introduce Neolithic background explicitly where relevant |
| Archaic development | Major poets, lawgivers, migration and colonisation overview | Formation of the polis; citizenship; aristocracy and tyranny; colonisation from both settlers’ and local communities’ perspectives; regional political variety; hoplite-development debates; law and coinage as institutions |
| Persian Wars | Strong major battles and principal leaders | Causes, Persian governance and Greek collaboration; Artemisium and strategic context; compare Herodotus with inscriptions and archaeology; show war phases and logistics |
| Fifth/fourth-century history | Athens/Sparta and selected battles dominate | Pentekontaetia, Peace of Nicias, Melos, oligarchic coups of 411 and 404, democratic restoration, Corinthian War, King’s Peace, Second Athenian Confederacy, Sacred Wars, federal states and Macedonian intervention |
| Military study | 26 battle entries and campaign routes | Causes, command, recruitment, finance, fleets, siegecraft, logistics, civilian consequences and aftermath. Treat troop/casualty figures as source-dependent estimates, not exact data |
| Hellenistic history | Successors, Alexandria and scientific figures present | Antigonid and Attalid kingdoms, dynasties, Achaean/Aetolian leagues, royal women, civic institutions under kings, diplomacy, trade and rural administration, interactions with Egyptian and Near Eastern populations |
| Roman takeover | Selected conquests and Cleopatra present | Caesar, Antony, Octavian/Augustus, Agrippa, Pompey and Caesarion; Mithridatic-war phases; Greek agency and provincial arrangements. Cleopatra’s key relationships currently cannot be explored as linked biographies |
| Philosophy | Twelve philosopher biographies, three philosophical text entries | Parmenides, Empedocles, Protagoras, Gorgias, Diogenes of Sinope, Pyrrho, Chrysippus, Theophrastus; explain arguments, concepts and schools, not only lives |
| Political institutions | Mostly embedded in Athens, Sparta and biographies | Polis, ekklesia, boule, courts, magistrates, citizenship, ostracism, oligarchy, tyranny, Spartan kings/gerousia/ephors, helotry, leagues and federal government |
| Social and economic history | Scattered references without a sustained thematic sequence | Women and gender, family and marriage, slavery and manumission, metics, agriculture, landholding, mining, workshops, wages, trade, banking, taxation, migration and education; distinguish Athens from other regions |
| Religion | Deities and sanctuaries provide a good base | Sacrifice, festivals, civic cult, priesthood, household religion, oracles, initiation, healing, funerary practice and local variants; distinguish mythology from what people did |
| Mythological coverage | Selected heroes, gods and Odyssey places | Ares is absent as an entity. Add major narrative participants: Hector, Paris, Patroclus, Priam, Andromache, Penelope, Telemachus, Ariadne, Clytemnestra, Orestes, Electra, Antigone the character, Thetis and Peleus; develop narrative cycles and variant genealogies |
| Literature and performance | Homer, tragedy, historians and a small text selection | Pindar, Menander, Callimachus, Apollonius and Theocritus author pages; lyric, comedy, rhetoric, performance context, fragment transmission and translation issues |
| Primary-text study | Bibliography and work summaries | Guided passages with context, commentary and questions. Priorities include Plato’s *Apology*, *Crito*, *Phaedo* and *Symposium*; Aristotle’s *Politics*; Xenophon’s *Hellenica* and *Anabasis*; selected inscriptions and documentary papyri |
| Science and technology | Strong recognisable inventors and objects | Explain mathematical arguments, astronomical models, medicine and evidence, mechanics, measurement and technological limits; connect ideas to texts and material evidence |
| Geography beyond central Greece | Cyprus and several colonies well represented | Thessaly, Boeotia, Epirus, Crete beyond palaces, western Greece, Magna Graecia/Sicily and Black Sea networks; colonial and indigenous perspectives, federal and non-polis societies |

The recommended breadth follows the combination of history, philosophy, literature, language and archaeology found in university Classics study, rather than equating comprehensive coverage with a list of famous men. Oxford’s history curriculum also explicitly includes exploitation and social structures. These are benchmarks for scope, not a syllabus copied wholesale. [Oxford Classics](https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing/classics), [ancient-history course outline](https://www.classics.ox.ac.uk/node/180871).

### People to prioritise

First add figures whose absence breaks existing narratives: Caesar, Antony, Octavian, Agrippa and Caesarion around Cleopatra; Nicias, Brasidas, Pelopidas and Agesilaus around classical warfare; Parmenides, Empedocles and the Sophists around philosophy. Then add Hellenistic political and intellectual networks, including Aratus, Philopoemen, Arsinoe II, Berenice II and Theophrastus. For Cyprus, Evagoras is a conspicuous candidate alongside the already substantial city coverage.

The current person list identifies only four women: Sappho, Aspasia, Olympias and Cleopatra. That requires more than adding a few queens. Social-history chapters should explain the much wider population absent from elite literary sources, using inscriptions, archaeology, legal speeches and papyri while stating their limitations. Gorgo, Cynisca, Hipparchia and documented Hellenistic royal women are possible additions after source checking.

### Philosophy should become a connected course

A learner should be able to follow natural philosophy and the problem of change; Socratic inquiry and the Sophists; Plato’s knowledge, soul, ethics and politics; Aristotle’s logic, nature and practical philosophy; and Hellenistic Stoicism, Epicureanism, Cynicism and scepticism. Each module needs a question, an argument, a primary passage, objections and connections to other thinkers. The present brief biographies cannot carry that alone.

### Battles should sit inside explanations of wars

A battle page should identify the war/campaign, competing objectives, preceding situation, location uncertainty, commanders, sequence, outcome, consequences and source disagreements. “Who won?” is inadequate where a tactical result differs from the strategic outcome. Add thematic explanations of the hoplite, trireme, phalanx, cavalry, mercenaries and siege technology so the same terms do not require repeated unexplained shorthand.

## Cleopatra, Rome and Byzantium: resolve the chronological scope

The actual global range is hard-coded as `TIME_MIN = -3200` and `TIME_MAX = -30` in `js/store.js`. The live homepage and period list agree. Some objects, later authors and modern discoveries occur outside that range, but they do not constitute coverage of later Greek history.

Cleopatra’s death in 30 BCE and Byzantine history are very different endpoints. I recommend a three-part structure:

1. **The ancient Greek world to 30 BCE:** complete the existing core, with prehistory clearly distinguished from evidence for Greek-speaking communities.
2. **The Greek world under Rome and in late antiquity:** provincial life, continued Greek civic and literary culture, the Second Sophistic, philosophy and science, Christianity, religious change, Constantine and Constantinople. Include dated bridges rather than jumping directly from Cleopatra to Byzantium.
3. **Eastern Roman/Byzantine history:** if the intended endpoint is the empire’s fall, provide a separate period framework extending to 1453, with an explicitly scoped epilogue for surviving successor centres if desired.

The term Byzantine is retrospective; medieval inhabitants understood their empire as Roman. The Met’s overview uses approximately 330–1453 and explains this identity. Treat 330 as a useful organising date, not a sudden ethnic or civilisational replacement. [Metropolitan Museum overview](https://www.metmuseum.org/essays/byzantium-ca-330-1453).

An eventual Byzantine sequence would need early imperial/Christian transformations, Justinian and Theodora, seventh-century wars and change, iconoclasm, middle Byzantine institutions and culture, the Komnenian period, 1204, successor states, 1261 and the final centuries. It also needs law, theology, economy, diplomacy, art and ordinary life. A list of emperors and battles would repeat the current coverage imbalance.

Before extending the slider, define date roles and a consistent BCE/CE conversion without a displayed year zero. Revisit period filters, map layers, sources, games, place continuity and dynastic relations together. Do not merely increase `TIME_MAX`.

## Make the existing material teachable

- Add a visible Study landing page: “start with no prior knowledge,” chronological course, thematic routes, primary-source exercises and revision.
- Give each module learning objectives, prerequisites, a narrative overview, a dated outline, key terms, primary readings, comparison questions and a short assessment.
- Separate three levels of reading: a concise orientation, a substantive explanation, and detailed evidence/disagreement. Preserve short entity pages as reference cards linked from the course.
- Add a glossary of Greek terms with transliteration and pronunciation guidance where appropriate. The site should state whether it teaches history through translation or also offers language instruction.
- Expand the 29 authored questions by learning objective. Add source criticism and causal explanation alongside recall. Link answers to exact evidence, not simply an entity page.
- Make family and teacher/student networks browsable with an accessible textual relation list. The inspected connection section exposes the canvas graph, not an equivalent list of every relationship for keyboard/screen-reader study.
- Show uncertain dates as ranges and distinguish births, reigns, activity, composition, discovery and attestation. Five current records begin before the advertised 3200 BCE boundary; represent that as intentional background rather than silently clipping it.
- Add object captions that identify ancient original versus Roman copy, later artistic representation or modern reconstruction. Image correctness and individual licensing require their own audit; neither is certified here.

## Implementation order and acceptance criteria

| Stage | Deliverable | Completion standard |
|---|---|---|
| 1. Repair | A03–A16 factual/relationship/date and validation corrections | Confirmed errors corrected in authored content and runtime; all current suites pass; meaning-aware kinship/work-character checks added; no invented citations |
| 2. Evidence | Claim citations, resolvable bibliography, editorial status | Every reviewed claim can be traced to a locator; uncertainty explained; narrative wording matches evidence; pilot across a person, battle, deity, site and period |
| 3. Curriculum | Chronological and thematic study outline | Every learning objective has an assigned page or explicit gap; glossary and primary readings specified; clear endpoint agreed |
| 4. Ancient core | Fill the highest-impact omissions and deepen chapters | Each module reviewed as a whole for chronology, cause, context, relationships and perspectives, with source-based exercises |
| 5. Roman/Byzantine expansion | Separate linked volumes and revised time model | No chronological gap; later identity and institutions explained; maps, timelines and quizzes handle the expanded dates consistently |

The first content batch should combine corrections with closing broken narrative chains, not bulk generation. A practical pilot is the Cleopatra/Actium cluster: review the existing three entries, add the missing political actors, source every relationship, explain Roman Egypt accurately, and provide a short guided reading. A parallel model for a later batch is Socrates–Plato–Aristotle with arguments and primary passages. These examples establish a quality standard reusable throughout the site.

## Validation and limits

| Check | Result |
|---|---|
| Content editorial minimums | Failed: six issues across five entries |
| Geo structure | Failed: two label anchors outside rings |
| Journey data | Passed: 14 Odyssey stops, 11 Alexander stages, 9 cumulative control regions, 14 progressive foundations |
| Map lifecycle | Passed |
| Content round trip | Passed: 1,160 records from 1,161 Markdown files |
| JavaScript/module syntax | Passed: 54 files |
| Raw entity/source references and date ordering | No missing targets/source IDs or reversed start/end pairs detected |

Passing those checks does not establish historical accuracy. The kinship mistakes and Oedipus/Antigone collision pass the current reference checks because the target IDs exist. The audit therefore recommends semantic validation as well as editorial work.

No website content or application behaviour was changed in this audit. The deliverables are local audit documents and the complete inventory. No publication or claim of full scholarly certification is implied.
