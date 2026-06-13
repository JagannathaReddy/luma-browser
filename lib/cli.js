import { isatty } from 'tty';
import { createRequestId, sendRequest } from './daemon-client.js';
import { ensureDaemon } from './daemon-spawn.js';
import { HELP } from './cli/help.js';
import {
  buildExecutePayload,
  filterFlags,
  parseOptions,
  resolveRenderReport,
} from './cli/parse-options.js';
import { readScriptSource, resolveScriptPath } from './executor.js';
import { installBrowsersSync } from './install.js';
import { logger, setVerbose } from './logger.js';
import { getPackageVersion } from './version.js';

async function warnIfDaemonVersionMismatch(status) {
  const cliVersion = getPackageVersion();
  if (status?.version && status.version !== cliVersion) {
    logger.warn('daemon version differs from CLI; restart with luma-browser stop', {
      cliVersion,
      daemonVersion: status.version,
    });
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP.trimEnd());
    return;
  }

  const globalOptions = parseOptions(argv);
  if (globalOptions.verbose) {
    setVerbose(true);
  }

  if (argv[0] === 'install') {
    installBrowsersSync();
    return;
  }

  if (argv[0] === 'viewer') {
    const options = parseOptions(argv.slice(1));
    const { startViewer } = await import('./viewer/start-viewer.js');
    await startViewer({
      sessionId: options.sessionId ?? globalOptions.sessionId,
      port: options.port ?? 4173,
      open: options.openViewer,
    });
    return;
  }

  await ensureDaemon();

  if (argv[0] === 'status') {
    const data = await sendRequest({ id: createRequestId(), type: 'status' });
    await warnIfDaemonVersionMismatch(data);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (argv[0] === 'browsers') {
    const data = await sendRequest({ id: createRequestId(), type: 'browsers' });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (argv[0] === 'stop') {
    const data = await sendRequest({ id: createRequestId(), type: 'stop' });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (argv[0] === 'browser-stop') {
    const browser = argv[1];
    if (!browser) {
      throw new Error('Usage: luma-browser browser-stop <name>');
    }

    const data = await sendRequest({
      id: createRequestId(),
      type: 'browser-stop',
      browser,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (argv[0] === 'session') {
    await handleSessionCommand(argv.slice(1), globalOptions);
    return;
  }

  await runScriptCommand(argv, globalOptions);
}

async function handleSessionCommand(argv, globalOptions) {
  const subcommand = argv[0];

  if (subcommand === 'start') {
    const options = parseOptions(argv.slice(1));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-start',
      browser: options.browser,
      headless: options.headless,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors,
      connect: options.connect,
      ...(options.name ? { name: options.name } : {}),
      ...(options.capture ? { capture: options.capture } : {}),
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'list') {
    const data = await sendRequest({ id: createRequestId(), type: 'session-list' });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'end') {
    const sessionId = argv[1] ?? globalOptions.sessionId;
    if (!sessionId) {
      throw new Error('Usage: luma-browser session end <sessionId>');
    }

    const options = parseOptions(argv.slice(2));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-end',
      sessionId,
      renderReport: resolveRenderReport({ ...globalOptions, ...options }),
      stopDaemon: options.stopDaemon || globalOptions.stopDaemon,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'abort') {
    const sessionId = argv[1] ?? globalOptions.sessionId;
    if (!sessionId) {
      throw new Error('Usage: luma-browser session abort <sessionId>');
    }

    const options = parseOptions(argv.slice(2));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-abort',
      sessionId,
      renderReport: options.renderReport || globalOptions.renderReport,
      stopDaemon: options.stopDaemon || globalOptions.stopDaemon,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown session subcommand "${subcommand}". Use start, list, end, or abort.`);
}

async function runScriptCommand(argv, globalOptions) {
  const options = parseOptions(argv);
  const positional = filterFlags(argv);
  const scriptPath = resolveScriptPath(positional[0] === 'run' ? positional[1] : positional[0]);
  const useStdin = !scriptPath && !isatty(0);

  if (!scriptPath && !useStdin) {
    console.log(HELP.trimEnd());
    process.exitCode = 1;
    return;
  }

  const source = readScriptSource({ filePath: scriptPath, useStdin });
  const sessionId = options.sessionId ?? globalOptions.sessionId;
  const step = options.step ?? globalOptions.step;

  if (sessionId && !step) {
    throw new Error('--step is required when --session is set');
  }

  const payload = buildExecutePayload({
    id: createRequestId(),
    source,
    options,
    sessionId,
    step,
  });

  logger.debug('execute request', {
    type: payload.type,
    browser: payload.browser,
    sessionId: payload.sessionId ?? null,
    step: payload.step ?? null,
  });

  await sendRequest(payload);
}
