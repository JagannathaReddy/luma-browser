#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const LUMA_NPM_PACKAGE = '@jagannathamv/luma-browser';

const args = process.argv.slice(2);
const nonInteractive = args.includes('--yes') || args.includes('-y');

const rl = nonInteractive ? null : createInterface({ input, output });

function run(command, args, { label, optional = false } = {}) {
  if (label) {
    console.log(`\n→ ${label}`);
  }

  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
}

function commandExists(name) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(checker, [name], { encoding: 'utf8' }).status === 0;
}

function lumaVersion() {
  const result = spawnSync('luma-browser', ['--help'], { encoding: 'utf8' });
  return result.status === 0;
}

function npxLuma(argv) {
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [LUMA_NPM_PACKAGE, ...argv], {
    label: `npx ${LUMA_NPM_PACKAGE} ${argv.join(' ')}`,
  });
}

async function ask(question, defaultValue = 'y') {
  if (nonInteractive) {
    return defaultValue;
  }

  const suffix = defaultValue ? ` (${defaultValue === 'y' ? 'Y/n' : 'y/N'})` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim().toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  return answer;
}

console.log(`
 luma-browser setup
 Browser automation + recorded QA sessions for coding agents
`);

const hasLuma = commandExists('luma-browser') && lumaVersion();

if (hasLuma) {
  console.log('✓ luma-browser is already on PATH');
  const reinstall = await ask('Reinstall / upgrade global luma-browser anyway?', 'n');
  if (reinstall !== 'y' && reinstall !== 'yes') {
    console.log('Skipping global install.');
  } else {
    run('npm', ['install', '-g', LUMA_NPM_PACKAGE], {
      label: `npm install -g ${LUMA_NPM_PACKAGE}`,
    });
    run('luma-browser', ['install'], { label: 'luma-browser install (Chromium)' });
  }
} else {
  const installGlobal = await ask('Install luma-browser globally with npm?', 'y');

  if (installGlobal === 'y' || installGlobal === 'yes') {
    run('npm', ['install', '-g', LUMA_NPM_PACKAGE], {
      label: `npm install -g ${LUMA_NPM_PACKAGE}`,
    });
    run('luma-browser', ['install'], { label: 'luma-browser install (Chromium)' });
  } else {
    console.log('\nSkipping global install. Use npx for one-off runs:');
    console.log(`  npx ${LUMA_NPM_PACKAGE} install`);
    console.log(`  npx ${LUMA_NPM_PACKAGE} --headless <<'EOF' … EOF`);
    const installNow = await ask(`Run npx ${LUMA_NPM_PACKAGE} install now?`, 'y');
    if (installNow === 'y' || installNow === 'yes') {
      npxLuma(['install']);
    }
  }
}

console.log(`
 Next steps
 ──────────
 • Quick test:  luma-browser run examples/example.com.js
 • Record QA:   bash examples/session-demo.sh
 • Full help:   luma-browser --help

 Agent plugins (pick your editor):
 • GitHub Copilot — custom agents in .github/agents/ (luma-automate, luma-session, …)
                   + .github/copilot-instructions.md for repo context
 • Claude Code   — /plugin marketplace add JagannathaReddy/luma-browser
 • Cursor        — install "luma-browser" from Marketplace
 • Codex         — plugins/luma/.codex-plugin/plugin.json

 Docs: https://github.com/JagannathaReddy/luma-browser
`);

if (rl) {
  rl.close();
}
