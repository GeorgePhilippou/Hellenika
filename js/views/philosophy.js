/* ============================================================
   Hellenika — Greek philosophy overview
   A guided front door into the site's philosopher records: why the
   tradition matters, the questions it argued over, the schools, and
   every philosopher currently documented, with a note on how each
   one is known and what their portrait actually is.

   The curated text below is editorial and deliberately short; the
   evidence-tagged entries it links to carry the detail.
   ============================================================ */

import { el, esc } from '../util.js';
import { icon } from '../icons.js';
import * as db from '../db.js';
import { entityDate, entityPill, sectionHead } from '../components/ui.js';
import { entityHref } from '../router.js';

/* ---------- Editorial data ----------
   `portrait.kind` is what the picture actually is, so the page never
   presents a Renaissance painting or a modern statue as a likeness:
     copy   Roman copy or herm of a Greek portrait type
     coin   ancient coin
     mosaic Roman mosaic
     none   no securely identified ancient portrait survives (glyph shown) */
const PORTRAIT_LABEL = {
  copy: 'Roman portrait',
  coin: 'Ancient coin',
  mosaic: 'Roman mosaic',
  none: 'No ancient portrait',
};

const FIGURES = [
  {
    id: 'thales', group: 'pre', school: 'Milesian',
    idea: 'Proposed that water is the source of all things, and that the world can be explained by natural causes rather than divine whim.',
    known: 'Nothing survives in his own words; later writers, above all Aristotle, report his views.',
    portrait: { kind: 'copy', note: 'Roman portrait head, traditionally identified as Thales.' },
  },
  {
    id: 'anaximander', group: 'pre', school: 'Milesian',
    idea: 'Held that everything arises from the “boundless” (apeiron), and drew one of the first maps and models of the cosmos.',
    known: 'One sentence, possibly close to his wording, survives in a later quotation.',
    portrait: { kind: 'mosaic', note: 'Roman mosaic showing a seated philosopher with a sundial.' },
  },
  {
    id: 'anaximenes', group: 'pre', school: 'Milesian',
    idea: 'Argued that air, thinning and thickening, becomes everything else.',
    known: 'Known only through reports in Aristotle and later summaries.',
    portrait: { kind: 'none' },
  },
  {
    id: 'pythagoras', group: 'pre', school: 'Pythagorean',
    idea: 'Founded a community devoted to number, harmony and the rebirth of the soul.',
    known: 'Left no writings; the earliest evidence is fragmentary and the later biographies are largely legend.',
    portrait: { kind: 'copy', note: 'Roman bust in the Capitoline Museums.' },
  },
  {
    id: 'heraclitus', group: 'pre', school: 'Ephesian',
    idea: 'Saw the world as constant change held together by a hidden order, the logos.',
    known: 'Over a hundred short sayings survive as quotations in later authors.',
    portrait: { kind: 'coin', note: 'Coin of Ephesus, third century AD.' },
  },
  {
    id: 'parmenides', group: 'pre', school: 'Eleatic',
    idea: 'Argued that what is cannot come to be or change, so that the world of the senses is misleading.',
    known: 'About 150 lines of his poem survive, quoted by later writers.',
    portrait: { kind: 'copy', note: 'Ancient portrait bust.' },
  },
  {
    id: 'empedocles', group: 'pre', school: 'Pluralist',
    idea: 'Explained change as four unchanging roots, earth, air, fire and water, combined and separated by Love and Strife.',
    known: 'Several hundred lines of two poems survive, and a papyrus published in 1999 added more.',
    portrait: { kind: 'none' },
  },
  {
    id: 'anaxagoras', group: 'pre', school: 'Pluralist',
    idea: 'Taught that everything contains a portion of everything, sorted and set in motion by Mind.',
    known: 'A few fragments survive, preserved by later commentators.',
    portrait: { kind: 'none' },
  },
  {
    id: 'democritus', group: 'pre', school: 'Atomist',
    idea: 'Explained the world as atoms moving in a void, with everything else a matter of convention.',
    known: 'Hundreds of fragments, mostly ethical sayings; his physics comes chiefly through Aristotle.',
    portrait: { kind: 'copy', note: 'A portrait type traditionally called Democritus; the identification is uncertain.' },
  },
  {
    id: 'xenophanes', group: 'pre', school: 'Poet-philosopher',
    idea: 'Mocked the human-shaped gods of Homer and argued for a single divinity unlike mortals.',
    known: 'Dozens of fragments of his verse survive, quoted by later authors.',
    portrait: { kind: 'none' },
  },
  {
    id: 'zeno-of-elea', group: 'pre', school: 'Eleatic',
    idea: 'Devised paradoxes of motion and plurality to defend Parmenides, and to test ideas about infinity.',
    known: 'His book is lost; the paradoxes are preserved chiefly by Aristotle.',
    portrait: { kind: 'none' },
  },
  {
    id: 'leucippus', group: 'pre', school: 'Atomist',
    idea: 'Said to have originated atomism: unchangeable bodies moving in empty space.',
    known: 'A single sentence is quoted as his, and even his existence was doubted in antiquity.',
    portrait: { kind: 'none' },
  },
  {
    id: 'protagoras', group: 'soc', school: 'Sophist',
    idea: 'Held that “man is the measure of all things”, and taught his students to argue both sides of any case.',
    known: 'A few fragments survive; most of what we know comes from Plato, who argued against him.',
    portrait: { kind: 'none' },
  },
  {
    id: 'gorgias', group: 'soc', school: 'Sophist',
    idea: 'Brought ornate rhetoric to Athens, and argued that nothing exists, can be known, or can be communicated.',
    known: 'Two speeches survive complete; his treatise on non-being is known from summaries.',
    portrait: { kind: 'none' },
  },
  {
    id: 'socrates', group: 'soc', school: 'Socratic',
    idea: 'Argued that virtue is knowledge and that the unexamined life is not worth living, testing others by relentless questioning.',
    known: 'Wrote nothing. Plato, Xenophon and Aristophanes each portray him differently.',
    portrait: { kind: 'copy', note: 'Roman copy of a Greek portrait type.' },
  },
  {
    id: 'antisthenes', group: 'soc', school: 'Socratic',
    idea: 'Held that virtue is enough for happiness; later writers counted him the first Cynic.',
    known: 'Only fragments and titles survive; the picture comes from Xenophon and later biographers.',
    portrait: { kind: 'copy', note: 'Roman portrait bust, Vatican Museums.' },
  },
  {
    id: 'aristippus', group: 'soc', school: 'Cyrenaic',
    idea: 'Taught that pleasure, above all present pleasure, is the goal of life, provided one stays master of it.',
    known: 'Known through anecdotes, and through the later Cyrenaic school; he may have written little.',
    portrait: { kind: 'none' },
  },
  {
    id: 'plato', group: 'classical', school: 'Academy',
    idea: 'Held that the changing world is a copy of unchanging Forms, and that justice in city and soul depends on knowledge.',
    known: 'Unusually, his dialogues survive almost complete.',
    portrait: { kind: 'copy', note: 'Roman copy of a Greek portrait type.' },
  },
  {
    id: 'aristotle', group: 'classical', school: 'Lyceum',
    idea: 'Built a system from observation and logic that covered biology, ethics, politics and metaphysics.',
    known: 'His surviving works are largely lecture notes; his polished dialogues are lost.',
    portrait: { kind: 'copy', note: 'Roman copy of a Greek portrait type.' },
  },
  {
    id: 'theophrastus', group: 'classical', school: 'Lyceum',
    idea: 'Carried Aristotle’s method into botany and mineralogy, and sketched human character types.',
    known: 'A fraction of his output survives, including the Enquiry into Plants and the Characters.',
    portrait: { kind: 'none' },
  },
  {
    id: 'diogenes-of-sinope', group: 'later', school: 'Cynic',
    idea: 'Made a life of poverty and public shamelessness the proof that virtue needs nothing but nature.',
    known: 'Known through anecdotes gathered centuries later, chiefly by Diogenes Laertius.',
    portrait: { kind: 'mosaic', note: 'Roman mosaic labelled with his name.' },
  },
  {
    id: 'epicurus', group: 'later', school: 'Epicurean',
    idea: 'Taught that pleasure, meaning freedom from pain and disturbance, is the goal of life, and that the gods do not meddle in human affairs.',
    known: 'Three letters and a set of maxims survive, with fragments from Herculaneum papyri.',
    portrait: { kind: 'copy', note: 'Roman copy of a Greek portrait type.' },
  },
  {
    id: 'zeno-of-citium', group: 'later', school: 'Stoic',
    idea: 'Founded the Stoa: virtue alone is good, and to live well is to live in agreement with nature and reason.',
    known: 'His writings are lost; his teaching survives through later Stoics.',
    portrait: { kind: 'copy', note: 'Roman herm in the Farnese collection, Naples.' },
  },
  {
    id: 'pyrrho', group: 'later', school: 'Sceptic',
    idea: 'Taught that things cannot be decided either way, and that suspending judgement brings tranquillity.',
    known: 'Wrote nothing; his views come through his pupil Timon and later Pyrrhonists.',
    portrait: { kind: 'none' },
  },
  {
    id: 'chrysippus', group: 'later', school: 'Stoic',
    idea: 'Systematised Stoicism, including a logic of propositions, and argued that fate and responsibility are compatible.',
    known: 'Credited with over 700 books, none of which survives complete.',
    portrait: { kind: 'copy', note: 'Roman copy of a Greek portrait type.' },
  },
];

