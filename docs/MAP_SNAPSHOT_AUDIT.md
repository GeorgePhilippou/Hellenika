# Historical map snapshot audit

**Audit date:** 2 August 2026
**Map range:** 3200 BC–30 BC
**Current selector:** 40 cards (32 century snapshots, 7 additional unique turning-point dates, and the 30 BC endpoint)
**Original data reviewed:** 104 territory phases, 21 routes, and the dated map entities rendered at each card

## Implementation update — 2 August 2026

The high-priority contextual work identified in this audit has now been implemented. The compiled map contains **131 territory or regional phases and 23 routes**.

- Corrected the 1500 and 800 BC labels and removed the Ptolemaic/Roman overlap at 30 BC.
- Added selectable cards for 1450, 750, 550, 525, 513, 499, 490, 479, 404, 371, 338, 325, 168, 146 and 63 BC.
- Restored routes and campaigns as a user-controlled historical-map layer; campaign-route validation now prevents authored routes from becoming unreachable through the date deck.
- Added Middle Helladic and Middle Cycladic context, Kushite/Saite and later independent Egypt, and Phoenician continuity under Achaemenid rule.
- Added schematic, explicitly qualified context for Thracian, Illyrian, Epirote, Etruscan, Carthaginian and Scythian regions and the Bosporan Kingdom.
- Added Cappadocia, Bithynia, Pontus, Galatia and Armenia to the Hellenistic landscape.
- Added the missing late-Republican Roman context in Hispania, Africa, Transalpine Gaul, Cyrenaica, Crete, Cilicia, and Bithynia-Pontus.
- Added Nearchus' naval return and Craterus' inland return force at 325 BC.
- Added evidence notes and direct source links to every newly reviewed layer, plus validation that those fields remain present.

These additions make the map substantially more suitable for explaining the geopolitical environment of Greek history. They do not convert schematic reconstructions into exact borders: older inherited layers still require the same item-by-item provenance treatment now applied to the new material.

## Purpose and limits

This audit asks two separate questions for every selectable date:

1. Does the date represent a useful historical state?
2. Does Hellenika currently contain enough appropriate data to render that state without misleading the reader?

It does **not** certify every polygon vertex as an attested frontier. Most ancient boundaries are approximate, culturally porous, disputed, or change at a finer scale than the surviving evidence permits. Cultural regions, leagues, spheres of influence, tributary relationships, and directly governed territory should remain visually distinct.

The supplied reference spreads were used as comparative editorial guidance. They are especially useful for identifying major phases and events, but their maps are also modern reconstructions and are not independent proof of exact boundaries. The Roman Empire spread depicts the empire around AD 120 and therefore should not be used as the territorial state for Hellenika's 30 BC endpoint.

### Rating key

- **Sound** — useful date and broadly appropriate current content.
- **Sound with qualification** — retain, but clarify approximation or transition.
- **Partial** — useful date, but important visible layers are absent.
- **Misleading** — the label or rendered combination currently gives the wrong impression.
- **Low-change** — historically legitimate, but duplicates the preceding territory-and-route state.

## Executive findings

### Correct immediately

1. **1500 BC — “Minoan peak” is mistimed.** Minoan palatial society reached its apogee earlier in the second millennium; by 1500 BC Mycenaean influence was increasing, followed by widespread destruction around 1450 BC. Rename this card and add a 1450 BC transition card.
2. **800 BC — “Greek colonisation” is not yet rendered.** The western route begins at 750 BC and the Black Sea route at 700 BC. Keep 800 BC as a century snapshot and move the highlighted turning point to 750 BC.
3. **30 BC — contradictory Egypt layers.** `Ptolemaic Kingdom` and `Roman Egypt` are both active because both ranges include 30 BC. End the Ptolemaic phase at 31 BC and begin Roman Egypt at 30 BC.

### Fill before adding many more cards

1. **Middle Helladic and Middle Cycladic coverage, c. 2000–1600 BC.** Mainland Greece and the Cyclades largely disappear as cultural layers between the Early Bronze layers and the Early Mycenaean layer.
2. **Egypt, 712–525 and 404–343 BC.** Kushite/Saite Egypt and the later independent dynasties are missing except for the brief Assyrian occupation. This is especially visible at 700, 600, and 400 BC.
3. **Phoenician continuity after 539 BC.** The regional Phoenician layer ends when Cyrus takes Babylon, although Phoenician city-states continued under Achaemenid and later Hellenistic overlordship. Overlord and local political identity should be layered rather than treated as mutually exclusive.
4. **Fourth-century Greece.** The Theban-hegemony layer exists for 371–362 BC but no current card can display it. The post-404 balance of power is therefore underrepresented.
5. **Hellenistic Anatolia and the Black Sea.** Pontus, Bithynia, Cappadocia, Galatia, Armenia and related kingdoms are absent, making the 200 and especially 100 BC snapshots too empty.
6. **Successor settlement around 300 BC.** The map lacks major parts of the post-Ipsus division, notably Lysimachid territory and a clearer Cassandrian/Antigonid distinction.

