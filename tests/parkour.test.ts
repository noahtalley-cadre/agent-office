import test from 'node:test';
import assert from 'node:assert/strict';
import { ParkourRace } from '../src/server/parkour.js';
import { Vector3 } from 'three';
import { PARKOUR_PADS, PARKOUR_PENALTY, PARKOUR_SAVE, onParkourPad, parkourPlatforms } from '../src/shared/parkour.js';
import { groundAt, stepTo } from '../src/client/player/collide.js';
import { FLOOR } from '../src/shared/layout.js';

const runner = { id: 'a', owner: 'account:a', name: 'Alex', color: '#45c9a4' };
const spot = (index: number) => ({ ...PARKOUR_PADS[index] });

test('a run starts on its pad and must land on each platform in order', () => {
  let now = 1000;
  const race = new ParkourRace(() => now);
  assert.equal(race.start(runner, { x: 0, y: 0, z: 0 }), false);
  assert.equal(race.start(runner, spot(0)), true);
  now += 1000;
  assert.equal(race.land(runner.id, 2, spot(2)), null, 'no skipping');
  assert.equal(race.land(runner.id, 1, { ...spot(1), y: 0 }), null, 'running under it is not a landing');
  assert.equal(race.land(runner.id, 1, spot(1))?.checkpoint, 1);
  assert.equal(race.land(runner.id, 2, spot(2)), null, 'impossible instantaneous hop');
  assert.equal(race.land(runner.id, 1, spot(1)), null, 'replayed checkpoint');
  assert.equal(onParkourPad({ ...spot(1), x: NaN }, 1), false);
});

test('falling returns to the saved platform and adds a two-second penalty', () => {
  let now = 1000;
  const race = new ParkourRace(() => now);
  race.start(runner, spot(0));
  now += 1000;
  race.land(runner.id, 1, spot(1));
  assert.equal(race.retry(runner.id)?.checkpoint, 0);
  for (let i = 1; i <= 4; i++) {
    now += 1000;
    race.land(runner.id, i, spot(i));
  }
  const retry = race.retry(runner.id)!;
  assert.equal(retry.checkpoint, PARKOUR_SAVE);
  assert.equal(retry.falls, 2);
  assert.equal(retry.elapsedMs, now - 1000 + 2 * PARKOUR_PENALTY);
});

test('server time produces best-per-person scores shared by concurrent competitors', () => {
  let now = 1000;
  const race = new ParkourRace(() => now);
  race.start(runner, spot(0));
  race.start({ ...runner, id: 'b', owner: 'account:b', name: 'Blair' }, spot(0));
  assert.equal(race.state().runners.length, 2);
  for (let i = 1; i < PARKOUR_PADS.length; i++) {
    now += 1000;
    const result = race.land(runner.id, i, spot(i));
    if (i === PARKOUR_PADS.length - 1) {
      assert.equal(result?.score?.timeMs, 5000);
      assert.equal(result?.best, true);
    }
  }
  assert.equal(race.state().runners.length, 1);
  assert.equal(race.state().scores[0].name, 'Alex');
  race.start({ ...runner, id: 'reconnected' }, spot(0));
  for (let i = 1; i < PARKOUR_PADS.length; i++) {
    now += 1500;
    race.land('reconnected', i, spot(i));
  }
  assert.equal(race.state().scores.length, 1);
  assert.equal(race.state().scores[0].timeMs, 5000);
  race.leave('b');
  assert.equal(race.state().runners.length, 0);
});

test('separate floors do not share runs and stale runs expire without timers', () => {
  let now = 1000;
  const a = new ParkourRace(() => now);
  const b = new ParkourRace(() => now);
  a.start(runner, spot(0));
  assert.equal(b.state().runners.length, 0);
  now += 10 * 60 * 1000 + 1;
  assert.equal(a.progress(runner.id), null);
  assert.equal(a.state().runners.length, 0);
});

test('every hop is reachable using the normal walking speed, jump, and actual collision helpers', () => {
  const colliders = [{ ...FLOOR, top: 0 }, ...parkourPlatforms()];
  for (let i = 1; i < PARKOUR_PADS.length; i++) {
    const from = PARKOUR_PADS[i - 1];
    const to = PARKOUR_PADS[i];
    const body = { pos: new Vector3(from.x, from.y, from.z), grounded: false, stepOffset: 0, colliders };
    let vy = 6.4;
    for (let tick = 0; tick < 120 && !body.grounded; tick++) {
      const dx = to.x - body.pos.x;
      const dz = to.z - body.pos.z;
      const distance = Math.hypot(dx, dz);
      const step = Math.min(distance, 4.6 / 60);
      if (distance) {
        stepTo(body, body.pos.x + dx / distance * step, body.pos.z);
        stepTo(body, body.pos.x, body.pos.z + dz / distance * step);
      }
      const ground = groundAt(colliders, body.pos.x, body.pos.z, body.pos.y);
      vy -= 18 / 60;
      body.pos.y += vy / 60;
      if (body.pos.y <= ground) { body.pos.y = ground; body.grounded = true; }
    }
    assert.equal(onParkourPad(body.pos, i), true, `hop ${i} lands on its platform at walking speed`);
  }
});
