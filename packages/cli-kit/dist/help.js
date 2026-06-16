const SHARED_SANDBOX = `
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

Environment:
  LUMA_BROWSER_LOG_LEVEL=trace|debug|info|warn|error|silent
  LUMA_BROWSER_SKIP_E2E=1            Skip browser e2e tests in npm test
`;
export const ENGINE_HELP = `luma-browser — automation engine (run scripts against the daemon).

Pair with the \`luma\` orchestrator for sessions, viewer, and lifecycle commands.
Run \`luma-browser --help\` anytime to reload this text.

## Commands

  luma-browser install              One-time Playwright Chromium (~150 MB)
  luma-browser run <script.js> [options]
  luma-browser [options]            Run script from stdin (heredoc or pipe)
  luma-browser stop                 Stop daemon and all browsers

Session steps are recorded with luma-browser when a session is open:

  luma-browser --session <id> --step <name> [--headless]
  luma-browser run step.js --session <id> --step <name>

Use \`luma session …\` to start/end sessions and \`luma viewer\` to browse artifacts.

## Worked examples

  luma-browser --headless <<'EOF'
  const page = await browser.getPage("main");
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  console.log(await page.title());
  console.log((await page.snapshotForAI()).full);
  EOF

  luma-browser --connect auto <<'EOF'
  console.log(JSON.stringify(await browser.listPages(), null, 2));
  EOF

## Engine options

  --browser <name>              Browser instance name (default: default)
  --connect <url|auto>          Attach to existing Chrome via CDP
  --headless / --headed         Headless mode (default: headless)
  --ignore-https-errors         Ignore TLS certificate errors
  --timeout <ms>                Sandbox script timeout (default: 30000)
  --session <id>                Attach run to an open session (requires --step)
  --step <name>                 Step name when recording
  --verbose, -v                 Structured logs on stderr
${SHARED_SANDBOX}`;
export const ORCHESTRATOR_HELP = `luma — orchestrator for sessions, viewer, and daemon lifecycle.

Pair with \`luma-browser\` to run sandboxed automation scripts.
Run \`luma --help\` anytime to reload this text.

## Commands

  npm create @jagannathamv/luma@latest   Guided setup wizard
  luma install                           One-time Playwright Chromium (~150 MB)
  luma status                            Daemon + browser instances
  luma browsers                          List active browsers
  luma browser-stop <name>               Stop one named browser
  luma stop                              Stop daemon and all browsers
  luma session start --name <label> [capture options]
  luma session list
  luma session end <id> [--no-report] [--stop-daemon]
  luma session abort <id> [--render-report] [--stop-daemon]
  luma viewer [--session <id>] [--port 4173] [--open]

After upgrading, the CLI auto-restarts the daemon when versions differ.
Always \`session end\` before \`stop\` — stop aborts open sessions without report.html.
Daemon logs append to ~/.luma-browser/daemon.log.

Data directory: ~/.luma-browser/  (daemon.sock, daemon.log, browsers/, sessions/, tmp/)

## Recorded QA session

Worked example:

  id=$(luma session start --name checkout --no-video | jq -r .sessionId)
  luma-browser --session "$id" --step open --headless <<'EOF'
  const page = await browser.getPage("main");
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  console.log(await page.title());
  EOF
  luma session end "$id"
  luma viewer --session "$id" --open

Each step writes artifacts under ~/.luma-browser/sessions/<id>/steps/NNN/:
  trace.zip, network.har, console.jsonl, screenshot.png
  script.js, stdout.txt, stderr.txt, step.json
  exported.spec.js (when session end decodes the trace)

Capture toggles (session start):
  --no-trace --no-video --no-har --no-console --no-screenshot

## Session / viewer options

  --name <label>                Friendly name on session start
  --no-report                   Skip report.html on session end
  --render-report               Force report.html on session abort
  --stop-daemon                 Stop daemon after session end or abort
  --port <n>                    Viewer HTTP port (default: 4173)
  --open                        Open viewer URL in the system browser

Agent plugin: skills/ (luma-scripting, luma-session, luma-verify, luma-automate, luma-review),
commands/ (/luma:run, /luma:session, /luma:verify, /luma:review).
Full API: skills/luma-scripting/references/REFERENCE.md
`;
export const HELP = `Luma Browser — browser automation and recorded QA sessions for coding agents.

Binaries:
  luma-browser   Automation engine — run scripts (stdin or files)
  luma           Orchestrator — sessions, viewer, daemon lifecycle

This help is written for LLMs and humans. Run \`luma --help\` or \`luma-browser --help\`.

## Choose a workflow

| Goal | Command | Recording |
|------|---------|-----------|
| Quick one-off (scrape, check, navigate) | luma-browser run script.js OR stdin | No |
| Record a QA session with report | luma session start → luma-browser steps → luma session end | Yes |
| Browse past sessions | luma viewer [--session id] [--open] | — |
| Change → QA plan (agent skill) | luma-verify skill / /luma:verify | Optional |

${ORCHESTRATOR_HELP.split('## Commands')[1]?.split('## Recorded')[0] ?? ''}
${ENGINE_HELP.split('## Commands')[1]?.split('## Worked')[0] ?? ''}
`;
export function helpForMode(mode) {
    return mode === 'orchestrator' ? ORCHESTRATOR_HELP : ENGINE_HELP;
}
export const ORCHESTRATOR_COMMANDS = new Set([
    'viewer',
    'session',
    'status',
    'browsers',
    'browser-stop',
]);
export const ENGINE_COMMANDS = new Set(['run']);
export function isOrchestratorCommand(command) {
    return command != null && ORCHESTRATOR_COMMANDS.has(command);
}
export function isEngineCommand(argv) {
    if (argv.length === 0) {
        return false;
    }
    if (argv[0] === 'run') {
        return true;
    }
    const first = argv[0];
    if (first.startsWith('-')) {
        return true;
    }
    if (!ORCHESTRATOR_COMMANDS.has(first) && first !== 'install' && first !== 'stop') {
        return first.endsWith('.js');
    }
    if (first.endsWith('.js')) {
        return true;
    }
    return false;
}
//# sourceMappingURL=help.js.map