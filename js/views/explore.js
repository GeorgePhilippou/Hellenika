/* ============================================================
   Hellenika — Explore
   Faceted browse over the whole entity graph.
   ============================================================ */

import { el, $, $$, esc, debounce, sortBy } from '../util.js';
import { icon } from '../icons.js';
import * as db from '../db.js';
import { TYPE_META } from '../db.js';
import { periods } from '../../data/periods.js';
import { entityCard, sectionHead, emptyState } from '../components/ui.js';
import { hydrateImages } from '../components/images.js';

const SORTS = [
  ['chrono', 'Earliest first'],
  ['chrono-desc', 'Latest first'],
  ['name', 'A–Z'],
  ['connections', 'Most connected'],
  ['evidence', 'Most evidence'],
];

export async function renderExplore(_params, query) {
  const root = el('div', { class: 'view' });

  const state = {
    type: query?.type || null,
    period: query?.period || null,
    q: query?.q || '',
    sort: query?.sort || 'chrono',
  };

  const typeCounts = db.typesPresent.map((t) => [t, db.byType.get(t).length]);

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${db.stats.entities} entities</p>
          <h1>Explore</h1>
          <p class="sub">Filter by kind or period, or search across everything.</p>
        </div>
      </div>

      <div class="explore-layout">
        <aside class="facets">
          <div class="facet">
            <h3 class="eyebrow">Kind</h3>
            <div class="facet-list" id="facet-type">
              <button data-type="" aria-pressed="${!state.type}">
                All <span class="c">${db.stats.entities}</span>
              </button>
              ${typeCounts.map(([t, n]) => `
                <button data-type="${esc(t)}" aria-pressed="${state.type === t}">
                  ${esc(TYPE_META[t]?.plural || t)} <span class="c">${n}</span>
                </button>`).join('')}
            </div>
          </div>

          <div class="facet">
            <h3 class="eyebrow">Period</h3>
            <div class="facet-list" id="facet-period">
              <button data-period="" aria-pressed="${!state.period}">Any period</button>
              ${periods.map((p) => `
                <button data-period="${esc(p.id)}" aria-pressed="${state.period === p.id}">
                  <i class="chip-dot" style="background:var(--p-${p.tint})"></i>${esc(p.name)}
                </button>`).join('')}
            </div>
          </div>

          <div class="facet">
            <h3 class="eyebrow">Sort</h3>
            <div class="facet-list" id="facet-sort">
              ${SORTS.map(([k, label]) => `
                <button data-sort="${k}" aria-pressed="${state.sort === k}">${esc(label)}</button>`).join('')}
            </div>
          </div>
        </aside>

        <div>
          <div class="explore-bar">
            <div class="search-trigger" style="max-width:340px;cursor:text">
              ${icon('search')}
              <input id="explore-q" type="search" placeholder="Filter by name…" value="${esc(state.q)}"
                     style="border:none;background:none;outline:none;flex:1;min-width:0;color:var(--text)"
                     aria-label="Filter entities by name">
            </div>
            <div class="spacer"></div>
            <span class="explore-count" id="explore-count"></span>
            <button class="btn btn-sm" id="explore-clear">Reset</button>
          </div>
          <div id="explore-results"></div>
        </div>
      </div>
    </div>`;

  root.__mount = () => mount(root, state);
  return root;
}

function mount(root, state) {
  const results = $('#explore-results', root);
  const count = $('#explore-count', root);
  const input = $('#explore-q', root);

  /* Membership in a period = temporal overlap, plus the period's own
     curated lists. That means an artefact turns up under its era even
     when nobody wrote an explicit link. */
  function inPeriod(e, p) {
    if (!p) return true;
    if (e.id === p.id) return true;
    if (p.relations.some((r) => r.id === e.id)) return true;
    if (e.start == null || e.modern) return false;
    const end = e.end ?? e.start;
    return end >= p.start && e.start <= p.end;
  }

  function apply() {
    const period = state.period ? periods.find((p) => p.id === state.period) : null;
    let list = db.ALL;

    if (state.type) list = list.filter((e) => e.type === state.type);
    if (period) list = list.filter((e) => inPeriod(e, period));
    if (state.q.trim()) {
      const hits = new Set(db.search(state.q, { limit: 400 }).map((e) => e.id));
      list = list.filter((e) => hits.has(e.id));
    }

    switch (state.sort) {
      case 'chrono':
        list = sortBy(list, (e) => (e.modern ? 1 : 0), (e) => e.start ?? 9999); break;
      case 'chrono-desc':
        list = sortBy(list, (e) => -(e.start ?? -9999)); break;
      case 'name':
        list = sortBy(list, (e) => e.sortName); break;
      case 'connections':
        list = sortBy(list, (e) => -e.relations.length); break;
      case 'evidence':
        list = sortBy(list, (e) => -e.claims.length); break;
    }

    count.textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;
    results.innerHTML = list.length
      ? `<div class="grid grid-auto">${list.slice(0, 240).map((e) => entityCard(e)).join('')}</div>
         ${list.length > 240 ? `<p class="small muted" style="margin-top:var(--s-6);text-align:center">
            Showing the first 240. Narrow the filters to see more.</p>` : ''}`
      : emptyState('Nothing matches these filters.', 'Try clearing the period or the search box.');
    hydrateImages(results, db.get);

    // Reflect state in the URL so a filtered view can be shared.
    const qs = new URLSearchParams();
    if (state.type) qs.set('type', state.type);
    if (state.period) qs.set('period', state.period);
    if (state.q) qs.set('q', state.q);
    if (state.sort !== 'chrono') qs.set('sort', state.sort);
    const s = qs.toString();
    history.replaceState(null, '', `#/explore${s ? '?' + s : ''}`);
  }

  function syncPressed(container, attr, value) {
    $$('button', container).forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset[attr] || '') === (value || ''))));
  }

  $('#facet-type', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.type = b.dataset.type || null;
    syncPressed($('#facet-type', root), 'type', state.type);
    apply();
  });

  $('#facet-period', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.period = b.dataset.period || null;
    syncPressed($('#facet-period', root), 'period', state.period);
    apply();
  });

  $('#facet-sort', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.sort = b.dataset.sort;
    syncPressed($('#facet-sort', root), 'sort', state.sort);
    apply();
  });

  input.addEventListener('input', debounce(() => { state.q = input.value; apply(); }, 160));

  $('#explore-clear', root).addEventListener('click', () => {
    state.type = null; state.period = null; state.q = ''; state.sort = 'chrono';
    input.value = '';
    syncPressed($('#facet-type', root), 'type', null);
    syncPressed($('#facet-period', root), 'period', null);
    syncPressed($('#facet-sort', root), 'sort', 'chrono');
    apply();
  });

  apply();
}
