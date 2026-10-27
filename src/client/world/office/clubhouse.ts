import * as THREE from 'three';
import { mesh, mergeByColor, roundedBox, toon } from '../toon';
import type { Fixture } from './fixture';

/** Lightweight, original scenery: warm wood, acoustic panels and a suspended garden. */
export const clubhouse: Fixture = (site) => {
  const group = new THREE.Group();
  const solids = new THREE.Group();
  const wood = toon('#b8865b');
  const ink = toon('#242424');
  const mint = toon('#F4F0E6');
  const peach = toon('#DB4545');
  const cream = toon('#f5ebd8');
  const leaf = toon('#5b9074');

  // A high frieze leaves the windows, boards and all walking routes unobstructed.
  for (let i = 0; i < 56; i++) {
    solids.add(mesh(new THREE.BoxGeometry(0.12, 1.05, 0.09), wood, -17.3 + i * 0.63, 5.85, -12.75));
  }
  const signPanel = mesh(roundedBox(7.6, 1.45, 0.1, 0.08), ink, -4.5, 5.75, -12.6, false);
  group.add(signPanel);
  const logo = new THREE.TextureLoader().load('/brand/cadre-wordmark-sand.png');
  logo.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8 * 256 / 856), new THREE.MeshBasicMaterial({ map: logo, transparent: true, depthWrite: false }));
  sign.position.set(-4.5, 5.75, -12.53);
  group.add(sign);
  site.wall('north', -4.5, 5.75, 7.6, 1.45);

  // Soft acoustic islands define work pods without adding expensive lights or postprocessing.
  for (const x of [-10.5, -1.5]) {
    for (const z of [-4, 4]) {
      solids.add(mesh(roundedBox(5.5, 0.15, 2.8, 0.5), z < 0 ? mint : peach, x, 5.25, z));
      for (const dx of [-2.05, 2.05]) {
        solids.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 5), ink, x + dx, 6, z));
      }
      const bar = mesh(new THREE.BoxGeometry(3.8, 0.025, 0.12), toon('#fff3c5', { emissive: '#6d5730' }), x, 5.15, z, false);
      group.add(bar);
    }
  }

  // Hanging planters above the western aisle; their lowest leaves are well above eye level.
  for (const z of [-8, 0, 8]) {
    solids.add(mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.4, 12), cream, -16.7, 4.1, z));
    for (const dx of [-0.25, 0.25]) solids.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.4, 5), ink, -16.7 + dx, 5.4, z));
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 0.2;
      const sprig = mesh(new THREE.SphereGeometry(0.21, 6, 4), leaf, -16.7 + Math.cos(angle) * 0.35, 4.27 - (i % 3) * 0.18, z + Math.sin(angle) * 0.35);
      sprig.scale.set(0.7, 1.6, 0.7);
      sprig.rotation.z = angle;
      solids.add(sprig);
    }
  }
  // Desk mats and little tactile details make the workspaces feel inhabited.
  for (const { def, group: desk } of site.desks.values()) {
    if (def.beanbag || def.station || def.room || def.wing) continue;
    const mat = mesh(roundedBox(1.45, 0.012, 0.65, 0.1), def.z < 0 ? mint : peach, 0, 0.793, 0, false);
    desk.add(mat);
  }
  group.add(mergeByColor(solids));
  return { group };
};
