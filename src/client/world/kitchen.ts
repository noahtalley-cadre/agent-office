import * as THREE from 'three';
import { DISHWASHER, type KitchenState } from '../../shared/kitchen';
import { coffeePot, mug } from '../features/kitchen/coffee';
import { dishwasher } from '../features/kitchen/dishwasher';
import { mesh, roundedBox, textPlane, toon } from './toon';
import type { Collider, Interactable } from './types';
import type { Fixture } from './office/fixture';

export interface Kitchen {
  group: THREE.Group;
  colliders: Collider[];
  interactables: Interactable[];
  setState(state: KitchenState, clockOffset: number): void;
  update(t: number, dt: number): void;
}

/** An office-sized kitchenette, with hand-built appliances that work even without downloaded models. */
export function buildKitchen(): Kitchen {
  const group = new THREE.Group();
  group.name = 'office-kitchen';
  group.position.set(-14.5, 0, 12.2);
  group.rotation.y = Math.PI;
  const sage = toon('#71998a');
  const cream = toon('#eee9da');
  const wood = toon('#c79360');
  const dark = toon('#334b49');
  const brass = toon('#c99b56');
  // Cabinet carcasses leave a real opening for the dishwasher, rather than hiding it in a solid box.
  group.add(mesh(new THREE.BoxGeometry(3.3, 0.85, 0.94), sage, 0.85, 0.5, 0));
  group.add(mesh(new THREE.BoxGeometry(0.6, 0.85, 0.94), sage, -2.2, 0.5, 0));
  group.add(mesh(new THREE.BoxGeometry(5, 0.1, 0.84), dark, 0, 0.055, -0.04));
  group.add(mesh(roundedBox(5.1, 0.12, 1.08, 0.035), wood, 0, 0.99, 0));
  group.add(mesh(new THREE.BoxGeometry(5.1, 0.15, 0.05), wood, 0, 1.1, -0.49));
  for (const x of [-2.2, -0.34, 0.59, 1.52, 2.18]) {
    const width = x === -2.2 || x === 2.18 ? 0.55 : 0.86;
    group.add(mesh(roundedBox(width, 0.71, 0.035, 0.025), toon('#83ac9c'), x, 0.53, 0.488));
    group.add(mesh(roundedBox(0.2, 0.028, 0.035, 0.01), brass, x, 0.8, 0.529));
  }
  // An inset sink, its dark basin and an arched chrome tap.
  group.add(mesh(roundedBox(0.83, 0.025, 0.65, 0.11), toon('#b4c8c3'), -0.33, 1.06, 0.03));
  group.add(mesh(roundedBox(0.68, 0.027, 0.49, 0.09), dark, -0.33, 1.075, 0.03));
  const faucet = mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 20, Math.PI), toon('#c5d9d5'), -0.33, 1.3, -0.27);
  faucet.rotation.y = Math.PI / 2;
  group.add(faucet);
  group.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10), toon('#c5d9d5'), -0.33, 1.19, -0.4));
  group.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 12), toon('#d8b171'), -0.88, 1.145, -0.27));
  group.add(mesh(new THREE.BoxGeometry(0.1, 0.025, 0.025), dark, -0.86, 1.25, -0.27));
  const coffee = coffeePot();
  coffee.group.position.set(1.2, 1.06, 0);
  const coffeeUse: Interactable = { kind: 'coffee', x: -15.7, z: 10.9, radius: 1.4, label: '☕ Fresh coffee pot' };
  coffee.group.userData.interact = coffeeUse;
  group.add(coffee.group);
  for (const [x, z, color] of [[0.57, 0.26, '#f2cd78'], [2, 0.25, '#e4b3a1'], [2.22, -0.15, '#b6d8ce']] as const) {
    const cup = mug(color);
    cup.position.set(x, 1.06, z);
    group.add(cup);
  }
  const washer = dishwasher();
  washer.group.name = 'shared-dishwasher';
  washer.group.position.x = -1.35;
  const washUse: Interactable = { kind: 'dishwasher', x: DISHWASHER.x, z: DISHWASHER.z, radius: 1.2 };
  washer.group.userData.interact = washUse;
  group.add(washer.group);
  // A warm cream refrigerator, freezer seam, brass handles and the team's kitchen etiquette.
  group.add(mesh(roundedBox(1.1, 2.18, 1, 0.12), cream, -3.2, 1.09, 0));
  group.add(mesh(new THREE.BoxGeometry(1, 0.022, 0.018), dark, -3.2, 1.52, 0.505));
  for (const y of [0.91, 1.79]) group.add(mesh(roundedBox(0.045, 0.31, 0.075, 0.02), brass, -2.82, y, 0.548));
  const note = textPlane('YOU WASH. WE SHIP.', { color: '#36554d', bg: '#f8dfa1', size: 24 });
  note.position.set(-3.2, 1.22, 0.518);
  note.rotation.z = -0.08;
  note.scale.setScalar(0.42);
  group.add(note);
  const brand = textPlane('THE DAILY GRIND', { color: '#355449', size: 36 });
  brand.position.set(-0.5, 0.63, 0.535);
  brand.scale.setScalar(0.38);
  group.add(brand);
  const doorCollider: Collider = { minX: -13.67, maxX: -12.63, minZ: 11.7, maxZ: 11.75, top: 0.18 };
  const colliders: Collider[] = [
    { minX: -17.05, maxX: -11.95, minZ: 11.66, maxZ: 12.74, top: 1.05 },
    { minX: -11.85, maxX: -10.75, minZ: 11.7, maxZ: 12.7, top: 2.2 },
    doorCollider,
  ];
  let offset = 0;
  return {
    group, colliders, interactables: [coffeeUse, washUse],
    setState(state, clockOffset) {
      washer.set(state);
      offset = clockOffset;
      doorCollider.minZ = state.doorOpen ? 10.9 : 11.7;
    },
    update(t, dt) {
      coffee.update(t);
      washer.update(t, dt, Date.now() + offset);
    },
  };
}

declare module './types' {
  interface OfficeHandles {
    kitchen: Kitchen;
  }
}

export const kitchen: Fixture<'kitchen'> = (site) => {
  const built = buildKitchen();
  site.wall('south', -14.5, 0.55, 5.1, 1.1);
  site.wall('south', -15.7, 0.9, 0.9, 1.8);
  site.wall('south', -11.3, 1.1, 1.1, 2.2);
  return { group: built.group, colliders: built.colliders, interactables: built.interactables, update: (t, dt) => built.update(t, dt), handle: { kitchen: built } };
};
