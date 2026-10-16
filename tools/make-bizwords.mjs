#!/usr/bin/env node
// Builds public/bizwords.js: the business words of every number 1-99 and the price rules' words, from the
// owner's Drive folder "Business PDF's" (.brain/numerology/README.md has the file ids). The books are not in
// the repo; download them and run:
//   node tools/make-bizwords.mjs --business99 NBE-TheNumbers1-99Business-v1.pdf --overview99 NP-NumbersOverview1-99.pdf \
//        --marketing NPB-MarketingNumerology-v1.pdf --manual NPB-BusinessManual-INT-ver1.pdf --module12 "module 12 biz num.pdf"
// Needs pdftotext and pdftohtml (poppler). What it reads, with the books' own words:
//   business99  The Numbers 10-99 in Business: name, words and caution of 10-99, the summary of each 1-9 family, and
//               the color code of each number (green / black / orange / red, read from the colored list lines)
//   overview99  Numbers Overview 1-99: the general meaning of every number 1-99 (balance and imbalance)
//   marketing   Marketing Numerology pp. 37-55: the clean prices, the digit-sum prices, the softer prices, the
//               $100-$900 prices, the book's example prices and the summary words of each price vibration
//   manual      Business Manual pp. 12-18: "1 Business" … "9 Business" (a company's day vibration and essence)
//   module12    Module 12 slides pp. 4 and 10: which numbers suit which customers, the number codes by purpose
// The output is generated: never hand-edit public/bizwords.js, change this script and run it again.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const need = ['business99', 'overview99', 'marketing', 'manual', 'module12'];
const missing = need.filter((k) => !args[k] || !fs.existsSync(args[k]));
if (missing.length) { console.error(`missing: ${missing.join(', ')}\nusage: node tools/make-bizwords.mjs ${need.map((k) => `--${k} <pdf>`).join(' ')}`); process.exit(2); }

// One string per page (index 0 = page 1), -raw keeps each paragraph in reading order.
const pages = (pdf) => execFileSync('pdftotext', ['-raw', pdf, '-'], { maxBuffer: 64 << 20 }).toString('utf8').split('\f');
const BULLET = /^[\u0084•]\s*/;
// Lines → one paragraph: a hyphen at a line end followed by a lower-case word is a broken word; mend it.
const join = (lines) => lines.map((l) => l.trim()).filter(Boolean).reduce((a, l) => (a.endsWith('-') && /^[a-z]/.test(l) ? a.slice(0, -1) + l : a ? a + ' ' + l : l), '');
const tidy = (s) => s.replace(/\s+/g, ' ').replace(/ ([,.;:!?])/g, '$1').trim();
const ds = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const digitsum = (s) => String(s).replace(/\D/g, '').split('').reduce((a, d) => a + Number(d), 0);

