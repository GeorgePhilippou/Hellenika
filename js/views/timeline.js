/* ============================================================
   Hellenika — Timeline view
   The interactive canvas, a selected-year context panel, and an
   expandable panel for whichever period is open.
   ============================================================ */

import { el, $, $$, esc, fmtYear, clamp, throttle } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as store from '../store.js';
import * as db from '../db.js';
import { periods } from '../../data/periods.js';
import { worldPeriods, worldEvents } from '../../data/world.js';
import { createTimeline } from '../components/timeline-canvas.js';
import { hydrateImages, peek, ensureLoaded } from '../components/images.js';
import { go, entityHref } from '../router.js';
import {
  entityCard, entityPill, claimsList, paragraphs, sectionHead,
  entityDate, emptyState, block,
} from '../components/ui.js';

/* Entities that deserve a marker on the timeline. 'myth' brings in the
   legendary figures and episodes (Achilles, the Trojan War tradition,
   Theseus...) alongside attested events — drawn hollow on the events
   line to keep the evidence-honesty distinction visible. */
const MARKER_TYPES = ['event', 'battle', 'war', 'artefact', 'text', 'myth'];

export async function renderTimeline(params) {
  const root = el('div', { class: 'view' });
  const openId = params?.id || null;

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">3200 BC — 30 BC</p>
          <h1>The Timeline</h1>
          <p class="sub">Drag to travel. Scroll to zoom. Click a date to inspect it, a band to open a period, or a dot to open an event.</p>
        </div>
        <div class="row">
          <button class="btn btn-sm" id="tl-zoom-out" aria-label="Zoom out">${icon('minus', { size: 15 })}</button>
          <button class="btn btn-sm" id="tl-zoom-in" aria-label="Zoom in">${icon('plus', { size: 15 })}</button>
          <button class="btn btn-sm" id="tl-reset">${icon('reset', { size: 15 })} Full range</button>
          <button class="btn btn-sm" id="tl-fullscreen">${icon('expand', { size: 15 })} Full screen</button>
        </div>
      </div>

      <div class="tl-shell">
        <div class="tl-canvas-wrap">
          <canvas class="tl-canvas" id="tl-canvas"></canvas>
          <div class="tl-tip" id="tl-tip"></div>
          <div class="tl-hint">drag · scroll to zoom · click to inspect</div>
          <div class="tl-fs-bar">
            <button class="btn btn-sm" id="tl-fs-zoom-out" aria-label="Zoom out">${icon('minus', { size: 15 })}</button>
            <button class="btn btn-sm" id="tl-fs-zoom-in" aria-label="Zoom in">${icon('plus', { size: 15 })}</button>
            <button class="btn btn-sm" id="tl-fs-reset">${icon('reset', { size: 15 })} Full range</button>
            <button class="btn btn-sm" id="tl-fs-exit">${icon('collapse', { size: 15 })} Exit full screen</button>
          </div>
        </div>

        <div id="tl-snapshot"></div>
        <div id="tl-panel"></div>
      </div>
    </div>`;

  // The canvas needs to be in the document before it can be measured.
  root.__mount = () => mount(root, openId);
  return root;
}

function mount(root, openId) {
  const canvas = $('#tl-canvas', root);
  const tip = $('#tl-tip', root);
  const panel = $('#tl-panel', root);
  const snapshot = $('#tl-snapshot', root);
  if (!canvas) return;

  // Bumped on every hover change so a slow image fetch from an earlier
  // hover can't paint itself into the tooltip after the pointer has
  // already moved on to something else.
  let hoverToken = 0;

  /* ---------- Markers ---------- */
  const markers = db.ofType(...MARKER_TYPES)
    .filter((e) => e.start != null && !e.modern)
    .map((e) => ({ year: e.start, entity: e }));

  const tl = createTimeline(canvas, {
    periods,
    markers,
    worldPeriods,
    worldEvents,
    onPeriodClick: (p) => openPeriod(p.id),
    onMarkerClick: (e) => go(`/e/${e.id}`),
    onYearSelect: (year) => {
      store.togglePlay(false);
      store.setYear(year);
    },
    onHover: (h, pos) => {
      hoverToken++;
      if (!h) { tip.classList.remove('on'); return; }
      const d = h.data;
      let bodyHTML;
      if (h.kind === 'period') {
        bodyHTML = `<div class="t">${esc(d.name)}</div>
           <div class="d">${esc(fmtYear(d.start))} – ${esc(fmtYear(d.end))}</div>
           <div class="d" style="margin-top:6px">${esc(d.summary.slice(0, 110))}…</div>`;
      } else if (h.kind === 'world-period') {
        bodyHTML = `<div class="t">${esc(d.name)} <span class="small muted">· World</span></div>
           <div class="d">${esc(fmtYear(d.start))} – ${esc(fmtYear(d.end))}</div>
           <div class="d" style="margin-top:6px">${esc(d.note || '')}</div>`;
      } else if (h.kind === 'world-marker') {
        bodyHTML = `<div class="t">${esc(d.name)} <span class="small muted">· World</span></div>
           <div class="d">${esc(fmtYear(d.year))}${d.n > 1 ? ` · +${d.n - 1} more nearby` : ''}</div>
           <div class="d" style="margin-top:6px">${esc(d.note || '')}</div>`;
      } else {
        bodyHTML = `<div class="t">${esc(d.name)}</div>
           <div class="d">${esc(entityDate(d))} · ${esc(d.typeLabel)}</div>
           ${d.summary ? `<div class="d" style="margin-top:6px">${esc(d.summary.slice(0, 110))}…</div>` : ''}`;
      }

      tip.innerHTML = `<div class="tl-tip-media" data-tip-media></div><div class="tl-tip-body">${bodyHTML}</div>`;
      tip.classList.add('on');
      // Keep the tooltip inside the canvas.
      const w = 280;
      tip.style.left = `${clamp(pos.x + 14, 8, canvas.clientWidth - w - 8)}px`;
      tip.style.top = `${clamp(pos.y + 14, 8, canvas.clientHeight - 200)}px`;

      // Image loads async (it's fetched from Wikipedia, not bundled) — paint
      // it in if already cached from an earlier hover, otherwise fetch and
      // fill it in only if the pointer is still over this same thing.
      const token = hoverToken;
      const paint = (img) => {
        if (hoverToken !== token || !img?.src) return;
        const el2 = tip.querySelector('[data-tip-media]');
        if (el2) el2.innerHTML = `<img src="${img.src}" alt="" loading="lazy" decoding="async">`;
      };
      const cached = peek(d);
      if (cached !== undefined) paint(cached);
      else ensureLoaded([d]).then(() => paint(peek(d)));
    },
  });

  /* ---------- Selected-year context ---------- */
  const paintSnapshot = throttle((y) => renderSnapshot(snapshot, y), 120);
  const unbindYear = store.bind('year', paintSnapshot);

  /* ---------- Toolbar ---------- */
  $('#tl-zoom-in', root).addEventListener('click', () => tl.zoomIn());
  $('#tl-zoom-out', root).addEventListener('click', () => tl.zoomOut());
  $('#tl-reset', root).addEventListener('click', () => tl.reset());

  /* ---------- Full screen ----------
     Only the canvas itself goes fullscreen, not the whole shell -- the
     information panels below it don't shrink in a column flex layout,
     so fullscreening the shell squeezed the canvas down to nothing.
     The zoom/reset/exit controls are duplicated as an overlay
     bar inside the canvas wrap (shown only while fullscreen), since the
     page's own toolbar lives outside it and isn't rendered while
     fullscreen is active. */
  const canvasWrap = root.querySelector('.tl-canvas-wrap');
  const fsBtn = $('#tl-fullscreen', root);
  const paintFsBtn = () => {
    const on = document.fullscreenElement === canvasWrap;
    fsBtn.innerHTML = on
      ? `${icon('collapse', { size: 15 })} Exit full screen`
      : `${icon('expand', { size: 15 })} Full screen`;
  };
  const enterFullscreen = () => canvasWrap.requestFullscreen?.().catch(() => {});
  const exitFullscreen = () => document.exitFullscreen?.().catch(() => {});
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement === canvasWrap) exitFullscreen();
    // Some embedding contexts (e.g. an iframe without allow="fullscreen")
    // reject this outright -- fail quietly rather than an unhandled rejection.
    else enterFullscreen();
  });
  document.addEventListener('fullscreenchange', paintFsBtn);

  $('#tl-fs-zoom-in', root).addEventListener('click', () => tl.zoomIn());
  $('#tl-fs-zoom-out', root).addEventListener('click', () => tl.zoomOut());
  $('#tl-fs-reset', root).addEventListener('click', () => tl.reset());
  $('#tl-fs-exit', root).addEventListener('click', exitFullscreen);

  /* ---------- Period panel ---------- */
  function openPeriod(id) {
    const p = periods.find((x) => x.id === id);
    if (!p) return;
    tl.focusPeriod(p);
    store.setYear(Math.round((p.start + p.end) / 2));
    panel.innerHTML = periodPanelHTML(p);
    wirePeriodPanel(panel, p);
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#/timeline/${p.id}`);
  }

  if (openId) openPeriod(openId);
  else panel.innerHTML = periodIndexHTML();

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-period]');
    if (b) { e.preventDefault(); openPeriod(b.dataset.period); }
  });

  // Clean up when the view is replaced.
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      unbindYear(); tl.destroy();
      store.togglePlay(false);
      document.removeEventListener('fullscreenchange', paintFsBtn);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}

