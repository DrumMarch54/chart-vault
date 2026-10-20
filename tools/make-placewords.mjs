#!/usr/bin/env node
// Builds public/placewords.js: the business books' words for the House Number, Phone Number and Business Words
// tools, read from the knowledge store's text of Marketing Numerology (knowledge/raw/biz-marketing-numerology.md),
// the house-number lecture transcript and the Business Manual. Run after a change here:
//   node tools/make-placewords.mjs
// What it reads, with the books' own words:
//   house     "Business house number guide": how a house number is reduced (digit sum, a letter added), the
//             per-business lists (a 1, 3, 4, 5 and 9 business in a 1-9 house, one sentence each); the lecture
//             transcript's words on who thrives in each house 1-9 and the numbers to avoid in a house.
//   phone     "Telephone number for your business": the digit sums to land on and their words, the numbers to
//             avoid inside a phone number.
//   boost     "Magnetic boost words": the lists per value, the personal titles with their values.
//   templates The Business Manual's numeroscope templates (5A, 5B, 9A, 9B, 1A, 3A, 3B, 4A).
// Quotes that come from a lecture transcript are copied here; the script checks that every one still stands in the
// transcript text, so a changed source fails loudly. The output is generated: never hand-edit public/placewords.js.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, 'knowledge', 'raw', f), 'utf8');
const marketing = read('biz-marketing-numerology.md');
const houseTalk = read('biz-transcript-house-numbers.md');
const phoneTalk = read('biz-transcript-telephone-numbers.md');
const domainTalk = read('biz-transcript-domain-names.md');
const theme3 = read('biz-theme-3-numerology-marketing.md');
const manual = read('biz-business-manual.md');
const lines = marketing.split('\n');
const tidy = (s) => s.replace(/\s+/g, ' ').replace(/[”“]/g, '"').replace(/’/g, "'").trim();
const must = (text, quote, where) => { if (!text.includes(quote)) { console.error(`not found in ${where}: "${quote}"`); process.exit(1); } return quote; };

