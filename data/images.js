/* ============================================================
   Hellenika — Image title overrides

   Images are resolved live from Wikipedia by title match on the
   entity's name (see js/components/images.js). Most names resolve
   automatically once a leading "The/A/An" and a trailing
   parenthetical are stripped — but a good number collide with a
   disambiguation page, a redirect to something else, or simply use
   different phrasing on Wikipedia than the entity's display name.

   This table is a hand-checked set of corrections: each entry was
   tested against the MediaWiki API to confirm it resolves to a
   real page carrying a genuinely representative lead image. Entities
   not listed here use the automatic title derivation; entities with
   no good photographic match anywhere (many battles, reforms, and
   most Bronze Age people are simply not illustrated) fall back to
   their type glyph rather than show something wrong or generic.
   ============================================================ */

export const imageOverrides = {
  // Periods
  'mycenaean-civilisation': 'Mycenaean Greece',
  'roman-conquest': 'Greece in the Roman era',
  // The Dark Age's own article picks an 18th-century antiquarian map as its
  // lead image; Lefkandi — the flagship site for the period — has a real
  // photo of the excavated ruins.
  'greek-dark-age': 'Lefkandi',

  // People
  'draco': 'Draco (legislator)',
  'peisistratus-tyranny': 'Pisistratus',

  // Cities & sites (disambiguation pages, or a modern-city article split from the ancient one)
  'akrotiri': 'Akrotiri (prehistoric city)',
  'akrotiri-frescoes': 'Akrotiri (prehistoric city)',
  'thebes': 'Thebes, Greece',
  'orchomenos': 'Orchomenus (Boeotia)',
  'corinth': 'Ancient Corinth',
  'argos': 'Argos, Peloponnese',
  'olympia': 'Olympia, Greece',
  'syracuse': 'Syracuse, Sicily',
  'cyrene': 'Cyrene, Libya',
  'tyre': 'Tyre, Lebanon',
  'issus': 'Issus (Cilicia)',
  // "Malia" alone doesn't resolve; the Cretan town's own article does.
  'malia': 'Malia, Crete',
  // Persepolis's own article carries no flagged lead image; its most
  // photographed surviving structure does.
  'persepolis': 'Gate of All Nations',
  // "Byzantion" itself resolves to a bare locator-dot map; the Theodosian
  // walls are the site's most recognisable surviving remains.
  'byzantion': 'Walls of Constantinople',
  // Knossos's own article picks a locator map as its lead image; the
  // Throne Room article has an actual photo of the ruins.
  'knossos': 'Throne Room, Knossos',

  // Battles & sieges
  'battle-chaeronea': 'Battle of Chaeronea (338 BC)',
  'siege-of-tyre': 'Siege of Tyre (332 BC)',

  // Texts
  'histories-herodotus': 'Histories (Herodotus)',
  'republic': 'Republic (Plato)',
  'histories-polybius': 'Histories (Polybius)',
  'elements-euclid': "Euclid's Elements",
  'idylls-theocritus': 'Theocritus',
  'life-of-alexander': 'Parallel Lives',
  'nestors-cup-pithekoussai': "Nestor's Cup (Pithekoussai)",
  'sappho-fragments': 'Sappho',

  // Mythology & deities
  'helen-of-troy': 'Helen of Troy',
  'nestor': 'Nestor (mythology)',
  'nike': 'Nike (mythology)',

  // Artefacts
  'cycladic-figurine': 'Cycladic art',
  'octopus-flask': 'Minoan pottery',
  'malia-bee-pendant': 'Malia Pendant',
  'linear-b-tablet': 'Linear B',
  'dendra-panoply': 'Dendra panoply',
  'medinet-habu-relief': 'Medinet Habu',
  'lefkandi-centaur': 'Lefkandi',
  'vergina-larnax': 'Vergina Sun',
  // "Athenian owl tetradrachm" itself doesn't resolve; the coinage
  // article it redirects from carries a real photo of one.
  'athenian-owl-tetradrachm': 'Athenian coinage',
  'cleopatra-tetradrachm': 'Cleopatra',

  // Events — mapped to the clearest illustrated Wikipedia article for
  // the same episode, or (where none exists) the place it happened.
  'theran-eruption': 'Minoan eruption',
  'sea-peoples-invasion': 'Sea Peoples',
  'parthenon-built': 'Parthenon',
  'delian-league': 'Delian League',
  'plague-of-athens': 'Plague of Athens',
  'sack-of-corinth': 'Ancient Corinth',
  'death-of-cleopatra': 'Death of Cleopatra',
  'greek-colonisation': 'Greek colonisation',
  'invention-coinage': 'Coin',
  'solon-reforms': 'Solon',
  'cleisthenes-reforms': 'Cleisthenes',
  'philip-assassination': 'Philip II of Macedon',
  'philip-accession': 'Philip II of Macedon',
  'founding-alexandria': 'Alexandria',
  'founding-library-alexandria': 'Library of Alexandria',
  'eratosthenes-measures-earth': 'Eratosthenes',
  'ionian-revolt': 'Ionian Revolt',
  'wars-of-diadochi': 'Wars of the Diadochi',
  'league-of-corinth': 'League of Corinth',

  // Modern archaeologists occasionally need the disambiguated form
  'ventris-decipherment': 'Linear B',

  // "Salamis" alone is a disambiguation page; the Cypriot site has its
  // own article with a real photo of the excavated gymnasium.
  'salamis-cyprus': 'Salamis, Cyprus',
  // Without the year, this title silently resolved to the famous 480 BC
  // battle near Athens instead of the 306 BC one off Cyprus.
  'battle-salamis-cyprus-306bc': 'Battle of Salamis (306 BC)',
  // "Cyprus" itself resolves to the modern Republic's flag — wrong era
  // entirely for a region entity in an ancient-history atlas. The
  // island's own history article leads with a 17th-century map instead.
  'cyprus': 'History of Cyprus',
};

/**
 * Explicit skip list: entities where a plausible-looking title exists
 * but the lead image is misleading, low quality, or the wrong subject
 * entirely. Better to show the type glyph than something wrong.
 */
export const imageSkip = new Set([
  'porus-medallion',    // resolves to an unrelated article about Quranic tradition
  'dipylon-oinochoe',   // nearest match is a different (if related) vessel
  'phaistos',           // shares a generic Crete locator map with every other Minoan site
  'zakros',              // — same map, not specific to the site
  'zakros-rhyton',       // artefact would inherit the same site-level map
  'gournia',             // no dedicated photo; falls back to the same generic map
  'early-bronze-age',    // best available image is a modern-language map, not a photo
  'chaeronea',            // resolves to a low-quality municipal diagram
  'cyclades',            // resolves to a modern Greek administrative district map;
                         // no clean photographic alternative was found
]);
