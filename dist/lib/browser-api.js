import { isTargetId, listContextPages } from './cdp.js';
function findNamedKey(pages, page) {
    for (const [name, entry] of pages.entries()) {
        if (entry.page === page) {
            return name;
        }
    }
    return null;
}
export function createBrowserApi({ getContext, pages, anonymousPages }) {
    async function attachPage(page, name, { allowReplace = false } = {}) {
        if (pages.has(name) && !allowReplace) {
            return pages.get(name).page;
        }
        pages.set(name, { page });
        return page;
    }
    return {
        async getPage(nameOrId = 'main') {
            const cached = pages.get(nameOrId);
            if (cached && !cached.page.isClosed()) {
                return cached.page;
            }
            if (cached) {
                pages.delete(nameOrId);
            }
            const context = getContext();
            if (isTargetId(nameOrId)) {
                for (const { page, id } of await listContextPages(context)) {
                    if (id === nameOrId) {
                        return attachPage(page, nameOrId, { allowReplace: true });
                    }
                }
                throw new Error(`No open tab found with target id "${nameOrId}"`);
            }
            const page = await context.newPage();
            return attachPage(page, nameOrId);
        },
        async newPage() {
            const context = getContext();
            const page = await context.newPage();
            anonymousPages.push(page);
            return page;
        },
        async listPages() {
            const context = getContext();
            const results = [];
            for (const { page, id, url, title } of await listContextPages(context)) {
                results.push({
                    id,
                    name: findNamedKey(pages, page),
                    url,
                    title,
                });
            }
            return results;
        },
        async closePage(name) {
            const entry = pages.get(name);
            if (!entry) {
                throw new Error(`No page named "${name}"`);
            }
            await entry.page.close();
            pages.delete(name);
        },
    };
}
//# sourceMappingURL=browser-api.js.map