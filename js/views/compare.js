/* ============================================================
   Hellenika — Compare
   Side-by-side comparison across a fixed set of dimensions, so
   two entities are always measured against the same questions.
   ============================================================ */

import { el, $, $$, esc, debounce, fmtYear } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { periods } from '../../data/periods.js';
import { go, entityHref } from '../router.js';
import { entityDate, miniTimeline, sectionHead, claimsList } from '../components/ui.js';

const PRESETS = [
  ['minoan-civilisation', 'mycenaean-civilisation', 'Minoans vs Mycenaeans'],
  ['athens', 'sparta', 'Athens vs Sparta'],
  ['philip-ii', 'alexander-the-great', 'Philip II vs Alexander'],
  ['classical-greece', 'hellenistic-period', 'Classical vs Hellenistic'],
  ['linear-a', 'linear-b', 'Linear A vs Linear B'],
  ['herodotus', 'thucydides', 'Herodotus vs Thucydides'],
  ['iliad', 'odyssey', 'Iliad vs Odyssey'],
  ['achaemenid-empire', 'alexander-empire', 'Persia vs Macedon'],
];

/** The comparison dimensions, in the order the spec asks for. */
const ROWS = [
  { key: 'dates', label: 'Dates', get: (e) => e.start != null ? `<span class="num">${esc(entityDate(e))}</span>` : null },
  { key: 'type', label: 'Kind', get: (e) => esc(e.typeLabel) + (e.subtype ? ` · ${esc(e.subtype)}` : '') },
  { key: 'region', label: 'Region', get: (e) => e.region ? esc(e.region) : null },
  { key: 'summary', label: 'In a sentence', get: (e) => esc(e.summary) },
  { key: 'timeline', label: 'Timeline', get: (e) => miniTimeline(e, periods) },
  { key: 'significance', label: 'Significance', get: (e) => e.significance ? esc(e.significance) : null },
  { key: 'government', label: 'Government', get: (e) => e.politics ? esc(e.politics) : null },
  { key: 'military', label: 'Military', get: (e) => e.warfare ? esc(e.warfare) : null },
  { key: 'culture', label: 'Culture & religion', get: (e) => e.cultureNote ? esc(e.cultureNote) : null },
  { key: 'writing', label: 'Writing', get: writingCell },
  { key: 'evidence', label: 'Evidence base', get: evidenceCell },
  { key: 'debates', label: 'Open debates', get: debatesCell },
  { key: 'connections', label: 'Connections', get: connectionsCell },
  { key: 'sources', label: 'Key sources', get: sourcesCell },
  { key: 'legacy', label: 'Legacy', get: (e) => e.laterInterpretation ? esc(e.laterInterpretation) : null },
];

