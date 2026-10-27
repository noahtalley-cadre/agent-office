import { PARKOUR_PADS, parkourTime, type ParkourState, type ParkourScore } from '../../../shared/parkour';
import { h, openModal, type Modal } from '../../ui/dom';
import './ui.css';

/** A quiet race overlay and the start/score card, using the office's normal mouse-return modal. */
export class ParkourUI {
  private panel = h('aside.parkour-hud', { 'aria-label': 'Desk Hop race', hidden: true });
  private title = h('div.parkour-eyebrow', {}, 'DESK HOP');
  private clock = h('strong.parkour-clock', {});
  private detail = h('div.parkour-detail', {});
  private rivals = h('div.parkour-rivals', {});
  private modal: Modal | null = null;
  private scores: HTMLElement | null = null;
  private state: ParkourState = { runners: [], scores: [] };
  private result: { score: ParkourScore; best: boolean } | null = null;

  constructor() {
    this.panel.append(this.title, this.clock, this.detail, this.rivals);
    document.body.append(this.panel);
  }

  setState(state: ParkourState) {
    this.state = state;
    this.rivals.textContent = state.runners.length ? `${state.runners.length} racing · ${state.runners.slice(0, 3).map((p) => p.name).join(', ')}` : 'Your next personal best is waiting.';
    this.drawScores();
  }

  show(start: () => void) {
    if (this.modal) return;
    this.scores = h('div.parkour-scores');
    const go = h('button.btn.primary.parkour-start', { type: 'button', onclick: () => { this.close(); start(); } }, 'Let’s race  →');
    const content = h('section.panel.parkour-menu', { role: 'dialog', 'aria-label': 'Desk Hop parkour' },
      h('header', {}, h('span.parkour-eyebrow', {}, 'THE FIVE-MINUTE BREAK')),
      h('div.parkour-intro', {}, h('span.parkour-badge', {}, '↗'), h('h2', {}, 'Desk Hop'),
        h('p', {}, 'A little friendly competition. Hop the colored storage trunks, save your progress halfway, and race your teammates to the finish.')),
      h('div.parkour-controls', {}, h('span', {}, h('kbd', {}, 'W A S D'), ' Move'), h('span', {}, h('kbd', {}, 'Space'), ' Jump'), h('span', {}, h('kbd', {}, 'Shift'), ' Sprint')),
      h('p.parkour-rule', {}, 'Land on every platform in order. Blue saves your progress. Falling or pressing R returns you to your checkpoint and adds 2 seconds. X ends a run.'),
      this.result ? h('div.parkour-last', {}, this.result.best ? 'PERSONAL BEST  ' : 'LAST RUN  ', h('strong', {}, parkourTime(this.result.score.timeMs)), ` · ${this.result.score.falls} retries`) : null,
      h('div.parkour-score-heading', {}, h('h3', {}, 'This floor’s fastest'), h('span', {}, 'This server session')),
      this.scores,
      h('footer', {}, h('span', {}, 'Everyone can race together.'), go),
    );
    this.modal = openModal(content, { doing: '↗ checking the Desk Hop leaderboard', onClose: () => { this.modal = null; this.scores = null; } });
    this.drawScores();
  }

  close() { this.modal?.close(); }
  clear() { this.panel.hidden = true; }
  finish(score: ParkourScore, best: boolean) { this.result = { score, best }; }

  draw(label: string, time: string, detail: string) {
    this.panel.hidden = false;
    this.title.textContent = label;
    this.clock.textContent = time;
    this.detail.textContent = detail;
  }

  drawRun(elapsed: number, checkpoint: number, falls: number) {
    this.draw('DESK HOP  /  LIVE', parkourTime(elapsed), `${checkpoint}/${PARKOUR_PADS.length - 1} hops · ${falls} retries · R retry · X quit`);
  }

  private drawScores() {
    if (!this.scores) return;
    this.scores.replaceChildren(...(this.state.scores.length ? this.state.scores.map((score, i) =>
      h('div.parkour-score', {}, h('span.parkour-rank', {}, String(i + 1).padStart(2, '0')),
        h('span.parkour-runner', {}, score.name), h('span.parkour-falls', {}, `${score.falls} retries`), h('strong', {}, parkourTime(score.timeMs))))
      : [h('p.parkour-empty', {}, 'The podium is yours to claim. Finish a run to set the first time.')]));
  }
}
