// The course's own words for AI readings (server/reading.js). Two parts:
//   coreText()   how this numerology system reads a chart: the method, the position meanings, the balance
//                lists, the archetype names, the owner's SYSTEM PROMPT (New), Important Notes For A.I. and
//                Chart Notes. Sent with every reading as a cached system block, so it is BYTE-STABLE: fixed
//                file list, fixed order, no dates, built once per process.
//   contextFor() the passages about the numbers of one chart, most important positions first, inside a
//                character budget, cut at whole passages. Same input -> byte-identical text.
// The passages come from knowledge/index.json (tools/build-knowledge.mjs over knowledge/raw/). A missing
// index never throws: every answer is empty and says missing: true.
import fs from 'node:fs';
import { POSITIONS, positionLabel, chartLabel } from './positions.js';

const INDEX_PATH = process.env.KNOWLEDGE_INDEX || new URL('../knowledge/index.json', import.meta.url);
const REPO = new URL('..', import.meta.url);

// ---------- core text ----------
const CORE = [
  ['.brain/numerology/interpretation.md', 'How the owner reads a chart: hierarchy, weaving, terminology'],
  ['.brain/numerology/positions.md', 'What each position means'],
  ['.brain/numerology/number-balance.md', 'Balanced, semi-balanced and unbalanced numbers per position'],
  ['.brain/numerology/number-names.md', 'The archetype name of every number'],
  ['.brain/numerology/psyche.md', 'The psyche charts'],
  ['knowledge/raw/system-prompt-new.md', "The owner's SYSTEM PROMPT (New)"],
  ['knowledge/raw/important-notes-for-ai.md', "The owner's Important Notes For A.I."],
  ['knowledge/raw/chart-notes.md', "The owner's Chart Notes"],
];
let core = null;
export function coreText() {
  if (core !== null) return core;
  const parts = ['COURSE REFERENCE: how this numerology system (Chaldean five-chart numeroscope) reads a chart.'];
  for (const [file, label] of CORE) {
    let t;
    try { t = fs.readFileSync(new URL(file, REPO), 'utf8'); } catch { continue; }
    t = t.replace(/\r\n/g, '\n');
    if (file.startsWith('knowledge/raw/')) t = t.split('\n').slice(3).join('\n'); // the 3-line header
    parts.push(`=== ${label} ===\n${t.trim()}`);
  }
  core = parts.join('\n\n') + '\n';
  return core;
}

// ---------- the index ----------
let idx = null;
function load() {
  if (idx) return idx;
  try {
    const data = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    const about = new Map();
    data.chunks.forEach((c, i) => { for (const n of c.numbers) { if (!about.has(n)) about.set(n, []); about.get(n).push(i); } });
    const sourceTopic = new Map(data.sources.map((s) => [s.slug, s.topic]));
    idx = { missing: false, chunks: data.chunks, about, sourceTopic };
  } catch {
    idx = { missing: true, chunks: [], about: new Map(), sourceTopic: new Map() };
  }
  return idx;
}
// The loaded index for other readers (server/meaning.js ranks passages its own way).
export const knowledgeIndex = () => load();
export function knowledgeInfo() {
  const k = load();
  return { missing: k.missing, chunks: k.chunks.length, sources: k.sourceTopic.size };
}

// How much a source is trusted for "what does this number mean": the course books and the owner's guides
// first, notes and articles next, lecture transcripts last.
function weight(slug) {
  if (/^(book-|essence-codes|essence-book|subnumeroscope-interpretation|name-numeroscopes|subvibrations|diamond-method|psyche-book|guide-|main-combo-guide|number-notes|name-chart-|numbers-1-99-website|numbers-1-9-chart)/.test(slug)) return 3;
  if (/^(lecture-|biz-transcript-|facebook-questions|all-chart-videos)/.test(slug)) return 1;
  return 2;
}

