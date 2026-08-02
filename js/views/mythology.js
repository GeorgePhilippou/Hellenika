/* ============================================================
   Hellenika — Greek mythology overview
   A guided front door into the site's myth and deity records.
   The genealogy is deliberately identified as Hesiodic: Greek myth
   preserves variants, not a single canonical family tree.
   ============================================================ */

import { el, esc, truncate } from '../util.js';
import { icon, TYPE_ICON } from '../icons.js';
import * as db from '../db.js';
import { entityCard, entityPill, sectionHead } from '../components/ui.js';
import { entityHref } from '../router.js';

const FAMILY_LEVELS = [
  {
    label: 'Origins', note: 'The first beings and the structure of the cosmos',
    nodes: [
      ['Chaos', 'chaos', 'the first gap or state', 'Precedes Gaia and the ordered divine generations'],
      ['Gaia', 'gaia', 'earth', 'Mother of Uranus and, with him, the Titans'],
      ['Uranus', 'uranus', 'sky', 'Son and consort of Gaia; father of the Titans'],
    ],
  },
  {
    label: 'Titans', note: 'The generation overthrown by Zeus and his siblings',
    nodes: [
      ['Kronos', 'kronos', 'Titan kingship', 'Son of Gaia and Uranus; brother and consort of Rhea'],
      ['Rhea', 'rhea', 'divine motherhood', 'Daughter of Gaia and Uranus; mother of the six central siblings'],
    ],
  },
  {
    label: 'Children of Kronos and Rhea', note: 'The central divine siblings',
    nodes: [
      ['Hestia', 'hestia', 'hearth', 'Daughter of Kronos and Rhea; sister of Zeus'],
      ['Demeter', 'demeter', 'grain and agriculture', 'Daughter of Kronos and Rhea; mother of Persephone'],
      ['Hera', 'hera', 'marriage and queenship', 'Daughter of Kronos and Rhea; sister and wife of Zeus'],
      ['Hades', 'hades', 'the underworld', 'Son of Kronos and Rhea; husband of Persephone'],
      ['Poseidon', 'poseidon', 'sea and earthquakes', 'Son of Kronos and Rhea; brother of Zeus and Hades'],
      ['Zeus', 'zeus', 'sky and kingship', 'Son of Kronos and Rhea; father of many younger gods and heroes'],
    ],
  },
  {
    label: 'A younger divine generation', note: 'Children of Zeus and other Olympian powers',
    nodes: [
      ['Athena', 'athena', 'wisdom and civic defence', 'Daughter of Zeus and Metis; born from Zeus’ head'],
      ['Apollo', 'apollo', 'prophecy, music and healing', 'Son of Zeus and Leto; twin brother of Artemis'],
      ['Artemis', 'artemis', 'the hunt and transitions', 'Daughter of Zeus and Leto; twin sister of Apollo'],
      ['Persephone', 'persephone', 'underworld queen', 'Daughter of Zeus and Demeter; wife of Hades'],
      ['Dionysus', 'dionysus', 'wine and altered states', 'Son of Zeus and the mortal Semele'],
      ['Hermes', 'hermes', 'messenger and boundary-crosser', 'Son of Zeus and the nymph Maia'],
      ['Hephaestus', 'hephaestus', 'craft and fire', 'Son of Hera; his father varies between traditions'],
      ['Aphrodite', 'aphrodite', 'desire; ancestry varies', 'Sea-born in Hesiod; daughter of Zeus and Dione in Homer'],
    ],
  },
  {
    label: 'Heroes and semi-divine descendants', note: 'Selected later lineages—not a single chronological generation',
    nodes: [
      ['Perseus', 'perseus', 'Argive hero', 'Son of Zeus and the mortal Danae; ancestor of Heracles'],
      ['Heracles', 'heracles', 'hero who becomes a god', 'Son of Zeus and the mortal Alcmene'],
      ['Helen', 'helen-of-troy', 'heroine with divine ancestry', 'Daughter of Zeus and Leda in the dominant epic tradition'],
      ['Achilles', 'achilles', 'hero of the Iliad', 'Son of the mortal Peleus and the sea-nymph Thetis'],
      ['Asclepius', 'asclepius', 'heroic healer and god', 'Son of Apollo and the mortal Coronis'],
    ],
  },
];

