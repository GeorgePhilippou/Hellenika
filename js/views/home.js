/* ============================================================
   Hellenika — Home
   ============================================================ */

import { el, $, esc, fmtYear, fmtRange } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { periods } from '../../data/periods.js';
import { collections } from '../../data/collections.js';
import { sectionHead, entityPill, entityDate } from '../components/ui.js';
import { entityHref } from '../router.js';

// Rotating hero cutouts: transparent-background museum photos, so the
// object reads as a physical thing sitting on the page rather than a
// framed photo. One is picked at random on every visit so the homepage
// doesn't go stale. Add an entry here whenever a matching cutout exists
// at assets/<id>.webp -- the caption itself is still driven live from
// the entity's own material/date data, only the source image and the
// short "found at" label are hardcoded per entry.
const HERO_OBJECTS = [
  { id: 'mask-of-agamemnon', asset: 'assets/mask-of-agamemnon.webp', place: 'Mycenae' },
  { id: 'phaistos-disc', asset: 'assets/phaistos-disc.webp', place: 'Phaistos' },
  { id: 'antikythera-mechanism', asset: 'assets/antikythera-mechanism.webp', place: 'Antikythera' },
  { id: 'winged-victory-samothrace', asset: 'assets/winged-victory-samothrace.webp', place: 'Samothrace' },
  { id: 'vergina-larnax', asset: 'assets/vergina-larnax.webp', place: 'Vergina' },
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

  const saved = store.get('bookmarks').map(db.get).filter(Boolean).slice(0, 6);

  // A stable daily pick rather than a random one on every render.
  const day = Math.floor(Date.now() / 864e5);
  const pool = db.ALL.filter((e) => e.body && e.claims.length >= 3 && !e.modern);
  const featured = pool[day % pool.length];

  // A fresh random pick each visit (not the stable daily pick above) --
  // this one is decorative, so there's no reason to hold it steady.
  const heroPick = HERO_OBJECTS[Math.floor(Math.random() * HERO_OBJECTS.length)];
  const heroMask = heroPick ? db.get(heroPick.id) : null;

  root.innerHTML = `
    <section class="hero">
      <div class="wrap">
        <div class="hero-title-row">
          <div class="hero-title-col">
            <p class="eyebrow">3200 BC — 30 BC · ${s.entities} connected entities</p>
            <h1>Explore Ancient Greece and the world it shaped.</h1>
          </div>
          ${heroMask ? `
          <div class="hero-mask">
            <div class="mask-img-wrap">
              <a href="${entityHref(heroMask.id)}" aria-label="${esc(heroMask.name)}">
                <img src="${heroPick.asset}" alt="${esc(heroMask.name)}" loading="lazy">
              </a>
              <button type="button" class="mask-zoom" aria-label="View ${esc(heroMask.name)} full size"
                      data-lightbox-src="${esc(heroPick.asset)}" data-lightbox-alt="${esc(heroMask.name)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>
                </svg>
              </button>
            </div>
            <a class="mask-plaque" href="${entityHref(heroMask.id)}">
              <span class="mask-plaque-title">${esc(heroMask.name)}</span>
              <span class="mask-plaque-meta">${esc(heroMask.material || '')} · ${fmtRange(heroMask.start, heroMask.end, heroMask.approx)} · ${esc(heroPick.place)}</span>
            </a>
          </div>` : ''}
        </div>

        <div class="hero-text">
        <p class="lede">
          Hellenika is an open, evidence-led guide to the ancient Greek world.
          It connects people, places, objects and events across an interactive timeline
          and map, making the sources — and the limits of what we know — clear and
          accessible to everyone.
        </p>

        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/timeline">${icon('timeline', { size: 18 })} Open the timeline</a>
          <a class="btn btn-lg" href="#/map">${icon('map', { size: 18 })} Open the map</a>
          <button class="btn btn-lg" id="home-random">${icon('shuffle', { size: 18 })} Take me somewhere</button>
        </div>

        <div class="mt-scroll">
          <div class="mini-timeline" role="list" aria-label="Historical periods">
            <div class="mt-line" aria-hidden="true"></div>
            ${periods.map((p, i) => `
              <a role="listitem" href="#/timeline/${p.id}" class="mt-step ${i % 2 ? 'below' : 'above'}"
                 style="--tint:var(--p-${p.tint})"
                 title="${esc(p.name)} · ${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}">
                <span class="mt-label">
                  <span class="mt-name">${esc(p.name)}</span>
                  <span class="mt-date">${esc(fmtYear(p.start))} – ${esc(fmtYear(p.end))}</span>
                </span>
                <span class="mt-dot"></span>
              </a>`).join('')}
          </div>
        </div>
        <p class="xs muted" style="margin-top:var(--s-3)">
          Eleven periods, 3200 BC to 30 BC — hover or tap any point for its dates.
        </p>
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
