/* ============================================================
   Hellenika — About & method
   ============================================================ */

import { el, esc } from '../util.js';
import { icon } from '../icons.js';
import * as db from '../db.js';
import { TYPE_META } from '../db.js';
import { sectionHead, confidenceKey } from '../components/ui.js';

export async function renderAbout() {
  const root = el('div', { class: 'view' });
  const s = db.stats;
  const stats = db.claimStats();

  root.innerHTML = `
    <div class="wrap">
      <div class="wrap-read" style="padding:0">
        <p class="eyebrow">About</p>
        <h1 style="font-size:clamp(2rem,4vw,2.8rem);margin-block:var(--s-3) var(--s-5)">
          Method, scope and honest limits
        </h1>
        <p class="lede">
          Hellenika is an interactive atlas of the Ancient Greek world from 3200 BC to 30 BC.
          It is built on one conviction: that the interesting part of history is not the list
          of facts but the structure — how people, places, objects and events connect, and how
          firmly we actually know any of it.
        </p>
      </div>

      <div class="about-grid" style="margin-block:var(--s-12)">
        ${[
          [s.entities, 'entities'],
          [Math.round(s.relations), 'relationships'],
          [stats.total, 'evidence-tagged claims'],
          [s.sources, 'sources cited'],
          [s.withCoords, 'mapped locations'],
          [s.collections, 'curated collections'],
        ].map(([n, l]) => `
          <div class="stat-tile"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`).join('')}
      </div>

      <div class="wrap-read" style="padding:0">
        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('The evidence system', 'The part that makes this different from an encyclopaedia.')}
          <div class="prose">
            <p>
              Most history writing presents everything in the same voice. "The Minoans built
              palaces at Knossos" and "Minoan society was matriarchal" read identically, though
              one is established beyond dispute and the other is a speculation that has been
              losing ground for eighty years.
            </p>
            <p>
              Every factual claim here carries two tags. The first says what <strong>kind of
              evidence</strong> it rests on — excavated material, an inscription, a coin, a
              literary text, a linguistic argument, ancient belief, modern consensus, or modern
              disagreement. The second says how <strong>confident</strong> anyone is entitled
              to be.
            </p>
            <p>
              This does not make the site neutral, and it is not meant to. It makes the
              reasoning visible, so you can disagree with it.
            </p>
          </div>
          <div style="margin-top:var(--s-6)">${confidenceKey()}</div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('Mythology is kept separate', 'Deliberately, structurally, and visibly.')}
          <div class="prose">
            <p>
              Mythological entities do not use the same page structure as historical ones. A
              myth page separates the story as told, the earliest surviving source for it, its
              religious function, any possible historical background, what archaeology actually
              shows, and later reinterpretation.
            </p>
            <p>
              This matters because the two registers contaminate each other easily. The Minotaur
              is a Greek story about Crete; there is no bull-headed figure anywhere in Minoan
              art. Agamemnon's mask is three centuries too early to be Agamemnon's. Keeping the
              sections apart means neither claim has to be quietly softened.
            </p>
            <p>
              Separation is not dismissal. A myth with no historical basis can still be the most
              important thing a society believed, and the pages say so.
            </p>
          </div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('Dates, and why they wobble')}
          <div class="prose">
            <p>
              Period boundaries are scholarly conventions, not events. Nobody went to bed in the
              Archaic period and woke up in the Classical. The bands on the timeline overlap
              because the underlying realities did — Minoan and Mycenaean civilisation coexisted
              for roughly three centuries.
            </p>
            <p>
              Two chronologies compete for the Aegean Bronze Age. This site uses the "high"
              chronology, which places the Theran eruption around 1620–1600 BC on radiocarbon
              and ice-core evidence. The "low" chronology, resting on Egyptian synchronisms,
              prefers around 1500 BC. The difference is not cosmetic: on the high chronology the
              eruption cannot have caused the Cretan destructions of 1450 BC, and on the low one
              it might have. Where a date is load-bearing, the page says which way it leans.
            </p>
            <p>
              Years are stored internally on a signed scale where negative numbers are BC.
              There is no year zero in the historical era, so the astronomical convention is
              used for arithmetic and only the display differs.
            </p>
          </div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('What is missing', 'An honest inventory.')}
          <div class="prose">
            <p>
              <strong>Images.</strong> Photos are resolved live from Wikipedia rather than
              bundled — this project cannot itself clear rights on hundreds of museum
              photographs, and Wikipedia's own hosting already solves that. Every photo links
              back to its source article. Not every entity has one: many Bronze Age
              individuals and abstract events genuinely have no suitable image, and those
              pages show their type glyph rather than something wrong or irrelevant.
            </p>
            <p>
              <strong>Coverage.</strong> ${s.entities} entities is a serious foundation and
              nowhere near complete. The Greek world had well over a thousand poleis. Coverage
              is deliberately weighted toward things where the evidence is interesting rather
              than toward comprehensiveness.
            </p>
            <p>
              <strong>The map.</strong> The basemap is a real tiled satellite/terrain map with
              no modern labels or borders, plus a fully offline vector fallback. The historical
              layer on top of it — territories, routes — is still a generalised schematic, not
              survey data. Ancient borders were rarely lines on a map at all: a Hellenistic
              kingdom controlled roads, cities and river valleys, not evenly-shaded polygons.
              Treat those shapes as indicative.
            </p>
            <p>
              <strong>Perspective.</strong> Nearly every surviving source was written by
              literate elite men, mostly Athenian. Women, the enslaved, resident foreigners
              and the rural poor made up the large majority of the population and appear in
              the record mainly when someone else needed to mention them. Where a page can
              flag that gap, it does.
            </p>
          </div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('How it is built', 'For anyone curious about the technical side.')}
          <div class="prose">
            <p>
              Plain modern web platform: native ES modules, no framework, no build step, no
              dependencies. The timeline, map and relationship graph are canvas rather than DOM,
              so the dataset can grow to thousands of entities without the browser assembling
              thousands of elements.
            </p>
            <p>
              Data lives in separate authored files by category. On load they merge into a
              single entity graph, and <strong>inverse relationships are derived
              automatically</strong> — writing "Knossos → excavated by → Arthur Evans" once
              makes the reverse link appear on Evans' page. That is what keeps ${Math.round(s.relations)}
              connections consistent without hand-maintaining both directions.
            </p>
            <p>
              Core navigation and controls are keyboard-accessible, the canvas views support
              keyboard panning and zooming, and the interface respects
              <code>prefers-reduced-motion</code> in both light and dark themes. Complete
              non-canvas alternatives for every visual relationship are still being developed.
              Press <span class="kbd">/</span> to search from anywhere, <span class="kbd">r</span>
              for a random entity, or <span class="kbd">t</span> <span class="kbd">m</span>
              <span class="kbd">e</span> to jump to the timeline, map or explore.
            </p>
          </div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('The dataset', 'What is in it, by kind.')}
          <div class="row-wrap">
            ${db.typesPresent.map((t) => `
              <a class="chip" href="#/explore?type=${t}">
                ${esc(TYPE_META[t]?.plural || t)} · ${db.byType.get(t).length}
              </a>`).join('')}
          </div>
        </section>

        <section style="margin-bottom:var(--s-12)">
          ${sectionHead('Visual credits')}
          <div class="prose">
            <p>
              The Trojan-horse mark is
              <a href="https://commons.wikimedia.org/wiki/File:Trojan-horse_-_Delapouite_-_white_-_game-icons.svg"
                 target="_blank" rel="noopener">“Trojan horse” by Delapouite</a>,
              sourced from Wikimedia Commons and used under
              <a href="https://creativecommons.org/licenses/by/3.0/"
                 target="_blank" rel="noopener">CC BY 3.0</a>.
              Its colour has been adapted to the site theme.
            </p>
          </div>
        </section>

        <section>
          ${sectionHead('Corrections')}
          <div class="prose">
            <p>
              This is a synthesis of published scholarship written to be useful, and it will
              contain errors. The evidence tags are the mechanism for catching them: if a claim
              is marked <em>established</em> and you know it is contested, that is a bug in the
              data rather than a difference of opinion.
            </p>
          </div>
          <div class="callout" style="margin-top:var(--s-6)">
            <p class="small">
              <strong>A note on the sources list.</strong> Works are cited because they inform
              the claims on a page, not as an endorsement. Where a cited work is polemical or
              disputed — Popper on Plato, Bartsiokas on Vergina, Fehling on Herodotus — the
              bibliography entry says so.
            </p>
          </div>
        </section>
      </div>
    </div>`;

  return root;
}