### Low-change cards

At the territory-and-route level, 3000, 2800, 2700, 2400 and 2200 BC repeat the preceding card. Dated sites or artefacts can still change, so these are not literally identical screens, but their political/cultural geography does not change. They may remain for a regular century rhythm; if concision is more important, they are the first candidates for removal.

### Reference-image cross-check: additional omissions

The supplied spreads expose two different problems: material that has already been authored but cannot be selected through the card deck, and material that is genuinely absent from the map data.

#### Already authored, but unreachable from every current card

| Existing route | Active dates | Reference spread | Required selector coverage |
|---|---:|---|---|
| Cyrus the Great's conquests | 550–530 BC | Rise of the Persian Empire | Add **550 BC**. |
| Cambyses II's conquest of Egypt | 529–522 BC | Rise of the Persian Empire | Add **525 BC** (or another date inside this range). |
| Darius I's Bactrian and Indus campaigns | 516–513 BC | Rise of the Persian Empire | Add **513 BC**. |
| Darius I's Scythian campaign | 513 BC | Rise of the Persian Empire | Add **513 BC**. |
| Ionian Revolt | 499–494 BC | Greece and Persia at War | Add **499 BC**. |
| First Persian invasion of Greece | 492–490 BC | Greece and Persia at War | Add **490 BC**. |

The 500 BC and 480 BC cards do not activate any of these narrow date ranges. Consequently, the current deck skips nearly the whole staged story shown in the two Persian reference spreads even though the underlying route geometry exists.

#### Genuinely missing or materially incomplete

1. **Persian expansion needs its full staged sequence.** The territories already distinguish several Achaemenid phases, but the selector should expose Cyrus, Cambyses, Darius, the Ionian Revolt, the first invasion and Xerxes as a sequence rather than jumping from 550/500 to 480 BC.
2. **The Mycenaean trade story is present but could be clearer.** The data includes separate heartland, import and export routes, broadly matching the Bronze Age reference. Review their dates and legend wording so visitors can distinguish raw-material imports from Mycenaean exports rather than seeing a single generic network.
3. **Fourth-century Greek political change remains too thin.** The city-state reference emphasizes the shifting balance after 404 BC and the growth of Macedon. Add **404 BC** and **371 BC** views, then treat 338/336 BC as the Macedonian settlement rather than allowing 431 and 400 BC to stand for the whole century.
4. **Greek and Phoenician overseas settlement should persist as a network, not as permanent territorial paint.** The current colonisation routes describe foundation movements, but the later map should retain important city/settlement markers so the wider Mediterranean Greek and Phoenician presence visible in the reference inset does not disappear after the routes end.
5. **Alexander's specialist view omits two useful campaign branches shown in the reference:** Nearchus' naval return and the separate return movement led by Craterus. These should be added only as schematic, evidence-cited routes; they are not present in the current map or journey data.
6. **Late Republican Roman coverage is geographically incomplete.** By the 100, 63, 31 and 30 BC views, the current data represents Italy, Sicily, Sardinia/Corsica, Macedonia/Greece, Asia, Syria, Cyprus and Egypt, but omits major western and southern holdings such as Roman Africa, the Spanish provinces and Caesar's Gallic conquests, as well as parts of the eastern provincial settlement. Reconstruct these as date-specific late-Republic phases before claiming a Mediterranean-wide Roman view.
7. **Do not import the AD 120 Roman reference boundary into this project.** Britain, Trajan's eastern annexations and the empire at Hadrianic maximum fall outside Hellenika's 30 BC endpoint. The spread is useful for detecting missing earlier Roman regions, but its displayed boundary belongs to a much later period.

## Date-by-date review

