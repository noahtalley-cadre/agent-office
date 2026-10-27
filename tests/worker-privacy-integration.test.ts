// Real sessions, WebSockets, PTY output, HTTP search and file routes: no authorization mocks.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import WebSocket from 'ws';
import { loadConfig } from '../src/server/config.js';
import { startServer } from '../src/server/server.js';
import type { ClientMsg, ServerMsg, WorkerInfo } from '../src/shared/protocol.js';

let root: string;
let office: Awaited<ReturnType<typeof startServer>>;
let base: string;
let alice: Browser;
let bob: Browser;
let worker: WorkerInfo;
const SECRET = 'privacy-integration-secret';

class Browser {
  messages: ServerMsg[] = [];
  constructor(readonly ws: WebSocket, readonly cookie: string) {
    ws.on('message', (raw) => this.messages.push(JSON.parse(raw.toString())));
  }
  static async connect(cookie: string) {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws', { headers: { cookie, origin: base } });
    const browser = new Browser(ws, cookie);
    await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    return browser;
  }
  async take<T extends ServerMsg['t']>(t: T, matches: (m: Extract<ServerMsg, { t: T }>) => boolean = () => true) {
    for (let i = 0; i < 200; i++) {
      const index = this.messages.findIndex((m) => m.t === t && matches(m as Extract<ServerMsg, { t: T }>));
      if (index >= 0) return this.messages.splice(index, 1)[0] as Extract<ServerMsg, { t: T }>;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(`No ${t}: received ${this.messages.map((m) => m.t).join(', ')}`);
  }
  send(message: ClientMsg) { this.ws.send(JSON.stringify(message)); }
  request(url: string, body?: string) {
    return fetch(base + url, { method: body === undefined ? 'GET' : 'POST', headers: { cookie: this.cookie, origin: base, 'content-type': 'text/plain' }, body });
  }
}

before(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'office-private-'));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  const publicDir = path.join(root, 'public');
  for (const dir of [project, home, publicDir, path.join(root, 'projects')]) mkdirSync(dir);
  const agent = path.join(root, 'private-test-agent');
  writeFileSync(agent, `#!${process.execPath}\nprocess.stdout.write('${SECRET}\\r\\n');\nprocess.stdin.on('data', data => process.stdout.write(data));\n`);
  chmodSync(agent, 0o755);
  const port = await new Promise<number>((resolve) => {
    const listener = net.createServer().listen(0, '127.0.0.1', () => {
      const port = (listener.address() as net.AddressInfo).port;
      listener.close(() => resolve(port));
    });
  });
  for (const key of Object.keys(process.env)) if (key.startsWith('AGENT_OFFICE_')) delete process.env[key];
  const cfg = loadConfig([project, '--home', home, '--projects', path.join(root, 'projects'), '--port', String(port), '--password', 'private-test', '--no-open', '--weather', 'clear', '--agent', agent]);
  office = await startServer(cfg, { publicDir });
  base = `http://127.0.0.1:${port}`;
  const join = async (name: string, role: 'admin' | 'member') => {
    const invite = office.accounts.invite('test', role, name);
    assert.notEqual(typeof invite, 'string');
    if (typeof invite === 'string') throw new Error(invite);
    const response = await fetch(base + '/api/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: invite.token, name, password: 'test-password' }) });
    assert.equal(response.status, 200);
    return Browser.connect(response.headers.get('set-cookie')!.split(';')[0]);
  };
  alice = await join('Alice', 'member');
  bob = await join('Bob', 'admin');
  await alice.take('welcome');
  await bob.take('welcome');
  alice.send({ t: 'worker.spawn', deskId: 'desk-1', prompt: 'private starting prompt' });
  worker = (await alice.take('worker.update')).worker;
  alice.send({ t: 'worker.attach', workerId: worker.id });
  await alice.take('term.snapshot');
  // Wait for the real PTY to print and parse its initial output before searching it.
  await alice.take('term.data', (m) => m.data.includes(SECRET));
});

after(() => {
  alice?.ws.terminate();
  bob?.ws.terminate();
  office?.shutdown();
  if (root) rmSync(root, { recursive: true, force: true });
});

