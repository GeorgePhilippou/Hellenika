/* ============================================================
   Hellenika — Utilities
   ============================================================ */

/** Escape text for safe interpolation into HTML. */
export function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Tagged template that escapes all interpolations. Arrays are joined. */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    out += (Array.isArray(v) ? v.join('') : v == null ? '' : String(v)) + strings[i + 1];
  }
  return out;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/* ---------- Dates ---------- */

/**
 * Years are signed integers: negative = BC, positive = AD. There is no year 0
 * in the historical era, but we use an astronomical scale internally (0 = 1 BC)
 * so arithmetic and interpolation stay linear. Only formatting differs.
 */
export function fmtYear(y, { approx = false } = {}) {
  if (y == null || Number.isNaN(y)) return '—';
  const r = Math.round(y);
  const label = r <= 0 ? `${Math.abs(r) + (r === 0 ? 1 : 0)} BC` : `AD ${r}`;
  return approx ? `c. ${label}` : label;
}

export function fmtRange(a, b, approx = false) {
  if (a == null && b == null) return '';
  if (a == null) return `until ${fmtYear(b)}`;
  if (b == null) return `from ${fmtYear(a)}`;
  const pre = approx ? 'c. ' : '';
  // Same era → drop the era marker from the first number.
  if (a < 0 && b <= 0) return `${pre}${Math.abs(Math.round(a))}–${Math.abs(Math.round(b)) || 1} BC`;
  if (a > 0 && b > 0) return `${pre}AD ${Math.round(a)}–${Math.round(b)}`;
  return `${pre}${fmtYear(a)} – ${fmtYear(b)}`;
}

export function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

export function fmtCentury(y) {
  const c = Math.ceil(Math.abs(y) / 100);
  return `${ordinal(c)} century ${y < 0 ? 'BC' : 'AD'}`;
}

/* ---------- Numbers & math ---------- */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const round = (v, p = 0) => { const m = 10 ** p; return Math.round(v * m) / m; };

/** Smooth easing for animated transitions. */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- Function helpers ---------- */

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function throttle(fn, ms = 16) {
  let last = 0, queued = null;
  return (...a) => {
    const now = performance.now();
    if (now - last >= ms) { last = now; fn(...a); }
    else if (!queued) {
      queued = setTimeout(() => { queued = null; last = performance.now(); fn(...a); }, ms - (now - last));
    }
  };
}

/** requestAnimationFrame-driven tween. Returns a cancel function. */
export function animate({ from, to, duration = 400, ease = easeOutCubic, onUpdate, onDone }) {
  const t0 = performance.now();
  let raf;
  const step = (now) => {
    const t = clamp((now - t0) / duration, 0, 1);
    onUpdate(lerp(from, to, ease(t)), t);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Collections ---------- */

export function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

export function unique(arr) { return Array.from(new Set(arr)); }

export function sortBy(arr, ...keyFns) {
  return [...arr].sort((a, b) => {
    for (const f of keyFns) {
      const av = f(a), bv = f(b);
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
}

/** Deterministic pseudo-random in [0,1) from a string — for stable layout jitter. */
export function hashRand(str, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/* ---------- Text ---------- */

const COMBINING = /[\u0300-\u036f]/g;

export function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(COMBINING, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Fold accents/diacritics for accent-insensitive search. */
export function fold(s) {
  return String(s).toLowerCase().normalize('NFD').replace(COMBINING, '');
}

export function truncate(s, n) {
  if (!s || s.length <= n) return s;
  return s.slice(0, s.lastIndexOf(' ', n)) + '…';
}

/** Wrap matched query ranges in <mark>. Input is escaped first. */
export function highlight(text, query) {
  const safe = esc(text);
  if (!query) return safe;
  const f = fold(text), q = fold(query);
  const i = f.indexOf(q);
  if (i < 0) return safe;
  // Re-escape piecewise so the <mark> tags survive.
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + query.length)) +
         '</mark>' + esc(text.slice(i + query.length));
}

/* ---------- Storage (never throws in private mode) ---------- */

const NS = 'hellenika:';
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(NS + key, JSON.stringify(val)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(NS + key); } catch {} },
};

/* ---------- Tiny event bus ---------- */

export function emitter() {
  const map = new Map();
  return {
    on(evt, fn) {
      if (!map.has(evt)) map.set(evt, new Set());
      map.get(evt).add(fn);
      return () => map.get(evt)?.delete(fn);
    },
    emit(evt, payload) {
      map.get(evt)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
    },
  };
}

/* ---------- Toasts ---------- */

let toastHost;
export function toast(msg, ms = 2200) {
  if (!toastHost) {
    toastHost = el('div', { class: 'toast-host', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const t = el('div', { class: 'toast' }, msg);
  toastHost.append(t);
  setTimeout(() => {
    t.style.transition = 'opacity 200ms, transform 200ms';
    t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 220);
  }, ms);
}

/* ---------- Geometry: map projection ---------- */

/**
 * Equirectangular projection with a standard parallel, which keeps the
 * Mediterranean close to its familiar shape without Mercator's polar stretch.
 */
export const PROJ_LAT0 = 37;
const COS_LAT0 = Math.cos((PROJ_LAT0 * Math.PI) / 180);

export function project(lon, lat) { return { x: lon * COS_LAT0, y: -lat }; }
export function unproject(x, y) { return { lon: x / COS_LAT0, lat: -y }; }

/** Great-circle-ish distance in km (spherical law of cosines, good enough here). */
export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---------- Device ---------- */

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export const isNarrow = () => window.innerWidth < 760;

/** Device-pixel-ratio-aware canvas sizing. Returns the CSS-pixel size. */
export function fitCanvas(canvas, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr; canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
