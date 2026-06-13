#!/usr/bin/env node

import { accessSync, constants } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
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

function npmGlobalPrefix() {
  const result = spawnSync('npm', ['config', 'get', 'prefix'], { encoding: 'utf8' });
  const raw = result.stdout?.trim() || '/usr/local';
  return raw.startsWith('~') ? join(homedir(), raw.slice(1)) : raw;
}

function canInstallGlobal() {
  const prefix = npmGlobalPrefix();
  try {
    accessSync(prefix, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function printGlobalInstallHint() {
  console.log(`
 Global npm install needs a writable prefix (default /usr/local often requires sudo).

 Fix once — user-owned global packages:
   mkdir -p ~/.npm-global
   npm config set prefix ~/.npm-global
   echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc

 Or skip global install and use npx:
   npx ${LUMA_NPM_PACKAGE} install
   npx ${LUMA_NPM_PACKAGE} --help
`);
}

function lumaOnPath() {
  return commandExists('luma-browser') && spawnSync('luma-browser', ['--help'], { encoding: 'utf8' }).status === 0;
}

function npxLuma(argv, { optional = false } = {}) {
  return run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [LUMA_NPM_PACKAGE, ...argv], {
    label: `npx ${LUMA_NPM_PACKAGE} ${argv.join(' ')}`,
    optional,
  });
}

function installGlobalPackage() {
  return run('npm', ['install', '-g', LUMA_NPM_PACKAGE], {
    label: `npm install -g ${LUMA_NPM_PACKAGE}`,
    optional: true,
  });
}

function installChromium({ useGlobalCli }) {
  if (useGlobalCli && lumaOnPath()) {
    return run('luma-browser', ['install'], { label: 'luma-browser install (Chromium)', optional: true });
  }
  return npxLuma(['install']);
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

async function setupWithNpx() {
  console.log('\nUsing npx (no global install).');
  console.log(`  npx ${LUMA_NPM_PACKAGE} install`);
  console.log(`  npx ${LUMA_NPM_PACKAGE} --headless <<'EOF' … EOF`);
  const installNow = await ask(`Run npx ${LUMA_NPM_PACKAGE} install now?`, 'y');
  if (installNow === 'y' || installNow === 'yes') {
    npxLuma(['install']);
  }
}

async function setupWithGlobalInstall() {
  const installed = installGlobalPackage();
  if (!installed) {
    printGlobalInstallHint();
    await setupWithNpx();
    return;
  }
  installChromium({ useGlobalCli: true });
}

console.log(`
 luma-browser setup
 Browser automation + recorded QA sessions for coding agents
`);

const globalOk = canInstallGlobal();
if (!globalOk) {
  console.log('ℹ npm global prefix is not writable — will use npx unless you fix prefix (see hint below).');
}

const hasLuma = lumaOnPath();

if (hasLuma) {
  console.log('✓ luma-browser is already on PATH');
  const reinstall = await ask('Reinstall / upgrade global luma-browser anyway?', 'n');
  if (reinstall === 'y' || reinstall === 'yes') {
    await setupWithGlobalInstall();
  } else {
    installChromium({ useGlobalCli: true });
  }
} else {
  const defaultGlobal = globalOk && !nonInteractive ? 'y' : 'n';
  const installGlobal = await ask('Install luma-browser globally with npm?', defaultGlobal);

  if ((installGlobal === 'y' || installGlobal === 'yes') && globalOk) {
    await setupWithGlobalInstall();
  } else {
    if ((installGlobal === 'y' || installGlobal === 'yes') && !globalOk) {
      printGlobalInstallHint();
    }
    await setupWithNpx();
  }
}

console.log(`
 Next steps
 ──────────
 • Quick test:  luma-browser run examples/example.com.js   (or npx ${LUMA_NPM_PACKAGE} run …)
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
