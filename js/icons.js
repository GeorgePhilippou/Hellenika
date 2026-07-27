/* ============================================================
   Hellenika — Icon set
   Single-path-ish line icons on a 24x24 grid, currentColor stroke.
   ============================================================ */

const P = (d, extra = '') =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" ` +
  `stroke-linecap="round" stroke-linejoin="round"/>${extra}`;

const RAW = {
  /* --- navigation --- */
  search: P('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16.2 16.2 21 21'),
  close: P('M6 6l12 12M18 6L6 18'),
  menu: P('M4 7h16M4 12h16M4 17h16'),
  chevronRight: P('M9.5 5l7 7-7 7'),
  chevronLeft: P('M14.5 5l-7 7 7 7'),
  chevronDown: P('M5 9.5l7 7 7-7'),
  arrowRight: P('M4 12h15M13 6l6 6-6 6'),
  arrowLeft: P('M20 12H5M11 6l-6 6 6 6'),
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  external: P('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'),
  check: P('M4.5 12.5 9.5 18 20 6'),
  reset: P('M4 10a8 8 0 1 1 1.2 6M4 4v6h6'),

  /* --- media / playback --- */
  play: P('M7 4.8 19 12 7 19.2z'),
  pause: P('M9 5v14M15 5v14'),
  shuffle: P('M17 3.5 21 7l-4 3.5M3 7h4l9 10h5M17 13.5 21 17l-4 3.5M3 17h4l2.5-2.8'),

  /* --- theme --- */
  sun: P('M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11M12 1.5v2.4M12 20.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M1.5 12h2.4M20.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7'),
  moon: P('M20 14.2A8.6 8.6 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2z'),

  /* --- entity types --- */
  period: P('M3 12h18M6 8.5v7M12 6.5v11M18 8.5v7'),
  person: P('M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4.5 20.5c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5'),
  city: P('M3 20.5h18M5 20.5V9l5-3.5V20.5M14 20.5V11h5v9.5M7.5 12h0M7.5 15.5h0M16.5 14h0M16.5 17.5h0'),
  site: P('M4 20.5h16M6 20.5V8M10 20.5V8M14 20.5V8M18 20.5V8M4 8h16L12 3z'),
  battle: P('M4.5 19.5 14 10M19.5 4.5 16 8M4.5 4.5 14 14M19.5 19.5 16 16M3 18.5l2.5 2.5M21 18.5 18.5 21M3 5.5 5.5 3M21 5.5 18.5 3'),
  war: P('M12 3 4 6.5v5.8c0 4.5 3.3 7.9 8 8.7 4.7-.8 8-4.2 8-8.7V6.5zM9 11.8l2.2 2.2L15.5 9.8'),
  event: P('M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'),
  artefact: P('M9 3.5h6M10 3.5v2.2c0 1.6-3 2.6-3 6.3v6a2.5 2.5 0 0 0 2.5 2.5h5A2.5 2.5 0 0 0 17 18v-6c0-3.7-3-4.7-3-6.3V3.5M7.2 13h9.6'),
  text: P('M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5zM14 3.5V8h4M8.5 12.5h7M8.5 16h5'),
  myth: P('M12 3.2 14.5 9l6.3.4-4.9 4 1.6 6.1L12 16.2 6.5 19.5 8.1 13.4l-4.9-4L9.5 9z'),
  deity: P('M12 3.5c2.5 3 4.5 5 4.5 8a4.5 4.5 0 0 1-9 0c0-3 2-5 4.5-8zM12 20.5v-4'),
  civilisation: P('M3 20.5h18M4.5 20.5V10h15v10.5M4.5 10 12 4l7.5 6M9.5 20.5V15h5v5.5'),
  writing: P('M4.5 19.5 8 18.7 19.3 7.4a2 2 0 0 0-2.8-2.8L5.2 15.9zM15 6.2l2.8 2.8M4.5 19.5 5.3 16'),
  empire: P('M12 2.8 3.5 6.5v6.2c0 4.9 3.6 8.6 8.5 9.5 4.9-.9 8.5-4.6 8.5-9.5V6.5zM12 8.5v7M8.5 12h7'),
  museum: P('M3 20.5h18M4.5 20.5V10M9 20.5V10M15 20.5V10M19.5 20.5V10M3 10h18L12 4z'),
  language: P('M3.5 6h9M8 4v2M10.5 6c0 4-3 8-6.5 9.5M6 10c1.2 2.5 3.5 4.4 6 5.2M12.5 20.5l4-9.5 4 9.5M14 17h5'),
  dynasty: P('M12 3.5v5M12 8.5 7 12M12 8.5l5 3.5M7 12v4.5M17 12v4.5M4.5 20.5h5M14.5 20.5h5M7 16.5 4.5 20.5M7 16.5 9.5 20.5M17 16.5l-2.5 4M17 16.5l2.5 4M12 1.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6'),

  /* --- feature icons --- */
  timeline: P('M3 12h18M7 12V7.5M7 16.5V12M13 12V6M17 12v5.5M3 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0'),
  map: P('M9 4.5 3.5 7v12.5L9 17l6 2.5 5.5-2.5V4.5L15 7zM9 4.5V17M15 7v12.5'),
  compass: P('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M14.8 9.2l-1.6 4-4 1.6 1.6-4z'),
  compare: P('M12 3.5v17M7 7.5H3.5L6 14h3zM6 14a3 3 0 0 1-3-3M9 14a3 3 0 0 1-3-3M20.5 7.5H17l2.5 6.5h3zM19.5 14a3 3 0 0 1-3-3M22.5 14a3 3 0 0 1-3-3'),
  collection: P('M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z'),
  learn: P('M12 4 2.5 8.5 12 13l9.5-4.5zM6.5 10.8v4.4c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.4M21.5 8.5v5.5'),
  source: P('M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z'),
  graph: P('M12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M19 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M19 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6.4 6.9l3.5 2.4M17.6 6.9l-3.5 2.4M6.4 17.1l3.5-2.4M17.6 17.1l-3.5-2.4'),
  info: P('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 11v5.5M12 7.6h0'),
  home: P('M3.5 10.5 12 3.5l8.5 7M6 9v10.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9M10 20.5v-6h4v6'),
  filter: P('M3.5 6h17M6.5 12h11M10 18h4'),
  layers: P('M12 3.5 3 8l9 4.5L21 8zM3 12.5 12 17l9-4.5M3 17 12 21.5 21 17'),
  bookmark: P('M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1z'),
  sparkle: P('M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9zM18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z'),
  quote: P('M9.5 6.5C6.5 8 5 10.3 5 13.2v4.3h5.2v-5.2H8c0-1.9.6-3.4 2.4-4.4zM19 6.5c-3 1.5-4.5 3.8-4.5 6.7v4.3h5.2v-5.2h-2.2c0-1.9.6-3.4 2.4-4.4z'),
  scales: P('M12 4.5v15M8 19.5h8M6.5 8.5h11M6.5 8.5 3.5 15h6zM17.5 8.5l-3 6.5h6zM12 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3'),
  target: P('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 11.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2'),
  cards: P('M7.5 7.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 6 17V9a1.5 1.5 0 0 1 1.5-1.5zM4 15V6a1.5 1.5 0 0 1 1.5-1.5h11'),

  /* --- evidence types --- */
  evArchaeo: P('M14.5 3.5 20.5 9.5M17.5 6.5 6.8 17.2a2.4 2.4 0 0 1-3.4-3.4L14.1 3.1M3 21h7'),
  evLiterary: P('M5 4.5h9.5a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H5zM19 6.5v13M8.5 9h6M8.5 12.5h4'),
  evEpigraphic: P('M5.5 4.5h13v15h-13zM8.5 8.5h7M8.5 12h7M8.5 15.5h4'),
  evNumismatic: P('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9'),
  evLinguistic: P('M4.5 18.5 9.5 5.5l5 13M6.5 14.5h6M17 8.5c2 0 3 1.2 3 3v7M20 12.5c-3 0-4.5 1-4.5 3s1.4 2.5 2.6 2.5 1.9-.8 1.9-1.8'),
  evTradition: P('M12 3.5c-4 2.5-6 5.5-6 9a6 6 0 0 0 12 0c0-3.5-2-6.5-6-9zM9.5 14.5c.6 1.5 1.4 2.4 2.5 3 1.1-.6 1.9-1.5 2.5-3'),
  evConsensus: P('M4.5 12.5 9 17l10.5-10.5M4.5 17.5 9 22'),
  evDebate: P('M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 14 13.5H8l-4 3zM18 9.5h2a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1v3l-3.5-3H12'),
};

