// Render charts from inputs with our app at the reference screenshots' scale: ours/<id>.png
import fs from 'node:fs';
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
const [inputsFile, outDir, count] = process.argv.slice(2);
const inputs = JSON.parse(fs.readFileSync(inputsFile, 'utf8'));
const pick = inputs.filter((x, i) => i % Math.ceil(inputs.length / Number(count)) === 0).slice(0, Number(count));
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1080 / 390 });
await page.goto('http://127.0.0.1:3399/?t=dev', { waitUntil: 'networkidle' });
await page.goto('http://127.0.0.1:3399/#/quick', { waitUntil: 'networkidle' });
for (const x of pick) {
  await page.fill('input[placeholder=day]', String(x.day)); await page.fill('input[placeholder=month]', String(x.month)); await page.fill('input[placeholder=year]', String(x.year));
  await page.fill('input[placeholder="Full name"]', x.name);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}/${x.id}.png`, fullPage: true });
}
await browser.close();
console.log('rendered', pick.map((x) => x.id).join(' '));