const GROUPS = [
  ['all', 'All'],
  ['pre', 'Presocratics'],
  ['soc', 'Sophists and Socratics'],
  ['classical', 'Athenian schools'],
  ['later', 'Later schools'],
];

const FEATURED = ['thales', 'socrates', 'plato', 'aristotle', 'epicurus', 'zeno-of-citium'];

const QUESTIONS = [
  {
    q: 'What is the world made of?',
    lead: 'The earliest Greek thinkers asked for a single natural origin of things, one that needed no god’s will to explain it.',
    answers: [
      ['thales', 'Water'],
      ['anaximander', 'The boundless'],
      ['anaximenes', 'Air'],
      ['heraclitus', 'Fire and flux'],
      ['empedocles', 'Four roots'],
      ['leucippus', 'Atoms and void, if he existed'],
      ['democritus', 'Atoms and void'],
    ],
  },
  {
    q: 'What is real, and can change be real?',
    lead: 'Parmenides argued that change is impossible; nearly every thinker after him had to answer.',
    answers: [
      ['parmenides', 'Only unchanging being is real'],
      ['zeno-of-elea', 'Motion leads to paradox'],
      ['heraclitus', 'Everything flows'],
      ['plato', 'The Forms are real'],
      ['aristotle', 'Form in matter'],
    ],
  },
  {
    q: 'How do we know anything?',
    lead: 'Sensory experience, argument and inherited wisdom were all in competition.',
    answers: [
      ['xenophanes', 'Certain knowledge of the gods is out of reach'],
      ['protagoras', 'Truth depends on the perceiver'],
      ['gorgias', 'Nothing can be known or communicated'],
      ['socrates', 'Test claims by questioning'],
      ['plato', 'Knowledge as recollection of the Forms'],
      ['aristotle', 'Collect observations, then classify'],
    ],
  },
  {
    q: 'How should we live?',
    lead: 'After the Peloponnesian War and Alexander, philosophy turned increasingly to the individual life.',
    answers: [
      ['socrates', 'Virtue is knowledge'],
      ['antisthenes', 'Virtue is enough'],
      ['aristippus', 'Enjoy the present, keep control'],
      ['diogenes-of-sinope', 'Live by nature, reject convention'],
      ['pyrrho', 'Suspend judgement to find calm'],
      ['epicurus', 'Pleasure as freedom from disturbance'],
      ['zeno-of-citium', 'Virtue alone is good'],
      ['chrysippus', 'Reason, fate and responsibility'],
    ],
  },
  {
    q: 'How should we be governed?',
    lead: 'Philosophers argued in a city that governed itself by public debate and a jury of citizens.',
    answers: [
      ['protagoras', 'Justice and respect shared by all citizens'],
      ['plato', 'Rule by those who know'],
      ['aristotle', 'Compare constitutions, seek the mixed form'],
    ],
  },
];