| Date | Current rendered emphasis | Rating | Recommendation |
|---|---|---|---|
| **3200 BC** | Early Cycladic, Helladic and Minoan cultures; Chalcolithic Cyprus; 3 dated points | Sound with qualification | Keep as the opening anchor. Call it an Early Aegean Bronze Age reconstruction and preserve schematic styling. |
| **3100 BC** | Adds Early Dynastic Egypt | Sound | Keep if the map intentionally supplies eastern Mediterranean context beyond Greece. |
| **3000 BC** | Same territory and route state as 3100 BC; 6 points | Low-change | Optional. Retain for the round-date rhythm or remove for concision. |
| **2900 BC** | Adds Early Dynastic Mesopotamia | Sound with qualification | Keep. Mesopotamian and Aegean regions are broad cultural/political approximations. |
| **2800 BC** | Same territory and route state as 2900 BC; more dated points | Low-change | Optional; no territorial change. |
| **2700 BC** | Same state as 2800 BC, immediately before the Egyptian Old Kingdom transition used by this dataset | Low-change | Keep only if century regularity is a priority. Egyptian absolute chronologies vary, so retain `c.`. |
| **2600 BC** | Old Kingdom Egypt; Early Dynastic Mesopotamia; Early Aegean cultures | Sound | Keep. This is a useful and visibly distinct state. |
| **2500 BC** | Bronze Age Cyprus replaces Chalcolithic Cyprus | Sound | Keep; the Cyprus transition gives this card a clear purpose. |
| **2400 BC** | Same territory and route state as 2500 BC | Low-change | Optional. |
| **2300 BC** | Akkadian Empire replaces Early Dynastic Mesopotamia | Sound with qualification | Keep. The imperial polygon must remain explicitly schematic. |
| **2200 BC** | Akkadian and Old Kingdom phases remain active just before their dataset endpoints | Low-change / transitional | Keep only with `c.`; the card sits close to several chronology-sensitive collapses. |
| **2100 BC** | First Intermediate Period Egypt and Ur III | Sound with qualification | Keep. Both regional cohesion and exact dates require cautious framing. |
| **2000 BC** | Early Aegean layers end at this exact boundary; Middle Kingdom Egypt and Isin–Larsa appear | Partial | Keep as a transition, but add Middle Helladic and Middle Cycladic successor layers rather than leaving the Aegean empty after this date. |
| **1900 BC** | First-palace-era Minoan Crete and trade; Middle Kingdom; Isin–Larsa | Partial | Strong Minoan date, but mainland Greece and the Cyclades are missing their Middle Bronze Age context. |
| **1800 BC** | Minoan Crete, Middle Kingdom, Isin–Larsa and Alashiya | Partial | Add Middle Helladic/Cycladic layers. The Old Babylonian phase begins shortly after this exact snapshot in the current chronology. |
| **1700 BC** | Minoan sphere, Old Babylonian kingdom and Middle Kingdom Egypt | Partial but important | This is a better highlighted card for Minoan palatial florescence than 1500 BC. Add the missing mainland/Cycladic context. |
| **1600 BC** | Early Mycenaean culture begins alongside Minoan Crete; Second Intermediate Egypt, Hittites and Mitanni | Sound with qualification | Keep as the Minoan–Mycenaean overlap. Avoid suggesting hard cultural frontiers. |
| **1500 BC** | Minoan Crete remains, early Mycenaean culture grows, New Kingdom Egypt active | **Misleading label** | Replace “Minoan peak” with “Minoan–Mycenaean transition” or “Mycenaean ascendance.” Add **1450 BC** for Mycenaean control/influence on Crete. |
| **1400 BC** | Mycenaean palace regions and Crete; Hittite, Mitanni and New Kingdom spheres | Sound | Keep. This is one of the strongest Late Bronze Age reference views. |
| **1300 BC** | Adds Middle Assyria to the Late Bronze system | Sound | Keep. Clarify that the map shows large spheres and cannot represent every vassal or contested border. |
| **1200 BC** | Mycenaean, Hittite, Egyptian and Assyrian phases remain active; collapse/Sea Peoples route appears | Sound with qualification | Rename as “Late Bronze Age crisis, c. 1200 BC.” It is a transition in progress, not a single simultaneous collapse. |
| **1100 BC** | Post-palatial Greek regions, remaining New Kingdom/Middle Assyrian contexts, Phoenician cities and Alashiya | Sound with qualification | Keep. The broad “post-palatial” regions are appropriate only as schematic cultural zones. |
| **1000 BC** | Post-palatial Greece, Phoenician cities, Third Intermediate Egypt and Cypriot kingdoms | Partial | Keep, but enrich the Aegean with Protogeometric/early Iron Age context rather than only residual post-palatial labels. |
| **900 BC** | Adds Israel, Judah and early Neo-Assyria; post-palatial Greek regions continue | Partial | Rename or replace the Greek layer with Geometric-era/polis-emergence context. |
| **800 BC** | Post-palatial regions still active; no colonisation route is active | **Misleading highlighted label** | Make this an ordinary “Early Archaic / polis formation” century card. Add **750 BC** as the colonisation turning point. |
| **700 BC** | West and Black Sea colonisation routes; Assyria, Judah, Urartu, Phoenicia and Cyprus | Partial | Keep. Add Kushite/Saite Egypt; consider Carthage/Phoenician western context without inventing precise colonial hinterlands. |
| **600 BC** | Neo-Babylonian, Median and Lydian kingdoms; Judah, Urartu, Phoenicia and Cyprus | Partial | Keep, but Saite Egypt is a major omission. Naukratis and Greek–Egyptian contact make that absence especially important for this site. |
| **500 BC** | Achaemenid Empire, Peloponnesian League and Persian Cyprus; Royal Road | Sound baseline, incomplete event sequence | Keep. Add **499 BC** or **490 BC** so the Ionian Revolt/first Persian invasion and Marathon are actually viewable. |
| **480 BC** | Achaemenid Empire, Persian Cyprus, Peloponnesian League and Xerxes' route; Persian War markers | Sound | Keep as a highlighted turning point. This is one of the best-supported current cards. |
| **431 BC** | Athenian/Delian and Peloponnesian leagues under Achaemenid eastern context | Sound | Keep. It directly represents the opening Peloponnesian War balance. |
| **400 BC** | Achaemenid Empire without Egypt; Peloponnesian League; Ten Thousand route | Partial | Keep, but add independent Egypt and a clearer post-404 Greek balance. Add **371 BC** so the existing Theban-hegemony layer is accessible. |
| **336 BC** | Macedon, League of Corinth, restored Achaemenid Empire and Persian Cyprus | Sound | Keep. It correctly establishes the two powers before Alexander's campaign. |
| **331 BC** | Achaemenid whole-empire layer overlaps Alexander's conquered Anatolia, Levant, Egypt and Mesopotamia | Sound only as a campaign transition | Keep and explicitly label “campaign in progress.” Without that note the overlap can look like double sovereignty. |
| **323 BC** | Alexander's empire reaches its maximum dataset extent; Macedon and League of Corinth also remain | Sound with qualification | Keep. Explain that this is an aggregate extent at Alexander's death, not uniformly administered territory. |
| **300 BC** | Macedonian successor zone, Ptolemaic realms, Seleucid realm and Antigonid Cyprus | Partial | Keep, but complete the post-Ipsus settlement, especially Thrace/Anatolia and the distinction among successor rulers. |
| **280 BC** | Ptolemaic and Seleucid kingdoms, Pergamon, Achaean League and Ptolemaic Cyprus | Partial | Rename “Early Hellenistic kingdoms.” Antigonid Macedon begins at 276 in the dataset, so either add **276 BC** or accept that this card falls just before its consolidation. |
| **200 BC** | Ptolemaic, Seleucid, Antigonid, Pergamene, Bactrian, Parthian, Achaean and early Roman states | Broadly sound but incomplete | Keep. Add major Anatolian kingdoms and clarify Roman expansion; avoid presenting the Seleucid/Ptolemaic polygons as stable hard borders. |
| **100 BC** | Ptolemaic Egypt, Seleucid remnant, Parthia and Roman provinces | **Major partial view** | Add Pontus, Armenia, Cappadocia, Bithynia and other major eastern kingdoms. The Mithridatic context is essential at this date. |
| **31 BC** | Ptolemaic Egypt, Roman Mediterranean provinces, Parthia and restored Ptolemaic Cyprus; Actium marker | Sound pre-outcome view | Keep. Label it as the situation at Actium, before the annexation of Egypt. |
| **30 BC** | Roman Egypt/Cyprus activate, but Ptolemaic Egypt also remains active | **Contradictory** | End Ptolemaic Egypt at 31 BC. Retain 30 BC as “Roman annexation of Egypt,” the site's endpoint. |

