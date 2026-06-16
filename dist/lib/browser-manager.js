import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { chromium } from 'playwright';
import { createBrowserApi } from './browser-api.js';
import { browsersDir } from './paths.js';
const DISCOVERY_PORTS = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229];
const PROBE_TIMEOUT_MS = 750;
function isIgnorableFileError(error) {
    const code = error?.code;
    return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES';
}
export class BrowserManager {
    #browsers = new Map();
    async ensureBrowser(name, { headless = true, ignoreHTTPSErrors = false, recordVideoDir = null, sessionScoped = false, } = {}) {
        await mkdir(browsersDir, { recursive: true });
        const existing = this.#browsers.get(name);
        if (existing?.type === 'launched') {
            if (existing.headless === headless &&
                existing.ignoreHTTPSErrors === ignoreHTTPSErrors &&
                existing.recordVideoDir === recordVideoDir) {
                return existing;
            }
            if (sessionScoped) {
                throw new Error(`Cannot change browser options for "${name}" mid-session — pin headless / ignoreHTTPSErrors / video at session start`);
            }
            await this.stopBrowser(name);
        }
        else if (existing) {
            await this.stopBrowser(name);
        }
        const profileDir = join(browsersDir, name);
        await mkdir(profileDir, { recursive: true });
        const context = await chromium.launchPersistentContext(profileDir, {
            headless,
            ignoreHTTPSErrors,
            ...(recordVideoDir ? { recordVideo: { dir: recordVideoDir } } : {}),
        });
        const entry = {
            name,
            type: 'launched',
            context,
            pages: new Map(),
            anonymousPages: [],
            headless,
            ignoreHTTPSErrors,
            recordVideoDir,
            profileDir,
        };
        this.#browsers.set(name, entry);
        return entry;
    }
    async connectBrowser(name, endpoint) {
        await mkdir(browsersDir, { recursive: true });
        const resolved = endpoint === 'auto' ? await this.#discoverEndpoint() : endpoint;
        const existing = this.#browsers.get(name);
        if (existing?.type === 'connected' && existing.endpoint === resolved) {
            return existing;
        }
        if (existing) {
            await this.stopBrowser(name);
        }
        const browser = await chromium.connectOverCDP(resolved);
        const contexts = browser.contexts();
        const context = contexts[0] ?? (await browser.newContext());
        const entry = {
            name,
            type: 'connected',
            context,
            pages: new Map(),
            anonymousPages: [],
            headless: false,
            ignoreHTTPSErrors: false,
            endpoint: resolved,
        };
        this.#browsers.set(name, entry);
        return entry;
    }
    async #discoverEndpoint() {
        const attempted = new Set();
        let lastError;
        const tryEndpoint = async (endpoint) => {
            if (!endpoint || attempted.has(endpoint)) {
                return null;
            }
            attempted.add(endpoint);
            try {
                return await this.#resolveDebuggerEndpoint(endpoint);
            }
            catch (error) {
                lastError = error;
                return null;
            }
        };
        const devToolsEndpoint = await this.#readDevToolsActivePort();
        const fromDevTools = await tryEndpoint(devToolsEndpoint);
        if (fromDevTools) {
            return fromDevTools;
        }
        for (const port of DISCOVERY_PORTS) {
            const discovered = await tryEndpoint(`http://127.0.0.1:${port}`);
            if (discovered) {
                return discovered;
            }
        }
        throw new Error(this.#buildAutoConnectError(lastError));
    }
    async #resolveDebuggerEndpoint(endpoint) {
        const response = await fetch(`${endpoint.replace(/\/$/, '')}/json/version`, {
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        return payload.webSocketDebuggerUrl ?? endpoint;
    }
    async #readDevToolsActivePort() {
        const candidates = [
            join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'DevToolsActivePort'),
            join(homedir(), '.config', 'google-chrome', 'DevToolsActivePort'),
            join(homedir(), '.config', 'chromium', 'DevToolsActivePort'),
        ];
        for (const path of candidates) {
            try {
                const contents = await readFile(path, 'utf8');
                const [portLine, pathLine] = contents.trim().split('\n');
                const port = Number.parseInt(portLine, 10);
                if (!Number.isFinite(port)) {
                    continue;
                }
                if (pathLine?.startsWith('/')) {
                    return `http://127.0.0.1:${port}${pathLine}`;
                }
                return `http://127.0.0.1:${port}`;
            }
            catch (error) {
                if (!isIgnorableFileError(error)) {
                    throw error;
                }
            }
        }
        return null;
    }
    #buildAutoConnectError(lastError) {
        const detail = lastError instanceof Error ? lastError.message : 'No debugger endpoint responded';
        return [
            'Could not find a running Chrome instance with remote debugging enabled.',
            `Last error: ${detail}`,
            'Start Chrome with remote debugging or pass --connect <url>.',
        ].join(' ');
    }
    getEntry(name) {
        return this.#browsers.get(name);
    }
    getContext(name) {
        return this.getEntry(name)?.context ?? null;
    }
    getPrimaryPage(name, pageName = 'main') {
        return this.getEntry(name)?.pages.get(pageName)?.page ?? null;
    }
    getBrowserApi(name) {
        const entry = this.getEntry(name);
        if (!entry) {
            throw new Error(`Browser "${name}" is not available`);
        }
        return createBrowserApi({
            getContext: () => entry.context,
            pages: entry.pages,
            anonymousPages: entry.anonymousPages,
        });
    }
    async cleanupAfterScript(name) {
        const entry = this.getEntry(name);
        if (!entry) {
            return;
        }
        for (const page of [...entry.anonymousPages]) {
            await page.close().catch(() => { });
        }
        entry.anonymousPages.length = 0;
    }
    async stopBrowser(name) {
        const entry = this.#browsers.get(name);
        if (!entry) {
            return;
        }
        this.#browsers.delete(name);
        for (const { page } of entry.pages.values()) {
            await page.close().catch(() => { });
        }
        for (const page of entry.anonymousPages) {
            await page.close().catch(() => { });
        }
        await entry.context.close().catch(() => { });
    }
    async stopAll() {
        await Promise.all([...this.#browsers.keys()].map((name) => this.stopBrowser(name)));
    }
    listBrowsers() {
        return [...this.#browsers.entries()].map(([name, entry]) => ({
            name,
            type: entry.type,
            status: 'running',
            pages: [...entry.pages.keys()],
            endpoint: entry.endpoint ?? null,
            headless: entry.headless,
        }));
    }
    browserCount() {
        return this.#browsers.size;
    }
}
//# sourceMappingURL=browser-manager.js.map