const CYCLES = [
  {
    name: 'The Trojan War', icon: 'battle',
    summary: 'The judgement of Paris, the expedition to Troy, Achilles’ anger, the city’s fall and the difficult homecomings.',
    ids: ['helen-of-troy', 'agamemnon', 'achilles', 'odysseus', 'trojan-horse'],
  },
  {
    name: 'Crete and Theseus', icon: 'myth',
    summary: 'Minos, the labyrinth, the Minotaur and the Athenian hero who enters the Cretan story.',
    ids: ['minos', 'minotaur', 'theseus'],
  },
  {
    name: 'Heracles', icon: 'deity',
    summary: 'The labours, crimes, suffering and final transformation of Greece’s most widely travelled hero.',
    ids: ['heracles', 'heracles-sack-of-troy'],
  },
  {
    name: 'The House of Thebes', icon: 'scales',
    summary: 'Oedipus and a family trapped by prophecy, recognition, political conflict and inherited violence.',
    ids: ['oedipus'],
  },
  {
    name: 'Demeter and Persephone', icon: 'sparkle',
    summary: 'Abduction, grief, agricultural crisis and the mythic foundation of the Eleusinian Mysteries.',
    ids: ['demeter', 'persephone'],
  },
  {
    name: 'Perseus and the Gorgon', icon: 'myth',
    summary: 'A threatened child, divine equipment, Medusa’s severed head and the rescue of Andromeda.',
    ids: ['perseus', 'medusa'],
  },
  {
    name: 'The Argonauts', icon: 'map',
    summary: 'Jason’s voyage for the Golden Fleece and the indispensable, destructive alliance he forms with Medea.',
    ids: ['jason', 'medea-of-colchis', 'atalanta', 'heracles'],
  },
  {
    name: 'Prometheus and Pandora', icon: 'sparkle',
    summary: 'Sacrifice, stolen fire, divine punishment and Hesiod’s explanation for labour and suffering.',
    ids: ['prometheus', 'pandora'],
  },
];

const heroIds = ['heracles', 'theseus', 'perseus', 'jason', 'medea-of-colchis', 'atalanta', 'achilles', 'odysseus', 'helen-of-troy', 'agamemnon', 'oedipus', 'nestor'];
const monsterIds = ['medusa', 'minotaur', 'cerberus'];
const deityIds = ['gaia', 'uranus', 'kronos', 'rhea', 'zeus', 'hera', 'poseidon', 'demeter', 'hades', 'hestia', 'athena', 'apollo', 'artemis', 'aphrodite', 'hermes', 'hephaestus', 'dionysus', 'asclepius', 'nike'];

function familyNode([name, id, role, kin]) {
  const e = id && db.get(id);
  if (!e) return '';
  const story = truncate(e.myth || e.summary || '', 210);
  const context = truncate(e.religious || e.historicalBackground || e.archaeology || '', 220);
  return `
    <article class="myth-family-card" style="--tint:${db.tintVar(e.tint)}">
      <a class="myth-family-card-head" href="${entityHref(e.id)}">
        <span class="myth-family-photo" data-img-id="${esc(e.id)}">
          ${icon(TYPE_ICON[e.type] || 'myth', { size: 30 })}
        </span>
        <span class="myth-family-identity">
          <strong>${esc(name)}</strong>
          <small>${esc(e.subtype || e.typeLabel)}</small>
        </span>
      </a>
      <div class="myth-family-role">${esc(role)}</div>
      <p class="myth-family-kin"><span>Family</span>${esc(kin)}</p>
      <p class="myth-family-summary">${esc(e.summary)}</p>
      <details class="myth-family-more">
        <summary>Story &amp; historical context</summary>
        <div>
          <h4>In the stories</h4>
          <p>${esc(story)}</p>
          <h4>In Greek religion and history</h4>
          <p>${esc(context || 'This figure is known principally through literary and visual tradition rather than independent historical evidence.')}</p>
          <a href="${entityHref(e.id)}">Open the full evidence-led entry ${icon('arrowRight', { size: 13 })}</a>
        </div>
      </details>
    </article>`;
}

