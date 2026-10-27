import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { messaging } from '../src/server/office/messaging.js';
import { workerHandlers } from '../src/server/ws/handlers/workers.js';
import { queueHandlers } from '../src/server/ws/handlers/queue.js';
import { meetingHandlers } from '../src/server/ws/handlers/meetings.js';
import { waitingInOrder, needyFirst } from '../src/client/nextup.js';
import { changesHandlers } from '../src/server/ws/handlers/changes.js';
import type { Ctx } from '../src/server/office/context.js';
import type { Client } from '../src/server/office/client.js';
import type { Floor } from '../src/server/floor.js';
import type { ServerMsg, WorkerInfo } from '../src/shared/protocol.js';

const info: WorkerInfo = {
  id: 'worker-one', kind: 'agent', deskId: 'desk-1', name: 'Pixel', color: '#fff', status: 'idle', acked: true,
  createdBy: 'Alice', createdAt: 1, cols: 80, rows: 24, viewers: [], viewerIds: [],
  prompt: 'confidential prompt', activity: 'secret tool input', sessionId: 'secret-session', title: 'secret title',
  task: { name: 'secret task', summary: 'private summary' }, worktree: { path: 'private/path', branch: 'secret', base: '123' },
};

function fixture(owner: string | null = 'alice') {
  const messages = new Map<string, ServerMsg[]>();
  const clients = new Map<string, Client>();
  for (const [id, accountId, admin] of [['alice', 'alice', false], ['bob', 'bob', false], ['admin', 'admin', true], ['guest', undefined, true]] as const) {
    const inbox: ServerMsg[] = [];
    messages.set(id, inbox);
    clients.set(id, {
      id, accountId, admin, peer: { name: id, floor: 'floor-one' }, attached: new Set([info.id]), typingAt: new Map(),
      ws: { readyState: WebSocket.OPEN, bufferedAmount: 0, send: (raw: string) => inbox.push(JSON.parse(raw)) },
    } as unknown as Client);
  }
  let writes = 0;
  const floor = {
    id: 'floor-one', github: { refresh: async () => {}, pulls: { items: [] } }, workers: {
      get: (id: string) => id === info.id ? info : undefined,
      officeDefault: { provider: 'custom' }, list: () => [info], ownerOf: () => owner ?? undefined,
      attach: () => ({ data: 'secret terminal', cols: 80, rows: 24 }),
      write: () => { writes++; }, resize: () => { writes++; }, prompt: () => { writes++; }, resume: () => { writes++; },
      inspectWorktree: async () => { writes++; return {}; }, rebuild: async () => { writes++; return {}; },
      openPr: async () => { writes++; return { prs: [], failed: [] }; },
    }, sendHome: async () => { writes++; return {}; },
    meetings: { state: () => ({ current: { owner: 'alice', status: 'done' } }), start: () => { writes++; }, stop: () => { writes++; }, clear: () => { writes++; } },
    queue: { state: () => ({ tasks: [{ id: 'alice-task', owner: 'alice', status: 'done' }] }), remove: () => { writes++; }, retry: () => { writes++; }, move: () => { writes++; }, clear: () => { writes++; } },
    changes: { watch: () => { writes++; }, diff: async () => { writes++; return {}; }, discard: async () => { writes++; }, commit: async () => { writes++; }, pullRequest: async () => { writes++; } },
  } as unknown as Floor;
  const ctx = {
    clients, floors: new Map([[floor.id, floor]]), workerFloor: (id: string) => id === info.id ? floor : undefined,
    floorOf: () => floor, withGitHub: (_c: Client, go: () => void) => go(),
    signins: { apply: () => ({}) }, accounts: { get: (id: string) => ({ id }) },
    withSignIn: (_c: Client, _kind: string, go: () => void) => go(), withFreshBase: (_c: Client, _floor: Floor, go: () => void) => go(), claudeFor: () => undefined,
  } as unknown as Ctx;
  Object.assign(ctx, messaging(ctx));
  return { ctx, floor, messages, clients, writes: () => writes };
}

