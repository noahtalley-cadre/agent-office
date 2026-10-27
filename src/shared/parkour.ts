/** Desk Hop: the office's little lunchtime obstacle course. Distances are meters. */
export interface ParkourPad {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  color: string;
  label: string;
}

/** The southern aisle stays open on both sides of these compact, jumpable props. */
export const PARKOUR_PADS: readonly ParkourPad[] = [
  { x: -8.6, z: 8.3, y: 0.24, width: 1.6, depth: 1.6, color: '#45c9a4', label: 'START' },
  { x: -5.8, z: 8.8, y: 0.7, width: 1.4, depth: 1.4, color: '#f3ba52', label: '01' },
  { x: -3, z: 8, y: 1.1, width: 1.4, depth: 1.4, color: '#ee866f', label: '02' },
  { x: -0.2, z: 9, y: 0.65, width: 1.8, depth: 1.7, color: '#6fb5da', label: 'SAVE' },
  { x: 2.6, z: 8.1, y: 1.05, width: 1.4, depth: 1.4, color: '#a694cf', label: '04' },
  { x: 5.4, z: 8.8, y: 0.3, width: 1.8, depth: 1.7, color: '#45c9a4', label: 'FINISH' },
];
export const PARKOUR_SAVE = 3;
export const PARKOUR_PENALTY = 2000;
export const PARKOUR_LIMIT = 10 * 60 * 1000;
export const PARKOUR_SIGN = { x: -9.8, z: 8.3 };

/** Physical tops shared by the rendered fixtures and movement reachability tests. */
export function parkourPlatforms() {
  return PARKOUR_PADS.map(({ x, z, y, width, depth }) => ({
    minX: x - width / 2 - 0.018, maxX: x + width / 2 + 0.018,
    minZ: z - depth / 2 - 0.018, maxZ: z + depth / 2 + 0.018, top: y,
  }));
}

export interface ParkourSpot { x: number; y: number; z: number }
export interface ParkourRunner {
  id: string;
  name: string;
  color: string;
  checkpoint: number;
  falls: number;
}
export interface ParkourScore {
  name: string;
  color: string;
  timeMs: number;
  falls: number;
}
export interface ParkourState { runners: ParkourRunner[]; scores: ParkourScore[] }

/** Feet have landed on this platform, including the player's 32 cm contact radius. */
export function onParkourPad(p: ParkourSpot, index: number): boolean {
  const pad = PARKOUR_PADS[index];
  return !!pad && [p.x, p.y, p.z].every(Number.isFinite)
    && Math.abs(p.x - pad.x) <= pad.width / 2 + 0.18
    && Math.abs(p.z - pad.z) <= pad.depth / 2 + 0.18
    && Math.abs(p.y - pad.y) < 0.13;
}

export function parkourTime(ms: number): string {
  const seconds = Math.max(0, ms) / 1000;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
}
