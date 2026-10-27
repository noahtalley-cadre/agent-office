import { PARKOUR_PADS, PARKOUR_LIMIT, onParkourPad, parkourTime } from '../../../shared/parkour';
import type { Ctx } from '../../core/context';
import { aside, hintTitle, key, onE } from '../../core/hint';
import { store } from '../../state';
import { modalOpen, toast } from '../../ui/dom';
import { ParkourUI } from './ui';

declare module '../../world/types' {
  interface InteractKinds { parkour: true; }
}

/** The running and jumping stay the player's own: this feature only times, marks, and resets hops. */
export function installParkour(ctx: Ctx) {
  const ui = new ParkourUI();
  const player = ctx.player;
  let phase: 'idle' | 'countdown' | 'waiting' | 'running' | 'retry' = 'idle';
  let deadline = 0;
  let checkpoint = 0;
  let falls = 0;
  let clockAt = 0;
  let elapsed = 0;
  let sentAt = 0;
  let finishUntil = 0;
  let floor: string | null = null;
  const active = () => phase !== 'idle';
  const inOffice = () => ctx.inOffice() && !ctx.upTop() && !ctx.trip();

  function place(index: number) {
    const pad = PARKOUR_PADS[index];
    const next = PARKOUR_PADS[Math.min(index + 1, PARKOUR_PADS.length - 1)];
    player.pos.set(pad.x, pad.y, pad.z);
    player.vy = 0;
    player.grounded = true;
    player.stepOffset = 0;
    player.camYaw = Math.atan2(-(next.x - pad.x), -(next.z - pad.z));
    player.facing = player.camYaw + Math.PI;
    player.lookPitch = -0.16;
    player.updateCamera(true);
  }
  const hold = () => { const pad = PARKOUR_PADS[checkpoint]; player.pos.set(pad.x, pad.y, pad.z); player.moving = false; };
  function release() { if (player.rig === hold) player.rig = null; }
  function moveNow() {
    ctx.net.send({ t: 'move', x: player.pos.x, y: player.pos.y, z: player.pos.z, rotY: player.facing, moving: player.moving });
  }
  function stop(send = true) {
    if (active() && send) ctx.net.send({ t: 'parkour.leave' });
    phase = 'idle';
    release();
    finishUntil = 0;
    ui.clear();
    ctx.office.parkour.progress(null);
    ctx.hint.invalidate();
  }
  function start() {
    if (!inOffice() || !ctx.net.up) return;
    ctx.activities.stopAll('start');
    player.stopWalking();
    if (player.seat) { player.stand(); ctx.net.send({ t: 'sit' }); }
    checkpoint = falls = elapsed = 0;
    floor = store.floor;
    finishUntil = 0;
    place(0);
    phase = 'countdown';
    deadline = performance.now() + 3000;
    player.clearKeys();
    player.rig = hold;
    ctx.office.parkour.progress(0);
    ctx.hint.invalidate();
  }
  function retry() {
    if (phase !== 'running') return;
    phase = 'retry';
    deadline = performance.now() + 5000;
    ctx.net.send({ t: 'parkour.retry' });
  }
  function sync() {
    stop(false);
    ui.close();
    ui.setState({ runners: [], scores: [] });
    ctx.net.send({ t: 'parkour.sync' });
  }

  ctx.interactions.define('parkour', {
    reach: 3.5,
    hint: () => ({ k: '', parts: [hintTitle('↗ Desk Hop'), aside('a little friendly competition'), key('E', 'Race & scores')] }),
    use: onE(() => { if (inOffice()) ui.show(start); }),
  });
  ctx.activities.add({
    id: 'parkour', active, stop: () => stop(),
    key(e) {
      if (e.code === 'KeyR' || e.code === 'KeyX') {
        if (!e.repeat) e.code === 'KeyR' ? retry() : stop();
        e.preventDefault();
        return true;
      }
      return false;
    },
    hint: (el) => ctx.hint.draw(el, `parkour-${checkpoint}`, () => [hintTitle('↗ Desk Hop'), key('Space', 'Jump'), key('Shift', 'Sprint'), key('R', 'Checkpoint +2s'), key('X', 'Quit')]),
  });
  ctx.messages.on('welcome', sync);
  ctx.messages.on('floor.enter', sync);
  ctx.messages.on('map', sync);
  ctx.net.onStatus((up) => { if (!up) { stop(false); ui.close(); } });
  ctx.messages.on('parkour.state', (m) => ui.setState(m.state));
  ctx.messages.on('parkour.stopped', (m) => { if (active()) { stop(false); toast(m.reason); } });
  ctx.messages.on('parkour.run', (m) => {
    if (!active()) return;
    const was = checkpoint;
    const first = phase === 'waiting';
    checkpoint = m.checkpoint;
    falls = m.falls;
    elapsed = m.elapsedMs;
    clockAt = performance.now();
    phase = 'running';
    release();
    if (m.warp || first) { place(checkpoint); player.clearKeys(); moveNow(); }
    if (m.warp) ctx.sound.arcade('over');
    else if (checkpoint > was) ctx.sound.arcade('land');
    ctx.office.parkour.progress(checkpoint);
    ctx.hint.invalidate();
  });
  ctx.messages.on('parkour.finish', (m) => {
    if (!active()) return;
    stop(false);
    ui.finish(m.score, m.best);
    finishUntil = performance.now() + 10000;
    ui.draw(m.best ? 'DESK HOP  /  PERSONAL BEST' : 'DESK HOP  /  FINISHED', parkourTime(m.score.timeMs), `${m.score.falls} retries · Race again at the green start`);
    ctx.sound.arcade('clear', 3);
    const p = PARKOUR_PADS[PARKOUR_PADS.length - 1];
    ctx.confetti.burst(p.x, p.y + 2, p.z, 90);
  });

  ctx.ticks.add('moved', ({ now }) => {
    if (finishUntil && now > finishUntil) { finishUntil = 0; ui.clear(); }
    if (!active()) return;
    if (!inOffice() || floor !== store.floor) { stop(); return; }
    if (phase === 'countdown') {
      ui.draw('DESK HOP  /  GET READY', String(Math.max(1, Math.ceil((deadline - now) / 1000))), 'Space to jump · follow the arrows');
      if (now >= deadline) {
        phase = 'waiting';
        deadline = now + 5000;
        moveNow();
        ctx.net.send({ t: 'parkour.start' });
      }
      return;
    }
    if (phase === 'waiting' || phase === 'retry') {
      ui.draw('DESK HOP', phase === 'retry' ? '+2 seconds' : 'Ready…', phase === 'retry' ? 'Back to your checkpoint' : 'Starting the shared clock');
      if (now > deadline) { stop(); toast('The race server did not respond. Try again at the start.', 'warn'); }
      return;
    }
    const time = elapsed + now - clockAt;
    ui.drawRun(time, checkpoint, falls);
    if (time > PARKOUR_LIMIT) { stop(); return; }
    if (modalOpen()) return;
    if (player.grounded && onParkourPad(player.pos, checkpoint + 1) && now - sentAt > 250) {
      sentAt = now;
      moveNow();
      ctx.net.send({ t: 'parkour.checkpoint', checkpoint: checkpoint + 1 });
    } else if ((player.grounded && player.pos.y < 0.15) || player.pos.y < -1) retry();
    else if (player.pos.x < -12 || player.pos.x > 9 || player.pos.z < 5.5 || player.pos.z > 11.2) retry();
  });
}
