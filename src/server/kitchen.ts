import { freshKitchen, kitchenAction, kitchenPhase, WASH_MS, type KitchenState } from '../shared/kitchen.js';

/** The authoritative appliance state. A deadline, rather than a timer, keeps idle floors inexpensive. */
export class Kitchen {
  private state = freshKitchen();

  view(now = Date.now()): KitchenState {
    return { ...this.state, phase: kitchenPhase(this.state, now), serverNow: now };
  }

  act(action: unknown, revision: unknown, now = Date.now()): boolean {
    const current = this.view(now);
    if (revision !== current.revision || !action || action !== kitchenAction(current, now)) return false;
    const next = { ...current, revision: current.revision + 1 };
    if (action === 'open') next.doorOpen = true;
    else if (action === 'wash') {
      next.phase = 'washing';
      next.doorOpen = false;
      next.cycleEndsAt = now + WASH_MS;
    } else {
      next.phase = action === 'unload' ? 'empty' : 'dirty';
      next.cycleEndsAt = null;
    }
    this.state = next;
    return true;
  }
}
