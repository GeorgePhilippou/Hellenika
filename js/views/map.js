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
import { primaryPeriodAt } from '../../data/periods.js';
import { territories } from '../../data/geo.js';
import {
  odysseyJourney, alexanderJourney, alexanderFoundations, alexanderTerritoryStages,
} from '../../data/journeys.js';
import { createMap } from '../components/map-canvas.js';
import { createJourneyMap } from '../components/journey-map.js';
import { ensureLoaded as ensureImagesLoaded, peek as peekImage } from '../components/images.js';
import { go, entityHref } from '../router.js';
import { entityDate } from '../components/ui.js';

const LAYERS = [
  ['territories', 'Political & cultural regions'],
  ['routes', 'Routes & campaigns'],
  ['cities', 'Cities'],
  ['sites', 'Sites & sanctuaries'],
  ['battles', 'Battles & events'],
  ['artefacts', 'Artefacts'],
  ['labels', 'Place labels'],
];

const TERRITORY_COLOUR_LABELS = new Map([
  ['earlybronze', 'Early Bronze Age cultures and states'],
  ['minoan', 'Middle Bronze Age regions'],
  ['mycenaean', 'Mycenaean-era regions'],
  ['collapse', 'Late Bronze Age powers'],
  ['darkage', 'Early Iron Age regions'],
  ['archaic', 'Archaic and Achaemenid powers'],
  ['classical', 'Classical Greek powers'],
  ['macedon', 'Macedonian and allied powers'],
  ['alexander', "Alexander's empire"],
  ['hellenistic', 'Hellenistic kingdoms and leagues'],
  ['roman', 'Roman and Parthian powers'],
  ['world-egypt', 'Independent Egyptian kingdoms'],
  ['world-carthage', 'Carthaginian power'],
]);

const TURNING_POINTS = new Map([
  [-1700, 'Minoan palatial world'],
  [-1500, 'Minoan–Mycenaean transition'],
  [-1450, 'Mycenaean influence on Crete'],
  [-1200, 'Bronze Age collapse'],
  [-800, 'Polis formation'],
  [-750, 'Greek colonisation'],
  [-550, 'Cyrus and the Persian Empire'],
  [-525, 'Persian conquest of Egypt'],
  [-513, "Darius's campaigns"],
  [-499, 'Ionian Revolt'],
  [-490, 'Battle of Marathon'],
  [-480, 'Persian Wars'],
  [-479, 'Plataea and Mycale'],
  [-431, 'Peloponnesian War'],
  [-404, 'End of the Peloponnesian War'],
  [-371, 'Theban ascendancy'],
  [-338, 'Macedonian settlement'],
  [-336, 'Alexander becomes king'],
  [-331, 'Battle of Gaugamela'],
  [-325, "Alexander's return from India"],
  [-323, 'Death of Alexander'],
  [-280, 'Successor kingdoms'],
  [-168, 'Roman defeat of Macedon'],
  [-146, 'Rome in Greece and Africa'],
  [-63, 'Pompey reorganises the east'],
  [-31, 'Battle of Actium'],
  [-30, 'Roman annexation of Egypt'],
]);

