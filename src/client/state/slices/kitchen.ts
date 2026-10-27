import { freshKitchen, type KitchenState } from '../../../shared/kitchen';
import type { Slice, Store } from '../store';

declare module '../store' {
  interface Store {
    kitchen: KitchenState;
    kitchenClockOffset: number;
  }
  interface Topics {
    kitchen: true;
  }
}

function set(s: Store, value: KitchenState) {
  s.kitchen = value;
  s.kitchenClockOffset = value.serverNow - Date.now();
}

export const kitchen: Slice = {
  init(s) {
    s.kitchen = freshKitchen();
    s.kitchenClockOffset = 0;
  },
  on: {
    kitchen(s, m) {
      set(s, m.kitchen);
      return ['kitchen'];
    },
  },
  enter(s, v) {
    set(s, v.kitchen);
    return ['kitchen'];
  },
};
