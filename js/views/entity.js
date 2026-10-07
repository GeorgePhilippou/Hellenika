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
import { periods, primaryPeriodAt } from '../../data/periods.js';
import { go, entityHref } from '../router.js';
import * as store from '../store.js';
import { createGraph } from '../components/graph.js';
import { createMap } from '../components/map-canvas.js';
import {
  entityDate, entityCard, claimsList, confidenceKey,
  paragraphs, block, proseSeen, factList, emptyState, typeChip, tintLegend, inlineFigure,
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

  document.title = `${e.name} — Ἑλληνικά`;
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
  const homeRel = !e.region ? homeRelation(e) : null;
  const traditional = e.coords && isTraditionalLocation(e);
  const mapBtn = !e.coords ? '' : traditional
    ? `<span class="btn btn-sm btn-disabled" aria-disabled="true"
             title="A traditional or legendary association, not a confirmed location">
         ${icon('map', { size: 15 })} On the map
       </span>`
    : `<a class="btn btn-sm" href="#/map?focus=${encodeURIComponent(e.id)}">${icon('map', { size: 15 })} On the map</a>`;
  // "Why it matters" shows the significance in full, and is the only
  // place it appears on the page. This used to be a 120-character
  // teaser linking down to a "Historical significance" section, but
  // almost every significance text is a single sentence, so the teaser
  // cut mid-clause and the section below then repeated the same words
  // over again. Showing it once, whole, fixes both. Texts run ~64-330
  // characters, which the box absorbs comfortably -- and the longer
  // ones are useful here, since this box exists to fill the dead space
  // beside a tall portrait photo (see .hero-significance in views.css).
  return `
    <header class="entity-hero" style="--tint:${db.tintVar(e.tint)}">
      <div class="wrap entity-hero-grid">
        <div class="entity-hero-text">
          <div class="entity-kicker">
            ${typeChip(e)}
            ${e.subtype ? `<span class="chip">${esc(e.subtype)}</span>` : ''}
            ${e.legendary ? `<span class="conf conf-legendary">Legendary</span>` : ''}
            ${e.start != null ? `<span class="chip num">${esc(entityDate(e))}</span>` : ''}
            ${e.region ? `<span class="chip">${esc(e.region)}</span>`
              : homeRel ? `<span class="chip">${esc(homeRel.entity.name)}</span>` : ''}
          </div>
          <h1>${esc(e.name)}</h1>
          ${e.altNames.length ? `<p class="entity-alt">Also known as ${esc(e.altNames.join(' · '))}</p>` : ''}
          <p class="entity-summary">${esc(e.summary)}</p>
          ${e.significance ? `
          <div class="hero-significance">
            <span class="hero-significance-label">Why it matters</span>
            <p>${esc(e.significance)}</p>
          </div>` : ''}
          <div class="entity-actions">
            ${mapBtn}
            ${e.start != null && !e.modern ? `<a class="btn btn-sm" href="#/timeline">${icon('timeline', { size: 15 })} On the timeline</a>` : ''}
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

// A "this is genuinely where they're from" relation, as opposed to one of
// possibly many places merely visited, mentioned, or associated in
// passing (a well-travelled hero can rack up a dozen "related to" links
// to myth-places -- every Odyssey stop -- which are a poor substitute
// for "ruled (myth): Ithaca" specifically).
const HOME_REL = /^(ruled|king of|queen of|born at|birthplace of)/i;

/**
 * Every related site/city/legendary-place entity, home-relations (see
 * HOME_REL) sorted first. Covers most non-place categories (events,
 * artefacts, myths, texts), which only ever got coordinates, not a
 * `region` of their own. Includes myth-type places (e.g. Ithaca, Olympus)
 * since a hero's only connection to their home is often the inverse of
 * that place's own "ruled by (myth)"-style relation, not a real site/city
 * entity.
 */
function siteRelations(e) {
  const all = db.neighbours(e.id)
    .filter((r) => r.entity && (
      r.entity.type === 'site' || r.entity.type === 'city'
      || (r.entity.type === 'myth' && r.entity.subtype === 'place')
    ));
  const home = all.filter((r) => HOME_REL.test(r.rel));
  // Among the rest, the place the entry's own map pin is on comes first
  // -- the Odyssey is pinned on Ithaca, not on the alphabetically first
  // of its fourteen settings (Aeaea).
  const pinnedHere = (r) => e.coords && r.entity.coords
    && Math.abs(r.entity.coords[0] - e.coords[0]) < 0.3 && Math.abs(r.entity.coords[1] - e.coords[1]) < 0.3;
  const rest = all.filter((r) => !HOME_REL.test(r.rel));
  return [...home, ...rest.filter(pinnedHere), ...rest.filter((r) => !pinnedHere(r))];
}

/** The single best location reference -- for panels that already show
 * the relation's own label alongside it, so even an imprecise pick
 * ("Related to: Aeaea") still reads as qualified rather than asserted. */
function siteRelation(e) {
  return siteRelations(e)[0] || null;
}

/** Stricter than siteRelation() -- only a genuine "this is where they're
 * from" relation, never an arbitrary place merely mentioned in passing.
 * For the page header, which shows just a bare place name with no
 * qualifying label, so a wrong or arbitrary guess would read as fact. */
function homeRelation(e) {
  const rel = siteRelation(e);
  return rel && HOME_REL.test(rel.rel) ? rel : null;
}

/**
 * A region hedged as "traditional"/"traditionally" (Homer's birthplace,
 * claimed by seven rival cities; most Odyssey stops, identified only by
 * later, disputed guesswork) reflects a real absence of consensus, not
 * just an approximate-but-agreed location -- the map link for these is
 * disabled rather than presented as a firm, findable pin.
 */
function isTraditionalLocation(e) {
  return /tradition/i.test(e.region || '');
}

/** A [label, value] fact-list pair for where an entity is/was, in whatever
 * form is available -- an authored region, a related site, or nothing. */
function locationFact(e, siteRel) {
  if (e.region) return ['Region', esc(e.region)];
  if (siteRel) {
    const label = siteRel.rel.charAt(0).toUpperCase() + siteRel.rel.slice(1);
    return [label, `<a href="${entityHref(siteRel.id)}">${esc(siteRel.entity.name)}</a>`];
  }
  return ['Region', null];
}

/** The Location panel's caption -- same source as locationFact(), but
 * falls all the way back to bare coordinates since that panel doesn't
 * have its own separate Coordinates row the way the Facts panel does. */
function locationCaption(e, siteRel) {
  if (e.region) return esc(e.region);
  if (siteRel) {
    const label = siteRel.rel.charAt(0).toUpperCase() + siteRel.rel.slice(1);
    return `${esc(label)}: <a href="${entityHref(siteRel.id)}">${esc(siteRel.entity.name)}</a>`;
  }
  if (e.coords) return `<span class="num">${e.coords[0].toFixed(3)}, ${e.coords[1].toFixed(3)}</span>`;
  return '';
}

const periodLink = (p) => `<a href="#/timeline/${p.id}">${esc(p.name)}</a>`;

/**
 * The Facts panel's Period row, worked out from the entry's own dates.
 * It used to be read off `tint` (the entry's colour), which put the
 * Iliad (c. 750 BC), Homer and Leonidas in periods that had already
 * ended, and called Athens (1400-30 BC) simply "Classical Greece". The
 * authored tint still wins whenever the dates actually fall inside it.
 */
function periodFact(e) {
  const tinted = periods.find((p) => p.tint === e.tint);
  if (e.start == null || e.modern || e.legendary || e.type === 'myth' || e.type === 'deity') {
    return tinted ? periodLink(tinted) : null;
  }
  const FIRST = periods[0].start, LAST = Math.max(...periods.map((p) => p.end));
  const a = Math.max(e.start, FIRST), b = Math.min(e.end ?? e.start, LAST);
  // Entirely after the atlas closes: a later work about an earlier age
  // (Plutarch's Life of Alexander, AD 100).
  if (a > b && e.start > LAST) return tinted ? `After 30 BC · about ${periodLink(tinted)}` : null;
  // Entirely before it opens (Neolithic Choirokoitia).
  if (a > b) return `Before ${esc(fmtYear(FIRST))}`;
  // The authored period, whenever the dates sit mostly inside it or
  // within a generation of its edge (Marathon, 490 BC, is conventionally
  // the opening of the Classical story; Alexander defines his own era).
  const mid = (a + b) / 2;
  const GRACE = 25;
  const overlap = tinted ? Math.min(b, tinted.end) - Math.max(a, tinted.start) : -1;
  if (tinted && (overlap >= (b - a) * 2 / 3
    || (mid >= tinted.start - GRACE && mid <= tinted.end + GRACE && b - a <= 200))) {
    return periodLink(tinted);
  }
  // Long-lived places span many periods; name the first and the last
  // (nudged inside the range so a shared boundary year picks the later
  // period at the start and the earlier one at the end).
  if (b - a > 200) {
    const first = primaryPeriodAt(a + 1), last = primaryPeriodAt(b - 1);
    if (first && last && first !== last) return `${periodLink(first)} – ${periodLink(last)}`;
  }
  const dated = primaryPeriodAt(mid);
  return dated ? periodLink(dated) : tinted ? periodLink(tinted) : null;
}

function sidebarHTML(e, sections) {
  const siteRel = !e.region ? siteRelation(e) : null;
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
          [e.type === 'deity' || e.type === 'myth' || e.legendary ? 'Chronology' : 'Dates', e.start != null ? `<span class="num">${esc(entityDate(e))}</span>` : null],
          locationFact(e, siteRel),
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
          ['Period', periodFact(e)],
          ['Connections', `${db.neighbours(e.id).length}`],
        ])}
      </div>

      ${e.coords ? `
        <div class="panel">
          <h3 class="eyebrow" style="margin-bottom:var(--s-3)">${isTraditionalLocation(e) ? 'Traditional location' : 'Location'}</h3>
          <canvas class="mini-map" id="mini-map"></canvas>
          <p class="xs muted" style="margin-top:var(--s-2)">${locationCaption(e, siteRel)}</p>
          ${isTraditionalLocation(e) ? `
          <span class="btn btn-sm btn-disabled" aria-disabled="true"
                style="margin-top:var(--s-3);width:100%;justify-content:center"
                title="A traditional or legendary association, not a confirmed location">
            ${icon('map', { size: 14 })} Open on the full map
          </span>` : `
          <a class="btn btn-sm" style="margin-top:var(--s-3);width:100%;justify-content:center"
             href="#/map?focus=${encodeURIComponent(e.id)}">${icon('map', { size: 14 })} Open on the full map</a>`}
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
      ${db.neighbours(e.id).length} connections. Follow any of them — this is how the dataset is meant to be read.
    </p>
    <div class="graph-wrap" style="margin-bottom:var(--s-3)">
      <canvas class="graph-canvas" id="graph-canvas"></canvas>
      <div class="graph-legend">drag nodes · click to travel · hover to isolate</div>
    </div>
    <details class="block">
      <summary>Read all connections</summary>
      <ul>${db.neighbours(e.id).map((r) => `<li>${esc(r.rel)}:
        <a href="${entityHref(r.id)}">${esc(r.entity.name)}</a></li>`).join('')}</ul>
    </details>
    ${tintLegend([e, ...neighbourEntities], periods)}`);
}

function sourcesSection(e) {
  if (!e.sources.length) return '';
  const rows = e.sources.map((id) => ({ id, s: db.getSource(id) })).filter((r) => r.s);
  const ancient = rows.filter((r) => r.s.kind === 'ancient');
  const modern = rows.filter((r) => r.s.kind === 'modern');

  const list = (arr) => `<ul style="margin:0;padding-left:1.1em">${arr.map(({ s }) =>
    `<li><strong>${esc(s.author)}</strong>${s.year ? ` (${s.year})` : ''}, <em>${s.url && /^https?:\/\//.test(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}</em>${
      s.note ? `<br><span class="xs muted">${esc(s.note)}</span>` : ''}</li>`).join('')}</ul>`;

  return section('sources', 'Sources', `
    ${ancient.length ? `<div class="block"><h3>Ancient sources</h3>${list(ancient)}</div>` : ''}
    ${modern.length ? `<div class="block"><h3>Modern scholarship</h3>${list(modern)}</div>` : ''}
    <p class="xs muted" style="margin-top:var(--s-4)">
      <a href="#/sources">Browse the full bibliography →</a>
    </p>`);
}

// How many timeline items to show either side of the entry itself
// before the rest folds away -- hub pages (Athens, Archaic Greece) can
// have 60-80 dated neighbours.
const CHRONOLOGY_BEFORE = 5;
const CHRONOLOGY_AFTER = 6;

// Long-lived places, periods and polities frame an entry rather than
// happen around it. Sorted in with everything else by their start date,
// Athens (1400 BC) opened Pericles' chronology and Babylon (1894 BC)
// sat a millennium and a half before Alexander's death there.
const CONTEXT_TYPES = new Set(['period', 'city', 'site', 'region', 'empire', 'kingdom', 'writing', 'language']);
const span = (x) => (x.end ?? x.start) - x.start;

/**
 * Splits an entry's connections into the four things a reader needs to
 * place it: a timeline with the entry itself in it, the longer-lived
 * setting it belongs to, the myth it draws on (undatable, so never put
 * on the same axis as history), and the modern rediscovery of it.
 */
function chronologyGroups(e) {
  const timeline = [], setting = [], myth = [], modern = [];
  for (const n of db.neighbours(e.id)) {
    const x = n.entity;
    if (x.modern) modern.push(n);
    else if (x.type === 'myth' || x.type === 'deity' || x.legendary) myth.push(n);
    else if (x.start == null) continue;
    else if (CONTEXT_TYPES.has(x.type) && span(x) > Math.max(150, 2 * span(e))) setting.push(n);
    else timeline.push(n);
  }
  const byStart = (a, b) => a.entity.start - b.entity.start;
  timeline.sort(byStart);
  setting.sort(byStart);
  modern.sort(byStart);
  myth.sort((a, b) => a.entity.sortName.localeCompare(b.entity.sortName));

  // The entry itself goes in as the anchor everything else is read
  // against -- previously the Odyssey's own chronology never said when
  // the Odyssey was composed.
  // A city or site that lasted a millennium *is* the whole timeline; an
  // anchor at its founding date would just push everything into "later".
  const dated = e.start != null && !e.modern && !e.legendary && e.type !== 'myth' && e.type !== 'deity'
    && span(e) <= 250;
  let anchor = -1;
  if (dated && timeline.length) {
    anchor = timeline.findIndex((n) => n.entity.start > e.start);
    if (anchor === -1) anchor = timeline.length;
    timeline.splice(anchor, 0, { self: true, entity: e, rel: '' });
  }
  return { timeline, anchor, setting, myth, modern };
}

function hasChronology(e) {
  const g = chronologyGroups(e);
  return g.timeline.length >= 2 || g.setting.length || g.myth.length || g.modern.length;
}

function chronologySection(e) {
  const { timeline, anchor, setting, myth, modern } = chronologyGroups(e);
  if (!(timeline.length >= 2 || setting.length || myth.length || modern.length)) return '';

  const stopHTML = ({ entity: x, rel, self }) => self ? `
    <div class="stop is-self">
      <div class="stop-n num">${esc(entityDate(x))}</div>
      <h3 style="font-size:1.02rem">${esc(x.name)} <span class="stop-self-tag">this entry</span></h3>
    </div>` : `
    <div class="stop">
      <div class="stop-n num">${esc(entityDate(x))}</div>
      <h3 style="font-size:1.02rem">
        <a href="${entityHref(x.id)}">${esc(x.name)}</a>
        <span class="stop-rel">${esc(rel)}</span>
      </h3>
      <p class="note small">${esc(x.summary)}</p>
    </div>`;
  const stops = (items) => `<div class="stops" style="--tint:${db.tintVar(e.tint)}">${items.map(stopHTML).join('')}</div>`;

  // A window around the entry, with what lies further back or further
  // on folded away on the side it belongs to.
  let timelineHTML = '';
  if (timeline.length >= 2) {
    const centre = anchor === -1 ? 0 : anchor;
    let from = Math.max(0, centre - CHRONOLOGY_BEFORE);
    let to = Math.min(timeline.length, centre + CHRONOLOGY_AFTER + 1);
    if (anchor === -1) { from = 0; to = Math.min(timeline.length, CHRONOLOGY_BEFORE + CHRONOLOGY_AFTER + 1); }
    const earlier = timeline.slice(0, from), shown = timeline.slice(from, to), later = timeline.slice(to);
    timelineHTML = `
      <div class="chron-group">
        <h3 class="eyebrow">Timeline</h3>
        <p class="small muted chron-intro">
          ${anchor === -1 ? 'Connected people, events and works in date order.'
            : `Where ${esc(e.name)} falls among the people, events and works connected to it.`}
        </p>
        ${earlier.length ? `
        <details class="chronology-more">
          <summary class="small muted">Show ${earlier.length} earlier</summary>
          <div style="margin:var(--s-6) 0">${stops(earlier)}</div>
        </details>` : ''}
        ${stops(shown)}
        ${later.length ? `
        <details class="chronology-more">
          <summary class="small muted">Show ${later.length} later</summary>
          <div style="margin-top:var(--s-6)">${stops(later)}</div>
        </details>` : ''}
      </div>`;
  }

  const row = ({ entity: x, rel }, { date = true } = {}) => `
    <li>
      <a href="${entityHref(x.id)}">${esc(x.name)}</a>
      <span class="stop-rel">${esc(rel)}</span>
      ${date && x.start != null ? `<span class="chron-row-date num">${esc(entityDate(x))}</span>` : ''}
    </li>`;
  const group = (title, intro, items, opts) => items.length ? `
    <div class="chron-group">
      <h3 class="eyebrow">${title}</h3>
      <p class="small muted chron-intro">${intro}</p>
      <ul class="chron-list">${items.map((n) => row(n, opts)).join('')}</ul>
    </div>` : '';

  return section('chronology', 'Chronology', `
    ${timelineHTML}
    ${group('Setting', 'The longer-lived periods, places and powers this belongs to.', setting)}
    ${group('In myth and cult', 'Figures, gods and places of the mythological tradition. These have no historical date, so they are kept off the timeline.', myth, { date: false })}
    ${group('Rediscovery', 'The modern excavators, decipherers and events through which it is known today.', modern)}`);
}

/* ============================================================
   Historical entity page
   ============================================================ */

function historyPage(e) {
  // One set for the whole page -- see the same seeding in mythPage().
  const seen = proseSeen(e);
  // No 'Significance' section or Contents entry: the hero's "Why it
  // matters" box carries that text in full, and a section repeating it
  // verbatim was the whole problem.
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'related', label: 'Connections' },
    e.claims.length && { id: 'evidence', label: 'Evidence' },
    hasChronology(e) && { id: 'chronology', label: 'Chronology' },
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
              ${e.body ? paragraphs(e.body, seen) : `<p>${esc(e.summary)}</p>`}
            </div>
            ${inlineFigure(e.secondaryImage)}
            ${extras.map(([k, v]) => block(k, v, seen)).join('')}
            ${e.boundaryNote ? `<div class="register-note" style="margin-top:var(--s-5)">
              ${icon('info', { size: 17 })}<div><strong>On the dates.</strong> ${esc(e.boundaryNote)}</div></div>` : ''}
          `)}

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
  // One set for the whole page: each entity gets linked at its first
  // prose mention and stays plain text after that.
  const seen = proseSeen(e);
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
      <div class="prose">${paragraphs(text, seen)}</div>
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
