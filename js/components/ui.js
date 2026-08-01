/* ============================================================
   Hellenika — Shared UI fragments
   These return HTML strings so views can compose them cheaply.
   Anything interactive is wired by the view that mounts it.
   ============================================================ */

import { esc, fmtRange, fmtYear, truncate } from '../util.js';
import { icon, TYPE_ICON, EVIDENCE_ICON } from '../icons.js';
import { entityHref } from '../router.js';
import { tintVar, TYPE_META, CONFIDENCE_META, EVIDENCE_META, CONFIDENCE_ORDER, AUTOLINK } from '../db.js';

/** Human date label for an entity, honouring approx / floruit / modern. */
export function entityDate(e) {
  if (e.start == null) return '';
  if (e.modern) return `${e.start}–${e.end ?? ''}`;
  const range = fmtRange(e.start, e.end, e.approx);
  if (e.floruit) return `fl. ${range}`;
  return range;
}

/** Compact one-line meta string: type · date · region. */
export function entityMeta(e) {
  return [e.typeLabel, entityDate(e), e.region].filter(Boolean).join(' · ');
}

/* ---------- Cards ---------- */

export function entityCard(e, { showGlyph = true } = {}) {
  const date = entityDate(e);
  return `
    <a class="card ecard" href="${entityHref(e.id)}" style="--tint:${tintVar(e.tint)}">
      ${showGlyph ? `<div class="ecard-glyph" data-img-id="${esc(e.id)}">${icon(TYPE_ICON[e.type] || 'sparkle', { size: 38 })}</div>` : ''}
      <div class="ecard-body">
        <div class="ecard-title">${esc(e.name)}</div>
        <div class="ecard-meta">
          <span class="chip" style="--tint:${tintVar(e.tint)}"><i class="chip-dot"></i>${esc(e.typeLabel)}</span>
          ${date ? `<span class="num">${esc(date)}</span>` : ''}
        </div>
        <p class="ecard-sum">${esc(e.summary)}</p>
      </div>
    </a>`;
}

export function entityCardGrid(list, opts) {
  if (!list.length) return emptyState('Nothing matches these filters yet.');
  return `<div class="grid grid-auto">${list.map((e) => entityCard(e, opts)).join('')}</div>`;
}

/* ---------- Pills & chips ---------- */

export function entityPill(e, rel) {
  return `
    <a class="rel-pill" href="${entityHref(e.id)}" style="--tint:${tintVar(e.tint)}">
      <span class="rel-thumb" data-img-id="${esc(e.id)}"></span>
      <span>${esc(e.name)}</span>
      ${rel ? `<span class="rel">${esc(rel)}</span>` : ''}
    </a>`;
}

export function typeChip(e) {
  return `<span class="chip" style="--tint:${tintVar(e.tint)}"><i class="chip-dot"></i>${esc(e.typeLabel)}</span>`;
}

export function confidenceBadge(conf) {
  const meta = CONFIDENCE_META[conf];
  if (!meta) return '';
  return `<span class="conf conf-${conf}" title="${esc(meta.desc)}">${esc(meta.label)}</span>`;
}

export function evidenceBadge(ev) {
  const meta = EVIDENCE_META[ev];
  if (!meta) return '';
  return `<span class="evtype" title="${esc(meta.desc)}">${icon(EVIDENCE_ICON[ev] || 'info', { size: 13 })}${esc(meta.label)}</span>`;
}

/* ---------- Evidence ---------- */

export function claimRow(c) {
  return `
    <div class="claim">
      <p class="claim-text">${esc(c.text)}</p>
      <div class="claim-meta">
        ${evidenceBadge(c.evidence)}
        ${confidenceBadge(c.confidence)}
      </div>
    </div>`;
}

export function claimsList(claims) {
  if (!claims?.length) return '';
  // Most-secure claims first, so the page leads with what is known.
  const order = (c) => CONFIDENCE_ORDER.indexOf(c.confidence);
  const sorted = [...claims].sort((a, b) => order(a) - order(b));
  return `<div class="claims">${sorted.map(claimRow).join('')}</div>`;
}

export function confidenceKey() {
  return `<div class="conf-key">${CONFIDENCE_ORDER.map((k) => `
    <div class="conf-key-row">
      ${confidenceBadge(k)}
      <p>${esc(CONFIDENCE_META[k].desc)}</p>
    </div>`).join('')}</div>`;
}

/* ---------- Section scaffolding ---------- */

export function sectionHead(title, sub, action = '') {
  return `
    <div class="section-head">
      <div>
        <h2>${esc(title)}</h2>
        ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
      </div>
      ${action}
    </div>`;
}

export function emptyState(msg, sub = '') {
  return `<div class="empty">${icon('compass', { size: 42 })}
    <p>${esc(msg)}</p>${sub ? `<p class="xs">${esc(sub)}</p>` : ''}</div>`;
}

/**
 * Inline emphasis for authored prose. Body text uses *asterisks* to mark
 * transliterated Greek and technical terms; render those as <em> after
 * escaping, so the markup can never come from the content itself.
 */
export function inline(text) {
  return esc(text)
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/\b(\d+)\/(\d+)\b/g, '$1/$2');
}

/**
 * Turn the first prose mention of each other entity into a link.
 *
 * Only the first mention, and only once per page: linking every
 * occurrence of "Athens" across a long entry turns the paragraph into a
 * wall of blue and stops signalling anything. `seen` is therefore shared
 * across all the paragraphs of one page, and seeded with the entity's
 * own id so a page never links to itself.
 *
 * Runs on already-escaped HTML, so it splits on tags and rewrites only
 * the text between them -- never inside `<em>`'s angle brackets, and
 * never inside an href it has just written.
 */
