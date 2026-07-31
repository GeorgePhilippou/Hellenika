/* ============================================================
   Hellenika — Image lightbox

   A single delegated click listener (installed once from main.js)
   opens a fullscreen view of any element marked with
   `data-lightbox-src`. Follows the same scrim/dialog convention as
   the command palette and mobile nav in main.js: a full-viewport
   `.scrim` appended to <body>, closed on Escape, backdrop click, or
   the close button.

   Elements can also carry:
     data-lightbox-page  -- source page to credit/link to (optional)
     data-lightbox-alt   -- accessible label for the image (optional)
   ============================================================ */

import { fetchHiRes } from './images.js';

let scrim = null;
let openToken = 0;

function close() {
  if (!scrim) return;
  scrim.remove();
  scrim = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown);
}

function onKeydown(e) {
  if (e.key === 'Escape') close();
}

function open({ src, page, alt }) {
  if (scrim) close();
  const token = ++openToken;

  scrim = document.createElement('div');
  scrim.className = 'scrim lightbox-scrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.setAttribute('aria-label', alt || 'Image, full size');

  const box = document.createElement('div');
  box.className = 'lightbox-box';
  box.innerHTML = '<div class="lightbox-spinner" aria-hidden="true"></div>';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lightbox-close';
  btn.setAttribute('aria-label', 'Close');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  btn.addEventListener('click', close);

  const img = new Image();
  img.className = 'lightbox-img';
  img.alt = alt || '';
  img.decoding = 'async';
  img.addEventListener('load', () => box.classList.add('loaded'), { once: true });
  img.src = src;
  box.append(img);

  scrim.append(box, btn);

  if (page) {
    const cred = document.createElement('a');
    cred.className = 'lightbox-cred';
    cred.href = page;
    cred.target = '_blank';
    cred.rel = 'noopener noreferrer';
    cred.textContent = 'View source on Wikipedia ↗';
    scrim.append(cred);
  }

  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });

  document.body.append(scrim);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeydown);
  requestAnimationFrame(() => btn.focus());

  // Quietly swap in a much larger rendition once it arrives, so the
  // lightbox opens instantly on the thumbnail already in hand and only
  // upgrades to something worth actually zooming into a moment later.
  fetchHiRes(page).then((hiRes) => {
    if (!hiRes || token !== openToken || hiRes === src) return;
    const bigger = new Image();
    bigger.decoding = 'async';
    bigger.addEventListener('load', () => { img.src = hiRes; }, { once: true });
    bigger.src = hiRes;
  });
}

/** Install once at app startup. */
export function initLightbox() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox-src]');
    if (!trigger) return;
    e.preventDefault();
    open({
      src: trigger.dataset.lightboxSrc,
      page: trigger.dataset.lightboxPage || null,
      alt: trigger.dataset.lightboxAlt || '',
    });
  });
}

/** Call from the router's setBeforeNav, same as closePalette()/mobile nav --
 * without this, navigating away (e.g. browser Back) while the lightbox is
 * open leaves its scrim stuck over the new page, its keydown listener
 * attached forever, and body scroll locked, since the scrim lives on
 * <body> rather than inside the view root that the router replaces. */
export function closeLightbox() {
  close();
}
