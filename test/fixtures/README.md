# Trace fixtures

Golden Playwright trace archives for decode/export regression tests.

| File | Description |
|------|-------------|
| `example-flow.trace.zip` | Real Chromium trace: goto, getByRole click, getByText click, locator().first().textContent() |
| `example-flow.exported.spec.js` | Expected `exported.spec.js` output for the flow fixture |
| `example-getbyrole.trace.zip` | Minimal trace with getByRole heading click |

Regenerate after changing `lib/report/trace-decode.js` or `lib/report/export-script.js`:

```bash
node --input-type=module -e "
import { decodeTraceZip } from './lib/report/trace-decode.js';
import { exportPlaywrightScript } from './lib/report/export-script.js';
import { writeFile } from 'fs/promises';
const actions = await decodeTraceZip('./test/fixtures/example-flow.trace.zip');
await writeFile('./test/fixtures/example-flow.exported.spec.js', exportPlaywrightScript(actions, { stepName: 'flow' }));
"
```