const SCHOOLS = [
  { name: 'Ionian natural philosophers', when: 'Sixth to fifth century BC', ids: ['thales', 'anaximander', 'anaximenes', 'heraclitus'], text: 'From Miletus and Ephesus, the first thinkers to look for natural principles behind the world.' },
  { name: 'Pythagoreans', when: 'From the late sixth century BC', ids: ['pythagoras'], text: 'A community in southern Italy that joined number, music, ritual purity and belief in rebirth.' },
  { name: 'Eleatics', when: 'Sixth to fifth century BC', ids: ['xenophanes', 'parmenides', 'zeno-of-elea'], text: 'Argued that reality is single and unchanging. Xenophanes is traditionally counted with them, though scholars question the link.' },
  { name: 'Pluralists and atomists', when: 'Fifth century BC', ids: ['empedocles', 'anaxagoras', 'leucippus', 'democritus'], text: 'Answered Parmenides by explaining change as the rearrangement of unchanging elements, seeds or atoms.' },
  { name: 'Sophists', when: 'Fifth century BC', ids: ['protagoras', 'gorgias'], text: 'Paid teachers of argument, rhetoric and civic skill who made human institutions a subject of inquiry.' },
  { name: 'The Academy', when: 'From about 387 BC', ids: ['socrates', 'plato'], sites: ['academy'], text: 'Plato’s school at Athens, which lasted, with interruptions, for centuries.' },
  { name: 'The Lyceum', when: 'From 335 BC', ids: ['aristotle', 'theophrastus'], sites: ['lyceum'], text: 'Aristotle’s school, known for research on nature, history and constitutions.' },
  { name: 'Cynics and Cyrenaics', when: 'Fourth century BC', ids: ['antisthenes', 'diogenes-of-sinope', 'aristippus'], text: 'Two answers to Socrates: reject wealth and convention, or enjoy pleasure without being ruled by it.' },
  { name: 'Epicureans', when: 'From about 306 BC', ids: ['epicurus'], sites: ['garden-of-epicurus'], text: 'Met in a house and garden at Athens and taught that pleasure, rightly understood, is the good.' },
  { name: 'Stoics', when: 'From about 300 BC', ids: ['zeno-of-citium', 'chrysippus'], sites: ['stoa-poikile'], text: 'Taught in the Painted Stoa that virtue is enough for happiness and that nature is rational.' },
  { name: 'Sceptics', when: 'From about 300 BC', ids: ['pyrrho'], text: 'Practised suspension of judgement as the route to tranquillity; formalised in later centuries as Pyrrhonism.' },
];

