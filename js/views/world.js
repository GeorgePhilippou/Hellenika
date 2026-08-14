/* ============================================================
   Hellenika — Known-world overview
   A sibling to /map: the same time-scrubbed canvas engine, zoomed
   out to the wider world Greek history existed alongside, on its
   own independent clock (3200 BC -- the fall of Constantinople in
   1453) rather than the site's 3200 BC - 30 BC Greek-world range.
   The Greek dataset itself has nothing past 30 BC, so this run on
   the shared `store` year would leave a dead 1,400-year tail on
   every other view; a local, unshared year keeps this page free to
   run long after the rest of the site's clock has stopped.

   Scaffold: worldTerritories (data/world.js) has four schematic
   entries of its own -- Rome (27 BC onward) and three Byzantine
   phases, the period with nothing left to reuse. Add more post-30 BC
   phases via content/world/worldTerritories--*.md.

   Everything up to 30 BC is NOT re-authored here -- the Greek-world
   atlas (data/geo.js) already has a large, reviewed, sourced set of
   non-Aegean territories (Egypt, Mesopotamia/Persia, the Hellenistic
   successor states, Rome's province-by-province conquest, Carthage),
   drawn for the main /map because these were direct actors in Greek
   history. REUSED_ATLAS_IDS pulls that set in rather than
   duplicating it as fresh, unreviewed worldTerritories data -- it
   deliberately excludes anything that's Aegean/Greek-homeland (Crete,
   the mainland, Macedon, the Greek leagues), since /map already shows
   that in full detail and repeating it here would just be noise.
   Scope follows the site's own boundary: as far as Greek contact
   actually reached (the Hellenistic world through Bactria and the
   Indus at Alexander's campaign's edge), not the whole Old World --
   India and China stay off this map's territory layer, same as they
   stay off the timeline's territory-free "world context" ribbon.
   ============================================================ */

import { el, $, $$, esc, fmtYear, throttle } from '../util.js';
import { icon } from '../icons.js';
import * as db from '../db.js';
import { worldTerritories, worldSites } from '../../data/world.js';
import { territories as greekTerritories } from '../../data/geo.js';
import { createMap } from '../components/map-canvas.js';
import { ensureLoaded as ensureImagesLoaded, peek as peekImage } from '../components/images.js';
import { go, entityHref } from '../router.js';
import { entityDate } from '../components/ui.js';

/* Non-Aegean phases from the Greek-world atlas, reused here rather
   than re-authored. Grouped by region, chronological within each. */
const REUSED_ATLAS_IDS = new Set([
  // Egypt: Early Dynastic through Roman annexation.
  't-eb-egypt-early-dynastic', 't-eb-egypt-old-kingdom', 't-eb-egypt-first-intermediate',
  't-egypt-middle-kingdom', 't-egypt-second-intermediate',
  't-egypt-nk', 't-egypt-nk-levant',
  't-da-egypt-third-intermediate', 't-egypt-kushite', 't-da-assyria-egypt', 't-egypt-saite',
  't-egypt-late-independent',
  't-alex-egypt', 't-diadochi-egypt',
  't-ptolemaic-early', 't-ptolemaic-early-levant', 't-ptolemaic-early-cyrenaica',
  't-ptolemaic-middle', 't-ptolemaic-middle-cyrenaica',
  't-ptolemaic-late', 't-ptolemaic-terminal',
  't-rome-egypt',
  // Carthage and its Phoenician homeland.
  't-carthaginian-core', 't-da-phoenicia', 't-phoenicia-achaemenid', 't-etruscan-regions',
  // Mesopotamia, Anatolia and Persia: Sumer through the Parthian Empire.
  't-eb-mesopotamia-early-dynastic', 't-eb-akkadian', 't-eb-ur-third', 't-mesopotamia-isin-larsa',
  't-old-babylonian', 't-hittite-early', 't-mitanni', 't-hittite', 't-middle-assyria',
  't-da-israel', 't-da-judah',
  't-da-assyria-core', 't-da-assyria-recovery', 't-da-assyria-expansion', 't-da-assyria-peak',
  't-da-assyria-collapse', 't-da-urartu', 't-lydia', 't-da-medes', 't-da-babylon',
  't-achaemenid-cyrus', 't-achaemenid-cambyses', 't-achaemenid-darius', 't-achaemenid-no-egypt',
  't-achaemenid-restored',
  't-scythian-black-sea', 't-bosporan-kingdom',
  // Alexander's campaign and its successor kingdoms, as far east as it went.
  't-alex-anatolia', 't-alex-levant', 't-alex-mesopotamia', 't-alex-persia',
  't-alex-bactria', 't-alex-indus',
  't-armenia-hellenistic', 't-diadochi-asia', 't-cappadocia',
  't-seleucid-early', 't-seleucid-reduced-east', 't-seleucid-restored', 't-seleucid-post-magnesia',
  't-seleucid-remnant',
  't-bithynia', 't-pergamon', 't-pontus', 't-galatian-regions', 't-bactria',
  't-parthia-core', 't-parthia-iran', 't-parthia-expanded',
  // Rome's province-by-province conquest, up to the site's 30 BC boundary --
  // worldTerritories' own wt-roman-empire picks up right where this leaves off.
  't-rome-italy', 't-rome-sicily', 't-rome-sardinia', 't-rome-hispania-citerior',
  't-rome-hispania-ulterior', 't-rome-africa', 't-rome-macedonia', 't-rome-asia',
  't-rome-narbonensis', 't-rome-cyrenaica', 't-rome-crete', 't-rome-cilicia',
  't-rome-bithynia-pontus', 't-rome-syria', 't-rome-gaul-caesar',
]);
const worldGeoTerritories = [
  ...worldTerritories,
  ...greekTerritories.filter((t) => REUSED_ATLAS_IDS.has(t.id)),
];