export async function renderCompare(_p, query) {
  const root = el('div', { class: 'view' });
  const tray = store.get('compare');
  const a = db.get(query?.a || tray[0]) || null;
  const b = db.get(query?.b || tray[1]) || null;

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Side by side</p>
          <h1>Compare</h1>
          <p class="sub">Two entities, measured against the same questions.</p>
        </div>
      </div>

      <div class="cmp-pickers">
        <button class="cmp-slot${a ? ' filled' : ''}" id="slot-a" data-slot="a"
                style="--tint:${a ? db.tintVar(a.tint) : 'var(--accent)'}">
          ${slotInner(a, 'Choose the first')}
        </button>
        <span class="cmp-vs">versus</span>
        <button class="cmp-slot${b ? ' filled' : ''}" id="slot-b" data-slot="b"
                style="--tint:${b ? db.tintVar(b.tint) : 'var(--accent)'}">
          ${slotInner(b, 'Choose the second')}
        </button>
      </div>

      <div style="margin-top:var(--s-5)">
        <p class="eyebrow" style="margin-bottom:var(--s-3)">Try one of these</p>
        <div class="cmp-suggest">
          ${PRESETS.filter(([x, y]) => db.has(x) && db.has(y)).map(([x, y, label]) =>
            `<a class="chip" href="#/compare?a=${x}&b=${y}">${esc(label)}</a>`).join('')}
        </div>
      </div>

      <div id="cmp-body"></div>
    </div>`;

  root.__mount = () => mount(root, a, b);
  return root;
}

function slotInner(e, placeholder) {
  if (!e) {
    return `<span class="ico">${icon('plus', { size: 18 })}</span>
      <span><span class="nm">${esc(placeholder)}</span>
      <span class="sb">Click to search</span></span>`;
  }
  return `<span class="ico">${icon(TYPE_ICON[e.type] || 'sparkle', { size: 18 })}</span>
    <span><span class="nm">${esc(e.name)}</span>
    <span class="sb">${esc(e.typeLabel)}${e.start != null ? ' · ' + esc(entityDate(e)) : ''}</span></span>`;
}

function mount(root, a, b) {
  const body = $('#cmp-body', root);

  const paint = () => {
    if (!a || !b) {
      body.innerHTML = `
        <div class="empty" style="padding-block:var(--s-16)">
          ${icon('compare', { size: 44 })}
          <p>Pick two entities to compare.</p>
          <p class="xs">Any two work — a city against a city, or a script against a script.</p>
        </div>`;
      return;
    }

    document.title = `${a.name} vs ${b.name} — Hellenika`;

    const rows = ROWS
      .map((r) => ({ r, av: r.get(a), bv: r.get(b) }))
      .filter(({ av, bv }) => av || bv);

    body.innerHTML = `
      <table class="cmp-table">
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Dimension</span></th>
            <th scope="col"><a href="${entityHref(a.id)}">${esc(a.name)}</a></th>
            <th scope="col"><a href="${entityHref(b.id)}">${esc(b.name)}</a></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ r, av, bv }) => `
            <tr>
              <th scope="row">${esc(r.label)}</th>
              <td data-label="${esc(a.name)}" class="${av ? '' : 'empty'}">${av || 'Not recorded'}</td>
              <td data-label="${esc(b.name)}" class="${bv ? '' : 'empty'}">${bv || 'Not recorded'}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      ${sharedSection(a, b)}`;
  };

  /* ---------- Slot pickers ---------- */
  $$('[data-slot]', root).forEach((slot) => {
    slot.addEventListener('click', () => openPicker(slot.dataset.slot));
  });

  function openPicker(which) {
    const scrim = el('div', { class: 'scrim' });
    const box = el('div', { class: 'palette' });
    box.innerHTML = `
      <div class="palette-input-row">
        ${icon('search')}
        <input class="palette-input" type="search" placeholder="Search for something to compare…"
               autocomplete="off" aria-label="Search">
        <span class="kbd">esc</span>
      </div>
      <div class="palette-results" id="pick-results"></div>`;
    scrim.append(box);
    document.body.append(scrim);

    const input = box.querySelector('.palette-input');
    const list = box.querySelector('#pick-results');

    const draw = () => {
      const q = input.value.trim();
      const rows = q ? db.search(q, { limit: 24 }) : db.featured;
      list.innerHTML = rows.map((e) => `
        <button class="palette-item" data-id="${e.id}" style="--tint:${db.tintVar(e.tint)}">
          <span class="palette-ico">${icon(TYPE_ICON[e.type] || 'sparkle', { size: 17 })}</span>
          <span class="palette-txt">
            <span class="palette-name">${esc(e.name)}</span>
            <span class="palette-sub">${esc(e.typeLabel)}${e.start != null ? ' · ' + esc(entityDate(e)) : ''}</span>
          </span>
        </button>`).join('');
    };

    input.addEventListener('input', debounce(draw, 90));
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') scrim.remove(); });
    scrim.addEventListener('click', (ev) => {
      if (ev.target === scrim) { scrim.remove(); return; }
      const btn = ev.target.closest('[data-id]');
      if (!btn) return;
      const picked = db.get(btn.dataset.id);
      scrim.remove();
      if (which === 'a') a = picked; else b = picked;
      const slot = $(`#slot-${which}`, root);
      slot.classList.add('filled');
      slot.style.setProperty('--tint', db.tintVar(picked.tint));
      slot.innerHTML = slotInner(picked, '');
      if (a && b) history.replaceState(null, '', `#/compare?a=${a.id}&b=${b.id}`);
      paint();
    });

    draw();
    requestAnimationFrame(() => input.focus());
  }

  paint();
}

/* ============================================================
   Cell builders
   ============================================================ */

function writingCell(e) {
  const w = db.neighbours(e.id)
    .map((n) => n.entity)
    .filter((x) => x.type === 'writing' || x.type === 'language');
  if (e.type === 'writing' || e.type === 'language') {
    return [e.status, e.signs].filter(Boolean).map(esc).join('<br>') || null;
  }
  if (!w.length) return null;
  return w.map((x) => `<a href="${entityHref(x.id)}">${esc(x.name)}</a>`).join(', ');
}

function evidenceCell(e) {
  if (!e.claims.length) return null;
  const counts = new Map();
  for (const c of e.claims) counts.set(c.evidence, (counts.get(c.evidence) || 0) + 1);
  const parts = [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([k, n]) => `${esc(db.EVIDENCE_META[k]?.label || k)} (${n})`);
  return `${e.claims.length} tagged claims<br><span class="xs muted">${parts.join(' · ')}</span>`;
}

function debatesCell(e) {
  const open = e.claims.filter((c) => c.confidence === 'debated' || c.confidence === 'speculative');
  if (!open.length) return null;
  return `<ul style="margin:0;padding-left:1.1em">${open.slice(0, 4)
    .map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul>`;
}

function connectionsCell(e) {
  const n = db.neighbours(e.id);
  if (!n.length) return null;
  const top = n.slice(0, 6).map((x) =>
    `<a href="${entityHref(x.entity.id)}">${esc(x.entity.name)}</a>`).join(', ');
  return `${n.length} connections<br><span class="xs">${top}${n.length > 6 ? ' …' : ''}</span>`;
}

function sourcesCell(e) {
  if (!e.sources.length) return null;
  return e.sources.slice(0, 4).map((id) => {
    const s = db.getSource(id);
    return s ? esc(`${s.author}${s.year ? ` ${s.year}` : ''}`) : null;
  }).filter(Boolean).join('<br>');
}

/* ---------- Shared connections ---------- */
function sharedSection(a, b) {
  const an = new Set(db.neighbours(a.id).map((n) => n.id));
  const shared = db.neighbours(b.id).map((n) => n.entity).filter((x) => an.has(x.id));
  if (!shared.length) return '';
  return `
    <section style="margin-top:var(--s-12)">
      ${sectionHead('What they share', `${shared.length} entities connect to both.`)}
      <div class="rel-list">
        ${shared.map((x) => `
          <a class="rel-pill" href="${entityHref(x.id)}" style="--tint:${db.tintVar(x.tint)}">
            <span class="dot"></span><span>${esc(x.name)}</span>
          </a>`).join('')}
      </div>
    </section>`;
}
