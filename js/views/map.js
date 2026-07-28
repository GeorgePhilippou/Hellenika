/* ============================================================
   Hellenika — Interactive map view
   Three modes on one canvas area: the historical time-scrubbed
   map, and two fixed narrative journeys (Odysseus, Alexander).
   ============================================================ */

import { el, $, $$, esc, fmtYear, throttle } from '../util.js';
import { icon } from '../icons.js';
import * as store from '../store.js';
import { TIME_MIN, TIME_MAX } from '../store.js';
import * as db from '../db.js';
import { primaryPeriodAt, periods } from '../../data/periods.js';
import { routesAt, territories } from '../../data/geo.js';
import { odysseyJourney, alexanderJourney, alexanderTerritoryIds } from '../../data/journeys.js';
import { createMap } from '../components/map-canvas.js';
import { createJourneyMap } from '../components/journey-map.js';
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
  ['none', 'Atlas'],
  ['relief', 'Terrain'],
  ['plain', 'Plain'],
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

const MODES = [
  ['historical', 'Historical'],
  ['odyssey', "Odysseus's Journey"],
  ['alexander', "Alexander's Conquest"],
];

const JOURNEYS = {
  odyssey: {
    label: "Odysseus's Journey",
    config: odysseyJourney,
    intro: `Homer's own geography is deliberately non-literal once Odysseus leaves the Greek
      mainland — the poem places Aeolia on a floating island and the entrance to the
      Underworld at the edge of Ocean itself. Every stop below past Ismarus uses a
      <strong>traditional</strong> real-world identification proposed since antiquity —
      never an established one. Each stop's own page tags exactly how confident that
      identification is, from "probable" down to "legendary".`,
  },
  alexander: {
    label: "Alexander's Conquest",
    config: alexanderJourney,
    intro: null,
  },
};

function resolveStops(config) {
  return config
    .map((s) => {
      const e = db.get(s.id);
      if (!e || !e.coords) return null;
      return { ...s, name: e.name, coords: e.coords, tint: e.tint, typeLabel: e.typeLabel, entity: e };
    })
    .filter(Boolean);
}

