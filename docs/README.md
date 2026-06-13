# Documentation snippets

Single-sourced fragments stitched into README, `--help`, REFERENCE.md, and Copilot instructions.

## Edit workflow

1. Change files in `docs/snippets/*.md`
2. Run `npm run docs:stitch`
3. Commit both snippets and stitched targets

## Check in CI

```bash
npm run docs:check
```

Fails if stitched files drift from snippets.

## Snippets

| File | Used in |
|------|---------|
| `sandbox-limits.md` | REFERENCE.md, README.md, copilot-instructions.md |
| `session-rules.md` | REFERENCE.md, copilot-instructions.md |

Add new targets in `scripts/stitch-docs.mjs` and wrap destinations with:

```html
<!-- STITCH:snippet-name:start -->
…
<!-- STITCH:snippet-name:end -->
```
