#!/usr/bin/env node
// `luma-browser` is the automation engine — run scripts via stdin or files.
// Use `luma` for sessions, viewer, and daemon lifecycle.
// Compiled into dist/bin/luma-browser.js → resolves to dist/lib/cli.js.
import { main } from '../lib/cli.js';
main(process.argv.slice(2), { mode: 'engine' }).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});
//# sourceMappingURL=luma-browser.js.map