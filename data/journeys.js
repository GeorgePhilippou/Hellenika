/* ============================================================
   Hellenika — Journey map curation

   "Which entities, in what order, with what one-line caption" for
   the two narrative journey-map modes. Deliberately NOT merged into
   db.js's entity graph — this is presentation-layer sequencing, not
   content. All ids referenced here must already exist as real
   entities (odyssey-places.js for Odysseus; the core dataset for
   Alexander) so every stop opens a full, evidence-tagged profile.
   ============================================================ */

export const odysseyJourney = [
  {
    id: 'troy', order: 1, label: 'Troy', curve: 0,
    note: 'Departs for home after ten years at war.',
    connection: 'The narrative voyage begins on the coast of the Troad after Troy has fallen. Odysseus sails west with twelve ships, expecting a comparatively short return to Ithaca.',
  },
  {
    id: 'ismarus', order: 2, label: 'Ismarus', curve: -0.08,
    via: [[39.7, 25.8], [40.1, 25.15], [40.6, 25.2]],
    note: 'Raids the Cicones — the first sign the voyage will go wrong.',
    connection: 'The fleet follows the northern Aegean coast from Troy to the territory of the Cicones. This is the last leg that can be placed on a plausible real-world course with much confidence.',
  },
  {
    id: 'lotus-eaters', order: 3, label: 'Lotus-Eaters', curve: 0.06,
    via: [[39.1, 25.25], [36.5, 25.0], [34.4, 22.4], [33.5, 17.7], [33.45, 13.5]],
    note: 'A storm drives the fleet to a land where memory of home dissolves.',
    connection: 'After leaving Ismarus, Odysseus attempts to round Cape Malea for Ithaca. A north wind drives the ships south for nine days; the line therefore sweeps through the Aegean, below Crete, and west across open water rather than crossing mainland Greece.',
  },
  {
    id: 'cyclops-island', order: 4, label: 'Cyclopes', curve: -0.06,
    via: [[34.0, 12.2], [34.8, 13.8], [36.2, 15.0]],
    note: 'Blinds Polyphemus, then makes the fatal mistake of naming himself.',
    connection: 'The poem gives no bearings between the Lotus-Eaters and the Cyclopes. The reference reconstruction follows the later western-Mediterranean tradition eastward toward Sicily.',
  },
  {
    id: 'aeolia', order: 5, label: 'Aeolia', curve: -0.08,
    via: [[37.95, 15.65]],
    note: "Given the winds in a bag — opened by his own crew in sight of Ithaca.",
    connection: 'After escaping Polyphemus, the surviving fleet sails north to the floating island of Aeolus. Its placement near the Aeolian Islands is traditional, not a coordinate supplied by Homer.',
  },
  {
    id: 'laestrygonians', order: 6, label: 'Laestrygonians', curve: 0.06,
    via: [[39.3, 14.65], [40.35, 13.9]],
    note: 'Giant cannibals destroy eleven of twelve ships in one ambush.',
    connection: 'The winds first carry the fleet almost to Ithaca, but the crew opens Aeolus’s bag and is blown back. After Aeolus refuses further help, the ships sail onward to the enclosed harbour of the Laestrygonians.',
  },
  {
    id: 'aeaea', order: 7, label: 'Circe', curve: 0.08,
    via: [[40.9, 13.3]],
    note: 'Circe turns his men to swine, then becomes his guide to the dead.',
    connection: 'Only Odysseus’s ship escapes the Laestrygonian harbour. It sails south to Aeaea, where the crew remains with Circe for a year before she directs them toward the dead.',
  },
  {
    id: 'nekyia-entrance', order: 8, label: 'Land of the Dead', curve: -0.08,
    mapCoords: [42.45, 8.35],
    mapPlacement: 'Diagrammatic western Mediterranean, following the reference map',
    via: [[41.55, 11.55], [42.05, 9.65]],
    note: 'At the edge of the world, consults the prophet Tiresias.',
    connection: 'Circe instructs Odysseus to cross Ocean to a land of darkness at the world’s edge. The north-western placement follows the supplied narrative map; it is a diagrammatic location, not an archaeological claim.',
  },
  {
    id: 'sirens-island', order: 9, label: 'Sirens', curve: 0.05,
    via: [[42.0, 10.0], [41.22, 13.06], [40.9, 13.8]],
    note: 'Returns to Circe, then hears the Sirens while bound to his own mast.',
    connection: 'After speaking with Tiresias, Odysseus returns to Circe to bury Elpenor and receive detailed sailing instructions. Only then does he pass the Sirens, so the line deliberately returns to Aeaea before continuing south.',
  },
  {
    id: 'scylla-charybdis', order: 10, label: 'Scylla & Charybdis', curve: -0.06,
    via: [[39.6, 15.15]],
    note: 'Chooses a certain small loss over a possible total one.',
    connection: 'The Sirens are followed immediately by the Wandering Rocks and the narrow passage between Scylla and Charybdis. The traditional map carries the ship south along the Italian coast toward the Strait of Messina.',
  },
  {
    id: 'thrinacia', order: 11, label: 'Cattle of the Sun', curve: 0.06,
    via: [[37.95, 15.55]],
    note: "The crew's hunger overrides two warnings — with fatal cost.",
    connection: 'Once through the strait, the crew lands on Thrinacia despite the warnings of both Tiresias and Circe. The reference tradition places the island close to Sicily.',
  },
  {
    id: 'ogygia', order: 12, label: 'Calypso', curve: 0.06,
    mapCoords: [36.25, 12.55],
    mapPlacement: 'Diagrammatic south-west of Sicily, following the reference map',
    via: [[36.75, 15.05], [35.8, 14.1]],
    note: 'Held by Calypso for seven years, offered immortality, wants only home.',
    connection: 'Zeus destroys the ship after the cattle are killed. Odysseus alone survives, drifting back past Charybdis and then across the sea until he reaches Calypso’s island.',
  },
  {
    id: 'scheria', order: 13, label: 'Phaeacia', curve: -0.05,
    via: [[34.8, 14.4], [35.2, 17.2], [37.1, 19.0], [38.7, 19.35]],
    note: 'Found naked on a beach by Nausicaa; finally tells his whole story.',
    connection: 'After seven years, Calypso releases Odysseus on a raft. Poseidon wrecks it, but he swims ashore among the Phaeacians; the sweeping eastern leg represents this final solitary crossing.',
  },
  {
    id: 'ithaca-myth', order: 14, label: 'Ithaca', curve: 0.05,
    via: [[39.0, 20.0]],
    note: 'Returns in disguise and kills the suitors besieging his house.',
    connection: 'The Phaeacians carry the sleeping Odysseus home in one of their ships and leave him on Ithaca with his gifts. This final leg is short and geographically intelligible, unlike most of the fantastic wanderings.',
  },
];

