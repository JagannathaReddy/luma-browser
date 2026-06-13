import { writeFile } from 'fs/promises';
import { join } from 'path';
import { internalSelectorToExpression } from './locator-export.js';

const SCRIPT_HEADER = `import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
`;

const SCRIPT_FOOTER = `
await context.close();
await browser.close();
`;

export function actionToStatement(action) {
  const target = apiTarget(action);
  const args = formatArgs(action);

  if (!target) {
    return null;
  }

  if (action.error) {
    return `// ${action.apiName} failed: ${JSON.stringify(action.error.message ?? action.error)}`;
  }

  if (action.method === 'goto') {
    const url = action.params.url ?? action.params.urlString;
    if (!url) {
      return null;
    }
    const options = pickOptions(action.params, ['timeout', 'waitUntil', 'referer']);
    return formatCall(`${target}.goto`, [url, options]);
  }

  if (action.method === 'click') {
    return formatCall(`${target}.click`, args);
  }

  if (action.method === 'dblclick') {
    return formatCall(`${target}.dblclick`, args);
  }

  if (action.method === 'fill') {
    return formatCall(`${target}.fill`, args);
  }

  if (action.method === 'type') {
    return formatCall(`${target}.type`, args);
  }

  if (action.method === 'press') {
    return formatCall(`${target}.press`, args);
  }

  if (action.method === 'check' || action.method === 'uncheck') {
    return formatCall(`${target}.${action.method}`, args);
  }

  if (action.method === 'selectOption') {
    return formatCall(`${target}.selectOption`, args);
  }

  if (action.method === 'hover' || action.method === 'tap') {
    return formatCall(`${target}.${action.method}`, args);
  }

  if (action.method === 'screenshot') {
    return formatCall(`${target}.screenshot`, args);
  }

  if (action.method === 'waitForSelector') {
    return formatCall(`${target}.waitForSelector`, args);
  }

  if (action.method === 'waitForLoadState') {
    return formatCall(`${target}.waitForLoadState`, args);
  }

  if (
    action.method === 'title' ||
    action.method === 'url' ||
    action.method === 'textContent' ||
    action.method === 'innerText'
  ) {
    const value = action.result?.value ?? action.result ?? null;
    return `// ${action.apiName}() -> ${JSON.stringify(value)}`;
  }

  if (action.method === 'evaluate') {
    const expression = action.params.expression ?? action.params.arg ?? action.params.code;
    if (typeof expression === 'string') {
      return formatCall(`${target}.evaluate`, [expression, action.params.arg]);
    }
  }

  return formatCall(`${target}.${action.method}`, args);
}

export function exportPlaywrightScript(actions, { stepName = 'step' } = {}) {
  const lines = [
    `// Exported from luma-browser session step "${stepName}"`,
    `// Actions: ${actions.length}`,
    SCRIPT_HEADER.trimEnd(),
    '',
  ];

  for (const action of actions) {
    const statement = actionToStatement(action);
    if (statement) {
      lines.push(statement);
    }
  }

  lines.push(SCRIPT_FOOTER.trimEnd());
  return `${lines.join('\n')}\n`;
}

export async function writeExportedScript(stepDir, actions, { stepName } = {}) {
  const script = exportPlaywrightScript(actions, { stepName });
  const path = join(stepDir, 'exported.spec.js');
  await writeFile(path, script);
  return { path, script, actionCount: actions.length };
}

function apiTarget(action) {
  if (action.params?.locatorExpression) {
    return action.params.locatorExpression;
  }

  if (action.class === 'Keyboard') {
    return 'page.keyboard';
  }
  if (action.class === 'Mouse') {
    return 'page.mouse';
  }
  if (action.class === 'Locator' && action.params.selector) {
    return (
      internalSelectorToExpression(action.params.selector) ??
      `page.locator(${JSON.stringify(action.params.selector)})`
    );
  }
  if (action.class === 'Frame' || action.class === 'Page') {
    return 'page';
  }
  if (action.class === 'ElementHandle') {
    return 'elementHandle';
  }
  return 'page';
}

function formatArgs(action) {
  const params = { ...(action.params ?? {}) };
  params.selector = undefined;
  params.locatorExpression = undefined;
  params.expression = undefined;
  params.code = undefined;
  params.url = undefined;
  params.urlString = undefined;
  params.arg = undefined;

  const positional = [];
  if (action.params.text != null) {
    positional.push(action.params.text);
  } else if (action.params.value != null) {
    positional.push(action.params.value);
  } else if (action.params.key != null) {
    positional.push(action.params.key);
  } else if (
    action.params.selector != null &&
    action.class !== 'Locator' &&
    !action.params.locatorExpression
  ) {
    positional.push(action.params.selector);
  }

  const options = pickOptions(params, [
    'timeout',
    'waitUntil',
    'button',
    'clickCount',
    'delay',
    'force',
    'noWaitAfter',
    'position',
    'modifiers',
    'strict',
    'path',
    'fullPage',
    'type',
    'state',
  ]);

  if (Object.keys(options).length > 0) {
    positional.push(options);
  }

  return positional;
}

function pickOptions(params, keys) {
  const options = {};
  for (const key of keys) {
    if (params[key] !== undefined) {
      options[key] = params[key];
    }
  }
  return options;
}

function formatCall(target, args) {
  if (args.length === 0) {
    return `await ${target}();`;
  }

  if (args.length === 1) {
    return `await ${target}(${literal(args[0])});`;
  }

  return `await ${target}(${args.map(literal).join(', ')});`;
}

function literal(value) {
  if (value === undefined) {
    return 'undefined';
  }
  return JSON.stringify(value);
}
