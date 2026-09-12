import assert from 'node:assert/strict';
import * as db from '../js/db.js';
import { entityDate, miniTimeline } from '../js/components/ui.js';
import { datedPool } from '../js/views/learn.js';

// A valid target ID alone does not establish a meaningful relationship.
const kinship = /^(father|mother|parent|son|daughter|child|wife|husband|spouse|brother|sister|sibling) of(?: \(.*\))?$|^married to$/;
for (const e of db.ALL) {
  for (const r of e.relations) {
    if (!kinship.test(r.rel)) continue;
    for (const endpoint of [e, db.get(r.id)]) {
      assert(['person', 'myth', 'deity'].includes(endpoint.type),
        `${e.id}: ${r.rel} ${r.id} has a non-personal endpoint`);
    }
  }
}

const hera = db.get('hera');
assert(hera.relations.some((r) => r.id === 'hephaestus' && r.rel === 'parent of'));
assert(hera.relations.some((r) => r.id === 'kronos' && r.rel === 'child of'));
assert(!hera.relations.some((r) => ['father of', 'son of'].includes(r.rel)));
assert(db.get('zeus').relations.some((r) => r.id === 'hephaestus' &&
  r.rel === 'parent of (Homeric tradition)'));
assert(db.get('oedipus').relations.some((r) => r.id === 'antigone' &&
  r.rel === 'family portrayed in'));
// A work can be linked as composed by Homer and attributed to Homer.
// An existing connection must not suppress a distinct qualified meaning.
const homerLinks = db.get('homer').relations.filter((r) => r.id === 'iliad');
assert(homerLinks.some((r) => r.rel === 'composed'));
assert(homerLinks.some((r) => r.rel === 'attributed work'));

assert(!entityDate(hera).includes('390'));
assert.equal(entityDate(db.get('oedipus')), 'Mythological tradition');
assert.equal(miniTimeline(hera, []), '');
assert(datedPool().length > 0);
assert(datedPool().every((e) => db.isHistorical(e) && e.start >= -3200 && e.end <= -30));
assert(db.entitiesAt(-500).every(db.isHistorical));
assert(db.search('Forms').slice(0, 5).some((e) => e.id === 'plato'));
assert(db.search('metics').length > 0);

assert(!db.get('plato').claims.some((c) => /operated continuously.*nine centuries/.test(c.text)));
assert(!db.get('death-of-cleopatra').claims.some((c) => /his own personal possession/.test(c.text)));
assert(db.get('socrates').body.includes('thirty minas'));
console.log('Study semantics passed: kinship, work/character separation, variants, dates, search and corrected claims.');
