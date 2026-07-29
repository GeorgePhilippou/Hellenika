/* ============================================================
   Hellenika — Geography

   Rendering strategy: the canvas is filled with land, then SEAS
   are painted on top, then ISLANDS are painted back as land.
   This needs far fewer coordinates than outlining every landmass
   and keeps the Mediterranean shape recognisable at every zoom.

   All coordinates are [longitude, latitude] in degrees.
   Outlines are deliberately generalised — this is a schematic
   historical atlas, not a survey map.
   ============================================================ */

/* ---------- Map extent ---------- */
export const EXTENT = { lonMin: -8, lonMax: 78, latMin: 20, latMax: 50 };

/* ---------- Seas ---------- */
export const seas = [
  {
    id: 'mediterranean',
    name: 'Mediterranean Sea',
    ring: [
      // Iberian & Gallic coast, west to east
      [-5.6, 36.0], [-4.4, 36.7], [-2.2, 36.8], [-0.6, 37.6], [0.2, 38.9],
      [0.2, 39.9], [0.9, 41.0], [2.2, 41.3], [3.3, 41.9], [4.2, 43.1],
      [5.4, 43.2], [6.9, 43.4], [7.7, 43.8], [8.8, 44.4], [9.9, 44.0],
      // Italian west coast down to the toe
      [10.1, 43.5], [10.5, 43.0], [11.2, 42.4], [11.8, 42.1], [12.2, 41.7],
      [13.1, 41.2], [13.8, 41.1], [14.3, 40.8], [14.9, 40.6], [15.3, 40.0],
      [15.9, 39.6], [16.1, 38.9], [15.65, 38.25],
      // Around the boot and up the Adriatic
      [16.6, 38.5], [17.15, 39.0], [17.2, 39.8], [16.9, 40.4], [17.5, 40.3],
      [18.05, 40.05], [18.52, 40.15], [17.95, 40.68], [16.85, 41.15],
      [15.9, 41.95], [14.9, 42.1], [13.6, 43.0], [12.9, 44.0], [12.4, 44.7],
      [13.0, 45.4], [13.65, 45.45],
      // Dalmatian coast south
      [14.5, 45.0], [15.2, 44.2], [16.2, 43.4], [17.3, 42.9], [18.5, 42.4],
      [19.3, 41.8], [19.45, 41.2], [19.0, 40.4], [19.9, 39.8],
      // Western Greece
      [20.75, 39.0], [20.85, 38.65], [21.15, 38.35], [21.4, 38.2],
      [21.35, 37.95], [21.6, 37.6], [21.3, 37.4], [21.7, 37.05], [21.9, 36.83],
      // Peloponnesian fingers
      [22.15, 36.95], [22.4, 36.42], [22.65, 36.82], [22.9, 36.4],
      [23.2, 36.8], [23.05, 37.35], [23.15, 37.55], [23.45, 37.5],
      [23.2, 37.78], [23.0, 37.95],
      // Attica, Euboea's outer flank, Thessaly
      [23.6, 38.0], [24.03, 37.63], [24.15, 38.05], [24.6, 38.2],
      [23.5, 39.0], [23.35, 39.2], [22.95, 39.4], [22.7, 39.9],
      // Thermaic gulf & Chalcidice
      [22.6, 40.45], [22.85, 40.5], [23.35, 40.25], [23.75, 40.25],
      [24.0, 40.1], [23.9, 40.5], [24.35, 40.75], [25.1, 40.95],
      [25.9, 40.85], [26.15, 40.6],
      // Dardanelles mouth (Marmara handled separately)
      [26.2, 40.05], [26.7, 39.55], [26.45, 39.0], [27.0, 38.7],
      // Anatolian west coast
      [26.7, 38.4], [27.15, 38.05], [27.3, 37.7], [27.8, 37.65],
      [27.35, 37.0], [28.2, 36.7], [29.1, 36.2], [30.0, 36.35],
      [30.6, 36.25], [31.4, 36.8], [32.3, 36.3], [33.6, 36.2],
      [34.6, 36.75], [35.6, 36.6], [36.0, 36.2],
      // Levantine coast south
      [35.9, 35.9], [35.6, 35.0], [35.2, 34.6], [35.0, 33.9], [34.9, 33.2],
      [34.75, 32.5], [34.5, 31.6], [34.25, 31.2],
      // Egyptian coast west
      [33.7, 31.1], [32.3, 31.25], [31.1, 31.6], [30.4, 31.5], [29.9, 31.2],
      [29.0, 30.85], [28.0, 30.9], [27.0, 31.2], [25.2, 31.5],
      // Cyrenaica bulge
      [24.5, 32.2], [23.1, 32.6], [22.0, 32.9], [21.0, 32.8], [20.1, 32.2],
      [19.3, 30.9], [19.0, 30.3], [18.0, 30.35], [17.0, 31.0], [15.5, 31.4],
      // Tripolitania & Tunisia
      [13.5, 32.85], [12.0, 32.9], [11.1, 33.5], [10.6, 34.0], [10.1, 34.6],
      [11.1, 35.25], [10.9, 36.2], [10.3, 36.85], [9.2, 37.3], [8.2, 36.95],
      // Algerian & Moroccan coast back to Gibraltar
      [6.0, 37.0], [3.1, 36.9], [0.2, 36.0], [-2.0, 35.4], [-3.9, 35.3],
      [-5.35, 35.9],
    ],
  },
  {
    id: 'corinthian-gulf', name: 'Corinthian Gulf',
    ring: [[21.45, 38.18], [22.0, 38.32], [22.6, 38.36], [23.05, 38.28],
           [23.1, 38.02], [22.6, 38.13], [22.0, 38.18], [21.5, 38.06]],
  },
  {
    id: 'euboean-gulf', name: 'Euboean Gulf',
    ring: [[23.05, 38.3], [23.35, 38.55], [23.9, 38.75], [23.4, 39.05],
           [23.15, 38.85], [22.85, 38.68], [22.6, 38.85], [22.55, 38.6],
           [23.0, 38.5]],
  },
  {
    id: 'ambracian-gulf', name: 'Ambracian Gulf',
    ring: [[20.75, 38.95], [21.2, 39.05], [21.25, 38.88], [20.8, 38.85]],
  },
  {
    id: 'saronic-gulf', name: 'Saronic Gulf',
    ring: [[23.0, 37.95], [23.55, 38.0], [23.6, 37.78], [23.35, 37.55],
           [23.1, 37.6], [22.95, 37.8]],
  },
  {
    id: 'marmara', name: 'Sea of Marmara',
    ring: [[26.2, 40.15], [27.0, 40.55], [28.2, 40.45], [29.3, 40.75],
           [29.9, 40.75], [29.3, 40.35], [28.0, 40.3], [27.0, 40.3],
           [26.5, 40.05]],
  },
  {
    id: 'black-sea', name: 'Black Sea',
    ring: [[28.0, 41.2], [29.2, 41.25], [31.5, 41.3], [34.0, 42.0],
           [36.5, 41.3], [38.5, 41.1], [41.0, 41.4], [41.7, 42.2],
           [40.5, 43.4], [38.0, 44.3], [36.6, 45.3], [34.0, 46.0],
           [31.5, 46.6], [30.5, 46.5], [29.7, 45.2], [28.7, 44.0],
           [28.6, 43.0], [27.9, 42.0]],
  },
  {
    id: 'caspian', name: 'Caspian Sea',
    ring: [[47.0, 37.5], [49.5, 37.4], [51.0, 36.6], [53.5, 36.8],
           [54.0, 38.0], [53.2, 39.5], [51.5, 41.0], [51.0, 43.0],
           [50.5, 44.5], [48.5, 46.5], [47.5, 45.5], [48.5, 43.5],
           [49.5, 41.0], [48.5, 39.5]],
  },
  {
    id: 'red-sea', name: 'Red Sea',
    ring: [[32.6, 29.9], [34.5, 28.2], [35.5, 27.5], [38.0, 24.0],
           [40.0, 21.0], [42.0, 18.0], [43.5, 14.0], [43.0, 13.5],
           [40.5, 16.5], [38.0, 20.0], [36.5, 23.0], [34.7, 26.5],
           [33.5, 28.0], [32.4, 29.5]],
  },
  {
    id: 'persian-gulf', name: 'Persian Gulf',
    ring: [[47.8, 30.1], [49.5, 29.5], [51.0, 28.0], [53.5, 26.8],
           [56.4, 26.9], [57.0, 25.6], [54.5, 24.3], [51.5, 24.4],
           [50.0, 26.5], [48.5, 28.5], [47.5, 29.6]],
  },
  {
    id: 'atlantic', name: 'Atlantic Ocean',
    ring: [[-8.5, 35.0], [-6.0, 36.0], [-6.3, 37.2], [-8.9, 37.0],
           [-9.5, 39.0], [-9.2, 41.0], [-8.9, 43.5], [-8.5, 50.0],
           [-12.0, 50.0], [-12.0, 35.0]],
  },
];

