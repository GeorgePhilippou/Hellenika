# Historical map data audit

Audited 28 July 2026. The comparison target was the behaviour of a historical
atlas—dated, labelled regions that change through time—not the modern borders or
exact geometry of any particular reference map.

## What the map claims

The geometry in `data/geo.js` is schematic and uses four distinct territory
types:

- `polity`: political control, drawn with a solid border;
- `league`: alliance or hegemony, drawn with a long-dashed border;
- `regional`: several powers or an approximate regional reconstruction, also
  drawn with a long-dashed border;
- `culture`: an archaeological material-culture distribution, drawn with a
  shorter dashed border.

These categories matter. Early Cycladic and Early Helladic distributions are
not kingdoms; the Mycenaean world was not one documented unified state; and the
post-palatial Greek mainland should not be filled as a single Dark Age polity.
Map labels and the legend now communicate those differences.

## Chronology corrections

- Egypt is divided into Early Dynastic (c. 3100–2687 BC) and Old Kingdom
  (c. 2686–2181 BC) phases instead of labelling 3200–2180 BC “Old Kingdom”.
  First Intermediate, Middle Kingdom, Second Intermediate, New Kingdom and
  Third Intermediate phases prevent later Egyptian fragmentation from being
  mistaken for absence.
- Early Dynastic southern Mesopotamia and the Akkadian Empire are separate.
  The Akkadian phase begins in 2334 BC rather than treating “Sumer & Akkad” as
  one empire from 2900 BC. Ur III, Isin-Larsa and Old Babylonian phases continue
  the regional sequence without turning every phase into one continuous empire.
- Early Hittite, Mitanni and Middle Assyrian regions restore major Middle and
  Late Bronze Age powers omitted by the initial patch.
- Israel and Judah are separate kingdoms rather than one combined territory.
- Neo-Assyrian control grows through core, recovery, expansion and peak phases,
  briefly reaches Egypt, and then contracts.
- Neo-Babylonian and Median power are represented after Assyria.
- Achaemenid control grows under Cyrus, Cambyses and Darius; Egypt disappears
  from the Persian outline during its independence and returns after
  reconquest.
- The Wars of the Successors are shown as contested regional control, not as a
  blank map or a still-unified Alexandrian empire.
- Ptolemaic, Seleucid and Parthian outlines change at major documented losses,
  recoveries and annexations.
- Roman Sicily and Sardinia/Corsica are separate shapes. The former combined
  label previously had geometry for Sicily only.
- Cyprus now has its own continuous sequence rather than remaining politically
  blank beneath nearby continental empires. The sequence distinguishes
  Chalcolithic and Bronze Age cultures; debated Alashiyan political geography;
  the autonomous city-kingdoms; indirect Assyrian, Saite Egyptian and
  Achaemenid suzerainty; Alexander and the Successor struggle; direct
  Antigonid and Ptolemaic administration; Roman annexation in 58 BC; and the
  documented Ptolemaic restoration from 48 to 30 BC. Dashed borders mark local
  kingdoms under an imperial overlord rather than direct provincial rule.

Political transitions use a two-year visual fade. Culture zones can dissolve
more gradually, but defeated empires no longer remain prominently visible for
twelve years after their end.

## Route corrections

Trade and colonisation data can contain `paths`, a set of independent
connections. It no longer has to masquerade as one ordered tour.

- Melian obsidian is a distribution network radiating from Melos.
- Minoan exchange is a set of connections from Crete.
- Western and Black Sea colonisation are multiple foundation connections from
  different Greek hubs.
- The Sea Peoples line is explicitly a debated reconstruction and is drawn as
  a dotted corridor, not a known itinerary.
- Alexander's outbound route, Siwa detour and return march accumulate through
  the campaign. Completed legs remain visible but muted.
- The Ten Thousand begins at Sardis, continues to Cunaxa, and then follows the
  retreat to the Black Sea and Byzantion.

Only ordered campaigns receive arrowheads. Roads and networks do not imply a
single direction of travel.

## Principal chronology references

- Metropolitan Museum of Art, [Egypt in the Old Kingdom](https://www.metmuseum.org/essays/egypt-in-the-old-kingdom-ca-2649-2150-b-c)
- British Museum, [Akkadian](https://www.britishmuseum.org/collection/term/x13587)
- Metropolitan Museum of Art, [Assyria, 1365–609 B.C.](https://www.metmuseum.org/essays/assyria-1365-609-b-c)
- Metropolitan Museum of Art, [The Achaemenid Persian Empire](https://www.metmuseum.org/essays/the-achaemenid-persian-empire-550-330-b-c)
- Metropolitan Museum of Art, [The Seleucid Empire](https://www.metmuseum.org/essays/the-seleucid-empire-323-64-b-c)
- Cambridge University Press, [Migration Myths and the End of the Bronze Age](https://www.cambridge.org/core/elements/abs/migration-myths-and-the-end-of-the-bronze-age-in-the-eastern-mediterranean/F0567FCB3FE75A0C83D326015C4C56DC)
- Metropolitan Museum of Art, [Prehistoric Cypriot Art and Culture](https://www.metmuseum.org/essays/prehistoric-cypriot-art-and-culture)
- Metropolitan Museum of Art, [Hellenistic and Roman Cyprus](https://www.metmuseum.org/essays/hellenistic-and-roman-cyprus)
- Christian Körner, [The Cypriot Kings under Assyrian and Persian Rule](https://www.cambridge.org/core/books/abs/cyprus-crete-and-the-aegean-islands-in-antiquity/cypriot-kings-under-assyrian-and-persian-rule-eighth-to-fourth-century-bc-centre-and-periphery-in-a-relationship-of-suzerainty/DB18D6810954B50D0C6ED95256CF8AF0)

## Limits that remain

- Rings are hand-generalised atlas geometry, not GIS reconstructions.
- Exact frontiers are often unknowable, especially for culture zones, leagues,
  tributary relationships and early Iron Age states.
- An active territory in every year is only a software sanity check. It is not
  a claim that every part of the map has known political control.
- Several long-lived states are phased at major turning points rather than
  every reign or campaign.
- The map extent prioritises the Greek world and the empires that directly
  shaped it; it is not a complete political atlas of all Eurasia and Africa.

Run the structural audit with:

```bash
node scripts/validate-geo.mjs
```
