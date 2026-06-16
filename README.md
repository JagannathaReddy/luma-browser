# luma-browser

[![CI](https://github.com/JagannathaReddy/luma-browser/actions/workflows/ci.yml/badge.svg)](https://github.com/JagannathaReddy/luma-browser/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@jagannathamv/luma-browser.svg)](https://www.npmjs.com/package/@jagannathamv/luma-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

CLI for controlling browsers with JavaScript scripts. Pure Node.js — no native binaries.

A background **daemon** keeps browser instances and named pages alive between script runs.
User scripts execute in a **QuickJS WASM sandbox** (not Node.js).

## Install

```bash
npm install -g @jagannathamv/luma-browser
luma-browser install
npm test
```

Two binaries ship in the same package:

| Binary | Role |
|--------|------|
| `luma-browser` | **Engine** — run scripts (stdin or files) |
| `luma` | **Orchestrator** — sessions, viewer, daemon lifecycle |

Or use the Ink-based guided wizard:

```bash
npm create @jagannathamv/luma@latest
```

## Usage

```bash
luma-browser --headless <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
console.log(await page.title());
console.log(page.locator("h1").textContent());
EOF
```

```bash
luma-browser run script.js
luma-browser --browser my-project --headed <<'EOF'
...
EOF
luma-browser --connect auto <<'EOF'
console.log(JSON.stringify(await browser.listPages(), null, 2));
EOF
luma-browser --ignore-https-errors --timeout 60000 --headless <<'EOF'
...
EOF
luma-browser status
luma-browser browsers
luma-browser stop
```

## Features

- Persistent daemon at `~/.luma-browser/daemon.sock`
- Named browser profiles under `~/.luma-browser/browsers/`
- Attach to running Chrome with `--connect auto` or a CDP URL
- Attach to an existing tab with `browser.getPage(<targetId>)`
- QuickJS sandbox with real top-level `await`, CPU/memory limits, and `setTimeout`
- QA sessions with host-side capture (trace, HAR, console, step screenshot, video on page close)
- Session reports: `report.html`, trace decode, and `exported.spec.js` per step (`session end`, `--no-report` to skip)
- Local viewer: `luma-browser viewer` serves the session index and reports at `http://127.0.0.1:4173`
- Agent plugin pack: skills (`luma-scripting`, `luma-session`, …), subagents, `/luma:*` commands — install via Claude Code / Cursor / Codex / GitHub Copilot
- Generic Playwright RPC bridge — Page/Locator/Frame/Context API passthrough
- Zod-validated JSON protocol between CLI and daemon

## Sandbox limits

Scripts run in QuickJS, not Node.js:

- **Supported:** navigation, clicks, fills, locators, keyboard/mouse, frames, `page.evaluate(fn)`, `page.snapshotForAI()`, `Promise.all`, `setTimeout`, screenshots
<!-- STITCH:sandbox-limits:start -->
This is not Node.js:

- No import / require / fetch / process / Node fs
- No callback APIs: page.on, page.route, exposeFunction, waitForEvent — sandbox functions cannot cross the boundary
- CPU and wall-clock time are bounded (--timeout, default 30s)
- Values crossing evaluate must be JSON-serializable
<!-- STITCH:sandbox-limits:end -->
- **Async:** scripts run in an async IIFE — use real `await` on Playwright calls and other sandbox promises
- **Screenshots:** saved via `await saveScreenshot(buffer, name)` under `~/.luma-browser/tmp/`

See `skills/luma-scripting/SKILL.md` and `skills/luma-scripting/references/REFERENCE.md` for the agent API reference.

## Daemon lifecycle

The CLI auto-starts a background daemon. Browsers and named pages persist between script runs.

```bash
luma-browser status    # check daemon + browsers
luma-browser stop        # stop daemon and all browsers
```

After upgrading or changing local code, restart the daemon so it loads the latest version:

```bash
luma-browser stop
luma-browser --headless <<'EOF'
...
EOF
```

## Security model

luma-browser is a single-user local-developer tool. The daemon socket
(`~/.luma-browser/daemon.sock`) is **trusted-local**: any process running under
your UID can issue commands, including scripts that drive Playwright against
your authenticated browser profiles under `~/.luma-browser/browsers/`.

Implications:

- Do not run luma-browser as a privileged user, and do not run untrusted
  processes under the same UID while the daemon is up.
- Do not expose `~/.luma-browser/` over a shared filesystem, network mount, or
  multi-tenant container.
- The daemon socket and PID file are created with default umask; treat
  `~/.luma-browser/` as a credential directory.
- The local viewer at `http://127.0.0.1:<port>/` is token-gated. The token is
  generated per `luma-browser viewer` invocation, printed in the URL, and never
  written to disk. Don't paste viewer URLs into shared chats — they grant read
  access to recorded sessions (which may contain auth headers in HARs).

QuickJS scripts run in a memory- and CPU-bounded WASM sandbox; they cannot
access Node `fs`/`process`/`require`, and string arguments to `page.evaluate`
are evaluated in the **browser context**, not on the host. The sandbox refuses
property paths like `constructor`, `__proto__`, or anything beginning with
`__`. See `skills/luma-scripting/SKILL.md` for the full surface.

## Development

```bash
npm test
npm run test:e2e
npm run check          # unit + e2e
npm run lint           # biome check
npm run pack:check     # verify npm pack tarball contents
npm run docs:check     # verify stitched docs
```

See [AGENTS.md](./AGENTS.md) for architecture, [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev loop, and [RELEASING.md](./RELEASING.md) for publish steps.

Set `LUMA_BROWSER_SKIP_E2E=1` to skip browser e2e tests.

## Publishable packages

The repo is an npm workspace monorepo (Turborepo build graph). These packages are published for third-party tooling:

| Package | Purpose |
|---------|---------|
| `@jagannathamv/protocol` | Zod-validated IPC types with discriminated request→result maps |
| `@jagannathamv/config` | Data paths and runtime limits |
| `@jagannathamv/logger` | Structured stderr logging |
| `@jagannathamv/daemon-client` | Typed Unix-socket daemon client |
| `@jagannathamv/cli-kit` | CLI help text and binary mode routing |
| `@jagannathamv/viewer-ui` | Astro-based session viewer components |

The main `@jagannathamv/luma-browser` package re-exports subpaths (`/protocol`, `/daemon-client`, …) for backward compatibility.

Build all packages: `npm run build` (runs Turborepo).

## Agent integration

luma-browser ships an agent plugin pack (skills, subagents, slash commands).

**Plugin auto-update:** marketplace manifests (`.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json`, Codex plugin) are version-synced on every release via `scripts/sync-version.mjs`. Claude Code, Cursor, and Codex detect newer plugin versions automatically — reinstall only if your editor caches an old marketplace snapshot.

| Install | Command |
|---------|---------|
| **GitHub Copilot** | Custom agents in `.github/agents/` (`@luma-session`, …) + `.github/copilot-instructions.md` |
| Claude Code | `/plugin marketplace add JagannathaReddy/luma-browser` then install `luma-browser` |
| Cursor | Install from Marketplace, or symlink: `ln -sfn "$(pwd)" ~/.cursor/plugins/local/luma-browser` |
| Codex | Add plugin from `plugins/luma/.codex-plugin/plugin.json` |

Skills: `luma-scripting` (API reference), `luma-automate`, `luma-session`, `luma-verify`, `luma-review`.

Slash commands: `/luma:run`, `/luma:session`, `/luma:verify`, `/luma:review`.

Examples: `examples/`. Full sandbox API: `skills/luma-scripting/references/REFERENCE.md`.

## License

MIT