export const alexanderJourney = [
  { id: 'pella', order: 1, note: '336 BC — becomes king of Macedon at twenty.' },
  { id: 'troy', order: 2, note: '334 BC — visits Achilles\' tomb before the campaign proper begins.' },
  { id: 'battle-granicus', order: 3, note: '334 BC — first victory on Asian soil.' },
  { id: 'battle-issus', order: 4, note: '333 BC — Darius III flees the field.' },
  { id: 'siege-of-tyre', order: 5, note: '332 BC — takes an island city by building a causeway to it.' },
  { id: 'founding-alexandria', order: 6, note: '331 BC — founds the city that will outlast his empire.' },
  { id: 'battle-gaugamela', order: 7, note: '331 BC — the Achaemenid Empire\'s field army is broken.' },
  { id: 'babylon', order: 8, note: '331 BC — enters the city peacefully as its new master.' },
  { id: 'persepolis', order: 9, note: '330 BC — burns the Achaemenid ceremonial capital.' },
  { id: 'battle-hydaspes', order: 10, note: '326 BC — defeats Porus and his war elephants in monsoon rain.' },
  { id: 'babylon', order: 11, note: '323 BC — dies here after eleven days of fever, aged 32.' },
];

/** The land Alexander took, drawn as a static backdrop behind his path. */
export const alexanderTerritoryIds = [
  't-alex-anatolia', 't-alex-levant', 't-alex-mesopotamia', 't-alex-bactria', 't-alex-indus',
];