## Recommended card schedule changes

### Add or move now

| Date | Reason |
|---|---|
| **1450 BC** | Widespread Cretan destructions and transition to Mycenaean administration/influence; directly supported by the supplied Minoan/Mycenaean spread. |
| **750 BC** | Actual start of the western colonisation route in the dataset; move the orange “Greek colonisation” emphasis from 800 BC. |
| **550 BC** | Rise of Cyrus' empire; the current conquest route and first Achaemenid phase begin here, matching the supplied Persian expansion spread. |
| **525 BC** | Makes the already-authored Cambyses conquest of Egypt visible. |
| **513 BC** | Makes both authored Darius campaign layers visible at their common endpoint. |
| **499 BC** | Makes the already-authored Ionian Revolt visible. |
| **490 BC** | Marathon and the first Persian invasion; bridges the gap between the revolt and Xerxes' invasion. |
| **371 BC** | Makes the already-authored Theban-hegemony layer visible. |
| **146 BC** | Roman settlement of Greece after Corinth; a critical change hidden between 200 and 100 BC. |
| **63 BC** | End of the Seleucid kingdom and creation of Roman Syria; a major eastern Mediterranean transition. |

### Consider after the data is improved

- **404 BC** — end of the Peloponnesian War and beginning of the post-Athenian balance.
- **276 BC** — durable Antigonid rule in Macedon.
- **168 BC** — Roman defeat of Macedon at Pydna, if a military turning point is preferred to the administrative 146 BC card.

