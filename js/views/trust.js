/* ============================================================
   Hellenika — Trust pages
   Editorial standards, AI policy and corrections. These state the
   rules the content is held to, and report honestly how far the
   existing data has got towards them (figures are computed live).
   ============================================================ */

import { el, esc } from '../util.js';
import * as db from '../db.js';
import { confidenceKey } from '../components/ui.js';

const REPO = 'https://github.com/georgephilippou/Hellenika';

/** Corrections log, newest first. Add an entry whenever published content is changed because it was wrong. */
const CORRECTIONS = [
  // { date: '2026-11-03', entity: 'knossos', was: '…', now: '…', why: '…' },
];

function citationCoverage() {
  let total = 0, cited = 0, strong = 0, strongCited = 0;
  const full = [];
  for (const e of db.ALL) {
    if (e.standard === 'full') full.push(e);
    for (const c of e.claims) {
      total += 1;
      const has = Array.isArray(c.cite) && c.cite.length > 0;
      if (has) cited += 1;
      if (c.confidence === 'established' || c.confidence === 'strong') {
        strong += 1;
        if (has) strongCited += 1;
      }
    }
  }
  return { total, cited, strong, strongCited, full };
}

const NAV = [
  ['standards', 'Editorial standards'],
  ['ai-policy', 'AI policy'],
  ['corrections', 'Corrections'],
];

function shell(active, title, lede, bodyHTML) {
  const root = el('div', { class: 'view' });
  root.innerHTML = `
    <div class="wrap">
      <div class="wrap-read" style="padding:0">
        <p class="eyebrow"><a href="#/about">About</a> · Trust</p>
        <h1 style="font-size:clamp(2rem,4vw,2.8rem);margin-block:var(--s-3) var(--s-5)">${esc(title)}</h1>
        <p class="lede">${lede}</p>
        <nav class="row-wrap" aria-label="Trust pages" style="margin-bottom:var(--s-8)">
          ${NAV.map(([id, label]) => `<a class="chip${id === active ? ' is-on' : ''}" href="#/about/${id}">${esc(label)}</a>`).join('')}
        </nav>
        <div class="prose">${bodyHTML}</div>
      </div>
    </div>`;
  return root;
}

export async function renderStandards() {
  const c = citationCoverage();
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  return shell('standards', 'Editorial standards',
    'The rules every entry is held to, and where the data currently falls short of them.',
    `
    <h2>What we publish</h2>
    <p>Hellenika is a synthesis of published scholarship on the Greek world, built to be read
    through connections and evidence. It is not a primary source and it does not offer new
    theories. Where scholars disagree, the entry says so and names the positions.</p>

    <h2>Every claim is tagged</h2>
    <p>Each evidence statement carries an <strong>evidence type</strong> (archaeological,
    literary, epigraphic, numismatic, linguistic, ancient tradition, modern consensus, modern
    debate) and a <strong>confidence level</strong>:</p>
    <div style="margin-bottom:var(--s-6)">${confidenceKey()}</div>

    <h2>Every claim should be traceable</h2>
    <p>Beyond the tags, a claim can carry a <strong>citation</strong>: the work it rests on and
    the place in it (page, section, line or inscription number). Citations appear in square
    brackets beside the claim and link to the bibliography.</p>
    <p>Entries that meet our <strong>full standard</strong> must cite every
    <em>established</em> or <em>strong</em> claim, and have at least eight claims, five sources
    and five sections of narrative. This is enforced by the project's automated test suite (<code>npm test</code>).</p>

    <div class="callout"><p class="small"><strong>Where the data stands today.</strong>
    ${c.cited.toLocaleString('en-GB')} of ${c.total.toLocaleString('en-GB')} claims (${pct(c.cited, c.total)}%)
    carry a citation; ${c.strongCited.toLocaleString('en-GB')} of
    ${c.strong.toLocaleString('en-GB')} established or strong claims (${pct(c.strongCited, c.strong)}%).
    ${c.full.length
      ? `${c.full.length} ${c.full.length === 1 ? 'entry meets' : 'entries meet'} the full standard:
         ${c.full.map((e) => `<a href="${'#/e/' + encodeURIComponent(e.id)}">${esc(e.name)}</a>`).join(', ')}.`
      : 'No entry meets the full standard yet.'}
    Older entries list their sources for the entry as a whole, not claim by claim. They are being
    upgraded one at a time, and we do not back-fill citations we have not checked.</p></div>

    <h2>Sources we prefer</h2>
    <ul>
      <li>Ancient texts, cited by author, work and book/line, ideally in a named edition.</li>
      <li>Excavation reports, corpora (inscriptions, coins, pottery) and catalogues of record.</li>
      <li>Peer-reviewed monographs, articles and handbooks. Recent syntheses for orientation,
      specialist studies for particular claims.</li>
      <li>Museum and database records (for objects, find-spots and accession numbers).</li>
    </ul>
    <p>Each bibliography entry records whether the work is open access, paywalled or print only,
    so readers know whether they can check it, and a DOI where one exists. General encyclopaedias
    are used for orientation only and never as the sole support for a strong claim.</p>

    <h2>Dates, names and places</h2>
    <ul>
      <li>Dates before the sixth century BC are approximate and marked so. Where the chronology is
      disputed (the Thera eruption, the Mycenaean and Minoan sequences) entries give the range and
      who argues for which end of it.</li>
      <li>Names appear in the form most readers will search for, with Greek and variant forms listed.</li>
      <li>Identifications of ancient places with modern sites are stated as identifications, with
      the evidence for them, not as bare facts.</li>
    </ul>

    <h2>Myth is not history</h2>
    <p>Mythological pages use a separate structure: the story as told, the earliest source,
    religious function, possible historical background, archaeology and later reinterpretation.</p>

    <h2>Images</h2>
    <p>Images come from Wikimedia Commons and similar open sources and keep their credit and
    licence. Images are never generated by AI.</p>

    <h2>Corrections and independence</h2>
    <p>Errors are fixed as soon as they are confirmed and logged on the
    <a href="#/about/corrections">corrections page</a>. Hellenika is non-commercial, carries no
    advertising, and no one pays for placement.</p>
    `);
}

