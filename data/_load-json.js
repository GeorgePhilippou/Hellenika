/* ============================================================
   Hellenika — internal JSON-loading helper for data/*.js

   Every data/*.js file is now a thin loader: the actual content
   lives under content/ (authored) and data/*.json (compiled —
   see scripts/compile-content.mjs). This helper is what each of
   those loaders calls to fetch its compiled JSON; it isn't part of
   the site's public data API and nothing under js/ imports it
   directly.

   It has to work two different ways depending on where it runs:
     - In the browser, the site has no build step and no bundler, so
       the JSON is fetched over HTTP exactly like any other static
       asset.
     - Under Node (the scripts/validate-*.mjs scripts, and any other
       tooling that imports data/*.js directly by path) `fetch()`
       cannot load file:// URLs, so this reads the file from disk
       instead.
   The `node:fs` / `node:url` imports are dynamic (not static) so the
   browser build never has to resolve those specifiers at all.
   ============================================================ */

export async function loadJSON(metaUrl, relativePath) {
  const url = new URL(relativePath, metaUrl);

  if (typeof window === 'undefined') {
    const [{ readFile }, { fileURLToPath }] = await Promise.all([
      import('node:fs/promises'),
      import('node:url'),
    ]);
    const text = await readFile(fileURLToPath(url), 'utf8');
    return JSON.parse(text);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`[Hellenika] Failed to load ${relativePath}: HTTP ${res.status}`);
  return res.json();
}
