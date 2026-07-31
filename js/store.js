/* ============================================================
   Hellenika — Application state
   A minimal observable store. Views subscribe to the keys they care
   about, so a year-slider drag never re-renders unrelated chrome.
   ============================================================ */

import { emitter, store as persist, clamp } from './util.js';

export const TIME_MIN = -3200;
export const TIME_MAX = -30;

const bus = emitter();

const state = {
  /** Current year on the global time scrubber (signed; negative = BC). */
  year: persist.get('year', -450),
  /** Whether the timeline/map is auto-playing through time. */
  playing: false,
  /** Playback speed in years per second. */
  speed: 40,
  /** 'light' | 'dark' */
  theme: persist.get('theme', null),
  /** Saved entity ids. */
  bookmarks: persist.get('bookmarks', []),
  /** Recently viewed entity ids, most recent first. */
  recent: persist.get('recent', []),
  /** Learning-mode progress: { [quizId]: {best, attempts} } */
  progress: persist.get('progress', {}),
  /** Map layer toggles. */
  layers: persist.get('layers', {
    territories: true, cities: true, sites: true, battles: true,
    artefacts: true, routes: true, labels: true,
  }),
  /** Map basemap for the historical map view — 'plain' is the only
      option now (an accent-tinted CARTO basemap); 'relief' still exists
      in js/components/tiles.js and is used directly by the guided
      Odyssey/Alexander journey maps, just not offered as a choice here. */
  basemap: persist.get('basemap', 'plain'),
};

/* ---------- Read ---------- */
export const get = (key) => state[key];

/* ---------- Write ---------- */
const PERSISTED = new Set(['year', 'theme', 'bookmarks', 'recent', 'progress', 'layers', 'basemap']);

export function set(key, value) {
  const prev = state[key];
  if (prev === value) return;
  state[key] = value;
  if (PERSISTED.has(key)) persist.set(key, value);
  bus.emit(key, value);
  bus.emit('*', { key, value, prev });
}

export const on = (key, fn) => bus.on(key, fn);

/** Subscribe and fire immediately with the current value. */
export function bind(key, fn) {
  fn(state[key]);
  return bus.on(key, fn);
}

/* ---------- Time ---------- */

export function setYear(y) {
  set('year', clamp(Math.round(y), TIME_MIN, TIME_MAX));
}

let playRaf = null, lastTick = 0;

export function togglePlay(force) {
  const next = force ?? !state.playing;
  if (next === state.playing) return;
  set('playing', next);
  if (next) {
    lastTick = performance.now();
    const tick = (now) => {
      if (!state.playing) return;
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const y = state.year + state.speed * dt;
      if (y >= TIME_MAX) { setYear(TIME_MAX); togglePlay(false); return; }
      setYear(y);
      playRaf = requestAnimationFrame(tick);
    };
    playRaf = requestAnimationFrame(tick);
  } else if (playRaf) {
    cancelAnimationFrame(playRaf);
    playRaf = null;
  }
}

/* ---------- Theme ---------- */

function applyTheme(theme) {
  const t = theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'dark' ? '#12110f' : '#fbfaf7');
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  set('theme', next);
  applyTheme(next);
}

export function initTheme() {
  applyTheme(state.theme);
  // Follow the OS only while the user has not made an explicit choice.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme == null) applyTheme(null);
  });
}

/* ---------- Bookmarks ---------- */

export function toggleBookmark(id) {
  const list = state.bookmarks;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  set('bookmarks', next);
  return next.includes(id);
}
export const isBookmarked = (id) => state.bookmarks.includes(id);

/* ---------- Recently viewed ---------- */

export function pushRecent(id) {
  const next = [id, ...state.recent.filter((x) => x !== id)].slice(0, 24);
  set('recent', next);
}

/* ---------- Learning progress ---------- */

export function recordScore(quizId, score, total) {
  const p = { ...state.progress };
  const prev = p[quizId] || { best: 0, attempts: 0 };
  p[quizId] = {
    best: Math.max(prev.best, score),
    total,
    attempts: prev.attempts + 1,
    last: score,
  };
  set('progress', p);
}

/* ---------- Map layers ---------- */

export function toggleLayer(name) {
  set('layers', { ...state.layers, [name]: !state.layers[name] });
}
