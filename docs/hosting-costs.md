# Personal hosting costs

Back to the [README](../README.md).

**Checked 27 October 2026.** For 10–15 people in the office and 1–3 simultaneous Claude CLI workers, start with a modest shared-CPU VPS and measure. **4 GB is a constrained pilot; 8 GB is the sensible initial target.** These are engineering starting points, not verified capacity guarantees. This comparison does not provision anything or authorize charges.

## Published monthly prices

Prices below exclude taxes, backups, additional storage, transfer overages, domain registration, and Claude/API usage. Hetzner figures are its published new-order prices, not currency conversions; its IPv4-inclusive totals add €0.50 / $0.60. DigitalOcean figures are Basic **Regular** bundled plans with public IPv4 included.

| Provider / plan | Shared vCPU | RAM | Included disk | Server/month | With public IPv4/month |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hetzner CX23, x86 | 2 | 4 GB | 40 GB NVMe | €5.49 / $6.49 | **€5.99 / $7.09** |
| Hetzner CX33, x86 | 4 | 8 GB | 80 GB NVMe | €8.49 / $9.99 | **€8.99 / $10.59** |
| Hetzner CAX11, ARM | 2 | 4 GB | 40 GB NVMe | €5.99 / $6.99 | €6.49 / $7.59 |
| Hetzner CAX21, ARM | 4 | 8 GB | 80 GB NVMe | €10.49 / $12.49 | €10.99 / $13.09 |
| DigitalOcean Basic Regular | 2 | 4 GiB | 80 GiB SSD | $24 | **$24** |
| DigitalOcean Basic Regular | 4 | 8 GiB | 160 GiB SSD | $48 | **$48** |

Price sources: [Hetzner's current new-order price list](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Hetzner Primary IP pricing](https://docs.hetzner.com/cloud/servers/primary-ips/overview/), and [DigitalOcean Droplet pricing and IPv4 terms](https://www.digitalocean.com/pricing/droplets).

**Stock matters:** Hetzner's official [cost-optimized product page](https://www.hetzner.com/cloud/cost-optimized/) currently labels all four plans above unavailable and lists Nuremberg/Helsinki locations for them. These are European price options, not a promise of US availability or an immediately orderable server. Recheck the account's selected region and stock before choosing. Prefer x86 for the simplest compatibility with project tools; ARM needs checking against the actual repositories and native dependencies. Choose a region near the team and measure latency. DigitalOcean availability must also be checked when ordering.

For a deploy-now budget, compare the actual available checkout prices. A CX33 would be the cheapest 8 GB choice in this comparison **if stock returns**; DigitalOcean's $48 8 GiB plan is the documented alternative. A $24 DigitalOcean pilot with one active worker can establish usage first. An existing always-on personal computer avoids a new VPS rental, although electricity, connectivity, and uptime still matter. Do not budget temporary promotional credits as permanent free hosting.

## What uses the machine

The source divides the work this way:

| Where | Work |
| --- | --- |
| Each teammate's browser | Three.js/WebGL rendering, local movement/collision, audio playback and capture. See [scene.ts](../src/client/core/scene.ts), [loop.ts](../src/client/core/loop.ts), and [player](../src/client/player/index.ts). |
| Office server | HTTP/WebSocket traffic, presence and game state, terminal streaming, repositories/worktrees, and locally launched agent processes plus whatever commands they run. See [presence handler](../src/server/ws/handlers/presence.ts) and [worker manager](../src/server/workers/manager.ts). |
| Browser-to-browser media | Voice/screens use WebRTC peer connections; the office relays signaling. A configured TURN relay can carry media, adding its own bandwidth/resource costs. See [voice.ts](../src/client/voice.ts). |

Thus 15 connected people do not require 15 server-side 3D renderers. Three simultaneous dependency installs, test suites, builds, or browser automation jobs can still exceed a small VM. Also test voice/screens with the real group: browser uplink and peer connections matter independently of VPS RAM.

## Measure before upgrading

Start with one active worker, then try two and three during representative work while the team moves around and uses voice. Watch the office's machine monitor, `docker stats`, host available memory/swap, CPU, disk growth, and WebSocket responsiveness. Keep headroom for the OS, image builds, and bursts; reduce worker concurrency or resize when sustained memory/CPU pressure or latency appears. A synthetic peer test alone does not establish live agent capacity.

The supplied [Compose configuration](../compose.yaml) currently caps the office container at **4 GB and 2 CPUs**, with **3 workers** allowed. On a 4 GB host, lower the container memory cap to leave room for the host. An 8 GB VM does not automatically increase that container cap; adjust it deliberately after observing actual usage. Keep personal billing on the chosen account, and include backups and model usage in the monthly budget.
