# Contributing

Thanks for your interest in luma-browser.

## Before you open a PR

1. Open an issue for substantial changes — bug fixes and docs are welcome directly.
2. Run `npm run check` locally (unit + e2e). Also run `npm run lint` and `npm run pack:check`. CI runs the same on Ubuntu and Windows.
3. Keep changes focused — match existing ES module style and naming in surrounding code.

## Dev setup

```bash
git clone https://github.com/JagannathaReddy/luma-browser.git
cd luma-browser
npm install
luma-browser install          # download Chromium for e2e
npm test                      # unit tests
npm run test:e2e              # browser tests
npm run lint                  # biome check
npm run pack:check            # npm pack tarball smoke test
npm run docs:check            # stitched docs drift check
```

Skip browser e2e locally:

```bash
LUMA_BROWSER_SKIP_E2E=1 npm run test:e2e
```

## Project structure

See [AGENTS.md](./AGENTS.md) for architecture and directory layout.

## Making changes

| Area | Start here |
|------|------------|
| CLI / subcommands | `lib/cli.js`, `lib/cli/` |
| Daemon protocol | `lib/protocol.js`, `lib/daemon.js` |
| Sandbox / Playwright RPC | `lib/sandbox/` |
| Sessions / capture | `lib/session/` |
| Reports / trace decode | `lib/report/` |
| Viewer | `lib/viewer/` |
| Agent skills | `skills/` — keep YAML frontmatter (`name`, `description`) intact |
| Tests | `test/*.test.js` — colocate with feature area |

## House rules

- Use `lib/logger.js` for diagnostics in library code; don't add stray `console.log` in `lib/`.
- Extend Zod schemas in `lib/protocol.js` before adding new RPC types.
- User scripts run in QuickJS — not Node.js. Update `skills/luma-scripting/references/REFERENCE.md` when changing sandbox API.
- Restart the daemon after local daemon changes (`luma-browser stop`), or let version-mismatch auto-restart handle upgrades.

## Commit messages

Use clear, conventional prefixes when helpful: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Release process

Maintainers: see [RELEASING.md](./RELEASING.md).
