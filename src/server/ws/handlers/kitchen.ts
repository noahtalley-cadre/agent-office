import { DISHWASHER, freshKitchen } from '../../../shared/kitchen.js';
import { OFFICE_MAP } from '../../../shared/maps/index.js';
import type { KitchenClientMsg } from '../../../shared/protocol.js';
import { throttle } from '../../office/client.js';
import type { HandlerMap, ViewPieces } from './types.js';

export const kitchenView: ViewPieces['kitchen'] = (_ctx, floor) => floor?.kitchen.view() ?? freshKitchen(Date.now());

export const kitchenHandlers = {
  'kitchen.use'(ctx, c, msg) {
    const floor = ctx.floorOf(c);
    if (!floor || ctx.maps.pick() !== OFFICE_MAP || c.peer.lite || Math.abs(c.peer.y) > 2 || Math.hypot(c.peer.x - DISHWASHER.x, c.peer.z - DISHWASHER.z) > DISHWASHER.reach + 1 || !throttle(c, 'kitchen', 150)) return;
    const changed = floor.kitchen.act(msg.action, msg.revision);
    const reply = { t: 'kitchen', kitchen: floor.kitchen.view() } as const;
    if (changed) ctx.toFloor(floor, reply);
    else ctx.sendTo(c, reply);
  },
} satisfies HandlerMap<KitchenClientMsg>;
