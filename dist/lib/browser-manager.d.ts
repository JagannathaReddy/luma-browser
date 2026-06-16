import type { BrowserEnsureOptions } from './types.js';
export declare class BrowserManager {
    #private;
    ensureBrowser(name: any, { headless, ignoreHTTPSErrors, recordVideoDir, sessionScoped, }?: BrowserEnsureOptions): Promise<any>;
    connectBrowser(name: any, endpoint: any): Promise<any>;
    getEntry(name: any): any;
    getContext(name: any): any;
    getPrimaryPage(name: any, pageName?: string): any;
    getBrowserApi(name: any): {
        getPage(nameOrId?: string): Promise<any>;
        newPage(): Promise<any>;
        listPages(): Promise<{
            id: string;
            name: string | null;
            url: string;
            title: string;
        }[]>;
        closePage(name: any): Promise<void>;
    };
    cleanupAfterScript(name: any): Promise<void>;
    stopBrowser(name: any): Promise<void>;
    stopAll(): Promise<void>;
    listBrowsers(): {
        name: any;
        type: any;
        status: string;
        pages: any[];
        endpoint: any;
        headless: any;
    }[];
    browserCount(): number;
}
//# sourceMappingURL=browser-manager.d.ts.map