# Agent orientation

Entry point for AI agents (and humans new to the repo).

## What luma-browser is

luma-browser is a **single-package Node.js CLI** for agent-driven browser automation and recorded QA sessions. One command (`luma-browser`) covers:

1. **One-off automation** — stdin scripts or `luma-browser run` against a persistent daemon + QuickJS sandbox
2. **Recorded QA sessions** — `session start` → step scripts → `session end` → `report.html`
3. **Local viewer** — `luma-browser viewer` serves session index + artifacts over HTTP
4. **Agent plugin pack** — `skills/`, `agents/`, `commands/` for Claude Code, Cursor, and Codex

```
CLI (lib/cli.js)  →  daemon (lib/daemon.js)  →  BrowserManager + SessionManager + QuickJS sandbox
                                              →  Playwright Chromium (or --connect CDP)
Artifacts: ~/.luma-browser/sessions/<id>/
```

## Repository layout

| Path | Role |
|------|------|
| `bin/luma-browser.js` | CLI entry |
| `lib/daemon.js` | Background daemon — line-delimited JSON over Unix socket / named pipe |
| `lib/daemon-client.js` | CLI ↔ daemon transport |
| `lib/daemon-spawn.js` | Auto-start daemon; restarts on version mismatch |
| `lib/browser-manager.js` | Named browser profiles, Playwright lifecycle |
| `lib/session/` | SessionManager, capture pipeline, results schema |
| `lib/sandbox/` | QuickJS WASM sandbox + Playwright RPC bridge |
| `lib/report/` | trace decode, report.html, exported Playwright scripts |
| `lib/viewer/` | Local HTTP session viewer |
| `lib/protocol.js` | Zod-validated IPC schemas |
| `skills/` | Agent skills (`luma-scripting`, `luma-session`, …) |
| `agents/` | JTBD subagent prompts |
| `commands/` | Slash commands (`/luma:run`, `/luma:session`, …) |
| `examples/` | Runnable demo scripts |
| `create-luma/` | `npm create luma` setup wizard (separate npm package) |
| `test/` | Node test runner — unit + optional e2e (Playwright) |

## Data directories

| Path | Contents |
|------|----------|
| `~/.luma-browser/daemon.sock` | Daemon socket (Unix) or named pipe (Windows) |
| `~/.luma-browser/browsers/` | Named browser state |
| `~/.luma-browser/sessions/<uuid>/` | Session artifacts, `results.json`, `report.html` |
| `~/.luma-browser/tmp/` | Sandbox screenshots and temp files |

## Key flows

**Execute script:** CLI parses args → `ensureDaemon()` → `execute` or `session-run` RPC → sandbox runs script → stdout/stderr streamed back.

**Session capture:** `beginStep` → host-side `StepCapturePipeline` (trace, HAR, console, screenshot) → `writeStepArtifacts` → `finishStep`.

**Report:** `session end` → trace decode → `exported.spec.js` per step → self-contained `report.html` (default; use `--no-report` to skip).

## Code conventions

- **ES modules** throughout (`"type": "module"`)
- **Logging:** `lib/logger.js` for diagnostics; reserve `process.stdout` for CLI/script output
- **Protocol:** extend `lib/protocol.js` Zod schemas first, then daemon + CLI handlers
- **Tests:** `node --test`; e2e gated by `LUMA_BROWSER_SKIP_E2E=1`; e2e uses `--test-concurrency=1`
- **Sandbox limits:** no Node APIs, no callback crossing — document in `skills/luma-scripting/references/REFERENCE.md`

## Validation

```bash
npm test              # unit tests (no browser required for most)
npm run test:e2e      # browser e2e (needs Chromium: luma-browser install)
npm run check         # unit + e2e
```

After changing daemon code locally: `luma-browser stop` then re-run — or rely on auto-restart when CLI version differs from running daemon.

## Agent plugin surfaces

| Surface | Manifest |
|---------|----------|
| Claude Code | `.claude-plugin/marketplace.json` |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex | `.agents/plugins/marketplace.json` |

Bump all plugin/skill versions together via `node scripts/sync-version.mjs <semver>` before release. See `RELEASING.md`.

## License

MIT. See `LICENSE`.
