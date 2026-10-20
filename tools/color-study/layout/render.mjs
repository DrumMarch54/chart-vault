// Render the quick chart for one name/date in the dev app at phone width, save the chart alone as PNG.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; for (const s of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { ({ chromium } = require(s)); break; } catch {} }
const [out, day, month, year, name] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1440 / 390, isMobile: true, hasTouch: true });
await page.goto('http://127.0.0.1:3399/?t=dev', { waitUntil: 'networkidle' });
await page.goto('http://127.0.0.1:3399/#/quick'); await page.waitForTimeout(400);
await page.fill('input[placeholder="day"]', day); await page.fill('input[placeholder="month"]', month); await page.fill('input[placeholder="year"]', year);
await page.fill('input[placeholder="Full name"]', name); await page.waitForTimeout(600);
await page.locator('.nscope').first().screenshot({ path: out });
await page.screenshot({ path: out.replace('.png', '-page.png') });
await browser.close(); console.log('saved', out);
