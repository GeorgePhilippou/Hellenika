/* ============================================================
   Hellenika — Entity images

   Photographs are resolved live from Wikipedia (via the MediaWiki
   API) rather than bundled, since this project cannot itself clear
   rights on hundreds of museum photographs. Every image links back
   to its source article, which is where the real attribution and
   licensing detail lives.

   Resolution order for an entity:
     1. data/images.js `imageOverrides[id]` — a hand-checked title
     2. the entity's name, with a leading "The/A/An" and a trailing
        "(...)" qualifier stripped
   `imageSkip` forces the glyph fallback regardless of what the API
   would return.

   Results are cached in memory and in localStorage, so a repeat
   visit costs nothing and the API is only asked about a given
   entity once per browser.
   ============================================================ */

import { store as persist, fold } from '../util.js';
import { imageOverrides, imageSkip } from '../../data/images.js';

const API = 'https://en.wikipedia.org/w/api.php';
const THUMB_SIZE = 640;
// Bump this whenever imageOverrides/imageSkip change in a way that should
// invalidate previously-cached results (including cached misses) -- the
// cache never expires on its own, so a stale "no image found" from before
// an override existed would otherwise stick in a visitor's browser forever.
const CACHE_KEY = 'images-v5';
const BATCH = 45; // MediaWiki's multi-title query limit is 50; leave headroom.

/** entityId -> { title, src, w, h, page } | null (looked up, no usable image) */
const cache = new Map();
let hydrated = false;
let saveTimer = null;

function loadPersisted() {
  if (hydrated) return;
  hydrated = true;
  const saved = persist.get(CACHE_KEY, null);
  if (saved && typeof saved === 'object') {
    for (const [id, v] of Object.entries(saved)) cache.set(id, v);
  }
}

function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist.set(CACHE_KEY, Object.fromEntries(cache));
  }, 400);
}

function titleFor(entity) {
  if (imageSkip.has(entity.id)) return null;
  if (imageOverrides[entity.id]) return imageOverrides[entity.id];
  return entity.name.replace(/^(the|a|an)\s+/i, '').replace(/\s*\(.*?\)\s*$/, '').trim();
}

/** Synchronous read of whatever is already known. Undefined = not yet looked up. */
export function peek(entity) {
  loadPersisted();
  return cache.get(entity.id);
}

let inFlight = null;
const pendingIds = new Set();
const waiters = [];

async function flush() {
  while (pendingIds.size) {
    const batch = [...pendingIds].slice(0, BATCH);
    batch.forEach((id) => pendingIds.delete(id));

    const byTitle = new Map(); // folded title -> [entity ids]
    for (const id of batch) {
      const t = titleForId.get(id);
      if (!t) { cache.set(id, null); continue; }
      const key = fold(t);
      if (!byTitle.has(key)) byTitle.set(key, { title: t, ids: [] });
      byTitle.get(key).ids.push(id);
    }
    const titles = [...byTitle.values()].map((v) => v.title);
    if (!titles.length) continue;

    try {
      const url = `${API}?action=query&format=json&origin=*&redirects=1`
        + `&prop=pageimages|pageprops&piprop=thumbnail|name&pithumbsize=${THUMB_SIZE}`
        + `&titles=${encodeURIComponent(titles.join('|'))}`;
      const res = await fetch(url);
      const json = await res.json();
      const pages = Object.values(json.query?.pages || {});
      const normMap = new Map((json.query?.normalized || []).map((x) => [x.from, x.to]));
      const redirMap = new Map((json.query?.redirects || []).map((x) => [x.from, x.to]));

      for (const { title, ids } of byTitle.values()) {
        let t = title;
        if (normMap.has(t)) t = normMap.get(t);
        if (redirMap.has(t)) t = redirMap.get(t);
        const page = pages.find((p) => p.title === t);
        const isDisambig = !!(page?.pageprops && 'disambiguation' in page.pageprops);
        const entry = (page && page.thumbnail && !isDisambig)
          ? {
              title: page.title,
              src: page.thumbnail.source,
              w: page.thumbnail.width,
              h: page.thumbnail.height,
              page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            }
          : null;
        for (const id of ids) cache.set(id, entry);
      }
    } catch {
      // Offline, or the API is unreachable — leave these unresolved rather
      // than caching a permanent failure, so a later attempt can retry.
      for (const id of batch) if (!cache.has(id)) pendingIds.delete(id);
    }
  }
  persistSoon();
  const done = waiters.splice(0, waiters.length);
  done.forEach((r) => r());
}

