/* ============================================================
   Hellenika — Entity page

   Section order is deliberate: what it is, why it matters, the
   narrative, then — before anything else interpretive — the
   evidence. Mythological entities get an entirely separate
   section structure so myth is never presented as history.
   ============================================================ */

import { el, $, $$, esc, fmtYear, groupBy } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import { periods } from '../../data/periods.js';
import { go, entityHref } from '../router.js';
import * as store from '../store.js';
import { createGraph } from '../components/graph.js';
import { createMap } from '../components/map-canvas.js';
import {
  entityDate, entityPill, entityCard, claimsList, confidenceKey,
  paragraphs, block, factList, miniTimeline, emptyState, typeChip, tintLegend, inlineFigure,
} from '../components/ui.js';
import { TYPE_META } from '../db.js';

export async function renderEntity(params) {
  const e = db.get(params.id);
  if (!e) {
    const missing = el('div', { class: 'wrap view' });
    missing.innerHTML = emptyState(`No entity with id “${params.id}”.`,
      'It may not have been added to the dataset yet.');
    return missing;
  }

  document.title = `${e.name} — Hellenika`;
  store.pushRecent(e.id);

  const isMyth = e.type === 'myth' || e.type === 'deity';
  const root = el('div');
  root.innerHTML = isMyth ? mythPage(e) : historyPage(e);

  root.__mount = () => mount(root, e);
  return root;
}

/* ============================================================
   Shared chrome
   ============================================================ */

function heroHTML(e, sections) {
  const bookmarked = store.isBookmarked(e.id);
  const inCompare = store.get('compare').includes(e.id);
  return `
    <header class="entity-hero" style="--tint:${db.tintVar(e.tint)}">
      <div class="wrap entity-hero-grid">
        <div class="entity-hero-text">
          <div class="entity-kicker">
            ${typeChip(e)}
            ${e.subtype ? `<span class="chip">${esc(e.subtype)}</span>` : ''}
            ${e.legendary ? `<span class="conf conf-legendary">Legendary</span>` : ''}
            ${e.start != null ? `<span class="chip num">${esc(entityDate(e))}</span>` : ''}
            ${e.region ? `<span class="chip">${esc(e.region)}</span>` : ''}
          </div>
          <h1>${esc(e.name)}</h1>
          ${e.altNames.length ? `<p class="entity-alt">Also known as ${esc(e.altNames.join(' · '))}</p>` : ''}
          <p class="entity-summary">${esc(e.summary)}</p>
          <div class="entity-actions">
            ${e.coords ? `<a class="btn btn-sm" href="#/map">${icon('map', { size: 15 })} On the map</a>` : ''}
            ${e.start != null && !e.modern ? `<a class="btn btn-sm" href="#/timeline">${icon('timeline', { size: 15 })} On the timeline</a>` : ''}
            <button class="btn btn-sm" id="act-compare" aria-pressed="${inCompare}">
              ${icon('compare', { size: 15 })} ${inCompare ? 'In compare tray' : 'Compare'}
            </button>
            <button class="btn btn-sm" id="act-save" aria-pressed="${bookmarked}">
              ${icon('bookmark', { size: 15 })} ${bookmarked ? 'Saved' : 'Save'}
            </button>
            <button class="btn btn-sm" id="act-random">${icon('shuffle', { size: 15 })} Surprise me</button>
          </div>
        </div>
        <div class="entity-hero-media" data-hero-img-id="${esc(e.id)}">
          ${icon(TYPE_ICON[e.type] || 'sparkle', { size: 46 })}
        </div>
      </div>
    </header>`;
}

