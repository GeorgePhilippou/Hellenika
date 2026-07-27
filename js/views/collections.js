/* ============================================================
   Hellenika — Collections
   Curated routes. A collection stop pairs authored narration with
   the live entity, so the two never drift apart.
   ============================================================ */

import { el, $, esc } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import { collections } from '../../data/collections.js';
import { entityHref } from '../router.js';
import { sectionHead, entityDate, emptyState, paragraphs, backLink } from '../components/ui.js';

export async function renderCollections() {
  const root = el('div', { class: 'view' });

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${collections.length} guided routes</p>
          <h1>Collections</h1>
          <p class="sub">Curated paths through the material, written to be read start to finish.</p>
        </div>
      </div>

      <div class="grid grid-auto-lg">
        ${collections.map((c) => `
          <a class="card coll-card" href="#/collections/${c.id}" style="--tint:var(--p-${c.tint})">
            <div class="band"></div>
            <div class="card-pad">
              <div class="row-wrap" style="margin-bottom:var(--s-3)">
                <span class="chip">${icon('play', { size: 12 })} ${esc(c.duration)}</span>
                <span class="chip">${c.stops.length} stops</span>
              </div>
              <h3 style="font-size:1.25rem;margin-bottom:var(--s-2)">${esc(c.name)}</h3>
              <p class="small" style="color:var(--text-2)">${esc(c.summary)}</p>
            </div>
          </a>`).join('')}
      </div>
    </div>`;

  return root;
}

export async function renderCollection(params) {
  const c = collections.find((x) => x.id === params.id);
  if (!c) {
    const missing = el('div', { class: 'wrap view' });
    missing.innerHTML = emptyState('No such collection.');
    return missing;
  }

  document.title = `${c.name} — Hellenika`;
  const root = el('div');

  root.innerHTML = `
    <header class="coll-hero" style="--tint:var(--p-${c.tint})">
      <div class="wrap">
        ${backLink('#/collections', 'All collections')}
        <p class="eyebrow" style="margin-top:var(--s-5)">Collection · ${esc(c.duration)} · ${c.stops.length} stops</p>
        <h1 style="font-size:clamp(2rem,4.4vw,3rem);margin-block:var(--s-3)">${esc(c.name)}</h1>
        <p class="lede" style="max-width:60ch">${esc(c.summary)}</p>
      </div>
    </header>

    <div class="wrap" style="padding-block:var(--s-10) var(--s-24)">
      <div class="wrap-read" style="padding:0">
        <div class="callout" style="--tint:var(--p-${c.tint});margin-bottom:var(--s-12)">
          ${paragraphs(c.intro)}
        </div>

        <div class="stops" style="--tint:var(--p-${c.tint})">
          ${c.stops.map((s, i) => stopHTML(s, i, c)).join('')}
        </div>

        <div class="panel" style="margin-top:var(--s-16);text-align:center">
          <h3 style="margin-bottom:var(--s-3)">Keep going</h3>
          <p class="small muted" style="margin-bottom:var(--s-5)">
            Every entity above links onward. Follow any of them, or take another route.
          </p>
          <div class="row-wrap" style="justify-content:center">
            ${collections.filter((x) => x.id !== c.id).slice(0, 3).map((x) =>
              `<a class="chip" href="#/collections/${x.id}">${esc(x.name)}</a>`).join('')}
            <a class="chip" href="#/collections">All collections</a>
          </div>
        </div>
      </div>
    </div>`;

  return root;
}

function stopHTML(s, i, c) {
  const e = db.get(s.id);
  const n = String(i + 1).padStart(2, '0');

  // Terminal stops are authorial commentary with no entity behind them.
  if (!e) {
    return `
      <div class="stop">
        <div class="stop-n">${n} · ${s.terminal ? 'In conclusion' : 'Note'}</div>
        <h3>${esc(s.name || 'Note')}</h3>
        <p class="note">${esc(s.note)}</p>
      </div>`;
  }

  return `
    <div class="stop">
      <div class="stop-body">
        <div class="stop-text">
          <div class="stop-n">${n} · ${esc(e.typeLabel)}${e.start != null ? ' · ' + esc(entityDate(e)) : ''}</div>
          <h3><a href="${entityHref(e.id)}">${esc(s.name || e.name)}</a></h3>
          <p class="note">${esc(s.note)}</p>
          <div class="peek">
            ${esc(e.summary)}
            <div style="margin-top:var(--s-3)">
              <a class="btn btn-sm" href="${entityHref(e.id)}">
                Open ${esc(e.name)} ${icon('arrowRight', { size: 14 })}
              </a>
            </div>
          </div>
        </div>
        <a class="stop-thumb" href="${entityHref(e.id)}" data-img-id="${esc(e.id)}" style="--tint:var(--p-${e.tint})" aria-hidden="true" tabindex="-1">
          ${icon(TYPE_ICON[e.type] || 'sparkle', { size: 22 })}
        </a>
      </div>
    </div>`;
}
