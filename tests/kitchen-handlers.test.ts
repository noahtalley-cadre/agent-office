import test from 'node:test';
import assert from 'node:assert/strict';
import { DISHWASHER } from '../src/shared/kitchen.js';
import type { ServerMsg } from '../src/shared/protocol.js';
import { Kitchen } from '../src/server/kitchen.js';
import type { Client } from '../src/server/office/client.js';
import type { Ctx } from '../src/server/office/context.js';
import { kitchenHandlers } from '../src/server/ws/handlers/kitchen.js';

function fixture() {
  const kitchen = new Kitchen();
  const floor = { kitchen };
  const sent: ServerMsg[] = [];
  const broadcast: ServerMsg[] = [];
  let map = 'office';
  let onFloor = true;
  const c = { peer: { x: DISHWASHER.x, y: 0, z: DISHWASHER.z, lite: false }, throttles: new Map() } as Client;
  const ctx = {
    floorOf: () => onFloor ? floor : undefined,
    maps: { pick: () => map },
    toFloor: (_floor: unknown, message: ServerMsg) => broadcast.push(message),
    sendTo: (_client: unknown, message: ServerMsg) => sent.push(message),
  } as unknown as Ctx;
  return { kitchen, c, ctx, sent, broadcast, map: (value: string) => map = value, onFloor: (value: boolean) => onFloor = value };
}

test('a dishwasher command updates everyone on that floor, while a stale command only resynchronizes its sender', () => {
  const f = fixture();
  kitchenHandlers['kitchen.use'](f.ctx, f.c, { t: 'kitchen.use', action: 'open', revision: 0 });
  assert.equal(f.broadcast.length, 1);
  assert.equal(f.sent.length, 0);
  assert.equal(f.kitchen.view().doorOpen, true);
  f.c.throttles.clear();
  kitchenHandlers['kitchen.use'](f.ctx, f.c, { t: 'kitchen.use', action: 'open', revision: 0 });
  assert.equal(f.broadcast.length, 1);
  assert.equal(f.sent.length, 1);
  assert.equal(f.kitchen.view().revision, 1);
});

test('the kitchen cannot be operated remotely, from another map, from the lite view, or without a floor', () => {
  for (const move of [
    (f: ReturnType<typeof fixture>) => { f.c.peer.x += 20; },
    (f: ReturnType<typeof fixture>) => { f.c.peer.y = 5; },
    (f: ReturnType<typeof fixture>) => f.map('castle'),
    (f: ReturnType<typeof fixture>) => f.map('station'),
    (f: ReturnType<typeof fixture>) => { f.c.peer.lite = true; },
    (f: ReturnType<typeof fixture>) => f.onFloor(false),
  ]) {
    const f = fixture();
    move(f);
    kitchenHandlers['kitchen.use'](f.ctx, f.c, { t: 'kitchen.use', action: 'open', revision: 0 });
    assert.equal(f.kitchen.view().revision, 0);
    assert.equal(f.broadcast.length, 0);
  }
});

test('the appliance rate limit prevents an immediate second command', () => {
  const f = fixture();
  kitchenHandlers['kitchen.use'](f.ctx, f.c, { t: 'kitchen.use', action: 'open', revision: 0 });
  kitchenHandlers['kitchen.use'](f.ctx, f.c, { t: 'kitchen.use', action: 'wash', revision: 1 });
  assert.equal(f.kitchen.view().phase, 'dirty');
  assert.equal(f.broadcast.length, 1);
});
