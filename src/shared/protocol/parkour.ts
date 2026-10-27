import type { ParkourState, ParkourScore } from '../parkour.js';

export type ParkourClientMsg =
  | { t: 'parkour.sync' }
  | { t: 'parkour.start' }
  | { t: 'parkour.checkpoint'; checkpoint: number }
  | { t: 'parkour.retry' }
  | { t: 'parkour.leave' };

export type ParkourServerMsg =
  | { t: 'parkour.state'; state: ParkourState }
  | { t: 'parkour.run'; checkpoint: number; elapsedMs: number; falls: number; warp?: boolean }
  | { t: 'parkour.finish'; score: ParkourScore; best: boolean }
  | { t: 'parkour.stopped'; reason: string };