function cycleCard(cycle) {
  const entities = cycle.ids.map(db.get).filter(Boolean);
  return `
    <article class="panel myth-cycle">
      <div class="myth-cycle-icon">${icon(cycle.icon, { size: 24 })}</div>
      <div>
        <h3>${esc(cycle.name)}</h3>
        <p>${esc(cycle.summary)}</p>
        <div class="myth-cycle-links">
          ${entities.map((e) => entityPill(e)).join('')}
        </div>
      </div>
    </article>`;
}

export async function renderMythology() {
  document.title = 'Greek Mythology — Hellenika';
  const root = el('div', { class: 'view mythology-view' });
  const deities = deityIds.map(db.get).filter(Boolean);
  const heroes = heroIds.map(db.get).filter(Boolean);
  const monsters = monsterIds.map(db.get).filter(Boolean);

  root.innerHTML = `
    <div class="wrap">
      <header class="myth-intro">
        <div>
          <p class="eyebrow">Stories, worship and interpretation</p>
          <h1>Greek mythology</h1>
          <p class="lede">A guide to the gods, heroes, monsters and story cycles through which Greek communities explained the cosmos, negotiated identity and encountered the divine.</p>
        </div>
        <figure class="myth-intro-image">
          <a href="https://www.thebestviewpoints.com/2025/01/15/mount-olympus/" target="_blank" rel="noopener noreferrer">
            <img
              src="https://www.thebestviewpoints.com/wp-content/uploads/2023/05/DSC_9617-Panorama-photoshopped.jpg"
              alt="Mount Olympus beneath glowing sunset clouds"
              width="2048"
              height="1280"
              decoding="async"
            >
          </a>
          <figcaption>
            Mount Olympus at sunset
            <span aria-hidden="true">·</span>
            <a href="https://www.thebestviewpoints.com/2025/01/15/mount-olympus/" target="_blank" rel="noopener noreferrer">Photograph: Jarda Zaoral ↗</a>
          </figcaption>
        </figure>
      </header>

      <div class="register-note myth-register">
        ${icon('info', { size: 18 })}
        <p><strong>Myth is not a single canon.</strong> Stories changed between poets, cities, sanctuaries and periods. This section identifies major variants and keeps narrative tradition separate from evidence for historical people or events.</p>
      </div>

      <nav class="myth-jump" aria-label="Mythology sections">
        <a href="#/mythology" data-myth-target="myth-family">Family tree</a>
        <a href="#/mythology" data-myth-target="myth-gods">Gods</a>
        <a href="#/mythology" data-myth-target="myth-heroes">Heroes &amp; demigods</a>
        <a href="#/mythology" data-myth-target="myth-monsters">Monsters</a>
        <a href="#/mythology" data-myth-target="myth-cycles">Story cycles</a>
        <a href="#/mythology" data-myth-target="myth-reading">How to read myth</a>
      </nav>

      <section class="myth-foundations" aria-labelledby="myth-foundations-title">
        ${sectionHead('The four ideas to understand first', 'A map of the subject before the names and stories multiply.')}
        <div class="myth-concept-grid">
          <article class="panel"><span>${icon('graph')}</span><h3>Genealogy is structure</h3><p>Family relationships organise the cosmos and dramatise succession: primordial beings, Titans, then the Olympian order.</p></article>
          <article class="panel"><span>${icon('deity')}</span><h3>Myth is not cult</h3><p>A god’s behaviour in a poem may differ sharply from how worshippers approached that deity in ritual and civic life.</p></article>
          <article class="panel"><span>${icon('source')}</span><h3>Sources disagree</h3><p>Homer, Hesiod, hymns, tragedy, local traditions and later handbooks preserve different versions for different purposes.</p></article>
          <article class="panel"><span>${icon('scales')}</span><h3>Story is not history</h3><p>Real places and ancient objects can shape a myth without demonstrating that its characters or events existed.</p></article>
        </div>
      </section>

      <section id="myth-family" class="myth-section">
        ${sectionHead('The divine family', 'A simplified guide based principally on Hesiod’s Theogony. It is an orientation tool, not a claim that every Greek accepted one genealogy.')}
        <div class="myth-family" role="list" aria-label="Simplified Hesiodic divine genealogy">
          ${FAMILY_LEVELS.map((level, i) => `
            <div class="myth-family-level" role="listitem">
              <div class="myth-family-label"><span>${i + 1}</span><div><strong>${esc(level.label)}</strong><small>${esc(level.note)}</small></div></div>
              <div class="myth-family-nodes">${level.nodes.map(familyNode).join('')}</div>
            </div>`).join('')}
        </div>
        <p class="myth-variant-note"><strong>Why Aphrodite sits awkwardly in the tree:</strong> Hesiod makes her arise from the sea after the mutilation of Uranus; Homer calls her a daughter of Zeus and Dione. Both are ancient Greek traditions.</p>
      </section>

      <section id="myth-gods" class="myth-section">
        ${sectionHead('Gods and divine powers', 'The principal deities currently documented in Hellenika.', `<a class="btn btn-sm" href="#/explore?type=deity">View all deities ${icon('arrowRight', { size: 14 })}</a>`)}
        <div class="grid grid-auto">${deities.map((e) => entityCard(e)).join('')}</div>
      </section>

      <section id="myth-heroes" class="myth-section">
        ${sectionHead('Heroes and “demigods”', 'Mortals and semi-divine figures who stand between human and divine worlds.')}
        <div class="myth-definition panel">
          <div>${icon('myth', { size: 28 })}</div>
          <div><h3>What does “demigod” mean?</h3><p>It is useful shorthand, but Greek tradition did not apply one consistent biological category. Some heroes had a divine parent; others had two mortal parents, divine ancestry or exceptional favour. What unites them more reliably is heroic narrative and, for many, cult after death.</p></div>
        </div>
        <div class="grid grid-auto">${heroes.map((e) => entityCard(e)).join('')}</div>
      </section>

      <section id="myth-monsters" class="myth-section">
        ${sectionHead('Monsters and boundary beings', 'Figures that guard thresholds, disrupt categories and give heroic action something to confront.')}
        <div class="myth-definition panel">
          <div>${icon('myth', { size: 28 })}</div>
          <div><h3>More than obstacles</h3><p>Greek monsters combine human, animal and divine features. Their bodies make boundaries visible—between civilisation and wilderness, mortal and divine, life and death—and their stories often change sharply between sources.</p></div>
        </div>
        <div class="grid grid-auto">${monsters.map((e) => entityCard(e)).join('')}</div>
      </section>

      <section id="myth-cycles" class="myth-section">
        ${sectionHead('The major story cycles', 'Greek myths form connected families of stories rather than one continuous narrative.')}
        <div class="myth-cycles">${CYCLES.map(cycleCard).join('')}</div>
        <a class="myth-journey-banner" href="#/map/odyssey">
          <span>${icon('map', { size: 30 })}</span>
          <span><strong>Follow Odysseus’ journey</strong><small>Explore fourteen legendary stops on the interactive map.</small></span>
          ${icon('arrowRight', { size: 18 })}
        </a>
      </section>

      <section id="myth-reading" class="myth-section">
        ${sectionHead('How Hellenika reads mythology', 'Three layers that should not be collapsed into one.')}
        <div class="myth-reading-grid">
          <article class="myth-block is-myth"><h3>${icon('myth')} Narrative</h3><p>What the surviving story says, including alternative versions and the source in which each appears.</p></article>
          <article class="myth-block is-history"><h3>${icon('deity')} Religion</h3><p>How a deity or hero was worshipped: sanctuaries, festivals, dedications, ritual roles and local identities.</p></article>
          <article class="myth-block is-archaeo"><h3>${icon('evArchaeo')} Evidence</h3><p>What texts, inscriptions and archaeology can establish—and where proposed historical explanations remain speculative.</p></article>
        </div>
        <div class="myth-source-row">
          <div><p class="eyebrow">Begin with the ancient sources</p><h3>Hesiod, Homer and the Homeric Hymns</h3><p>The <em>Theogony</em> supplies the best-known divine succession; the <em>Iliad</em> and <em>Odyssey</em> organise the heroic world; the hymns preserve major narratives tied to particular gods and cults.</p></div>
          <div class="myth-source-actions"><a class="btn" href="#/e/theogony">Theogony</a><a class="btn" href="#/e/iliad">Iliad</a><a class="btn" href="#/e/odyssey">Odyssey</a><a class="btn" href="#/e/homeric-hymns">Homeric Hymns</a></div>
        </div>
      </section>
    </div>`;

  root.__mount = () => {
    root.querySelectorAll('[data-myth-target]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        root.querySelector(`#${link.dataset.mythTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };
  return root;
}
