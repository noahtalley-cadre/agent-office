import { spawn } from 'node:child_process';

// The temporary link only exposes the account-protected app, never the Docker API or host folders.
const response = await fetch('http://127.0.0.1:4600/api/login');
if (!response.ok || (await response.json()).shared !== false) {
  throw new Error('Start the account-only office with docker compose up -d before sharing.');
}
const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://127.0.0.1:4600', '--no-autoupdate'], { stdio: 'inherit' });
tunnel.on('error', () => {
  console.error('Install cloudflared first (macOS: brew install cloudflared).');
  process.exitCode = 1;
});
const awake = process.platform === 'darwin' ? spawn('caffeinate', ['-i', '-w', String(tunnel.pid)], { stdio: 'ignore' }) : null;
awake?.on('error', () => {});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => tunnel.kill(signal));
tunnel.on('exit', (code) => { awake?.kill(); process.exitCode = code ?? 0; });