test('another signed-in admin sees the occupied desk but no terminal, prompt or live screen', async () => {
  const seen = (await bob.take('worker.update', (m) => m.worker.id === worker.id)).worker;
  assert.equal(seen.createdBy, 'Alice');
  assert.equal(seen.private, true);
  assert.equal(seen.prompt, undefined);
  bob.send({ t: 'worker.attach', workerId: worker.id });
  await bob.take('toast', (m) => m.level === 'warn');
  bob.send({ t: 'term.input', workerId: worker.id, data: 'unauthorized mutation\r' });
  bob.send({ t: 'worker.resume', workerId: worker.id });
  bob.send({ t: 'worker.kill', workerId: worker.id });
  bob.send({ t: 'ping', at: 1 });
  await bob.take('pong', (m) => m.at === 1);
  assert.ok(office.floors()[0].workers.get(worker.id));
  assert.equal(bob.messages.some((m) => ['screen', 'term.data', 'term.snapshot'].includes(m.t)), false);
  assert.equal(JSON.stringify(bob.messages).includes(SECRET), false);
});

test('reconnect snapshots and floor changes remain private', async () => {
  const reconnect = await Browser.connect(bob.cookie);
  try {
    const welcome = await reconnect.take('welcome');
    assert.equal(welcome.workers.find((w) => w.id === worker.id)?.private, true);
    assert.equal(welcome.workers.find((w) => w.id === worker.id)?.prompt, undefined);
    reconnect.send({ t: 'floor.go', floor: '@roof' });
    await reconnect.take('floor.enter');
    reconnect.send({ t: 'floor.go', floor: office.floors()[0].id });
    const floor = await reconnect.take('floor.enter');
    assert.equal(floor.workers.find((w) => w.id === worker.id)?.private, true);
    reconnect.send({ t: 'ping', at: 2 });
    await reconnect.take('pong');
    assert.equal(reconnect.messages.some((m) => m.t === 'screen'), false);
  } finally { reconnect.ws.terminate(); }
});

test('HTTP search only returns the requesting account’s terminal and file routes reject other accounts', async () => {
  const floor = office.floors()[0].id;
  const query = `/api/search?floor=${floor}&q=${SECRET}`;
  const own = await (await alice.request(query)).json() as { terminals: { workerId: string }[] };
  const other = await (await bob.request(query)).json() as { terminals: unknown[]; more: boolean };
  assert.equal(own.terminals[0]?.workerId, worker.id);
  assert.deepEqual(other.terminals, []);
  assert.equal(other.more, false);
  assert.equal((await bob.request(`/api/changes/file?floor=${floor}&worker=${worker.id}&path=private.png&side=new`)).status, 403);
  assert.equal((await bob.request(`/api/term/drop?floor=${floor}&worker=${worker.id}&name=private.txt`, 'denied')).status, 403);
  assert.equal((await alice.request(`/api/term/drop?floor=${floor}&worker=${worker.id}&name=own.txt`, 'allowed')).status, 200);
});

test('worker coordination tokens cannot list or control another account’s workers', async () => {
  bob.send({ t: 'worker.spawn', deskId: 'desk-2', prompt: 'Bob private task' });
  const other = (await bob.take('worker.update', (m) => m.worker.createdBy === 'Bob')).worker;
  const { readFileSync } = await import('node:fs');
  const records = JSON.parse(readFileSync(path.join(root, 'project', '.agent-office', 'workers.json'), 'utf8')) as { id: string; hookToken: string }[];
  const token = records.find((w) => w.id === other.id)!.hookToken;
  const hook = (action = '', body?: unknown) => fetch(`http://127.0.0.1:${office.hookPort}/office/workers${action}?worker=${other.id}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const list = await (await hook()).json() as { workers: { id: string }[] };
  assert.deepEqual(list.workers.map((w) => w.id), [other.id]);
  assert.equal((await hook('/tell', { worker: worker.id, prompt: 'unauthorized' })).status, 404);
  assert.equal((await hook('/pr', { worker: worker.id, unlink: true })).status, 404);
  const home = await (await hook('/home', { workers: [worker.id] })).json() as { results: { error?: string }[] };
  assert.ok(home.results[0]?.error);
  assert.ok(office.floors()[0].workers.get(worker.id));
});

test('revocation rejects existing cookies, worker coordination hooks and further socket commands immediately', async () => {
  const { readFileSync } = await import('node:fs');
  const records = JSON.parse(readFileSync(path.join(root, 'project', '.agent-office', 'workers.json'), 'utf8')) as { id: string; hookToken: string }[];
  const token = records.find((w) => w.id === worker.id)!.hookToken;
  const owner = office.accounts.byName('Alice')!;
  office.accounts.revoke(owner.id);
  assert.equal((await alice.request('/api/whoami')).status, 401);
  const hook = await fetch(`http://127.0.0.1:${office.hookPort}/office/workers?worker=${worker.id}`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(hook.status, 403);
  const closed = new Promise<number>((resolve) => alice.ws.once('close', resolve));
  alice.send({ t: 'worker.kill', workerId: worker.id });
  assert.equal(await closed, 4001);
  assert.ok(office.floors()[0].workers.get(worker.id));
});
