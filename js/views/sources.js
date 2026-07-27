/* ============================================================
   Hellenika — Sources
   The bibliography, with usage counts so it is clear which works
   the dataset actually leans on.
   ============================================================ */

import { el, $, $$, esc, debounce, fold, sortBy } from '../util.js';
import { icon } from '../icons.js';
import * as db from '../db.js';
import { sourceList } from '../../data/sources.js';
import { entityHref } from '../router.js';
import { sectionHead, emptyState } from '../components/ui.js';

export async function renderSources() {
  const root = el('div', { class: 'view' });
  const usage = db.sourceUsage();
  const stats = db.claimStats();

  const rows = sourceList.map((s) => ({ ...s, uses: usage.get(s.id) || 0 }));
  const ancient = rows.filter((r) => r.kind === 'ancient');
  const modern = rows.filter((r) => r.kind === 'modern');

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${rows.length} works cited</p>
          <h1>Sources</h1>
          <p class="sub">Everything on this site rests on something. Here is what.</p>
        </div>
      </div>

      <div class="stat-row" style="margin-bottom:var(--s-10)">
        <div class="stat-tile">
          <div class="n">${stats.total}</div>
          <div class="l">evidence-tagged claims</div>
        </div>
        <div class="stat-tile">
          <div class="n">${ancient.length}</div>
          <div class="l">ancient primary sources</div>
        </div>
        <div class="stat-tile">
          <div class="n">${modern.length}</div>
          <div class="l">works of modern scholarship</div>
        </div>
        <div class="stat-tile">
          <div class="n">${stats.byConfidence.get('debated') + stats.byConfidence.get('speculative')}</div>
          <div class="l">claims marked debated or speculative</div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:var(--s-10)">
        <h3 class="eyebrow" style="margin-bottom:var(--s-4)">How the evidence breaks down</h3>
        <div class="evidence-bar" style="height:12px">
          ${db.CONFIDENCE_ORDER.map((k) => {
            const n = stats.byConfidence.get(k) || 0;
            return n ? `<span style="flex:${n};background:var(--c-${k})"
              title="${n} ${esc(db.CONFIDENCE_META[k].label)}"></span>` : '';
          }).join('')}
        </div>
        <div class="row-wrap">
          ${db.CONFIDENCE_ORDER.map((k) => {
            const n = stats.byConfidence.get(k) || 0;
            return n ? `<span class="conf conf-${k}">${esc(db.CONFIDENCE_META[k].label)} · ${n}</span>` : '';
          }).join('')}
        </div>
        <div class="row-wrap" style="margin-top:var(--s-4)">
          ${[...stats.byEvidence.entries()].filter(([, n]) => n)
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => `<span class="chip">${esc(db.EVIDENCE_META[k].label)} · ${n}</span>`).join('')}
        </div>
      </div>

      <div class="explore-bar">
        <div class="search-trigger" style="max-width:340px;cursor:text">
          ${icon('search')}
          <input id="src-q" type="search" placeholder="Filter by author or title…"
                 style="border:none;background:none;outline:none;flex:1;min-width:0;color:var(--text)"
                 aria-label="Filter sources">
        </div>
        <div class="spacer"></div>
        <div class="segmented" id="src-kind">
          <button data-kind="all" aria-pressed="true">All</button>
          <button data-kind="ancient" aria-pressed="false">Ancient</button>
          <button data-kind="modern" aria-pressed="false">Modern</button>
        </div>
      </div>

      <div id="src-list"></div>
    </div>`;

  root.__mount = () => mount(root, rows);
  return root;
}

function mount(root, rows) {
  const list = $('#src-list', root);
  const input = $('#src-q', root);
  let kind = 'all', q = '';

  function apply() {
    let out = rows;
    if (kind !== 'all') out = out.filter((r) => r.kind === kind);
    if (q.trim()) {
      const f = fold(q);
      out = out.filter((r) => fold(`${r.author} ${r.title} ${r.note || ''}`).includes(f));
    }
    // Most-used first within each kind — it shows where the weight sits.
    out = sortBy(out, (r) => (r.kind === 'ancient' ? 0 : 1), (r) => -r.uses, (r) => fold(r.author));

    if (!out.length) { list.innerHTML = emptyState('No sources match that filter.'); return; }

    const groups = [
      ['Ancient primary sources', out.filter((r) => r.kind === 'ancient')],
      ['Modern scholarship', out.filter((r) => r.kind === 'modern')],
    ].filter(([, g]) => g.length);

    list.innerHTML = groups.map(([label, g]) => `
      <section style="margin-bottom:var(--s-12)">
        ${sectionHead(label, `${g.length} works`)}
        ${g.map(sourceRow).join('')}
      </section>`).join('');

    // Expand the "cited by" lists lazily — the DOM stays small until asked.
    $$('[data-src]', list).forEach((btn) => {
      btn.addEventListener('click', () => {
        const host = btn.nextElementSibling;
        const open = host.hasAttribute('hidden');
        if (open) {
          const cites = db.entitiesCiting(btn.dataset.src);
          host.innerHTML = `<div class="rel-list" style="margin-top:var(--s-3)">
            ${cites.map((e) => `<a class="rel-pill" href="${entityHref(e.id)}"
              style="--tint:${db.tintVar(e.tint)}"><span class="dot"></span>${esc(e.name)}</a>`).join('')}
          </div>`;
          host.removeAttribute('hidden');
          btn.textContent = 'Hide';
        } else {
          host.setAttribute('hidden', '');
          btn.textContent = `Cited by ${btn.dataset.n}`;
        }
      });
    });
  }

  function sourceRow(s) {
    return `
      <div class="src-item">
        <div class="a">${esc(s.author)}${s.year ? ` <span class="muted">(${s.year})</span>` : ''}</div>
        <div class="t">${esc(s.title)}</div>
        ${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}
        <div class="u row" style="gap:var(--s-3)">
          <span>${s.uses} ${s.uses === 1 ? 'entity cites this' : 'entities cite this'}</span>
          ${s.uses ? `<button class="btn btn-sm btn-ghost" data-src="${esc(s.id)}" data-n="${s.uses}">Cited by ${s.uses}</button>
            <div hidden style="flex-basis:100%"></div>` : ''}
        </div>
      </div>`;
  }

  input.addEventListener('input', debounce(() => { q = input.value; apply(); }, 150));
  $('#src-kind', root).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    kind = b.dataset.kind;
    $$('#src-kind button', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  });

  apply();
}
