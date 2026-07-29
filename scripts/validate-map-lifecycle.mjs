import assert from 'node:assert/strict';
import { createMap } from '../js/components/map-canvas.js';
import { createJourneyMap } from '../js/components/journey-map.js';

let nextFrame = 1;
const pendingFrames = new Map();

globalThis.requestAnimationFrame = (callback) => {
  const id = nextFrame++;
  pendingFrames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => pendingFrames.delete(id);
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};

class CanvasStub {
  constructor() {
    this.listeners = new Map();
    this.classList = { add() {}, remove() {} };
    this.style = {};
  }

  getContext() { return {}; }
  setAttribute() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }

  addEventListener(type, listener, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    options.signal?.addEventListener('abort', () => {
      this.listeners.get(type)?.delete(listener);
    }, { once: true });
  }

  listenerCount() {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
  }
}

function verifyLifecycle(factory, label) {
  const canvas = new CanvasStub();
  const first = factory(canvas);
  const firstCount = canvas.listenerCount();
  assert.ok(firstCount > 0, `${label} should register canvas listeners`);

  first.destroy();
  assert.equal(canvas.listenerCount(), 0, `${label} destroy() must remove every canvas listener`);

  const second = factory(canvas);
  assert.equal(
    canvas.listenerCount(),
    firstCount,
    `${label} remount must not accumulate listeners from the previous instance`,
  );

  second.destroy();
  assert.equal(canvas.listenerCount(), 0, `${label} final destroy() must leave a clean canvas`);
}

verifyLifecycle((canvas) => createJourneyMap(canvas), 'Journey map');
verifyLifecycle((canvas) => createMap(canvas), 'Historical map');

console.log('Map lifecycle validation passed: destroyed renderers leave no canvas listeners.');
