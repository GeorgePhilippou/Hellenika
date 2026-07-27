/* ============================================================
   Hellenika — Interactive map view
   ============================================================ */

import { el, $, $$, esc, fmtYear, throttle } from '../util.js';
import { icon } from '../icons.js';
import * as store from '../store.js';
import { TIME_MIN, TIME_MAX } from '../store.js';
import * as db from '../db.js';
import { primaryPeriodAt, periods } from '../../data/periods.js';
import { createMap } from '../components/map-canvas.js';
import { PROVIDERS } from '../components/tiles.js';
import { go, entityHref } from '../router.js';
import { entityDate, sectionHead } from '../components/ui.js';

const LAYERS = [
  ['territories', 'Political control'],
  ['cities', 'Cities'],
  ['sites', 'Sites & sanctuaries'],
  ['battles', 'Battles'],
  ['routes', 'Routes & trade'],
  ['labels', 'Place labels'],
];

const BASEMAPS = [
  ['relief', 'Terrain'],
  ['plain', 'Plain'],
  ['none', 'Vector'],
];

const JUMPS = [
  { y: -1500, label: 'Minoan peak' },
  { y: -1200, label: 'Collapse' },
  { y: -800, label: 'Colonisation' },
  { y: -480, label: 'Persian Wars' },
  { y: -431, label: 'Peloponnesian War' },
  { y: -331, label: 'Gaugamela' },
  { y: -280, label: 'Successor kingdoms' },
  { y: -31, label: 'Actium' },
];

