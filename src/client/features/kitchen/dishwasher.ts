import * as THREE from 'three';
import { freshKitchen, kitchenPhase, type KitchenState } from '../../../shared/kitchen';
import { mesh, roundedBox, textPlane, toon, toonUnique } from '../../world/toon';

/** A drop-down door, sliding wire rack, plates, porthole bubbles and a readable status display. */
export function dishwasher() {
  const group = new THREE.Group();
  const steel = toon('#b5cac6');
  const dark = toon('#263e41');
  const white = toon('#f7f1df');
  group.add(mesh(new THREE.BoxGeometry(1.04, 0.83, 0.06), dark, 0, 0.49, -0.43));
  for (const x of [-0.5, 0.5]) group.add(mesh(new THREE.BoxGeometry(0.06, 0.84, 0.94), steel, x, 0.49, 0));
  for (const y of [0.1, 0.9]) group.add(mesh(new THREE.BoxGeometry(1.04, 0.06, 0.94), steel, 0, y, 0));
  const rack = new THREE.Group();
  rack.position.set(0, 0.25, -0.05);
  group.add(rack);
  for (let i = 0; i < 8; i++) rack.add(mesh(new THREE.BoxGeometry(0.014, 0.014, 0.68), steel, -0.4 + i * 0.115, 0, 0));
  for (let i = 0; i < 5; i++) rack.add(mesh(new THREE.BoxGeometry(0.84, 0.014, 0.014), steel, 0, 0, -0.32 + i * 0.16));
  for (const x of [-0.41, 0.41]) rack.add(mesh(new THREE.BoxGeometry(0.014, 0.15, 0.7), steel, x, 0.07, 0));
  const dishes = new THREE.Group();
  rack.add(dishes);
  const stains = new THREE.Group();
  dishes.add(stains);
  for (let i = 0; i < 5; i++) {
    const x = -0.29 + i * 0.145;
    dishes.add(mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.025, 24).rotateZ(Math.PI / 2), white, x, 0.25, -0.015));
    dishes.add(mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 24).rotateY(Math.PI / 2), toon('#74a89c'), x + 0.016, 0.25, -0.015));
    stains.add(mesh(new THREE.CircleGeometry(0.075, 12).rotateY(Math.PI / 2), toon('#bd8f58'), x + 0.014, 0.25, 0.025, false));
  }
  const door = new THREE.Group();
  door.position.set(0, 0.11, 0.485);
  group.add(door);
  door.add(mesh(roundedBox(0.99, 0.76, 0.085, 0.035), steel, 0, 0.38, 0));
  door.add(mesh(roundedBox(0.81, 0.54, 0.035, 0.04), toon('#dce5d8'), 0, 0.34, 0.052));
  door.add(mesh(roundedBox(0.62, 0.28, 0.026, 0.09), dark, 0, 0.37, 0.08));
  door.add(mesh(roundedBox(0.58, 0.065, 0.08, 0.025), toon('#647e78'), 0, 0.68, 0.072));
  const bubbles = new THREE.Group();
  door.add(bubbles);
  const foam = new THREE.MeshBasicMaterial({ color: '#8fd5d6', transparent: true, opacity: 0.8 });
  for (let i = 0; i < 9; i++) bubbles.add(mesh(new THREE.RingGeometry(0.016, 0.025 + (i % 3) * 0.008, 12), foam, 0, 0, 0.097, false));
  group.add(mesh(roundedBox(1.02, 0.14, 0.07, 0.02), dark, 0, 0.91, 0.49));
  const ledMat = toonUnique('#edb75c');
  const led = mesh(new THREE.SphereGeometry(0.025, 10, 8), ledMat, 0.42, 0.91, 0.54);
  group.add(led);
  let display = textPlane('READY TO WASH', { color: '#f5cd8c', size: 26 });
  const putDisplay = () => {
    display.scale.setScalar(0.3);
    display.position.set(-0.06, 0.91, 0.531);
    group.add(display);
  };
  putDisplay();
  const sparks = new THREE.Group();
  group.add(sparks);
  for (let i = 0; i < 5; i++) sparks.add(mesh(new THREE.OctahedronGeometry(0.042), toon('#f2da90', { emissive: '#4e4420' }), (i - 2) * 0.17, 0.52 + (i % 2) * 0.18, 0.75, false));
  let current = freshKitchen();
  let lastLabel = 'READY TO WASH';
  let doorAngle = 0;
  return {
    group,
    set(state: KitchenState) { current = state; },
    update(t: number, dt: number, now: number) {
      const phase = kitchenPhase(current, now);
      doorAngle += ((current.doorOpen ? Math.PI / 2 : 0) - doorAngle) * Math.min(1, dt * 7);
      door.rotation.x = doorAngle;
      rack.position.z = -0.05 + Math.sin(doorAngle) * 0.42;
      dishes.visible = phase !== 'empty';
      stains.visible = phase === 'dirty';
      bubbles.visible = phase === 'washing';
      sparks.visible = phase === 'clean' && current.doorOpen;
      sparks.children.forEach((spark, i) => { spark.scale.setScalar(0.65 + Math.sin(t * 3 + i) * 0.35); spark.rotation.y = t + i; });
      bubbles.children.forEach((bubble, i) => {
        bubble.position.x = Math.sin(t * 2 + i * 1.5) * 0.23;
        bubble.position.y = 0.26 + ((t * 0.15 + i / 9) % 1) * 0.21;
      });
      const label = phase === 'washing' ? `WASHING  ${Math.max(0, Math.ceil(((current.cycleEndsAt ?? now) - now) / 1000))}s` : phase === 'clean' ? 'SPARKLING CLEAN' : phase === 'empty' ? 'THANK YOU, TEAM' : current.doorOpen ? 'LOADED · PRESS E' : 'READY TO WASH';
      if (label !== lastLabel) {
        group.remove(display);
        display.geometry.dispose();
        display.material.map?.dispose();
        display.material.dispose();
        display = textPlane(label, { color: phase === 'dirty' ? '#f5cd8c' : '#b5e8d2', size: 26 });
        putDisplay();
        lastLabel = label;
      }
      ledMat.color.set(phase === 'washing' ? '#69cddd' : phase === 'dirty' ? '#edb75c' : '#9dd89c');
      ledMat.emissive.copy(ledMat.color).multiplyScalar(phase === 'washing' ? 0.5 + Math.sin(t * 3) * 0.2 : 0.15);
    },
  };
}
