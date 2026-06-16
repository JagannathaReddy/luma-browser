export declare function createBrowserApi({ getContext, pages, anonymousPages }: {
    getContext: any;
    pages: any;
    anonymousPages: any;
}): {
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
//# sourceMappingURL=browser-api.d.ts.map