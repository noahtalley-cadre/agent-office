import { DISHWASHER, kitchenAction, kitchenPhase } from '../../../shared/kitchen';
import type { Ctx } from '../../core/context';
import { aside, hintTitle, key, onE } from '../../core/hint';
import { store } from '../../state';
import { toast } from '../../ui/dom';

declare module '../../world/types' {
  interface InteractKinds {
    dishwasher: true;
  }
}

/** The office kitchen's shared dishwasher. The existing coffee feature still handles the fresh pot. */
export function installKitchen(ctx: Ctx) {
  const now = () => Date.now() + store.kitchenClockOffset;
  let previousPhase = kitchenPhase(store.kitchen, now());
  const sync = () => {
    ctx.office.kitchen.setState(store.kitchen, store.kitchenClockOffset);
    previousPhase = kitchenPhase(store.kitchen, now());
    ctx.hint.invalidate();
  };
  store.on('kitchen', sync);
  sync();
  ctx.interactions.define('dishwasher', {
    reach: DISHWASHER.reach,
    hint: () => {
      const phase = kitchenPhase(store.kitchen, now());
      const action = kitchenAction(store.kitchen, now());
      const remaining = Math.max(0, Math.ceil(((store.kitchen.cycleEndsAt ?? now()) - now()) / 1000));
      const label = action === 'open' ? phase === 'clean' ? 'Open clean dishes' : 'Open dishwasher' : action === 'wash' ? 'Start 18-second wash' : action === 'unload' ? 'Put dishes away' : 'Load office dishes';
      return { k: `${phase}:${action}:${remaining}`, parts: [hintTitle('🫧 Office dishwasher'), action ? key('E', label) : aside(`Washing · ${remaining}s · door locked`), aside('Shared with your floor')] };
    },
    use: onE(() => {
      const action = kitchenAction(store.kitchen, now());
      if (!action) return;
      ctx.net.send({ t: 'kitchen.use', action, revision: store.kitchen.revision });
    }),
  });
  ctx.ticks.add('world', () => {
    const phase = kitchenPhase(store.kitchen, now());
    if (previousPhase === 'washing' && phase === 'clean' && ctx.inOffice() && !ctx.upTop()) {
      toast('🫧 Dishes are sparkling clean! E at the dishwasher to put them away.');
      ctx.sound.ding('done');
      ctx.hint.invalidate();
    }
    previousPhase = phase;
  });
}