// ---------- positions ----------
// The topics (tools/build-knowledge.mjs TOPICS) that say a passage is about a position; the first one counts most.
const ESSENCE_TOPICS = {
  day: ['dayVibration'], month: ['month'], year: ['year'], littleLp: ['lifePath'], bigLp: ['lifePath'],
  nexus: ['nexus', 'essenceDiamonds'], outerAura: ['essenceDiamonds', 'auras'], innerAura: ['essenceDiamonds', 'auras'], topAura: ['essenceDiamonds'],
  outerDiamond: ['essenceDiamonds'], innerDiamond: ['essenceDiamonds'], dharmaDiamond: ['essenceDiamonds'], target: ['essenceDiamonds'], challengeDiamond: ['essenceDiamonds'],
};
const RHOMBUS_TOPICS = {
  first: ['firstName'], middle: ['middleName'], last: ['lastName'], le: ['lifeExpression'], big: ['lifeExpression'], leDiamond: ['lifeExpression'],
  upperLeft: ['auras'], upperRight: ['auras'], lowerLeft: ['auras'], lowerRight: ['auras'],
  heart: ['mindCenter'], heartExtra: ['mindCenter'], mindDiamond: ['mindCenter'], solar: ['emotionCenter'], solarExtra: ['emotionCenter'], emotionDiamond: ['emotionCenter'],
  publicDiamond: ['firstName', 'dayVibration'], spine: ['spine'], spineDiamond: ['spine'], pillar: ['pillar'], letters: [], mentalFlow: ['mindCenter'],
};
const CHART_TOPIC = { vocation: 'vocation', personality: 'personality', outer: 'psyche', inner: 'psyche' };
function topicsFor(chart, position) {
  if (chart === 'essence') return ESSENCE_TOPICS[position] || [];
  let base = RHOMBUS_TOPICS[position] || [];
  if (chart === 'name' && position === 'lowerRight') base = ['loveAura', 'auras'];
  if ((chart === 'outer' && position === 'first')) base = []; // the challenge number: psyche passages
  if (chart === 'inner' && position === 'first') base = ['month'];
  if ((chart === 'outer' || chart === 'inner') && position === 'last') base = ['year'];
  return CHART_TOPIC[chart] ? [CHART_TOPIC[chart], ...base] : base;
}

// Importance: Nexus first, then the life expression and the centers, the names, the first-link birth numbers,
// the essence diamonds, the name auras, the psyche centers and pillars, the sub-charts, then the rest.
const ORDER = [
  'essence.day', 'essence.littleLp', 'essence.bigLp', 'essence.nexus',
  'name.le', 'name.heart', 'name.solar', 'name.pillar', 'name.first', 'name.last',
  'essence.month', 'essence.year',
  'essence.outerDiamond', 'essence.innerDiamond', 'essence.dharmaDiamond', 'essence.target', 'essence.topAura', 'essence.outerAura', 'essence.innerAura',
  'name.upperLeft', 'name.upperRight', 'name.lowerLeft', 'name.lowerRight',
  'outer.heart', 'outer.solar', 'inner.heart', 'inner.solar', 'outer.pillar', 'inner.pillar', 'outer.le', 'inner.le', 'outer.first', 'outer.mentalFlow',
  'vocation.le', 'personality.le', 'vocation.heart', 'vocation.solar', 'personality.heart', 'personality.solar',
];
const RANK = new Map(ORDER.map((k, i) => [k, i]));
POSITIONS.forEach((p, i) => { const k = `${p.chart}.${p.key}`; if (!RANK.has(k)) RANK.set(k, ORDER.length + i); });

