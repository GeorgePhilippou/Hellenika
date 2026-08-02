/* ============================================================
   Hellenika — Application bootstrap
   ============================================================ */

import { $, el, esc, debounce, highlight } from './util.js';
import { icon, BRAND_MARK, TYPE_ICON } from './icons.js';
import * as store from './store.js';
import { route, setNotFound, setBeforeNav, start, go, entityHref, currentRoute } from './router.js';
import * as db from './db.js';

import { renderHome } from './views/home.js';
import { renderTimeline } from './views/timeline.js';
import { renderMap } from './views/map.js';
import { renderExplore } from './views/explore.js';
import { renderMythology } from './views/mythology.js';
import { renderEntity } from './views/entity.js';
import { renderCollections, renderCollection } from './views/collections.js';
import { renderLearn, renderQuiz, renderGame } from './views/learn.js';
import { renderSources } from './views/sources.js';
import { renderAbout } from './views/about.js';
import { hydrateImages } from './components/images.js';
import { initLightbox, closeLightbox } from './components/lightbox.js';

/* ---------- Navigation model ---------- */
const NAV = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/timeline', label: 'Timeline', icon: 'timeline' },
  { path: '/map', label: 'Map', icon: 'map' },
  { path: '/explore', label: 'Explore', icon: 'compass' },
  { path: '/mythology', label: 'Mythology', icon: 'myth' },
  { path: '/sources', label: 'Sources', icon: 'source' },
  { path: '/about', label: 'About', icon: 'info' },
];

const main = $('#main');

/* ---------- Chrome ---------- */
function paintChrome() {
  $('#brand-mark').innerHTML = BRAND_MARK;
  $('#brand-mark-foot').innerHTML = BRAND_MARK;
  $('#search-icon').innerHTML = icon('search');
  $('#menu-btn').innerHTML = icon('menu');
  paintThemeToggle();

  $('#nav').innerHTML = NAV.map(
    (n) => `<a href="#${n.path}" data-path="${n.path}">${esc(n.label)}</a>`
  ).join('');

  $('#foot-stats').textContent =
    `${db.stats.entities} entities · ${db.stats.claims} claims · ${db.stats.sources} sources`;
}

function paintThemeToggle() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  $('#theme-toggle').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}

function markActiveNav(path) {
  const top = '/' + (path.split('/')[1] || '');
  for (const a of document.querySelectorAll('#nav a')) {
    const p = a.dataset.path;
    const active = p === path || (p !== '/' && top === p);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

/* ---------- Mobile menu ---------- */
let mobileSheet = null;
function toggleMobileMenu(force) {
  const open = force ?? !mobileSheet;
  if (!open) {
    mobileSheet?.remove();
    mobileSheet = null;
    $('#menu-btn').setAttribute('aria-expanded', 'false');
    return;
  }
  const scrim = el('div', { class: 'scrim', style: 'align-items:flex-end;padding:0' });
  const sheet = el('nav', {
    class: 'mobile-nav', 'aria-label': 'Menu',
    html: NAV.map((n) => `<a href="#${n.path}">${icon(n.icon, { size: 18 })}<span>${esc(n.label)}</span></a>`).join(''),
  });
  scrim.append(sheet);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) toggleMobileMenu(false); });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMobileMenu(false); });
  document.body.append(scrim);
  mobileSheet = scrim;
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  // Reflect the current route inside the sheet.
  const path = currentRoute()?.path || '/';
  sheet.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + path);
  });
}

/* ============================================================
   Command palette / global search
   ============================================================ */
let palette = null;

function openPalette(initial = '') {
  if (palette) return;

  const scrim = el('div', { class: 'scrim', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' });
  const box = el('div', { class: 'palette' });

  box.innerHTML = `
    <div class="palette-input-row">
      ${icon('search')}
      <input class="palette-input" type="search" placeholder="Search people, places, artefacts, events, myths…"
             autocomplete="off" spellcheck="false" aria-label="Search query" aria-controls="palette-results">
      <span class="kbd">esc</span>
    </div>
    <div class="palette-results" id="palette-results" role="listbox"></div>
    <div class="palette-foot">
      <span><span class="kbd">↑</span> <span class="kbd">↓</span> navigate</span>
      <span><span class="kbd">↵</span> open</span>
      <span class="spacer"></span>
      <span>${db.stats.entities} entities indexed</span>
    </div>`;

  scrim.append(box);
  document.body.append(scrim);
  document.body.style.overflow = 'hidden';
  palette = scrim;

  const input = box.querySelector('.palette-input');
  const list = box.querySelector('.palette-results');
  let results = [];
  let sel = 0;

  const draw = () => {
    const q = input.value.trim();
    results = q ? db.search(q, { limit: 24 }) : db.featured;
    sel = 0;

    if (!results.length) {
      list.innerHTML = `<div class="empty">${icon('search', { size: 40 })}
        <p>No matches for “${esc(q)}”.</p>
        <p class="xs">Try a person, place, artefact, battle or god.</p></div>`;
      return;
    }

    const label = q ? 'Results' : 'Start anywhere';
    list.innerHTML = `<div class="palette-group-label">${label}</div>` + results.map((e, i) => `
      <a class="palette-item${i === 0 ? ' sel' : ''}" href="${entityHref(e.id)}"
         role="option" aria-selected="${i === 0}" data-i="${i}"
         style="--tint:${db.tintVar(e.tint)}">
        <span class="palette-ico">${icon(TYPE_ICON[e.type] || 'sparkle', { size: 17 })}</span>
        <span class="palette-txt">
          <span class="palette-name">${highlight(e.name, q)}</span>
          <span class="palette-sub">${esc(e.typeLabel)}${e.start != null ? ' · ' + esc(dateLabel(e)) : ''}</span>
        </span>
      </a>`).join('');
  };

  const move = (d) => {
    const items = list.querySelectorAll('.palette-item');
    if (!items.length) return;
    items[sel]?.classList.remove('sel');
    items[sel]?.setAttribute('aria-selected', 'false');
    sel = (sel + d + items.length) % items.length;
    items[sel].classList.add('sel');
    items[sel].setAttribute('aria-selected', 'true');
    items[sel].scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', debounce(draw, 90));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = list.querySelectorAll('.palette-item')[sel];
      if (item) { go(item.getAttribute('href').slice(1)); closePalette(); }
    } else if (e.key === 'Escape') { closePalette(); }
  });

  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) closePalette();
    if (e.target.closest('.palette-item')) closePalette();
  });

  input.value = initial;
  draw();
  requestAnimationFrame(() => input.focus());
}