function sidebarHTML(e, sections) {
  const period = periods.find((p) => p.tint === e.tint);
  return `
    <aside class="entity-side">
      <nav class="panel" aria-label="On this page">
        <h3 class="eyebrow" style="margin-bottom:var(--s-3)">On this page</h3>
        <div class="toc">
          ${sections.map((s) => `<a href="#sec-${s.id}" data-sec="${s.id}">${esc(s.label)}</a>`).join('')}
        </div>
      </nav>

      <div class="panel">
        <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Facts</h3>
        ${factList([
          ['Type', esc(e.typeLabel) + (e.subtype ? ` · ${esc(e.subtype)}` : '')],
          ['Dates', e.start != null ? `<span class="num">${esc(entityDate(e))}</span>` : null],
          ['Region', e.region ? esc(e.region) : null],
          ['Coordinates', e.coords ? `<span class="num small">${e.coords[0].toFixed(3)}, ${e.coords[1].toFixed(3)}</span>` : null],
          ['Author', e.author ? esc(e.author) : null],
          ['Language', e.language ? esc(e.language) : null],
          ['Survival', e.survival ? esc(e.survival) : null],
          ['Material', e.material ? esc(e.material) : null],
          ['Now held', e.museum ? esc(e.museum) : null],
          ['Domain', e.domain ? esc(e.domain) : null],
          ['Status', e.status ? esc(e.status) : null],
          ['Signs', e.signs ? esc(e.signs) : null],
          ['Combatants', e.combatants ? esc(e.combatants.join(' vs ')) : null],
          ['Outcome', e.outcome ? esc(e.outcome) : null],
          ['Period', period ? `<a href="#/timeline/${period.id}">${esc(period.name)}</a>` : null],
          ['Connections', `${e.relations.length}`],
        ])}
      </div>

      ${e.start != null && !e.modern ? `
        <div class="panel">
          <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Timeline position</h3>
          ${miniTimeline(e, periods)}
        </div>` : ''}

      ${e.coords ? `
        <div class="panel">
          <h3 class="eyebrow" style="margin-bottom:var(--s-3)">Location</h3>
          <canvas class="mini-map" id="mini-map"></canvas>
          <p class="xs muted" style="margin-top:var(--s-2)">${esc(e.region || '')}</p>
        </div>` : ''}
    </aside>`;
}

function section(id, label, inner) {
  return `<section id="sec-${id}"><h2>${esc(label)}</h2>${inner}</section>`;
}

/* ---------- Shared blocks ---------- */

function evidenceSection(e) {
  if (!e.claims.length) return '';
  const stats = groupBy(e.claims, (c) => c.confidence);
  const bar = db.CONFIDENCE_ORDER.map((k) => {
    const n = stats.get(k)?.length || 0;
    if (!n) return '';
    return `<span style="flex:${n};background:var(--c-${k})" title="${n} ${esc(db.CONFIDENCE_META[k].label)}"></span>`;
  }).join('');

  return section('evidence', 'Evidence', `
    <p class="small muted" style="margin-bottom:var(--s-4);max-width:64ch">
      The statements below summarise the principal evidence for this entry. Each is
      classified by evidence type and current level of scholarly confidence.
    </p>
    <div class="evidence-bar">${bar}</div>
    ${claimsList(e.claims)}
    <details style="margin-top:var(--s-5)">
      <summary class="small muted" style="cursor:pointer">What the confidence levels mean</summary>
      <div style="margin-top:var(--s-4)">${confidenceKey()}</div>
    </details>`);
}

function relationsSection(e) {
  const groups = db.neighboursByType(e.id);
  const order = [...groups.keys()].sort(
    (a, b) => (TYPE_META[a]?.order ?? 99) - (TYPE_META[b]?.order ?? 99));
  if (!order.length) return '';

  const neighbourEntities = order.flatMap((t) => groups.get(t).map((n) => n.entity));

  return section('related', 'Connections', `
    <p class="small muted" style="margin-bottom:var(--s-4)">
      ${e.relations.length} connections. Follow any of them — this is how the dataset is meant to be read.
    </p>
    <div class="graph-wrap" style="margin-bottom:var(--s-3)">
      <canvas class="graph-canvas" id="graph-canvas"></canvas>
      <div class="graph-legend">drag nodes · click to travel · hover to isolate</div>
    </div>
    ${tintLegend([e, ...neighbourEntities], periods)}
    <div style="margin-top:var(--s-5)"></div>
    ${order.map((t) => `
      <div class="rel-group">
        <h3>${esc(TYPE_META[t]?.plural || t)}</h3>
        <div class="rel-list">
          ${groups.get(t).map((n) => entityPill(n.entity, n.rel)).join('')}
        </div>
      </div>`).join('')}`);
}

