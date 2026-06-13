# Releasing

luma-browser publishes two npm packages from this repository:

| Package | npm name | bin | Notes |
|---------|----------|-----|-------|
| Main CLI | `@jagannathamv/luma-browser` | `luma-browser` | Daemon, sandbox, sessions, viewer |
| Setup wizard | `@jagannathamv/create-luma` | `create-luma` | `npm create @jagannathamv/luma` |

Playwright Chromium is **not** bundled — users run `luma-browser install` (~150 MB into Playwright cache).

## Prerequisites (one-time)

1. npm account with publish access to `@jagannathamv/luma-browser` and `@jagannathamv/create-luma`
2. GitHub repo secret `NPM_TOKEN` — automation token with publish rights
3. `repository` field in each `package.json` points at this repo (required for provenance)

## Sync versions

All user-facing version stamps must match before a release:

```bash
node scripts/sync-version.mjs 0.2.0
```

Updates:

- `package.json`
- `create-luma/package.json`
- `.claude-plugin/marketplace.json` and `plugin.json`
- `.cursor-plugin/plugin.json`
- `plugins/luma/.codex-plugin/plugin.json`
- `metadata.version` in each `skills/*/SKILL.md`

Then refresh the lockfile if root dependencies changed:

```bash
npm install
```

## Cutting a release

```bash
node scripts/sync-version.mjs 0.2.0
npm run check
git add -A
git commit -m "chore(release): v0.2.0"
git tag v0.2.0
git push origin main --follow-tags
```

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which:

1. Verifies the tag matches `package.json` version
2. Runs lint, docs check, and pack smoke tests
3. Runs `npm test` and `npm run test:e2e`
4. Publishes `luma-browser` from repo root
5. Publishes `create-luma` from `create-luma/`

Set the GitHub repository secret `NPM_TOKEN` to an npm automation token before the first tagged release.

## Manual publish (no CI)

```bash
npm publish --access public --provenance
npm publish --access public --provenance --workspace create-luma
# or:
cd create-luma && npm publish --access public --provenance
```

## Verify packaging locally

```bash
npm run pack:check
npm pack
tar -tf luma-browser-*.tgz | head
cd create-luma && npm pack
```

Expect `bin/`, `lib/`, `skills/`, `agents/`, plugin manifests, `NOTICE.md` — no `.git` or `test/`.

## Agent plugin updates

Agent marketplaces detect updates via manifest versions. Always run `sync-version.mjs` before tagging so Claude Code / Cursor / Codex users see new skill packs.

Shared API docs live in `skills/luma-scripting/references/REFERENCE.md` and `lib/cli/help.js` — update both when changing the sandbox surface.

## Changelog

Add entries to `CHANGELOG.md` under the new version before tagging.
