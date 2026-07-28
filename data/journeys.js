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
  { id: 'troy', order: 1, note: 'Departs for home after ten years at war.' },
  { id: 'ismarus', order: 2, note: 'Raids the Cicones — the first sign the voyage will go wrong.' },
  { id: 'lotus-eaters', order: 3, note: 'A storm drives the fleet to a land where memory of home dissolves.' },
  { id: 'cyclops-island', order: 4, note: 'Blinds Polyphemus, then makes the fatal mistake of naming himself.' },
  { id: 'aeolia', order: 5, note: "Given the winds in a bag — opened by his own crew in sight of Ithaca." },
  { id: 'laestrygonians', order: 6, note: 'Giant cannibals destroy eleven of twelve ships in one ambush.' },
  { id: 'aeaea', order: 7, note: 'Circe turns his men to swine, then becomes his guide to the dead.' },
  { id: 'nekyia-entrance', order: 8, note: 'At the edge of the world, consults the prophet Tiresias.' },
  { id: 'sirens-island', order: 9, note: 'Hears the unhearable song, bound to his own mast.' },
  { id: 'scylla-charybdis', order: 10, note: 'Chooses a certain small loss over a possible total one.' },
  { id: 'thrinacia', order: 11, note: "The crew's hunger overrides two warnings — with fatal cost." },
  { id: 'ogygia', order: 12, note: 'Held by Calypso for seven years, offered immortality, wants only home.' },
  { id: 'scheria', order: 13, note: 'Found naked on a beach by Nausicaa; finally tells his whole story.' },
  { id: 'ithaca-myth', order: 14, note: 'Returns in disguise and kills the suitors besieging his house.' },
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