function sourcesSection(e) {
  if (!e.sources.length) return '';
  const rows = e.sources.map((id) => ({ id, s: db.getSource(id) })).filter((r) => r.s);
  const ancient = rows.filter((r) => r.s.kind === 'ancient');
  const modern = rows.filter((r) => r.s.kind === 'modern');

  const list = (arr) => `<ul style="margin:0;padding-left:1.1em">${arr.map(({ s }) =>
    `<li><strong>${esc(s.author)}</strong>${s.year ? ` (${s.year})` : ''}, <em>${esc(s.title)}</em>${
      s.note ? `<br><span class="xs muted">${esc(s.note)}</span>` : ''}</li>`).join('')}</ul>`;

  return section('sources', 'Sources', `
    ${ancient.length ? `<div class="block"><h3>Ancient sources</h3>${list(ancient)}</div>` : ''}
    ${modern.length ? `<div class="block"><h3>Modern scholarship</h3>${list(modern)}</div>` : ''}
    <p class="xs muted" style="margin-top:var(--s-4)">
      <a href="#/sources">Browse the full bibliography →</a>
    </p>`);
}

function chronologySection(e) {
  // Build a chronology from dated neighbours — no hand-authoring required.
  const items = db.neighbours(e.id)
    .map((n) => n.entity)
    .filter((x) => x.start != null && !x.modern)
    .sort((a, b) => a.start - b.start);
  if (items.length < 3) return '';

  return section('chronology', 'Chronology', `
    <p class="small muted" style="margin-bottom:var(--s-5)">
      Connected entities in date order — the immediate historical neighbourhood.
    </p>
    <div class="stops" style="--tint:${db.tintVar(e.tint)}">
      ${items.map((x) => `
        <div class="stop" style="padding-bottom:var(--s-6)">
          <div class="stop-n num">${esc(entityDate(x))}</div>
          <h3 style="font-size:1.02rem"><a href="${entityHref(x.id)}">${esc(x.name)}</a></h3>
          <p class="note small">${esc(x.summary)}</p>
        </div>`).join('')}
    </div>`);
}

/* ============================================================
   Historical entity page
   ============================================================ */

function historyPage(e) {
  const sections = [
    { id: 'overview', label: 'Overview' },
    e.significance && { id: 'significance', label: 'Significance' },
    { id: 'related', label: 'Connections' },
    e.claims.length && { id: 'evidence', label: 'Evidence' },
    { id: 'chronology', label: 'Chronology' },
    e.sources.length && { id: 'sources', label: 'Sources' },
  ].filter(Boolean);

  const extras = [
    ['Politics', e.politics],
    ['Warfare', e.warfare],
    ['Culture', e.cultureNote],
  ].filter(([, v]) => v);

  return `
    ${heroHTML(e)}
    <div class="wrap">
      <div class="entity-layout">
        <div class="entity-main">
          ${section('overview', 'Overview', `
            <div class="prose" style="max-width:68ch">
              ${e.body ? paragraphs(e.body) : `<p>${esc(e.summary)}</p>`}
            </div>
            ${inlineFigure(e.secondaryImage)}
            ${extras.map(([k, v]) => block(k, v)).join('')}
            ${e.boundaryNote ? `<div class="register-note" style="margin-top:var(--s-5)">
              ${icon('info', { size: 17 })}<div><strong>On the dates.</strong> ${esc(e.boundaryNote)}</div></div>` : ''}
          `)}

          ${e.significance ? section('significance', 'Historical significance',
            `<div class="callout" style="--tint:${db.tintVar(e.tint)}"><p>${esc(e.significance)}</p></div>`) : ''}

          ${relationsSection(e)}
          ${evidenceSection(e)}
          ${chronologySection(e)}
          ${sourcesSection(e)}
        </div>
        ${sidebarHTML(e, sections)}
      </div>
    </div>`;
}

/* ============================================================
   Mythological entity page
   Registers are kept visually and structurally distinct.
   ============================================================ */

