const LEVELS = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    silent: 100,
};
function resolveLevel() {
    const raw = process.env.LUMA_BROWSER_LOG_LEVEL ?? process.env.LUMA_LOG_LEVEL ?? 'info';
    return LEVELS[raw] ?? LEVELS.info;
}
let currentLevel = resolveLevel();
let verbose = false;
let logFileStream = null;
export function setLogFile(stream) {
    logFileStream = stream;
}
export function setVerbose(enabled) {
    verbose = enabled;
    if (enabled && currentLevel > LEVELS.debug) {
        currentLevel = LEVELS.debug;
    }
}
function write(level, message, fields = {}) {
    const numeric = LEVELS[level] ?? LEVELS.info;
    if (numeric < currentLevel) {
        return;
    }
    const payload = {
        time: new Date().toISOString(),
        level,
        msg: message,
        ...fields,
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    if (logFileStream && !logFileStream.destroyed) {
        logFileStream.write(`${JSON.stringify(payload)}\n`);
    }
}
export const logger = {
    trace: (message, fields) => write('trace', message, fields),
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    isVerbose: () => verbose,
};
//# sourceMappingURL=index.js.map