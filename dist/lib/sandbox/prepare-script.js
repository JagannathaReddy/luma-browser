export function wrapScript(source) {
    return `(async () => {\n${source}\n})()`;
}
/** @deprecated Use wrapScript — kept for tests documenting legacy await stripping. */
export function prepareScript(source) {
    return source.replace(/\bawait\s+(?=(?:browser\b|[\w$]+(?:\.[\w$]+)*)\()/g, '');
}
//# sourceMappingURL=prepare-script.js.map