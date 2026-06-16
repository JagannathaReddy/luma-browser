#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, lstatSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Source lives at scripts/postinstall.ts; compiled output at dist/scripts/postinstall.js.
// Two levels up from dist/scripts/ brings us back to the project root.
const projectRoot = join(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const packageName = packageJson.name;

function shouldFailInstall() {
  return !existsSync(join(projectRoot, '.git'));
}

function failOrWarn(message) {
  if (shouldFailInstall()) {
    throw new Error(message);
  }

  console.warn(`Warning: ${message}`);
}

function getNpmGlobalPaths() {
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
    return {
      binDir: platform() === 'win32' ? prefix : join(prefix, 'bin'),
      nodeModulesDir:
        platform() === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib', 'node_modules'),
    };
  } catch {
    return null;
  }
}

function isGlobalInstall() {
  if (process.env.npm_config_global === 'true') {
    return true;
  }

  const globalPaths = getNpmGlobalPaths();
  if (!globalPaths) {
    return false;
  }

  return projectRoot.toLowerCase() === join(globalPaths.nodeModulesDir, packageName).toLowerCase();
}

function fixUnixSymlink() {
  const globalPaths = getNpmGlobalPaths();
  if (!globalPaths) {
    return;
  }

  const launcher = join(projectRoot, 'bin', `${packageName}.js`);
  const symlinkPath = join(globalPaths.binDir, packageName);

  try {
    const stat = lstatSync(symlinkPath);
    if (!stat.isSymbolicLink()) {
      return;
    }
  } catch {
    return;
  }

  unlinkSync(symlinkPath);
  symlinkSync(launcher, symlinkPath);
  console.log('Optimized global install: npm bin symlink now targets the JS launcher.');
}

function fixWindowsShims() {
  const globalPaths = getNpmGlobalPaths();
  if (!globalPaths) {
    return;
  }

  const cmdShim = join(globalPaths.binDir, `${packageName}.cmd`);
  if (!existsSync(cmdShim)) {
    return;
  }

  const relativeLauncher = `node_modules\\${packageName}\\bin\\${packageName}.js`;
  writeFileSync(cmdShim, `@ECHO off\r\nnode "%~dp0${relativeLauncher}" %*\r\n`);
  writeFileSync(
    join(globalPaths.binDir, `${packageName}.ps1`),
    `#!/usr/bin/env pwsh\r\n$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent\r\n& node "$basedir\\${relativeLauncher}" $args\r\nexit $LASTEXITCODE\r\n`,
  );
  console.log('Optimized global install: Windows shims now target the JS launcher.');
}

try {
  if (!isGlobalInstall()) {
    process.exit(0);
  }

  if (platform() === 'win32') {
    fixWindowsShims();
  } else {
    fixUnixSymlink();
  }
} catch (error) {
  failOrWarn(error instanceof Error ? error.message : String(error));
}
