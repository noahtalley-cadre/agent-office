import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadConfig } from '../../dist/server/server/config.js';
import { Accounts } from '../../dist/server/server/accounts.js';

// Identical paths on a Mac and a cloud VM: moving the /data volume moves the office.
for (const dir of ['/data/home', '/data/office', '/data/projects']) mkdirSync(dir, { recursive: true });
if (!existsSync('/data/office/.git')) {
  execFileSync('git', ['init', '-q', '-b', 'main', '/data/office']);
  writeFileSync('/data/office/README.md', '# The Clubhouse\n\nOur shared playground. Add project floors using the elevator.\n');
  execFileSync('git', ['add', 'README.md'], { cwd: '/data/office' });
  execFileSync('git', ['-c', 'user.name=Clubhouse', '-c', 'user.email=clubhouse@localhost', 'commit', '-qm', 'Start the clubhouse'], { cwd: '/data/office' });
}
const args = ['/data/office', '--home', '/data/office', '--projects', '/data/projects', '--host', '0.0.0.0', '--port', '4600', '--trust-proxy', '--max-workers', process.env.OFFICE_MAX_WORKERS || '3', '--no-open'];
const cfg = loadConfig(args);
const accounts = new Accounts(cfg.dataDir);
if (accounts.unreadableFile) throw new Error('Accounts file is unreadable; refusing to start an unprotected office.');
accounts.setSharedPassword(false);
if (!accounts.any) {
  const pending = accounts.state(new Set()).invites.find((invite) => invite.role === 'admin');
  const invite = pending || accounts.invite('the host', 'admin');
  if (typeof invite === 'string') throw new Error(invite);
  console.log(`\nCreate your first admin account locally (keep this single-use link private):\nhttp://localhost:4600/join#${invite.token}\n`);
}
process.argv = [process.argv[0], 'agent-office', ...args];
await import('../../dist/server/server/cli.js');
