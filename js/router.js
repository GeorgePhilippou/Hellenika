/* ============================================================
   Hellenika — Hash router
   Routes look like  #/timeline  #/e/knossos  #/compare?a=athens&b=sparta
   Hash routing keeps the whole app deployable as static files from
   any path, with no server rewrite rules.
   ============================================================ */

const routes = [];
let notFound = () => '<div class="empty">Not found</div>';
let current = null;
let onBeforeNav = null;

/**
 * @param {string} pattern e.g. '/e/:id' — ':name' captures one segment.
 */
export function route(pattern, handler) {
  const keys = [];
  const rx = new RegExp(
    '^' + pattern.replace(/\/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '$'
  );
  routes.push({ rx, keys, handler, pattern });
}

export function setNotFound(fn) { notFound = fn; }
export function setBeforeNav(fn) { onBeforeNav = fn; }

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return {
    path: path.startsWith('/') ? path : '/' + path,
    query: Object.fromEntries(new URLSearchParams(qs || '')),
  };
}

export function currentRoute() { return current; }

/** Navigate programmatically. */
export function go(path, { replace = false } = {}) {
  const url = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === url) { resolve(); return; }
  if (replace) history.replaceState(null, '', url);
  else location.hash = url;
}

/** Build a link href for an entity. */
export const entityHref = (id) => `#/e/${encodeURIComponent(id)}`;

let scrollPositions = new Map();

async function resolve() {
  const { path, query } = parse();

  // Remember where we were, so Back restores the scroll position.
  if (current) scrollPositions.set(current.path, window.scrollY);

  for (const r of routes) {
    const m = path.match(r.rx);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    current = { path, params, query, pattern: r.pattern };
    onBeforeNav?.(current);
    await r.handler(params, query);
    restoreScroll(path);
    return;
  }

  current = { path, params: {}, query, pattern: null };
  onBeforeNav?.(current);
  await notFound(path);
  restoreScroll(path);
}

function restoreScroll(path) {
  const y = scrollPositions.get(path);
  // A fresh navigation starts at the top; Back/Forward restores.
  requestAnimationFrame(() => {
    window.scrollTo({ top: y ?? 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  });
}

export function start() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