// ---------- The Numbers 10-99 in Business ----------
function business99(pdf) {
  const P = pages(pdf);
  const text = P.join('\n');
  const lines = text.split('\n').map((l) => l.trim());
  const numbers = {}, groups = {};
  const head = /^(\d\d)\/(\d) – (.+)$/;
  const listLine = /^(\d\d\/\d\s*){3,}$/;
  let cur = null;
  const flush = () => { if (!cur) return; const warn = []; const body = []; let inWarn = false;
    for (const l of cur.lines) { if (l.startsWith('⚠')) { inWarn = true; warn.push(l.replace(/^⚠\s*/, '')); } else if (inWarn) warn.push(l); else body.push(l); }
    numbers[cur.n] = { name: cur.name, text: tidy(join(body)), ...(warn.length ? { warn: tidy(join(warn)) } : {}) }; cur = null; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = head.exec(l);
    if (m) { flush(); cur = { n: Number(m[1]), name: m[3].trim(), lines: [] }; continue; }
    if (/^The \d Numbers – /.test(l) || /^Summary of the essence/.test(l) || listLine.test(l)) { flush(); continue; }
    if (cur && l) cur.lines.push(l);
  }
  flush();
  // The family summaries: "The 4 Numbers – Structure, …" then "Summary of the essence and tone of the 4 numbers:" then
  // the summary until the colored list line. The 1s are printed differently ("…of the 1 numbers:– Leadership, …").
  for (let g = 1; g <= 9; g++) {
    const at = text.indexOf(`Summary of the essence and tone of the ${g} numbers:`);
    if (at < 0) continue;
    const rest = text.slice(at).split('\n');
    const end = rest.findIndex((l, k) => k > 0 && listLine.test(l.trim()));
    let body = rest.slice(1, end);
    let title = '';
    const before = text.slice(0, at).split('\n').map((l) => l.trim()).filter(Boolean);
    const tl = before.reverse().findIndex((l) => new RegExp(`^The ${g} Numbers – `).test(l));
    if (tl >= 0 && tl <= 2) title = join(before.slice(0, tl + 1).reverse()).replace(/^The \d Numbers – /, '');
    const first = rest[0].split(':–')[1];
    if (first !== undefined) { // the 1s: the title follows ":–" and may run over one more line
      const k = body.findIndex((l) => new RegExp(`^The ${g} numbers`).test(l.trim()));
      title = join([first, ...body.slice(0, k)]); body = body.slice(k);
    }
    groups[g] = { title: tidy(title), text: tidy(join(body)) };
  }
  // The color codes: the list line under each summary is printed in green / black / orange / red (the book's key,
  // p. 1). pdftohtml keeps each run's font color. A few numbers are printed in the heading blue, which the key does
  // not name: they are kept as "blue" and the app shows no color word for them.
  const COLORS = { '#008000': 'green', '#000000': 'black', '#ff6600': 'orange', '#ff0000': 'red', '#345a8a': 'blue' };
  const xml = execFileSync('pdftohtml', ['-xml', '-i', '-stdout', '-q', pdf], { maxBuffer: 64 << 20 }).toString('utf8');
  const fonts = {};
  for (const m of xml.matchAll(/<fontspec id="(\d+)" size="(\d+)" family="([^"]+)" color="(#[0-9a-f]{6})"/g)) fonts[m[1]] = { size: Number(m[2]), color: m[4] };
  const color = {};
  for (const m of xml.matchAll(/<text [^>]*font="(\d+)"[^>]*>(.*?)<\/text>/g)) {
    const f = fonts[m[1]], s = m[2].replace(/<[^>]+>/g, '');
    if (!f || f.size < 20 || !/^\s*(\d\d\/\d\s*)+$/.test(s)) continue;
    for (const t of s.matchAll(/(\d\d)\/\d/g)) { const n = Number(t[1]); if (!color[n]) color[n] = COLORS[f.color] || f.color; }
  }
  for (const [n, c] of Object.entries(color)) if (numbers[n]) numbers[n].color = c;
  // The key (p. 1): "Green = Excellent for business – strong and stable energy." …
  const key = {};
  for (const m of text.matchAll(/^(Green|Black|Orange|Red) = (.+)$/gm)) key[m[1].toLowerCase()] = tidy(m[2]).replace(/\.$/, '');
  return { numbers, groups, key };
}

// ---------- Numbers Overview 1-99 ----------
function overview99(pdf) {
  const lines = pages(pdf).join('\n').split('\n').map((l) => l.trim());
  const out = {}, groups = {};
  let cur = null;
  const flush = () => { if (cur) out[cur.n] = { name: cur.name, text: tidy(join(cur.lines)) }; cur = null; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const g = /^THE (\d) NUMBERS$/.exec(l);
    if (g) { // "THE 1 NUMBERS" / "10/1 · 19/1 …" / the keywords, sometimes over two lines, until the first number
      flush(); const kw = []; let k = i + 2; for (; k < lines.length && !/^\d{1,2}(?:\/\d)? – /.test(lines[k]); k++) kw.push(lines[k]);
      groups[g[1]] = tidy(join(kw)); i = k - 1; continue; }
    const m = /^(\d{1,2})(?:\/\d)? – (.+)$/.exec(l);
    if (m) { flush(); cur = { n: Number(m[1]), name: m[2].trim(), lines: [] }; continue; }
    if (cur && l && !/^\d{1,2}$/.test(l)) cur.lines.push(l);
  }
  flush();
  return { numbers: out, groups };
}

// ---------- Marketing Numerology (prices) ----------
function marketing(pdf) {
  const P = pages(pdf);
  // Page noise out (the page number, the running "BUSINESS" header); keep the page number of every line.
  const L = [];
  P.forEach((pg, i) => pg.split('\n').forEach((l) => { l = l.trim(); if (l && !/^\d{1,3}$/.test(l) && l !== 'BUSINESS') L.push({ l, p: i + 1 }); }));
  const at = (re, from = 0) => { for (let i = from; i < L.length; i++) if (re.test(L[i].l)) return i; return -1; };
  const until = (i, stop) => { const out = []; for (let k = i; k < L.length && !stop(L[k].l); k++) out.push(L[k].l); return out; };
  const start = at(/^MAGNETIC ATTRACTIVE$/), end = at(/^MAGNETIC BOOST$/, start);
  const sec = L.slice(start, end);
  const sums = {}, clean = {}, families = {}, labels = {}, hundreds = {}, examples = [];
  // Digit-sum prices, pp. 41-44: "Digit Sum 5 Prices" / keywords / "14/5 PRICES" / words …
  for (let i = 0; i < sec.length; i++) {
    const f = /^Digit Sum (\d) Prices$/.exec(sec[i].l);
    if (f) { const kw = []; for (let k = i + 1; k < sec.length && !/PRICES$/.test(sec[k].l); k++) kw.push(sec[k].l); families[f[1]] = { words: tidy(join(kw)), page: sec[i].p }; }
    const s = /^(\d\d)\/(\d) PRICES$/.exec(sec[i].l);
    if (s) { const body = []; for (let k = i + 1; k < sec.length && !/PRICES$|^Digit Sum/.test(sec[k].l); k++) body.push(sec[k].l); sums[s[1]] = { text: tidy(join(body)), page: sec[i].p }; }
  }
  // Clean prices, pp. 38-39: "A FEMININE, BEAUTIFUL AND ENJOYABLE PRODUCT" / "24/6 The Queen Number" / words …
  for (let i = 0; i < sec.length; i++) {
    const h = /^(\d\d)\/(\d) (The .+)$/.exec(sec[i].l);
    if (!h || !/^[A-Z ,()]+$/.test(sec[i - 1].l)) continue;
    const body = []; for (let k = i + 1; k < sec.length && !(/^[A-Z ,()]{8,}$/.test(sec[k].l) && /^\d\d\/\d The /.test(sec[k + 1].l)) && sec[k].l !== 'Digit Sum Prices'; k++) body.push(sec[k].l);
    clean[h[1]] = { title: tidy(sec[i - 1].l.toLowerCase()), name: h[3], text: tidy(join(body)), page: sec[i].p };
  }
  // The summary words, pp. 52-53: " 19/1 as a digit sum - luck and flow", " 21/3 as a pure number - a … price - e.g. $210".
  const bullets = []; // bullet lines joined with their continuation lines
  // A bullet runs on to the next line only when that line starts lower-case, with a $ or a digit ("… e.g." / "$210 …").
  for (const x of sec) { const b = bullets[bullets.length - 1]; if (BULLET.test(x.l)) bullets.push({ l: x.l.replace(BULLET, ''), p: x.p, open: true }); else if (b && b.open && /^[a-z$\d(]/.test(x.l)) b.l += ' ' + x.l; else if (b) b.open = false; }
  for (const b of bullets) {
    const m = /^(\d+)\/(\d+) as a (digit sum|pure number) - (.+)$/.exec(join([b.l]));
    if (!m) continue;
    let [a, c] = [Number(m[1]), Number(m[2])]; if (a < 10 && c >= 10) [a, c] = [c, a]; // the book prints "9/27" once for 27/9
    const words = m[4].replace(/\s*-?\s*e\.g\..*$/i, '').replace(/\s*E\.g\..*$/, '').replace(/[.\s]+$/, '');
    labels[(m[3] === 'pure number' ? 'clean' : 'sum') + a] = { words, page: b.p };
  }
  // Softer prices, p. 53: "$285 = 15/6 (mysterious and alluring)" and "the number 33/6 which has both a strong and loving vibe".
  const all = sec.map((x) => x.l).join('\n');
  const soft33 = /number (\d\d)\/\d which has ([^.]+)\./.exec(join(all.split('\n')));
  if (soft33) labels['soft' + soft33[1]] = { words: soft33[2].replace(/^both /, ''), page: sec.find((x) => x.l.includes('Another 6 digit sum')).p };
  // The $100-$900 prices, p. 54: "$100 (winner mentality and easy to say yes …)".
  const hi = at(/^Prices in the hundreds$/);
  const hl = join(until(hi, (l) => /^TOOL:/.test(l)));
  for (const m of hl.matchAll(/\$([1-9])00 \(([^)]+)\)/g)) hundreds[m[1]] = { text: tidy(m[2]), page: L[hi].p };
  // The book's example prices (pp. 46-53): every "price = sum" with the note in brackets; checked against the digits.
  const exStart = at(/^Good Digit Sum Prices$/), exEnd = at(/^Prices in the hundreds$/);
  const noGo = at(/^No Go Prices$/), noGoEnd = at(/^Higher Prices: \$30,000/);
  const ex = [];
  for (let i = exStart; i < exEnd; i++) if (i < noGo || i >= noGoEnd) { if (BULLET.test(L[i].l) || /^Suggestion \d/.test(L[i].l) || /^\d[\d.,]* ?= ?\d/.test(L[i].l) || !ex.length) ex.push({ l: L[i].l.replace(BULLET, ''), p: L[i].p }); else ex[ex.length - 1].l += ' ' + L[i].l; }
  for (const e of ex) {
    for (const m of e.l.matchAll(/(?:Suggestion \d+:\s*)?(?:"[^"]*"\s*)?\$?(\d[\d.,]*\d|\d)\s*=\s*(\d+)(?:\/(\d))?(?:\s*\(([^)]*)\))?/g)) {
      const price = Number(m[1].replace(/[.,]/g, '')), sum = Number(m[2]);
      // A clean price is read by the number in it, not the digit sum: 19.000 = 19/1, 2.000 = 20/2 (pp. 47, 53).
      const cleanRead = String(price).startsWith(String(sum)) && /^0+$/.test(String(price).slice(String(sum).length));
      if (digitsum(price) !== sum && !cleanRead) { console.warn(`skipped example ${m[0]} (p. ${e.p}): digits add to ${digitsum(price)}`); continue; }
      if (examples.some((x) => x.price === price)) continue;
      examples.push({ price, sum, ...(digitsum(price) !== sum ? { clean: true } : {}), ...(m[4] ? { note: tidy(m[4]) } : {}), page: e.p });
    }
  }
  return { sums, clean, families, labels, hundreds, examples };
}

// ---------- Business Manual pp. 12-18: "1 Business" … "9 Business" ----------
function manual(pdf) {
  const P = pages(pdf);
  const L = [];
  P.forEach((pg, i) => pg.split('\n').forEach((l) => { l = l.trim(); if (l && !/^\d{1,3}$/.test(l)) L.push({ l, p: i + 1 }); }));
  const out = {};
  const stopAll = L.findIndex((x) => x.l === 'Finding the Right Registration Date');
  for (let i = 0; i < stopAll; i++) {
    const m = /^(\d) Business$/.exec(L[i].l);
    if (!m) continue;
    const part = []; let k = i + 1;
    for (; k < stopAll && !/^\d Business$/.test(L[k].l); k++) part.push(L[k].l);
    const t = join(part);
    const get = (from, to) => { const a = t.indexOf(from); if (a < 0) return ''; const b = to.map((x) => t.indexOf(x, a + from.length)).filter((x) => x > 0); return tidy(t.slice(a + from.length, b.length ? Math.min(...b) : undefined)); };
    const headEnd = Math.min(...['Keywords:'].map((x) => t.indexOf(x)).filter((x) => x >= 0));
    out[m[1]] = { head: tidy(t.slice(0, headEnd)), keywords: get('Keywords:', ['Examples:']), examples: get('Examples:', ['Contraindications:', 'Who?']), who: get('Who?', []), ...(t.includes('Contraindications:') ? { contra: get('Contraindications:', ['Who?']) } : {}), page: L[i].p };
  }
  return out;
}

// ---------- Module 12 slides: customers (p. 4) and number codes (p. 10) ----------
function module12(pdf) {
  const P = pages(pdf);
  const bullets = (pg) => { const out = []; for (const l of pg.split('\n').map((x) => x.trim()).filter(Boolean)) { if (l.startsWith('•')) out.push(l.replace(/^•\s*/, '')); else if (out.length) out[out.length - 1] += ' ' + l; } return out; };
  const p4 = P.findIndex((pg) => /Different customers need different energies/.test(pg));
  const p10 = P.findIndex((pg) => /NUMBER CODES IN SUB NUMEROSCOPES/.test(pg));
  const customers = [], codes = [];
  for (const b of bullets(P[p4])) { const m = /^(.+?) \((\d)(?: and (\d))? Numbers?\)$|^(.+?) \((\d) and (\d)\)$/.exec(b); if (!m) continue; customers.push({ who: tidy(m[1] || m[4]), digits: [m[2] || m[5], m[3] || m[6]].filter(Boolean).map(Number), page: p4 + 1 }); }
  for (const b of bullets(P[p10])) {
    const m = /^([^:]+): (.+)$/.exec(b); if (!m) continue;
    const list = m[2].replace(/\([A-Za-z][^)]*\)/g, '');
    if (/\d-\d/.test(list)) { codes.push({ name: m[1], text: tidy(m[2]), page: p10 + 1 }); continue; } // "5-8-13, 3-5-8 in all variations"
    codes.push({ name: m[1], nums: [...list.matchAll(/\d+/g)].map((x) => Number(x[0])), page: p10 + 1 });
  }
  return { customers, codes };
}

const B = business99(args.business99), O = overview99(args.overview99), M = marketing(args.marketing), Man = manual(args.manual), Mod = module12(args.module12);
const counts = { business: Object.keys(B.numbers).length, colors: Object.values(B.numbers).filter((x) => x.color).length, families: Object.keys(B.groups).length, colorKey: Object.keys(B.key).length, overview: Object.keys(O.numbers).length,
  priceSums: Object.keys(M.sums).length, clean: Object.keys(M.clean).length, labels: Object.keys(M.labels).length, hundreds: Object.keys(M.hundreds).length, examples: M.examples.length, manual: Object.keys(Man).length, customers: Mod.customers.length, codes: Mod.codes.length };
console.log(counts);
const expect = { business: 90, colors: 83, families: 9, colorKey: 4, overview: 99, priceSums: 8, clean: 3, labels: 12, hundreds: 9, examples: 50, manual: 9, customers: 3, codes: 9 };
let bad = false;
for (const [k, n] of Object.entries(expect)) if (counts[k] < n) { console.error(`${k}: ${counts[k]} entries, expected ${n}`); bad = true; }
if (bad) process.exit(1);

const data = {
  business: B.numbers, businessFamilies: B.groups, businessColors: B.key, overview: O.numbers, overviewFamilies: O.groups,
  prices: { sums: M.sums, clean: M.clean, families: M.families, labels: M.labels, hundreds: M.hundreds, examples: M.examples },
  companyDay: Man, customers: Mod.customers, codes: Mod.codes,
};
const out = `// GENERATED by tools/make-bizwords.mjs from the owner's Drive folder "Business PDF's" (Numerologist PRO books:
// The Numbers 10-99 in Business, Numbers Overview 1-99, Marketing Numerology, Business Manual, Module 12).
// The words are the books' own; never hand-edit, run the script again. Keys are the numbers; "page" is the book's page.
(function (root) {
  'use strict';
  root.BizWords = ${JSON.stringify(data)};
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
const dest = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/bizwords.js');
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