Adding cards without first filling the associated layers would create an appearance of precision without better historical coverage.

## Recommended implementation order

1. Correct the 1500, 800 and 30 BC problems.
2. Add 1450 and 750 BC, then the compact Persian sequence at 550, 525, 513, 499 and 490 BC; these dates expose material already present in the data.
3. Add Middle Helladic/Cycladic and missing Egyptian phases.
4. Extend Phoenician local continuity under changing imperial overlords.
5. Complete the 300, 200 and 100 BC Hellenistic political landscape.
6. Add the missing late-Republic western and southern provincial phases before adding 146 and 63 BC cards.
7. Add Nearchus and Craterus only after their route geometry and evidence notes have been sourced.
8. Visually inspect every card at Aegean, eastern Mediterranean and full-extent zooms.

## Sources used for chronological cross-checking

- The Metropolitan Museum of Art, [Minoan Crete](https://www.metmuseum.org/de/essays/minoan-crete).
- British Museum, [Greece: Minoans and Mycenaeans](https://www.britishmuseum.org/collection/galleries/greece-minoans-and-mycenaeans).
- Ashmolean Museum, [Aegean World Gallery](https://www.ashmolean.org/aegean-world-gallery).
- Cambridge University Press, [Middle Helladic Period overview (2000–1650 BC)](https://assets.cambridge.org/97810094/93123/excerpt/9781009493123_excerpt.pdf).
- The Metropolitan Museum of Art, [Egypt in the Old Kingdom](https://www.metmuseum.org/essays/egypt-in-the-old-kingdom-ca-2649-2150-b-c), [Middle Kingdom](https://www.metmuseum.org/pt/essays/egypt-in-the-middle-kingdom-2030-1640-b-c), and [New Kingdom](https://www.metmuseum.org/essays/egypt-in-the-new-kingdom-ca-1550-1070-b-c).
- The Metropolitan Museum of Art, [Assyria to Iberia at the Dawn of the Classical Age](https://resources.metmuseum.org/resources/metpublications/pdf/Assyria_to_Iberia_at_the_Dawn_of_the_Classical_Age.pdf).
- British Museum, [Greece 1050–520 BC](https://www.britishmuseum.org/collection/galleries/greece-1050-520-bc).
- The Metropolitan Museum of Art, [Greek colonization and trade](https://www.metmuseum.org/pt/essays/ancient-greek-colonization-and-trade-and-their-influence-on-greek-art) and [Classical Greece, c. 480–323 BC](https://www.metmuseum.org/ja/essays/the-art-of-classical-greece-ca-480-323-b-c).
- Encyclopaedia Iranica, [Chronology of Iranian History](https://www.iranicaonline.org/articles/chronology-of-iranian-history-part-1/) and [Cyprus in the Achaemenid Period](https://www.iranicaonline.org/articles/cyprus-achaemenid/).
- The Metropolitan Museum of Art, [Art of the Hellenistic Age](https://www.metmuseum.org/fr/essays/art-of-the-hellenistic-age-and-the-hellenistic-tradition), [Egypt in the Ptolemaic Period](https://www.metmuseum.org/de/essays/egypt-in-the-ptolemaic-period), and [Eastern Mediterranean and Syria, 1000 BC–AD 1](https://82nd-and-fifth.metmuseum.org/toah/ht/04/wae.html).

## Evidence standard for future map work

For each new or revised layer, record:

- the date or date range;
- whether it represents direct control, a tributary relationship, alliance, cultural distribution, or disputed influence;
- at least one map/atlas source and one chronological source where possible;
- a confidence value (`attested`, `schematic`, `contested`, or `brief-control`);
- an explanation of what the polygon deliberately does **not** claim.

This prevents a clean visual from being mistaken for certainty that the ancient evidence cannot support.
