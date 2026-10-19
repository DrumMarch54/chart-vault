// Read the paid tool's own color rules off its live page (owner 2026-10-19: the colors changed over time, so
// the vault's old screenshots are not the truth; the live tool is). Signs in to numpromember.com with
// NUMPRO_USER / NUMPRO_PASSWORD from the environment (never in the repo, never printed), opens the members'
// home page, and saves from the page's own script:
//   tables.json  the ten color tables (one per kind of position; index = the number, 1..99, an rgba each)
//   rules.json   per number of name words (1..5): which table colors which element id (PLAIN = no color)
// Then `node gen.mjs` turns them into public/number-colors.js. Never run by verify; spends nothing.
//   node fetch.mjs            sign in and read the live page
//   node fetch.mjs <file.js>  read a saved copy of the page's script instead
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);

export function extract(src) {
  const tables = {};
  for (const m of src.matchAll(/([A-Za-z_]*[Cc]olor[A-Za-z_]*Array[A-Za-z_]*)\s*=\s*\[([^\]]*)\]/g)) tables[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  const lines = src.split('\n');
  const starts = []; lines.forEach((l, i) => { if (/^\s*(var )?firstname = nameArray\[0\];/.test(l)) starts.push(i); });
  const rules = {};
  for (let b = 0; b < starts.length; b++) {
    const from = starts[b], to = b + 1 < starts.length ? starts[b + 1] : lines.length, map = {};
    for (let i = from; i < to; i++) {
      let m;
      if ((m = /getElementById\("([A-Za-z0-9]+)"\)\.innerHTML = "<span style='color:"\+([A-Za-z]+)\[/.exec(lines[i]))) map[m[1]] = m[2];
      else if ((m = /getElementById\("([A-Za-z0-9]+)"\)\.innerHTML = ([A-Za-z0-9]+Top);/.exec(lines[i]))) map[m[1]] = map[m[1]] || 'PLAIN';
    }
    rules[b + 1] = map;
  }
  // The main spine is colored outside the per-word-count blocks: always the spine table.
  const spine = /getElementById\("spine"\)\.innerHTML = "<span style='color:"\+([A-Za-z]+)\[/.exec(src);
  for (const k of Object.keys(rules)) if (spine && !rules[k].spine) rules[k].spine = spine[1];
  return { tables, rules, blocks: starts.map((s) => s + 1) };
}

async function fromLive() {
  const user = process.env.NUMPRO_USER, pass = process.env.NUMPRO_PASSWORD;
  if (!user || !pass) { console.error('Set NUMPRO_USER and NUMPRO_PASSWORD in the environment first.'); process.exit(2); }
  const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.js').catch(() => import('playwright'));
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://numpromember.com/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const form = page.locator('form.login').first();
    await form.locator('input[name=email]').fill(user); await form.locator('input[name=password]').fill(pass);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}), form.locator('button, input[type=submit]').first().click()]);
    await page.waitForTimeout(2000);
    if (!/your-products|numerologist/.test(page.url())) { console.error('Sign-in refused (still on ' + page.url().replace(/\?.*/, '') + ').'); process.exit(3); }
    await page.goto('https://numpromember.com/numerologist-home/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    const scripts = await page.$$eval('script:not([src])', (ss) => ss.map((s) => s.textContent));
    const src = scripts.find((s) => /colorNameArray\s*=\s*\[/.test(s));
    if (!src) { console.error('The page has no color tables in its script any more; the tool changed.'); process.exit(4); }
    return src;
  } finally { await browser.close(); }
}

const file = process.argv[2];
const src = file ? fs.readFileSync(file, 'utf8') : await fromLive();
const { tables, rules, blocks } = extract(src);
fs.writeFileSync(path.join(here, 'tables.json'), JSON.stringify(tables, null, 0) + '\n');
fs.writeFileSync(path.join(here, 'rules.json'), JSON.stringify(rules, null, 1) + '\n');
console.log(`tables: ${Object.keys(tables).map((k) => `${k} (${tables[k].length})`).join(', ')}\nblocks by name words at script lines ${blocks.join(' ')}\nsaved tables.json and rules.json; now: node gen.mjs`);
