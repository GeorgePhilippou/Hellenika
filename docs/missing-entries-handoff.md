# Handoff: filling the missing basics

A coverage check (Oct 2026) compared a standard list of ~400 ancient Greek
names against every entry's id, name and altNames. About 200 have no entry
of their own. This brief is everything needed to add them.

## Workflow (per batch of 5–7 entries)

1. **Check ids** you want to link to exist — ids are not always the obvious
   ones (see *Id gotchas*). `ls content/*/ | grep -i <word>`
2. **Write a spec** (JSON array, format below) in a scratch file outside the repo.
3. `node scripts/authoring/create-entries.mjs spec.json` — validates minimums,
   sources and relation targets, then writes `content/<dir>/<id>.md` and an
   image override. Relation targets must already exist **or be in the same
   batch**; if a target belongs to a later batch, drop that relation (the
   later entry can link back — inverse links are derived automatically).
4. `npm run content:build && npm test` — must end with
   `Project validation passed`.
5. Commit the batch (end the message with the Co-Authored-By line).
   Push after each group below.

Keep batches to 5–7 entries per tool call: longer outputs get cut off.

## Spec format

```json
[{"dir":"people","id":"hero-of-alexandria","image":"Hero of Alexandria",
  "fm":{"name":"Hero of Alexandria","altNames":["Ἥρων"],"type":"person",
    "subtype":"engineer","tint":"imperial","start":10,"end":70,"approx":true,
    "region":"Alexandria",
    "claims":[{"text":"…","evidence":"literary","confidence":"strong"}, …3+],
    "relations":[{"id":"alexandria","rel":"worked in"}, …2+],
    "sources":["lloyd1983","fraser1972"],
    "milestones":[{"year":1575,"kind":"printed","text":"At least six words of text."}]},
  "sections":{"summary":"12+ words…","significance":"…","body":"90+ words…"}}]
```

- **dir / type**: `people` → `person`; `places` → `site` or `city`;
  `events` → `event`, `battle` (add `combatants`, `outcome`), `war`;
  `artefacts` → `artefact` (add `material`, `museum`, `coords`);
  `texts` → `text` (add `author`, `language`, `survival`);
  `culture` → `theme`; `myth` → `myth` or `deity`.
- **Myth/deity entries** use sections `myth`, `earliestSource`, `religious`,
  `laterInterpretation` (optionally `historicalBackground`, `archaeology`)
  instead of `body`; their combined length must be 90+ words. Deities take a
  `domain` field. Copy `content/myth/ares.md` as the model.
- **Dates**: negative = BC. Use `approx: true` for circa dates, `floruit: true`
  when only active years are known, `date: "22 June 217 BC"` for exact days.
- **Post-1453 entries** (modern scholars, rediscoveries) take `modern: true`.
- **evidence**: archaeological, literary, epigraphic, numismatic, linguistic,
  tradition, consensus, debate. **confidence**: established, strong, probable,
  debated, speculative, legendary. Hedge anything uncertain — check doubtful
  facts with a web search rather than guessing.
- **milestone kinds**: written-down, edited, papyrus, manuscript, printed,
  translated, found, excavated, recovered, identified, deciphered, published,
  study, described, acquired, moved, restored, damaged. Text ≥ 6 words.
  Use them for artefacts and sites: when found, where, by whom.
- **tints** (period colours): neolithic, earlybronze, minoan, mycenaean,
  collapse, darkage, archaic, classical, macedon, alexander, hellenistic,
  ptolemaic, roman, imperial (Roman Greece, 30 BC–AD 330), byzantine.
- **image**: the Wikipedia article title whose lead image to show.
- **sources** must exist in `content/sources/`. Add new ones with
  `scripts/authoring/add-source.sh id "Author" year "Title"` (real books only).

## Style

Each page is a compact, accurate overview: who/what, **when** (clear period),
and for artefacts and sites **where and when it was found**. Summary one
sentence; significance one sentence on why it matters; body three short
paragraphs. Plain, impersonal voice. Link generously (relations) to
existing people, places and periods — e.g. period ids `classical-greece`,
`hellenistic-period`, `roman-greece`, `byzantine-empire`.

## Id gotchas

Battles are `battle-<name>` (`battle-leuctra`, `battle-chaeronea`);
`diodorus-siculus`; `demetrius-i` (Poliorcetes); `pausanias-geographer` /
`pausanias-regent`; `archelaus` is the philosopher, not the king;
`statue-of-zeus-olympia`; `acropolis-of-athens`, `agora-of-athens`;
`temple-of-olympian-zeus-athens`; `memphis-egypt`; `greek-leagues` (no
separate Achaean League entry). Islands like Chios, Kos, Naxos exist only as
map shapes (`content/geo/islands--*`), not entries — they still need entries.

