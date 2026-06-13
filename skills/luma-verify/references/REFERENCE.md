# luma-browser verify — diff → workflow heuristics

## Mapping changes to workflows

| Changed area | What a user exercises | Default priority |
|---|---|---|
| Routes/pages (`app/`, `pages/`, `routes/`) | Directly testable URL | P0–P1 |
| Page components in feature dirs | Route(s) that render them | P1 |
| API routes / server actions | UI flow that triggers them | P0–P1 |
| Shared components / hooks | Fan-out to consuming routes | P0 / P2 |
| Auth / middleware | Login, protected routes, redirects | P0 |
| Config / types / docs only | Usually no browser surface | skip |

## Finding the URL

- Grep the router for changed paths.
- Read `package.json` dev script for base URL — don't assume port 3000.
- Monorepo: only web apps get browser flows.

## Prioritization

- **P0** — auth, checkout, payment, directly changed routes
- **P1** — adjacent flows sharing changed components/endpoints
- **P2** — low-traffic fan-out

## Plan template

```
## QA plan for <change>

### [P0] <workflow> — <intent>
- Entry: <url>
- Must hold: <checks>
- At risk because: <files>

Not testing in browser: <non-UI changes>

Recommend recording: P0 (+ P1 if time). Record as a session?
```