const PORTRAIT_TRIO = ['socrates', 'plato', 'aristotle'];
const READING = ['republic', 'nicomachean-ethics'];

function dates(e) {
  return e ? entityDate(e) : '';
}

function portraitLabel(f) {
  const p = f.portrait;
  return `<span class="phil-portrait-kind is-${esc(p.kind)}">${esc(PORTRAIT_LABEL[p.kind])}</span>`;
}

function photoBox(e, className) {
  return `<span class="${className}" data-img-id="${esc(e.id)}">${icon('person', { size: 30 })}</span>`;
}

function featuredCard(f) {
  const e = db.get(f.id);
  if (!e) return '';
  return `
    <article class="phil-feature" style="--tint:${db.tintVar(e.tint)}">
      <a class="phil-feature-photo-link" href="${entityHref(e.id)}" aria-label="Open the entry for ${esc(e.name)}">
        ${photoBox(e, 'phil-feature-photo')}
      </a>
      <div class="phil-feature-body">
        <p class="eyebrow">${esc(f.school)} · ${esc(dates(e))}</p>
        <h3><a href="${entityHref(e.id)}">${esc(e.name)}</a></h3>
        <p class="phil-feature-idea">${esc(f.idea)}</p>
        <p class="phil-known"><span>How we know</span>${esc(f.known)}</p>
        <p class="phil-portrait-line">${portraitLabel(f)}${f.portrait.note ? `<small>${esc(f.portrait.note)}</small>` : ''}</p>
        <a class="phil-open" href="${entityHref(e.id)}">Open the evidence-led entry ${icon('arrowRight', { size: 13 })}</a>
      </div>
    </article>`;
}

function listCard(f) {
  const e = db.get(f.id);
  if (!e) return '';
  return `
    <article class="phil-card" data-group="${esc(f.group)}" style="--tint:${db.tintVar(e.tint)}">
      <a class="phil-card-head" href="${entityHref(e.id)}">
        ${photoBox(e, 'phil-card-photo')}
        <span class="phil-card-identity">
          <strong>${esc(e.name)}</strong>
          <small>${esc(dates(e))}</small>
          <em>${esc(f.school)}</em>
        </span>
      </a>
      <p class="phil-card-idea">${esc(f.idea)}</p>
      <p class="phil-known"><span>How we know</span>${esc(f.known)}</p>
      <p class="phil-portrait-line">${portraitLabel(f)}${f.portrait.note ? `<small>${esc(f.portrait.note)}</small>` : ''}</p>
    </article>`;
}

