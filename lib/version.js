import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let cachedVersion;

export function getPackageVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  cachedVersion = packageJson.version ?? '0.0.0';
  return cachedVersion;
}