/**
 * Render an icon.
 * @param {string} name key from the set
 * @param {object} opts { size, cls, title }
 */
export function icon(name, { size = 20, cls = '', title = '' } = {}) {
  const body = RAW[name] || RAW.info;
  const a11y = title
    ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true"';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="${cls}" ${a11y}>${body}</svg>`;
}

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(RAW, name);

/** Icon key for an entity type. */
export const TYPE_ICON = {
  period: 'period', person: 'person', city: 'city', site: 'site',
  battle: 'battle', war: 'war', event: 'event', artefact: 'artefact',
  text: 'text', myth: 'myth', deity: 'deity', civilisation: 'civilisation',
  writing: 'writing', empire: 'empire', kingdom: 'empire', museum: 'museum',
  language: 'language', dynasty: 'dynasty', concept: 'sparkle',
};

export const EVIDENCE_ICON = {
  archaeological: 'evArchaeo', literary: 'evLiterary', epigraphic: 'evEpigraphic',
  numismatic: 'evNumismatic', linguistic: 'evLinguistic', tradition: 'evTradition',
  consensus: 'evConsensus', debate: 'evDebate',
};

/** The wordmark: a stylised Ionic column inside a laurel arc. */
export const BRAND_MARK = `
<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="1.4"/>
  <path d="M9 9.5c1.8-1.6 4.2-2.4 7-2.4s5.2.8 7 2.4" fill="none" stroke="var(--accent)"
        stroke-width="2" stroke-linecap="round"/>
  <path d="M11.5 11.5h9M12.3 11.5v9M15.1 11.5v9M17.9 11.5v9M20.7 11.5v0M19.7 11.5v9M10 21.5h12"
        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M10.5 24.5h11" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
