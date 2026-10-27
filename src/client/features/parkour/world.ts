import * as THREE from 'three';
import { PARKOUR_PADS, PARKOUR_SAVE, PARKOUR_SIGN, parkourPlatforms } from '../../../shared/parkour';
import { mesh, roundedBox, textPlane, toon, toonUnique } from '../../world/toon';
import type { Collider, Interactable } from '../../world/types';
import type { Fixture } from '../../world/office/fixture';

export interface ParkourCourse {
  group: THREE.Group;
  colliders: Collider[];
  interactable: Interactable;
  /** Completed pads light up, and a small floating arrow points to the next one. */
  progress(checkpoint: number | null): void;
  update(t: number): void;
}

export function buildParkour(): ParkourCourse {
  const group = new THREE.Group();
  const colliders: Collider[] = parkourPlatforms();
  const lights: THREE.MeshToonMaterial[] = [];
  const dark = toon('#29433e');
  const cream = toon('#fff6df');

  // Individual protective mats, rather than a barrier across the aisle.
  PARKOUR_PADS.forEach((pad, i) => {
    const { x, z, y, width, depth, color } = pad;
    group.add(mesh(roundedBox(width + 0.2, 0.035, depth + 0.2, 0.05), toon('#d8e4db'), x, 0.018, z, false));
    group.add(mesh(roundedBox(width, y, depth, 0.075), toon(color), x, y / 2, z));
    // Office storage trunks: pale lid, inset front, two recessed grab handles.
    const lid = toonUnique(color);
    lid.emissive.set(color);
    lights.push(lid);
    group.add(mesh(roundedBox(width + 0.035, 0.07, depth + 0.035, 0.03), lid, x, y - 0.035, z));
    if (y > 0.4) {
      group.add(mesh(roundedBox(width - 0.14, y - 0.2, 0.025, 0.02), cream, x, y / 2, z - depth / 2 - 0.006));
      for (const side of [-1, 1]) group.add(mesh(roundedBox(0.24, 0.055, 0.025, 0.012), dark, x + side * width * 0.25, y * 0.57, z - depth / 2 - 0.025, false));
    }
    // A label on the top is readable while lining up a jump; front labels help from the aisle.
    const top = textPlane(pad.label, { size: 48, color: '#173f35', bg: '#fff9e9' });
    top.scale.setScalar(0.38);
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, y + 0.012, z);
    group.add(top);
    const front = textPlane(i === PARKOUR_SAVE ? 'CHECKPOINT' : i === 0 ? 'DESK HOP →' : pad.label, { size: 36, color: '#173f35', bg: '#fff9e9' });
    front.scale.setScalar(i === 0 ? 0.3 : 0.25);
    front.position.set(x, Math.max(0.15, y * 0.42), z - depth / 2 - 0.026);
    front.rotation.y = Math.PI;
    group.add(front);
    // Painted chevrons show the route without adding collision or hiding the floorboards.
    if (i < PARKOUR_PADS.length - 1) {
      const next = PARKOUR_PADS[i + 1];
      const marker = new THREE.Group();
      marker.position.set((x + next.x) / 2, 0.025, (z + next.z) / 2);
      marker.rotation.y = -Math.atan2(next.z - z, next.x - x);
      for (const s of [-1, 1]) {
        const wing = mesh(new THREE.BoxGeometry(0.35, 0.012, 0.065), toon('#6b8f80'), -0.07, 0, s * 0.1, false);
        wing.rotation.y = s * 0.6;
        marker.add(wing);
      }
      group.add(marker);
    }
  });

  // A small freestanding office sign, facing the desks. Its collider never crosses the route.
  const { x, z } = PARKOUR_SIGN;
  group.add(mesh(roundedBox(0.65, 0.07, 0.42, 0.03), dark, x, 0.035, z));
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.55, 8), dark, x, 0.8, z));
  group.add(mesh(roundedBox(1.2, 0.82, 0.09, 0.06), toon('#234f43'), x, 1.48, z));
  for (const [words, height, size] of [['DESK HOP', 1.68, 0.29], ['Take a little leap.', 1.47, 0.18], ['E  •  RACE & SCORES', 1.23, 0.18]] as const) {
    const text = textPlane(words, { size: 48, color: '#fff8e7', bg: '#234f43' });
    text.scale.setScalar(size);
    text.position.set(x, height, z - 0.05);
    text.rotation.y = Math.PI;
    group.add(text);
  }
  colliders.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.2, maxZ: z + 0.2, top: 1.9 });
  const interactable: Interactable = { kind: 'parkour', x, z: z - 0.4, radius: 1.8 };
  group.userData.interact = interactable;

  // A light finish gate, high enough to jump beneath; only the compact feet are solid.
  const finish = PARKOUR_PADS[PARKOUR_PADS.length - 1];
  for (const side of [-1, 1]) {
    group.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 4, 8), dark, finish.x, 2, finish.z + side * 1.15));
    colliders.push({ minX: finish.x - 0.06, maxX: finish.x + 0.06, minZ: finish.z + side * 1.15 - 0.06, maxZ: finish.z + side * 1.15 + 0.06, top: 4 });
  }
  for (let i = 0; i < 10; i++) {
    group.add(mesh(new THREE.BoxGeometry(0.08, 0.16, 0.23), i % 2 ? cream : dark, finish.x, 4, finish.z - 1.035 + i * 0.23, false));
  }
  const arrow = mesh(new THREE.ConeGeometry(0.16, 0.3, 4), toon('#fff2a5', { emissive: '#8c6b21' }), 0, 0, 0, false);
  arrow.rotation.z = Math.PI;
  group.add(arrow);
  let next = 0;

  return {
    group, colliders, interactable,
    progress(checkpoint) {
      next = checkpoint === null ? 0 : checkpoint + 1;
      lights.forEach((mat, i) => mat.emissiveIntensity = checkpoint !== null && i <= checkpoint ? 0.35 : 0);
      arrow.visible = next < PARKOUR_PADS.length;
    },
    update(t) {
      const pad = PARKOUR_PADS[next];
      if (pad) arrow.position.set(pad.x, pad.y + 0.65 + Math.sin(t * 3) * 0.08, pad.z);
    },
  };
}

declare module '../../world/types' {
  interface OfficeHandles { parkour: ParkourCourse }
}

export const parkour: Fixture<'parkour'> = () => {
  const course = buildParkour();
  return { group: course.group, colliders: course.colliders, interactables: [course.interactable], handle: { parkour: course }, update: (t) => course.update(t) };
};
