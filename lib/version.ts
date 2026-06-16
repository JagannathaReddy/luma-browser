import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let cachedVersion: string | undefined;

export function getPackageVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  // Walk up from this file until we find a package.json whose name is
  // @jagannathamv/luma-browser. Works whether running from source (`lib/`
  // via tsx) or from compiled output (`dist/lib/`).
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8'));
        if (pkg.name === '@jagannathamv/luma-browser') {
          const resolved: string = pkg.version ?? '0.0.0';
          cachedVersion = resolved;
          return resolved;
        }
      } catch {
        // Fall through to keep walking.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  cachedVersion = '0.0.0';
  return '0.0.0';
}
