import { PARKOUR_LIMIT, PARKOUR_PADS, PARKOUR_PENALTY, PARKOUR_SAVE, onParkourPad, type ParkourRunner, type ParkourScore, type ParkourSpot, type ParkourState } from '../shared/parkour.js';

interface Entrant { id: string; owner: string; name: string; color: string }
interface Run extends Entrant { started: number; landed: number; checkpoint: number; falls: number }
export interface ParkourProgress { checkpoint: number; elapsedMs: number; falls: number }
interface Landing extends ParkourProgress { score?: ParkourScore; best?: boolean }

/** One floor's casual competition. No timers, disk writes, or client-supplied finish times. */
export class ParkourRace {
  private runs = new Map<string, Run>();
  private scores = new Map<string, ParkourScore>();

  constructor(private now: () => number = Date.now) {}

  private run(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (run && this.now() - run.started > PARKOUR_LIMIT) {
      this.runs.delete(id);
      return;
    }
    return run;
  }

  start(who: Entrant, at: ParkourSpot): boolean {
    if (!onParkourPad(at, 0)) return false;
    this.runs.set(who.id, { ...who, started: this.now(), landed: this.now(), checkpoint: 0, falls: 0 });
    return true;
  }

  progress(id: string): ParkourProgress | null {
    const run = this.run(id);
    return run ? { checkpoint: run.checkpoint, elapsedMs: this.now() - run.started + run.falls * PARKOUR_PENALTY, falls: run.falls } : null;
  }

  land(id: string, checkpoint: number, at: ParkourSpot): Landing | null {
    const run = this.run(id);
    if (!run || !Number.isInteger(checkpoint) || checkpoint !== run.checkpoint + 1 || !onParkourPad(at, checkpoint)) return null;
    // Prevent packet replay and instantaneous hops. Movement itself is the office's normal peer sync.
    if (this.now() - run.landed < 250) return null;
    run.landed = this.now();
    run.checkpoint = checkpoint;
    const progress = this.progress(id)!;
    if (checkpoint < PARKOUR_PADS.length - 1) return progress;
    const score = { name: run.name, color: run.color, timeMs: progress.elapsedMs, falls: run.falls };
    const previous = this.scores.get(run.owner);
    const best = !previous || score.timeMs < previous.timeMs;
    if (best) this.scores.set(run.owner, score);
    // This is a lunchtime board, bounded even on a public office server.
    if (this.scores.size > 50) {
      const slowest = [...this.scores].sort((a, b) => b[1].timeMs - a[1].timeMs)[0];
      this.scores.delete(slowest[0]);
    }
    this.runs.delete(id);
    return { ...progress, score, best };
  }

  retry(id: string): ParkourProgress | null {
    const run = this.run(id);
    if (!run) return null;
    run.checkpoint = run.checkpoint >= PARKOUR_SAVE ? PARKOUR_SAVE : 0;
    run.falls++;
    run.landed = this.now();
    return this.progress(id);
  }

  leave(id: string): boolean { return this.runs.delete(id); }

  state(): ParkourState {
    const runners: ParkourRunner[] = [];
    for (const id of this.runs.keys()) {
      const run = this.run(id);
      if (run) runners.push({ id, name: run.name, color: run.color, checkpoint: run.checkpoint, falls: run.falls });
    }
    return { runners, scores: [...this.scores.values()].sort((a, b) => a.timeMs - b.timeMs).slice(0, 10) };
  }
}
