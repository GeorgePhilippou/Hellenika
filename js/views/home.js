/* ============================================================
   Hellenika — Home
   ============================================================ */

import { el, $, esc, fmtYear } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { periods } from '../../data/periods.js';
import { collections } from '../../data/collections.js';
import { entityCard, sectionHead, entityPill, entityDate } from '../components/ui.js';
import { entityHref } from '../router.js';

/* The connection trail on the home page — the spec's own example
   chain, which doubles as a demonstration that the graph is real. */
const TRAIL = [
  'minoan-civilisation', 'knossos', 'linear-a', 'mycenaean-civilisation',
  'linear-b', 'homer', 'trojan-war-traditional', 'mycenae', 'agamemnon',
  'mask-of-agamemnon', 'heinrich-schliemann',
];

const FEATURES = [
  { href: '#/timeline', icon: 'timeline', tint: 'classical', title: 'Travel through time',
    body: 'A draggable, zoomable timeline from 3200 BC to 30 BC. Eleven colour-coded periods that overlap because history did.', cls: 'wide' },
  { href: '#/map', icon: 'map', tint: 'minoan', title: 'Watch the map change',
    body: 'Political control, cities, colonies and campaign routes, animated as you move the year.', cls: 'wide' },
  { href: '#/explore', icon: 'compass', tint: 'archaic', title: 'Explore every entity',
    body: 'People, places, artefacts, battles, texts, gods — all cross-linked.' },
  { href: '#/collections', icon: 'collection', tint: 'hellenistic', title: 'Guided collections',
    body: 'Ten curated routes through the material, written as documentaries rather than lists.' },
  { href: '#/learn', icon: 'learn', tint: 'mycenaean', title: 'Learning mode',
    body: 'Quizzes, flashcards, timeline challenges and "what existed at the same time?"' },
];

