#!/usr/bin/env node

import { runWizard } from './wizard.js';

const args = process.argv.slice(2);
const nonInteractive = args.includes('--yes') || args.includes('-y');

runWizard({ nonInteractive });
