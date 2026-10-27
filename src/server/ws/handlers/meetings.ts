// The meeting room: calling a meeting, stopping it, and clearing the table.
import { isAgentEffort, isAgentProvider, type MeetingClientMsg, type MeetingRequest } from '../../../shared/protocol.js';
import { OPEN_CODE_MODEL_MAX } from '../../../shared/providers.js';
import { str } from '../../office/input.js';
import { here } from './common.js';
import { PRIVATE_SESSION } from '../../workers/privacy.js';
import type { Ctx } from '../../office/context.js';
import type { Client } from '../../office/client.js';
import type { Floor } from '../../floor.js';
import type { HandlerMap, ViewPieces } from './types.js';

export const meetingView: ViewPieces['meeting'] = (_ctx, floor) => floor?.meetings.state() ?? { current: null, past: [] };

/** A replacement meeting dismisses the old workers too, so it needs the same ownership check. */
function canManage(ctx: Ctx, c: Client, floor: Floor): boolean {
  const current = floor.meetings.state().current;
  if (!current || current.owner === c.accountId) return true;
  ctx.warn(c, PRIVATE_SESSION);
  return false;
}

export const meetingHandlers = {
  'meeting.start'(ctx, c, msg) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    if (!floor || !canManage(ctx, c, floor)) return;
    if (msg.provider !== undefined && (!isAgentProvider(msg.provider) || !floor.project.agentProviders.includes(msg.provider))) {
      ctx.warn(c, 'Unknown agent provider');
      return;
    }
    const count = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : undefined);
    const request: MeetingRequest = {
      pattern: msg.pattern,
      prompt: str(msg.prompt, 20000),
      title: str(msg.title, 200) || undefined,
      output: str(msg.output, 300) || undefined,
      roles: Array.isArray(msg.roles) ? msg.roles.slice(0, 8).map((r) => str(r, 80)) : [],
      parts: Array.isArray(msg.parts) ? msg.parts.slice(0, 200).map((p) => str(p, 500)) : undefined,
      pr: count(msg.pr),
      issue: count(msg.issue),
      rounds: count(msg.rounds),
      provider: msg.provider,
      model: msg.model === undefined ? undefined : str(msg.model, OPEN_CODE_MODEL_MAX + 1),
      effort: isAgentEffort(msg.effort) ? msg.effort : undefined,
    };
    ctx.withSignIn(c, ctx.claudeFor(request.provider ?? floor.workers.officeDefault.provider), () => ctx.withFreshBase(c, floor, () => { if (canManage(ctx, c, floor)) ctx.warn(c, floor.meetings.start(request, who, c.accountId)); }));
  },
  'meeting.stop'(ctx, c) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    if (floor && canManage(ctx, c, floor)) ctx.warn(c, floor.meetings.stop(who));
  },
  'meeting.clear'(ctx, c) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    if (floor && canManage(ctx, c, floor)) ctx.warn(c, floor.meetings.clear(who));
  },
} satisfies HandlerMap<MeetingClientMsg>;
