import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test } from 'node:test';
import { internalSelectorToExpression } from '../lib/report/locator-export.js';
import { decodeTraceZip } from '../lib/report/trace-decode.js';
import { exportPlaywrightScript } from '../lib/report/export-script.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

test('internalSelectorToExpression maps Playwright internal selectors', () => {
  assert.equal(internalSelectorToExpression('internal:role=heading'), 'page.getByRole("heading")');
  assert.equal(
    internalSelectorToExpression('internal:text="Learn more"i'),
    'page.getByText("Learn more", {"exact":false})',
  );
  assert.equal(internalSelectorToExpression('p >> nth=0'), 'page.locator("p").first()');
  assert.equal(internalSelectorToExpression('button.submit'), 'page.locator("button.submit")');
});

test('decodeTraceZip decodes real Playwright fixture', async () => {
  const actions = await decodeTraceZip(join(fixturesDir, 'example-flow.trace.zip'));

  assert.ok(actions.length >= 4);
  assert.equal(actions[0].method, 'goto');
  assert.equal(actions[1].params.locatorExpression, 'page.getByRole("heading")');
  assert.equal(
    actions[2].params.locatorExpression,
    'page.getByText("Learn more", {"exact":false})',
  );
  assert.equal(actions[3].params.locatorExpression, 'page.locator("p").first()');
});

test('exportPlaywrightScript golden fixture snapshot', async () => {
  const actions = await decodeTraceZip(join(fixturesDir, 'example-flow.trace.zip'));
  const script = exportPlaywrightScript(actions, { stepName: 'flow' });
  const expected = await readFile(join(fixturesDir, 'example-flow.exported.spec.js'), 'utf8');

  assert.equal(script, expected);
});
