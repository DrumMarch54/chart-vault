#!/usr/bin/env node
// Builds public/readings.js from two books in the owner's Drive folder "Business PDF's": "Success Codes & Superdates"
// (NU-Superdates-INT-v1.pdf) and the "Superdates Cosmic Calendar" (NPE-SuperdatesCosmicCalendar-v1.pdf). The books are
// not in the repo; download them and run:
//   node tools/make-readings.mjs /path/to/NU-Superdates-INT-v1.pdf /path/to/NPE-SuperdatesCosmicCalendar-v1.pdf
// Needs pdftotext (poppler). What it reads, each with the book's own words:
//   Superdates: the day vibrations 1-31, the life paths (essences) 3-48, the DVLP (natural talent) diamonds 11-99,
//     the outer diamonds (day × month), the inner diamonds (day × year), the target numbers (day + dharma), the
//     success-code groups (pp. 24-27: "World conqueror code", "Popularity" …) and the target's one-word adjustment
//     per digit sum (p. 199: "1 focus · 2 soften · …").
//   Cosmic Calendar: the ruler of the day's chapter for each planet (pp. 51-108: archetypal essence, numerological
//     correspondence, business themes), the planet quick guide (p. 144) and what a gold / green / red day is for
//     (pp. 43 and 288).
// The output is generated: never hand-edit public/readings.js, change this script and run it again.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const pdf = process.argv[2], calendarPdf = process.argv[3];
if (!pdf || !calendarPdf) { console.error('usage: node tools/make-readings.mjs <NU-Superdates-INT-v1.pdf> <NPE-SuperdatesCosmicCalendar-v1.pdf>'); process.exit(2); }
// -raw keeps each entry whole; the default reading order interleaves entries at page edges.
const raw = execFileSync('pdftotext', ['-raw', pdf, '-'], { maxBuffer: 64 << 20 }).toString('utf8');

// Page noise out: page numbers, the running "APPENDIX" word, form feeds. Hyphenated line breaks mended.
const lines = raw.split(/\f|\n/).map((l) => l.trim()).filter((l) => !/^\d{1,3}$/.test(l.trim()) && l.trim() !== 'APPENDIX');
// The table of contents repeats every header with a "§"; the body starts at the day-vibration intro.
const whole = lines.join('\n');
const text = whole.slice(whole.indexOf('Day Vibration: The Primary Energy of the'));
const para = (chunk) => chunk.split(/\n\s*\n/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).reduce((a, l) => (a.endsWith('-') && /^[a-z]/.test(l) ? a.slice(0, -1) + l : a ? a + ' ' + l : l), '')).filter(Boolean);

// Keyword-headed entries: "Day Vibration 15" / keywords line / paragraphs until the next header.
function headed(re, body) {
  const out = {};
  const parts = body.split(re);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const chunk = parts[i + 1].replace(/^\n+/, '');
    // The keywords line runs over to the next line when it ends with "-" or "," ("… Decisive-" / "ness, Leadership").
    const ls = chunk.split('\n'); let k = 1;
    while (k < ls.length && /[-,]$/.test(ls[k - 1].trim())) k++;
    const keywords = para(ls.slice(0, k).join('\n')).join(' ');
    const ps = para(ls.slice(k).join('\n'));
    if (ls.length < 2 || !ps.length) continue;
    out[n] = { keywords, text: ps.join('\n\n') };
  }
  return out;
}
const section = (from, to) => { const a = text.indexOf(from), b = to ? text.indexOf(to, a + from.length) : -1; return '\n' + text.slice(a, b < 0 ? undefined : b); };
const dayVibration = headed(/\nDay Vibration (\d+)\n/, section('Day Vibration 1\n', 'Life Paths'));
const lifePath = headed(/\nLife Path (\d+)\n/, section('Life Paths', 'DVLP 11\n').replace(/\nLife Path:[^\n]*\n/g, '\n'));
const dvlp = headed(/\nDVLP (\d+)\n/, section('DVLP 11\n', 'Outer Diamond\n'));

