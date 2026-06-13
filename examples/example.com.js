// Open example.com and print the page title.
const page = await browser.getPage('main');
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
console.log(await page.title());
