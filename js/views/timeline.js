/* ============================================================
   Hellenika — Timeline view

   A vertical "rail map" of the Greek world. Read top to bottom:
   every period is a coloured rail running alongside the spine for
   exactly as long as it lasted, so overlaps (Minoan beside
   Mycenaean, Classical beside Macedon) show as parallel rails; every
   dated event, battle, text and artefact is a stop on its period's
   rail. Time is compressed, not drawn to scale -- three thousand
   years on a linear axis left the Classical and Hellenistic ages,
   where most of the record lies, in the last sixth of the width --
   and every long gap says how many years it skips.

   Replaces the earlier horizontal canvas (components/timeline-canvas.js,
   kept for reference). Period detail opens in a side drawer.
   ============================================================ */

import { el, $, $$, esc, fmtYear, clamp, throttle } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as store from '../store.js';
import * as db from '../db.js';
import { periods, primaryPeriodAt } from '../../data/periods.js';
import { worldEvents } from '../../data/world.js';
import { hydrateImages } from '../components/images.js';
import { go, entityHref } from '../router.js';
import {
  entityCard, entityPill, claimsList, paragraphs,
  entityDate, emptyState, block,
} from '../components/ui.js';

/* Historical stops use attested records. Mythological stories remain
   available in the mythology section without invented historical dates. */
const FILTERS = [
  { key: 'event', label: 'Events', types: ['event'] },
  { key: 'battle', label: 'Battles & wars', types: ['battle', 'war'] },
  { key: 'text', label: 'Texts', types: ['text'] },
  { key: 'artefact', label: 'Artefacts', types: ['artefact'] },
  { key: 'world', label: 'Elsewhere in the world', types: [] },
];
const DEFAULT_ON = new Set(['event', 'battle', 'text', 'artefact']);

const LANE_W = 16;        // px between parallel rails
const GAP_LABEL_MIN = 120; // years: a skipped stretch this long gets a label

/* ---------- Static model: periods, lanes, stops ---------- */

const byStart = [...periods].sort((a, b) => a.start - b.start || b.end - a.end);

