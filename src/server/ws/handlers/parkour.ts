import type { ParkourClientMsg } from '../../../shared/protocol/parkour.js';
import { OFFICE_MAP } from '../../../shared/maps/index.js';
import type { Floor } from '../../floor.js';
import type { Ctx } from '../../office/context.js';
import { throttle, type Client } from '../../office/client.js';
import { ParkourRace } from '../../parkour.js';
import type { FeatureHooks, HandlerMap } from './types.js';

const floors = new WeakMap<Floor, ParkourRace>();
function race(floor: Floor): ParkourRace {
  let value = floors.get(floor);
  if (!value) floors.set(floor, value = new ParkourRace());
  return value;
}
function changed(ctx: Ctx, floor: Floor) {
  ctx.toFloor(floor, { t: 'parkour.state', state: race(floor).state() });
}
function here(ctx: Ctx, c: Client): Floor | undefined {
  const floor = ctx.floorOf(c);
  return floor && ctx.maps.pick() === OFFICE_MAP && !c.peer.lite ? floor : undefined;
}
function stop(ctx: Ctx, c: Client, floor = ctx.floorOf(c)) {
  if (floor && floors.get(floor)?.leave(c.id)) changed(ctx, floor);
}

export const parkourHandlers = {
  'parkour.sync'(ctx, c) {
    if (!throttle(c, 'parkour.sync', 300)) return;
    const floor = here(ctx, c);
    ctx.sendTo(c, { t: 'parkour.state', state: floor ? race(floor).state() : { runners: [], scores: [] } });
  },
  'parkour.start'(ctx, c) {
    if (!throttle(c, 'parkour.start', 1000)) return;
    const floor = here(ctx, c);
    if (!floor || !race(floor).start({ id: c.id, owner: c.accountId ? `account:${c.accountId}` : `name:${c.peer.name}`, name: c.peer.name, color: c.peer.color }, c.peer)) {
      ctx.sendTo(c, { t: 'parkour.stopped', reason: 'Start Desk Hop from its green platform in the office.' });
      return;
    }
    ctx.sendTo(c, { t: 'parkour.run', ...race(floor).progress(c.id)! });
    changed(ctx, floor);
  },
  'parkour.checkpoint'(ctx, c, msg) {
    const floor = here(ctx, c);
    if (!floor || !throttle(c, 'parkour.checkpoint', 100)) return;
    const result = race(floor).land(c.id, msg.checkpoint, c.peer);
    if (!result) {
      if (!race(floor).progress(c.id)) ctx.sendTo(c, { t: 'parkour.stopped', reason: 'That run expired. Start a fresh race at the green platform.' });
      return;
    }
    if (result.score) ctx.sendTo(c, { t: 'parkour.finish', score: result.score, best: !!result.best });
    else ctx.sendTo(c, { t: 'parkour.run', checkpoint: result.checkpoint, elapsedMs: result.elapsedMs, falls: result.falls });
    changed(ctx, floor);
  },
  'parkour.retry'(ctx, c) {
    const floor = here(ctx, c);
    if (!floor || !throttle(c, 'parkour.retry', 350)) return;
    const progress = race(floor).retry(c.id);
    if (!progress) {
      ctx.sendTo(c, { t: 'parkour.stopped', reason: 'That run expired. Start a fresh race at the green platform.' });
      return;
    }
    ctx.sendTo(c, { t: 'parkour.run', ...progress, warp: true });
    changed(ctx, floor);
  },
  'parkour.leave'(ctx, c) { stop(ctx, c); },
} satisfies HandlerMap<ParkourClientMsg>;

export const parkourHooks: FeatureHooks = {
  leaving: (ctx, c, was) => stop(ctx, c, was),
  closed: (ctx, c) => stop(ctx, c),
};
