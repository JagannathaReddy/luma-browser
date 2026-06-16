import { fileURLToPath } from 'url';
import { createDaemon } from './daemon/index.js';
import { logger } from './logger.js';

export function getDaemonEntryPath() {
  return fileURLToPath(new URL('./daemon.js', import.meta.url));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const daemon = createDaemon();
  daemon.registerSignalHandlers();
  daemon.start().catch((error) => {
    logger.error('failed to start daemon', { error: error.message });
    void daemon.requestShutdown(1);
  });
}