export async function renderMap() {
  const root = el('div', { class: 'view' });

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Historical atlas</p>
          <h1>The Map</h1>
          <p class="sub">Move through time and watch political control, cities and routes change.</p>
        </div>
        <div class="row">
          <button class="btn btn-sm" id="map-aegean">Aegean</button>
          <button class="btn btn-sm" id="map-empire">Full extent</button>
        </div>
      </div>

      <div class="map-layout">
        <div>
          <div class="map-wrap">
            <canvas class="map-canvas" id="map-canvas"></canvas>
            <div class="map-era">
              <div class="y num" id="map-year"></div>
              <div class="p" id="map-period"></div>
            </div>
            <div class="map-controls">
              <button id="map-zin" aria-label="Zoom in">${icon('plus', { size: 16 })}</button>
              <button id="map-zout" aria-label="Zoom out">${icon('minus', { size: 16 })}</button>
              <button id="map-reset" aria-label="Reset view">${icon('reset', { size: 16 })}</button>
            </div>
            <div class="map-legend" id="map-legend"></div>
            <div class="tl-tip" id="map-tip"></div>
          </div>

          <div class="scrubber" style="margin-top:var(--s-4)">
            <button class="icon-btn" id="map-play" aria-label="Play through time"></button>
            <div class="track">
              <input type="range" id="map-range" min="${TIME_MIN}" max="${TIME_MAX}" step="1"
                     aria-label="Year" value="${store.get('year')}">
              <div class="ends"><span>3200 BC</span><span>30 BC</span></div>
            </div>
          </div>

          <div class="row-wrap" style="margin-top:var(--s-3)">
            <span class="small muted" style="margin-right:var(--s-2)">Jump to:</span>
            ${JUMPS.map((j) => `<button class="chip" data-year="${j.y}">${esc(j.label)}</button>`).join('')}
          </div>
        </div>

        <aside class="map-side">
          <div class="panel">
            <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Basemap</h3>
            <div class="segmented" id="map-basemap" style="width:100%">
              ${BASEMAPS.map(([k, label]) => `
                <button data-basemap="${k}" aria-pressed="${store.get('basemap') === k}" style="flex:1">${esc(label)}</button>`).join('')}
            </div>
            <p class="xs muted" style="margin-top:var(--s-3)">
              Terrain and Plain load live satellite-derived tiles (Esri, CARTO) with no
              modern borders or labels. Vector uses the built-in offline coastline.
            </p>
          </div>

          <div class="panel">
            <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Layers</h3>
            ${LAYERS.map(([k, label]) => `
              <div class="layer-row">
                <span>${esc(label)}</span>
                <button class="switch" role="switch" data-layer="${k}"
                        aria-checked="false" aria-label="${esc(label)}"></button>
              </div>`).join('')}
          </div>

          <div class="panel">
            <div class="row" style="margin-bottom:var(--s-3)">
              <h3 class="eyebrow">On the map</h3>
              <span class="small muted" id="map-count"></span>
            </div>
            <div class="map-list" id="map-list"></div>
          </div>
        </aside>
      </div>
    </div>`;

  root.__mount = () => mount(root);
  return root;
}

function mount(root) {
  const canvas = $('#map-canvas', root);
  if (!canvas) return;

  const tip = $('#map-tip', root);
  const range = $('#map-range', root);
  const legendHost = $('#map-legend', root);
  const listHost = $('#map-list', root);
  const countHost = $('#map-count', root);

  const map = createMap(canvas, {
    year: store.get('year'),
    layers: store.get('layers'),
    basemap: store.get('basemap'),
    markers: [],
    onMarkerClick: (e) => go(`/e/${e.id}`),
    onHover: (e, pos) => {
      if (!e) { tip.classList.remove('on'); return; }
      tip.innerHTML = `<div class="t">${esc(e.name)}</div>
        <div class="d">${esc(e.typeLabel)}${e.region ? ' · ' + esc(e.region) : ''}</div>
        <div class="d">${esc(entityDate(e))}</div>`;
      tip.classList.add('on');
      tip.style.left = `${Math.min(pos.x + 14, canvas.clientWidth - 260)}px`;
      tip.style.top = `${Math.min(pos.y + 14, canvas.clientHeight - 80)}px`;
    },
  });

  map.onLegend((items) => {
    // De-duplicate by name; several dated pieces can share one polity.
    const seen = new Set();
    const uniq = items.filter((i) => !seen.has(i.name) && seen.add(i.name));
    legendHost.innerHTML = uniq.slice(0, 6).map((i) =>
      `<span class="chip" style="--tint:var(--p-${i.tint})"><i class="chip-dot"></i>${esc(i.name)}</span>`
    ).join('');
  });

  /* ---------- Year ---------- */
  const yearOut = $('#map-year', root);
  const periodOut = $('#map-period', root);

  // Only place-like entities are plotted; the side list must agree with
  // the canvas or the counts look wrong.
  const PLOTTED = ['city', 'site', 'battle', 'war'];

  const refreshMarkers = throttle((y) => {
    const pts = db.mapPointsAt(y).filter((e) => PLOTTED.includes(e.type));
    map.setMarkers(pts);
    countHost.textContent = `${pts.length} ${pts.length === 1 ? 'place' : 'places'}`;
    listHost.innerHTML = pts
      .slice()
      .sort((a, b) => a.sortName.localeCompare(b.sortName))
      .slice(0, 80)
      .map((e) => `<a href="${entityHref(e.id)}">
          <i class="chip-dot" style="background:var(--p-${e.tint})"></i>
          <span>${esc(e.name)}</span>
          <span class="r">${esc(e.typeLabel)}</span>
        </a>`).join('');
  }, 140);

  const unbindYear = store.bind('year', (y) => {
    yearOut.textContent = fmtYear(y);
    const p = primaryPeriodAt(y);
    periodOut.textContent = p ? p.name : '—';
    range.value = y;
    range.style.setProperty('--fill', `${((y - TIME_MIN) / (TIME_MAX - TIME_MIN)) * 100}%`);
    map.setYear(y);
    refreshMarkers(y);
  });

  range.addEventListener('input', () => {
    store.togglePlay(false);
    store.setYear(Number(range.value));
  });

  const playBtn = $('#map-play', root);
  const unbindPlay = store.bind('playing', (p) => {
    playBtn.innerHTML = icon(p ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play through time');
  });
  playBtn.addEventListener('click', () => {
    if (!store.get('playing') && store.get('year') >= TIME_MAX - 1) store.setYear(TIME_MIN);
    store.togglePlay();
  });

  /* ---------- Jump chips ---------- */
  root.querySelectorAll('[data-year]').forEach((b) => {
    b.addEventListener('click', () => {
      store.togglePlay(false);
      store.setYear(Number(b.dataset.year));
    });
  });

  /* ---------- Layers ---------- */
  const paintLayers = (l) => {
    $$('[data-layer]', root).forEach((s) =>
      s.setAttribute('aria-checked', String(!!l[s.dataset.layer])));
    map.setLayers(l);
  };
  const unbindLayers = store.bind('layers', paintLayers);
  $$('[data-layer]', root).forEach((s) => {
    s.addEventListener('click', () => store.toggleLayer(s.dataset.layer));
  });

  /* ---------- Basemap ---------- */
  const basemapHost = $('#map-basemap', root);
  const unbindBasemap = store.bind('basemap', (id) => {
    $$('[data-basemap]', basemapHost).forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.basemap === id)));
    map.setBasemap(id);
  });
  basemapHost.addEventListener('click', (e) => {
    const b = e.target.closest('[data-basemap]'); if (!b) return;
    store.set('basemap', b.dataset.basemap);
  });

  /* ---------- View controls ---------- */
  $('#map-zin', root).addEventListener('click', () => map.zoomIn());
  $('#map-zout', root).addEventListener('click', () => map.zoomOut());
  $('#map-reset', root).addEventListener('click', () => map.reset());
  $('#map-aegean', root).addEventListener('click', () => map.focusAegean());
  $('#map-empire', root).addEventListener('click', () => map.focusEmpire());

  /* ---------- Cleanup ---------- */
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      unbindYear(); unbindPlay(); unbindLayers(); unbindBasemap();
      map.destroy();
      store.togglePlay(false);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}