// Labelled entries: "14 – Day 1 × Month 4 (sum = 5)" then "Aura of the Day. … How to Act Today. … About 14/5. …"
function labelled(body, head, labels) {
  const out = {};
  const re = new RegExp(`\\n(\\d\\d) [–—] ${head} \\(sum = ([\\d/]+)\\)\\n`, 'g');
  const parts = body.split(re);
  for (let i = 1; i < parts.length; i += 3) {
    const n = Number(parts[i]);
    const ps = para(parts[i + 2]).join(' ');
    const entry = {};
    const names = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${names.join('|')}|About [\\d/]+)\\.\\s*`, 'g');
    const pieces = ps.split(pattern).map((s) => s.trim()).filter(Boolean);
    for (let k = 0; k + 1 < pieces.length; k += 2) entry[pieces[k].startsWith('About') ? 'about' : pieces[k]] = pieces[k + 1];
    if (Object.keys(entry).length) out[n] = entry;
  }
  return out;
}
const outer = labelled(section('Outer Diamond\n', 'Inner Diamond\n'), 'Day \\d × Month \\d', ['Aura of the Day', 'How to Act Today']);
const inner = labelled(section('Inner Diamond\n', 'Target Number\n'), 'Day \\d × Year \\d', ['Inner Weather', 'Inner Success Codes']);
const target = labelled(section('Target Number\n'), 'Day \\d Dharma \\d', ['Alignment Vector', 'Fastest Bridge']);

// ---------- the success-code groups (Superdates pp. 24-27) ----------
// "World conqueror code - strong" / "58, 85" / what it is for. A numbers line is digits, commas, "and" or a triad
// ("3-5-8, 5-3-8" = the money triad, read as 35 and 53 in a diamond). "CATEGORY 2 …" starts the next category; its
// introduction is not part of the group before it.
function codeGroups() {
  const a = whole.indexOf('World conqueror code'), b = whole.indexOf('Reference guide for date', a);
  const L = whole.slice(a, b).split('\n').map((l) => l.trim()).filter((l) => l && l !== 'SUCCESKODER');
  const isNums = (l) => /^\d[\d\s,\-]*(?:and [\d\s,]+)?$/.test(l);
  const groups = []; let cat = 1, cur = null, skip = false;
  for (let i = 0; i < L.length; i++) {
    const c = /^CATEGORY (\d)/.exec(L[i]);
    if (c) { cat = Number(c[1]); skip = true; continue; }
    if (i + 1 < L.length && isNums(L[i + 1]) && !isNums(L[i])) {
      const m = /^(.*?)(?:\s+-\s+(strong|gentle\/neutral|gentle))?$/.exec(L[i]);
      const line = L[i + 1], nums = [];
      for (const t of line.matchAll(/\d+(?:-\d+)*/g)) { const p = t[0].split('-').map(Number); if (p.length === 3) nums.push(p[0] * 10 + p[1]); else nums.push(p[0]); }
      cur = { name: m[1], cat, ...(m[2] ? { tone: m[2] } : {}), nums: [...new Set(nums)], text: '' }; groups.push(cur); skip = false; i++; continue;
    }
    if (cur && !skip) cur.text += (cur.text ? '\n' : '') + L[i];
  }
  for (const g of groups) g.text = para(g.text).join(' ');
  return groups;
}
// ---------- the target's adjustment (Superdates p. 199: "1 focus · 2 soften · 3 clarify · …") ----------
function qualities() {
  const t = para(whole.slice(whole.indexOf('Reduce D+'), whole.indexOf('Why it matters'))).join(' ');
  const out = {};
  for (const m of t.slice(t.indexOf('flow:')).matchAll(/([1-9]) ([a-z]+)/g)) if (!out[m[1]]) out[m[1]] = m[2];
  return out;
}
const codes = codeGroups(), quality = qualities();

// ---------- the Superdates Cosmic Calendar ----------
const calRaw = execFileSync('pdftotext', ['-raw', calendarPdf, '-'], { maxBuffer: 64 << 20 }).toString('utf8').split('\f');
const calLay = execFileSync('pdftotext', ['-layout', calendarPdf, '-'], { maxBuffer: 64 << 20 }).toString('utf8').split('\f');
const NOISE = new Set(['ASTROLOGICAL', 'CORE', 'SUPERDATE', 'TOOL', 'LAUNCH', 'CALENDAR', 'ASPECTS']);
const calLines = []; // every line with its page, page noise out
calRaw.forEach((pg, i) => pg.split('\n').forEach((l) => { l = l.trim(); if (l && !/^\d{1,3}$/.test(l) && !NOISE.has(l)) calLines.push({ l, p: i + 1 }); }));
const BUL = /^[\u0084•]\s*/;
const joinL = (ls) => para(ls.join('\n')).join(' ');
// The ruler chapters (pp. 51-108): "☉ The Sun Visibility, Purpose and Creative / Leadership" / "Archetypal Essence" /
// paragraphs / "Numerological Correspondence" / bullets (associated number, keywords, link) / paragraph / "Business
// Themes" / bullets until "When the Sun Is in Flow". Only these parts: the flow and tension parts need the sky's aspects.
function rulers() {
  const out = {};
  const SIGNS = '☉☽☿♀♂♃♄♅♆♇';
  for (let i = 0; i < calLines.length; i++) {
    const h = calLines[i].l;
    if (!SIGNS.includes(h[0]) || !/^. (?:The )?([A-Z][a-z]+) /.test(h)) continue;
    const planet = /^. (?:The )?([A-Z][a-z]+) /.exec(h)[1];
    if (out[planet]) continue;
    let k = i + 1; const title = [h.replace(/^. (?:The )?[A-Z][a-z]+ /, '')];
    while (calLines[k].l !== 'Archetypal Essence') title.push(calLines[k++].l);
    const take = (stop) => { const ls = []; k++; while (k < calLines.length && !stop(calLines[k].l)) ls.push(calLines[k++].l); return ls; };
    const essence = take((l) => l === 'Numerological Correspondence');
    const corr = take((l) => l === 'Business Themes');
    const themes = take((l) => /^When .* Is in Flow/.test(l));
    // Bullets run on while the next line starts lower-case or the line before ends with "-", "," or "·"; the first other
    // line that is not a bullet starts the paragraph after them.
    const bullets = (ls) => { const out2 = []; let open = false; for (let j = 0; j < ls.length; j++) { const l = ls[j]; if (BUL.test(l)) { out2.push([l.replace(BUL, '')]); open = true; } else if (open && (/^[a-z(]/.test(l) || /[-,·]$/.test(ls[j - 1]))) out2[out2.length - 1].push(l); else { out2.rest = ls.slice(j); break; } } const r = out2.map(joinL); r.rest = out2.rest || []; return r; };
    const bl = bullets(corr), after = bl.rest;
    const facts = {};
    for (const b of bl) { const m = /^([^:]+):\s*(.+)$/.exec(b); if (m) facts[m[1].toLowerCase()] = m[2]; }
    out[planet] = { title: joinL(title), essence: para(essence.join('\n')).join(' '), number: facts['associated number'] || facts['associated numbers'] || '',
      keywords: facts.keywords || '', link: facts['chaldean planetary link'] || facts['chaldean link'] || '', dates: joinL(after), themes: bullets(themes), page: calLines[i].p };
  }
  return out;
}
// A table from the -layout text of one page: the header line gives the column starts; a row starts when the first
// column has text; a line with an empty first column continues the row above. It ends at the first blank line.
function table(page, header) {
  const lines = calLay[page - 1].split('\n');
  const hi = lines.findIndex((l) => header.every((w) => l.includes(w)));
  const cols = header.map((w) => lines[hi].indexOf(w));
  const rows = []; let started = false;
  for (let i = hi + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) { if (started) break; continue; }
    const cells = cols.map((c, j) => l.slice(c, j + 1 < cols.length ? cols[j + 1] : undefined).trim());
    if (cells[0]) { rows.push(cells.map((x) => [x])); started = true; } else if (rows.length) cells.forEach((x, j) => { if (x) rows[rows.length - 1][j].push(x); });
  }
  return rows.map((r) => r.map((ls) => para(ls.join('\n')).join(' ')));
}
const ruler = rulers();
const guidePage = calRaw.findIndex((p) => p.includes('Planetary Archetype Quick Guide')) + 1;
const planetGuide = {};
for (const [planet, num, kw, role] of table(guidePage, ['Planet', 'Numerologi', 'Keywords', 'Business'])) planetGuide[planet] = { number: num, keywords: kw, role, page: guidePage };
// What each color of the calendar is for: the tool's one-liners (p. 43) and the practice column (p. 288).
const ratings = {};
const KEY = { Gold: 'super', Green: 'good', Red: 'beware' };
const toolPage = calRaw.findIndex((p) => /Gold \(S\)/.test(p)) + 1;
const toolText = para(calRaw[toolPage - 1].replace(/\u0084\s*/g, '\n\n')).join(' ');
for (const m of toolText.matchAll(/(Gold|Green|Red) \(([A-Z])\) – ([^:]+): ([^.]+\.)/g)) ratings[KEY[m[1]]] = { name: m[3], tool: m[4], toolPage };
const colorPage = calRaw.findIndex((p) => p.includes('Understanding the Color Codes')) + 1;
for (const [color, , practice] of table(colorPage, ['Color', 'Symbolism', 'Meaning in Prac'])) { const k = KEY[color.split(' ')[0]]; if (k) Object.assign(ratings[k], { practice, page: colorPage }); }
const light = para(calRaw[colorPage - 1].slice(calRaw[colorPage - 1].indexOf('gold ='))).join(' ');
for (const m of light.matchAll(/(gold|green|red) = ([^,.]+)/g)) ratings[KEY[m[1][0].toUpperCase() + m[1].slice(1)]].light = m[2].trim();

const counts = { dayVibration: Object.keys(dayVibration).length, lifePath: Object.keys(lifePath).length, dvlp: Object.keys(dvlp).length, outer: Object.keys(outer).length, inner: Object.keys(inner).length, target: Object.keys(target).length,
  codes: codes.length, quality: Object.keys(quality).length, ruler: Object.keys(ruler).length, planetGuide: Object.keys(planetGuide).length, ratings: Object.values(ratings).filter((r) => r.practice && r.tool && r.light).length };
console.log(counts);
const expect = { dayVibration: 31, lifePath: 43, dvlp: 81, outer: 81, inner: 81, target: 81, codes: 12, quality: 9, ruler: 10, planetGuide: 10, ratings: 3 };
let bad = false;
for (const [k, n] of Object.entries(expect)) if (counts[k] < n) { console.error(`${k}: ${counts[k]} entries, expected ${n}`); bad = true; }
if (bad) process.exit(1);

const out = `// GENERATED by tools/make-readings.mjs from the course books "Success Codes & Superdates" and "Superdates Cosmic
// Calendar" (Numerologist PRO).
// The words are the book's own; never hand-edit, run the script again. Keys are the numbers.
(function (root) {
  'use strict';
  root.Readings = ${JSON.stringify({ dayVibration, lifePath, dvlp, outer, inner, target, codes, quality, ruler, planetGuide, ratings }, null, 0)};
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
const dest = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/readings.js');
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
