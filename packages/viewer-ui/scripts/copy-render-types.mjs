#!/usr/bin/env node

import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
copyFileSync(join(root, '../src/render.d.ts'), join(root, '../dist/render.d.ts'));