function closePalette() {
  palette?.remove();
  palette = null;
  document.body.style.overflow = '';
}

/** Short date label used in search rows and cards. */
function dateLabel(e) {
  if (e.start == null) return '';
  if (e.modern) return `${e.start}–${e.end ?? ''}`;
  const bc = (y) => `${Math.abs(Math.round(y))}`;
  if (e.end == null || e.end === e.start) return `${bc(e.start)} BC`;
  return `${bc(e.start)}–${bc(e.end)} BC`;
}

/* ============================================================
   Routes
   ============================================================ */
/**
 * Route wrapper.
 *
 * A view returns its root node and may attach a `__mount` callback for work
 * that needs the node to be in the document — measuring canvases, wiring
 * listeners, starting observers. We call it immediately after appending, so
 * it never depends on requestAnimationFrame (which browsers throttle in
 * background tabs, leaving such views blank until focused).
 */
const mount = (fn) => async (params, query) => {
  main.innerHTML = '';
  const node = await fn(params, query);
  if (!node) return;
  main.append(node);
  node.__mount?.();
  // Fire-and-forget: card glyphs and the entity hero render immediately,
  // then quietly upgrade to a photo if Wikipedia has one.
  hydrateImages(main, db.get);
};

route('/', mount(renderHome));
route('/timeline', mount(renderTimeline));
route('/timeline/:id', mount(renderTimeline));
route('/map', mount(renderMap));
route('/map/:mode', mount(renderMap));
route('/explore', mount(renderExplore));
route('/mythology', mount(renderMythology));
route('/e/:id', mount(renderEntity));
route('/collections', mount(renderCollections));
route('/collections/:id', mount(renderCollection));
route('/learn', mount(renderLearn));
route('/learn/quiz/:id', mount(renderQuiz));
route('/learn/game/:id', mount(renderGame));
route('/sources', mount(renderSources));
route('/about', mount(renderAbout));

setNotFound(async (path) => {
  main.innerHTML = `
    <div class="wrap view">
      <div class="empty">
        ${icon('compass', { size: 44 })}
        <h1 style="margin-bottom:var(--s-3)">Off the map</h1>
        <p class="lede" style="max-width:44ch;margin-inline:auto">
          Nothing here at <code>${esc(path)}</code>. The Greek world is large, but not that large.
        </p>
        <div class="row" style="justify-content:center;margin-top:var(--s-6)">
          <a class="btn btn-primary" href="#/">Return home</a>
          <button class="btn" id="nf-search">Search everything</button>
        </div>
      </div>
    </div>`;
  $('#nf-search')?.addEventListener('click', () => openPalette());
});

setBeforeNav((r) => {
  markActiveNav(r.path);
  closePalette();
  toggleMobileMenu(false);
  closeLightbox();
  document.title = 'Hellenika — The Interactive History of the Ancient Greek World';
});

/* ============================================================
   Global listeners
   ============================================================ */
function wireGlobals() {
  $('#search-trigger').addEventListener('click', () => openPalette());
  $('#theme-toggle').addEventListener('click', () => { store.toggleTheme(); paintThemeToggle(); });
  $('#menu-btn').addEventListener('click', () => toggleMobileMenu());

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

    // "/" or Cmd/Ctrl-K opens search.
    if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (palette) closePalette();
      else if (mobileSheet) toggleMobileMenu(false);
      return;
    }
    if (typing) return;

    // Single-key shortcuts for the main views.
    const jump = { t: '/timeline', m: '/map', e: '/explore', h: '/' };
    if (!e.metaKey && !e.ctrlKey && !e.altKey && jump[e.key.toLowerCase()]) {
      go(jump[e.key.toLowerCase()]);
    }
    // "r" surfaces a random entity — the discovery affordance.
    if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
      const r = db.randomEntity((x) => !x.modern);
      if (r) go(`/e/${r.id}`);
    }
  });

  // Re-render the theme icon if the OS theme changes while on auto.
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => paintThemeToggle());
}

/* ---------- Go ---------- */
store.initTheme();
paintChrome();
wireGlobals();
initLightbox();
start();

// Expose a small surface for debugging in the console.
window.Hellenika = { db, store, go, openPalette };
