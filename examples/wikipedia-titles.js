const page = await browser.getPage('main');
await page.goto('https://en.wikipedia.org/wiki/Main_Page', { waitUntil: 'domcontentloaded' });

const titles = await page.evaluate(() =>
  [...document.querySelectorAll('#mp-topbanner li a, .mw-parser-output h2')]
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .slice(0, 8),
);

console.log(JSON.stringify({ url: page.url(), titles }, null, 2));