const FOCUS = {
  everything: [],
  nexus: ['essence.day', 'essence.littleLp', 'essence.bigLp', 'essence.nexus'],
  'mind-emotion': ['name.heart', 'name.solar', 'name.mindDiamond', 'name.emotionDiamond', 'name.heartExtra', 'name.solarExtra', 'outer.heart', 'inner.heart', 'outer.solar', 'inner.solar', 'outer.mentalFlow', 'vocation.heart', 'vocation.solar', 'personality.heart', 'personality.solar'],
  'pain-points': ['essence.day', 'essence.littleLp', 'essence.nexus', 'name.le', 'name.heart', 'name.solar', 'name.pillar', 'outer.pillar', 'inner.pillar', 'outer.first'],
  strengths: ['essence.day', 'essence.littleLp', 'essence.bigLp', 'essence.nexus', 'name.le', 'name.pillar', 'name.first', 'essence.target', 'essence.dharmaDiamond'],
  name: POSITIONS.filter((p) => p.chart === 'name' && !p.hidden).map((p) => `name.${p.key}`).sort((a, b) => RANK.get(a) - RANK.get(b)),
  psyche: POSITIONS.filter((p) => (p.chart === 'outer' || p.chart === 'inner') && !p.hidden).map((p) => `${p.chart}.${p.key}`).sort((a, b) => RANK.get(a) - RANK.get(b)),
  'career-money': ['essence.day', 'name.le', 'name.pillar', 'name.first', 'essence.nexus', 'vocation.le', 'name.upperLeft', 'essence.target'],
  love: ['name.lowerRight', 'name.solar', 'name.emotionDiamond', 'inner.solar', 'outer.solar', 'essence.innerDiamond', 'essence.innerAura', 'name.upperRight', 'inner.lowerRight', 'outer.lowerRight'],
  business: ['essence.day', 'name.le', 'name.pillar', 'name.first', 'essence.nexus', 'name.heart', 'name.upperLeft'],
};
const BUSINESS_PULL = new Set(['essence.day', 'name.le', 'name.big', 'name.pillar', 'name.first']);
const TONE = {
  'pain-points': /unbalanc|imbalanc|shadow|pitfall|weakness|challenge|negative|blockage|struggle|danger|avoid/i,
  strengths: /\bbalanced\b|strength|gift|talent|potential|asset|success|power/i,
};

const numText = (sum, ds) => (sum < 10 ? String(sum) : `${sum}/${ds}`);
const numRe = (n) => new RegExp(`(?<![\\d/.:])${n}(?![\\d])`);
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

// Candidates for one position, best first. Tiers: the number with the position's topic (all of them, then the
// first), the number in a general description, the number anywhere else, then the digit sum the same way.
function candidates(k, { sum, ds, topics, business, tone }) {
  const tiers = [];
  const d = ds || reduce(sum);
  const rankOf = (i, base) => {
    const c = k.chunks[i];
    const has = (t) => c.topics.includes(t);
    const general = has('general') || k.sourceTopic.get(c.source) === 'numbers';
    let tier;
    if (business && k.sourceTopic.get(c.source) === 'business') tier = 0; // the business course on this number
    else if (business && has('business')) tier = 1;
    else if (topics.length && topics.every(has)) tier = 2;
    else if (topics.length && has(topics[0])) tier = 3;
    else if (topics.length > 1 && topics.slice(1).some(has)) tier = 4;
    else if (general) tier = 5;
    else tier = 6;
    const inHeading = topics.length && (c.htopics || []).includes(topics[0]) ? 0 : 1;
    const named = numRe(base ? d : sum).test(c.heading) ? 0 : 1;
    return [base + tier, named, inHeading, tone && tone.test(c.text) ? 0 : 1, Math.min(c.numbers.length, 3), -weight(c.source), i];
  };
  for (const i of k.about.get(sum) || []) tiers.push(rankOf(i, 0));
  if (d !== sum) for (const i of k.about.get(d) || []) tiers.push(rankOf(i, 10));
  tiers.sort((a, b) => { for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return a[j] - b[j]; return 0; });
  const seen = new Set(), out = [];
  for (const t of tiers) { const i = t[t.length - 1]; if (!seen.has(i)) { seen.add(i); out.push(i); } }
  return out;
}

function shingles(text) {
  const w = text.toLowerCase().match(/[a-z']+/g) || [];
  const out = new Set();
  for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' '));
  return out;
}
const lastHeading = (h) => (h ? h.split(' > ').slice(-2).join(' > ') : '');
const renderChunk = (c) => `[source: ${c.title}${lastHeading(c.heading) ? ` — ${lastHeading(c.heading)}` : ''}]\n${c.text}`;