// ---------- house: the business lists ----------
// "A 1 business" sits inside a paragraph; the others are headings "#### A 3 Business". Each list is the bullets
// that follow, one per house digit: the digit named first in the bullet.
function businessLists() {
  const out = {};
  const starts = { 1: lines.findIndex((l) => /^A 1 business A 1 business/.test(l)) };
  for (const d of [3, 4, 5, 9]) starts[d] = lines.findIndex((l) => new RegExp(`^#### A ${d} Business`).test(l));
  for (const [d, i] of Object.entries(starts)) {
    if (i < 0) { console.error(`business ${d} list not found`); process.exit(1); }
    const intro = tidy(lines[i].replace(/^#### A \d Business\s*/, '').replace(/^A 1 business /, ''));
    const list = {};
    let about = intro;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (/^#{2,4} /.test(l)) break;
      if (!l) continue;
      if (!l.startsWith('- ')) { if (!Object.keys(list).length) about = tidy(about + ' ' + l); continue; }
      const text = tidy(l.slice(2));
      const m = /(\d)/.exec(text);
      if (!m) continue;
      list[m[1]] = text;
    }
    if (Object.keys(list).length !== 9) { console.error(`business ${d}: ${Object.keys(list).length} house lines, expected 9`); process.exit(1); }
    out[d] = { about, houses: list };
  }
  return out;
}

// ---------- house: the guide's own rule and the lecture's words per house digit ----------
const houseRule = {
  digitSum: must(marketing, 'The house number is calculated from the digit sum. So number 1 is, of course, a 1 house. But so is number 973, for example, because the digit sum of: 9 + 7 + 3 = 19 = 1 + 9 = 1 If there is a letter, it must be added.', 'marketing').replace('= 1 If', '= 1. If'),
  letter: must(marketing, 'For example, number 11A is the same as number 3: 1+1=2 and A=1 i.e. 2+1=3', 'marketing'),
  tool: must(marketing, 'This tool tells you about the energies you attract by living in a specific house number. You enter your house number and date of birth and click submit to see the answer.', 'marketing'),
  business: must(marketing, 'If the house is for a business, you can choose to enter the company creation date instead of your date of birth.', 'marketing'),
};
// Who thrives in each house, from the house-number lecture (quotes checked against the transcript).
const homes = {
  1: { who: must(houseTalk, 'all day vibrations thrive in the number one', 'house transcript'), note: must(houseTalk, "If you're large family with many different day vibrations, one is a good choice", 'house transcript') },
  2: { who: must(houseTalk, 'Most numbers can also live in number two', 'house transcript'), note: must(houseTalk, 'it might be too soft for my drive', 'house transcript') },
  3: { who: must(houseTalk, 'All numbers, meaning all day vibrations can live in number three, but some will thrive a bit better than others', 'house transcript'), note: must(houseTalk, 'Try and avoid number 12 and number 48 and number 84', 'house transcript') },
  4: { who: must(houseTalk, 'Vibrations can thrive in number four, but the energy is very private and social life can easily be under prioritized', 'house transcript'), note: must(houseTalk, "it's not the first choice as a family home", 'house transcript') },
  5: { who: must(houseTalk, 'all day vibrations thrive in a five house', 'house transcript'), note: must(houseTalk, 'a good choice for a family home', 'house transcript') },
  6: { who: must(houseTalk, 'All numbers can thrive in number six', 'house transcript'), note: '' },
  7: { who: must(houseTalk, 'All day vibrations thrive in the gentle and spiritual 7 energy', 'house transcript'), note: must(houseTalk, 'seven houses and balance bring spirituality, profundity, wisdom, popularity', 'house transcript') },
  8: { who: must(houseTalk, 'you should usually avoid the number eight house', 'house transcript'), note: must(houseTalk, 'It is more beneficial for a spiritual or financial institution', 'house transcript') },
  9: { who: must(houseTalk, 'only a few base vibrations live in the strong nine energy', 'house transcript'), note: must(houseTalk, 'more suitable for an organization or business', 'house transcript') },
};
// Numbers the lecture says to avoid in a house number, with the reason in the lecturer's words.
const houseAvoid = [
  { n: 12, why: must(houseTalk, 'you might want to avoid number 12 because it gives misunderstandings', 'house transcript') },
  { n: 16, why: must(houseTalk, "16 avoided, it's just too difficult, too depressing", 'house transcript') },
  { n: 48, why: must(houseTalk, 'the 8 and the 4, which are like pulling in opposite directions', 'house transcript') },
  { n: 84, why: must(houseTalk, 'the 8 and the 4, which are like pulling in opposite directions', 'house transcript') },
  { n: 58, why: must(houseTalk, '58 might also be a little bit difficult to live in. Restless, restless energy', 'house transcript') },
];
// The result number (how the person feels in the house): the lecture reads the house digit beside the person's day
// digit sum (a 4 in a 5 house "awakens a subtle nine energy", read as 54/9; a 6 in a 9 house "will amp ... to 15").
const houseResult = { order: 'house-then-person', quote: must(houseTalk, '9 houses amplify whatever you come with', 'house transcript') };
// Balancing a house number with a letter (the lecture's slide): the letters of each digit.
const balancing = { 1: 'A I J Q Y', 2: 'B K R', 3: 'C G L S', 4: 'D M T', 5: 'E H N X', 6: 'U V W', 7: 'O Z', 8: 'F P', how: must(houseTalk, 'add an invisible letter', 'house transcript') };

// ---------- phone ----------
function phone() {
  const sec = marketing.slice(marketing.indexOf('### TELEPHONE NUMBER FOR YOUR BUSINESS'), marketing.indexOf('### BUSINESS HOUSE NUMBER GUIDE'));
  const sums = {};
  // "14/5 Good business, networking and connec-tions, earnings 23/5 Abundance vibe, ..." in one paragraph, and
  // "- 27/9 good team leadership, trustworthy" bullets.
  const para = /(\d\d)\/(\d) ([^]*?)(?= \d\d\/\d |We have chosen|$)/g;
  const fives = sec.slice(sec.indexOf('14/5 Good business'), sec.indexOf('We have chosen'));
  for (const m of fives.matchAll(para)) sums[m[1]] = tidy(m[3].replace(/connec-tions/, 'connections'));
  for (const m of sec.matchAll(/^- (\d\d)\/(\d) (.+)$/gm)) sums[m[1]] = tidy(m[3].replace(/ NB\..*$/, '').replace(/ Johannes is.*$/, ''));
  const expect = [14, 23, 32, 41, 50, 27, 36, 45, 54, 19, 37, 46, 55];
  for (const n of expect) if (!sums[n]) { console.error(`phone sum ${n} not found`); process.exit(1); }
  return {
    land: must(marketing, "For business purposes, it's a good idea to land on 1 or 5. If you're a 9 and have a 9 business number, you can also land on 9 in the digit sum.".replace(/'/g, '’'), 'marketing').replace(/’/g, "'"),
    sums,
    bad18: must(marketing, "18/9 will often be perceived as competitive, so it's not a good phone number".replace(/'/g, '’'), 'marketing').replace(/’/g, "'"),
    not2: must(marketing, 'you should not choose it if you are a 2 in Day Vibration, as it will feel too ”hard”.', 'marketing').replace(/[”“]/g, '"'),
    inside: must(marketing, 'Since the phone number is often read in two-digit numbers, it will affect the subconscious mind, which hears these numbers and absorbs their vibration.', 'marketing'),
    avoidInside: [12, 16, 48, 84],
    example: must(marketing, '48 - 16 -12 - 95 And here the only number with a good vibration is actually 95, where both 48, 16 and 12 are unbalanced numbers.', 'marketing'),
    everyDigit: must(phoneTalk, 'If you add up the numbers individually', 'phone transcript'),
    countryCode: must(phoneTalk, 'I would not add 45 to my telephone number', 'phone transcript'),
  };
}

// ---------- domain ----------
const domain = {
  words: must(domainTalk, 'this dash here in numerology is the same as a gap', 'domain transcript'),
  date: must(domainTalk, 'with domain names, I would use the registration date as the polarizing factor', 'domain transcript'),
  com: must(domainTalk, '.com gives', 'domain transcript'),
  whois: must(theme3, "To find a domain's start date, check: https://www.whois.com/", 'theme 3 slides'),
};

// ---------- boost words and personal titles ----------
function boost() {
  const start = marketing.indexOf('17/8 magnetic boost words'), end = marketing.indexOf('Suggestions for Personal Titles');
  const sec = marketing.slice(start, end);
  const out = {};
  let cur = null;
  for (const raw of sec.split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    // a list heading may share a line with the last bullet of the previous list: "- vitae, wiser, work 19/1 magnetic boost words"
    const parts = l.split(/(?=\d\d\/\d magnetic boost words)/);
    for (const p of parts) {
      const h = /^(\d\d)\/\d magnetic boost words/.exec(p.trim());
      if (h) { cur = Number(h[1]); out[cur] = out[cur] || []; continue; }
      if (!cur) continue;
      for (const w of p.replace(/^- /, '').split(',')) { const t = w.trim().toLowerCase(); if (/^[a-z]+$/.test(t)) out[cur].push(t); }
    }
  }
  for (const n of [17, 19, 21, 23, 32, 27, 36, 37]) if (!out[n] || !out[n].length) { console.error(`boost list ${n} empty`); process.exit(1); }
  const titles = [];
  const tsec = marketing.slice(end, marketing.indexOf('### ', end + 10) > 0 ? marketing.indexOf('### ', end + 10) : undefined);
  for (const m of tsec.matchAll(/^- ([^=]+?) = ([\d/ +]+?)(?: \(([^)]*)\))?$/gm)) titles.push({ title: m[1].trim(), values: m[2].trim(), words: m[3] ? tidy(m[3]) : '' });
  if (titles.length < 8) { console.error(`only ${titles.length} titles`); process.exit(1); }
  return { lists: out, titles, forAll: must(marketing, 'These vibrations are great to work with for all businesses:', 'marketing'), what: must(marketing, 'There are many common words that actually have very strong numerological vibrations that make them magnetically attractive to those who read them.', 'marketing') };
}

// ---------- templates (Business Manual) ----------
function templates() {
  // "#### Standard 5A" then a line "32 17 37 36 The strongest business numeroscope ...".
  const out = [];
  const ls = manual.split('\n');
  ls.forEach((l, i) => {
    const h = /^#### Standard (\d[AB])\s*$/.exec(l.trim());
    if (!h) return;
    const next = ls.slice(i + 1).find((x) => x.trim());
    const m = /^((?:\d\d\s+){2,4})(.*)$/.exec((next || '').trim());
    if (m) out.push({ code: h[1], values: m[1].trim().split(/\s+/).map(Number), words: tidy(m[2]) });
  });
  const want = ['5A', '5B', '9A', '9B', '1A', '3A', '3B', '4A'];
  const missing = want.filter((c) => !out.some((t) => t.code === c));
  if (missing.length) { console.error(`templates not found: ${missing.join(', ')}`); process.exit(1); }
  return out.filter((t) => want.includes(t.code)).sort((a, b) => want.indexOf(a.code) - want.indexOf(b.code));
}

const data = { house: { rule: houseRule, business: businessLists(), homes, avoid: houseAvoid, result: houseResult, balancing }, phone: phone(), domain, boost: boost(), templates: templates() };
const js = `// GENERATED by tools/make-placewords.mjs from the knowledge store's text of Marketing Numerology, the Business Manual
// and the house, phone and domain lecture transcripts (the owner's Drive folder "Business PDF's"). Never hand-edit:
// change the script and run it again. Used by the House Number, Phone and Domain, and Business Words tools.
(function (root) { root.PlaceWords = ${JSON.stringify(data, null, 1)}; })(typeof globalThis !== 'undefined' ? globalThis : this);
`;
fs.writeFileSync(path.join(root, 'public', 'placewords.js'), js);
console.log(`wrote public/placewords.js: ${Object.keys(data.house.business).length} business lists, ${Object.keys(data.phone.sums).length} phone sums, boost lists ${Object.entries(data.boost.lists).map(([k, v]) => `${k}:${v.length}`).join(' ')}, ${data.boost.titles.length} titles, ${data.templates.length} templates`);
