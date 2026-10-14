#!/usr/bin/env node
// Read the LIVE Chart Vault from a Claude session (or a laptop).
//
//   node tools/report.mjs short          counts + last 20 log lines
//   node tools/report.mjs full           everything (missing files, history, logs)
//   node tools/report.mjs <id|filename>  one chart in detail
//   node tools/report.mjs screens <dir>  log in with Playwright at 390x844, open every tab, save PNGs
//
// Reads only CHART_VAULT_URL (default https://charts.tiktok-automation.com) and
// LIVE_APP_TOKEN (the app password, shared with the first app) from the
// environment. LIVE_APP_URL is deliberately ignored: it belongs to the first app.
// Never prints the password.
// Exit codes: 0 ok, 1 bad usage, 2 no token, 3 refused (wrong password), 4 unreachable.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const URL_BASE = (process.env.CHART_VAULT_URL || 'https://charts.tiktok-automation.com').replace(/\/$/, '');
const TOKEN = process.env.LIVE_APP_TOKEN || '';
const [cmd = 'short', arg] = process.argv.slice(2);

function noToken() {
  console.error([
    'LIVE_APP_TOKEN is not set, so the live app cannot be read.',
    'To add it: in the Claude Code session title bar open the cloud environment menu, choose Edit on the "Main" environment,',
    'and add LIVE_APP_TOKEN = <the Chart Vault password> under Network secrets (or Environment variables).',
    'A new session picks it up. Do not paste the password into the chat.',
  ].join('\n'));
  process.exit(2);
}

async function get(p) {
  let res;
  try {
    res = await fetch(URL_BASE + p, { headers: { Authorization: `Bearer ${TOKEN}` } });
  } catch (err) {
    console.error(`Cannot reach ${URL_BASE}: ${err.message}`); process.exit(4);
  }
  if (res.status === 401 || res.status === 403) { console.error('The live app refused the token (wrong LIVE_APP_TOKEN?).'); process.exit(3); }
  if (res.status >= 500 || res.status === 502 || res.status === 530) { console.error(`The live app answered ${res.status} (service down?).`); process.exit(4); }
  if (!res.ok) { console.error(`Unexpected ${res.status} for ${p}`); process.exit(4); }
  return res.text();
}

async function screens(dir) {
  const require = createRequire(import.meta.url);
  let chromium;
  for (const spec of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try { ({ chromium } = require(spec)); break; } catch {}
  }
  if (!chromium) { console.error('Playwright is not installed here; run: npm i -D playwright'); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  try {
    await page.goto(URL_BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (err) { console.error(`Cannot open ${URL_BASE}: ${err.message}`); await browser.close(); process.exit(4); }
  if (await page.locator('input[type=password]').count()) {
    await page.fill('input[type=password]', TOKEN);
    await page.click('button[type=submit]');
    try { await page.waitForSelector('#nav:not(.hidden)', { timeout: 15000 }); }
    catch { console.error('Login was refused.'); await browser.close(); process.exit(3); }
  }
  const shots = [['browse', '#/'], ['upload', '#/upload'], ['tags', '#/import'], ['status', '#/status']];
  for (const [name, hash] of shots) {
    await page.goto(URL_BASE + '/' + hash, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
    console.log(`${name}.png`);
  }
  await page.goto(URL_BASE + '/#/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('.cell', { timeout: 8000 }).catch(() => {});
  const first = page.locator('.cell').first();
  if (await first.count()) {
    await first.click(); await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(dir, 'chart.png') }); console.log('chart.png');
  }
  await browser.close();
  if (errors.length) console.log('Browser errors:\n' + errors.join('\n'));
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 12).join('\n')); process.exit(1); }
if (!TOKEN) noToken();
if (cmd === 'short') console.log(await get('/api/debug/snapshot?scope=short'));
else if (cmd === 'full') console.log(await get('/api/debug/snapshot?scope=full'));
else if (cmd === 'screens') await screens(arg || 'screens');
else console.log(await get('/api/debug/snapshot?id=' + encodeURIComponent(cmd)));
