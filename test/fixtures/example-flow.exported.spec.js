// Exported from luma-browser session step "flow"
// Actions: 4
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto("https://example.com", {"timeout":30000,"waitUntil":"domcontentloaded"});
await page.getByRole("heading").click({"timeout":30000,"strict":true});
await page.getByText("Learn more", {"exact":false}).click({"timeout":30000,"strict":true});
// locator("p").first().textContent() -> "As described in RFC 2606 and RFC 6761, a\nnumber of domains such as example.com and example.org are maintained\nfor documentation purposes. These domains may be used as illustrative\nexamples in documents without prior coordination with us. They are not\navailable for registration or transfer."

await context.close();
await browser.close();