const SNAPSHOT_NOTES = new Map([
  [-1700, 'The Minoan palatial system links Crete with the Cyclades, mainland Greece, Egypt and the eastern Mediterranean through exchange and diplomacy.'],
  [-1500, 'Minoan centres remain important, but mainland Mycenaean elites are increasingly prominent across the Aegean.'],
  [-1450, 'Destructions on Crete and the appearance of Linear B at Knossos mark a major transition toward Mycenaean administration; causes and local sequences remain debated.'],
  [-1200, 'Palatial systems from Greece to Anatolia and the Levant fragment over several generations; this is a prolonged regional crisis, not a single collapse event.'],
  [-800, 'Greek communities develop institutions, sanctuaries and settlement patterns associated with the polis while interacting with Phoenician, Cypriot and Near Eastern networks.'],
  [-750, 'Independent Greek settlements spread around the Mediterranean and Black Sea, creating lasting networks with Etruscans, Phoenicians, Egyptians and local peoples.'],
  [-550, 'Cyrus unites Persian and Median power and expands through Anatolia and Mesopotamia, bringing the East Greek cities into a new imperial environment.'],
  [-525, 'Cambyses conquers Egypt, placing Greek communities from Ionia to Naukratis within or beside the expanding Achaemenid system.'],
  [-513, 'Darius campaigns toward Scythia and the Indus while consolidating roads, satrapies and tribute across an exceptionally diverse empire.'],
  [-499, 'The Ionian Revolt draws mainland Greek support into conflict with Persia and begins the sequence that leads to invasions of Greece.'],
  [-490, 'The first Persian invasion reaches Attica and is defeated at Marathon; Persian power across the eastern Mediterranean remains intact.'],
  [-480, 'Xerxes invades through Thrace and Macedon; Thermopylae and Salamis belong to a wider land-and-sea campaign involving many Greek and imperial contingents.'],
  [-479, 'Greek victories at Plataea and Mycale end the immediate invasion and shift the war toward the Aegean and Persian-held Greek cities.'],
  [-431, 'Athens and its maritime alliance confront Sparta and the Peloponnesian League within a world still bounded by Persian power, Thrace, Macedon and western Greek states.'],
  [-404, 'Athens surrenders, but Spartan dominance proves unstable as Persia, Thebes, Corinth and other Greek states reshape the balance of power.'],
  [-371, 'The Theban victory at Leuctra ends Spartan supremacy and briefly places Thebes at the centre of mainland Greek politics.'],
  [-338, 'Philip II defeats Athens and Thebes at Chaeronea and establishes Macedonian leadership over most mainland Greek states.'],
  [-336, 'Alexander inherits Macedon and the League of Corinth while the Achaemenid Empire remains the dominant power from Anatolia to Central Asia.'],
  [-331, 'After Gaugamela, Alexander occupies the principal Achaemenid centres, though conquest and resistance continue farther east.'],
  [-325, "Alexander's forces return by three difficult routes: his own Gedrosian march, Craterus' inland movement and Nearchus' coastal voyage."],
  [-323, "Alexander's empire reaches its greatest aggregate extent at his death, but authority remains uneven and succession is immediately contested."],
  [-280, 'Successor kingdoms compete across Macedon, Egypt and Asia while smaller states and leagues emerge between them.'],
  [-168, 'Rome defeats Antigonid Macedon at Pydna, accelerating the replacement of Hellenistic royal power by Roman intervention.'],
  [-146, 'Rome destroys Corinth and Carthage in the same year and establishes enduring control in Greece and North Africa.'],
  [-63, 'Pompey ends the Seleucid remnant and the kingdom of Pontus, reorganising the eastern Mediterranean beside Parthia and client kingdoms.'],
  [-31, 'Octavian defeats Antony and Cleopatra at Actium; the Ptolemaic kingdom still exists at this pre-annexation snapshot.'],
  [-30, 'Egypt becomes Roman territory. The map closes with Rome controlling much of the Mediterranean while Parthia and several client kingdoms remain beyond direct rule.'],
]);

const CENTURY_SNAPSHOTS = Array.from({ length: 32 }, (_, i) => TIME_MIN + i * 100);

function buildDateOptions(focusEntity) {
  const years = new Set([...CENTURY_SNAPSHOTS, ...TURNING_POINTS.keys(), TIME_MAX]);
  if (focusEntity?.start != null) years.add(focusEntity.start);
  return [...years]
    .filter((year) => year >= TIME_MIN && year <= TIME_MAX)
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      label: TURNING_POINTS.get(year)
        || (year === focusEntity?.start ? focusEntity.name : primaryPeriodAt(year)?.name)
        || 'Historical snapshot',
      turningPoint: TURNING_POINTS.has(year) || year === focusEntity?.start,
    }));
}