// Archaeological-site markers outside the Greek-world entity graph
// (worldSites, data/world.js) reshaped to the map engine's marker
// contract -- {id, name, coords, type, tint}, matching what
// db.mapPointsAt() entities already carry.
const worldSiteMarkers = worldSites.map((s) => ({
  ...s,
  type: 'site',
  typeLabel: 'Archaeological site',
  sortName: s.name.toLowerCase(),
}));

export const WORLD_TIME_MIN = -3200;
export const WORLD_TIME_MAX = 1453;
const WORLD_EXTENT = { lonMin: -10, lonMax: 105, latMin: -2, latMax: 58 };

const LAYERS = [
  ['territories', 'Political regions'],
  ['places', 'Cities & archaeological sites'],
  ['labels', 'Region labels'],
];

// Reused atlas territories keep their original tint, which the Greek
// map assigns per era rather than per civilisation -- one Aegean
// culture is normally on screen per tint at a time there. Here,
// several distinct non-Aegean powers can share a tint in the same
// year (Old Kingdom Egypt and the Akkadian Empire are both
// "earlybronze"), so a swatch names the group of powers it can mean
// on this map, not a single one -- hover a territory for which it is.
const TINT_LABELS = new Map([
  ['world-rome', 'Rome (imperial, from 27 BC)'],
  ['world-byzantium', 'Byzantium'],
  ['world-carthage', 'Carthage'],
  ['world-egypt', 'Independent Egyptian dynasties'],
  ['world-neareast', 'Elam'],
  ['world-islamic', 'Islamic caliphates (Rashidun, Umayyad, Abbasid, Fatimid)'],
  ['world-ottoman', 'Seljuk & Ottoman Anatolia'],
  ['world-crusader', 'Crusader states'],
  ['earlybronze', 'Early Bronze Age states (Egypt, Sumer & Akkad)'],
  ['minoan', 'Middle Bronze Age kingdoms (Egypt & Babylon)'],
  ['collapse', 'Late Bronze Age powers (Egypt, Hatti, Assyria)'],
  ['darkage', 'Early Iron Age kingdoms (Egypt, Levant, Assyria & Babylon)'],
  ['archaic', 'Archaic-era powers (Persia, Lydia, Phoenicia, Scythia)'],
  ['alexander', "Alexander's empire"],
  ['hellenistic', 'Hellenistic kingdoms (Ptolemaic, Seleucid & successor states)'],
  ['roman', 'Rome, Parthia & the Roman provinces'],
]);

