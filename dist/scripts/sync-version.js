#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version)) {
    console.error('Usage: node scripts/sync-version.mjs <semver>');
    process.exit(1);
}
function updateJson(path, mutator) {
    const absolute = join(root, path);
    const data = JSON.parse(readFileSync(absolute, 'utf8'));
    mutator(data);
    writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`);
}
updateJson('package.json', (data) => {
    data.version = version;
});
updateJson('create-luma/package.json', (data) => {
    data.version = version;
});
const packagesDir = join(root, 'packages');
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
        continue;
    }
    const pkgPath = join('packages', entry.name, 'package.json');
    try {
        updateJson(pkgPath, (data) => {
            data.version = version;
        });
    }
    catch {
        // skip packages without package.json
    }
}
updateJson('.claude-plugin/marketplace.json', (data) => {
    data.version = version;
    for (const plugin of data.plugins ?? []) {
        plugin.version = version;
    }
});
updateJson('.claude-plugin/plugin.json', (data) => {
    data.version = version;
});
updateJson('.cursor-plugin/plugin.json', (data) => {
    data.version = version;
});
updateJson('plugins/luma/.codex-plugin/plugin.json', (data) => {
    data.version = version;
});
const skillsDir = join(root, 'skills');
for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
        continue;
    }
    const skillPath = join(skillsDir, entry.name, 'SKILL.md');
    let content;
    try {
        content = readFileSync(skillPath, 'utf8');
    }
    catch {
        continue;
    }
    const updated = content.replace(/(\n {2}version:\s*)([^\n]+)/, `$1${version}`);
    if (updated !== content) {
        writeFileSync(skillPath, updated);
    }
}
console.log(`Synced version ${version} across manifests and skills.`);
//# sourceMappingURL=sync-version.js.map