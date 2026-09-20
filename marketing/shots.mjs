// Captures the raw screenshots that the Marketplace highlight images are
// composited from. Everything here is the real UI rendered by the shipped
// code; nothing is mocked up.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve(root, port) {
  const ROOT = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

const OUT = path.resolve('marketing/out');
fs.mkdirSync(OUT, { recursive: true });

const shotsServer = await serve('static/shots', 4190);
const editorServer = await serve('static/preview', 4191);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// 1. the editor, with its live preview
{
  const page = await browser.newPage({ viewport: { width: 1360, height: 760 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4191/', { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.fill('#source', [
    'flowchart LR',
    '  A[Pull request] --> B{CI green?}',
    '  B -- yes --> C[Review]',
    '  B -- no --> D[Fix and push]',
    '  D --> B',
    '  C --> E[Merge]',
  ].join('\n'));
  await page.fill('#caption', 'How a change reaches main');
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(OUT, 'raw-editor.png') });
  await page.close();
  console.log('captured editor');
}

// 2 and 3. the diagram gallery, light and dark
for (const theme of ['default', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 640 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:4190/?theme=${theme}&set=Flowchart,Sequence diagram,Class diagram,Pie chart,Git graph,User journey`, { waitUntil: 'load' });
  await page.waitForFunction('window.__done === true', null, { timeout: 60000 });
  await page.waitForTimeout(700);
  const name = theme === 'dark' ? 'raw-gallery-dark.png' : 'raw-gallery-light.png';
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  await page.close();
  console.log('captured gallery', theme);
}

await browser.close();
shotsServer.close();
editorServer.close();