function mythPage(e) {
  const sections = [
    { id: 'myth', label: 'The myth' },
    { id: 'registers', label: 'Sources & cult' },
    { id: 'history', label: 'History & archaeology' },
    { id: 'related', label: 'Connections' },
    e.claims.length && { id: 'evidence', label: 'Evidence' },
    e.sources.length && { id: 'sources', label: 'Sources' },
  ].filter(Boolean);

  const mythBlock = (cls, label, text, ico) => text ? `
    <div class="myth-block ${cls}" style="--tint:${db.tintVar(e.tint)}">
      <h3>${icon(ico, { size: 14 })} ${esc(label)}</h3>
      <div class="prose">${paragraphs(text)}</div>
    </div>` : '';

  return `
    ${heroHTML(e)}
    <div class="wrap">
      <div class="entity-layout">
        <div class="entity-main">
          <div class="register-note">
            ${icon('info', { size: 18 })}
            <div>
              <strong>Reading this page.</strong> The story, the sources that record it, its
              religious function, and any historical or archaeological evidence are kept
              in separate sections. Myth is never presented here as history — and the
              absence of evidence for a story is not evidence that it meant nothing.
            </div>
          </div>

          ${section('myth', 'The myth', `
            ${mythBlock('is-myth', 'The story as told', e.myth || e.body, 'myth')}
          `)}

          ${section('registers', 'Sources and religious function', `
            ${mythBlock('', 'Earliest surviving source', e.earliestSource, 'quote')}
            ${mythBlock('', 'Religious importance', e.religious, 'deity')}
          `)}

          ${section('history', 'History and archaeology', `
            ${mythBlock('is-history', 'Possible historical background', e.historicalBackground, 'scales')}
            ${mythBlock('is-archaeo', 'What archaeology shows', e.archaeology, 'evArchaeo')}
            ${inlineFigure(e.secondaryImage)}
            ${mythBlock('', 'Later interpretation', e.laterInterpretation, 'sparkle')}
          `)}

          ${relationsSection(e)}
          ${evidenceSection(e)}
          ${sourcesSection(e)}
        </div>
        ${sidebarHTML(e, sections)}
      </div>
    </div>`;
}

/* ============================================================
   Mounting behaviour
   ============================================================ */

function mount(root, e) {
  /* ---------- Actions ---------- */
  $('#act-save', root)?.addEventListener('click', (ev) => {
    const on = store.toggleBookmark(e.id);
    ev.currentTarget.setAttribute('aria-pressed', String(on));
    ev.currentTarget.innerHTML = `${icon('bookmark', { size: 15 })} ${on ? 'Saved' : 'Save'}`;
  });

  $('#act-compare', root)?.addEventListener('click', (ev) => {
    const next = store.toggleCompare(e.id);
    const on = next.includes(e.id);
    ev.currentTarget.setAttribute('aria-pressed', String(on));
    ev.currentTarget.innerHTML = `${icon('compare', { size: 15 })} ${on ? 'In compare tray' : 'Compare'}`;
    if (next.length === 2) go(`/compare?a=${next[0]}&b=${next[1]}`);
  });

  $('#act-random', root)?.addEventListener('click', () => {
    // Prefer somewhere connected, so "surprise" still feels navigable.
    const pool = db.neighbours(e.id).map((n) => n.entity);
    const pick = pool.length > 2
      ? pool[Math.floor(Math.random() * pool.length)]
      : db.randomEntity((x) => !x.modern);
    if (pick) go(`/e/${pick.id}`);
  });

  /* ---------- Relationship graph ---------- */
  const gCanvas = $('#graph-canvas', root);
  let graph = null;
  if (gCanvas) {
    const { nodes, links } = db.subgraph(e.id, { depth: 1, maxNodes: 22 });
    graph = createGraph(gCanvas, {
      nodes, links, rootId: e.id,
      onNodeClick: (target) => go(`/e/${target.id}`),
    });
  }

  /* ---------- Mini map ---------- */
  const mCanvas = $('#mini-map', root);
  let mini = null;
  if (mCanvas && e.coords) {
    mini = createMap(mCanvas, {
      year: e.start ?? -450,
      layers: { territories: true, cities: true, sites: true, battles: true, labels: false, routes: false },
      basemap: 'relief',
      markers: [],
      focus: e,
      onMarkerClick: () => {},
      // Static preview only -- see the comment on the `interactive` option
      // in map-canvas.js for why a scroll-hijacking mini-map is a bug.
      interactive: false,
    });
    // Frame a window around the entity.
    const [lat, lon] = e.coords;
    mini.flyTo([lon - 9, lat - 6, lon + 9, lat + 6], 0.08);
  }

  /* ---------- Scroll-spy for the table of contents ---------- */
  const links = $$('.toc a', root);
  const targets = $$('.entity-main > section', root);
  let io = null;
  if (links.length && targets.length) {
    io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const id = en.target.id.replace('sec-', '');
        links.forEach((a) => a.classList.toggle('active', a.dataset.sec === id));
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    targets.forEach((t) => io.observe(t));
  }

  links.forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    document.getElementById(a.getAttribute('href').slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  /* ---------- Cleanup ---------- */
  const observer = new MutationObserver(() => {
    if (!document.contains(root)) {
      graph?.destroy();
      mini?.destroy();
      io?.disconnect();
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main'), { childList: true });
}