const TURNING_POINTS = new Map([
  [-2334, 'Sargon and the Akkadian Empire'],
  [-1200, 'Bronze Age collapse'],
  [-911, 'The Neo-Assyrian Empire'],
  [-664, 'Assyria takes Egypt'],
  [-550, 'Cyrus and the Achaemenid Empire'],
  [-330, "Alexander's conquest of Persia"],
  [-146, 'Rome destroys Carthage and Corinth'],
  [-27, 'Augustus and the Roman Empire'],
  [330, 'Constantinople founded'],
  [476, 'Fall of the Western Roman Empire'],
  [632, "Muhammad's death and the Rashidun conquests"],
  [750, 'The Abbasid revolution'],
  [1071, 'Manzikert and Seljuk Anatolia'],
  [1099, 'The First Crusade takes Jerusalem'],
  [1187, "Saladin's victory at Hattin"],
  [1204, 'Fourth Crusade sacks Constantinople'],
  [1291, 'Fall of Acre ends Crusader Outremer'],
  [1326, 'Bursa and the Ottoman beylik'],
  [1453, 'Fall of Constantinople'],
]);

const CENTURY_STEP = 200;
const CENTURY_SNAPSHOTS = Array.from(
  { length: Math.floor((WORLD_TIME_MAX - WORLD_TIME_MIN) / CENTURY_STEP) + 1 },
  (_, i) => WORLD_TIME_MIN + i * CENTURY_STEP,
);

function buildDateOptions() {
  const years = new Set([...CENTURY_SNAPSHOTS, ...TURNING_POINTS.keys(), WORLD_TIME_MAX]);
  return [...years]
    .filter((year) => year >= WORLD_TIME_MIN && year <= WORLD_TIME_MAX)
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      label: TURNING_POINTS.get(year) || 'Historical snapshot',
      turningPoint: TURNING_POINTS.has(year),
    }));
}

function nearestDateOption(year, options) {
  return options.reduce((nearest, option) =>
    Math.abs(option.year - year) < Math.abs(nearest.year - year) ? option : nearest);
}