/* ============================================================
   "What existed in this year" strip
   ============================================================ */
function renderSnapshot(host, year) {
  const active = db.entitiesAt(year);
  const pick = (types, n) =>
    active.filter((e) => types.includes(e.type)).slice(0, n);

  const groups = [
    ['Periods', pick(['period'], 4)],
    ['Powers', pick(['empire', 'kingdom'], 4)],
    ['People', pick(['person'], 6)],
    ['Places', pick(['city', 'site'], 6)],
    ['Writing', pick(['writing', 'language'], 3)],
  ].filter(([, list]) => list.length);

  if (!groups.length) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div class="panel panel-sunk">
      <div class="row" style="margin-bottom:var(--s-4);justify-content:space-between">
        <div class="row">
          <h2 style="font-size:1.05rem">In ${esc(fmtYear(year))}</h2>
          <span class="small muted">${active.length} entities active</span>
        </div>
        <a class="btn btn-sm" href="#/map" title="See ${esc(fmtYear(year))} on the map">
          ${icon('map', { size: 15 })} View on map
        </a>
      </div>
      <div class="stack">
        ${groups.map(([label, list]) => `
          <div class="rel-group">
            <h3>${esc(label)}</h3>
            <div class="rel-list">${list.map((e) => entityPill(e)).join('')}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   Period index (shown before a period is opened)
   ============================================================ */
function periodIndexHTML() {
  return `
    <div class="panel">
      ${sectionHead('Eleven periods', 'Click any band above, or start here. Overlaps are real — Minoan and Mycenaean civilisation coexisted for three centuries.')}
      <div class="grid grid-auto-sm">
        ${periods.map((p) => `
          <button class="card ecard" data-period="${p.id}" style="--tint:var(--p-${p.tint});text-align:left">
            <div class="ecard-glyph">${icon('period', { size: 34 })}</div>
            <div class="ecard-body">
              <div class="ecard-title">${esc(p.name)}</div>
              <div class="ecard-meta num">${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}</div>
              <p class="ecard-sum">${esc(p.summary)}</p>
            </div>
          </button>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   Expanded period panel
   ============================================================ */
const TABS = [
  ['overview', 'Overview'],
  ['politics', 'Politics'],
  ['warfare', 'Warfare'],
  ['culture', 'Culture'],
  ['people', 'People'],
  ['places', 'Places'],
  ['things', 'Artefacts & texts'],
  ['events', 'Events'],
  ['evidence', 'Evidence'],
];

function periodPanelHTML(p) {
  return `
    <div class="period-panel" style="--tint:var(--p-${p.tint})">
      <div class="period-head">
        <p class="eyebrow">Historical period</p>
        <h2>${esc(p.name)}</h2>
        <p class="period-dates num">${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}${p.approx ? ' (approx.)' : ''}</p>
        <p class="lede" style="margin-top:var(--s-3);max-width:64ch">${esc(p.summary)}</p>
        ${p.altNames?.length ? `<p class="small muted" style="margin-top:var(--s-2)">Also known as ${esc(p.altNames.join(', '))}</p>` : ''}
      </div>
      <div class="tabs" role="tablist">
        ${TABS.map(([k, label], i) => `
          <button role="tab" data-tab="${k}" aria-selected="${i === 0}">${esc(label)}</button>`).join('')}
      </div>
      <div class="period-body" id="period-body"></div>
    </div>`;
}

function wirePeriodPanel(host, p) {
  const body = $('#period-body', host);
  const tabs = $$('[data-tab]', host);

  const show = (key) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === key)));
    body.innerHTML = periodTabHTML(p, key);
    hydrateImages(body, db.get);
  };

  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
  show('overview');
}

function idsToEntities(ids) {
  return ids.map(db.get).filter(Boolean);
}

function pillGroup(label, list) {
  if (!list.length) return '';
  return `<div class="rel-group"><h3>${esc(label)}</h3>
    <div class="rel-list">${list.map((e) => entityPill(e)).join('')}</div></div>`;
}

function periodTabHTML(p, key) {
  switch (key) {
    case 'overview': {
      return `
        <div class="prose" style="max-width:70ch">${paragraphs(p.overview)}</div>
        ${p.significance ? `<div class="callout" style="--tint:var(--p-${p.tint});margin-top:var(--s-6)">
          <h3 class="eyebrow" style="margin-bottom:var(--s-2)">Why it matters</h3>
          <p>${esc(p.significance)}</p></div>` : ''}
        ${p.boundaryNote ? `<div class="register-note" style="margin-top:var(--s-5)">
          ${icon('info', { size: 17 })}
          <div><strong>On the dates.</strong> ${esc(p.boundaryNote)}</div></div>` : ''}
        <div style="margin-top:var(--s-6)">
          <a class="btn btn-sm" href="#/map">${icon('map', { size: 15 })} See the map at ${esc(fmtYear(Math.round((p.start + p.end) / 2)))}</a>
        </div>`;
    }
    case 'politics': return block('Politics and power', p.politics) || emptyState('No political summary recorded for this period.');
    case 'warfare':  return block('Warfare', p.warfare) || emptyState('No military summary recorded for this period.');
    case 'culture':  return block('Culture and religion', p.cultureNote || p.culture) || emptyState('No cultural summary recorded.');

    case 'people': {
      const list = idsToEntities(p.people);
      return list.length
        ? `<div class="grid grid-auto">${list.map((e) => entityCard(e)).join('')}</div>`
        : emptyState('No individuals are securely attested for this period.',
                     'For the Bronze Age and Dark Age this is the normal state of the evidence.');
    }
    case 'places': {
      const list = idsToEntities(p.sites);
      return list.length ? `<div class="grid grid-auto">${list.map((e) => entityCard(e)).join('')}</div>`
                         : emptyState('No sites listed for this period.');
    }
    case 'things': {
      const a = idsToEntities(p.artefacts), t = idsToEntities(p.texts);
      if (!a.length && !t.length) return emptyState('No artefacts or texts listed for this period.');
      return `
        ${a.length ? `<h3 style="margin-bottom:var(--s-3)">Artefacts</h3>
          <div class="grid grid-auto" style="margin-bottom:var(--s-8)">${a.map((e) => entityCard(e)).join('')}</div>` : ''}
        ${t.length ? `<h3 style="margin-bottom:var(--s-3)">Texts</h3>
          <div class="grid grid-auto">${t.map((e) => entityCard(e)).join('')}</div>` : ''}`;
    }
    case 'events': {
      const list = idsToEntities(p.keyEvents)
        .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
      if (!list.length) return emptyState('No events listed for this period.');
      return `<div class="stops" style="--tint:var(--p-${p.tint})">
        ${list.map((e) => `
          <div class="stop">
            <div class="stop-n num">${esc(entityDate(e))}</div>
            <h3><a href="${entityHref(e.id)}">${esc(e.name)}</a></h3>
            <p class="note">${esc(e.summary)}</p>
          </div>`).join('')}
      </div>`;
    }
    case 'evidence': {
      return `
        <p class="small muted" style="margin-bottom:var(--s-5);max-width:62ch">
          Every claim below carries the kind of evidence it rests on and how confident
          specialists are entitled to be. Disagreement is shown, not hidden.
        </p>
        ${claimsList(p.claims)}
        <div style="margin-top:var(--s-6)">
          ${pillGroup('Cited in', idsToEntities(p.relations.map((r) => r.id)).slice(0, 14))}
        </div>`;
    }
    default: return '';
  }
}
