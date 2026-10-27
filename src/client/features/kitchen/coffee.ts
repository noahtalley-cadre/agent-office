import * as THREE from 'three';
import { mesh, roundedBox, textPlane, toon } from '../../world/toon';

/** A hollow ceramic mug: its handle and dark coffee stay readable at office scale. */
export function mug(color = '#eab78e'): THREE.Group {
  const group = new THREE.Group();
  const ceramic = toon(color);
  group.add(mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.15, 16), ceramic, 0, 0.075, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.005, 16), toon('#4b281b'), 0, 0.151, 0));
  group.add(mesh(new THREE.TorusGeometry(0.071, 0.009, 6, 16).rotateX(Math.PI / 2), ceramic, 0, 0.154, 0));
  group.add(mesh(new THREE.TorusGeometry(0.045, 0.013, 7, 14), ceramic, 0.09, 0.085, 0));
  return group;
}

/** The fresh pot, its amber coffee, copper brewer and rising ribbons of steam. */
export function coffeePot() {
  const group = new THREE.Group();
  const ink = toon('#263a3b');
  const copper = toon('#c88559');
  group.add(mesh(roundedBox(0.85, 0.07, 0.73, 0.08), ink, 0, 0.035, 0));
  group.add(mesh(roundedBox(0.66, 0.65, 0.22, 0.08), toon('#e7e5d3'), 0, 0.39, -0.23));
  group.add(mesh(roundedBox(0.67, 0.16, 0.55, 0.08), copper, 0, 0.67, -0.05));
  group.add(mesh(new THREE.CylinderGeometry(0.18, 0.105, 0.1, 20), ink, 0, 0.54, 0.1));
  group.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 24), copper, 0, 0.085, 0.12));
  const power = toon('#b7e2b1', { emissive: '#487d3f' });
  group.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), power, 0.245, 0.42, -0.104));

  const pot = new THREE.Group();
  pot.name = 'glass-coffee-pot';
  pot.position.set(0, 0.11, 0.14);
  const silhouette = [[0.12, 0], [0.19, 0.04], [0.215, 0.11], [0.205, 0.22], [0.14, 0.31], [0.125, 0.34]];
  const glass = new THREE.MeshPhysicalMaterial({ color: '#d6f2ed', transparent: true, opacity: 0.27, roughness: 0.12, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  pot.add(mesh(new THREE.LatheGeometry(silhouette.map(([x, y]) => new THREE.Vector2(x, y)), 28), glass));
  const coffee = new THREE.MeshStandardMaterial({ color: '#62351e', roughness: 0.28 });
  pot.add(mesh(new THREE.CylinderGeometry(0.193, 0.16, 0.19, 28), coffee, 0, 0.125, 0));
  pot.add(mesh(new THREE.TorusGeometry(0.14, 0.012, 7, 24).rotateX(Math.PI / 2), copper, 0, 0.32, 0));
  pot.add(mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.035, 24), ink, 0, 0.35, 0));
  const handle = mesh(new THREE.TorusGeometry(0.13, 0.033, 8, 20, Math.PI * 1.5), ink, 0.23, 0.18, 0);
  handle.rotation.z = -Math.PI * 0.75;
  pot.add(handle);
  // The pointed spout and tiny measuring marks distinguish the carafe from a jar.
  const spout = mesh(new THREE.ConeGeometry(0.07, 0.16, 3), glass, -0.17, 0.295, 0);
  spout.rotation.z = 0.8;
  pot.add(spout);
  for (let i = 0; i < 3; i++) pot.add(mesh(new THREE.BoxGeometry(0.065, 0.008, 0.004), toon('#eee8d5'), -0.035, 0.1 + i * 0.055, 0.203));
  group.add(pot);

  const badge = textPlane('FRESH POT', { color: '#fff6d8', size: 32 });
  badge.scale.setScalar(0.25);
  badge.position.set(0, 0.68, 0.233);
  group.add(badge);
  const steam = new THREE.Group();
  group.add(steam);
  const curls: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 10 }, (_, j) => new THREE.Vector3(Math.sin(j * 0.8 + i) * 0.026, j * 0.026, 0)));
    const material = new THREE.MeshBasicMaterial({ color: '#f4fcf9', transparent: true, opacity: 0.3, depthWrite: false });
    const curl = mesh(new THREE.TubeGeometry(path, 14, 0.008, 5, false), material, (i - 1) * 0.075, 0.8, 0.06, false);
    curls.push(curl);
    steam.add(curl);
  }
  return {
    group,
    update(t: number) {
      curls.forEach((curl, i) => {
        const phase = (t * 0.3 + i / 3) % 1;
        curl.position.y = 0.77 + phase * 0.3;
        curl.position.x = (i - 1) * 0.075 + Math.sin(t * 1.2 + i) * 0.018;
        curl.scale.setScalar(0.7 + phase * 0.5);
        (curl.material as THREE.MeshBasicMaterial).opacity = Math.sin(phase * Math.PI) * 0.32;
      });
    },
  };
}