function nearestDateOption(year, options) {
  return options.reduce((nearest, option) =>
    Math.abs(option.year - year) < Math.abs(nearest.year - year) ? option : nearest);
}

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

const TERRITORY_WIKIPEDIA_TITLES = new Map([
  ['Early Cycladic culture', 'Cycladic culture'],
  ['Early Helladic culture', 'Helladic chronology'],
  ['Early Dynastic Egypt', 'Early Dynastic Period of Egypt'],
  ['Old Kingdom Egypt', 'Old Kingdom of Egypt'],
  ['First Intermediate Period Egypt', 'First Intermediate Period of Egypt'],
  ['Early Dynastic Mesopotamia', 'Early Dynastic Period (Mesopotamia)'],
  ['Akkadian Empire', 'Akkadian Empire'],
  ['Third Dynasty of Ur', 'Third Dynasty of Ur'],
  ['Middle Kingdom Egypt', 'Middle Kingdom of Egypt'],
  ['Second Intermediate Period Egypt', 'Second Intermediate Period of Egypt'],
  ['Isin-Larsa city kingdoms', 'Isin-Larsa period'],
  ['Old Babylonian kingdom', 'Old Babylonian Empire'],
  ['Kingdom of Mitanni', 'Mitanni'],
  ['Middle Helladic communities', 'Helladic chronology'],
  ['Middle Cycladic communities', 'Cycladic culture'],
  ['Middle Assyrian kingdom', 'Middle Assyrian Empire'],
  ['Phoenician city-states', 'Phoenicia'],
  ['Kingdom of Israel', 'Kingdom of Israel (Samaria)'],
  ['Kingdom of Judah', 'Kingdom of Judah'],
  ['Urartu', 'Urartu'],
  ['Third Intermediate Period Egypt', 'Third Intermediate Period of Egypt'],
  ['Neo-Assyrian Empire', 'Neo-Assyrian Empire'],
  ['Kushite-ruled Egypt (Twenty-fifth Dynasty)', 'Twenty-fifth Dynasty of Egypt'],
  ['Assyrian occupation of Egypt', 'Assyrian conquest of Egypt'],
  ['Saite Egypt (Twenty-sixth Dynasty)', 'Twenty-sixth Dynasty of Egypt'],
  ['Neo-Assyrian remnant', 'Neo-Assyrian Empire'],
  ['Median kingdom', 'Medes'],
  ['Post-palatial Greek regions', 'Greek Dark Ages'],
  ['Lydian Kingdom', 'Lydia'],
  ['Peloponnesian League', 'Peloponnesian League'],
  ['Independent Late Period Egypt', 'Late Period of Egypt'],
  ['Theban hegemony', 'Theban hegemony'],
  ['Phoenician cities under Achaemenid rule', 'Phoenician history'],
  ['Thracian regions', 'Thracians'],
  ['Illyrian regions', 'Illyrians'],
  ['Epirote communities and kingdom', 'Epirus (ancient state)'],
  ['Etruscan city-states', 'Etruscan civilization'],
  ['Carthaginian North African core', 'Ancient Carthage'],
  ['Scythian regions north of the Black Sea', 'Scythians'],
  ['Successor realms in Asia', 'Diadochi'],
  ['Kingdom of Cappadocia', 'Kingdom of Cappadocia'],
  ['Kingdom of Bithynia', 'Kingdom of Bithynia'],
  ['Kingdom of Pontus', 'Kingdom of Pontus'],
  ['Galatian polities', 'Galatians (people)'],
  ['Armenian kingdoms', 'Kingdom of Armenia (antiquity)'],
  ['Bosporan Kingdom', 'Bosporan Kingdom'],
  ['Parthian kingdom', 'Parthian Empire'],
  ['Parthian Empire', 'Parthian Empire'],
  ['Achaean League', 'Achaean League'],
  ["Caesar's conquests in Gaul", 'Gallic Wars'],
]);

function wikipediaArticleUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
}

function territoryWikipediaUrl(territory) {
  const title = TERRITORY_WIKIPEDIA_TITLES.get(territory?.name);
  if (title) return wikipediaArticleUrl(title);
  const query = territory?.label || territory?.name;
  return query
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
    : null;
}

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

export async function renderMap(params, query) {
  const root = el('div', { class: 'view' });
  const initialMode = ['odyssey', 'alexander'].includes(params?.mode) ? params.mode : 'historical';
  // Deep link from an entity page's "On the map" button -- e.g. #/map?focus=siege-of-tyre --
  // flies to that entity's own pin and highlights it, rather than dropping
  // the visitor on whatever view of the map they last left.
  const focusEntity = query?.focus ? db.get(query.focus) : null;

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow" id="map-eyebrow">Historical atlas</p>
          <h1 id="map-title">The Map</h1>
          <p class="sub" id="map-sub">Move through time and watch regions, cities and archaeological sites change.</p>
        </div>
        <div class="row">
          <div class="row" id="map-view-controls"></div>
          <button class="btn btn-sm" id="map-fullscreen">
            ${icon('expand', { size: 15 })} Full screen
          </button>
        </div>
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
            <button class="btn btn-sm map-fs-exit" id="map-fs-exit">
              ${icon('collapse', { size: 15 })} Exit full screen
            </button>
            <div class="map-legend" id="map-legend"></div>
            <div class="map-fs-date-host" id="map-fs-date-host"></div>
            <div class="tl-tip" id="map-tip"></div>
          </div>

          <div id="map-date-host"></div>
        </div>

        <aside class="map-side" id="map-side-host"></aside>
      </div>
    </div>`;

  root.__mount = () => mount(root, initialMode, focusEntity);
  return root;
}

function mount(root, initialMode, focusEntity) {
  const canvas = $('#map-canvas', root);
  if (!canvas) return;

  const tip = $('#map-tip', root);
  const legendHost = $('#map-legend', root);
  const eraHost = $('#map-era-host', root);
  const dateHost = $('#map-date-host', root);
  const sideHost = $('#map-side-host', root);
  const introHost = $('#map-journey-intro', root);
  const viewControlsHost = $('#map-view-controls', root);
  const fullscreenDateHost = $('#map-fs-date-host', root);
  const mapWrap = $('.map-wrap', root);
  const fullscreenButton = $('#map-fullscreen', root);
  const fullscreenExit = $('#map-fs-exit', root);
  const viewEvents = new AbortController();
  const fullscreenOverlayObserver = new ResizeObserver(() => {
    const dateDeckHeight = fullscreenDateHost.offsetHeight;
    if (dateDeckHeight > 0) {
      mapWrap.style.setProperty('--map-fs-date-offset', `${dateDeckHeight + 24}px`);
    }
  });
  fullscreenOverlayObserver.observe(fullscreenDateHost);

  const exitFullscreen = () => document.exitFullscreen?.().catch(() => {});
  const paintFullscreenState = () => {
    const on = document.fullscreenElement === mapWrap;
    fullscreenButton.innerHTML = on
      ? `${icon('collapse', { size: 15 })} Exit full screen`
      : `${icon('expand', { size: 15 })} Full screen`;
    fullscreenButton.setAttribute('aria-pressed', String(on));
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement === mapWrap) exitFullscreen();
    else mapWrap.requestFullscreen?.().catch(() => {});
  };

  fullscreenButton.addEventListener('click', toggleFullscreen, { signal: viewEvents.signal });
  fullscreenExit.addEventListener('click', exitFullscreen, { signal: viewEvents.signal });
  document.addEventListener('fullscreenchange', paintFullscreenState, { signal: viewEvents.signal });

  let map = null;
  let unbindYear = null, unbindLayers = null;
  let modeEvents = null;
  let mode = 'historical';
  // Only snap the camera/year to the deep-linked entity once -- if the
  // visitor then switches to a journey mode and back, historical mode
  // shouldn't keep yanking them back to it.
  let focusApplied = false;

  function teardown() {
    unbindYear?.(); unbindLayers?.();
    unbindYear = unbindLayers = null;
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
    store.togglePlay(false);

    // Entity deep links get their own card; ordinary visits settle on the
    // nearest reviewed snapshot rather than an arbitrary in-between year.
    if (focusEntity && !focusApplied) {
      focusApplied = true;
      if (focusEntity.start != null) store.setYear(focusEntity.start);
    }
    const dateOptions = buildDateOptions(focusEntity);
    store.setYear(nearestDateOption(store.get('year'), dateOptions).year);

    viewControlsHost.innerHTML = `
      <button class="btn btn-sm" id="map-aegean">Aegean</button>
      <button class="btn btn-sm" id="map-east-med">Eastern Med</button>
      <button class="btn btn-sm" id="map-empire">Full extent</button>`;
    eraHost.innerHTML = `
      <div class="y num" id="map-year"></div>
      <div class="p" id="map-period"></div>
      <div class="s" id="map-period-note"></div>`;
    dateHost.innerHTML = `
      <section class="date-deck-panel" aria-labelledby="date-deck-title">
        <div class="date-deck-heading">
          <div>
            <h3 id="date-deck-title">Choose a date</h3>
            <p>Century snapshots with selected historical turning points.</p>
          </div>
          <span class="date-deck-hint">Scroll to explore</span>
        </div>
        <div class="date-deck" role="list" aria-label="Historical map dates">
          ${dateOptions.map((option) => `
            <button type="button" role="listitem" class="date-card${option.turningPoint ? ' turning-point' : ''}"
                    data-map-year="${option.year}" aria-pressed="false">
              <span class="date-card-year">${option.turningPoint ? '' : 'c. '}${esc(fmtYear(option.year))}</span>
              <span class="date-card-label">${esc(option.label)}</span>
            </button>`).join('')}
        </div>
      </section>`;
    fullscreenDateHost.innerHTML = `
      <section class="map-fs-date-panel" aria-label="Choose a historical map date">
        <div class="map-fs-date-label">Choose a date</div>
        <div class="date-deck map-fs-date-deck" role="list" aria-label="Historical map dates in full screen">
          ${dateOptions.map((option) => `
            <button type="button" role="listitem" class="date-card${option.turningPoint ? ' turning-point' : ''}"
                    data-map-year="${option.year}" aria-pressed="false">
              <span class="date-card-year">${option.turningPoint ? '' : 'c. '}${esc(fmtYear(option.year))}</span>
              <span class="date-card-label">${esc(option.label)}</span>
            </button>`).join('')}
        </div>
      </section>`;
    mapWrap.classList.add('has-fs-dates');
    sideHost.innerHTML = `
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
    const dateDecks = $$('.date-deck', root);
    let hoverSequence = 0;
    let hoverHideTimer = null;

    legendHost.innerHTML = `
      <div class="map-key-stack">
        <div class="map-key" aria-label="Map symbol key">
          <span><i class="map-key-area solid"></i>polity</span>
          <span><i class="map-key-area dashed"></i>culture / league</span>
          <span><i class="map-key-line campaign"></i>campaign</span>
          <span><i class="map-key-line network"></i>trade / settlement network</span>
          <span><i class="map-key-point city"></i>city</span>
          <span><i class="map-key-point site"></i>site</span>
          <span><i class="map-key-point battle"></i>battle / event</span>
          <span><i class="map-key-point artefact"></i>artefact</span>
        </div>
        <div class="map-colour-key" aria-label="Territory colour key">
          <strong>Territory colours</strong>
          <div class="map-colour-items" id="map-colour-items"></div>
          <small>Colours distinguish historical phases; they do not imply shared ethnicity or political unity.</small>
        </div>
      </div>`;
    const colourItemsHost = $('#map-colour-items', legendHost);
    let colourLegendKey = null;

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
      const evidenceNote = e.evidenceNote?.trim();
      tip.innerHTML = `
        ${image?.src ? `<div class="tl-tip-media"><img src="${esc(image.src)}" alt="" loading="lazy" decoding="async"></div>` : ''}
        <div class="tl-tip-body">
          <div class="t">${esc(e.name)}</div>
          <div class="d">${esc(e.typeLabel)}${e.region ? ' · ' + esc(e.region) : ''}${esc(qualifier)}</div>
          ${date ? `<div class="d">${esc(date)}</div>` : ''}
          ${summary ? `<div class="map-tip-summary">${esc(summary)}</div>` : ''}
          ${evidenceNote ? `<div class="map-tip-summary"><strong>Map evidence:</strong> ${esc(evidenceNote)}</div>` : ''}
          ${e.sourceUrl ? `<a class="map-tip-link" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">
            ${esc(e.sourceLabel || 'Open map source')} ${icon('arrowRight', { size: 13 })}
          </a>` : ''}
          ${profile ? `<a class="map-tip-link" href="${entityHref(profile.id)}">
            Open ${esc(profile.name)} ${icon('arrowRight', { size: 13 })}
          </a>` : ''}
        </div>`;
      tip.classList.toggle('with-media', Boolean(image?.src));
      tip.classList.toggle('interactive', Boolean(profile || e.sourceUrl));
      tip.classList.add('on');

      const gap = 14;
      const width = tip.offsetWidth;
      const height = tip.offsetHeight;
      const canvasRect = canvas.getBoundingClientRect();
      const avoidRects = [legendHost, fullscreenDateHost]
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          x0: rect.left - canvasRect.left,
          y0: rect.top - canvasRect.top,
          x1: rect.right - canvasRect.left,
          y1: rect.bottom - canvasRect.top,
        }));
      const candidates = [
        { x: pos.x + gap, y: pos.y + gap },
        { x: pos.x - width - gap, y: pos.y + gap },
        { x: pos.x + gap, y: pos.y - height - gap },
        { x: pos.x - width - gap, y: pos.y - height - gap },
      ];
      const inside = ({ x, y }) => x >= 8 && y >= 8
        && x + width <= canvas.clientWidth - 8
        && y + height <= canvas.clientHeight - 8;
      const overlaps = ({ x, y }) => avoidRects.some((rect) => !(
        x + width < rect.x0 || x > rect.x1 || y + height < rect.y0 || y > rect.y1
      ));
      const chosen = candidates.find((candidate) => inside(candidate) && !overlaps(candidate))
        || candidates.find(inside)
        || {
          x: Math.max(8, Math.min(pos.x + gap, canvas.clientWidth - width - 8)),
          y: Math.max(8, Math.min(pos.y + gap, canvas.clientHeight - height - 8)),
        };
      tip.style.left = `${chosen.x}px`;
      tip.style.top = `${chosen.y}px`;
    };

    const hMap = createMap(canvas, {
      year: store.get('year'),
      layers: { ...store.get('layers') },
      basemap: 'plain',
      markers: [],
      focus: focusEntity,
      onMarkerClick: (e) => go(`/e/${e.id}`),
      territoryEntityId: territoryProfileId,
      territoryExternalUrl: territoryWikipediaUrl,
      onTerritoryClick: (_territory, entityId, externalUrl) => {
        if (entityId) go(`/e/${entityId}`);
        else if (externalUrl) window.open(externalUrl, '_blank', 'noopener,noreferrer');
      },
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
    hMap.onLegend((items) => {
      const tints = [...new Set(items.map((item) => item.tint))].sort();
      const nextKey = tints.join('|');
      if (nextKey === colourLegendKey) return;
      colourLegendKey = nextKey;
      colourItemsHost.innerHTML = `
        <span><i class="map-colour-swatch base-land"></i>land without an active overlay</span>
        ${tints.map((tint) => `
          <span><i class="map-colour-swatch" style="--key-colour:var(--p-${esc(tint)})"></i>${esc(
            TERRITORY_COLOUR_LABELS.get(tint) || tint.replaceAll('-', ' '),
          )}</span>`).join('')}`;
    });
    tip.addEventListener('pointerenter', () => clearTimeout(hoverHideTimer), { signal });
    tip.addEventListener('pointerleave', hideHoverTip, { signal });
    map = hMap;

    if (focusEntity?.coords) {
      const [lat, lon] = focusEntity.coords;
      hMap.flyTo([lon - 9, lat - 6, lon + 9, lat + 6], 0.08);
    }

    const yearOut = $('#map-year', root);
    const periodOut = $('#map-period', root);
    const periodNoteOut = $('#map-period-note', root);
    const PLOTTED = ['city', 'site', 'battle', 'war', 'event', 'artefact'];

    const refreshMarkers = throttle((y) => {
      let pts = db.mapPointsAt(y).filter((e) => PLOTTED.includes(e.type));
      // Belt-and-braces: a deep-linked entity should always be a real,
      // clickable marker (not just the highlight ring below), even on the
      // rare chance its own date range doesn't cover the year it lands on.
      if (focusEntity && PLOTTED.includes(focusEntity.type) && !pts.some((p) => p.id === focusEntity.id)) {
        pts = [...pts, focusEntity];
      }
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
      periodOut.textContent = TURNING_POINTS.get(y) || p?.name || '—';
      periodNoteOut.textContent = SNAPSHOT_NOTES.get(y) || p?.summary || '';
      dateDecks.forEach((dateDeck) => {
        const activeCard = $(`[data-map-year="${y}"]`, dateDeck);
        $$('[data-map-year]', dateDeck).forEach((card) => {
          const active = card === activeCard;
          card.classList.toggle('active', active);
          card.setAttribute('aria-pressed', String(active));
        });
        if (activeCard) {
          requestAnimationFrame(() => dateDeck.scrollTo({
            left: activeCard.offsetLeft - (dateDeck.clientWidth - activeCard.offsetWidth) / 2,
            behavior: 'auto',
          }));
        }
      });
      hMap.setYear(y);
      refreshMarkers(y);
    });

    dateDecks.forEach((dateDeck) => {
      dateDeck.addEventListener('click', (event) => {
        const card = event.target.closest('[data-map-year]');
        if (!card) return;
        store.setYear(Number(card.dataset.mapYear));
      }, { signal });
    });

    const paintLayers = (l) => {
      $$('[data-layer]', root).forEach((s) =>
        s.setAttribute('aria-checked', String(!!l[s.dataset.layer])));
      hMap.setLayers({ ...l });
    };
    unbindLayers = store.bind('layers', paintLayers);
    $$('[data-layer]', root).forEach((s) => {
      s.addEventListener('click', () => store.toggleLayer(s.dataset.layer), { signal });
    });

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
    fullscreenDateHost.innerHTML = '';
    mapWrap.classList.remove('has-fs-dates');
    legendHost.innerHTML = which === 'alexander'
      ? `<div class="map-key" aria-label="Alexander campaign map key">
          <span><i class="map-key-foundation attested"></i>attested Alexandria</span>
          <span><i class="map-key-foundation attributed"></i>attributed / disputed</span>
          <small>Foundations appear as the campaign advances</small>
        </div>`
      : '';
    dateHost.innerHTML = '';

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
      basemap: 'plain',
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
      viewEvents.abort();
      fullscreenOverlayObserver.disconnect();
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}