export async function renderMap(params) {
  const root = el('div', { class: 'view' });
  const initialMode = ['odyssey', 'alexander'].includes(params?.mode) ? params.mode : 'historical';

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow" id="map-eyebrow">Historical atlas</p>
          <h1 id="map-title">The Map</h1>
          <p class="sub" id="map-sub">Move through time and watch political control, cities and routes change.</p>
        </div>
        <div class="row" id="map-view-controls"></div>
      </div>

      <div class="segmented" id="map-mode-switch" style="margin-bottom:var(--s-6)">
        ${MODES.map(([k, label]) => `<button data-mode="${k}" aria-pressed="${k === initialMode}">${esc(label)}</button>`).join('')}
      </div>

      <div id="map-journey-intro"></div>

      <div class="map-layout">
        <div>
          <div class="map-wrap">
            <canvas class="map-canvas" id="map-canvas"></canvas>
            <div class="map-era" id="map-era-host"></div>
            <div class="map-controls">
              <button id="map-zin" aria-label="Zoom in">${icon('plus', { size: 16 })}</button>
              <button id="map-zout" aria-label="Zoom out">${icon('minus', { size: 16 })}</button>
              <button id="map-reset" aria-label="Reset view">${icon('reset', { size: 16 })}</button>
            </div>
            <div class="map-legend" id="map-legend"></div>
            <div class="tl-tip" id="map-tip"></div>
          </div>

          <div id="map-scrubber-host"></div>
        </div>

        <aside class="map-side" id="map-side-host"></aside>
      </div>
    </div>`;

  root.__mount = () => mount(root, initialMode);
  return root;
}

function mount(root, initialMode) {
  const canvas = $('#map-canvas', root);
  if (!canvas) return;

  const tip = $('#map-tip', root);
  const legendHost = $('#map-legend', root);
  const eraHost = $('#map-era-host', root);
  const scrubberHost = $('#map-scrubber-host', root);
  const sideHost = $('#map-side-host', root);
  const introHost = $('#map-journey-intro', root);
  const viewControlsHost = $('#map-view-controls', root);

  let map = null;
  let unbindYear = null, unbindPlay = null, unbindLayers = null, unbindBasemap = null;
  let mode = 'historical';

  function teardown() {
    unbindYear?.(); unbindPlay?.(); unbindLayers?.(); unbindBasemap?.();
    unbindYear = unbindPlay = unbindLayers = unbindBasemap = null;
    map?.destroy();
    map = null;
    tip.classList.remove('on');
  }

  function setMode(next, { updateUrl = true } = {}) {
    teardown();
    mode = next;

    $$('[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));

    if (mode === 'historical') {
      $('#map-eyebrow', root).textContent = 'Historical atlas';
      $('#map-title', root).textContent = 'The Map';
      $('#map-sub', root).textContent = 'Move through time and watch political control, cities and routes change.';
      introHost.innerHTML = '';
      mountHistorical();
    } else {
      const j = JOURNEYS[mode];
      $('#map-eyebrow', root).textContent = 'Narrative atlas';
      $('#map-title', root).textContent = j.label;
      $('#map-sub', root).textContent = mode === 'odyssey'
        ? 'A fixed, numbered sequence — not a moment in time.'
        : "The path of his campaign, and the land it left him ruling.";
      introHost.innerHTML = j.intro
        ? `<div class="callout" style="--tint:var(--p-mycenaean);margin-bottom:var(--s-6)">
            <h3 class="eyebrow" style="margin-bottom:var(--s-2)">Reading this map</h3>
            <p>${j.intro}</p>
          </div>` : '';
      mountJourney(mode);
    }

    if (updateUrl) go(mode === 'historical' ? '/map' : `/map/${mode}`, { replace: true });
  }

  /* ============================================================
     Historical mode
     ============================================================ */
  function mountHistorical() {
    viewControlsHost.innerHTML = `
      <button class="btn btn-sm" id="map-aegean">Aegean</button>
      <button class="btn btn-sm" id="map-empire">Full extent</button>`;
    eraHost.innerHTML = `
      <div class="y num" id="map-year"></div>
      <div class="p" id="map-period"></div>
      <div class="s" id="map-period-note"></div>`;
    scrubberHost.innerHTML = `
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
      </div>`;
    sideHost.innerHTML = `
      <div class="panel">
        <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Basemap</h3>
        <div class="segmented" id="map-basemap" style="width:100%">
          ${BASEMAPS.map(([k, label]) => `
            <button data-basemap="${k}" aria-pressed="${store.get('basemap') === k}" style="flex:1">${esc(label)}</button>`).join('')}
        </div>
        <p class="xs muted" style="margin-top:var(--s-3)">
          Atlas is a hand-drawn historical style, built entirely offline. Terrain
          and Plain load live satellite-derived tiles (Esri, CARTO) instead, with
          no modern borders or labels.
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
      </div>`;

    const listHost = $('#map-list', root);
    const countHost = $('#map-count', root);
    const range = $('#map-range', root);

    const hMap = createMap(canvas, {
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
    map = hMap;

    hMap.onLegend((items) => {
      const seen = new Set();
      const uniqTerritories = items.filter((i) => !seen.has(i.name) && seen.add(i.name)).slice(0, 4);
      const territoryHTML = uniqTerritories.map((i) =>
        `<span class="chip" style="--tint:var(--p-${i.tint})"><i class="chip-dot"></i>${esc(i.name)}</span>`
      ).join('');

      let routeHTML = '';
      if (store.get('layers').routes) {
        routeHTML = routesAt(store.get('year')).slice(0, 3).map((r) =>
          `<span class="chip" style="--tint:var(${r.dashed ? '--route-trade' : '--route-campaign'})"><i class="chip-dot"></i>${esc(r.name)}${r.dashed ? ' <span class="muted">· trade</span>' : ''}</span>`
        ).join('');
      }
      legendHost.innerHTML = territoryHTML + routeHTML;
    });

    const yearOut = $('#map-year', root);
    const periodOut = $('#map-period', root);
    const periodNoteOut = $('#map-period-note', root);
    const PLOTTED = ['city', 'site', 'battle', 'war'];

    const refreshMarkers = throttle((y) => {
      const pts = db.mapPointsAt(y).filter((e) => PLOTTED.includes(e.type));
      hMap.setMarkers(pts);
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

    unbindYear = store.bind('year', (y) => {
      yearOut.textContent = fmtYear(y);
      const p = primaryPeriodAt(y);
      periodOut.textContent = p ? p.name : '—';
      periodNoteOut.textContent = p?.summary || '';
      range.value = y;
      range.style.setProperty('--fill', `${((y - TIME_MIN) / (TIME_MAX - TIME_MIN)) * 100}%`);
      hMap.setYear(y);
      refreshMarkers(y);
    });

    range.addEventListener('input', () => {
      store.togglePlay(false);
      store.setYear(Number(range.value));
    });

    const playBtn = $('#map-play', root);
    unbindPlay = store.bind('playing', (p) => {
      playBtn.innerHTML = icon(p ? 'pause' : 'play');
      playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play through time');
    });
    playBtn.addEventListener('click', () => {
      if (!store.get('playing') && store.get('year') >= TIME_MAX - 1) store.setYear(TIME_MIN);
      store.togglePlay();
    });

    root.querySelectorAll('[data-year]').forEach((b) => {
      b.addEventListener('click', () => {
        store.togglePlay(false);
        store.setYear(Number(b.dataset.year));
      });
    });

    const paintLayers = (l) => {
      $$('[data-layer]', root).forEach((s) =>
        s.setAttribute('aria-checked', String(!!l[s.dataset.layer])));
      hMap.setLayers(l);
    };
    unbindLayers = store.bind('layers', paintLayers);
    $$('[data-layer]', root).forEach((s) => {
      s.addEventListener('click', () => store.toggleLayer(s.dataset.layer));
    });

    const basemapHost = $('#map-basemap', root);
    unbindBasemap = store.bind('basemap', (id) => {
      $$('[data-basemap]', basemapHost).forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.basemap === id)));
      hMap.setBasemap(id);
    });
    basemapHost.addEventListener('click', (e) => {
      const b = e.target.closest('[data-basemap]'); if (!b) return;
      store.set('basemap', b.dataset.basemap);
    });

    $('#map-zin', root).addEventListener('click', () => hMap.zoomIn());
    $('#map-zout', root).addEventListener('click', () => hMap.zoomOut());
    $('#map-reset', root).addEventListener('click', () => hMap.reset());
    $('#map-aegean', root).addEventListener('click', () => hMap.focusAegean());
    $('#map-empire', root).addEventListener('click', () => hMap.focusEmpire());
  }

  /* ============================================================
     Journey modes (Odysseus / Alexander)
     ============================================================ */
  function mountJourney(which) {
    viewControlsHost.innerHTML = '';
    legendHost.innerHTML = '';
    scrubberHost.innerHTML = '';

    const stops = resolveStops(JOURNEYS[which].config);
    const territoryList = which === 'alexander'
      ? territories.filter((t) => alexanderTerritoryIds.includes(t.id))
      : [];

    eraHost.innerHTML = `
      <div class="y" style="font-size:1.1rem">${esc(JOURNEYS[which].label)}</div>
      <div class="p">${stops.length} stops</div>`;

    sideHost.innerHTML = `
      <div class="panel">
        <h3 class="eyebrow" style="margin-bottom:var(--s-3)">The journey</h3>
        <div class="journey-stops" id="journey-stops">
          ${stops.map((s) => `
            <button class="journey-stop" data-stop="${esc(s.id)}" style="--tint:var(--p-${s.tint})">
              <span class="journey-stop-n">${s.order}</span>
              <span class="journey-stop-body">
                <span class="journey-stop-name">${esc(s.name)}</span>
                <span class="journey-stop-note">${esc(s.note)}</span>
              </span>
              <a class="journey-stop-open" href="${entityHref(s.id)}" aria-label="Open full profile for ${esc(s.name)}" title="Open full profile">${icon('arrowRight', { size: 14 })}</a>
            </button>`).join('')}
        </div>
      </div>`;

    const jMap = createJourneyMap(canvas, {
      stops,
      territories: territoryList,
      basemap: 'relief',
      onStopClick: (s) => go(`/e/${s.id}`),
      onHover: (s, pos) => {
        if (!s) { tip.classList.remove('on'); return; }
        tip.innerHTML = `<div class="t">${esc(s.name)}</div>
          <div class="d">Stop ${s.order} of ${stops.length}</div>
          <div class="d">${esc(s.note)}</div>`;
        tip.classList.add('on');
        tip.style.left = `${Math.min(pos.x + 14, canvas.clientWidth - 260)}px`;
        tip.style.top = `${Math.min(pos.y + 14, canvas.clientHeight - 80)}px`;
      },
    });
    map = jMap;

    $('#journey-stops', root).addEventListener('click', (e) => {
      const link = e.target.closest('.journey-stop-open');
      if (link) return; // let the profile link navigate normally
      const btn = e.target.closest('[data-stop]');
      if (!btn) return;
      e.preventDefault();
      $$('.journey-stop', root).forEach((b) => b.classList.toggle('active', b === btn));
      jMap.focusStop(btn.dataset.stop);
    });

    $('#map-zin', root).addEventListener('click', () => jMap.zoomIn());
    $('#map-zout', root).addEventListener('click', () => jMap.zoomOut());
    $('#map-reset', root).addEventListener('click', () => jMap.reset());
  }

  setMode(initialMode, { updateUrl: false });

  $('#map-mode-switch', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b || b.dataset.mode === mode) return;
    setMode(b.dataset.mode);
  });

  /* ---------- Cleanup ---------- */
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      teardown();
      store.togglePlay(false);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}