export async function renderHome() {
  const root = el('div');
  const s = db.stats;

  const recent = store.get('recent').map(db.get).filter(Boolean).slice(0, 6);
  const saved = store.get('bookmarks').map(db.get).filter(Boolean).slice(0, 6);

  // A stable daily pick rather than a random one on every render.
  const day = Math.floor(Date.now() / 864e5);
  const pool = db.ALL.filter((e) => e.body && e.claims.length >= 3 && !e.modern);
  const featured = pool[day % pool.length];

  const gallery = ['knossos', 'dendra-panoply', 'helen-of-troy'].map(db.get).filter(Boolean);

  root.innerHTML = `
    <section class="hero">
      <div class="wrap hero-layout">
        <div class="hero-text">
        <p class="eyebrow">3200 BC — 30 BC · ${s.entities} connected entities</p>
        <h1>The complete interactive history of the Ancient Greek world.</h1>
        <p class="lede">
          Not an encyclopaedia. A connected atlas you explore through time, space,
          relationships and evidence — where every claim tells you what it rests on
          and how sure anyone is entitled to be.
        </p>

        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/timeline">${icon('timeline', { size: 18 })} Open the timeline</a>
          <a class="btn btn-lg" href="#/map">${icon('map', { size: 18 })} Open the map</a>
          <button class="btn btn-lg" id="home-random">${icon('shuffle', { size: 18 })} Take me somewhere</button>
        </div>

        <div class="ribbon" role="list" aria-label="Historical periods"
             style="grid-template-columns:${periods
               .map((p) => `minmax(42px, ${p.end - p.start}fr)`).join(' ')}">
          ${periods.map((p) => {
            const span = p.end - p.start;
            // Only the genuinely long periods have room for horizontal text.
            // Everything else rotates, so every band carries its name rather
            // than being an unexplained colour.
            const size = span >= 1000 ? 'wide' : 'narrow';
            return `
            <a role="listitem" href="#/timeline/${p.id}" class="rb rb-${size}"
               style="--tint:var(--p-${p.tint})"
               title="${esc(p.name)} · ${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}">
              <span class="rb-name">${esc(p.name)}</span>
              <span class="rb-date">${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}</span>
            </a>`;
          }).join('')}
        </div>
        <div class="ribbon-key">
          ${periods.map((p) => `
            <a href="#/timeline/${p.id}" style="--tint:var(--p-${p.tint})">
              <i></i><b>${esc(p.name)}</b>
              <span class="num">${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}</span>
            </a>`).join('')}
        </div>
        <p class="xs muted" style="margin-top:var(--s-3)">
          Eleven periods, each block scaled by its duration — with a minimum width so the
          shortest stay readable. Laid end to end here; on the timeline they overlap,
          because Minoan and Mycenaean civilisation genuinely coexisted for three centuries.
        </p>

        <div class="hero-stats">
          ${[
            [s.entities, 'entities'],
            [Math.round(s.relations), 'relationships'],
            [s.claims, 'evidence-tagged claims'],
            [s.sources, 'sources cited'],
            [s.withCoords, 'mapped locations'],
          ].map(([n, l]) => `
            <div class="hero-stat"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`).join('')}
        </div>
        </div>

        <div class="hero-gallery">
          ${gallery.map((e) => `
            <a class="hero-gallery-item" href="${entityHref(e.id)}" data-img-id="${esc(e.id)}"
               style="--tint:${db.tintVar(e.tint)}" aria-label="${esc(e.name)}">
              ${icon(TYPE_ICON[e.type] || 'sparkle', { size: 26 })}
            </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="wrap" style="padding-block:var(--s-12)">
      <div class="feature-grid">
        ${FEATURES.map((f) => `
          <a class="feature ${f.cls || ''}" href="${f.href}" style="--tint:var(--p-${f.tint})">
            <span class="feature-ico">${icon(f.icon, { size: 21 })}</span>
            <h3>${esc(f.title)}</h3>
            <p>${esc(f.body)}</p>
          </a>`).join('')}
      </div>
    </section>

    <section class="wrap" style="padding-block:var(--s-8)">
      ${sectionHead('Everything connects', 'One chain, eleven hops, followed entirely through the dataset.')}
      <div class="trail">
        ${TRAIL.map(db.get).filter(Boolean).map((e, i) => `
          ${i ? `<span class="arrow">${icon('arrowRight', { size: 15 })}</span>` : ''}
          ${entityPill(e)}
        `).join('')}
      </div>
    </section>

    ${featured ? `
    <section class="wrap" style="padding-block:var(--s-8)">
      ${sectionHead('Start here today', 'A different entry point each day.')}
      <a class="card start-card" href="${entityHref(featured.id)}" style="--tint:${db.tintVar(featured.tint)}">
        <div class="card-pad start-card-text">
          <div class="row-wrap" style="margin-bottom:var(--s-3)">
            <span class="chip" style="--tint:${db.tintVar(featured.tint)}"><i class="chip-dot"></i>${esc(featured.typeLabel)}</span>
            <span class="chip num">${esc(entityDate(featured))}</span>
          </div>
          <h3 style="font-size:1.5rem;margin-bottom:var(--s-3)">${esc(featured.name)}</h3>
          <p class="prose" style="max-width:70ch">${esc(featured.summary)}</p>
          <p class="small muted" style="margin-top:var(--s-4)">
            ${featured.claims.length} evidence-tagged claims · ${featured.relations.length} connections
          </p>
        </div>
        <div class="start-card-media" data-hero-img-id="${esc(featured.id)}">
          ${icon(TYPE_ICON[featured.type] || 'sparkle', { size: 40 })}
        </div>
      </a>
    </section>` : ''}

    <section class="wrap" style="padding-block:var(--s-8)">
      ${sectionHead('Collections', 'Curated routes through the material.',
        '<a class="btn btn-sm" href="#/collections">All collections</a>')}
      <div class="grid home-coll-grid">
        ${collections.slice(0, 4).map((c) => `
          <a class="card coll-card" href="#/collections/${c.id}" style="--tint:var(--p-${c.tint})">
            <div class="band"></div>
            <div class="card-pad">
              <div class="row-wrap" style="margin-bottom:var(--s-3)">
                <span class="chip">${esc(c.duration)}</span>
                <span class="chip">${c.stops.length} stops</span>
              </div>
              <h3 style="font-size:1.2rem;margin-bottom:var(--s-2)">${esc(c.name)}</h3>
              <p class="small" style="color:var(--text-2)">${esc(c.summary)}</p>
            </div>
          </a>`).join('')}
      </div>
    </section>

    ${recent.length ? `
    <section class="wrap" style="padding-block:var(--s-8)">
      ${sectionHead('Where you were', 'Recently viewed.')}
      <div class="rel-list">${recent.map((e) => entityPill(e)).join('')}</div>
    </section>` : ''}

    ${saved.length ? `
    <section class="wrap" style="padding-block:var(--s-8)">
      ${sectionHead('Saved', 'Entities you bookmarked.')}
      <div class="rel-list">${saved.map((e) => entityPill(e)).join('')}</div>
    </section>` : ''}

    <section class="wrap" style="padding-block:var(--s-8) var(--s-16)">
      ${sectionHead('How this site handles evidence',
        'The differentiator: nothing is asserted without telling you what kind of claim it is.')}
      <div class="grid grid-auto">
        ${Object.entries(db.CONFIDENCE_META)
          .sort((a, b) => b[1].rank - a[1].rank)
          .map(([k, m]) => `
            <div class="panel">
              <span class="conf conf-${k}">${esc(m.label)}</span>
              <p class="small" style="margin-top:var(--s-3);color:var(--text-2)">${esc(m.desc)}</p>
            </div>`).join('')}
      </div>
      <p class="small muted" style="margin-top:var(--s-5)">
        <a href="#/about">Read the full method →</a>
      </p>
    </section>`;

  root.__mount = () => {
    $('#home-random', root)?.addEventListener('click', () => {
      const e = db.randomEntity((x) => !x.modern && x.body);
      if (e) location.hash = entityHref(e.id).slice(1);
    });
  };

  return root;
}