const CYPRUS_RING = [
  [32.3, 35.1], [33.5, 35.4], [34.6, 35.7], [34.05, 34.95], [33.0, 34.6],
  [32.3, 34.75],
];

/* ---------- Islands (painted back as land over the seas) ---------- */
export const islands = [
  { id: 'crete', name: 'Crete', ring: [
    [23.52, 35.25], [24.05, 35.6], [24.75, 35.5], [25.2, 35.35], [25.75, 35.4],
    [26.32, 35.32], [26.28, 35.1], [25.7, 35.0], [25.1, 34.93], [24.7, 34.93],
    [24.1, 35.1], [23.6, 35.15]] },
  { id: 'euboea', name: 'Euboea', ring: [
    [23.0, 38.5], [23.4, 38.65], [23.85, 38.75], [24.35, 38.6], [24.6, 38.25],
    [24.2, 38.08], [23.6, 38.35], [23.1, 38.36]] },
  { id: 'lesbos', name: 'Lesbos', ring: [
    [25.9, 39.2], [26.05, 39.4], [26.6, 39.42], [26.62, 39.05], [26.25, 38.95],
    [25.95, 39.05]] },
  { id: 'chios', name: 'Chios', ring: [
    [25.9, 38.62], [26.15, 38.6], [26.22, 38.2], [25.98, 38.22]] },
  { id: 'samos', name: 'Samos', ring: [
    [26.6, 37.82], [27.1, 37.8], [27.05, 37.65], [26.6, 37.68]] },
  { id: 'rhodes', name: 'Rhodes', ring: [
    [27.72, 36.45], [28.25, 36.42], [28.25, 36.05], [27.95, 35.87],
    [27.72, 36.2]] },
  { id: 'cyprus', name: 'Cyprus', ring: CYPRUS_RING },
  { id: 'naxos', name: 'Naxos', ring: [
    [25.35, 37.15], [25.6, 37.15], [25.6, 36.9], [25.35, 36.9]] },
  { id: 'paros', name: 'Paros', ring: [
    [25.0, 37.15], [25.25, 37.13], [25.25, 36.95], [25.0, 36.97]] },
  { id: 'delos-mykonos', name: 'Delos & Mykonos', ring: [
    [25.25, 37.48], [25.5, 37.5], [25.5, 37.35], [25.25, 37.35]] },
  { id: 'thera', name: 'Thera', ring: [
    [25.32, 36.47], [25.5, 36.47], [25.48, 36.32], [25.35, 36.33]] },
  { id: 'melos', name: 'Melos', ring: [
    [24.3, 36.78], [24.55, 36.78], [24.55, 36.66], [24.3, 36.66]] },
  { id: 'sicily', name: 'Sicily', ring: [
    [12.45, 37.8], [13.4, 38.2], [14.5, 38.05], [15.15, 38.3], [15.6, 38.25],
    [15.15, 37.5], [15.3, 37.0], [14.5, 36.72], [12.6, 37.6]] },
  { id: 'sardinia', name: 'Sardinia', ring: [
    [8.2, 41.2], [9.2, 41.25], [9.6, 40.9], [9.7, 40.0], [9.5, 39.2],
    [9.0, 39.1], [8.4, 39.1], [8.4, 40.0], [8.15, 40.6]] },
  { id: 'corsica', name: 'Corsica', ring: [
    [8.6, 42.9], [9.4, 43.0], [9.55, 42.2], [9.4, 41.4], [8.8, 41.4],
    [8.55, 42.2]] },
  { id: 'corfu', name: 'Corfu', ring: [
    [19.65, 39.8], [19.95, 39.8], [20.1, 39.4], [19.9, 39.35], [19.7, 39.6]] },
  { id: 'kefalonia', name: 'Kefalonia & Ithaca', ring: [
    [20.35, 38.5], [20.75, 38.5], [20.85, 38.2], [20.5, 38.05], [20.3, 38.25]] },
  { id: 'zakynthos', name: 'Zakynthos', ring: [
    [20.6, 37.9], [20.95, 37.85], [20.9, 37.7], [20.65, 37.72]] },
  { id: 'kos', name: 'Kos', ring: [
    [26.9, 36.9], [27.3, 36.9], [27.35, 36.75], [26.95, 36.78]] },
  { id: 'samothrace', name: 'Samothrace', ring: [
    [25.4, 40.5], [25.65, 40.52], [25.65, 40.4], [25.4, 40.4]] },
  { id: 'lemnos', name: 'Lemnos', ring: [
    [25.0, 40.0], [25.35, 40.05], [25.4, 39.85], [25.05, 39.85]] },
];

/* ---------- Rivers (context lines) ---------- */
export const rivers = [
  { id: 'nile', name: 'Nile', path: [[31.1, 31.5], [31.2, 30.5], [31.3, 29.5], [32.0, 28.0], [32.8, 26.5], [32.6, 25.0], [32.9, 24.0], [33.0, 22.0]] },
  { id: 'euphrates', name: 'Euphrates', path: [[38.3, 38.5], [38.0, 37.0], [39.5, 36.0], [41.0, 35.0], [42.5, 34.0], [44.0, 32.8], [45.5, 31.5], [47.5, 30.5]] },
  { id: 'tigris', name: 'Tigris', path: [[41.0, 37.5], [42.5, 36.5], [43.5, 35.5], [44.4, 34.0], [45.5, 32.5], [46.5, 31.5], [47.5, 30.6]] },
  { id: 'indus', name: 'Indus', path: [[73.0, 34.5], [72.5, 33.0], [71.5, 31.5], [70.8, 30.0], [69.5, 28.0], [68.5, 26.0], [67.8, 24.5]] },
  { id: 'danube', name: 'Danube', path: [[19.0, 47.5], [20.5, 45.0], [22.5, 44.0], [25.0, 43.8], [27.5, 44.0], [29.7, 45.2]] },
  { id: 'oxus', name: 'Oxus (Amu Darya)', path: [[71.5, 37.5], [68.5, 37.2], [66.0, 37.5], [63.0, 39.0], [61.0, 41.0], [59.5, 42.5]] },
];

/* ============================================================
   Territories — political control and archaeological regions over time.
   `from`/`to` are signed years. A territory renders whenever the
   current year falls inside its window, so an empire assembled
   from several dated pieces visibly grows as the slider moves.

   `kind` controls the visual claim being made:
   - polity: political control (solid border)
   - league: an alliance/hegemony, not direct administration
   - culture: an archaeological distribution, not a state
   - regional: several competing powers represented schematically

   Rings are deliberately generalised. They should be read as dated
   atlas summaries, never as surveyed frontiers.
   ============================================================ */
