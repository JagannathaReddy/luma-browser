#!/usr/bin/env node

// `luma` is the orchestrator — sessions, viewer, daemon lifecycle.
// `luma-browser` is the automation engine — run scripts via stdin or files.

// Compiled into dist/bin/luma.js → resolves to dist/lib/cli.js.
import { main } from '../lib/cli.js';

main(process.argv.slice(2), { mode: 'orchestrator' }).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
