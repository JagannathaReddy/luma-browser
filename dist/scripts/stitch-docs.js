#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snippetsDir = join(root, 'docs', 'snippets');
const TARGETS = [
    join(root, 'skills', 'luma-scripting', 'references', 'REFERENCE.md'),
    join(root, 'README.md'),
    join(root, '.github', 'copilot-instructions.md'),
];
function loadSnippets() {
    const snippets = {};
    for (const file of readdirSync(snippetsDir)) {
        if (!file.endsWith('.md')) {
            continue;
        }
        const id = file.replace(/\.md$/, '');
        snippets[id] = readFileSync(join(snippetsDir, file), 'utf8').trimEnd();
    }
    return snippets;
}
function stitchContent(content, snippets) {
    let updated = content;
    for (const [id, snippet] of Object.entries(snippets)) {
        const start = `<!-- STITCH:${id}:start -->`;
        const end = `<!-- STITCH:${id}:end -->`;
        const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
        if (!pattern.test(updated)) {
            continue;
        }
        updated = updated.replace(pattern, `${start}\n${snippet}\n${end}`);
    }
    return updated;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function main() {
    const check = process.argv.includes('--check');
    const snippets = loadSnippets();
    let drift = false;
    for (const target of TARGETS) {
        const before = readFileSync(target, 'utf8');
        const after = stitchContent(before, snippets);
        if (before === after) {
            continue;
        }
        if (check) {
            console.error(`docs drift: ${target} is out of sync with docs/snippets/ (run: npm run docs:stitch)`);
            drift = true;
            continue;
        }
        writeFileSync(target, after);
        console.log(`stitched ${target}`);
    }
    if (check && drift) {
        process.exit(1);
    }
    if (!check) {
        console.log('docs stitch complete');
    }
}
main();
//# sourceMappingURL=stitch-docs.js.map