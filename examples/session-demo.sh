#!/usr/bin/env bash
set -euo pipefail

# Multi-step recorded session demo (requires jq).
# Usage: bash examples/session-demo.sh

luma-browser install >/dev/null 2>&1 || true

id=$(luma-browser session start --name examples-session-demo --no-video | jq -r .sessionId)
echo "session: $id"

luma-browser --session "$id" --step open --headless --no-video <<'EOF'
const page = await browser.getPage('main');
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
console.log('title:', await page.title());
EOF

luma-browser --session "$id" --step verify-heading --headless --no-video <<'EOF'
const page = await browser.getPage('main');
const text = await page.locator('h1').textContent();
console.log(text?.includes('Example') ? 'PASS heading' : 'FAIL heading');
EOF

luma-browser session end "$id" >/dev/null
echo "report: ~/.luma-browser/sessions/$id/report.html"
echo "viewer: luma-browser viewer --session $id --open"
