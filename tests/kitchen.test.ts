import test from 'node:test';
import assert from 'node:assert/strict';
import { Kitchen } from '../src/server/kitchen.js';
import { WASH_MS, kitchenPhase, kitchenAction } from '../src/shared/kitchen.js';

test('the shared dishwasher completes a load, wash, and unload cycle', () => {
  const kitchen = new Kitchen();
  const act = (now: number) => {
    const state = kitchen.view(now);
    return kitchen.act(kitchenAction(state, now)!, state.revision, now);
  };
  assert.equal(act(1), true); // open the dirty dishes
  assert.equal(kitchen.view(1).doorOpen, true);
  assert.equal(act(2), true); // start the wash
  assert.equal(kitchen.view(2).doorOpen, false);
  assert.equal(kitchenPhase(kitchen.view(2), WASH_MS + 1), 'washing');
  assert.equal(kitchenPhase(kitchen.view(2), WASH_MS + 2), 'clean');
  assert.equal(kitchen.view(WASH_MS + 2).phase, 'clean'); // late arrivals see the same finished load
  assert.equal(act(WASH_MS + 3), true); // open clean dishes
  assert.equal(act(WASH_MS + 4), true); // put them away
  assert.equal(kitchen.view(WASH_MS + 4).phase, 'empty');
  assert.equal(act(WASH_MS + 5), true); // load the next round of mugs
  assert.equal(kitchen.view(WASH_MS + 5).phase, 'dirty');
});

test('the cycle cannot be opened, restarted, unloaded, or sped up while washing', () => {
  const kitchen = new Kitchen();
  kitchen.act('open', 0, 10);
  kitchen.act('wash', 1, 20);
  const washing = kitchen.view(21);
  for (const action of ['open', 'wash', 'unload', 'load', 'surprise']) {
    assert.equal(kitchen.act(action, washing.revision, 25), false);
    assert.deepEqual(kitchen.view(21), washing);
  }
  assert.equal(kitchenAction(washing, 21), null);
});

test('two people pressing E at once only perform one state transition', () => {
  const kitchen = new Kitchen();
  assert.equal(kitchen.act('open', 0, 1), true);
  assert.equal(kitchen.act('open', 0, 2), false);
  assert.equal(kitchen.act('wash', 0, 2), false);
  assert.equal(kitchen.view(2).revision, 1);
  assert.equal(kitchen.act('wash', 1, 3), true);
  assert.equal(kitchen.act('wash', 1, 4), false);
  assert.equal(kitchen.view(4).cycleEndsAt, 3 + WASH_MS);
});

test('floor dishwasher instances and snapshots are isolated', () => {
  const first = new Kitchen();
  const second = new Kitchen();
  first.act('open', 0, 1);
  const snapshot = first.view(1);
  snapshot.doorOpen = false;
  assert.equal(first.view(1).doorOpen, true);
  assert.equal(second.view(1).doorOpen, false);
  assert.equal(first.act('unload', 1, 2), false);
  assert.equal(first.act('load', 1, 2), false);
});
