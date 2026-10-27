/** One dishwasher per project floor. Deadlines come from the server, so a wash survives people leaving. */
export const WASH_MS = 18_000;
export const DISHWASHER = { x: -13.15, z: 10.95, reach: 3 } as const;
export type KitchenPhase = 'dirty' | 'washing' | 'clean' | 'empty';
export type KitchenAction = 'open' | 'wash' | 'unload' | 'load';

export interface KitchenState {
  phase: KitchenPhase;
  doorOpen: boolean;
  cycleEndsAt: number | null;
  revision: number;
  /** The sender's clock, to compensate for browser clock differences. */
  serverNow: number;
}

export function freshKitchen(now = 0): KitchenState {
  return { phase: 'dirty', doorOpen: false, cycleEndsAt: null, revision: 0, serverNow: now };
}

export function kitchenPhase(state: KitchenState, now: number): KitchenPhase {
  return state.phase === 'washing' && state.cycleEndsAt !== null && now >= state.cycleEndsAt ? 'clean' : state.phase;
}

/** The single E action shown by the appliance. Also used by the server to reject impossible actions. */
export function kitchenAction(state: KitchenState, now: number): KitchenAction | null {
  const phase = kitchenPhase(state, now);
  if (phase === 'washing') return null;
  if (!state.doorOpen) return 'open';
  return phase === 'dirty' ? 'wash' : phase === 'clean' ? 'unload' : 'load';
}