export async function renderWorld() {
  const root = el('div', { class: 'view' });

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Known-world overview</p>
          <h1>The Wider World</h1>
          <p class="sub">
            Egypt, Mesopotamia and Persia, Carthage, Rome and Byzantium -- the
            world Greek history unfolded alongside, on its own clock: 3200 BC to
            the fall of Constantinople in 1453. Scope follows Greek contact, not
            the whole Old World, so it stops around the edge of Alexander's
            campaign -- India and China stay off the territory layer, as on the
            timeline's own world-context ribbon.
          </p>
        </div>
        <div class="row">
          <button class="btn btn-sm" id="world-fullrange">Full range</button>
        </div>
      </div>

      <div class="map-layout">
        <div>
          <div class="map-wrap">
            <canvas class="map-canvas" id="world-canvas"></canvas>
            <div class="map-era" id="world-era-host">
              <div class="y num" id="world-year"></div>
              <div class="p" id="world-period"></div>
            </div>
            <div class="map-controls">
              <button id="world-zin" aria-label="Zoom in">${icon('plus', { size: 16 })}</button>
              <button id="world-zout" aria-label="Zoom out">${icon('minus', { size: 16 })}</button>
              <button id="world-reset" aria-label="Reset view">${icon('reset', { size: 16 })}</button>
            </div>
            <div class="map-legend" id="world-legend"></div>
            <div class="tl-tip" id="world-tip"></div>
          </div>

          <div id="world-date-host"></div>
        </div>

        <aside class="map-side" id="world-side-host"></aside>
      </div>
    </div>`;

  root.__mount = () => mount(root);
  return root;
}

function mount(root) {
  const canvas = $('#world-canvas', root);
  if (!canvas) return;

  const tip = $('#world-tip', root);
  const legendHost = $('#world-legend', root);
  const dateHost = $('#world-date-host', root);
  const sideHost = $('#world-side-host', root);
  const yearOut = $('#world-year', root);
  const periodOut = $('#world-period', root);
  const events = new AbortController();
  const signal = events.signal;

  let year = -450; // opens on the Achaemenid/Classical-Greek era, same default as /map
  let hoverSequence = 0;
  let hoverHideTimer = null;
  let colourLegendKey = null;

  const dateOptions = buildDateOptions();
  year = nearestDateOption(year, dateOptions).year;

  dateHost.innerHTML = `
    <section class="date-deck-panel" aria-labelledby="world-date-deck-title">
      <div class="date-deck-heading">
        <div>
          <h3 id="world-date-deck-title">Choose a date</h3>
          <p>Two-century snapshots with a few turning points.</p>
        </div>
        <span class="date-deck-hint">Scroll to explore</span>
      </div>
      <div class="date-deck" role="list" aria-label="Known-world overview dates">
        ${dateOptions.map((option) => `
          <button type="button" role="listitem" class="date-card${option.turningPoint ? ' turning-point' : ''}"
                  data-world-year="${option.year}" aria-pressed="false">
            <span class="date-card-year">${option.turningPoint ? '' : 'c. '}${esc(fmtYear(option.year))}</span>
            <span class="date-card-label">${esc(option.label)}</span>
          </button>`).join('')}
      </div>
    </section>`;

  sideHost.innerHTML = `
    <div class="panel">
      <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Layers</h3>
      ${LAYERS.map(([k, label]) => `
        <div class="layer-row">
          <span>${esc(label)}</span>
          <button class="switch" role="switch" data-layer="${k}"
                  aria-checked="true" aria-label="${esc(label)}"></button>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="row" style="margin-bottom:var(--s-3)">
        <h3 class="eyebrow">On the map</h3>
        <span class="small muted" id="world-count"></span>
      </div>
      <div class="map-list" id="world-list"></div>
      <p class="small muted" style="margin-top:var(--s-3)">
        Places come from two sources: the Greek-world dataset (until 30 BC,
        linking to a full profile) and a growing set of archaeological sites
        outside it (linking out to their source). Coverage past 30 BC is
        territories only so far.
      </p>
    </div>`;

  legendHost.innerHTML = `
    <div class="map-key-stack">
      <div class="map-colour-key" aria-label="Territory colour key">
        <strong>Territory colours</strong>
        <div class="map-colour-items" id="world-colour-items"></div>
        <small>Schematic outlines -- see each territory's evidence note on hover.</small>
      </div>
    </div>`;
  const colourItemsHost = $('#world-colour-items', legendHost);

  let layers = { territories: true, places: true, labels: true };

  const paintHoverTip = (e, pos, profile = null, image = null) => {
    const date = entityDate(e);
    const qualifier = e.certainty === 'debated' ? ' · debated reconstruction'
      : e.certainty === 'schematic' ? ' · schematic boundary'
      : '';
    const summary = profile?.summary?.trim();
    // Territories (Greek atlas) carry `evidenceNote`; worldSites carry
    // `note` -- same schema shape as worldPeriods/worldEvents.
    const evidenceNote = (e.evidenceNote || e.note)?.trim();
    tip.innerHTML = `
      ${image?.src ? `<div class="tl-tip-media"><img src="${esc(image.src)}" alt="" loading="lazy" decoding="async"></div>` : ''}
      <div class="tl-tip-body">
        <div class="t">${esc(e.name)}</div>
        <div class="d">${esc(e.typeLabel || 'Territory')}${esc(qualifier)}</div>
        ${date ? `<div class="d">${esc(date)}</div>` : ''}
        ${summary ? `<div class="map-tip-summary">${esc(summary)}</div>` : ''}
        ${evidenceNote ? `<div class="map-tip-summary"><strong>Note:</strong> ${esc(evidenceNote)}</div>` : ''}
        ${profile ? `<a class="map-tip-link" href="${entityHref(profile.id)}">
          Open ${esc(profile.name)} ${icon('arrowRight', { size: 13 })}
        </a>` : e.sourceUrl ? `<a class="map-tip-link" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">
          ${esc(e.sourceLabel || 'Open source')} ${icon('arrowRight', { size: 13 })}
        </a>` : ''}
      </div>`;
    tip.classList.toggle('with-media', Boolean(image?.src));
    tip.classList.toggle('interactive', Boolean(profile || e.sourceUrl));
    tip.classList.add('on');
    tip.style.left = `${Math.min(pos.x + 14, canvas.clientWidth - 260)}px`;
    tip.style.top = `${Math.min(pos.y + 14, canvas.clientHeight - 100)}px`;
  };
  const hideHoverTip = () => {
    hoverSequence += 1;
    tip.classList.remove('on', 'with-media', 'interactive');
  };

  const wMap = createMap(canvas, {
    year,
    layers: { territories: layers.territories, cities: layers.places, sites: layers.places, labels: layers.labels },
    basemap: 'plain',
    markers: [],
    geo: { territories: worldGeoTerritories, EXTENT: WORLD_EXTENT },
    onMarkerClick: (e) => {
      if (db.get(e.id)) go(`/e/${e.id}`);
      else if (e.sourceUrl) window.open(e.sourceUrl, '_blank', 'noopener,noreferrer');
    },
    onHover: (e, pos) => {
      const sequence = ++hoverSequence;
      clearTimeout(hoverHideTimer);
      if (!e) {
        hoverHideTimer = setTimeout(() => { if (!tip.matches(':hover')) hideHoverTip(); }, 160);
        return;
      }
      const profile = e.id ? db.get(e.id) : null;
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

  wMap.onLegend((items) => {
    const tints = [...new Set(items.map((item) => item.tint))].sort();
    const nextKey = tints.join('|');
    if (nextKey === colourLegendKey) return;
    colourLegendKey = nextKey;
    colourItemsHost.innerHTML = tints.length
      ? tints.map((tint) => `
          <span><i class="map-colour-swatch" style="--key-colour:var(--p-${esc(tint)})"></i>${esc(
            TINT_LABELS.get(tint) || tint.replaceAll('-', ' '),
          )}</span>`).join('')
      : '<span class="small muted">No territory authored for this date yet.</span>';
  });

  tip.addEventListener('pointerenter', () => clearTimeout(hoverHideTimer), { signal });
  tip.addEventListener('pointerleave', hideHoverTip, { signal });

  const PLOTTED = ['city', 'site', 'battle', 'war', 'event', 'artefact'];
  const listHost = $('#world-list', root);
  const countHost = $('#world-count', root);
  const dateDeck = $('.date-deck', root);

  const refreshMarkers = throttle((y) => {
    const pts = layers.places
      ? [
          ...db.mapPointsAt(y).filter((e) => PLOTTED.includes(e.type)),
          ...worldSiteMarkers.filter((s) => y >= s.from && y <= s.to),
        ]
      : [];
    wMap.setMarkers(pts);
    countHost.textContent = `${pts.length} ${pts.length === 1 ? 'place' : 'places'}`;
    listHost.innerHTML = pts.length
      ? pts.slice().sort((a, b) => a.sortName.localeCompare(b.sortName)).slice(0, 80).map((e) => {
          const profile = db.get(e.id);
          const href = profile ? entityHref(e.id) : e.sourceUrl;
          const external = !profile && e.sourceUrl;
          return `
          <a href="${esc(href || '#')}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
            <i class="chip-dot" style="background:var(--p-${e.tint})"></i>
            <span>${esc(e.name)}</span>
            <span class="r">${esc(e.typeLabel)}</span>
          </a>`;
        }).join('')
      : '<p class="small muted">Nothing from the Greek-world dataset or worldSites is dated to this year.</p>';
  }, 140);

  function setYear(y) {
    year = y;
    yearOut.textContent = fmtYear(y);
    const option = dateOptions.find((o) => o.year === y);
    periodOut.textContent = option?.label || TURNING_POINTS.get(y) || '—';
    $$('[data-world-year]', dateDeck).forEach((card) => {
      const active = Number(card.dataset.worldYear) === y;
      card.classList.toggle('active', active);
      card.setAttribute('aria-pressed', String(active));
      if (active) {
        requestAnimationFrame(() => dateDeck.scrollTo({
          left: card.offsetLeft - (dateDeck.clientWidth - card.offsetWidth) / 2,
          behavior: 'auto',
        }));
      }
    });
    wMap.setYear(y);
    refreshMarkers(y);
  }
  setYear(year);

  dateDeck.addEventListener('click', (event) => {
    const card = event.target.closest('[data-world-year]');
    if (card) setYear(Number(card.dataset.worldYear));
  }, { signal });

  $$('[data-layer]', root).forEach((s) => {
    s.addEventListener('click', () => {
      const key = s.dataset.layer;
      layers[key] = !layers[key];
      s.setAttribute('aria-checked', String(layers[key]));
      wMap.setLayers({ territories: layers.territories, cities: layers.places, sites: layers.places, labels: layers.labels });
      refreshMarkers(year);
    }, { signal });
  });

  $('#world-zin', root).addEventListener('click', () => wMap.zoomIn(), { signal });
  $('#world-zout', root).addEventListener('click', () => wMap.zoomOut(), { signal });
  $('#world-reset', root).addEventListener('click', () => wMap.reset(), { signal });
  $('#world-fullrange', root).addEventListener('click', () => wMap.reset(), { signal });

  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      events.abort();
      wMap.destroy();
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}