export const territories = [
  /* ---------- Early Bronze Age ----------
     Aegean entries are archaeological culture zones. Egypt and
     Mesopotamia are split into their historically distinct phases. */
  {
    id: 't-eb-cycladic-west', name: 'Early Cycladic culture', label: 'Cycladic',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -2000, opacity: 0.45,
    ring: [[24.0, 37.15], [24.75, 37.2], [24.75, 36.45], [24.05, 36.45]],
  },
  {
    id: 't-eb-cycladic-central', name: 'Early Cycladic culture', label: 'Cycladic',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -2000, opacity: 0.45,
    ring: [[24.75, 37.45], [25.75, 37.45], [25.8, 36.65], [24.8, 36.55]],
  },
  {
    id: 't-eb-cycladic-north', name: 'Early Cycladic culture', label: 'Cycladic',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -2000, opacity: 0.45,
    ring: [[24.55, 38.1], [25.75, 38.05], [25.75, 37.35], [24.65, 37.35]],
  },
  {
    id: 't-eb-helladic', name: 'Early Helladic culture', label: 'Early Helladic',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -2000, opacity: 0.4,
    ring: [[20.7, 39.3], [22.4, 40.3], [23.9, 40.4], [24.2, 39.6], [23.9, 38.2],
           [24.1, 37.6], [23.2, 36.5], [22.4, 36.4], [21.6, 37.0], [21.2, 38.3],
           [20.6, 38.9]],
  },
  {
    id: 't-eb-minoan', name: 'Early Minoan culture', label: 'Early Minoan',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -1900, opacity: 0.45,
    ring: [[23.52, 35.25], [24.05, 35.6], [24.75, 35.5], [25.2, 35.35], [25.75, 35.4],
           [26.32, 35.32], [26.28, 35.1], [25.7, 35.0], [25.1, 34.93], [24.7, 34.93],
           [24.1, 35.1], [23.6, 35.15]],
  },
  {
    id: 't-eb-egypt-early-dynastic', name: 'Early Dynastic Egypt', label: 'Early Dynastic Egypt',
    kind: 'polity', tint: 'earlybronze', from: -3100, to: -2687,
    ring: [[29.5, 31.3], [32.0, 31.4], [32.8, 30.0], [33.2, 24.0], [32.0, 22.0],
           [30.5, 22.5], [30.0, 27.0], [28.8, 30.8]],
  },
  {
    id: 't-eb-egypt-old-kingdom', name: 'Old Kingdom Egypt', label: 'Old Kingdom Egypt',
    kind: 'polity', tint: 'earlybronze', from: -2686, to: -2181,
    ring: [[29.5, 31.3], [32.0, 31.4], [32.8, 30.0], [33.2, 24.0], [32.0, 22.0],
           [30.5, 22.5], [30.0, 27.0], [28.8, 30.8]],
  },
  {
    id: 't-eb-egypt-first-intermediate', name: 'First Intermediate Period Egypt',
    label: 'Divided Egypt', kind: 'regional', certainty: 'schematic',
    tint: 'earlybronze', from: -2180, to: -2031, opacity: 0.46,
    ring: [[29.5, 31.3], [32.0, 31.4], [32.8, 30.0], [33.0, 25.0], [31.0, 24.5],
           [29.8, 28.0]],
  },
  {
    id: 't-eb-mesopotamia-early-dynastic', name: 'Early Dynastic Mesopotamia',
    label: 'Early Dynastic cities', kind: 'regional', certainty: 'schematic',
    tint: 'earlybronze', from: -2900, to: -2350, opacity: 0.48,
    ring: [[43.0, 34.2], [45.8, 34.0], [48.0, 31.2], [47.0, 29.4], [44.2, 30.2],
           [42.6, 32.3]],
  },
  {
    id: 't-eb-akkadian', name: 'Akkadian Empire', label: 'Akkadian Empire',
    kind: 'polity', tint: 'earlybronze', from: -2334, to: -2190,
    ring: [[37.5, 37.0], [42.0, 37.5], [45.5, 35.0], [48.0, 31.0], [46.0, 29.2],
           [42.0, 31.0], [38.0, 33.5]],
  },
  {
    id: 't-eb-ur-third', name: 'Third Dynasty of Ur', label: 'Ur III',
    kind: 'polity', certainty: 'schematic', tint: 'earlybronze', from: -2112, to: -2004,
    ring: [[42.0, 35.0], [46.0, 34.5], [48.0, 31.0], [46.0, 29.3], [43.0, 31.0]],
  },

  /* ---------- Bronze Age ---------- */
  {
    id: 't-egypt-middle-kingdom', name: 'Middle Kingdom Egypt', label: 'Middle Kingdom Egypt',
    kind: 'polity', tint: 'minoan', from: -2030, to: -1650,
    ring: [[29.5, 31.3], [32.0, 31.4], [32.8, 30.0], [33.2, 24.0], [32.0, 22.0],
           [30.5, 22.5], [30.0, 27.0], [28.8, 30.8]],
  },
  {
    id: 't-egypt-second-intermediate', name: 'Second Intermediate Period Egypt',
    label: 'Divided Egypt', kind: 'regional', certainty: 'schematic',
    tint: 'minoan', from: -1649, to: -1550, opacity: 0.48,
    ring: [[29.5, 31.3], [32.0, 31.4], [32.8, 30.0], [33.0, 25.5], [31.0, 25.0],
           [29.8, 28.0]],
  },
  {
    id: 't-mesopotamia-isin-larsa', name: 'Isin-Larsa city kingdoms',
    label: 'Mesopotamian kingdoms', kind: 'regional', certainty: 'schematic',
    tint: 'minoan', from: -2000, to: -1793, opacity: 0.48,
    ring: [[42.5, 34.0], [46.0, 34.0], [48.0, 30.5], [46.0, 29.2], [43.0, 31.0]],
  },
  {
    id: 't-old-babylonian', name: 'Old Babylonian kingdom', label: 'Babylon',
    kind: 'polity', certainty: 'schematic', tint: 'minoan', from: -1792, to: -1595,
    ring: [[39.0, 36.5], [44.0, 37.0], [47.5, 34.0], [48.0, 30.0], [44.0, 30.0],
           [40.0, 33.0]],
  },
  {
    id: 't-hittite-early', name: 'Early Hittite kingdom', label: 'Hittite kingdom',
    kind: 'polity', certainty: 'schematic', tint: 'collapse', from: -1650, to: -1401,
    ring: [[28.0, 40.5], [32.0, 41.5], [36.0, 40.5], [37.0, 37.0], [33.0, 36.5],
           [29.0, 37.5]],
  },
  {
    id: 't-mitanni', name: 'Kingdom of Mitanni', label: 'Mitanni',
    kind: 'polity', certainty: 'schematic', tint: 'collapse', from: -1600, to: -1260,
    ring: [[35.5, 38.5], [42.5, 39.0], [45.0, 36.5], [43.0, 33.5], [38.0, 34.0],
           [35.5, 36.0]],
  },
  {
    id: 't-minoan', name: 'Minoan Crete', kind: 'culture', tint: 'minoan', from: -1900, to: -1450,
    ring: [[23.4, 35.7], [26.5, 35.6], [26.4, 34.85], [23.4, 34.85]],
  },
  {
    id: 't-minoan-isles', name: 'Minoan cultural sphere', label: 'Minoan sphere',
    kind: 'culture', certainty: 'schematic', tint: 'minoan', from: -1750, to: -1600,
    opacity: 0.5,
    ring: [[24.1, 37.4], [25.9, 37.5], [26.2, 36.4], [24.2, 36.3]],
  },
  {
    id: 't-mycenaean-early', name: 'Early Mycenaean culture', label: 'Early Mycenaean',
    kind: 'culture', certainty: 'schematic', tint: 'mycenaean', from: -1600, to: -1401,
    opacity: 0.42,
    ring: [[20.9, 39.1], [22.3, 40.0], [23.8, 40.1], [24.0, 39.0], [23.8, 38.0],
           [23.2, 36.6], [22.3, 36.5], [21.5, 37.1], [21.1, 38.2]],
  },
  {
    id: 't-mycenaean', name: 'Mycenaean palace regions', label: 'Mycenaean Greece',
    kind: 'regional', certainty: 'schematic', tint: 'mycenaean', from: -1400, to: -1190,
    ring: [[20.7, 39.3], [22.4, 40.3], [23.9, 40.4], [24.2, 39.6], [23.9, 38.2],
           [24.1, 37.6], [23.2, 36.5], [22.4, 36.4], [21.6, 37.0], [21.2, 38.3],
           [20.6, 38.9]],
  },
  {
    id: 't-mycenaean-crete', name: 'Mycenaean Crete', kind: 'regional',
    tint: 'mycenaean', from: -1450, to: -1190,
    ring: [[23.4, 35.7], [26.5, 35.6], [26.4, 34.85], [23.4, 34.85]],
  },
  {
    id: 't-hittite', name: 'Hittite Empire', kind: 'polity', tint: 'collapse', from: -1400, to: -1190,
    ring: [[27.0, 40.3], [31.0, 41.5], [36.0, 41.0], [38.5, 39.0], [38.0, 36.8],
           [36.2, 36.2], [33.0, 36.5], [30.0, 36.6], [27.5, 37.5], [26.8, 39.0]],
  },
  {
    id: 't-egypt-nk', name: 'New Kingdom Egypt', kind: 'polity', tint: 'collapse', from: -1550, to: -1070,
    labelAt: [30.5, 27.8],
    ring: [[28.5, 31.5], [32.3, 31.7], [34.5, 31.0], [34.0, 28.0], [33.4, 25.0], [32.5, 22.0], [29.5, 22.0],
           [27.5, 25.0], [27.8, 29.0]],
  },
  {
    id: 't-egypt-nk-levant', name: 'New Kingdom Egypt', label: 'Egyptian Levant',
    kind: 'polity', tint: 'collapse', from: -1550, to: -1070, labelAt: [35.1, 33.2],
    ring: [[34.2, 31.4], [35.4, 31.8], [36.2, 34.5], [35.0, 34.7], [34.0, 33.0]],
  },
  {
    id: 't-middle-assyria', name: 'Middle Assyrian kingdom', label: 'Middle Assyria',
    kind: 'polity', certainty: 'schematic', tint: 'collapse', from: -1365, to: -1050,
    ring: [[39.0, 38.0], [44.5, 38.0], [47.0, 35.0], [46.0, 32.0], [42.0, 33.0],
           [39.0, 35.0]],
  },

  /* ---------- Collapse & Early Iron Age ----------
     Greece is shown as several post-palatial archaeological regions,
     not one invented state. Near Eastern polities are split where the
     evidence supports separate kingdoms or dated imperial expansion. */
  {
    id: 't-da-phoenicia', name: 'Phoenician city-states', label: 'Phoenician cities',
    kind: 'regional', certainty: 'schematic', tint: 'darkage',
    from: -1200, to: -539, opacity: 0.48,
    ring: [[36.0, 35.9], [36.2, 34.6], [35.4, 33.2], [35.0, 33.9], [35.1, 34.6],
           [35.5, 35.5]],
  },
  {
    id: 't-da-israel', name: 'Kingdom of Israel', label: 'Israel',
    kind: 'polity', certainty: 'schematic', tint: 'darkage', from: -930, to: -722,
    ring: [[34.9, 33.3], [35.6, 33.2], [35.9, 32.6], [35.6, 31.9], [35.0, 31.9],
           [34.8, 32.6]],
  },
  {
    id: 't-da-judah', name: 'Kingdom of Judah', label: 'Judah',
    kind: 'polity', certainty: 'schematic', tint: 'darkage', from: -930, to: -586,
    ring: [[34.8, 31.95], [35.6, 31.95], [35.5, 31.1], [35.0, 31.0], [34.7, 31.5]],
  },
  {
    id: 't-da-urartu', name: 'Urartu', kind: 'polity', tint: 'darkage', from: -860, to: -590,
    ring: [[38.0, 39.5], [41.5, 40.0], [44.5, 39.5], [45.5, 38.0], [43.5, 37.0],
           [40.0, 37.5], [38.5, 38.5]],
  },
  {
    id: 't-da-egypt-third-intermediate', name: 'Third Intermediate Period Egypt',
    label: 'Regional kingdoms in Egypt', kind: 'regional', certainty: 'schematic',
    tint: 'darkage', from: -1069, to: -712, opacity: 0.48,
    ring: [[29.3, 31.3], [32.1, 31.4], [33.0, 28.0], [32.8, 24.0], [31.7, 22.0],
           [30.5, 22.5], [29.8, 27.0]],
  },
  {
    id: 't-da-assyria-core', name: 'Neo-Assyrian Empire', label: 'Assyria',
    kind: 'polity', tint: 'collapse', from: -911, to: -884,
    ring: [[40.5, 37.7], [44.5, 37.5], [45.5, 34.5], [43.0, 33.5], [40.0, 35.0]],
  },
  {
    id: 't-da-assyria-recovery', name: 'Neo-Assyrian Empire', label: 'Assyria',
    kind: 'polity', tint: 'collapse', from: -883, to: -745,
    ring: [[37.5, 38.0], [43.0, 38.5], [47.0, 36.5], [47.0, 32.0], [44.0, 31.5],
           [40.0, 34.0], [36.0, 35.8]],
  },
  {
    id: 't-da-assyria-expansion', name: 'Neo-Assyrian Empire', label: 'Assyria',
    kind: 'polity', tint: 'collapse', from: -744, to: -722,
    ring: [[36.0, 38.0], [43.0, 38.5], [48.0, 36.5], [48.0, 31.0], [44.0, 31.0],
           [40.0, 33.5], [36.0, 35.0], [34.8, 31.8], [35.8, 35.8]],
  },
  {
    id: 't-da-assyria-peak', name: 'Neo-Assyrian Empire', label: 'Neo-Assyrian Empire',
    kind: 'polity', tint: 'collapse', from: -721, to: -627,
    ring: [[35.5, 38.0], [43.0, 39.0], [49.0, 37.0], [49.0, 30.5], [44.0, 30.5],
           [40.0, 33.0], [36.0, 35.0], [34.7, 31.1], [35.8, 35.8]],
  },
  {
    id: 't-da-assyria-egypt', name: 'Assyrian occupation of Egypt', label: 'Assyrian Egypt',
    kind: 'polity', certainty: 'brief-control', tint: 'collapse', from: -671, to: -663,
    ring: [[29.0, 31.3], [32.2, 31.4], [33.0, 28.0], [32.5, 25.5], [30.5, 26.0],
           [29.3, 30.5]],
  },
  {
    id: 't-da-assyria-collapse', name: 'Neo-Assyrian remnant', label: 'Assyria',
    kind: 'polity', tint: 'collapse', from: -626, to: -609,
    ring: [[39.0, 37.5], [44.5, 37.5], [46.0, 34.0], [43.5, 32.5], [40.0, 34.0]],
  },
  {
    id: 't-da-babylon', name: 'Neo-Babylonian Empire', label: 'Neo-Babylonian Empire',
    kind: 'polity', tint: 'darkage', from: -626, to: -539,
    ring: [[35.0, 37.0], [42.0, 38.0], [48.0, 35.5], [48.0, 30.0], [44.0, 30.0],
           [40.0, 32.0], [36.0, 31.0], [34.5, 31.2], [35.0, 35.5]],
  },
  {
    id: 't-da-medes', name: 'Median kingdom', label: 'Media',
    kind: 'polity', certainty: 'schematic', tint: 'darkage', from: -678, to: -550,
    ring: [[44.0, 39.0], [51.0, 38.5], [56.0, 35.5], [54.0, 30.0], [48.0, 30.0],
           [44.0, 34.0]],
  },
  {
    id: 't-da-greece-attica', name: 'Post-palatial Greek regions', label: 'Attica',
    kind: 'culture', certainty: 'schematic', tint: 'darkage',
    from: -1100, to: -800, opacity: 0.38,
    ring: [[22.8, 38.4], [24.0, 38.4], [24.1, 37.6], [23.1, 37.5]],
  },
  {
    id: 't-da-greece-argolid', name: 'Post-palatial Greek regions', label: 'Argolid',
    kind: 'culture', certainty: 'schematic', tint: 'darkage',
    from: -1100, to: -800, opacity: 0.38,
    ring: [[22.2, 38.1], [23.2, 38.0], [23.3, 37.2], [22.4, 36.7], [21.8, 37.3]],
  },
  {
    id: 't-da-greece-thessaly', name: 'Post-palatial Greek regions', label: 'Thessaly',
    kind: 'culture', certainty: 'schematic', tint: 'darkage',
    from: -1100, to: -800, opacity: 0.38,
    ring: [[21.5, 40.0], [23.5, 40.1], [23.6, 39.1], [22.0, 38.9]],
  },

  /* ---------- Archaic & Classical ---------- */
  {
    id: 't-lydia', name: 'Lydian Kingdom', kind: 'polity', tint: 'archaic', from: -680, to: -546,
    ring: [[26.5, 39.5], [30.5, 39.8], [32.5, 38.5], [31.5, 37.0], [29.0, 36.5],
           [27.0, 37.4], [26.6, 38.6]],
  },
  /* Persia is phased rather than displaying Darius's maximum empire
     from Cyrus's accession to Alexander's conquest. Egypt is omitted
     during its documented independence (404–343 BC). */
  {
    id: 't-achaemenid-cyrus', name: 'Achaemenid Empire', label: 'Persian Empire',
    kind: 'polity', tint: 'archaic', from: -550, to: -526,
    ring: [[26.6, 40.2], [31.0, 41.5], [38.0, 41.0], [45.0, 40.0], [52.0, 38.0],
           [60.0, 39.0], [66.0, 37.0], [65.0, 30.0], [57.0, 27.0], [50.0, 28.5],
           [45.0, 31.0], [40.0, 33.5], [36.5, 32.5], [35.5, 34.5], [36.2, 36.3],
           [31.0, 36.5], [27.2, 37.6]],
  },
  {
    id: 't-achaemenid-cambyses', name: 'Achaemenid Empire', label: 'Persian Empire',
    kind: 'polity', tint: 'archaic', from: -525, to: -522,
    ring: [[26.6, 40.2], [31.0, 41.5], [38.0, 41.0], [45.0, 40.0], [52.0, 38.0],
           [60.0, 39.0], [66.0, 37.0], [65.0, 30.0], [57.0, 27.0], [50.0, 28.5],
           [45.0, 31.0], [40.0, 33.5], [36.5, 32.5], [34.5, 31.3], [33.4, 25.0],
           [32.0, 22.0], [29.5, 22.0], [27.5, 25.0], [28.5, 30.5], [29.0, 31.3],
           [32.0, 31.5], [35.5, 34.5], [36.2, 36.3], [31.0, 36.5],
           [27.2, 37.6]],
  },
  {
    id: 't-achaemenid-darius', name: 'Achaemenid Empire', label: 'Achaemenid Empire',
    kind: 'polity', tint: 'archaic', from: -521, to: -405,
    ring: [[26.6, 40.2], [30.0, 41.5], [36.0, 41.5], [40.0, 40.5], [45.0, 40.0],
           [48.0, 39.0], [50.0, 37.5], [54.0, 37.5], [58.0, 38.0], [62.0, 40.0],
           [66.0, 40.5], [70.0, 40.0], [72.0, 37.0], [73.5, 34.0], [71.0, 30.0],
           [68.0, 27.0], [66.0, 25.5], [61.0, 25.5], [57.0, 26.5], [54.0, 26.5],
           [50.0, 28.5], [47.5, 30.0], [45.0, 31.0], [43.0, 33.0], [40.0, 33.5],
           [36.5, 32.5], [34.5, 31.3], [33.5, 30.5], [31.0, 30.0], [29.5, 30.5],
           [29.0, 31.3], [32.0, 31.4], [34.5, 32.0], [35.5, 34.5], [36.2, 36.3],
           [34.0, 36.4], [31.0, 36.5], [28.5, 36.8], [27.2, 37.6], [26.7, 39.0]],
  },
  {
    id: 't-achaemenid-no-egypt', name: 'Achaemenid Empire', label: 'Achaemenid Empire',
    kind: 'polity', tint: 'archaic', from: -404, to: -343,
    ring: [[26.6, 40.2], [30.0, 41.5], [36.0, 41.5], [40.0, 40.5], [45.0, 40.0],
           [50.0, 37.5], [58.0, 38.0], [66.0, 40.5], [72.0, 37.0], [73.5, 34.0],
           [71.0, 30.0], [66.0, 25.5], [57.0, 26.5], [50.0, 28.5], [45.0, 31.0],
           [40.0, 33.5], [36.5, 32.5], [34.5, 31.3], [35.5, 34.5], [36.2, 36.3],
           [31.0, 36.5], [27.2, 37.6], [26.7, 39.0]],
  },
  {
    id: 't-achaemenid-restored', name: 'Achaemenid Empire', label: 'Achaemenid Empire',
    kind: 'polity', tint: 'archaic', from: -342, to: -330,
    ring: [[26.6, 40.2], [30.0, 41.5], [36.0, 41.5], [40.0, 40.5], [45.0, 40.0],
           [48.0, 39.0], [50.0, 37.5], [54.0, 37.5], [58.0, 38.0], [62.0, 40.0],
           [66.0, 40.5], [70.0, 40.0], [72.0, 37.0], [73.5, 34.0], [71.0, 30.0],
           [68.0, 27.0], [66.0, 25.5], [61.0, 25.5], [57.0, 26.5], [50.0, 28.5],
           [45.0, 31.0], [40.0, 33.5], [36.5, 32.5], [34.5, 31.3], [33.4, 25.0],
           [32.0, 22.0], [29.5, 22.0], [27.5, 25.0], [28.5, 30.5], [29.0, 31.3],
           [32.0, 31.5], [35.5, 34.5], [36.2, 36.3], [31.0, 36.5],
           [27.2, 37.6], [26.7, 39.0]],
  },
  {
    id: 't-athenian-empire', name: 'Athenian Empire (Delian League)', tint: 'classical',
    label: 'Athenian-led Delian League', kind: 'league', from: -478, to: -404, opacity: 0.62,
    ring: [[23.3, 38.3], [24.2, 40.9], [26.2, 40.9], [26.9, 39.4], [27.4, 37.4],
           [28.4, 36.6], [26.8, 36.3], [24.6, 36.4], [23.4, 37.3], [23.5, 38.1]],
  },
  {
    id: 't-peloponnesian-league', name: 'Peloponnesian League', tint: 'darkage',
    kind: 'league', from: -505, to: -365, opacity: 0.55,
    ring: [[21.2, 38.3], [23.2, 38.1], [23.4, 37.4], [22.9, 36.4], [22.3, 36.5],
           [21.5, 37.0], [21.3, 37.9]],
  },
  {
    id: 't-theban-hegemony', name: 'Theban hegemony', tint: 'macedon',
    kind: 'league', from: -371, to: -362, opacity: 0.6,
    ring: [[22.4, 38.5], [23.6, 38.8], [23.9, 38.2], [23.1, 37.9], [22.5, 38.1]],
  },

  /* ---------- Macedon & Alexander (staged growth) ---------- */
  {
    id: 't-macedon-philip', name: 'Kingdom of Macedon', kind: 'polity',
    tint: 'macedon', from: -359, to: -323,
    ring: [[20.8, 40.2], [22.5, 41.3], [25.0, 41.4], [26.3, 40.8], [24.5, 40.1],
           [23.5, 40.2], [22.6, 39.9], [21.5, 39.9]],
  },
  {
    id: 't-macedon-greece', name: 'League of Corinth', tint: 'macedon', from: -337, to: -323,
    kind: 'league', opacity: 0.6,
    ring: [[20.7, 39.9], [22.6, 40.0], [24.2, 39.7], [24.1, 37.6], [23.2, 36.5],
           [22.4, 36.4], [21.6, 37.0], [21.2, 38.3], [20.6, 38.9]],
  },
  {
    id: 't-alex-anatolia', name: "Alexander's empire: Anatolia", label: "Alexander's empire",
    kind: 'polity', tint: 'alexander', from: -334, to: -323,
    ring: [[26.5, 40.3], [30.0, 41.3], [35.0, 41.0], [37.5, 39.0], [37.0, 36.6],
           [34.0, 36.4], [30.5, 36.5], [27.2, 37.5], [26.7, 39.2]],
  },
  {
    id: 't-alex-levant', name: "Alexander's empire: Levant & Egypt", label: "Alexander's empire",
    kind: 'polity', tint: 'alexander', from: -332, to: -323,
    ring: [[36.2, 36.4], [38.5, 36.0], [39.0, 34.0], [37.0, 32.0], [35.0, 30.5],
           [33.5, 30.4], [31.0, 30.0], [29.4, 30.6], [29.0, 31.4], [32.0, 31.4],
           [34.6, 32.2], [35.6, 34.6]],
  },
  {
    id: 't-alex-mesopotamia', name: "Alexander's empire: Mesopotamia & Persia",
    label: "Alexander's empire", kind: 'polity', tint: 'alexander',
    from: -331, to: -323,
    ring: [[38.5, 37.5], [43.0, 38.0], [47.0, 39.0], [51.0, 37.0], [55.0, 36.0],
           [56.0, 32.0], [58.0, 29.0], [56.5, 27.0], [53.0, 27.0], [49.0, 29.0],
           [47.0, 30.2], [44.5, 31.5], [41.0, 33.5], [38.8, 34.5]],
  },
  {
    id: 't-alex-bactria', name: "Alexander's empire: Bactria & Sogdiana",
    label: "Alexander's empire", kind: 'polity', tint: 'alexander',
    from: -329, to: -323,
    ring: [[56.0, 36.5], [60.0, 39.5], [64.0, 41.0], [68.0, 41.0], [71.5, 39.0],
           [72.0, 36.0], [69.0, 33.5], [65.0, 32.0], [61.0, 31.5], [57.5, 32.5]],
  },
  {
    id: 't-alex-indus', name: "Alexander's empire: the Indus", label: "Alexander's empire",
    kind: 'polity', tint: 'alexander', from: -326, to: -323,
    ring: [[69.0, 34.5], [73.5, 34.5], [75.0, 32.0], [73.0, 29.0], [70.5, 26.0],
           [68.0, 24.5], [66.5, 25.5], [67.5, 28.5], [67.5, 32.0]],
  },

  /* ---------- Wars of the Successors ----------
     No single empire replaced Alexander after 323 BC. These broad,
     low-opacity regions communicate contested successor control rather
     than pretending the Diadochi had stable borders immediately. */
  {
    id: 't-diadochi-macedon', name: 'Macedon under the Successors', label: 'Macedon',
    kind: 'regional', certainty: 'contested', tint: 'macedon', from: -322, to: -294,
    opacity: 0.5,
    ring: [[20.8, 40.2], [22.5, 41.3], [25.0, 41.4], [26.3, 40.8], [24.5, 40.1],
           [23.5, 40.2], [22.6, 39.9], [21.5, 39.9]],
  },
  {
    id: 't-diadochi-egypt', name: 'Ptolemaic control in Egypt', label: 'Ptolemy in Egypt',
    kind: 'regional', certainty: 'contested', tint: 'hellenistic', from: -322, to: -306,
    opacity: 0.52,
    ring: [[29.0, 31.4], [32.0, 31.4], [34.2, 31.0], [33.2, 24.0], [32.0, 22.0],
           [30.0, 22.5], [29.5, 27.0], [28.5, 30.6]],
  },
  {
    id: 't-diadochi-asia', name: 'Successor realms in Asia', label: 'Contested successor realms',
    kind: 'regional', certainty: 'contested', tint: 'hellenistic', from: -322, to: -306,
    opacity: 0.42,
    ring: [[27.0, 40.5], [35.0, 41.0], [43.0, 39.0], [50.0, 37.5], [56.0, 35.0],
           [56.0, 28.0], [48.0, 29.0], [41.0, 33.5], [35.5, 36.0], [29.0, 36.8]],
  },

  /* ---------- Hellenistic kingdoms ----------
     Major kingdoms are phased at documented territorial breaks rather
     than holding their maximum outline for their entire existence. */
  {
    id: 't-ptolemaic-early', name: 'Ptolemaic Kingdom', label: 'Ptolemaic Kingdom',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -305, to: -201, labelAt: [30.5, 27.8],
    ring: [[28.5, 31.5], [32.0, 31.7], [34.5, 31.0], [34.0, 28.0], [33.5, 24.0],
           [32.0, 22.0], [28.5, 22.0], [26.0, 25.0], [26.5, 29.0], [28.5, 30.6]],
  },
  {
    id: 't-ptolemaic-early-levant', name: 'Ptolemaic Levant', label: 'Ptolemaic Levant',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -305, to: -201, labelAt: [34.7, 33.5],
    ring: [[33.5, 31.5], [35.0, 32.0], [36.0, 34.5], [34.8, 35.5], [33.8, 34.5], [34.2, 32.5]],
  },
  {
    id: 't-ptolemaic-early-cyrenaica', name: 'Ptolemaic Cyrenaica', label: 'Ptolemaic Cyrenaica',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -305, to: -201, labelAt: [24.0, 31.4],
    ring: [[20.2, 32.2], [22.0, 32.8], [24.8, 31.8], [28.5, 31.5], [27.8, 30.3],
           [24.0, 30.0], [20.5, 31.0]],
  },
  {
    id: 't-ptolemaic-middle', name: 'Ptolemaic Kingdom', label: 'Ptolemaic Kingdom',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -200, to: -97, labelAt: [30.5, 27.8],
    ring: [[28.5, 31.5], [32.0, 31.7], [34.3, 31.0], [34.0, 29.0], [33.5, 24.0],
           [32.0, 22.0], [28.5, 22.0], [26.0, 25.0], [26.5, 29.0], [28.5, 30.6]],
  },
  {
    id: 't-ptolemaic-middle-cyrenaica', name: 'Ptolemaic Cyrenaica', label: 'Ptolemaic Cyrenaica',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -200, to: -97, labelAt: [24.0, 31.4],
    ring: [[20.2, 32.2], [22.0, 32.8], [24.8, 31.8], [28.5, 31.5], [27.8, 30.3],
           [24.0, 30.0], [20.5, 31.0]],
  },
  {
    id: 't-ptolemaic-late', name: 'Ptolemaic Kingdom', label: 'Ptolemaic Egypt',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -96, to: -59, labelAt: [30.5, 27.8],
    ring: [[28.5, 31.5], [32.0, 31.6], [34.3, 31.0], [34.0, 28.0], [33.5, 24.0],
           [32.0, 22.0], [28.5, 22.0], [26.0, 25.0], [26.5, 29.0], [28.5, 30.6]],
  },
  {
    id: 't-ptolemaic-terminal', name: 'Ptolemaic Kingdom', label: 'Ptolemaic Egypt',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -58, to: -30, labelAt: [30.5, 27.8],
    ring: [[28.5, 31.5], [32.0, 31.6], [34.3, 31.0], [34.0, 28.0], [33.5, 24.0],
           [32.0, 22.0], [28.5, 22.0], [26.0, 25.0], [26.5, 29.0], [28.5, 30.6]],
  },
  {
    id: 't-seleucid-early', name: 'Seleucid Empire', label: 'Seleucid Empire',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -305, to: -247, labelAt: [49.0, 34.0],
    ring: [[35.5, 36.5], [38.5, 38.0], [43.0, 38.5], [47.0, 39.0], [51.0, 37.5],
           [55.0, 36.5], [60.0, 37.5], [64.0, 39.0], [68.0, 38.5], [70.0, 36.0],
           [68.0, 33.0], [64.0, 30.5], [60.0, 28.0], [57.0, 26.8], [53.0, 27.0],
           [49.0, 29.2], [47.0, 30.3], [44.5, 31.5], [41.0, 33.5], [37.5, 33.0],
           [35.8, 34.8], [35.0, 36.0], [33.0, 36.5], [30.5, 36.6], [28.5, 37.0],
           [27.5, 38.5], [29.0, 40.0], [32.0, 40.5], [35.0, 39.5], [36.5, 37.5]],
  },
  {
    id: 't-seleucid-reduced-east', name: 'Seleucid Empire', label: 'Seleucid Empire',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -246, to: -223, labelAt: [44.0, 34.0],
    ring: [[35.5, 36.5], [38.5, 38.0], [43.0, 38.5], [48.0, 38.0], [54.0, 36.0],
           [56.0, 31.0], [53.0, 27.0], [49.0, 29.2], [44.5, 31.5], [41.0, 33.5],
           [35.8, 34.8], [33.0, 36.5], [28.5, 37.0], [27.5, 38.5], [32.0, 40.5]],
  },
  {
    id: 't-seleucid-restored', name: 'Seleucid Empire under Antiochus III',
    label: 'Seleucid Empire', kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -222, to: -190,
    labelAt: [49.0, 34.0],
    ring: [[35.5, 36.5], [38.5, 38.0], [43.0, 38.5], [47.0, 39.0], [55.0, 36.5],
           [62.0, 37.5], [68.0, 38.5], [70.0, 36.0], [68.0, 33.0], [60.0, 28.0],
           [53.0, 27.0], [47.0, 30.3], [41.0, 33.5], [35.8, 34.8], [33.0, 36.5],
           [28.5, 37.0], [27.5, 38.5], [32.0, 40.5], [35.0, 39.5]],
  },
  {
    id: 't-seleucid-post-magnesia', name: 'Seleucid Empire', label: 'Seleucid Empire',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -189, to: -142, labelAt: [43.0, 34.0],
    ring: [[35.5, 36.6], [38.5, 37.5], [42.0, 37.0], [47.0, 36.0], [52.0, 35.0],
           [53.0, 30.0], [47.5, 30.3], [41.0, 33.5], [37.5, 33.0], [35.0, 36.0]],
  },
  {
    id: 't-seleucid-remnant', name: 'Seleucid remnant', label: 'Seleucid Syria',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic', from: -141, to: -63, labelAt: [38.5, 35.0],
    ring: [[35.5, 36.6], [38.5, 37.5], [42.0, 37.0], [45.0, 35.0], [46.5, 32.5],
           [41.0, 33.5], [37.5, 33.0], [35.8, 34.8], [35.0, 36.0]],
  },
  {
    id: 't-antigonid', name: 'Antigonid Macedon', kind: 'polity',
    tint: 'macedon', from: -276, to: -168,
    ring: [[20.8, 40.3], [22.5, 41.3], [25.0, 41.4], [26.3, 40.8], [24.5, 40.1],
           [23.5, 40.2], [22.6, 39.6], [21.4, 39.7]],
  },
  {
    id: 't-pergamon', name: 'Kingdom of Pergamon', kind: 'polity',
    tint: 'hellenistic', from: -282, to: -133,
    ring: [[26.6, 39.6], [29.5, 39.9], [32.0, 38.7], [31.0, 37.0], [28.5, 36.8],
           [27.0, 37.6], [26.7, 38.8]],
  },
  {
    id: 't-bactria', name: 'Greco-Bactrian Kingdom', kind: 'polity',
    tint: 'hellenistic', from: -256, to: -125,
    ring: [[62.0, 38.5], [66.0, 40.0], [70.0, 39.5], [72.0, 37.0], [70.5, 34.5],
           [67.0, 33.5], [63.5, 34.5], [61.5, 36.5]],
  },
  {
    id: 't-parthia-core', name: 'Parthian kingdom', label: 'Parthia',
    kind: 'polity', tint: 'roman', from: -247, to: -171, opacity: 0.55,
    ring: [[50.0, 38.5], [56.0, 38.0], [60.0, 36.0], [59.0, 32.0], [54.0, 31.0],
           [50.0, 34.0]],
  },
  {
    id: 't-parthia-iran', name: 'Parthian kingdom', label: 'Parthia',
    kind: 'polity', tint: 'roman', from: -170, to: -142, opacity: 0.55,
    ring: [[48.5, 39.0], [54.0, 38.0], [60.0, 38.0], [63.0, 36.0], [62.0, 32.0],
           [59.0, 28.5], [53.0, 27.0], [49.0, 29.2], [47.0, 33.0]],
  },
  {
    id: 't-parthia-expanded', name: 'Parthian Empire', label: 'Parthian Empire',
    kind: 'polity', tint: 'roman', from: -141, to: -30, opacity: 0.55,
    ring: [[46.0, 38.5], [51.0, 38.0], [56.0, 37.5], [60.0, 38.0], [63.0, 36.0],
           [62.0, 32.0], [59.0, 28.5], [56.5, 27.0], [53.0, 27.0], [49.0, 29.2],
           [46.5, 31.0], [44.5, 34.0], [44.5, 36.5]],
  },
  {
    id: 't-achaean-league', name: 'Achaean League', tint: 'hellenistic', from: -280, to: -146,
    kind: 'league', opacity: 0.6,
    ring: [[21.2, 38.3], [23.2, 38.1], [23.4, 37.4], [22.9, 36.4], [22.3, 36.5],
           [21.5, 37.0], [21.3, 37.9]],
  },

  /* ---------- Rome (staged growth) ---------- */
  {
    id: 't-rome-italy', name: 'Roman Italy', kind: 'polity', tint: 'roman', from: -264, to: -30,
    ring: [[7.8, 44.2], [10.5, 45.5], [13.6, 45.5], [12.5, 44.5], [14.0, 42.6],
           [16.0, 41.9], [18.5, 40.2], [17.2, 39.8], [16.0, 38.7], [15.4, 38.0],
           [15.6, 40.0], [14.0, 41.1], [12.0, 41.6], [10.2, 43.6], [8.4, 44.0]],
  },
  {
    id: 't-rome-sicily', name: 'Roman Sicily', kind: 'polity', tint: 'roman', from: -241, to: -30,
    ring: [[12.4, 38.3], [15.7, 38.35], [15.2, 36.9], [14.4, 36.6], [12.4, 37.6]],
  },
  {
    id: 't-rome-sardinia', name: 'Roman Sardinia & Corsica', label: 'Roman islands',
    kind: 'polity', tint: 'roman', from: -238, to: -30,
    ring: [[8.0, 43.1], [9.6, 43.2], [9.8, 41.3], [9.8, 39.0], [8.2, 38.9],
           [8.0, 41.2]],
  },
  {
    id: 't-rome-macedonia', name: 'Roman Macedonia & Greece', kind: 'polity',
    tint: 'roman', from: -146, to: -30,
    ring: [[19.5, 40.5], [22.5, 41.4], [25.0, 41.4], [26.3, 40.8], [24.3, 40.0],
           [24.2, 38.0], [23.2, 36.5], [22.4, 36.4], [21.3, 38.0], [20.5, 39.0],
           [19.4, 39.9]],
  },
  {
    id: 't-rome-asia', name: 'Roman province of Asia', label: 'Roman Asia',
    kind: 'polity', tint: 'roman', from: -129, to: -30,
    ring: [[26.6, 40.2], [30.0, 40.5], [32.5, 39.0], [31.5, 37.0], [28.5, 36.8],
           [27.0, 37.6], [26.7, 39.2]],
  },
  {
    id: 't-rome-syria', name: 'Roman Syria', kind: 'polity', tint: 'roman', from: -63, to: -30,
    ring: [[35.5, 36.6], [38.5, 37.0], [40.0, 35.0], [38.5, 33.0], [36.0, 31.5],
           [34.5, 31.3], [34.9, 33.5], [35.6, 35.0]],
  },
  {
    id: 't-rome-egypt', name: 'Roman Egypt', kind: 'polity', tint: 'roman', from: -30, to: -29,
    ring: [[29.0, 31.4], [32.0, 31.4], [34.4, 31.2], [33.5, 28.0], [33.2, 24.0],
           [32.0, 22.0], [30.0, 22.5], [29.5, 27.0], [28.5, 30.6]],
  },

  /* ---------- Cyprus through time ----------
     Cyprus was often controlled indirectly through its own kings. Dashed
     `regional` outlines distinguish tributary suzerainty and fragmented
     city-kingdoms from the direct Ptolemaic and Roman administrations. */
  {
    id: 't-cyprus-chalcolithic', name: 'Chalcolithic Cyprus', label: 'Cyprus',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -3200, to: -2501, opacity: 0.34, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-bronze', name: 'Bronze Age Cyprus', label: 'Bronze Age Cyprus',
    kind: 'culture', certainty: 'schematic', tint: 'earlybronze',
    from: -2500, to: -1801, opacity: 0.42, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-alashiya', name: 'Alashiya (Cyprus)', label: 'Alashiya',
    kind: 'regional', certainty: 'debated', tint: 'collapse',
    from: -1800, to: -1050, opacity: 0.52, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-kingdoms-early', name: 'Cypriot city-kingdoms', label: 'Cypriot kingdoms',
    kind: 'regional', certainty: 'schematic', tint: 'darkage',
    from: -1049, to: -710, opacity: 0.5, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-assyrian', name: 'Cypriot kingdoms under Assyrian suzerainty',
    label: 'Assyrian Cyprus', kind: 'regional', certainty: 'schematic', tint: 'collapse',
    from: -709, to: -664, opacity: 0.58, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-kingdoms-late', name: 'Cypriot city-kingdoms', label: 'Cypriot kingdoms',
    kind: 'regional', certainty: 'schematic', tint: 'darkage',
    from: -663, to: -561, opacity: 0.5, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-egyptian', name: 'Cypriot kingdoms under Saite Egyptian suzerainty',
    label: 'Egyptian Cyprus', kind: 'regional', certainty: 'schematic', tint: 'darkage',
    from: -560, to: -546, opacity: 0.58, entityId: 'cyprus', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-persian', name: 'Achaemenid Cyprus', label: 'Persian Cyprus',
    kind: 'regional', certainty: 'schematic', tint: 'archaic',
    from: -545, to: -333, opacity: 0.64, entityId: 'achaemenid-empire', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-alexander', name: "Alexander's empire: Cyprus", label: "Alexander's Cyprus",
    kind: 'polity', certainty: 'schematic', tint: 'alexander',
    from: -332, to: -323, entityId: 'alexander-empire', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-diadochi', name: 'Cyprus contested by the Successors',
    label: 'Contested Cyprus', kind: 'regional', certainty: 'contested', tint: 'hellenistic',
    from: -322, to: -307, opacity: 0.52, entityId: 'wars-of-diadochi', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-antigonid', name: 'Antigonid control of Cyprus', label: 'Antigonid Cyprus',
    kind: 'polity', certainty: 'brief-control', tint: 'macedon',
    from: -306, to: -295, entityId: 'wars-of-diadochi', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-ptolemaic', name: 'Ptolemaic Cyprus', label: 'Ptolemaic Cyprus',
    kind: 'polity', certainty: 'schematic', tint: 'hellenistic',
    from: -294, to: -59, entityId: 'ptolemaic-kingdom', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-roman-first', name: 'Roman Cyprus', label: 'Roman Cyprus',
    kind: 'polity', tint: 'roman', from: -58, to: -49,
    entityId: 'roman-conquest', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-ptolemaic-restored', name: 'Ptolemaic restoration in Cyprus',
    label: 'Ptolemaic Cyprus', kind: 'polity', certainty: 'brief-control', tint: 'hellenistic',
    from: -48, to: -31, entityId: 'ptolemaic-kingdom', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
  {
    id: 't-cyprus-roman-final', name: 'Roman Cyprus', label: 'Roman Cyprus',
    kind: 'polity', tint: 'roman', from: -30, to: -29,
    entityId: 'roman-conquest', coverageGroup: 'cyprus',
    labelAt: [33.45, 35.1], ring: CYPRUS_RING,
  },
];

/* ============================================================
   Trade & campaign routes
   ============================================================ */
export const routes = [
  {
    id: 'r-obsidian', name: 'Melian obsidian trade', tint: 'earlybronze',
    kind: 'network', from: -3200, to: -1500, dashed: true,
    paths: [
      [[24.42, 36.69], [23.15, 37.5]],
      [[24.42, 36.69], [22.75, 37.73]],
      [[24.42, 36.69], [25.15, 37.05]],
      [[24.42, 36.69], [27.28, 37.53]],
    ],
  },
  {
    id: 'r-minoan-trade', name: 'Minoan trade network', tint: 'minoan',
    kind: 'network', from: -1900, to: -1450, dashed: true,
    paths: [
      [[25.16, 35.3], [25.4, 36.4], [25.15, 37.05]],
      [[25.16, 35.3], [27.28, 37.53]],
      [[25.16, 35.3], [33.0, 35.0]],
      [[25.16, 35.3], [35.2, 34.6]],
      [[25.16, 35.3], [30.0, 31.2]],
    ],
  },
  {
    id: 'r-sea-peoples', name: 'Possible movements linked to the “Sea Peoples”',
    kind: 'hypothesis', certainty: 'debated', tint: 'collapse',
    from: -1200, to: -1150, dashed: true,
    // A deliberately broad eastern-Mediterranean corridor. The Egyptian
    // texts attest mobile groups and battles, not this exact itinerary.
    path: [[24.8, 38.2], [27.2, 37.5], [30.0, 36.3], [33.5, 35.8],
           [35.2, 34.6], [34.5, 31.6], [31.1, 31.25]],
  },
  {
    id: 'r-colonisation-west', name: 'Colonisation: the west', tint: 'archaic',
    kind: 'network', from: -750, to: -550, dashed: true,
    paths: [
      [[23.6, 38.5], [20.7, 38.3], [14.0, 40.73]],
      [[22.88, 37.9], [20.7, 38.3], [15.29, 37.07]],
      [[22.43, 37.07], [18.5, 39.5], [17.23, 40.47]],
      [[26.75, 38.67], [13.0, 38.2], [5.37, 43.3]],
      [[25.4, 36.4], [21.86, 32.82]],
    ],
  },
  {
    id: 'r-colonisation-east', name: 'Colonisation: the Black Sea', tint: 'archaic',
    kind: 'network', from: -700, to: -550, dashed: true,
    paths: [
      [[27.28, 37.53], [26.2, 40.1], [28.98, 41.0]],
      [[27.28, 37.53], [30.0, 40.8], [35.15, 42.03]],
      [[27.28, 37.53], [30.0, 40.8], [39.72, 41.0]],
      [[27.28, 37.53], [28.98, 41.0], [31.9, 46.7]],
    ],
  },
  {
    id: 'r-royal-road', name: 'The Persian Royal Road', tint: 'archaic',
    kind: 'road', from: -520, to: -330,
    path: [[28.04, 38.49], [30.5, 38.8], [33.5, 38.9], [35.5, 38.5], [38.3, 37.6],
           [40.5, 37.2], [43.0, 36.3], [44.4, 35.5], [45.5, 34.0], [47.0, 33.0],
           [48.26, 32.19]],
  },
  {
    id: 'r-xerxes', name: 'Invasion route of Xerxes', tint: 'classical',
    kind: 'campaign', from: -481, to: -479,
    path: [[52.89, 29.94], [45.5, 34.0], [40.0, 37.0], [35.0, 39.0], [30.0, 40.0],
           [26.4, 40.2], [25.0, 40.9], [23.5, 40.5], [22.6, 40.0], [22.54, 38.8],
           [23.73, 37.98]],
  },
  {
    id: 'r-ten-thousand', name: 'March of the Ten Thousand', tint: 'classical',
    kind: 'campaign', from: -401, to: -399,
    path: [[28.04, 38.49], [32.5, 38.0], [34.6, 37.0], [37.0, 37.5],
           [40.0, 36.0], [43.0, 33.5], [44.4, 33.1], [43.5, 35.5],
           [42.0, 37.5], [40.5, 39.5], [39.0, 40.5], [39.7, 40.9], [36.33, 41.3],
           [30.0, 40.6], [28.98, 41.0]],
  },
  /* Alexander's campaign is split into three legs — a single continuous
     path retraces itself so heavily (the Siwa side-trip, then the long
     return march back over the outbound corridor through Persia) that
     drawn as one line it reads as routing errors rather than history.
     Splitting outbound/detour/return and giving the return leg a
     distinct dash keeps every segment legible on its own pass. */
  {
    id: 'r-alexander-outbound', name: 'Alexander: outbound campaign (334–327 BC)',
    kind: 'campaign', tint: 'alexander', from: -334, phaseTo: -327, to: -323,
    path: [[22.52, 40.76], [24.5, 40.9], [26.4, 40.2], [27.25, 40.15], [27.42, 37.04],
           [30.6, 36.9], [32.8, 37.0], [34.6, 36.9], [36.18, 36.85], [35.2, 34.6],
           [34.75, 31.5], [29.92, 31.2], [34.9, 32.5], [38.5, 36.0], [43.25, 36.6],
           [44.42, 32.54], [48.26, 32.19], [52.89, 29.94], [54.5, 33.0], [58.0, 34.5],
           [62.0, 35.0], [66.0, 36.5], [69.4, 37.2], [69.0, 34.5], [72.0, 33.5],
           [73.7, 32.1]],
  },
  {
    id: 'r-alexander-siwa', name: 'Alexander: detour to Siwa oracle', tint: 'alexander',
    kind: 'campaign', from: -332, phaseTo: -332, to: -323, dashed: true,
    path: [[29.92, 31.2], [25.5, 29.2]],
  },
  {
    id: 'r-alexander-return', name: 'Alexander: return march (325–323 BC)',
    kind: 'campaign', tint: 'alexander', from: -325, phaseTo: -323, to: -323, dashed: true,
    path: [[73.7, 32.1], [70.5, 30.0], [68.0, 27.0], [67.0, 25.5], [60.0, 26.0],
           [55.0, 28.0], [48.26, 32.19], [44.42, 32.54]],
  },
  {
    id: 'r-silk-precursor', name: 'Routes to the east', tint: 'hellenistic',
    kind: 'network', from: -300, to: -30, dashed: true,
    path: [[36.16, 36.2], [40.0, 36.5], [44.42, 32.54], [50.0, 33.0], [55.0, 35.0],
           [60.0, 36.5], [65.0, 37.0], [69.42, 37.17], [73.0, 35.0]],
  },
];

/* ---------- Helpers ---------- */
export const territoriesAt = (year) =>
  territories.filter((t) => year >= t.from && year <= t.to);

export const routesAt = (year) =>
  routes.filter((r) => year >= r.from && year <= r.to);
