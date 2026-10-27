import type { KitchenAction, KitchenState } from '../kitchen.js';

export type KitchenClientMsg = { t: 'kitchen.use'; action: KitchenAction; revision: number };
export type KitchenServerMsg = { t: 'kitchen'; kitchen: KitchenState };
