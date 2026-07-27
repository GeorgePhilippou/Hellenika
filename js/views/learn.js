/* ============================================================
   Hellenika — Learning mode
   Hand-written quizzes plus game modes generated from the live
   entity graph, so the question pool grows with the dataset.
   ============================================================ */

import { el, $, $$, esc, fmtYear, clamp } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { quizzes, gameModes } from '../../data/quizzes.js';
import { periods, primaryPeriodAt } from '../../data/periods.js';
import { TIME_MIN, TIME_MAX } from '../store.js';
import { entityHref, go } from '../router.js';
import { sectionHead, entityDate, emptyState, backLink } from '../components/ui.js';

/* ============================================================
   Index
   ============================================================ */
export async function renderLearn() {
  const root = el('div', { class: 'view' });
  const progress = store.get('progress');

  root.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Learning mode</p>
          <h1>Test yourself</h1>
          <p class="sub">Every answer comes with an explanation and a link to the evidence behind it.</p>
        </div>
      </div>

      ${sectionHead('Quizzes', 'Written question sets with explanations.')}
      <div class="grid grid-auto" style="margin-bottom:var(--s-12)">
        ${quizzes.map((q) => {
          const p = progress[q.id];
          return `
            <a class="card ecard" href="#/learn/quiz/${q.id}" style="--tint:var(--p-${q.tint})">
              <div class="ecard-glyph">${icon('target', { size: 34 })}</div>
              <div class="ecard-body">
                <div class="ecard-title">${esc(q.name)}</div>
                <div class="ecard-meta">
                  <span class="chip">${q.questions.length} questions</span>
                  <span class="chip">${esc(q.difficulty)}</span>
                </div>
                <p class="ecard-sum">${esc(q.summary)}</p>
                ${p ? `<p class="xs" style="color:var(--c-established);font-weight:600">
                  Best ${p.best}/${p.total} · ${p.attempts} attempt${p.attempts === 1 ? '' : 's'}</p>` : ''}
              </div>
            </a>`;
        }).join('')}
      </div>

      ${sectionHead('Games', 'Generated fresh from the dataset every time you play.')}
      <div class="grid grid-auto">
        ${gameModes.map((g) => `
          <a class="card ecard" href="#/learn/game/${g.id}" style="--tint:var(--p-${g.tint})">
            <div class="ecard-glyph">${icon(g.icon, { size: 34 })}</div>
            <div class="ecard-body">
              <div class="ecard-title">${esc(g.name)}</div>
              <p class="ecard-sum">${esc(g.summary)}</p>
            </div>
          </a>`).join('')}
      </div>
    </div>`;

  return root;
}

/* ============================================================
   Written quiz
   ============================================================ */
export async function renderQuiz(params) {
  const quiz = quizzes.find((q) => q.id === params.id);
  if (!quiz) {
    const missing = el('div', { class: 'wrap view' });
    missing.innerHTML = emptyState('No such quiz.');
    return missing;
  }

  document.title = `${quiz.name} — Hellenika`;
  const root = el('div', { class: 'view' });
  root.innerHTML = `
    <div class="wrap">
      ${backLink('#/learn', 'Learning mode')}
      <div class="quiz-shell" style="margin-top:var(--s-6);--tint:var(--p-${quiz.tint})">
        <p class="eyebrow">${esc(quiz.difficulty)}</p>
        <h1 style="font-size:1.6rem;margin-block:var(--s-2) var(--s-6)">${esc(quiz.name)}</h1>
        <div class="quiz-progress" id="qp">
          ${quiz.questions.map(() => '<i></i>').join('')}
        </div>
        <div id="quiz-body"></div>
      </div>
    </div>`;

  root.__mount = () => runQuiz(root, quiz);
  return root;
}

function runQuiz(root, quiz) {
  const body = $('#quiz-body', root);
  const pips = $$('#qp i', root);
  let i = 0, score = 0;
  const marks = [];

  const paintPips = () => pips.forEach((p, n) => {
    p.className = marks[n] === true ? 'done' : marks[n] === false ? 'wrong' : n === i ? 'current' : '';
  });

  function question() {
    const q = quiz.questions[i];
    paintPips();
    body.innerHTML = `
      <p class="small muted">Question ${i + 1} of ${quiz.questions.length}</p>
      <h2 class="quiz-q">${esc(q.q)}</h2>
      <div class="quiz-options">
        ${q.options.map((o, n) => `
          <button class="quiz-option" data-n="${n}">
            <span class="k">${String.fromCharCode(65 + n)}</span>
            <span>${esc(o)}</span>
          </button>`).join('')}
      </div>
      <div id="quiz-after"></div>`;

    $$('.quiz-option', body).forEach((btn) => {
      btn.addEventListener('click', () => answer(Number(btn.dataset.n)));
    });
  }

  function answer(chosen) {
    const q = quiz.questions[i];
    const correct = chosen === q.answer;
    marks[i] = correct;
    if (correct) score++;

    $$('.quiz-option', body).forEach((btn, n) => {
      btn.disabled = true;
      if (n === q.answer) btn.classList.add('correct');
      else if (n === chosen) btn.classList.add('wrong');
    });
    paintPips();

    const link = q.link && db.get(q.link);
    $('#quiz-after', body).innerHTML = `
      <div class="quiz-explain">
        <p><strong>${correct ? 'Correct.' : 'Not quite.'}</strong> ${esc(q.explain)}</p>
        ${link ? `<p style="margin-top:var(--s-3)">
          <a class="btn btn-sm" href="${entityHref(link.id)}">
            Read more: ${esc(link.name)} ${icon('arrowRight', { size: 14 })}</a></p>` : ''}
      </div>
      <div class="row" style="margin-top:var(--s-6);justify-content:flex-end">
        <button class="btn btn-primary" id="quiz-next">
          ${i + 1 < quiz.questions.length ? 'Next question' : 'See results'}
          ${icon('arrowRight', { size: 15 })}
        </button>
      </div>`;

    $('#quiz-next', body).addEventListener('click', () => {
      i++;
      if (i < quiz.questions.length) question();
      else finish();
    });
  }

  function finish() {
    store.recordScore(quiz.id, score, quiz.questions.length);
    const pct = Math.round((score / quiz.questions.length) * 100);
    const C = 2 * Math.PI * 52;
    paintPips();

    body.innerHTML = `
      <div style="text-align:center;padding-block:var(--s-8)">
        <div class="score-ring" style="position:relative">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle class="bg" cx="65" cy="65" r="52"></circle>
            <circle class="fg" cx="65" cy="65" r="52"
                    stroke-dasharray="${C}" stroke-dashoffset="${C}"></circle>
          </svg>
          <span class="n">${score}/${quiz.questions.length}</span>
        </div>
        <h2 style="margin-bottom:var(--s-2)">${verdict(pct)}</h2>
        <p class="small muted" style="margin-bottom:var(--s-8)">
          ${pct}% on ${esc(quiz.name)}.
        </p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" id="quiz-again">${icon('reset', { size: 15 })} Try again</button>
          <a class="btn" href="#/learn">More quizzes</a>
        </div>
      </div>`;

    requestAnimationFrame(() => {
      const fg = $('.score-ring .fg', body);
      if (fg) fg.style.strokeDashoffset = String(C * (1 - score / quiz.questions.length));
    });

    $('#quiz-again', body).addEventListener('click', () => {
      i = 0; score = 0; marks.length = 0; question();
    });
  }

  question();
}

const verdict = (pct) =>
  pct === 100 ? 'Every one.' :
  pct >= 80 ? 'Strong.' :
  pct >= 60 ? 'Solid ground.' :
  pct >= 40 ? 'Worth another pass.' : 'Plenty left to discover.';

/* ============================================================
   Generated games
   ============================================================ */
export async function renderGame(params) {
  const mode = gameModes.find((g) => g.id === params.id);
  if (!mode) {
    const missing = el('div', { class: 'wrap view' });
    missing.innerHTML = emptyState('No such game.');
    return missing;
  }

  document.title = `${mode.name} — Hellenika`;
  const root = el('div', { class: 'view' });
  root.innerHTML = `
    <div class="wrap">
      ${backLink('#/learn', 'Learning mode')}
      <div class="quiz-shell" style="margin-top:var(--s-6);--tint:var(--p-${mode.tint})">
        <p class="eyebrow">Game</p>
        <h1 style="font-size:1.6rem;margin-block:var(--s-2) var(--s-3)">${esc(mode.name)}</h1>
        <p class="small muted" style="margin-bottom:var(--s-8)">${esc(mode.summary)}</p>
        <div id="game-body"></div>
      </div>
    </div>`;

  root.__mount = () => {
    const body = $('#game-body', root);
    const runners = {
      'timeline-placement': gameTimeline,
      'contemporary': gameContemporary,
      'identify-artefact': gameIdentify('artefact'),
      'identify-period': gameIdentifyPeriod,
      'flashcards': gameFlashcards,
      'map-placement': gameMapPlacement,
    };
    (runners[mode.kind] || (() => { body.innerHTML = emptyState('Not available yet.'); }))(body);
  };

  return root;
}

/* ---------- Helpers ---------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const datedPool = () => db.ALL.filter((e) => e.start != null && !e.modern && e.summary);

function scoreLine(state) {
  return `<p class="small muted" style="text-align:center;margin-top:var(--s-6)">
    Score ${state.right} / ${state.asked}</p>`;
}

/* ---------- Where on the timeline? ---------- */
function gameTimeline(body) {
  const state = { asked: 0, right: 0 };

  function round() {
    const e = pick(datedPool());
    const truth = e.start;
    state.asked++;

    body.innerHTML = `
      <div class="panel" style="text-align:center;margin-bottom:var(--s-6)">
        <span class="chip" style="--tint:${db.tintVar(e.tint)}"><i class="chip-dot"></i>${esc(e.typeLabel)}</span>
        <h2 style="font-size:1.4rem;margin-block:var(--s-3) var(--s-2)">${esc(e.name)}</h2>
        <p class="small" style="color:var(--text-2);max-width:52ch;margin-inline:auto">${esc(e.summary)}</p>
      </div>
      <p class="small muted" style="text-align:center">Click the track where you think this belongs.</p>
      <div class="place-track" id="track">
        ${periods.map((p) => {
          const l = ((p.start - TIME_MIN) / (TIME_MAX - TIME_MIN)) * 100;
          const w = ((p.end - p.start) / (TIME_MAX - TIME_MIN)) * 100;
          return `<i class="band" style="left:${l}%;width:${w}%;background:var(--p-${p.tint})"></i>`;
        }).join('')}
        <div class="axis"><span>3200 BC</span><span>1600 BC</span><span>30 BC</span></div>
      </div>
      <div id="result"></div>`;

    const track = $('#track', body);
    track.addEventListener('click', (ev) => {
      const rect = track.getBoundingClientRect();
      const t = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const guess = Math.round(TIME_MIN + t * (TIME_MAX - TIME_MIN));
      reveal(e, guess, truth, track);
    }, { once: true });
  }

  function reveal(e, guess, truth, track) {
    const posOf = (y) => ((y - TIME_MIN) / (TIME_MAX - TIME_MIN)) * 100;
    const off = Math.abs(guess - truth);
    const good = off <= 150;
    if (good) state.right++;

    track.insertAdjacentHTML('beforeend', `
      <i class="guess" style="left:${posOf(guess)}%"></i>
      <i class="truth" data-label="${esc(fmtYear(truth))}" style="left:${posOf(truth)}%"></i>`);
    track.style.cursor = 'default';

    $('#result', body).innerHTML = `
      <div class="quiz-explain">
        <p><strong>${good ? 'Close.' : 'Off by a way.'}</strong>
        You guessed ${esc(fmtYear(guess))}; the answer is ${esc(fmtYear(truth))} —
        ${off} year${off === 1 ? '' : 's'} out.
        ${primaryPeriodAt(truth) ? `That places it in the ${esc(primaryPeriodAt(truth).name)}.` : ''}</p>
        <p style="margin-top:var(--s-3)">
          <a class="btn btn-sm" href="${entityHref(e.id)}">Read about ${esc(e.name)} ${icon('arrowRight', { size: 14 })}</a>
        </p>
      </div>
      ${scoreLine(state)}
      <div class="row" style="justify-content:center;margin-top:var(--s-5)">
        <button class="btn btn-primary" id="next">Next ${icon('arrowRight', { size: 15 })}</button>
      </div>`;

    $('#next', body).addEventListener('click', round);
  }

  round();
}

/* ---------- What existed at the same time? ---------- */
function gameContemporary(body) {
  const state = { asked: 0, right: 0 };
  const pool = datedPool().filter((e) => e.end != null);

  function overlaps(a, b) {
    const ae = a.end ?? a.start, be = b.end ?? b.start;
    return a.start <= be && b.start <= ae;
  }

  function round() {
    let subject, yes, no, guard = 0;
    do {
      subject = pick(pool);
      yes = pool.find((x) => x.id !== subject.id && overlaps(subject, x) && x.type !== subject.type);
      no = pool.find((x) => !overlaps(subject, x) && Math.abs((x.start ?? 0) - subject.start) > 400);
    } while ((!yes || !no) && guard++ < 60);

    if (!yes || !no) { body.innerHTML = emptyState('Could not build a question.'); return; }

    state.asked++;
    const options = Math.random() < 0.5 ? [yes, no] : [no, yes];

    body.innerHTML = `
      <div class="panel" style="text-align:center;margin-bottom:var(--s-6)">
        <p class="eyebrow">Which of these existed at the same time as</p>
        <h2 style="font-size:1.4rem;margin-block:var(--s-2)">${esc(subject.name)}</h2>
        <p class="small num muted">${esc(entityDate(subject))}</p>
      </div>
      <div class="quiz-options">
        ${options.map((o, n) => `
          <button class="quiz-option" data-n="${n}">
            <span class="k">${String.fromCharCode(65 + n)}</span>
            <span><strong>${esc(o.name)}</strong><br>
              <span class="xs muted">${esc(o.typeLabel)}</span></span>
          </button>`).join('')}
      </div>
      <div id="result"></div>`;

    $$('.quiz-option', body).forEach((btn, n) => btn.addEventListener('click', () => {
      const chosen = options[n];
      const correct = chosen.id === yes.id;
      if (correct) state.right++;
      $$('.quiz-option', body).forEach((b2, m) => {
        b2.disabled = true;
        if (options[m].id === yes.id) b2.classList.add('correct');
        else if (m === n) b2.classList.add('wrong');
      });
      $('#result', body).innerHTML = `
        <div class="quiz-explain">
          <p><strong>${correct ? 'Correct.' : 'Not that one.'}</strong>
          ${esc(yes.name)} (${esc(entityDate(yes))}) overlaps with ${esc(subject.name)}.
          ${esc(no.name)} (${esc(entityDate(no))}) does not.</p>
        </div>
        ${scoreLine(state)}
        <div class="row" style="justify-content:center;margin-top:var(--s-5)">
          <button class="btn btn-primary" id="next">Next ${icon('arrowRight', { size: 15 })}</button>
        </div>`;
      $('#next', body).addEventListener('click', round);
    }));
  }

  round();
}

/* ---------- Guess the artefact ---------- */
function gameIdentify(type) {
  return function (body) {
    const state = { asked: 0, right: 0 };
    const pool = db.ofType(type).filter((e) => e.summary);

    function round() {
      const answer = pick(pool);
      const others = db.randomN(3, (e) => e.type === type && e.id !== answer.id);
      const options = [answer, ...others].sort(() => Math.random() - 0.5);
      state.asked++;

      const clues = [
        answer.material && `Material: ${answer.material}`,
        answer.region && `Region: ${answer.region}`,
        answer.start != null && `Date: ${entityDate(answer)}`,
        answer.museum && `Now held: ${answer.museum}`,
      ].filter(Boolean);

      body.innerHTML = `
        <div class="panel" style="margin-bottom:var(--s-6)">
          <p class="eyebrow" style="margin-bottom:var(--s-3)">Identify this object</p>
          <p style="color:var(--text-2)">${esc(answer.summary)}</p>
          <div class="row-wrap" style="margin-top:var(--s-4)">
            ${clues.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
          </div>
        </div>
        <div class="quiz-options">
          ${options.map((o, n) => `
            <button class="quiz-option" data-n="${n}">
              <span class="k">${String.fromCharCode(65 + n)}</span><span>${esc(o.name)}</span>
            </button>`).join('')}
        </div>
        <div id="result"></div>`;

      $$('.quiz-option', body).forEach((btn, n) => btn.addEventListener('click', () => {
        const correct = options[n].id === answer.id;
        if (correct) state.right++;
        $$('.quiz-option', body).forEach((b2, m) => {
          b2.disabled = true;
          if (options[m].id === answer.id) b2.classList.add('correct');
          else if (m === n) b2.classList.add('wrong');
        });
        $('#result', body).innerHTML = `
          <div class="quiz-explain">
            <p><strong>${correct ? 'Correct.' : 'No — it is the ' + esc(answer.name) + '.'}</strong>
            ${esc(answer.significance || answer.summary)}</p>
            <p style="margin-top:var(--s-3)">
              <a class="btn btn-sm" href="${entityHref(answer.id)}">Open ${esc(answer.name)} ${icon('arrowRight', { size: 14 })}</a>
            </p>
          </div>
          ${scoreLine(state)}
          <div class="row" style="justify-content:center;margin-top:var(--s-5)">
            <button class="btn btn-primary" id="next">Next ${icon('arrowRight', { size: 15 })}</button>
          </div>`;
        $('#next', body).addEventListener('click', round);
      }));
    }

    round();
  };
}

/* ---------- Guess the civilisation ---------- */
function gameIdentifyPeriod(body) {
  const state = { asked: 0, right: 0 };

  function round() {
    const answer = pick(periods);
    const options = [answer, ...periods.filter((p) => p.id !== answer.id).sort(() => Math.random() - 0.5).slice(0, 3)]
      .sort(() => Math.random() - 0.5);
    state.asked++;

    const clueEntities = [...answer.people, ...answer.sites, ...answer.artefacts]
      .map(db.get).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 3);

    body.innerHTML = `
      <div class="panel" style="margin-bottom:var(--s-6)">
        <p class="eyebrow" style="margin-bottom:var(--s-3)">Which period is this?</p>
        <ul style="margin:0;padding-left:1.2em;color:var(--text-2)">
          ${clueEntities.map((c) => `<li>${esc(c.name)} — ${esc(c.summary.slice(0, 90))}…</li>`).join('')}
        </ul>
      </div>
      <div class="quiz-options">
        ${options.map((o, n) => `
          <button class="quiz-option" data-n="${n}">
            <span class="k">${String.fromCharCode(65 + n)}</span><span>${esc(o.name)}</span>
          </button>`).join('')}
      </div>
      <div id="result"></div>`;

    $$('.quiz-option', body).forEach((btn, n) => btn.addEventListener('click', () => {
      const correct = options[n].id === answer.id;
      if (correct) state.right++;
      $$('.quiz-option', body).forEach((b2, m) => {
        b2.disabled = true;
        if (options[m].id === answer.id) b2.classList.add('correct');
        else if (m === n) b2.classList.add('wrong');
      });
      $('#result', body).innerHTML = `
        <div class="quiz-explain">
          <p><strong>${correct ? 'Correct.' : 'It is the ' + esc(answer.name) + '.'}</strong>
          ${esc(fmtYear(answer.start))} – ${esc(fmtYear(answer.end))}. ${esc(answer.summary)}</p>
          <p style="margin-top:var(--s-3)">
            <a class="btn btn-sm" href="#/timeline/${answer.id}">Open the period ${icon('arrowRight', { size: 14 })}</a></p>
        </div>
        ${scoreLine(state)}
        <div class="row" style="justify-content:center;margin-top:var(--s-5)">
          <button class="btn btn-primary" id="next">Next ${icon('arrowRight', { size: 15 })}</button>
        </div>`;
      $('#next', body).addEventListener('click', round);
    }));
  }

  round();
}

/* ---------- Flashcards ---------- */
function gameFlashcards(body) {
  let deck = db.randomN(30, (e) => e.summary && !e.modern);
  let i = 0, known = 0;

  function card() {
    if (i >= deck.length) {
      body.innerHTML = `
        <div style="text-align:center;padding-block:var(--s-10)">
          <h2 style="margin-bottom:var(--s-3)">Deck complete</h2>
          <p class="small muted" style="margin-bottom:var(--s-6)">You knew ${known} of ${deck.length}.</p>
          <button class="btn btn-primary" id="again">${icon('reset', { size: 15 })} New deck</button>
        </div>`;
      $('#again', body).addEventListener('click', () => {
        deck = db.randomN(30, (e) => e.summary && !e.modern);
        i = 0; known = 0; card();
      });
      return;
    }

    const e = deck[i];
    body.innerHTML = `
      <p class="small muted" style="text-align:center;margin-bottom:var(--s-4)">
        Card ${i + 1} of ${deck.length}</p>
      <div class="flashcard" id="fc">
        <div class="flashcard-inner">
          <div class="flashcard-face" style="--tint:${db.tintVar(e.tint)}">
            <span class="chip" style="--tint:${db.tintVar(e.tint)}"><i class="chip-dot"></i>${esc(e.typeLabel)}</span>
            <h3>${esc(e.name)}</h3>
            <p class="xs muted">Click to flip</p>
          </div>
          <div class="flashcard-face back" style="--tint:${db.tintVar(e.tint)}">
            <p class="num small muted">${esc(entityDate(e))}</p>
            <p>${esc(e.summary)}</p>
            <a class="btn btn-sm" href="${entityHref(e.id)}">Full entry</a>
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:center;margin-top:var(--s-6)">
        <button class="btn" id="fc-no">Didn't know</button>
        <button class="btn btn-primary" id="fc-yes">${icon('check', { size: 15 })} Knew it</button>
      </div>`;

    const fc = $('#fc', body);
    fc.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) return;
      fc.classList.toggle('flipped');
    });
    $('#fc-yes', body).addEventListener('click', () => { known++; i++; card(); });
    $('#fc-no', body).addEventListener('click', () => { i++; card(); });
  }

  card();
}

/* ---------- Where in the Greek world? ---------- */
function gameMapPlacement(body) {
  const state = { asked: 0, right: 0 };
  const pool = db.ALL.filter((e) => e.coords && (e.type === 'city' || e.type === 'site'));

  function round() {
    const answer = pick(pool);
    const others = db.randomN(3, (e) => e.coords && e.id !== answer.id &&
      (e.type === 'city' || e.type === 'site'));
    const options = [answer, ...others].sort(() => Math.random() - 0.5);
    state.asked++;

    body.innerHTML = `
      <div class="panel" style="margin-bottom:var(--s-6)">
        <p class="eyebrow" style="margin-bottom:var(--s-3)">Which place is this?</p>
        <p style="color:var(--text-2)">${esc(answer.summary)}</p>
        <div class="row-wrap" style="margin-top:var(--s-4)">
          <span class="chip">${esc(answer.typeLabel)}</span>
          ${answer.start != null ? `<span class="chip num">${esc(entityDate(answer))}</span>` : ''}
        </div>
      </div>
      <div class="quiz-options">
        ${options.map((o, n) => `
          <button class="quiz-option" data-n="${n}">
            <span class="k">${String.fromCharCode(65 + n)}</span><span>${esc(o.name)}</span>
          </button>`).join('')}
      </div>
      <div id="result"></div>`;

    $$('.quiz-option', body).forEach((btn, n) => btn.addEventListener('click', () => {
      const correct = options[n].id === answer.id;
      if (correct) state.right++;
      $$('.quiz-option', body).forEach((b2, m) => {
        b2.disabled = true;
        if (options[m].id === answer.id) b2.classList.add('correct');
        else if (m === n) b2.classList.add('wrong');
      });
      $('#result', body).innerHTML = `
        <div class="quiz-explain">
          <p><strong>${correct ? 'Correct.' : 'It is ' + esc(answer.name) + '.'}</strong>
          ${esc(answer.region || '')} — ${esc(answer.significance || answer.summary)}</p>
          <p style="margin-top:var(--s-3)">
            <a class="btn btn-sm" href="#/map">See it on the map ${icon('arrowRight', { size: 14 })}</a>
            <a class="btn btn-sm" href="${entityHref(answer.id)}">Open entry</a></p>
        </div>
        ${scoreLine(state)}
        <div class="row" style="justify-content:center;margin-top:var(--s-5)">
          <button class="btn btn-primary" id="next">Next ${icon('arrowRight', { size: 15 })}</button>
        </div>`;
      $('#next', body).addEventListener('click', round);
    }));
  }

  round();
}
