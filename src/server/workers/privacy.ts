// Account ownership is an application permission, not an OS sandbox. The social office remains
// visible, but only the account that hired a worker receives its session or can operate it.
import type { Floor } from '../floor.js';
import type { Ctx } from '../office/context.js';
import type { Client } from '../office/client.js';
import type { ServerMsg, WorkerInfo } from '../../shared/protocol.js';

export const PRIVATE_SESSION = 'This session is private to the account that started it';

/** Shared-password guests retain access to legacy, unowned workers only. Admins have no bypass. */
export function canAccessWorker(floor: Floor | undefined, id: string, accountId: string | undefined): boolean {
  return !!floor?.workers.get(id) && floor.workers.ownerOf(id) === accountId;
}

/** An allowlist keeps future terminal metadata private unless explicitly made social. */
export function workerForViewer(ctx: Ctx, c: Pick<Client, 'accountId'>, w: WorkerInfo): WorkerInfo {
  if (canAccessWorker(ctx.workerFloor(w.id), w.id, c.accountId)) return w;
  return {
    id: w.id, kind: w.kind, deskId: w.deskId, name: w.name, color: w.color,
    status: w.status, acked: true, createdBy: w.createdBy, createdAt: w.createdAt,
    cols: w.cols, rows: w.rows, viewers: [], viewerIds: [], private: true,
    workedMs: w.workedMs, workingSince: w.workingSince, via: w.via,
  };
}

/** All browser delivery routes share this filter, including welcome/reconnect and desk screens. */
export function messageForViewer(ctx: Ctx, c: Client, msg: ServerMsg): ServerMsg | undefined {
  if (c.out || (c.accountId && !ctx.accounts.get(c.accountId))) return undefined;
  const allowed = (id: string) => canAccessWorker(ctx.workerFloor(id), id, c.accountId);
  switch (msg.t) {
    case 'worker.update': return { ...msg, worker: workerForViewer(ctx, c, msg.worker) };
    case 'welcome':
    case 'floor.enter': return { ...msg, workers: msg.workers.map((w) => workerForViewer(ctx, c, w)), services: { ...msg.services, items: msg.services.items.filter((s) => allowed(s.workerId)) } };
    case 'services': return { ...msg, state: { ...msg.state, items: msg.state.items.filter((s) => allowed(s.workerId)) } };
    case 'screen':
    case 'term.snapshot':
    case 'term.data':
    case 'term.typing':
    case 'worker.worktree': return allowed(msg.workerId) ? msg : undefined;
    case 'changes': return allowed(msg.state.workerId) ? msg : undefined;
    case 'changes.diff': return allowed(msg.workerId) || (!ctx.workerFloor(msg.workerId) && !!msg.error) ? msg : undefined;
    default: return msg;
  }
}