// Greedy lane assignment: a period takes the first lane whose previous
// occupant has ended. Gives three lanes for the whole sweep.
const laneOf = new Map();
{
  const laneEnds = [];
  for (const p of byStart) {
    let lane = laneEnds.findIndex((end) => end <= p.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = p.end;
    laneOf.set(p.id, lane);
  }
}
const LANES = Math.max(...laneOf.values()) + 1;

/** The period a stop belongs on: its own authored period when its date
 * falls within it (strictly -- a stop must sit on a rail that is there),
 * otherwise the narrowest period active at that date. */
function periodFor(e) {
  const tinted = periods.find((p) => p.tint === e.tint);
  if (tinted && e.start >= tinted.start && e.start < tinted.end) return tinted;
  return primaryPeriodAt(e.start) || tinted || byStart[0];
}

// Anything that began before the atlas opens (the Melos obsidian trade,
// 11,000 BC) is placed at the threshold, keeping its true date on its
// label, rather than opening the page with an eight-millennium gap.
const FIRST_YEAR = byStart[0].start;
const STOPS = db.ofType('event', 'battle', 'war', 'artefact', 'text')
  .filter((e) => e.start != null && db.isHistorical(e))
  .map((e) => ({ kind: 'stop', year: Math.max(e.start, FIRST_YEAR - 1), entity: e,
    period: periodFor({ ...e, start: Math.max(e.start, FIRST_YEAR) }) }));

// Short names for the period ribbon.
const SHORT = {
  'early-bronze-age': 'Early Bronze', 'minoan-civilisation': 'Minoan', 'mycenaean-civilisation': 'Mycenaean',
  'bronze-age-collapse': 'Collapse', 'greek-dark-age': 'Dark Age', 'archaic-greece': 'Archaic',
  'classical-greece': 'Classical', 'rise-of-macedon': 'Macedon', 'alexander-empire': 'Alexander',
  'hellenistic-period': 'Hellenistic', 'roman-conquest': 'Roman',
};

const WORLD = worldEvents.map((w) => ({ kind: 'world', year: w.year, data: w }));

/** Rows in strict date order, with chapter rows where periods begin. */
function buildRows(on) {
  const types = new Set(FILTERS.filter((f) => on.has(f.key)).flatMap((f) => f.types));
  const rows = [
    ...byStart.map((p) => ({ kind: 'start', year: p.start, period: p })),
    ...byStart.map((p) => ({ kind: 'end', year: p.end, period: p })),
    ...STOPS.filter((s) => types.has(s.entity.type)),
    ...(on.has('world') ? WORLD : []),
  ];
  const order = { start: 0, world: 1, stop: 2, end: 3 };
  rows.sort((a, b) => a.year - b.year || order[a.kind] - order[b.kind]
    || (a.entity?.end ?? a.year) - (b.entity?.end ?? b.year));
  // Several periods end together at 30 BC; one closing row says so.
  return rows.filter((r, i) => !(r.kind === 'end' && rows.slice(i + 1).some((x) => x.kind === 'end' && x.year === r.year)))
    .map((r) => (r.kind === 'end'
      ? { ...r, ending: byStart.filter((p) => p.end === r.year) }
      : r));
}

/* ---------- Rendering ---------- */

const yearsLabel = (n) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)} thousand years`
  : `${n >= 200 ? Math.round(n / 50) * 50 : n >= 50 ? Math.round(n / 10) * 10 : n} years`;

function rowHTML(r, prevYear) {
  const gap = prevYear == null ? 0 : r.year - prevYear;
  // Spacing grows with the logarithm of the years skipped, so a decade
  // reads as close and a millennium as far without either one taking
  // over the page.
  const space = gap <= 0 ? 0 : Math.round(clamp(Math.log2(gap + 1) * 7, 6, 64));
  const gapRow = gap >= GAP_LABEL_MIN
    ? `<li class="chron-gap" aria-hidden="true"><span>≈ ${esc(yearsLabel(gap))}</span></li>` : '';
  const style = `style="margin-top:${space}px"`;

  if (r.kind === 'start') {
    const p = r.period;
    return `${gapRow}<li class="chron-row chron-chapter" data-year="${r.year}" data-lane="${laneOf.get(p.id)}"
        data-cap="start" data-period="${p.id}" id="chron-${p.id}" style="--tint:var(--p-${p.tint});margin-top:${space}px">
      <div class="chron-date num">${esc(fmtYear(p.start))}</div>
      <div class="chron-node" aria-hidden="true"></div>
      <div class="chron-card">
        <p class="chron-kicker">Period begins · ${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}</p>
        <h2 class="chron-chapter-title">${esc(p.name)}</h2>
        <p class="chron-chapter-sum">${esc(p.summary)}</p>
        <button class="btn btn-sm chron-open" data-open="${p.id}">${icon('period', { size: 15 })} Explore this period</button>
      </div>
    </li>`;
  }
  if (r.kind === 'end') {
    const names = r.ending.map((p) => p.name);
    return `${gapRow}<li class="chron-row chron-end" ${style} data-year="${r.year}" data-cap="end"
        data-periods="${r.ending.map((p) => p.id).join(' ')}" data-lane="${laneOf.get(r.ending[0].id)}">
      <div class="chron-date num">${esc(fmtYear(r.year))}</div>
      <div class="chron-node" aria-hidden="true"></div>
      <div class="chron-card"><p class="chron-end-text">End of ${esc(names.join(' · '))}</p></div>
    </li>`;
  }
  if (r.kind === 'world') {
    const w = r.data;
    return `${gapRow}<li class="chron-row chron-world" ${style} data-year="${r.year}" data-lane="world">
      <div class="chron-date num">${esc(fmtYear(w.year))}</div>
      <div class="chron-node" aria-hidden="true"></div>
      <div class="chron-card">
        <p class="chron-world-label">Elsewhere</p>
        <h3 class="chron-title">${esc(w.name)}</h3>
        ${w.note ? `<p class="chron-sum">${esc(w.note)}</p>` : ''}
      </div>
    </li>`;
  }
  const e = r.entity, p = r.period;
  return `${gapRow}<li class="chron-row chron-stop" data-year="${r.year}" data-lane="${laneOf.get(p.id)}"
      style="--tint:var(--p-${p.tint});margin-top:${space}px">
    <div class="chron-date num">${esc(entityDate(e))}</div>
    <div class="chron-node" aria-hidden="true"></div>
    <a class="chron-card" href="${entityHref(e.id)}">
      <div class="chron-thumb" data-img-id="${esc(e.id)}">${icon(TYPE_ICON[e.type] || 'sparkle', { size: 22 })}</div>
      <div class="chron-text">
        <p class="chron-type">${esc(e.typeLabel)}</p>
        <h3 class="chron-title">${esc(e.name)}</h3>
        <p class="chron-sum">${esc(e.significance || e.summary)}</p>
      </div>
    </a>
  </li>`;
}

export async function renderTimeline(params) {
  const root = el('div', { class: 'view chron-view' });
  const openId = params?.id || null;

  root.innerHTML = `
    <div class="wrap chron-wrap">
      <header class="chron-hero">
        <p class="eyebrow">3200 BC — 30 BC</p>
        <h1>The Timeline</h1>
        <p class="sub">Three thousand years of the Greek world, read from top to bottom. Each coloured rail is a period,
          running for as long as it lasted; each stop on it is something that happened. Long stretches are compressed —
          the markers between them say how much time has passed.</p>
      </header>

      <div class="chron-bar">
        <div class="chron-now">
          <span class="chron-now-year num" id="chron-now-year">3200 BC</span>
          <span class="chron-now-era" id="chron-now-era"></span>
        </div>
        <nav class="chron-ribbon" aria-label="Jump to a period">
          ${byStart.map((p) => `
            <button class="chron-seg" data-jump="${p.id}" style="--tint:var(--p-${p.tint})" title="${esc(p.name)} · ${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}">
              <span>${esc(SHORT[p.id] || p.name)}</span>
            </button>`).join('')}
        </nav>
        <div class="chron-tools">
          <div class="chron-filters" role="group" aria-label="Show">
            ${FILTERS.map((f) => `<button class="chip chron-filter" data-filter="${f.key}" aria-pressed="${DEFAULT_ON.has(f.key)}">${esc(f.label)}</button>`).join('')}
          </div>
          <a class="btn btn-sm" id="chron-map" href="#/map">${icon('map', { size: 15 })} <span>This year on the map</span></a>
        </div>
      </div>

      <div class="chron-body" style="--lanes:${LANES}">
        <svg class="chron-rails" aria-hidden="true"></svg>
        <ol class="chron-track" id="chron-list"></ol>
      </div>
    </div>

    <div class="chron-scrim" id="chron-scrim" hidden></div>
    <aside class="chron-drawer" id="chron-drawer" aria-label="Period details" hidden>
      <button class="btn btn-sm chron-drawer-close" id="chron-close" aria-label="Close">${icon('collapse', { size: 15 })} Close</button>
      <div id="chron-drawer-body"></div>
    </aside>`;

  root.__mount = () => mount(root, openId);
  return root;
}

function mount(root, openId) {
  const list = $('#chron-list', root);
  const svg = $('.chron-rails', root);
  const body = $('.chron-body', root);
  const nowYear = $('#chron-now-year', root);
  const nowEra = $('#chron-now-era', root);
  const drawer = $('#chron-drawer', root);
  const scrim = $('#chron-scrim', root);
  if (!list) return;
  // The view animates in with a transform, which would make a fixed
  // drawer position against the view instead of the window; host the
  // drawer and its scrim on <body> while the timeline is open.
  const portal = el('div', { class: 'chron-portal' });
  portal.append(scrim, drawer);
  document.body.append(portal);

  const on = new Set(DEFAULT_ON);
  let rowEls = [];

  /* ---------- List ---------- */
  function renderList() {
    const rows = buildRows(on);
    let prev = null;
    list.innerHTML = rows.map((r) => { const h = rowHTML(r, prev); prev = r.year; return h; }).join('');
    rowEls = $$('.chron-row', list);
    observeImages();
    requestAnimationFrame(drawRails);
  }

  /* ---------- Rails (SVG over the rail column) ---------- */
  function drawRails() {
    const bodyBox = body.getBoundingClientRect();
    const railCol = $('.chron-node', list)?.getBoundingClientRect();
    if (!railCol) return;
    const x0 = railCol.left - bodyBox.left;
    const xOf = (lane) => x0 + (lane === 'world' ? LANES : Number(lane)) * LANE_W + LANE_W / 2;
    const yOf = (row) => {
      const n = $('.chron-node', row).getBoundingClientRect();
      return n.top - bodyBox.top + n.height / 2;
    };
    const h = body.scrollHeight;
    svg.setAttribute('width', bodyBox.width);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${bodyBox.width} ${h}`);

    const starts = new Map(), ends = new Map();
    for (const r of rowEls) {
      if (r.dataset.cap === 'start') starts.set(r.dataset.period, yOf(r));
      if (r.dataset.cap === 'end') for (const id of r.dataset.periods.split(' ')) ends.set(id, yOf(r));
    }
    let out = '';
    // Faint guide for "elsewhere" when shown.
    if (on.has('world')) {
      out += `<line class="rail-world" x1="${xOf('world')}" x2="${xOf('world')}" y1="0" y2="${h}"/>`;
    }
    for (const p of byStart) {
      const y1 = starts.get(p.id), y2 = ends.get(p.id);
      if (y1 == null || y2 == null) continue;
      const x = xOf(laneOf.get(p.id));
      out += `<line class="rail" style="stroke:var(--p-${p.tint})" x1="${x}" x2="${x}" y1="${y1}" y2="${y2}"/>`;
    }
    for (const r of rowEls) {
      const lane = r.classList.contains('chron-end') ? null : r.dataset.lane;
      if (lane == null) continue;
      const cls = r.classList.contains('chron-chapter') ? 'stn stn-chapter'
        : r.classList.contains('chron-world') ? 'stn stn-world' : 'stn';
      const tint = r.style.getPropertyValue('--tint') || 'var(--text-3)';
      out += `<circle class="${cls}" cx="${xOf(lane)}" cy="${yOf(r)}" r="${cls.includes('chapter') ? 8 : cls.includes('world') ? 4 : 5.5}" style="--c:${tint}"/>`;
    }
    for (const r of rowEls) if (r.dataset.cap === 'end') {
      for (const id of r.dataset.periods.split(' ')) {
        const p = periods.find((x) => x.id === id);
        out += `<rect class="stn-end" x="${xOf(laneOf.get(id)) - 6}" y="${yOf(r) - 1.5}" width="12" height="3" rx="1.5" style="fill:var(--p-${p.tint})"/>`;
      }
    }
    svg.innerHTML = out;
    updateNow();
  }

  /* ---------- Images, as rows come into view ---------- */
  let imgObserver = null;
  function observeImages() {
    imgObserver?.disconnect();
    imgObserver = new IntersectionObserver((entries) => {
      const seen = entries.filter((en) => en.isIntersecting).map((en) => en.target);
      if (!seen.length) return;
      seen.forEach((t) => imgObserver.unobserve(t));
      // hydrateImages scans a subtree; hand it just the newly visible thumbs.
      hydrateImages({ querySelectorAll: (sel) => (sel === '[data-img-id]' ? seen : []) }, db.get);
    }, { rootMargin: '600px 0px' });
    $$('.chron-thumb', list).forEach((n) => imgObserver.observe(n));
  }

  /* ---------- "Now" readout + ribbon ---------- */
  const barH = () => ($('.chron-bar', root)?.getBoundingClientRect().bottom || 120) + 24;
  let currentYear = byStart[0].start;
  function updateNow() {
    const line = barH();
    let row = rowEls[0];
    for (const r of rowEls) {
      if (r.getBoundingClientRect().top <= line) row = r; else break;
    }
    if (!row) return;
    currentYear = Math.max(Number(row.dataset.year), FIRST_YEAR);
    nowYear.textContent = fmtYear(currentYear);
    const active = byStart.filter((p) => currentYear >= p.start && currentYear < p.end
      || (p.end === -30 && currentYear === -30));
    nowEra.innerHTML = active.map((p) => `<span style="--tint:var(--p-${p.tint})"><i></i>${esc(p.name)}</span>`).join('');
    $$('.chron-seg', root).forEach((b) => b.classList.toggle('on', active.some((p) => p.id === b.dataset.jump)));
  }
  const onScroll = throttle(updateNow, 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  const onResize = throttle(drawRails, 150);
  window.addEventListener('resize', onResize);

  $('#chron-map', root).addEventListener('click', (ev) => {
    ev.preventDefault();
    store.togglePlay(false);
    store.setYear(currentYear);
    go('/map');
  });

  /* ---------- Navigation ---------- */
  const scrollToPeriod = (id, behavior = 'smooth') => {
    const row = $(`#chron-${id}`, list);
    if (!row) return;
    const y = row.getBoundingClientRect().top + window.scrollY - barH() + 12;
    window.scrollTo({ top: y, behavior });
  };
  $$('.chron-seg', root).forEach((b) => b.addEventListener('click', () => scrollToPeriod(b.dataset.jump)));

  /* ---------- Filters ---------- */
  $$('.chron-filter', root).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.filter;
    if (on.has(k)) on.delete(k); else on.add(k);
    b.setAttribute('aria-pressed', String(on.has(k)));
    renderList();
  }));

  /* ---------- Period drawer ---------- */
  function openPeriod(id, { scroll = false } = {}) {
    const p = periods.find((x) => x.id === id);
    if (!p) return;
    const host = $('#chron-drawer-body', portal);
    host.innerHTML = periodPanelHTML(p);
    wirePeriodPanel(host, p);
    drawer.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => portal.classList.add('drawer-open'));
    drawer.scrollTop = 0;
    history.replaceState(null, '', `#/timeline/${p.id}`);
    if (scroll) scrollToPeriod(p.id, 'auto');
  }
  function closeDrawer() {
    portal.classList.remove('drawer-open');
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, 220);
    history.replaceState(null, '', '#/timeline');
  }
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-open]');
    if (b) openPeriod(b.dataset.open);
  });
  $('#chron-close', portal).addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  const onKey = (ev) => { if (ev.key === 'Escape' && !drawer.hidden) closeDrawer(); };
  document.addEventListener('keydown', onKey);

  renderList();
  // Fonts and thumbnails shift row heights after first paint.
  const ro = new ResizeObserver(throttle(drawRails, 120));
  ro.observe(list);
  // After first layout (and any browser scroll restoration on reload).
  if (openId) setTimeout(() => openPeriod(openId, { scroll: true }), 250);

  /* ---------- Cleanup ---------- */
  const observer = new MutationObserver(() => {
    if (!document.contains(list)) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      imgObserver?.disconnect(); ro.disconnect();
      portal.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
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