export function contextFor(values, { budgetChars = 120000, focus = null } = {}) {
  const k = load();
  if (k.missing) return { text: '', used: [], chars: 0, missing: true };
  const focusList = FOCUS[focus] || [];
  const focusSet = new Set(focusList);
  const rows = (values || []).filter((v) => v && v.sum > 0 && v.position !== 'anyName')
    .map((v) => ({ ...v, key: `${v.chart}.${v.position}`, n: v.n || 0 }));
  rows.sort((a, b) => {
    const fa = focusSet.has(a.key) ? focusList.indexOf(a.key) : 9999, fb = focusSet.has(b.key) ? focusList.indexOf(b.key) : 9999;
    if (fa !== fb) return fa - fb;
    const ra = RANK.has(a.key) ? RANK.get(a.key) : 9999, rb = RANK.has(b.key) ? RANK.get(b.key) : 9999;
    if (ra !== rb) return ra - rb;
    if (a.n !== b.n) return a.n - b.n;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  const pullBusiness = focus === 'career-money' || focus === 'business';
  const plan = rows.map((r, i) => {
    let cap = i < 4 ? 6 : i < 10 ? 4 : i < 20 ? 3 : 2;
    if (focusSet.size) cap = focusSet.has(r.key) ? 10 : Math.min(cap, 2);
    const header = `## ${positionLabel(r.chart, r.position)}${r.n ? ` ${r.n + 1}` : ''} ${numText(r.sum, r.ds)} (${chartLabel(r.chart).toLowerCase()})`;
    return {
      r, cap, header, taken: [], pos: 0,
      list: candidates(k, { sum: r.sum, ds: r.ds, topics: topicsFor(r.chart, r.position), business: pullBusiness && BUSINESS_PULL.has(r.key), tone: TONE[focus] || null }),
    };
  });
  const used = new Set(), seenShingles = new Set();
  let total = 0, sections = 0;
  const maxCap = plan.reduce((m, p) => Math.max(m, p.cap), 0);
  for (let round = 0; round < maxCap; round++) {
    let progress = false;
    for (const p of plan) {
      if (p.taken.length >= p.cap) continue;
      let tries = 0;
      while (p.pos < p.list.length && tries < 6) {
        const i = p.list[p.pos];
        if (used.has(i)) { p.pos++; continue; }
        const c = k.chunks[i];
        const sh = shingles(c.text);
        let dup = 0; for (const s of sh) if (seenShingles.has(s)) dup++;
        if (sh.size && dup / sh.size >= 0.5) { used.add(i); p.pos++; continue; } // the same passage from another copy
        const body = renderChunk(c);
        const cost = p.taken.length ? 2 + body.length : (sections ? 2 : 0) + p.header.length + 1 + body.length;
        if (total + cost > budgetChars) { p.pos++; tries++; continue; }
        p.taken.push(i); used.add(i); p.pos++;
        for (const s of sh) seenShingles.add(s);
        if (p.taken.length === 1) sections++;
        total += cost; progress = true;
        break;
      }
    }
    if (!progress) break;
  }
  const out = [], usedOut = [];
  for (const p of plan) {
    if (!p.taken.length) continue;
    out.push(`${p.header}\n${p.taken.map((i) => renderChunk(k.chunks[i])).join('\n\n')}`);
    usedOut.push({ chart: p.r.chart, position: p.r.position, n: p.r.n, sum: p.r.sum, chunks: p.taken.map((i) => k.chunks[i].id) });
  }
  const text = out.join('\n\n');
  return { text, used: usedOut, chars: text.length };
}

// The best passages about one number, optionally for one topic (a position family such as 'mindCenter').
export function chunksFor(number, topic = null, limit = 5) {
  const k = load();
  if (k.missing) return [];
  const n = Number(number);
  const list = candidates(k, { sum: n, ds: reduce(n), topics: topic ? [topic] : [], business: topic === 'business', tone: null })
    .filter((i) => k.chunks[i].numbers.includes(n));
  return list.slice(0, Math.max(0, limit)).map((i) => {
    const c = k.chunks[i];
    return { id: c.id, source: c.source, title: c.title, heading: c.heading, numbers: c.numbers.slice(), topics: c.topics.slice(), text: c.text };
  });
}