function questionCard(q) {
  const rows = q.answers.map(([id, label]) => {
    const e = db.get(id);
    if (!e) return '';
    return `<li><a href="${entityHref(e.id)}">${esc(e.name)}</a><span>${esc(label)}</span></li>`;
  }).join('');
  return `
    <article class="panel phil-question">
      <h3>${esc(q.q)}</h3>
      <p>${esc(q.lead)}</p>
      <ul>${rows}</ul>
    </article>`;
}

function schoolCard(s) {
  const members = s.ids.map(db.get).filter(Boolean);
  const places = (s.sites || []).map(db.get).filter(Boolean);
  return `
    <article class="panel phil-school">
      <p class="eyebrow">${esc(s.when)}</p>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.text)}</p>
      <div class="phil-school-links">${members.map((e) => entityPill(e)).join('')}${places.map((e) => entityPill(e, 'where they met')).join('')}</div>
    </article>`;
}

export async function renderPhilosophy() {
  document.title = 'Greek Philosophy — Ἑλληνικά';
  const root = el('div', { class: 'view philosophy-view' });
  const trio = PORTRAIT_TRIO.map(db.get).filter(Boolean);
  const reading = READING.map(db.get).filter(Boolean);
  const count = FIGURES.filter((f) => db.get(f.id)).length;

  root.innerHTML = `
    <div class="wrap">
      <header class="phil-intro">
        <div>
          <p class="eyebrow">Argument, evidence and the examined life</p>
          <h1>Greek philosophy</h1>
          <p class="lede">The Greeks did not invent thinking, but they made argument itself a public practice: give a reason, expect it to be tested, and change your mind if it fails. This page follows that habit from the first natural philosophers of Ionia to the schools of the Hellenistic world.</p>
        </div>
        <div class="phil-trio" aria-hidden="true">
          ${trio.map((e, i) => `<span class="phil-trio-photo is-${i}" data-img-id="${esc(e.id)}">${icon('person', { size: 34 })}</span>`).join('')}
        </div>
      </header>

      <div class="register-note phil-register">
        ${icon('info', { size: 18 })}
        <p><strong>Most of it survives second-hand.</strong> Almost nothing the early philosophers wrote is complete. Their ideas come to us as quotations and summaries in later authors, and their portraits, where they exist, are mostly Roman copies. Each card below says how we know, and what the picture really is.</p>
      </div>

      <nav class="myth-jump" aria-label="Philosophy sections">
        <a href="#/philosophy" data-phil-target="phil-why">Why it matters</a>
        <a href="#/philosophy" data-phil-target="phil-questions">Big questions</a>
        <a href="#/philosophy" data-phil-target="phil-key">Key figures</a>
        <a href="#/philosophy" data-phil-target="phil-schools">Schools</a>
        <a href="#/philosophy" data-phil-target="phil-all">All philosophers</a>
        <a href="#/philosophy" data-phil-target="phil-reading">Reading the evidence</a>
      </nav>

      <section id="phil-why" class="myth-section">
        ${sectionHead('Why it matters', 'What was new, and why it lasted.')}
        <div class="phil-why-text">
          <p>Before the sixth century BC, explanations of the world in Greece were mostly stories about gods. In the Ionian city of Miletus, Thales and his successors began to ask instead what things are made of and why they change, and to offer answers that others could challenge. That habit of giving reasons, and inviting refutation, is the real beginning.</p>
          <p>The tradition then moved inwards. Socrates turned from nature to how people should live; Plato and Aristotle built the first systematic accounts of knowledge, ethics, politics and the natural world; and after Alexander the Epicureans, Stoics and Cynics asked how a single person could live well in a larger and less certain world. Their questions, and many of their terms, are still the working vocabulary of philosophy, logic and science.</p>
        </div>
        <div class="myth-concept-grid">
          <article class="panel"><span>${icon('scales')}</span><h3>Argument over authority</h3><p>Claims were expected to be defended with reasons, and rival theories were criticised in public.</p></article>
          <article class="panel"><span>${icon('compass')}</span><h3>A knowable nature</h3><p>The world was treated as ordered and open to explanation without appeal to divine whim.</p></article>
          <article class="panel"><span>${icon('person')}</span><h3>The examined life</h3><p>Ethics became a subject of inquiry: what is a good life, and can it be taught?</p></article>
          <article class="panel"><span>${icon('museum')}</span><h3>Schools as institutions</h3><p>The Academy, Lyceum, Garden and Stoa gave ideas a place to persist beyond one teacher.</p></article>
        </div>
      </section>

      <section id="phil-questions" class="myth-section">
        ${sectionHead('The big questions', 'Greek philosophy is easiest to follow as a set of arguments. Here are five, with the main answers.')}
        <div class="phil-questions">${QUESTIONS.map(questionCard).join('')}</div>
      </section>

      <section id="phil-key" class="myth-section">
        ${sectionHead('Key figures', 'Six thinkers who between them mark the beginning, the summit and the after-life of the tradition.')}
        <div class="phil-features">${FEATURED.map((id) => featuredCard(FIGURES.find((f) => f.id === id))).join('')}</div>
      </section>

      <section id="phil-schools" class="myth-section">
        ${sectionHead('Schools and traditions', 'Roughly in order of appearance. Many thinkers did not belong to a school at all.')}
        <div class="phil-schools">${SCHOOLS.map(schoolCard).join('')}</div>
      </section>

      <section id="phil-all" class="myth-section">
        ${sectionHead('All philosophers', `The ${count} philosophers currently documented in Ἑλληνικά, in rough chronological order.`, `<a class="btn btn-sm" href="#/explore?type=person">Explore all people ${icon('arrowRight', { size: 14 })}</a>`)}
        <div class="phil-filters" role="group" aria-label="Filter philosophers">
          ${GROUPS.map(([key, label], i) => `<button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-phil-filter="${esc(key)}" aria-pressed="${i === 0}">${esc(label)}</button>`).join('')}
        </div>
        <div class="phil-grid">${[...FIGURES].sort((x, y) => (db.get(x.id)?.start ?? 0) - (db.get(y.id)?.start ?? 0)).map(listCard).join('')}</div>
      </section>

      <section id="phil-reading" class="myth-section">
        ${sectionHead('Reading the evidence', 'Three cautions that apply to almost every name on this page.')}
        <div class="myth-reading-grid">
          <article class="myth-block is-archaeo"><h3>${icon('source')} Fragments and testimony</h3><p>For the Presocratics we have quotations and paraphrases, often centuries later and shaped by the later writer’s own view. Aristotle and Theophrastus are the earliest surveyors; Diogenes Laertius, writing around AD 200, is the main collector of biography and anecdote.</p></article>
          <article class="myth-block is-history"><h3>${icon('person')} The Socratic problem</h3><p>Socrates wrote nothing. Plato, Xenophon and Aristophanes portray him differently, so any account of his own views rests on choosing among them.</p></article>
          <article class="myth-block is-myth"><h3>${icon('info')} Portraits</h3><p>Most images of Greek philosophers are Roman copies made centuries after the sitter’s death, and some are imaginary. Where nothing securely identified survives, the card shows no likeness.</p></article>
        </div>
        <div class="myth-source-row">
          <div><p class="eyebrow">Begin with the works themselves</p><h3>Plato and Aristotle</h3><p>Plato’s dialogues are the best entrance to Socratic philosophy, and Aristotle’s ethics is the classic account of how to live well.</p></div>
          <div class="myth-source-actions">${reading.map((e) => `<a class="btn" href="${entityHref(e.id)}">${esc(e.name)}</a>`).join('')}<a class="btn" href="#/sources">All sources</a></div>
        </div>
      </section>
    </div>`;

  root.__mount = () => {
    root.querySelectorAll('[data-phil-target]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        root.querySelector(`#${link.dataset.philTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    const buttons = [...root.querySelectorAll('[data-phil-filter]')];
    const cards = [...root.querySelectorAll('.phil-card')];
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const key = btn.dataset.philFilter;
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      cards.forEach((c) => { c.hidden = key !== 'all' && c.dataset.group !== key; });
    }));
  };
  return root;
}
