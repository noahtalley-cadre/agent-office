# Personal hosting: Mac now, VPS later

This fork's POC runs in Docker on your Mac, with no cloud subscription. It uses individual accounts, a private `/data` volume, and a temporary HTTPS link. Your Mac's files, Docker socket, GitHub login and Claude credentials are **not mounted into the container**. Each person signs in to Claude from their office account.

## Start and invite people

From this checkout, with Docker running:

```sh
docker compose up -d --build
docker compose logs office
```

The first start prints a **single-use admin invite**. Open that link on `http://localhost:4600`, choose your name and password, and keep the link private. Shared-password login is disabled on every start. In the office, open **Menu → Accounts** to create individual invites. Or use:

```sh
docker compose exec office node bin/agent-office.js accounts invite Teammate --dir /data/office
```

Add the printed `/join#…` to your public office URL and privately give it to that teammate. Invites expire after seven days and work once. Each person then uses their own login. Claude Code is installed in the container: open your sign-ins inside the office and authenticate your own subscription. Claude usage is separate from hosting costs; this setup does not provide free model usage.

For a free temporary HTTPS link:

```sh
brew install cloudflared
node deploy/personal/share.mjs
```

Leave the sharing command running. It prevents idle sleep on a Mac while the tunnel is running; closing the laptop lid or quitting Docker can still take the office offline. The URL changes when the tunnel restarts. Quick Tunnels have no uptime guarantee and a 200 in-flight request limit. They are intended for testing, not permanent hosting. [Cloudflare documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Stop sharing with Ctrl+C. Stop the office with `docker compose stop`. Restart it with `docker compose up -d`. **Do not use `down -v`**: that deletes stored accounts, project files and session data.

## Resource limits and privacy

The POC container has a 4 GB memory ceiling, 2 CPUs and a limit of 3 simultaneous agent workers. Player count is separate: 15 people can socialize without 15 Claude processes. Increase `OFFICE_MAX_WORKERS`, `mem_limit` and `cpus` in `compose.yaml` after measuring `docker stats`. An automated test exercises 15 simultaneous WebSocket clients at 20 movement messages/second plus chat; it is not a 15-person browser/voice/Claude load benchmark.

Account-owned terminals, screens, files and actions are restricted to their owner, including against another office admin. The world, chat, project boards, shared queues and meetings remain social. Global merged-PR cleanup retires only unowned shared workers; owners manually send private sessions home. **This is a trusted-team POC, not security isolation between arbitrary users:** worker processes share a container OS user and filesystem. A person with shell access inside the container could read other files. Use separate containers per user before admitting untrusted users. Docker separates the office from your Mac, not each teammate from one another. Do not mount host credentials or personal directories.

Voice and screensharing use browser WebRTC. Restrictive company networks may require a TURN relay; the POC has not provisioned one. 15-person all-to-all video is substantially heavier than movement/chat. The intended first test is office presence, games, text and occasional voice/screen sharing.

## Move the exact office to a VPS

Use a Linux VPS with Docker Compose. Start with 4 GB for a small pilot, preferably 8 GB if several agents run together. No managed database is needed. The application and all persistent paths remain the same as on your Mac.

1. Stop the office so its backup is consistent, and export its volume. The backup includes private account and agent credentials; keep it private.

```sh
docker compose stop office
umask 077
docker run --rm -v clubhouse-data:/data:ro alpine tar -C /data -czf - . > "$HOME/clubhouse-data.tar.gz"
docker compose up -d office
```

2. Clone this fork on the VPS and check out the same release/branch. Copy `~/clubhouse-data.tar.gz` over SSH to the VPS home directory (outside the source checkout). On the **new VPS only**, restore into a new empty volume:

```sh
docker volume create clubhouse-data
docker run --rm -i -v clubhouse-data:/data alpine sh -c 'test -z "$(ls -A /data)" && tar -C /data -xzf -' < "$HOME/clubhouse-data.tar.gz"
docker compose up -d --build
```

Rebuilding on the destination rebuilds the office for Mac ARM versus VPS x86. Restored projects and user caches can still contain architecture-specific dependencies: reinstall each project’s node_modules/virtualenv/native binaries on the VPS (for example npm ci in Node projects), and reinstall any agent tools that were installed inside the data volume. Accounts, projects and sign-ins stay under `/data` at identical paths. Running terminal processes cannot migrate live: stop them before backup and resume/restart after migration. Avoid running both copies as active offices after the move.

3. For permanent HTTPS, point a domain at the VPS, allow inbound TCP 80/443, and run:

```sh
OFFICE_DOMAIN=office.your-domain.com docker compose -f compose.yaml -f deploy/personal/cloud.yaml up -d
```

Caddy obtains and renews the certificate. The office port stays bound to loopback; Caddy connects over the private Docker network. Keep this `OFFICE_DOMAIN` value in a private shell environment or ignored `.env` file on the VPS. No app rewrite or data conversion is required. Alternatively, continue with a Cloudflare tunnel while choosing a domain.

The Mac backup remains your rollback. Confirm logins, projects, Claude sign-in, games and WebSocket reconnection on the VPS before retiring it. Back up the volume regularly and test a restore. Cloud hosting and DNS are not provisioned by this POC.

## Why not Vercel for the whole application?

Vercel setup is useful for other projects, but this app relies on persistent PTYs, a local workspace and long-running agent subprocesses. Its current server does not fit a short-lived function deployment. Hobby also permits only personal non-commercial use; personally paying for a workplace tool does not change that restriction. [Vercel Hobby](https://vercel.com/docs/plans/hobby). Splitting out a static frontend would add another origin while leaving the server to host, so the POC serves everything from one container.