test('worker broadcasts preserve occupied desks while withholding private details from teammates and admins', () => {
  const f = fixture();
  f.ctx.toFloor(f.floor, { t: 'worker.update', worker: info });
  const own = f.messages.get('alice')![0] as Extract<ServerMsg, { t: 'worker.update' }>;
  assert.equal(own.worker.prompt, 'confidential prompt');
  for (const id of ['bob', 'admin', 'guest']) {
    const msg = f.messages.get(id)![0] as Extract<ServerMsg, { t: 'worker.update' }>;
    assert.equal(msg.worker.id, info.id);
    assert.equal(msg.worker.deskId, 'desk-1');
    assert.equal(msg.worker.createdBy, 'Alice');
    assert.equal(msg.worker.prompt, undefined);
    assert.equal(msg.worker.activity, undefined);
    assert.equal(msg.worker.sessionId, undefined);
    assert.equal(msg.worker.worktree, undefined);
    assert.equal(msg.worker.task, undefined);
    assert.equal(msg.worker.title, undefined);
  }
});

test('all terminal delivery paths suppress content for everyone except its owner', () => {
  const f = fixture();
  const secrets: ServerMsg[] = [
    { t: 'screen', workerId: info.id, cols: 80, rows: 24, lines: { 0: [['secret', 0, 0, 0]] }, cursor: [0, 0], full: true },
    { t: 'term.snapshot', workerId: info.id, data: 'secret', cols: 80, rows: 24 },
    { t: 'term.data', workerId: info.id, data: 'secret' },
    { t: 'changes.diff', workerId: info.id, path: 'secret.ts', diff: 'secret', truncated: false },
  ];
  for (const msg of secrets) {
    f.ctx.broadcast(msg);
    f.ctx.toFloor(f.floor, msg);
    for (const c of f.clients.values()) f.ctx.sendTo(c, msg);
  }
  assert.equal(f.messages.get('alice')!.length, secrets.length * 3);
  for (const id of ['bob', 'admin', 'guest']) assert.deepEqual(f.messages.get(id), []);
});

test('guessed worker IDs and forged attachment state cannot read, type, restart, stop or alter another account’s session', async () => {
  const f = fixture();
  for (const id of ['bob', 'admin', 'guest']) {
    const c = f.clients.get(id)!;
    workerHandlers['worker.attach'](f.ctx, c, { t: 'worker.attach', workerId: info.id });
    workerHandlers['term.input'](f.ctx, c, { t: 'term.input', workerId: info.id, data: 'secret-command' });
    workerHandlers['term.resize'](f.ctx, c, { t: 'term.resize', workerId: info.id, cols: 10, rows: 10 });
    workerHandlers['worker.resume'](f.ctx, c, { t: 'worker.resume', workerId: info.id });
    workerHandlers['worker.kill'](f.ctx, c, { t: 'worker.kill', workerId: info.id });
    workerHandlers['worker.prompt'](f.ctx, c, { t: 'worker.prompt', workerId: info.id, prompt: 'changed task' });
    workerHandlers['worker.worktree'](f.ctx, c, { t: 'worker.worktree', workerId: info.id });
    workerHandlers['worker.rebuild'](f.ctx, c, { t: 'worker.rebuild', workerId: info.id, all: true });
    workerHandlers['worker.pr'](f.ctx, c, { t: 'worker.pr', workerId: info.id });
    changesHandlers['changes.watch'](f.ctx, c, { t: 'changes.watch', workerId: info.id });
    changesHandlers['changes.diff'](f.ctx, c, { t: 'changes.diff', workerId: info.id, path: 'secret.ts' });
    changesHandlers['changes.discard'](f.ctx, c, { t: 'changes.discard', workerId: info.id });
    changesHandlers['changes.commit'](f.ctx, c, { t: 'changes.commit', workerId: info.id, message: 'changed' });
    changesHandlers['changes.pr'](f.ctx, c, { t: 'changes.pr', workerId: info.id, title: 'changed', body: 'changed' });
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.writes(), 0);
  for (const id of ['bob', 'admin', 'guest']) assert.equal(f.messages.get(id)!.some((m) => m.t === 'term.snapshot'), false);
  const owner = f.clients.get('alice')!;
  workerHandlers['worker.attach'](f.ctx, owner, { t: 'worker.attach', workerId: info.id });
  assert.equal(f.messages.get('alice')!.at(-1)?.t, 'term.snapshot');
  workerHandlers['term.input'](f.ctx, owner, { t: 'term.input', workerId: info.id, data: 'own command' });
  assert.equal(f.writes(), 1);
});


