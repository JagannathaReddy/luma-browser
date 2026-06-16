#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const REQUIRED_ROOT_ENTRIES = [
  'package/dist/bin/luma.js',
  'package/dist/bin/luma-browser.js',
  'package/dist/lib/daemon.js',
  'package/dist/lib/cli.js',
  'package/dist/lib/index.js',
  'package/dist/lib/index.d.ts',
  'package/dist/lib/protocol.d.ts',
  'package/dist/scripts/postinstall.js',
  'package/skills/luma-scripting/SKILL.md',
  'package/agents/session-agent.md',
  'package/.github/agents/luma-session.agent.md',
  'package/.github/copilot-instructions.md',
  'package/.cursor-plugin/plugin.json',
  'package/.claude-plugin/plugin.json',
  'package/README.md',
  'package/LICENSE',
  'package/CHANGELOG.md',
  'package/NOTICE.md',
];

const FORBIDDEN_PREFIXES = ['package/test/', 'package/.git/'];

function listTarballEntries(packDir) {
  const tarball = readdirSync(packDir).find((name) => name.endsWith('.tgz'));
  if (!tarball) {
    throw new Error(`No .tgz produced in ${packDir}`);
  }

  return execSync(`tar -tzf ${tarball}`, { cwd: packDir, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function checkPackage({
  cwd,
  label,
  requiredEntries,
  forbiddenPrefixes = [],
}: {
  cwd: string;
  label: string;
  requiredEntries: string[];
  forbiddenPrefixes?: string[];
}) {
  const packDir = mkdtempSync(join(tmpdir(), `luma-pack-${label}-`));

  try {
    execSync(`npm pack --pack-destination ${packDir}`, { cwd, stdio: 'pipe' });
    const entries = listTarballEntries(packDir);

    for (const required of requiredEntries) {
      if (!entries.includes(required)) {
        throw new Error(`${label}: missing ${required} in npm pack tarball`);
      }
    }

    for (const forbidden of forbiddenPrefixes) {
      if (entries.some((entry) => entry.startsWith(forbidden))) {
        throw new Error(`${label}: forbidden path in tarball: ${forbidden}`);
      }
    }

    console.log(`${label}: pack check passed (${entries.length} entries)`);
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }
}

checkPackage({
  cwd: root,
  label: 'luma-browser',
  requiredEntries: REQUIRED_ROOT_ENTRIES,
  forbiddenPrefixes: FORBIDDEN_PREFIXES,
});

checkPackage({
  cwd: join(root, 'create-luma'),
  label: 'create-luma',
  requiredEntries: ['package/dist/index.js', 'package/dist/wizard.js', 'package/README.md'],
  forbiddenPrefixes: ['package/test/'],
});
