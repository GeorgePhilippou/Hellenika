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
import { territories } from '../../data/geo.js';
import {
  odysseyJourney, alexanderJourney, alexanderFoundations, alexanderTerritoryStages,
} from '../../data/journeys.js';
import { createMap } from '../components/map-canvas.js';
import { createJourneyMap } from '../components/journey-map.js';
import { ensureLoaded as ensureImagesLoaded, peek as peekImage } from '../components/images.js';
import { go, entityHref } from '../router.js';
import { entityDate, sectionHead } from '../components/ui.js';

const LAYERS = [
  ['territories', 'Political control'],
  ['cities', 'Cities'],
  ['sites', 'Sites & sanctuaries'],
  ['battles', 'Battles'],
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
    intro: `This line follows the conventional reconstruction in the reference map and
      stays over navigable water. Beyond Ismarus, however, most locations are traditional
      or diagrammatic identifications rather than established geography. Select a stop
      for the episode, its connection to the voyage, and the evidence behind its placement.`,
  },
  alexander: {
    label: "Alexander's Conquest",
    config: alexanderJourney,
    intro: `Follow the campaign from Macedon to the Indus and back to Babylon.
      The shaded territory grows cumulatively as regions are conquered or submit.
      Teal diamonds mark Alexandrias and fade in as the campaign reaches their region.
      These are schematic zones of authority — a mixture of Macedonian garrisons,
      inherited satrapies, allied rulers and locally administered kingdoms, not
      modern borders or uniformly governed provinces. Ancient foundation lists are
      inconsistent, so hollow markers identify attributed or disputed Alexandrias.`,
  },
};

const TERRITORY_ENTITY_IDS = new Map([
  ['Minoan Crete', 'minoan-civilisation'],
  ['Minoan cultural sphere', 'minoan-civilisation'],
  ['Early Minoan culture', 'minoan-civilisation'],
  ['Mycenaean palace regions', 'mycenaean-civilisation'],
  ['Mycenaean Crete', 'mycenaean-civilisation'],
  ['Early Mycenaean culture', 'mycenaean-civilisation'],
  ['Early Hittite kingdom', 'hattusa-ref'],
  ['Hittite Empire', 'hattusa-ref'],
  ['Achaemenid Empire', 'achaemenid-empire'],
  ['Athenian Empire (Delian League)', 'delian-league'],
  ['Kingdom of Macedon', 'rise-of-macedon'],
  ['League of Corinth', 'league-of-corinth'],
  ['Ptolemaic control in Egypt', 'ptolemaic-kingdom'],
  ['Ptolemaic Kingdom', 'ptolemaic-kingdom'],
  ['Ptolemaic Levant', 'ptolemaic-kingdom'],
  ['Ptolemaic Cyrenaica', 'ptolemaic-kingdom'],
  ['Seleucid Empire', 'seleucid-empire'],
  ['Seleucid Empire under Antiochus III', 'seleucid-empire'],
  ['Seleucid remnant', 'seleucid-empire'],
  ['Macedon under the Successors', 'wars-of-diadochi'],
  ['Antigonid Macedon', 'hellenistic-period'],
  ['Kingdom of Pergamon', 'pergamon'],
  ['Greco-Bactrian Kingdom', 'ai-khanoum'],
  ['New Kingdom Egypt', 'waset-thebes'],
  ['Neo-Babylonian Empire', 'babylon'],
]);

function territoryProfileId(territory) {
  if (!territory) return null;
  if (territory.entityId && db.get(territory.entityId)) return territory.entityId;
  if (territory.name?.startsWith("Alexander's empire")) return 'alexander-empire';
  if (territory.name?.startsWith('Roman ')) return 'roman-conquest';
  return TERRITORY_ENTITY_IDS.get(territory.name) ?? null;
}

function hoverProfileEntity(e) {
  if (!e) return null;
  if (e.entityId) return db.get(e.entityId);
  const directEntity = db.get(e.id);
  if (directEntity) return directEntity;
  const id = territoryProfileId(e);
  return id ? db.get(id) : null;
}

