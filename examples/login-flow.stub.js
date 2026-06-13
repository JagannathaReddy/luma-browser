/**
 * Login flow stub — replace BASE_URL and selectors for your app.
 *
 * Run: luma-browser run examples/login-flow.stub.js
 * Record: luma-browser run examples/login-flow.stub.js --session <id> --step login
 */
const BASE_URL = 'http://localhost:3000';

const page = await browser.getPage('main');
await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

console.log('OBSERVE', page.url(), await page.title());
console.log((await page.snapshotForAI()).full);

// TODO: replace selectors after observing the page
// await page.getByLabel('Email').fill('demo@example.com');
// await page.getByLabel('Password').fill('secret');
// await page.getByRole('button', { name: 'Sign in' }).click();
// console.log('PASS login redirected to', page.url());

console.log('WARN stub only — update selectors from snapshotForAI output');