const titleForId = new Map();

/**
 * Ensure images for the given entities are resolved (cached or fetched).
 * Resolves once every entity in the list has a cache entry (hit or miss).
 */
export function ensureLoaded(entities) {
  loadPersisted();
  const need = [];
  for (const e of entities) {
    if (cache.has(e.id) || pendingIds.has(e.id)) continue;
    const t = titleFor(e);
    if (!t) { cache.set(e.id, null); continue; }
    titleForId.set(e.id, t);
    pendingIds.add(e.id);
    need.push(e.id);
  }
  if (!need.length) return Promise.resolve();
  return new Promise((resolve) => {
    waiters.push(resolve);
    if (!inFlight) {
      inFlight = flush().finally(() => { inFlight = null; });
    }
  });
}

/* ============================================================
   DOM hydration

   Views render a glyph placeholder synchronously (no network wait
   on first paint) and mark it `data-img-id`. This function fetches
   images for whatever is visible and fades photos in over the
   glyphs once they arrive.
   ============================================================ */

/**
 * @param {ParentNode} root   subtree to scan (usually the view's root node)
 * @param {(id:string)=>object|null} lookup  entity getter, e.g. db.get
 */
export async function hydrateImages(root, lookup) {
  const cardNodes = [...root.querySelectorAll('[data-img-id]')];
  const heroNodes = [...root.querySelectorAll('[data-hero-img-id]')];
  if (!cardNodes.length && !heroNodes.length) return;

  const ids = new Set([
    ...cardNodes.map((n) => n.dataset.imgId),
    ...heroNodes.map((n) => n.dataset.heroImgId),
  ]);
  const entities = [...ids].map(lookup).filter(Boolean);
  if (!entities.length) return;

  await ensureLoaded(entities);

  for (const node of cardNodes) {
    const img = cache.get(node.dataset.imgId);
    if (img?.src) paintCard(node, img);
  }
  for (const node of heroNodes) {
    const img = cache.get(node.dataset.heroImgId);
    if (img?.src) paintHero(node, img);
  }
}

function paintCard(node, img) {
  if (node.querySelector('img')) return; // already painted (e.g. re-hydration)
  const photo = new Image();
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.alt = '';
  photo.className = 'ecard-photo';
  photo.src = img.src;
  photo.addEventListener('load', () => node.classList.add('has-photo'), { once: true });
  node.append(photo);
}

// Clamp how far the hero box will stretch to match a photo's own shape.
// Only the tall end is restrictive: an uncapped portrait photo at a fixed
// 260px column width could produce an absurdly tall card. A wide photo
// just makes for a shorter card, which the fixed-width column handles
// fine, so that end is left generous.
const HERO_MIN_RATIO = 0.62; // tallest allowed (portrait)
const HERO_MAX_RATIO = 3;    // widest allowed (landscape/panorama)

function paintHero(node, img) {
  if (node.querySelector('img')) return;
  if (img.w && img.h) {
    const ratio = Math.min(HERO_MAX_RATIO, Math.max(HERO_MIN_RATIO, img.w / img.h));
    node.style.aspectRatio = String(ratio);
  }
  const wrap = document.createElement('a');
  wrap.className = 'hero-photo';
  wrap.href = img.page;
  wrap.target = '_blank';
  wrap.rel = 'noopener noreferrer';
  wrap.setAttribute('aria-label', 'Source image on Wikipedia (opens in a new tab)');
  wrap.innerHTML = `
    <img src="${img.src}" alt="" loading="lazy" decoding="async">
    <span class="hero-photo-cred">Wikipedia ↗</span>`;
  node.append(wrap);
  requestAnimationFrame(() => node.classList.add('has-photo'));
}
