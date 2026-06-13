// Fetch top Hacker News titles with graceful degradation.
const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const page = await browser.getPage('main');
await page.goto('https://news.ycombinator.com', { waitUntil: 'domcontentloaded' });

const ok = await safe(
  () => page.waitForSelector('tr.athing', { timeout: 15000 }).then(() => true),
  false,
);

if (!ok) {
  console.log('WARN: rows not found');
} else {
  const titles = await safe(
    () =>
      page.evaluate(() =>
        [...document.querySelectorAll('span.titleline > a')]
          .slice(0, 10)
          .map((a) => a.textContent),
      ),
    [],
  );
  console.log(JSON.stringify(titles, null, 2));
}
