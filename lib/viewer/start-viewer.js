import { sessionsDir } from '../paths.js';
import { logger } from '../logger.js';
import { openBrowser } from './open-browser.js';
import { createViewerServer } from './server.js';
import { listViewerSessions } from './sessions.js';

const DEFAULT_PORT = 4173;

export async function startViewer({
  sessionsRoot = sessionsDir,
  sessionId,
  port = DEFAULT_PORT,
  host = '127.0.0.1',
  open = false,
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error('--port requires an integer between 0 and 65535');
  }

  const sessions = await listViewerSessions(sessionsRoot);
  const selected = sessionId ? sessions.find((entry) => entry.id === sessionId) : null;

  if (sessionId && !selected) {
    throw new Error(`Session "${sessionId}" not found in ${sessionsRoot}`);
  }

  const viewer = await createViewerServer({ sessionsRoot, host, port });
  const openPath = selected ? `/session/${selected.id}/` : '/';
  const openUrl = `${viewer.url}${openPath}`;

  const payload = {
    url: viewer.url,
    openUrl,
    host: viewer.host,
    port: viewer.port,
    sessionsDir: sessionsRoot,
    sessions,
    session: selected,
    reportPath: selected?.reportReady ? selected.reportPath : null,
    viewerReady: true,
  };

  console.log(JSON.stringify(payload, null, 2));
  logger.info('viewer listening', { url: viewer.url, openUrl });

  if (open) {
    openBrowser(openUrl);
  }

  await waitForShutdown(viewer);
  return payload;
}

function waitForShutdown(viewer) {
  return new Promise((resolve) => {
    const onSignal = () => {
      viewer
        .close()
        .then(resolve)
        .catch((error) => {
          logger.warn('viewer shutdown failed', { error: error.message });
          resolve();
        });
    };

    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
  });
}