export async function renderAiPolicy() {
  return shell('ai-policy', 'AI policy',
    'Where AI is used on this site, where it is not, and the rule that governs both.',
    `
    <h2>Our position</h2>
    <p>This site is built with the help of AI tools, and says so in the footer. AI helps with
    drafting, code, layout and consistency checks. It does not decide what is true.</p>

    <h2>AI is never the source of a fact</h2>
    <p>No date, name, find-spot, attribution, translation or citation is accepted because an AI
    model said it. Language models produce fluent text about the past that cannot be traced to
    evidence, can be out of date, and invent details and references that look convincing.
    So nothing recalled from a model's training is published as fact.</p>
    <p>Text is drafted <em>from</em> material that has actually been retrieved and read: an
    edition of an ancient text, a report, an article, a museum or database record. The result is
    checked against that material, and the claim cites it.</p>

    <h2>What AI may do</h2>
    <ul>
      <li>Summarise or restructure a document it has been given.</li>
      <li>Draft prose from named sources, for human review.</li>
      <li>Write and refactor code, and run the automated checks.</li>
      <li>Find inconsistencies (a date that disagrees with another page, a missing link).</li>
    </ul>

    <h2>What AI may not do</h2>
    <ul>
      <li>Supply a fact, date, quotation or reference from memory.</li>
      <li>Decide the date, attribution or authenticity of an object or text.</li>
      <li>Resolve a scholarly dispute. Disputes are reported as disputes.</li>
      <li>Generate images or "reconstructions" of ancient things.</li>
    </ul>

    <h2>Responsibility</h2>
    <p>The site's editor is responsible for what is published, whoever or whatever drafted it.
    The automated tests (<code>npm test</code>) fail if a citation points at a source that does not
    exist, or if a strong claim on a full-standard entry has no citation.</p>
    <p class="small muted">If you find something that looks like an AI-introduced error, report
    it on the <a href="${REPO}/issues" target="_blank" rel="noopener">issue tracker</a>.</p>
    `);
}

export async function renderCorrections() {
  const rows = CORRECTIONS.map((c) => `
    <li><strong>${esc(c.date)}</strong> · <a href="#/e/${encodeURIComponent(c.entity)}">${esc(c.entity)}</a><br>
    <span class="muted">Was:</span> ${esc(c.was)}<br><span class="muted">Now:</span> ${esc(c.now)}<br>
    <span class="muted">Why:</span> ${esc(c.why)}</li>`).join('');
  return shell('corrections', 'Corrections',
    'How to report an error, and a public record of what has been changed.',
    `
    <h2>Report an error</h2>
    <p>If a claim is marked <em>established</em> and you know it is contested, or a date, name or
    citation is wrong, please open an issue on the
    <a href="${REPO}/issues" target="_blank" rel="noopener">project tracker</a> with the page and
    the source you are relying on. A published correction needs a source, as a claim does.</p>

    <h2>What counts as a correction</h2>
    <p>A change to a published fact, a confidence level, an attribution or a citation because the
    earlier version was wrong or overstated. Typo fixes, new material and style changes are not
    logged here.</p>

    <h2>Log</h2>
    ${rows ? `<ul>${rows}</ul>` : '<p class="muted">No corrections have been logged yet.</p>'}
    `);
}
