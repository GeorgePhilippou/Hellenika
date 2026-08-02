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
const HIRES_SIZE = 1600; // requested only on demand, when the lightbox opens
// Bump this whenever imageOverrides/imageSkip change in a way that should
// invalidate previously-cached results (including cached misses) -- the
// cache never expires on its own, so a stale "no image found" from before
// an override existed would otherwise stick in a visitor's browser forever.
const CACHE_KEY = 'images-v8';
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
   Secondary / inline images

   Unlike the hero photo, resolved automatically from the entity's own
   name, an inline image is a specific Wikipedia title an author chose
   deliberately -- a second, different photo referenced from the prose
   itself (e.g. a site photo alongside a mythological entity's hero
   image). Resolved by exact title, cached separately by that title
   rather than by entity id, using the same batched-query approach.
   ============================================================ */

const titleCache = new Map(); // title -> {src,w,h,page} | null
const pendingTitles = new Set();
const titleWaiters = [];
let titleInFlight = null;

async function flushTitles() {
  while (pendingTitles.size) {
    const batch = [...pendingTitles].slice(0, BATCH);
    batch.forEach((t) => pendingTitles.delete(t));
    if (!batch.length) continue;

    try {
      const url = `${API}?action=query&format=json&origin=*&redirects=1`
        + `&prop=pageimages|pageprops&piprop=thumbnail|name&pithumbsize=${THUMB_SIZE}`
        + `&titles=${encodeURIComponent(batch.join('|'))}`;
      const res = await fetch(url);
      const json = await res.json();
      const pages = Object.values(json.query?.pages || {});
      const normMap = new Map((json.query?.normalized || []).map((x) => [x.from, x.to]));
      const redirMap = new Map((json.query?.redirects || []).map((x) => [x.from, x.to]));

      for (const title of batch) {
        let t = title;
        if (normMap.has(t)) t = normMap.get(t);
        if (redirMap.has(t)) t = redirMap.get(t);
        const page = pages.find((p) => p.title === t);
        const isDisambig = !!(page?.pageprops && 'disambiguation' in page.pageprops);
        const entry = (page && page.thumbnail && !isDisambig)
          ? {
              src: page.thumbnail.source,
              w: page.thumbnail.width,
              h: page.thumbnail.height,
              page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            }
          : null;
        titleCache.set(title, entry);
      }
    } catch {
      // Offline, or unreachable — leave unresolved so a later attempt can retry.
    }
  }
  const done = titleWaiters.splice(0, titleWaiters.length);
  done.forEach((r) => r());
}

