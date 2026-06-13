# Changelog

## 0.2.0

- CLI ergonomics: `report.html` by default on `session end`, `session abort`, `--no-report`, `--stop-daemon`, `daemon.log`
- Richer `report.html`: embedded video, console filters, HAR table, trace actions panel, step filmstrip
- Viewer v2: session search, detail page with embedded report, Playwright trace helper commands
- Trace fidelity: real Playwright zip decode, `getByRole`/`getByText`/locator chain export, golden fixtures
- Agent ecosystem: doc snippets + `stitch-docs`, Codex plugin, GitHub Copilot agents (`.github/agents/`), create-luma v2, expanded examples
- Release hardening: Biome lint, `npm pack` CI smoke, Windows e2e, `NOTICE.md`, README badges
- npm publish as `@jagannathamv/luma-browser` (unscoped `luma-browser` blocked — too similar to `lumabrowser`)

## 0.1.0

- Pure Node.js CLI with persistent background daemon
- QuickJS WASM sandbox for user scripts
- Named browsers, persistent pages, and CDP connect (`--connect auto`)
- Attach to existing Chrome tabs by target id via `browser.getPage(targetId)`
- Expanded Playwright surface via generic RPC bridge (Page, Locator, Frame, Context, Keyboard, etc.)
- Zod-validated daemon protocol
- Unit, sandbox, and optional e2e tests
- Cursor plugin metadata under `.claude-plugin/`
- `--timeout` CLI flag for sandbox script deadline
- Block `page.route` / `page.unroute` with explicit sandbox errors
- QuickJS base64 polyfill for screenshot transfer
- Ship agent skill under `skills/` in npm package
- README: sandbox limits and daemon restart guidance
- Session protocol, SessionManager, host-side capture (trace/HAR/console/step screenshot)
- Reports: trace decode, exported Playwright script per step, self-contained `report.html`
- Local session viewer at `http://127.0.0.1:4173`
- Agent plugin pack: split skills, REFERENCE.md, agents/, commands/, LLM-oriented `--help`
- DX & release prep: AGENTS.md, CONTRIBUTING, RELEASING, create-luma wizard, CI, daemon version auto-restart