function resolveStops(config) {
  return config
    .map((s) => {
      const e = db.get(s.id);
      if (!e || !e.coords) return null;
      return {
        ...s,
        name: s.label || e.name,
        coords: s.mapCoords || e.coords,
        tint: e.tint,
        typeLabel: e.typeLabel,
        entity: e,
      };
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
          <p class="sub" id="map-sub">Move through time and watch regions, cities and archaeological sites change.</p>
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
  let modeEvents = null;
  let mode = 'historical';

  function teardown() {
    unbindYear?.(); unbindPlay?.(); unbindLayers?.(); unbindBasemap?.();
    unbindYear = unbindPlay = unbindLayers = unbindBasemap = null;
    modeEvents?.abort();
    modeEvents = null;
    map?.destroy();
    map = null;
    tip.classList.remove('on');
  }

  function setMode(next, { updateUrl = true } = {}) {
    teardown();
    mode = next;
    modeEvents = new AbortController();
    root.classList.toggle('is-odyssey', mode === 'odyssey');
    root.classList.toggle('is-guided-journey', mode !== 'historical');

    $$('[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));

    if (mode === 'historical') {
      $('#map-eyebrow', root).textContent = 'Historical atlas';
      $('#map-title', root).textContent = 'The Map';
      $('#map-sub', root).textContent = 'Move through time and watch regions, cities and archaeological sites change.';
      introHost.innerHTML = '';
      mountHistorical();
    } else {
      const j = JOURNEYS[mode];
      $('#map-eyebrow', root).textContent = 'Narrative atlas';
      $('#map-title', root).textContent = j.label;
      $('#map-sub', root).textContent = mode === 'odyssey'
        ? 'Numbered places from the poem and its later geographical traditions.'
        : 'The principal places of the campaign and the territories Alexander controlled.';
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
    const signal = modeEvents.signal;
    viewControlsHost.innerHTML = `
      <button class="btn btn-sm" id="map-aegean">Aegean</button>
      <button class="btn btn-sm" id="map-east-med">Eastern Med</button>
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
    let hoverSequence = 0;
    let hoverHideTimer = null;

    legendHost.innerHTML = `
      <div class="map-key" aria-label="Map key">
        <span><i class="map-key-area solid"></i>polity</span>
        <span><i class="map-key-area dashed"></i>culture / league</span>
        <span><i class="map-key-point city"></i>city</span>
        <span><i class="map-key-point site"></i>site</span>
      </div>`;

    const hideHoverTip = () => {
      hoverSequence += 1;
      tip.classList.remove('on', 'with-media', 'interactive');
    };

    const paintHoverTip = (e, pos, profile = null, image = null) => {
      const date = entityDate(e);
      const qualifier = e.certainty === 'debated' ? ' · debated reconstruction'
        : e.certainty === 'schematic' ? ' · schematic boundary'
        : '';
      const summary = profile?.summary?.trim();
      tip.innerHTML = `
        ${image?.src ? `<div class="tl-tip-media"><img src="${esc(image.src)}" alt=""></div>` : ''}
        <div class="tl-tip-body">
          <div class="t">${esc(e.name)}</div>
          <div class="d">${esc(e.typeLabel)}${e.region ? ' · ' + esc(e.region) : ''}${esc(qualifier)}</div>
          ${date ? `<div class="d">${esc(date)}</div>` : ''}
          ${summary ? `<div class="map-tip-summary">${esc(summary)}</div>` : ''}
          ${profile ? `<a class="map-tip-link" href="${entityHref(profile.id)}">
            Open ${esc(profile.name)} ${icon('arrowRight', { size: 13 })}
          </a>` : ''}
        </div>`;
      tip.classList.toggle('with-media', Boolean(image?.src));
      tip.classList.toggle('interactive', Boolean(profile));
      tip.classList.add('on');
      const estimatedHeight = summary ? 220 : image?.src ? 150 : 90;
      tip.style.left = `${Math.max(8, Math.min(pos.x + 14, canvas.clientWidth - 354))}px`;
      tip.style.top = `${Math.max(8, Math.min(pos.y + 14, canvas.clientHeight - estimatedHeight))}px`;
    };

    const hMap = createMap(canvas, {
      year: store.get('year'),
      layers: { ...store.get('layers'), routes: false },
      basemap: store.get('basemap'),
      markers: [],
      onMarkerClick: (e) => go(`/e/${e.id}`),
      territoryEntityId: territoryProfileId,
      onTerritoryClick: (_territory, entityId) => go(`/e/${entityId}`),
      onHover: (e, pos) => {
        const sequence = ++hoverSequence;
        clearTimeout(hoverHideTimer);
        if (!e) {
          hoverHideTimer = setTimeout(() => {
            if (!tip.matches(':hover')) hideHoverTip();
          }, 160);
          return;
        }
        const profile = hoverProfileEntity(e);
        const cached = profile ? peekImage(profile) : null;
        paintHoverTip(e, pos, profile, cached);
        if (!profile || cached?.src) return;
        ensureImagesLoaded([profile]).then(() => {
          if (sequence !== hoverSequence) return;
          const loaded = peekImage(profile);
          if (loaded?.src) paintHoverTip(e, pos, profile, loaded);
        });
      },
    });
    tip.addEventListener('pointerenter', () => clearTimeout(hoverHideTimer), { signal });
    tip.addEventListener('pointerleave', hideHoverTip, { signal });
    map = hMap;

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
    }, { signal });

    const playBtn = $('#map-play', root);
    unbindPlay = store.bind('playing', (p) => {
      playBtn.innerHTML = icon(p ? 'pause' : 'play');
      playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play through time');
    });
    playBtn.addEventListener('click', () => {
      if (!store.get('playing') && store.get('year') >= TIME_MAX - 1) store.setYear(TIME_MIN);
      store.togglePlay();
    }, { signal });

    root.querySelectorAll('[data-year]').forEach((b) => {
      b.addEventListener('click', () => {
        store.togglePlay(false);
        store.setYear(Number(b.dataset.year));
      }, { signal });
    });

    const paintLayers = (l) => {
      $$('[data-layer]', root).forEach((s) =>
        s.setAttribute('aria-checked', String(!!l[s.dataset.layer])));
      hMap.setLayers({ ...l, routes: false });
    };
    unbindLayers = store.bind('layers', paintLayers);
    $$('[data-layer]', root).forEach((s) => {
      s.addEventListener('click', () => store.toggleLayer(s.dataset.layer), { signal });
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
    }, { signal });

    $('#map-zin', root).addEventListener('click', () => hMap.zoomIn(), { signal });
    $('#map-zout', root).addEventListener('click', () => hMap.zoomOut(), { signal });
    $('#map-reset', root).addEventListener('click', () => hMap.reset(), { signal });
    $('#map-aegean', root).addEventListener('click', () => hMap.focusAegean(), { signal });
    $('#map-east-med', root).addEventListener('click', () => hMap.focusEasternMediterranean(), { signal });
    $('#map-empire', root).addEventListener('click', () => hMap.focusEmpire(), { signal });
  }

  /* ============================================================
     Journey modes (Odysseus / Alexander)
     ============================================================ */
  function mountJourney(which) {
    const signal = modeEvents.signal;
    viewControlsHost.innerHTML = '';
    legendHost.innerHTML = which === 'alexander'
      ? `<div class="map-key" aria-label="Alexander campaign map key">
          <span><i class="map-key-foundation attested"></i>attested Alexandria</span>
          <span><i class="map-key-foundation attributed"></i>attributed / disputed</span>
          <small>Foundations appear as the campaign advances</small>
        </div>`
      : '';
    scrubberHost.innerHTML = '';

    const stops = resolveStops(JOURNEYS[which].config);
    const guided = true;
    const territoryList = which === 'alexander'
      ? alexanderTerritoryStages
        .map((stage) => {
          const territory = territories.find((candidate) => candidate.id === stage.id);
          return territory ? { ...territory, ...stage } : null;
        })
        .filter(Boolean)
      : [];
    let selectedStop = stops[0] || null;

    eraHost.innerHTML = `
      <div class="y" style="font-size:1.1rem">${esc(JOURNEYS[which].label)}</div>
      <div class="p" id="journey-progress">${stops.length} stops</div>`;

    sideHost.innerHTML = guided
      ? `<div class="panel journey-card-panel" id="journey-card" aria-live="polite"></div>`
      : `<div class="panel journey-list-panel">
          <h3 class="eyebrow" style="margin-bottom:var(--s-3)">The journey</h3>
          <div class="journey-stops" id="journey-stops">
            ${stops.map((s) => `
              <button class="journey-stop${s.order === 1 ? ' active' : ''}" data-stop="${esc(s.id)}"
                      style="--tint:var(--p-${s.tint})" aria-current="${s.order === 1 ? 'step' : 'false'}">
                <span class="journey-stop-n">${s.order}</span>
                <span class="journey-stop-body">
                  <span class="journey-stop-name">${esc(s.name)}</span>
                  <span class="journey-stop-note">${esc(s.note)}</span>
                </span>
                <a class="journey-stop-open" href="${entityHref(s.id)}" aria-label="Open full profile for ${esc(s.name)}" title="Open full profile">${icon('arrowRight', { size: 14 })}</a>
              </button>`).join('')}
          </div>
        </div>`;

    function stopCardHTML(s) {
      if (!s) return '';
      const isAlexander = which === 'alexander';
      const prose = (text) => String(text || '')
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph) => `<p>${esc(paragraph)}</p>`)
        .join('');
      const image = peekImage(s.entity);
      const media = image?.src
        ? `<a class="journey-card-media" href="${esc(image.page)}" target="_blank" rel="noopener noreferrer"
              aria-label="Open image source for ${esc(s.name)}">
             <img src="${esc(image.src)}" alt="" loading="eager" decoding="async">
             <span>Wikipedia ↗</span>
           </a>`
        : `<div class="journey-card-media is-placeholder">${icon(isAlexander ? 'map' : 'myth', { size: 34 })}</div>`;
      return `
        ${media}
        <div class="journey-card-kicker">Stop ${s.order} of ${stops.length}</div>
        <h3>${esc(s.name)}</h3>
        <p class="journey-card-note">${esc(s.note)}</p>
        <div class="journey-card-actions">
          <button class="btn btn-sm" data-journey-prev ${s.order === 1 ? 'disabled' : ''}>
            ${icon('arrowLeft', { size: 14 })} ${isAlexander ? 'Previous stage' : 'Previous'}
          </button>
          ${s.order === stops.length
            ? `<button class="btn btn-sm btn-primary" disabled>
                 ${icon('check', { size: 14 })} ${isAlexander ? 'Campaign complete' : 'Journey complete'}
               </button>`
            : `<button class="btn btn-sm btn-primary" data-journey-next>
                 ${isAlexander ? 'Continue campaign' : 'Sail onward'} ${icon('arrowRight', { size: 14 })}
               </button>`}
          <a class="btn btn-sm" href="${entityHref(s.id)}">Full entry</a>
        </div>
        <div class="journey-card-section">
          <h4>${isAlexander ? 'Campaign stage' : 'The episode'}</h4>
          ${prose(s.entity.myth || s.entity.body || s.entity.summary)}
        </div>
        <div class="journey-card-section">
          <h4>${isAlexander ? 'How the campaign connects' : 'How this stop connects'}</h4>
          ${prose(s.connection || s.entity.summary)}
        </div>
        <div class="journey-card-section">
          <h4>${isAlexander ? 'Change in control' : 'Geography and evidence'}</h4>
          ${prose(isAlexander ? s.control : (s.entity.historicalBackground || s.entity.summary))}
          ${!isAlexander && s.entity.archaeology ? prose(s.entity.archaeology) : ''}
        </div>
        ${isAlexander && s.entity.claims?.length ? `
          <div class="journey-card-section">
            <h4>Evidence at this stage</h4>
            <ul class="journey-card-claims">
              ${s.entity.claims.slice(0, 3).map((claim) => `
                <li>
                  <span>${esc(claim.text)}</span>
                  <small>${esc(claim.evidence)} · ${esc(claim.confidence)}</small>
                </li>`).join('')}
            </ul>
          </div>` : ''}
        <div class="journey-card-meta">
          <span><strong>Map placement:</strong> ${esc(
            s.mapPlacement || s.entity.region || (isAlexander ? 'Campaign route point' : 'Traditional location'),
          )}</span>
          ${s.mapCoords ? `<span><strong>Profile identification:</strong> ${esc(s.entity.region)}</span>` : ''}
          ${isAlexander
            ? `<span><strong>Campaign date:</strong> ${esc(fmtYear(s.year || s.entity.start))}</span>
               <span><strong>Referenced sources:</strong> ${s.entity.sources?.length || 0}</span>`
            : (s.entity.earliestSource ? `<span><strong>Primary text:</strong> ${esc(s.entity.earliestSource)}</span>` : '')}
        </div>`;
    }

    function renderStopCard() {
      const card = $('#journey-card', root);
      if (card) card.innerHTML = stopCardHTML(selectedStop);
      const progress = $('#journey-progress', root);
      if (progress && selectedStop) progress.textContent = `Stop ${selectedStop.order} of ${stops.length}`;
    }

    function selectStop(s, { travel = true } = {}) {
      if (!s) return;
      selectedStop = s;
      $$('.journey-stop', root).forEach((button) => {
        const active = button.dataset.stop === s.id;
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'step' : 'false');
        if (active) button.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      renderStopCard();
      if (travel) {
        guided ? jMap.travelTo(s.key || s.id) : jMap.focusStop(s.key || s.id);
      }
    }

    const jMap = createJourneyMap(canvas, {
      stops,
      territories: territoryList,
      foundations: which === 'alexander' ? alexanderFoundations : [],
      basemap: 'relief',
      locked: guided,
      showRoute: true,
      traveller: which === 'alexander' ? 'standard' : 'ship',
      onStopClick: (s) => guided ? selectStop(s) : go(`/e/${s.id}`),
      onTravelStart: (s) => {
        const progress = $('#journey-progress', root);
        if (progress) {
          progress.textContent = `${which === 'alexander' ? 'Advancing' : 'Sailing'} to stop ${s.order}…`;
        }
      },
      onTravelEnd: (s) => {
        const progress = $('#journey-progress', root);
        if (progress) progress.textContent = `Stop ${s.order} of ${stops.length}`;
      },
      onHover: (s, pos) => {
        if (!s) { tip.classList.remove('on'); return; }
        tip.innerHTML = s.kind === 'foundation'
          ? `<div class="t">${esc(s.name)}</div>
             <div class="d">${esc(fmtYear(s.year))} · ${esc(
               s.status === 'attested' ? 'attested foundation' : `${s.status} identification`,
             )}</div>
             <div class="d">${esc(s.note)}</div>`
          : `<div class="t">${esc(s.name)}</div>
             <div class="d">Stop ${s.order} of ${stops.length}</div>
             <div class="d">${esc(s.note)}</div>`;
        tip.classList.add('on');
        tip.style.left = `${Math.min(pos.x + 14, canvas.clientWidth - 260)}px`;
        tip.style.top = `${Math.min(pos.y + 14, canvas.clientHeight - (s.kind === 'foundation' ? 132 : 80))}px`;
      },
    });
    map = jMap;
    renderStopCard();
    if (guided) {
      ensureImagesLoaded(stops.map((s) => s.entity)).then(() => renderStopCard());
    }

    $('#journey-stops', root)?.addEventListener('click', (e) => {
      const link = e.target.closest('.journey-stop-open');
      if (link) return; // let the profile link navigate normally
      const btn = e.target.closest('[data-stop]');
      if (!btn) return;
      e.preventDefault();
      selectStop(stops.find((s) => s.id === btn.dataset.stop));
    }, { signal });

    if (guided) {
      sideHost.addEventListener('click', (e) => {
        const prev = e.target.closest('[data-journey-prev]');
        const next = e.target.closest('[data-journey-next]');
        if (!prev && !next) return;
        const index = stops.findIndex((s) => (s.key || s.id) === (selectedStop?.key || selectedStop?.id));
        selectStop(stops[index + (next ? 1 : -1)]);
      }, { signal });
    } else {
      $('#map-zin', root).addEventListener('click', () => jMap.zoomIn(), { signal });
      $('#map-zout', root).addEventListener('click', () => jMap.zoomOut(), { signal });
      $('#map-reset', root).addEventListener('click', () => jMap.reset(), { signal });
    }
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