test('meeting and queue controls cannot stop or relaunch workers using another account’s sign-ins', () => {
  const f = fixture();
  const bob = f.clients.get('bob')!;
  meetingHandlers['meeting.start'](f.ctx, bob, { t: 'meeting.start', pattern: 'debate', prompt: 'replacement meeting', roles: [] });
  meetingHandlers['meeting.stop'](f.ctx, bob, { t: 'meeting.stop' });
  meetingHandlers['meeting.clear'](f.ctx, bob, { t: 'meeting.clear' });
  queueHandlers['queue.retry'](f.ctx, bob, { t: 'queue.retry', taskId: 'alice-task' });
  queueHandlers['queue.remove'](f.ctx, bob, { t: 'queue.remove', taskId: 'alice-task' });
  queueHandlers['queue.move'](f.ctx, bob, { t: 'queue.move', taskId: 'alice-task', delta: 1 });
  queueHandlers['queue.clear'](f.ctx, bob, { t: 'queue.clear' });
  assert.equal(f.writes(), 0);
});

test('legacy shared-password sessions can access unowned workers, while accounts cannot', () => {
  const f = fixture(null);
  workerHandlers['worker.attach'](f.ctx, f.clients.get('guest')!, { t: 'worker.attach', workerId: info.id });
  assert.equal(f.messages.get('guest')!.at(-1)?.t, 'term.snapshot');
  workerHandlers['worker.attach'](f.ctx, f.clients.get('alice')!, { t: 'worker.attach', workerId: info.id });
  assert.equal(f.messages.get('alice')!.some((m) => m.t === 'term.snapshot'), false);
});

test('private workers stay visible without entering another person’s waiting list', () => {
  const workers = [{ ...info, status: 'needs_input' as const, private: true }, { ...info, id: 'own', status: 'needs_input' as const }];
  assert.deepEqual(waitingInOrder(workers).map((w) => w.id), ['own']);
  assert.deepEqual(needyFirst(workers).map((w) => w.id), ['own', 'worker-one']);
});

test('global merged-PR cleanup preserves account-owned sessions while retiring shared workers', async (t) => {
  const { Floor } = await import('../src/server/floor.js');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const across of [false, true]) {
    const privateWorker = { ...info, worktree: { path: 'private', branch: 'private', base: 'base' }, ...(across ? { repos: [{ floor: 'other', name: 'other', dir: '/other', path: 'other', branch: 'private', base: 'base' }] } : {}) };
    const sharedWorker = { ...info, id: 'shared-worker', worktree: { path: 'shared', branch: 'shared', base: 'base' } };
    const workers = new Map([privateWorker, sharedWorker].map((w) => [w.id, w]));
    const merged = [{ number: 1, state: 'MERGED', headRefName: 'private' }, { number: 2, state: 'MERGED', headRefName: 'shared' }];
    // Exercise the real floor scheduler and cleanup decision with an in-memory worker lifecycle.
    const floor = Object.assign(Object.create(Floor.prototype), {
      ctx: { leaveOnMerge: () => true, floor: () => ({ github: { pulls: { items: merged } } }), toast: () => {} },
      workers: {
        list: () => [...workers.values()], get: (id: string) => workers.get(id),
        ownerOf: (id: string) => id === privateWorker.id ? 'alice' : undefined,
        kill: async (id: string) => { workers.delete(id); return {}; }, holdsWork: async () => false,
      },
      github: { pulls: { items: merged } }, queue: { state: () => ({ tasks: [] }) }, landing: new Set(),
    }) as Floor;
    floor.sendLandedHome();
    t.mock.timers.tick(2000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(workers.has(privateWorker.id), true, across ? 'private worker across repositories stays' : 'private worker stays');
    assert.equal(workers.has(sharedWorker.id), false, 'legacy shared worker still goes home automatically');
  }
});