function ensureTitlesLoaded(titles) {
  const need = titles.filter((t) => t && !titleCache.has(t) && !pendingTitles.has(t));
  need.forEach((t) => pendingTitles.add(t));
  if (!need.length && !pendingTitles.size) return Promise.resolve();
  return new Promise((resolve) => {
    titleWaiters.push(resolve);
    if (!titleInFlight) {
      titleInFlight = flushTitles().finally(() => { titleInFlight = null; });
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
  const titleNodes = [...root.querySelectorAll('[data-img-title]')];
  if (!cardNodes.length && !heroNodes.length && !titleNodes.length) return;

  const ids = new Set([
    ...cardNodes.map((n) => n.dataset.imgId),
    ...heroNodes.map((n) => n.dataset.heroImgId),
  ]);
  const entities = [...ids].map(lookup).filter(Boolean);
  const titles = titleNodes.map((n) => n.dataset.imgTitle).filter(Boolean);

  await Promise.all([
    entities.length ? ensureLoaded(entities) : null,
    titles.length ? ensureTitlesLoaded(titles) : null,
  ]);

  for (const node of cardNodes) {
    const img = cache.get(node.dataset.imgId);
    if (img?.src) paintCard(node, img);
  }
  for (const node of heroNodes) {
    const img = cache.get(node.dataset.heroImgId);
    if (img?.src) paintHero(node, img);
  }
  for (const node of titleNodes) {
    const img = titleCache.get(node.dataset.imgTitle);
    if (img?.src) paintInline(node, img);
    else node.remove(); // no photo found -- an empty captioned box would look broken
  }
}

function paintCard(node, img) {
  if (node.querySelector('img')) return; // already painted (e.g. re-hydration)
  const photo = new Image();
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.alt = '';
  photo.className = 'ecard-photo';
  // Register before assigning src: a memory/disk-cached image can finish
  // synchronously, otherwise the load event is missed and the photo stays
  // permanently transparent even though it is already in the DOM.
  const reveal = () => node.classList.add('has-photo');
  photo.addEventListener('load', reveal, { once: true });
  photo.src = img.src;
  node.append(photo);
  if (photo.complete && photo.naturalWidth) reveal();
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
  const wrap = document.createElement('div');
  wrap.className = 'hero-photo';

  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'hero-photo-zoom';
  zoom.setAttribute('aria-label', 'View full-size image');
  zoom.dataset.lightboxSrc = img.src;
  zoom.dataset.lightboxPage = img.page;

  const photo = new Image();
  photo.alt = '';
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.src = img.src;
  zoom.append(photo);

  const cred = document.createElement('a');
  cred.className = 'hero-photo-cred';
  cred.href = img.page;
  cred.target = '_blank';
  cred.rel = 'noopener noreferrer';
  cred.textContent = 'Wikipedia ↗';
  cred.addEventListener('click', (e) => e.stopPropagation());

  wrap.append(zoom, cred);
  node.append(wrap);
  requestAnimationFrame(() => node.classList.add('has-photo'));
}

function paintInline(node, img) {
  if (node.querySelector('img')) return;
  const wrap = document.createElement('div');
  wrap.className = 'inline-figure-photo';

  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'inline-figure-zoom';
  zoom.setAttribute('aria-label', 'View full-size image');
  zoom.dataset.lightboxSrc = img.src;
  zoom.dataset.lightboxPage = img.page;

  const photo = new Image();
  photo.alt = '';
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.src = img.src;
  zoom.append(photo);

  const cred = document.createElement('a');
  cred.className = 'hero-photo-cred';
  cred.href = img.page;
  cred.target = '_blank';
  cred.rel = 'noopener noreferrer';
  cred.textContent = 'Wikipedia ↗';
  cred.addEventListener('click', (e) => e.stopPropagation());

  wrap.append(zoom, cred);
  node.prepend(wrap);
  requestAnimationFrame(() => node.classList.add('has-photo'));
}

/* ============================================================
   On-demand hi-res fetch, for the lightbox

   Card and hero thumbnails are deliberately capped at THUMB_SIZE so
   list views stay light. When someone actually opens the lightbox to
   look closely, it's worth one extra request for a much larger
   rendition of that specific image -- resolved from the Wikipedia
   page URL already attached to the thumbnail, so no new lookup by
   title/entity is needed.
   ============================================================ */
const hiResCache = new Map(); // page URL -> Promise<string|null>

/**
 * @param {string} pageUrl  the `img.page` Wikipedia article URL already resolved for this photo
 * @returns {Promise<string|null>} a larger image URL, or null if it couldn't be resolved
 */
export function fetchHiRes(pageUrl) {
  if (!pageUrl) return Promise.resolve(null);
  if (hiResCache.has(pageUrl)) return hiResCache.get(pageUrl);

  const promise = (async () => {
    try {
      const title = decodeURIComponent(pageUrl.split('/wiki/')[1] || '').replace(/_/g, ' ');
      if (!title) return null;
      const url = `${API}?action=query&format=json&origin=*`
        + `&prop=pageimages&piprop=thumbnail&pithumbsize=${HIRES_SIZE}`
        + `&titles=${encodeURIComponent(title)}`;
      const res = await fetch(url);
      const json = await res.json();
      const page = Object.values(json.query?.pages || {})[0];
      return page?.thumbnail?.source || null;
    } catch {
      return null;
    }
  })();

  hiResCache.set(pageUrl, promise);
  return promise;
}