export function linkEntities(html, seen) {
  if (!AUTOLINK.pattern) return html;
  return html.split(/(<[^>]*>)/).map((chunk) => {
    if (!chunk || chunk[0] === '<') return chunk;
    return chunk.replace(AUTOLINK.pattern, (match) => {
      const id = AUTOLINK.byName.get(match);
      if (!id || seen.has(id)) return match;
      seen.add(id);
      return `<a class="prose-link" href="${entityHref(id)}">${match}</a>`;
    });
  }).join('');
}

/**
 * The starting set for one page's prose autolinking: the entity's own
 * id, plus any entity whose linkable name is contained in this one's
 * name. Without that second part the "Thebes (Waset)" page would link
 * the word "Thebes" in its own first sentence to Boeotian Thebes, and
 * any page whose name contains another's would do the same.
 */
export function proseSeen(e) {
  const seen = new Set([e.id]);
  for (const [name, id] of AUTOLINK.byName) {
    if (id !== e.id && e.name.includes(name)) seen.add(id);
  }
  return seen;
}

/**
 * Split a body string on blank lines into paragraphs.
 *
 * Pass `seen` (a Set of entity ids, pre-seeded with the current page's
 * own id) to autolink the first prose mention of other entities. Called
 * without it, prose is left unlinked -- which is what the timeline and
 * collection intros want, since those already sit next to entity lists.
 */
export function paragraphs(text, seen = null) {
  if (!text) return '';
  return text.split(/\n\n+/)
    .map((p) => {
      const body = inline(p.trim());
      return `<p>${seen ? linkEntities(body, seen) : body}</p>`;
    })
    .join('');
}

/**
 * A second, deliberately different photo referenced from an entity's
 * own prose -- e.g. a site view alongside a portrait-style hero image.
 * `img` is `{ wikipediaTitle, caption }`, hand-picked in content rather
 * than derived automatically. Resolved client-side by images.js; the
 * whole element removes itself if no photo turns up (see hydrateImages).
 */
export function inlineFigure(img) {
  if (!img?.wikipediaTitle) return '';
  return `
    <figure class="inline-figure" data-img-title="${esc(img.wikipediaTitle)}">
      <figcaption>${esc(img.caption || '')}</figcaption>
    </figure>`;
}

export function block(label, text, seen = null) {
  if (!text) return '';
  return `<div class="block"><h3>${esc(label)}</h3><div class="prose">${paragraphs(text, seen)}</div></div>`;
}

/* ---------- Graph tint legend ----------
   The relationship graph colours each node by its era (the same --p-*
   tint used everywhere else), not by entity type, so a first-time
   reader has no way to tell what a node's colour means. This renders
   a compact swatch-per-era row for whatever eras actually appear
   among the given entities, rather than listing all eleven regardless
   of relevance. */
export function tintLegend(entities, periods) {
  const seen = new Map(); // tint -> period name
  for (const ent of entities) {
    if (!ent?.tint || seen.has(ent.tint)) continue;
    const period = periods.find((p) => p.tint === ent.tint);
    seen.set(ent.tint, period ? period.name : ent.tint);
  }
  if (!seen.size) return '';
  return `<div class="tint-legend">${[...seen].map(([tint, label]) => `
    <span class="tint-legend-item"><i style="background:${tintVar(tint)}"></i>${esc(label)}</span>`).join('')}</div>`;
}

/* ---------- Mini timeline strip ---------- */

const T_MIN = -3200, T_MAX = -30;
const pct = (y) => ((y - T_MIN) / (T_MAX - T_MIN)) * 100;

/**
 * A small static timeline showing where an entity sits against the
 * period bands. `periods` is the array from data/periods.js.
 */
export function miniTimeline(e, periods) {
  if (e.start == null || e.modern) return '';
  const bands = periods.map((p) => {
    const l = Math.max(0, pct(p.start));
    const w = Math.min(100, pct(p.end)) - l;
    if (w <= 0) return '';
    return `<i class="band" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%;background:${tintVar(p.tint)}"></i>`;
  }).join('');

  const l = Math.max(0, pct(e.start));
  const w = Math.max(0.6, Math.min(100, pct(e.end ?? e.start)) - l);

  return `
    <div class="mini-tl" role="img" aria-label="Timeline position: ${esc(entityDate(e))}">
      ${bands}
      <i class="marker" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%"></i>
      <div class="axis"><span>3200 BC</span><span class="num">${esc(entityDate(e))}</span><span>30 BC</span></div>
    </div>`;
}

/* ---------- Definition list ---------- */

export function factList(pairs) {
  const rows = pairs.filter(([, v]) => v != null && v !== '');
  if (!rows.length) return '';
  return `<dl class="factlist">${rows.map(([k, v]) =>
    `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

/* ---------- Type filter chips ---------- */

export function typeChips(types, active, { prefix = '' } = {}) {
  return types.map((t) => `
    <button class="chip${active === t ? ' is-on' : ''}" data-type="${esc(t)}">
      ${prefix}${esc(TYPE_META[t]?.plural || t)}
    </button>`).join('');
}

/* ---------- Loading ---------- */

export function skeletonGrid(n = 6) {
  return `<div class="grid grid-auto">${Array.from({ length: n },
    () => '<div class="shimmer" style="height:210px"></div>').join('')}</div>`;
}

/* ---------- Breadcrumb ---------- */

export function backLink(href, label) {
  return `<a class="btn btn-ghost btn-sm" href="${href}">${icon('arrowLeft', { size: 15 })} ${esc(label)}</a>`;
}
