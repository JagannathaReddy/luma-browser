# Changelog

## Unreleased

## 0.2.2

### TypeScript migration hardening

- Publish all 8 `@jagannathamv/*` workspace packages in release CI (previously only root + create-luma were published)
- Delete untyped `lib/line-reader.ts` duplicate; `lib/daemon/server.ts` now imports typed `readLines` from `@jagannathamv/daemon-client`
- Export `readLines` from `@jagannathamv/daemon-client` public API
- Complete `lib/cli/help.ts` shim: add `CLI_MODES`, `ENGINE_COMMANDS`, `ORCHESTRATOR_COMMANDS`, `CliMode` type
- Add `@types/node` devDependency to all workspace packages that use `node:` imports (`config`, `logger`, `daemon-client`, `viewer-ui`, `create-luma`)
- `sendRequest`: replace `failed` boolean with `settle()` guard to prevent double-resolve; add `message.id` correlation to ignore stray responses
- Remove unsupported `disabled` prop from `ink-select-input` items; filter unavailable option instead

### Bug fixes

- `postinstall.ts`: fix `projectRoot` path — compiled output lives two levels deep (`dist/scripts/`), not one
- `capture.ts`: step `dir` in `results.json` now always uses forward-slash (`steps/000`) regardless of OS
- `stitch-docs.ts`: normalize CRLF → LF on read so `docs:check` does not report false drift on Windows
- `trace-fidelity.test.ts`: normalize golden fixture to LF before comparing with generated script
- `session-manager.test.ts`: cross-platform `stepDir` regex (`[/\\]`)
- `docs-stitch.test.ts`: YAML front-matter regex tolerates `\r\n`
- `viewer.test.ts`: use `path.resolve()` in expected path to match Windows drive letter

## 0.2.1

### create-luma

- Detect unwritable npm global prefix; fall back to npx instead of failing with EACCES
- Print one-time fix for `~/.npm-global` prefix setup

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
