export const HELP = `Luma Browser — browser automation and recorded QA sessions for coding agents.

This help is written for LLMs and humans. Run \`luma-browser --help\` anytime to reload it.

## Choose a workflow

| Goal | Command | Recording |
|------|---------|-----------|
| Quick one-off (scrape, check, navigate) | luma-browser run script.js OR stdin | No |
| Record a QA session with report | session start → run steps → session end | Yes |
| Browse past sessions | luma-browser viewer [--session id] [--open] | — |
| Change → QA plan (agent skill) | luma-verify skill / /luma:verify | Optional |

Agent plugin: skills/ (luma-scripting, luma-session, luma-verify, luma-automate, luma-review),
agents/, commands/ (/luma:run, /luma:session, /luma:verify, /luma:review).
Full API: skills/luma-scripting/references/REFERENCE.md

## Install & lifecycle

  npm create luma@latest           Guided setup wizard
  luma-browser install              One-time Playwright Chromium (~150 MB)
  luma-browser status               Daemon + browser instances
  luma-browser browsers             List active browsers
  luma-browser stop                 Stop daemon and all browsers
  luma-browser browser-stop <name>  Stop one named browser

After upgrading luma-browser, the CLI auto-restarts the daemon when versions differ.
You can also run \`luma-browser stop\` manually before the next script.
Always \`session end\` before \`stop\` — stop aborts open sessions without report.html.
Use \`session abort\` to cancel an open session without a report.
Daemon logs append to ~/.luma-browser/daemon.log.

Data directory: ~/.luma-browser/  (daemon.sock, daemon.log, browsers/, sessions/, tmp/)

## One-off automation

  luma-browser run <script.js> [options]
  luma-browser [options]            Run script from stdin (heredoc or pipe)

Worked example:

  luma-browser --headless <<'EOF'
  const page = await browser.getPage("main");
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  console.log(await page.title());
  console.log((await page.snapshotForAI()).full);
  EOF

Attach to running Chrome (remote debugging port):

  luma-browser --connect auto <<'EOF'
  console.log(JSON.stringify(await browser.listPages(), null, 2));
  EOF

## Recorded QA session

  luma-browser session start --name <label> [capture options]
  luma-browser --session <id> --step <name> [--headless]   # stdin script
  luma-browser run step.js --session <id> --step <name>
  luma-browser session list
  luma-browser session end <id> [--no-report] [--stop-daemon]
  luma-browser session abort <id> [--render-report] [--stop-daemon]
  luma-browser viewer [--session <id>] [--port 4173] [--open]

The viewer index supports search by name, id, status, or date. Each session has a detail page with step artifacts, embedded report, and Playwright trace commands.

Worked example:

  id=$(luma-browser session start --name checkout --no-video | jq -r .sessionId)
  luma-browser --session "$id" --step open --headless <<'EOF'
  const page = await browser.getPage("main");
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  console.log(await page.title());
  EOF
  luma-browser session end "$id"
  luma-browser viewer --session "$id" --open

Each step writes artifacts under ~/.luma-browser/sessions/<id>/steps/NNN/:
  trace.zip, network.har, console.jsonl, screenshot.png
  script.js, stdout.txt, stderr.txt, step.json
  exported.spec.js (when session end decodes the trace)

session end writes results.json and report.html by default; use --no-report to skip report.html.
session abort marks status aborted with partial results.json; no report unless --render-report.

Capture toggles (session start or per-run):
  --no-trace --no-video --no-har --no-console --no-screenshot

Video note: sessions reuse one persistent browser context across steps, so step video
is best-effort (attached when Playwright emits a new recording). For full per-step video,
run separate sessions or one step per session. Trace + screenshot remain the primary evidence.

## Engine options

  --browser <name>              Browser instance name (default: default)
  --connect <url|auto>          Attach to existing Chrome via CDP
  --headless / --headed         Headless mode (default: headless)
  --ignore-https-errors         Ignore TLS certificate errors
  --timeout <ms>                Sandbox script timeout (default: 30000)
  --verbose, -v                 Structured logs on stderr

## Session / viewer options

  --session <id>                Attach run to an open session (requires --step)
  --step <name>                 Step name when recording
  --name <label>                Friendly name on session start
  --no-report                   Skip report.html on session end
  --render-report               Force report.html on session abort (end renders by default)
  --stop-daemon                 Stop daemon after session end or abort
  --port <n>                    Viewer HTTP port (default: 4173)
  --open                        Open viewer URL in the system browser

## Script globals (QuickJS sandbox — NOT Node.js)

Browser:
  browser.getPage(nameOrTargetId?)   Named persistent page or CDP target attach
  browser.newPage()                  Anonymous page (closed after script)
  browser.listPages()                [{ id, url, title, name }]
  browser.closePage(name)

Playwright passthrough (remote proxies):
  Full Page / Locator / Frame / Context / Keyboard / Mouse API
  page.goto, page.locator, page.getByRole, page.fill, page.click, ...
  page.evaluate(fn, arg?)            Function bodies compiled on host
  page.snapshotForAI()               LLM-friendly aria page outline

I/O:
  console.log/info/warn/error        stdout/stderr (your observation channel)
  await saveScreenshot(buffer, name)   ~/.luma-browser/tmp/
  await writeFile(name, data)        Temp file helpers (async)
  await readFile(name)
  setTimeout(fn, ms) / clearTimeout(id)   Bounded by --timeout

Async: scripts run in an async IIFE — use real top-level await on Playwright calls.

NOT supported (QuickJS sandbox — not Node.js):
  import, require, fetch, process, Node fs/path/os
  page.on, page.route, page.unroute, exposeFunction, waitForEvent (callbacks cannot cross sandbox)
  CPU and wall-clock time are bounded (--timeout, default 30s)

Observing unknown pages:
  1. console.log((await page.snapshotForAI()).full)
  2. Pick getByRole/getByText selector from the outline
  3. Act — never guess CSS selectors blind

Session tips:
  - session end renders report.html by default (--no-report to skip); session abort cancels without report
  - Always session end before stop — stop aborts open sessions without a report
  - Reuse the same named page across steps (cookies persist)
  - One primary named page per step (report screenshot rule)
  - Log state to stdout for the next step/agent decision
  - writeFile/readFile to pass JSON between steps

Environment:
  LUMA_BROWSER_LOG_LEVEL=trace|debug|info|warn|error|silent
  LUMA_BROWSER_SKIP_E2E=1            Skip browser e2e tests in npm test
`;
