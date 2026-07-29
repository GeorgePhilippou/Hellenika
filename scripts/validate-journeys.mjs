import assert from 'node:assert/strict';
import * as db from '../js/db.js';
import { territories } from '../data/geo.js';
import {
  odysseyJourney, alexanderJourney, alexanderFoundations, alexanderTerritoryStages,
} from '../data/journeys.js';

function validateStops(stops, label, requiredFields) {
  const keys = new Set();
  stops.forEach((stop, index) => {
    assert.equal(stop.order, index + 1, `${label} stop order must be continuous`);
    assert.ok(db.get(stop.id), `${label} stop references missing entity: ${stop.id}`);
    const key = stop.key || stop.id;
    assert.ok(!keys.has(key), `${label} stop key must be unique: ${key}`);
    keys.add(key);
    for (const field of requiredFields) {
      assert.ok(stop[field], `${label} stop ${key} is missing ${field}`);
    }
  });
}

validateStops(odysseyJourney, 'Odyssey', ['label', 'note', 'connection']);
validateStops(alexanderJourney, 'Alexander', ['key', 'label', 'year', 'note', 'connection', 'control']);

const territoryIds = new Set(territories.map((territory) => territory.id));
const stagedIds = new Set();
let previousReveal = 0;
for (const stage of alexanderTerritoryStages) {
  assert.ok(territoryIds.has(stage.id), `Alexander stage references missing territory: ${stage.id}`);
  assert.ok(!stagedIds.has(stage.id), `Alexander territory stage is duplicated: ${stage.id}`);
  assert.ok(stage.revealFrom < stage.revealAt, `${stage.id} must reveal across a positive interval`);
  assert.ok(stage.revealAt >= previousReveal, 'Alexander territory stages must reveal chronologically');
  assert.ok(stage.stageLabel && stage.labelAt, `${stage.id} needs a visible region label`);
  stagedIds.add(stage.id);
  previousReveal = stage.revealAt;
}

assert.equal(alexanderTerritoryStages.at(-1).revealAt, 10, 'The Indus stage must finish at Hydaspes');

const foundationIds = new Set();
let previousFoundationReveal = 0;
for (const foundation of alexanderFoundations) {
  assert.ok(foundation.id && !foundationIds.has(foundation.id), `Duplicate Alexander foundation: ${foundation.id}`);
  assert.ok(foundation.name && foundation.shortLabel, `${foundation.id} needs full and map labels`);
  assert.ok(
    Array.isArray(foundation.coords)
      && foundation.coords.length === 2
      && foundation.coords.every(Number.isFinite),
    `${foundation.id} needs valid coordinates`,
  );
  assert.ok(foundation.year >= -331 && foundation.year <= -325, `${foundation.id} has an invalid campaign date`);
  assert.ok(
    ['attested', 'attributed', 'disputed'].includes(foundation.status),
    `${foundation.id} has an invalid certainty status`,
  );
  assert.ok(foundation.revealFrom < foundation.revealAt, `${foundation.id} must fade in over a positive interval`);
  assert.ok(
    foundation.revealAt >= previousFoundationReveal,
    'Alexander foundations must reveal in campaign order',
  );
  assert.ok(foundation.note, `${foundation.id} needs an explanatory note`);
  foundationIds.add(foundation.id);
  previousFoundationReveal = foundation.revealAt;
}

console.log(
  `Journey validation passed: ${odysseyJourney.length} Odyssey stops, `
  + `${alexanderJourney.length} Alexander stages, `
  + `${alexanderTerritoryStages.length} cumulative control regions, `
  + `${alexanderFoundations.length} progressive foundations.`,
);
