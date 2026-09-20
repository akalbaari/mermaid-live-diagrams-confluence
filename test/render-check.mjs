// Renders every shipped template plus the error, empty and injection cases
// in a real browser, and asserts three things a screenshot cannot: that each
// diagram contains its own label text, that no element capable of fetching a
// remote resource survives, and that nothing reaches the network mid-render.
//
//   npm run build:harness && node test/render-check.mjs

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'static/harness');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
    res.writeHead(404); res.end('nope'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4173, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

const consoleErrors = [];
const offsiteRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost:4173/')) offsiteRequests.push(u); });
page.on('requestfailed', (r) => consoleErrors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`); });
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForFunction('window.__done === true', null, { timeout: 60000 });

const results = await page.evaluate(() => window.__results);
const pwned = await page.evaluate(() => window.__pwned ?? null);

let failed = 0;
for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  if (!r.pass) failed++;
  console.log(
    `${mark}  ${r.label.padEnd(34)} ${r.actual.padEnd(5)} svg=${String(r.svgBytes).padStart(6)}B natural=${String(r.naturalWidth).padStart(4)} remote=${r.remoteElements}` +
    (r.missingLabels?.length ? `\n        MISSING LABELS: ${r.missingLabels.join(', ')}` : '') +
    (r.message ? `\n        ${r.message.split('\n')[0]}` : '')
  );
}
console.log('\nXSS probe window.__pwned:', pwned === null ? 'not set (good)' : `SET -> ${pwned} (BAD)`);
if (pwned !== null) failed++;
const strayLocal = consoleErrors.filter((e) => e.startsWith('HTTP 404 http://localhost:4173/') && !e.includes('favicon'));
console.log('\nOff-site requests during render:', offsiteRequests.length ? offsiteRequests : 'none (good)');
if (offsiteRequests.length) failed++;
console.log('Unexpected local 404s:', strayLocal.length ? strayLocal : 'none (good)');
if (strayLocal.length) failed++;
console.log('Console errors:', consoleErrors.length);
consoleErrors.slice(0, 20).forEach((e) => console.log('   ', e.slice(0, 200)));

await page.screenshot({ path: 'test/harness.png', fullPage: true });
await browser.close();
server.close();
console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
