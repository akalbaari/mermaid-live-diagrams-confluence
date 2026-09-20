// Renders the SVG marketing assets to PNG at the exact sizes the Atlassian
// Marketplace listing form requires, using the same Chromium the render tests
// use. Sizes come from Atlassian's "Building your presence on Marketplace"
// page: logo 144x144, banner 1120x548 (560x274 standard), highlight images
// 1840x900 (920x450 standard) with 580x330 crops.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('marketing/out');
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  { svg: 'marketing/icon.svg', name: 'logo-144.png', w: 144, h: 144 },
  { svg: 'marketing/icon.svg', name: 'logo-512.png', w: 512, h: 512 },
  { svg: 'marketing/banner.svg', name: 'banner-1120x548.png', w: 1120, h: 548 },
  { svg: 'marketing/banner.svg', name: 'banner-560x274.png', w: 560, h: 274 },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const job of jobs) {
  if (!fs.existsSync(job.svg)) { console.log('skip (missing)', job.svg); continue; }
  const svg = fs.readFileSync(job.svg, 'utf8');
  const page = await browser.newPage({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:0;background:transparent">
     <div style="width:${job.w}px;height:${job.h}px">${svg
       .replace(/width="\d+"/, `width="${job.w}"`)
       .replace(/height="\d+"/, `height="${job.h}"`)}</div></body></html>`
  );
  await page.screenshot({ path: path.join(OUT, job.name), omitBackground: true });
  await page.close();
  console.log('wrote', job.name, `${job.w}x${job.h}`);
}

await browser.close();
