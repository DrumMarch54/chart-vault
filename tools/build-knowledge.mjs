#!/usr/bin/env node
// Builds knowledge/index.json from knowledge/raw/*.md: the Hub's text cut into passages ("chunks") of
// 300-2500 characters at headings and paragraphs, each tagged with the compound numbers 1-99 it is ABOUT
// (a heading like "15/6", "Number 15", "Outer Diamond 15", "fifteen six", or a first line naming the number),
// the numbers it only mentions, and topics (position families) found by keywords. server/knowledge.js reads it.
//
//   node tools/build-knowledge.mjs            build and print a summary
//   node tools/build-knowledge.mjs --check    build in memory, print the summary, write nothing
//
// Deterministic: same raw files -> byte-identical index.json (files sorted by name, no dates).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW = path.join(root, 'knowledge', 'raw');
const OUT = path.join(root, 'knowledge', 'index.json');
const MIN = 300, MAX = 2500, SOFT = 1400, NUMBER_LED_MIN = 120;
const MAX_BYTES = 25 * 1024 * 1024;

// ---- numbers ----
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const digitSum = (n) => String(n).split('').reduce((a, d) => a + Number(d), 0);
// "15/6", "15:6", "15.6", "19/10/1", "88/16/7", "88.16.7": the part after the number must be its digit sum.
const COMPOUND = /(?<![\d/.:])(\d{1,2})\s?[/:.]\s?(\d{1,2})(?:\s?[/:.]\s?(\d))?(?![\d]|[.,]\d)/g;
function compounds(text) {
  const out = [];
  for (const m of text.matchAll(COMPOUND)) {
    const n = Number(m[1]), a = Number(m[2]), b = m[3] ? Number(m[3]) : null;
    if (n < 10 || n > 99) continue;
    const ok = b === null ? (a === reduce(n) || a === digitSum(n)) : (a === digitSum(n) && b === reduce(n));
    if (ok) out.push({ n, index: m.index, end: m.index + m[0].length });
  }
  return out;
}
const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const WORDNUM = new Map();
UNITS.forEach((w, i) => WORDNUM.set(w, i));
TENS.forEach((t, i) => { if (!t) return; WORDNUM.set(t, i * 10); for (let u = 1; u < 10; u++) { WORDNUM.set(`${t}-${UNITS[u]}`, i * 10 + u); WORDNUM.set(`${t} ${UNITS[u]}`, i * 10 + u); } });
const WORDS_RE = new RegExp(`\\b(${[...WORDNUM.keys()].sort((a, b) => b.length - a.length).join('|')})\\s+(${UNITS.slice(1, 10).join('|')})\\b`, 'gi');
// "fifteen six" (the second word must be the digit sum)
function spelled(text) {
  const out = [];
  for (const m of text.matchAll(WORDS_RE)) {
    const n = WORDNUM.get(m[1].toLowerCase()), d = WORDNUM.get(m[2].toLowerCase());
    if (n >= 10 && n <= 99 && d === reduce(n)) out.push({ n, index: m.index, end: m.index + m[0].length });
  }
  return out;
}
const KEYWORD_BEFORE = /(?:numbers?|numerology|nr\.?|no\.|vibrations?|path|paths|dvlp|lp|dv|le|diamonds?|desire|auras?|cent(?:er|re)s?|pillars?|expressions?|personality|challenge|code|codes|and|&|or)\s*$/i;
const STOP_BEFORE = /(?:step|section|chapter|part|module|appendix|theme|row|column|level|page|key|exercise|figure|example|lesson|week|phase|session|method|framework|principle|law|category|cluster|video|version|case|study|top|point|rule|tip|q|day|year|dharma|month)\s*$/i;
// Numbers a heading is about: compound numbers, spelled ones, and plain 1-99 after a keyword ("Number 15",
// "Day Vibration 13", "Outer Diamond 15", "Life Path 7", "DVLP 24"), at the end ("A Balanced 2"), as "the 2s",
// or leading ("1 – The Illuminator"). Not "Step 1", "Section 3", "Chapter 4", "1) First ...".
function headingNumbers(h) {
  const set = new Set();
  const comp = compounds(h);
  for (const c of comp) set.add(c.n);
  for (const s of spelled(h)) set.add(s.n);
  const crossed = /×|\bx\b/.test(h);
  for (const m of h.matchAll(/(?<![\d/.:])(\d{1,2})(s?)(?![\d/:]|\.\d)/g)) {
    const n = Number(m[1]);
    if (n < 1 || n > 99) continue;
    if (comp.some((c) => m.index >= c.index && m.index < c.end)) continue;
    if (crossed) continue;
    const before = h.slice(0, m.index), after = h.slice(m.index + m[0].length);
    if (STOP_BEFORE.test(before)) continue;
    if (/^\s*[-–]\s*\d/.test(after) || /\d\s*[-–]\s*$/.test(before)) continue; // a range "1-9", "10-45"

    if (/^\s*[.)]/.test(after) && !before.trim()) continue; // "1) ..." / "1. ..."
    const atStart = !before.replace(/[#*\s]/g, '');
    const atEnd = !after.replace(/[*\s:)]/g, '');
    if (m[2] === 's' || KEYWORD_BEFORE.test(before) || atEnd || (atStart && /^\s*(?:[–—+&,-]|(?:is|as|in|and|with|vs\.?)\b|[A-Z]{2,}\b)/.test(after))) set.add(n);
  }
  return [...set];
}
// Numbers named at the very start of a passage: "- 10/1 – The Wheel of Fortune ...", "**19/1 THE SUN**",
// "15/6 is ...", "Number 8 ...".
function leadingNumbers(text) {
  const head = text.slice(0, 80).replace(/^[\s>*_#-]+/, '');
  const out = new Set();
  const lead = /^(?:the\s+)?(?:numbers?\s+)?(\d{1,2})(?:\s?[/:.]\s?(\d{1,2}))?(?:\s?[/:.]\s?(\d))?(?=[\s*:,–—-]|$)/i.exec(head);
  if (lead) {
    const n = Number(lead[1]);
    if (lead[2]) { if (compounds(lead[0].replace(/^\D+/, '')).length) out.add(n); }
    else if (n >= 1 && n <= 99 && /^(?:the\s+)?numbers?\s/i.test(head)) out.add(n);
    else if (n >= 1 && n <= 99 && /^\d{1,2}\s*[–—-]\s+\S/.test(head)) out.add(n);
    if (lead[2]) for (const c of compounds(head.slice(0, 40))) if (c.index < 25) out.add(c.n);
  }
  for (const s of spelled(head.slice(0, 40))) if (s.index === 0) out.add(s.n);
  return [...out];
}
function mentionedNumbers(text) {
  const set = new Set(compounds(text).map((c) => c.n));
  for (const s of spelled(text)) set.add(s.n);
  for (const m of text.matchAll(/\bnumbers?\s+(\d{1,2})\b(?![/:.]\d)/gi)) { const n = Number(m[1]); if (n >= 1 && n <= 99) set.add(n); }
  return set;
}

// ---- topics ----
const TOPICS = [
  ['dayVibration', /day vibration|\bDV\b|day number|born on (?:the|a)\b|birth ?day\b/i],
  ['month', /\bmonth vibration|\bbirth month|\bMV\b|\bmonth number|\bthe month\b/i],
  ['year', /year vibration|birth year|\bYV\b|year number|personal year|\byearly\b/i],
  ['lifePath', /life ?paths?|\bL?LP\b|\bHLP\b/i],
  ['nexus', /\bnexus|\bDVLP\b|DV-LP|DV\/LP|day.{0,12}life path diamond/i],
  ['essenceDiamonds', /outer diamond|inner diamond|dharma (?:diamond|line)|target number|essence diamond|higher[- ]self|essence chart|integration diamond|\bOD\b/i],
  ['firstName', /first name|\bFN\b|given name/i],
  ['middleName', /middle name/i],
  ['lastName', /last name|surname|family name/i],
  ['lifeExpression', /life expression|\bLE\b|name line diamond/i],
  ['mindCenter', /heart cent(?:er|re)|mind cent(?:er|re)|\bHC\b|mental diamond|heart diamond|communication diamond|brand diamond|mental strateg/i],
  ['emotionCenter', /solar plexus|emotion(?:al)? cent(?:er|re)|\bSP\b|emotional diamond/i],
  ['auras', /\bauras?\b/i],
  ['loveAura', /love(?: life)? aura|lower right aura|bottom right aura|right lower aura/i],
  ['pillar', /pillar|\bPLR\b/i],
  ['spine', /\bspine/i],
  ['psyche', /psyche|psychic (?:self|month|life expression)|challenge number|\bIPS\b|\bOPS\b|OPLED/i],
  ['vocation', /vocation|heart'?’?s desire|\bvowels?\b|\bHD\b/i],
  ['personality', /personality (?:chart|number|heart|solar)|consonants?|\bPT\b|personality numbers?|big personality|little personality/i],
  ['combos', /\bcombos?\b|combination|\d{1,2}\/\d\s*(?:\+|and|with|next to|beside|&)\s*\d{1,2}(?:\/\d)?/i],
  ['business', /business|\bbrand|\bproducts?\b|compan(?:y|ies)|marketing|\bpric(?:e|es|ing)\b|launch|customer|superdates?|\blogo|domain name|\bsales\b|\bclients?\b|entrepreneur/i],
];
const FILE_TOPIC = { psyche: 'psyche', business: 'business', combos: 'combos' };
function topicsOf(headings, text, fileTopic) {
  const hay = headings + '\n' + text;
  const out = TOPICS.filter(([, re]) => re.test(hay)).map(([k]) => k);
  if (FILE_TOPIC[fileTopic] && !out.includes(FILE_TOPIC[fileTopic])) out.push(FILE_TOPIC[fileTopic]);
  return out.length ? out.sort() : ['general'];
}

// ---- splitting ----
function splitLong(p) {
  if (p.length <= MAX) return [p];
  const sentences = p.split(/(?<=[.!?…]["”’)]?)\s+(?=["“‘(]?[A-Z0-9*-])/);
  const out = []; let cur = '';
  const push = (s) => {
    while (s.length > MAX) { // one sentence longer than MAX: cut at a space
      let cut = s.lastIndexOf(' ', MAX); if (cut < MAX / 2) cut = MAX;
      out.push(s.slice(0, cut).trim()); s = s.slice(cut).trim();
    }
    return s;
  };
  for (const s of sentences) {
    if (cur && cur.length + 1 + s.length > MAX) { out.push(cur); cur = ''; }
    cur = push(cur ? cur + ' ' + s : s);
  }
  if (cur) out.push(cur);
  return out;
}

function parseFile(file) {
  const raw = fs.readFileSync(path.join(RAW, file), 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const title = lines[0].replace(/^#\s*/, '').trim();
  const source = (lines[1] || '').replace(/^source:\s*/, '').trim();
  const topic = (lines[2] || '').replace(/^topic:\s*/, '').trim();
  const slug = file.replace(/\.md$/, '');
  // sections: { stack: [{level, text, numbers}], paras: [] }
  const sections = [];
  let stack = [], cur = { stack: [], paras: [] }, para = [];
  const endPara = () => { const t = para.join('\n').trim(); if (t) cur.paras.push(t); para = []; };
  for (const line of lines.slice(3)) {
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      endPara();
      if (cur.paras.length) sections.push(cur);
      const level = h[1].length, text = h[2].replace(/\*\*/g, '').trim();
      stack = stack.filter((x) => x.level < level).concat([{ level, text, numbers: headingNumbers(text) }]);
      cur = { stack, paras: [] };
    } else if (!line.trim()) endPara();
    else para.push(line);
  }
  endPara();
  if (cur.paras.length) sections.push(cur);
  return { slug, title, source, topic, sections, chars: raw.length };
}

// A title that names numbers ("THE NUMBER 1 (lecture transcript)", "15/6 vs 13/4", "4 In the solar plexus
// center", "9 and 15/6") is the top heading of every passage in the file.
function titleNumbers(title) {
  const set = new Set(compounds(title).map((c) => c.n));
  const m = /^the number (\d{1,2})\b/i.exec(title) || /^(\d{1,2})\s+(?:in|and|&)\s/i.exec(title);
  if (m) set.add(Number(m[1]));
  return [...set].filter((n) => n >= 1 && n <= 99);
}
const TRANSCRIPT = /^(lecture-|biz-transcript-)|^all-chart-videos$/;

function chunksOf(doc) {
  const out = [];
  const titleNums = titleNumbers(doc.title);
  const sticky = !TRANSCRIPT.test(doc.slug);
  for (const sec of doc.sections) {
    const fromHeading = [...sec.stack].reverse().find((h) => h.numbers.length);
    const headNums = fromHeading ? fromHeading.numbers : titleNums;
    const heading = sec.stack.map((h) => h.text).join(' > ');
    const paras = sec.paras.flatMap(splitLong);
    // the numbers a paragraph is about when its heading names none: its own leading number, else (in a
    // non-transcript) the last leading number above it in the same section ("NUMBER 1: ..." then its text)
    let cur = [], curCtx = null, carried = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({ heading, headNums, ctx: curCtx || [], text: cur.join('\n\n') });
      cur = []; curCtx = null;
    };
    for (const p of paras) {
      const lead = leadingNumbers(p);
      if (lead.length) carried = lead;
      const ctx = lead.length ? lead : (sticky ? carried : []);
      const size = cur.reduce((a, x) => a + x.length + 2, 0);
      const numberBreak = curCtx !== null && ctx.join() !== curCtx.join() && (ctx.length || curCtx.length) && size >= NUMBER_LED_MIN;
      if (cur.length && (size + p.length + 2 > MAX || size >= SOFT || numberBreak)) flush();
      if (!cur.length) curCtx = ctx;
      cur.push(p);
    }
    flush();
  }
  // merge a tiny chunk into its neighbor when both are about the same numbers (or none) and it fits
  const merged = [];
  for (const c of out) {
    const prev = merged[merged.length - 1];
    const same = prev && prev.headNums.join() === c.headNums.join() && prev.ctx.join() === c.ctx.join();
    if (prev && same && (c.text.length < MIN || prev.text.length < MIN) && prev.text.length + c.text.length + 2 <= MAX) {
      prev.text += '\n\n' + (c.heading !== prev.heading && c.heading ? `${c.heading.split(' > ').pop()}\n` : '') + c.text;
    } else merged.push({ ...c });
  }
  return merged.filter((c) => (c.text.match(/[A-Za-z]/g) || []).length >= 40).map((c, k) => {
    const about = new Set([...c.headNums, ...c.ctx]);
    if (!about.size) for (const comp of compounds(c.text.slice(0, 80))) about.add(comp.n);
    const mentions = [...mentionedNumbers(c.text)].filter((n) => !about.has(n)).sort((a, b) => a - b);
    return {
      id: `${doc.slug}#${k + 1}`, source: doc.slug, title: doc.title, heading: c.heading,
      numbers: [...about].filter((n) => n >= 1 && n <= 99).sort((a, b) => a - b), mentions,
      topics: topicsOf(c.heading, c.text, doc.topic), htopics: TOPICS.filter(([, re]) => re.test(c.heading)).map(([t]) => t).sort(), text: c.text,
    };
  });
}

export function build() {
  const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.md')).sort();
  const sources = [], chunks = [];
  const seen = new Set();
  let duplicates = 0;
  for (const f of files) {
    const doc = parseFile(f);
    let n = 0;
    for (const c of chunksOf(doc)) {
      const key = c.text.replace(/\s+/g, ' ').trim();
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key); chunks.push(c); n++;
    }
    sources.push({ slug: doc.slug, title: doc.title, source: doc.source, topic: doc.topic, chars: doc.chars, chunks: n });
  }
  let index = { version: 1, sources, chunks };
  let json = JSON.stringify(index);
  let droppedMentionsOnly = 0;
  if (Buffer.byteLength(json) > MAX_BYTES) {
    const keep = chunks.filter((c) => c.numbers.length || !c.mentions.length);
    droppedMentionsOnly = chunks.length - keep.length;
    index = { version: 1, sources, chunks: keep };
    json = JSON.stringify(index);
  }
  return { index, json, duplicates, droppedMentionsOnly };
}

function summary({ index, json, duplicates, droppedMentionsOnly }) {
  const lines = [];
  lines.push(`${index.sources.length} sources, ${index.chunks.length} chunks, ${(Buffer.byteLength(json) / 1048576).toFixed(1)} MB` + (duplicates ? `, ${duplicates} exact duplicates dropped` : '') + (droppedMentionsOnly ? `, ${droppedMentionsOnly} mentions-only chunks dropped (size)` : ''));
  lines.push('Chunks per source:');
  for (const s of index.sources) lines.push(`  ${String(s.chunks).padStart(5)}  ${s.slug}`);
  const per = new Map();
  for (const c of index.chunks) for (const n of c.numbers) per.set(n, (per.get(n) || 0) + 1);
  const thin = [];
  for (let n = 1; n <= 99; n++) if ((per.get(n) || 0) < 3) thin.push(`${n} (${per.get(n) || 0})`);
  lines.push(`Numbers 1-99 with fewer than 3 chunks: ${thin.length ? thin.join(', ') : 'none'}`);
  const counts = [...per.entries()].filter(([n]) => n <= 99).map(([, c]) => c).sort((a, b) => a - b);
  if (counts.length) lines.push(`Chunks per number: min ${counts[0]}, median ${counts[counts.length >> 1]}, max ${counts[counts.length - 1]}`);
  const topics = new Map();
  for (const c of index.chunks) for (const t of c.topics) topics.set(t, (topics.get(t) || 0) + 1);
  lines.push('Chunks per topic: ' + [...topics.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([t, c]) => `${t} ${c}`).join(', '));
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  console.log(summary(r));
  if (!process.argv.includes('--check')) { fs.writeFileSync(OUT, r.json + '\n'); console.log(`wrote ${path.relative(root, OUT)}`); }
}
