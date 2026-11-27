#!/usr/bin/env node
// The paid tool's personal reports (Drive "Class PDF > Charts": the four "Merged Charts" PDFs, 23 reports) hold text
// written for ONE psyche spot: the number in the teenage aura, as the psyche challenge number, as the psychic pillar,
// in the psychic heart centre, in childhood and in the twenties. Owner 2026-11-27: prefer these for the psyche charts,
// and keep ONLY what is about a psyche position, never the general number description (the reports print that too,
// under "NUMBER: 71 ARCHETYPE: ...", "GENERALLY ABOUT 15/6", "DIAMOND: 69": left out here).
// The report's psyche chart is the app's OUTER psyche chart (checked on the owner's own report: pillar 24, mental
// strategies 71, challenge 15, twenties 12, childhood 15).
//   pdftotext -layout <each PDF> m1.txt .. m4.txt ; node tools/psyche-reports/parse.mjs  (writes psy.json beside them)
//   node tools/psyche-reports/make.mjs <dir with psy.json>      writes knowledge/raw/psyche-report-*.md
// Then: node tools/build-knowledge.mjs. No names of the people the reports were made for are kept.
import fs from 'node:fs';
const dir = process.argv[2];
const d = JSON.parse(fs.readFileSync(`${dir}/psy.json`, 'utf8'));
const clean = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').replace(/- (?=[a-z])/g, '-').trim();
const ds = (n) => { n = Number(n); while (n > 9) n = String(n).split('').reduce((a, x) => a + Number(x), 0); return n; };
const fmt = (n) => (Number(n) > 9 ? `${n}/${ds(n)}` : String(n));
// where a section stops being about the number in the spot and starts on this person's other numbers
const SPLIT = /(?=The combination of (?:the|a) (?<![\d/])\d|The combination of energies|The influence of |(?<![\d/])\d{1,2}(?:\/\d)? in the (?:psychic )?heart cent|The (?<![\d/])\d+ in the psychic heart|In imbalance, the numbers in the upper|Because you have both|The many (?<![\d/])\d)/;
const CELEBS = /\s*(?:Among )?[Cc]elebrities (?:who have|with) this constellation[^]*$/;
const head = (title, source) => `# ${title}\nsource: the paid tool's personal reports (Drive: Class PDF > Charts, Merged Charts 1-4), read 2026-11-27\ntopic: psyche\n\n${source}\n`;
const NOTE = 'Text the paid tool prints in a personal report for a number in this one spot of the psyche chart. Only the part about the number in the spot is kept; the report\'s general description of the number and the parts about that person\'s other numbers are left out.';

function byNumber(key, { base = true } = {}) {
  const by = new Map();
  for (const r of d) {
    if (!r[key]) continue;
    const text = clean(r[key].text);
    const own = base ? text.split(SPLIT)[0].replace(CELEBS, '').trim() : text;
    if (!own) continue;
    const cur = by.get(r[key].n);
    if (!cur || own.length > cur.length) by.set(r[key].n, own); // the fullest wording of the same entry
  }
  return [...by].sort((a, b) => a[0] - b[0]);
}
const write = (name, title, entries) => { fs.writeFileSync(new URL(`../../knowledge/raw/${name}.md`, import.meta.url), head(title, NOTE) + entries.map(([h, t]) => `\n## ${h}\n\n${t}\n`).join('')); console.log(name, entries.length); };

write('psyche-report-teenage-aura', 'Psyche Chart - Teenage Aura (Upper Right Aura), from the personal reports', byNumber('teenage').map(([n, t]) => [`THE NUMBER ${n} IN THE TEENAGE YEARS`, t]));
write('psyche-report-challenge-number', 'Psyche Chart - Psyche Challenge Number (Psyche Month Number), from the personal reports', byNumber('challenge', { base: false }).map(([n, t]) => [`${fmt(n)} AS PSYCHE CHALLENGE NUMBER`, t]));
const digit = new Map(byNumber('pillarDigit', { base: false }));
write('psyche-report-pillar', 'Psyche Chart - Psychic Pillar (How the Psyche Rests), from the personal reports', byNumber('pillar', { base: false }).map(([n, t]) => [`${fmt(n)} AS PSYCHIC PILLAR`, `${t}${digit.get(String(ds(n))) ? `\n\nAbout the ${ds(n)} pillar: ${digit.get(String(ds(n)))}` : ''}`]));
// childhood and twenties: only the numbers the owner's own two Drive docs do not have
const has = (file) => new Set([...fs.readFileSync(new URL(`../../knowledge/raw/${file}.md`, import.meta.url), 'utf8').matchAll(/^## THE NUMBER (\d+) IN/gm)].map((m) => m[1]));
const kids = has('psyche-childhood-aura'), tw = has('psyche-twenties-aura');
write('psyche-report-childhood-aura', 'Psyche Chart - Childhood Aura (Bottom Right Aura), more numbers from the personal reports', byNumber('childhood').filter(([n]) => !kids.has(n)).map(([n, t]) => [`THE NUMBER ${n} IN CHILDHOOD`, t]));
write('psyche-report-twenties-aura', 'Psyche Chart - Twenties Aura (Bottom Left Aura), more numbers from the personal reports', byNumber('twenties').filter(([n]) => !tw.has(n)).map(([n, t]) => [`THE NUMBER ${n} IN THE TWENTIES`, t]));

// The psychic heart centre (knowledge/raw/psyche-report-heart-centre.md) is sorted BY HAND from the same teenage
// sections: its sentences sit between ones about the aura beside it ("together with the 5 in the aura ...") and about
// how the number was formed ("16/7 is formed by 8 and 8 ..."), which are about a pair, not the centre's number alone.
// Print the pieces to sort with: node tools/psyche-reports/make.mjs <dir> --centre
if (process.argv.includes('--centre')) for (const r of d) if (r.teenage) for (const seg of clean(r.teenage.text).split(SPLIT)) if (/heart cent/.test(seg.slice(0, 90))) console.log(`- [${r.teenage.n} teenage aura] ${seg}`);