## Re-run the check

`node scripts/authoring/check-coverage.mjs scripts/authoring/checklist.txt`
lists what is still missing (some hits are false positives — e.g. "Electra"
the play vs. the heroine; judge each).

## The gap list, in priority order

**Group 1 — vital (~60)**
- Athens: Theatre of Dionysus, Hephaisteion, Kerameikos, Pnyx, Stoa of Attalos, Tower of the Winds
- Mount Olympus, Mount Parnassus, Temple of Apollo at Delphi, Temple of Hera at Olympia
- Cities: Smyrna, Akragas, Taras, Sybaris, Cumae, Selinus, Segesta, Priene, Didyma, Amphipolis, Potidaea, Chalcis, Messene, Megalopolis, Tegea, Susa, Gordion, Stagira
- Islands/regions (entries, not just map shapes): Chios, Kos, Naxos, Paros, Melos, Thasos, Euboea, Ithaca, Corcyra, Thessaly, Arcadia, Laconia, Thrace, Siwa
- Science/thought: Hero of Alexandria, Eudoxus, Pytheas, Diophantus, Hippodamus, Demetrius of Phalerum
- People: Thespis, Polycrates, Periander, Pittacus, Mausolus, Artaxerxes I/II, Cyrus the Younger, Tissaphernes, Phocion, Theramenes, Conon, Iphicrates, Nero (tour of Greece, AD 67), Marcus Aurelius
- Events/institutions: Draco's laws, Cylon's coup, ostracism, Panathenaia, Dionysia, Eleusinian Mysteries, Mytilenean debate, Melian dialogue, Peace of Callias, First Peloponnesian War, Thirty Years' Peace, oligarchic coup of 411, battle of Amphipolis, Third Sacred War, Social War (357–355), Chremonidean War, battle of Sellasia

**Group 2 — myth (~45)**
Paris, Menelaus, Patroclus, Cassandra, Hecuba, Andromache, Telemachus, Circe, Calypso, Polyphemus, Cadmus, Europa, Bellerophon (with Pegasus, Chimera), Sisyphus, Tantalus, Niobe, Midas, Narcissus, Arachne, Leto, Helios, Selene, Eos, Hecate, Nemesis, Tyche, Thetis, the Dioscuri, Atlas, Typhon, the Sphinx, the Fates, the Furies, the Sirens, the Hydra, Clytemnestra, Iphigenia, Electra, Ganymede, Danaë, Leda, Semele, Adonis, Hyacinthus

**Group 3 — texts (~30)**
Plato: Phaedo, Phaedrus, Timaeus, Laws, Meno · Aristotle: Metaphysics, Physics, Rhetoric, Constitution of the Athenians · Xenophon: Hellenica, Memorabilia, Cyropaedia · Sophocles' Electra, Euripides' Hippolytus, Aristophanes' Birds and Wasps, Menander's Dyskolos · Demosthenes' On the Crown, Pericles' Funeral Oration, the Epic Cycle, Daphnis and Chloe, Theophrastus' Characters, Callimachus' Aetia, Aratus' Phaenomena, Plotinus' Enneads, Ptolemy's Geography

**Group 4 — artefacts (~25)**
Apoxyomenos, Antikythera Youth, Boxer at Rest, Apollo Belvedere, Barberini Faun, Farnese Hercules, Marathon Boy, Lady of Auxerre, Mourning Athena, Dipylon amphora, kleroterion, Vapheio cups, Prince of the Lilies, Thera (Akrotiri) frescoes, Siphnian Treasury, Aphaia pediments, Kyrenia ship, Olympias trireme reconstruction, Corinthian helmet, Mantiklos Apollo, Portland Vase

**Group 5 — lesser figures (~40)**
Lyric: Alcman, Stesichorus, Ibycus, Theognis, Mimnermus, Semonides, Hipponax, Corinna, Erinna · Drama: Phrynichus, Agathon, Cratinus, Eupolis · Historians: Ctesias, Ephorus, Theopompus, Timaeus, Hellanicus, Dionysius of Halicarnassus, Appian, Cassius Dio · Science: Pappus, Meton, Theon, Philo of Byzantium · Art: Parrhasius, Kresilas, Sophilos, Kleitias, Douris, Euthymides, Berlin/Brygos/Amasis/Andokides/Achilles Painters, Agesander · Hellenistic/later: Herodas, Lycophron, Posidippus, Leonidas of Tarentum, Asclepiades, Moschus, Bion, Longus, Chariton, Heliodorus, "Longinus" · Others: Chabrias, Archidamus II, Demaratus, Cypselus, Pheidon, Histiaeus, Datis, Gyges, Pharnabazus, Euthydemus I, Diotima

## When done

Re-run the coverage check, update this file (or delete it), and push.
