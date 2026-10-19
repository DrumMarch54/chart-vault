// What one number means in one position: the course's own words, for a number tapped on a drawn chart (the
// viewer and the Quick Chart). No AI, free, instant. Passages come from the knowledge index (knowledge/index.json,
// server/knowledge.js); the verdict from the balance lists (server/facts.js).
//
//   meaningFor({ chart, position, sum, pair, rel })
//     pair: the numbers that share a center's circle with this one (a mind center main vibration and its extra
//           vibrations). "7 and 13 in the mind center" in the course = main 7, extra 13: the owner's combo tags
//           agree (37 of 38 name the circle, none the auras; checked on the live vault 2026-10-19).
//     rel:  [{ position, sum }] the diamonds behind the tapped number on the same chart (the mental diamond
//           behind a mind center or an upper aura, the outer diamond behind the outer aura, ...). Diamonds are
//           not drawn, so they come with the number that makes them.
//     -> { chart, chartLabel, position, label, sum, ds, text, name, verdict, family,
//          passages: [{ source, title, heading, text }]   the course on this number IN THIS POSITION
//          nameChart: { label, text, passages } | null     a sub-chart center or aura: the name chart's words for it
//          pair: { with: [{ sum, text }], passages } | null  the circle's combination
//          related: [{ chart, position, label, sum, text, name, verdict, passages }] }
//     or null when the position is not in the catalog or the number is not 1-99.
//   countWith(db, chart, position, sum) -> how many vault charts hold that number in that position.
//
// Ranking (lower is better): a source written about this chart first (SOURCES), then the position's topic and
// its own words in the heading (W), then the number named in the heading. A heading or a paragraph that names
// another number too is about a pair or a case, not about this number alone: left out (it may come back under
// the pair). Passages about a NUMBER'S OWN diamond (the course's "small diamond of the number 7", "Big Diamond",
// the Diamond Method book) are never shown: they are about the number, not about a chart's diamond (owner 2026-10-19).
import fs from 'node:fs';
import { POSITIONS, positionLabel, chartLabel } from './positions.js';
import { knowledgeIndex } from './knowledge.js';
import { judge, familyOf, nameOf, fmt } from './facts.js';
import { wordsFor } from './subchart-words.js';

const BY_KEY = new Map(POSITIONS.map((p) => [`${p.chart}.${p.key}`, p]));

// The topics (tools/build-knowledge.mjs TOPICS) that say a passage is about a position: first one counts most.
const ESSENCE = {
  day: ['dayVibration'], month: ['month'], year: ['year'], littleLp: ['lifePath'], bigLp: ['lifePath'],
  nexus: ['nexus', 'essenceDiamonds'], outerAura: ['auras', 'essenceDiamonds'], innerAura: ['auras', 'essenceDiamonds'], topAura: ['essenceDiamonds'],
  outerDiamond: ['essenceDiamonds'], innerDiamond: ['essenceDiamonds'], dharmaDiamond: ['essenceDiamonds'], target: ['essenceDiamonds'], challengeDiamond: ['essenceDiamonds'],
};
const RHOMBUS = {
  first: ['firstName'], middle: ['middleName'], last: ['lastName'], le: ['lifeExpression'], big: ['lifeExpression'], leDiamond: ['lifeExpression'],
  upperLeft: ['auras'], upperRight: ['auras'], lowerLeft: ['auras'], lowerRight: ['auras'],
  heart: ['mindCenter'], heartExtra: ['mindCenter'], mindDiamond: ['mindCenter'], solar: ['emotionCenter'], solarExtra: ['emotionCenter'], emotionDiamond: ['emotionCenter'],
  publicDiamond: ['firstName', 'dayVibration'], spine: ['spine'], spineDiamond: ['spine'], pillar: ['pillar'], letters: [], mentalFlow: ['mindCenter', 'psyche'],
};
export function topicsFor(chart, position) {
  if (chart === 'essence') return ESSENCE[position] || [];
  let base = RHOMBUS[position] || [];
  if (chart === 'name' && position === 'lowerRight') base = ['loveAura', 'auras'];
  if (chart === 'outer' && position === 'first') return ['psyche'];           // the challenge number (psychic month)
  if (chart === 'inner' && position === 'first') return ['month', 'psyche'];
  if ((chart === 'outer' || chart === 'inner') && position === 'last') return ['year', 'psyche'];
  if (chart === 'vocation' || chart === 'personality') return [...base, chart];
  if (chart === 'outer' || chart === 'inner') return [...base, 'psyche'];
  return base;
}

// Sources written about each chart (knowledge/raw file slugs). A passage from one of these outranks the rest.
const PSY = /^(psyche-|psychic-disorders|nlm-psyche|nlm-outer-psyche|nlm-inner-psyche|nlm-25-26-psyche|lecture-psyche|lecture-interpretations-of-your-psyche|six-themes-book-part-1|name-chart-)/;
const SOURCES = {
  essence: /^(essence-|framework-(?!diamonds)|higher-self-|lecture-positions-in-the-essence|lecture-life-path|nlm-dharma|nlm-dvlp|nlm-day-month|nlm-higher-self|article-dharma|humanity-archetyping)/,
  name: /^(name-chart-|name-numeroscopes-book|name-numeroscope-|six-themes|lecture-name-chart|lecture-rules-for-pure|powerpoint-undernumeroscopes)/,
  vocation: /^(subnumeroscope-interpretation|subvibrations|vocation-chart-|sub-charts-overview|framework-vocation|lecture-vocation|lecture-vowels|powerpoint-undernumeroscopes)/,
  personality: /^(subnumeroscope-interpretation|subvibrations|personality-chart-|sub-charts-overview|framework-vocation|powerpoint-undernumeroscopes)/,
  outer: PSY, inner: PSY,
};
const BUSINESS = /^biz-/;
const TRANSCRIPT = /^(lecture-|facebook-questions|all-chart-videos)/;
const sourceFit = (chart, slug) => (SOURCES[chart] && SOURCES[chart].test(slug) ? 0 : BUSINESS.test(slug) ? 3 : TRANSCRIPT.test(slug) ? 2 : 1);
function sourceWeight(slug) {
  if (/^(book-|essence-codes|essence-book|subnumeroscope-interpretation|name-numeroscopes|subvibrations|psyche-book|guide-|main-combo-guide|number-notes|name-chart-|numbers-1-99-website|numbers-1-9-chart)/.test(slug)) return 3;
  if (/^(lecture-|biz-transcript-|facebook-questions|all-chart-videos)/.test(slug)) return 1;
  return 2;
}
// Which charts a source is written about (SOURCES), and which charts a passage names in its heading or opening.
// A passage about another chart (a vocation heart diamond on the name chart, a name chart aura on the essence's
// outer aura) is left out: the owner reads words in the context they were written for.
const sourceCharts = (slug) => Object.keys(SOURCES).filter((c) => SOURCES[c].test(slug));
const GROUP = { essence: 'essence', name: 'name', vocation: 'vocation', personality: 'personality', outer: 'psyche', inner: 'psyche' };
const CHART_WORDS = {
  vocation: /vocation|heart'?’?s desire/i,
  personality: /personality (?:chart|heart|solar|number|mind|emotion|diamond)|(?:big|little) personality/i,
  essence: /higher[- ]self|essence (?:chart|diamond)/i,
  psyche: /psyche|psychic/i,
  name: /name chart/i,
};
const namesOther = (hay, chart) => { const named = Object.keys(CHART_WORDS).filter((g) => CHART_WORDS[g].test(hay)); return named.length > 0 && !named.includes(GROUP[chart]); };
function otherChart(c, chart) {
  const by = sourceCharts(c.source).map((x) => GROUP[x]);
  if (by.length && !by.includes(GROUP[chart])) return true;
  return namesOther(`${String(c.heading).split(' > ').slice(-2).join(' ')} ${c.text.slice(0, 120)}`, chart);
}
// Sources about combinations: their passages belong under a pair, never under one number alone.
const COMBO_SOURCE = /^(main-combo-guide|combos-number-notes|nlm-charts-only-combos|name-numeroscope-guide-v2)/; // the guide v2 repeats the name numeroscopes book, all positions in one passage
// A number's OWN diamond (its symbol, not a chart's diamond): whole sources and headings about it.
const OWN_DIAMOND_SOURCE = /^(diamond-method|framework-diamonds|lecture-numbers-1-9-diamonds|lecture-diamond-unpacked|lecture-2026-part-\d+-diamonds-and-pyramids)/;
const OWN_DIAMOND = /\b(?:big|little|small) diamond\b|\bnumber \d+\s*[-–]\s*diamond\b|diamond of the number|number \d+ big diamond/i;
const ownDiamond = (c) => OWN_DIAMOND_SOURCE.test(c.source) || OWN_DIAMOND.test(c.heading) || OWN_DIAMOND.test(c.text.slice(0, 300));

// The words a heading uses for a position. Its own word fits best (0); another position's word (a "friends aura"
// passage on the public aura, "outer diamond" on the outer aura, "heart diamond" on the mind center) means the
// passage is about that other position (2); neither, 1.
const W = {
  upperLeft: /brand|public|top left|upper left/i, upperRight: /friends|top right|upper right/i, lowerLeft: /associates|bottom left|lower left|twenties/i, lowerRight: /love|bottom right|lower right|childhood/i,
  heart: /\bMV\b|main vibration|heart (?:center|centre)|mind (?:center|centre)|\bHC\b|\bMC\b/i, heartExtra: /\bSV\b|sub ?vibration|extra vibration|secondary/i,
  solar: /\bMV\b|main vibration|solar plexus(?! diamond)|emotion(?:al)? (?:center|centre)|\bSP\b|\bEC\b/i, solarExtra: /\bSV\b|sub ?vibration|extra vibration|secondary/i,
  mindDiamond: /heart diamond|mental diamond|mind diamond/i, emotionDiamond: /solar plexus diamond|emotional? diamond/i,
  leDiamond: /name line diamond|life expression diamond/i, publicDiamond: /public diamond/i, spineDiamond: /spine diamond/i,
  first: /first name|challenge|psychic month/i, middle: /middle name/i, last: /last name|surname|family name/i,
  le: /life expression(?! diamond)|heart'?’?s desire|personality number|\bLE\b/i, big: /big (?:life expression|heart|personality)|\bBLE\b/i, pillar: /pillar/i, spine: /spine(?! diamond)/i,
  day: /day vibration|\bDV\b/i, month: /\bmonth/i, year: /\byear/i, littleLp: /life path|\bLP\b/i, bigLp: /big life path|higher life path|\bHLP\b|\bBLP\b/i,
  outerAura: /outer aura/i, outerDiamond: /outer diamond|\bOD\b/i, innerAura: /inner aura/i, innerDiamond: /inner diamond/i,
  topAura: /dharma line|top aura|dharma number/i, dharmaDiamond: /dharma diamond/i, nexus: /nexus|\bDVLP\b|DV-LP|DV\/LP/i, target: /target/i, challengeDiamond: /challenge diamond/i,
};
function wordFit(position, heading) {
  const own = W[position];
  if (own && own.test(heading)) return 0;
  return Object.keys(W).some((p) => p !== position && W[p].test(heading)) ? 2 : 1;
}
// The owner's own scrape docs that ARE a position: a passage from one counts as specific when it names the number.
const HOME = { 'outer.lowerRight': /^psyche-childhood-aura/, 'inner.lowerRight': /^psyche-childhood-aura/, 'outer.lowerLeft': /^psyche-twenties-aura/, 'inner.lowerLeft': /^psyche-twenties-aura/, 'outer.first': /^nlm-outer-psyche-challenge/ };

const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const numRe = (n) => new RegExp(`(?<![\\d/.:])${n}(?![\\d])`);
// Every number a heading names ("15 and 12 in the mind center" -> 15, 12; "12/3" is one number). Only the heading's
// own line counts, and a numbered part, step or case is not a number ("Appendix 1", "Module 12").
const HEAD_NUMS = /(?<![\d/.:])(\d{1,2})(?:\/\d)?(?![\d])/g;
const headNums = (heading) => [...new Set([...String(heading).split(' > ').pop().replace(/\b(?:appendix|part|step|module|chapter|theme|lesson|week|section|case|example|video)\s+\d+/gi, '').matchAll(HEAD_NUMS)].map((m) => Number(m[1])))];
// A paragraph that opens on two numbers together ("11/2 and 7 in a heart center create ...") is about that pair.
const PAIR_OPEN = /(?<![\d/.:])(\d{1,2})(?:\/\d)?\s*(?:and|\+|&|with)\s*(\d{1,2})(?:\/\d)?(?![\d/])/i;
const paragraphs = (text) => String(text).split(/\n{2,}/);
const openingPair = (p) => { const m = PAIR_OPEN.exec(p.replace(/\*\*/g, '').slice(0, 110)); return m ? [Number(m[1]), Number(m[2])] : null; };
// The text of a passage without the paragraphs that are about a pair not made of these numbers.
// Lists ("- **13/4 + 16/7:** ...") are filtered line by line the same way.
const fits = (p, allowed) => { const pr = openingPair(p.replace(/^\s*[-*•]\s*/, '')); return !pr || pr.every((x) => allowed.has(x)); };
function keepOnly(text, allowed) {
  const out = paragraphs(text).filter((p) => fits(p, allowed)).map((p) => p.split('\n').filter((l) => !/^\s*[-*•]\s/.test(l) || fits(l, allowed)).join('\n'));
  return out.join('\n\n').replace(/(^|\n)\s*-{3,}\s*(?=\n|$)/g, '').trim();
}
const words6 = (text) => { const w = text.toLowerCase().match(/[a-z']+/g) || []; const out = new Set(); for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' ')); return out; };
const overlaps = (a, b) => { if (!a.size || !b.size) return false; let n = 0; for (const s of a) if (b.has(s)) n++; return n / Math.min(a.size, b.size) > 0.5; };
const byKey = (a, b) => { for (let j = 0; j < a.key.length; j++) if (a.key[j] !== b.key[j]) return a.key[j] - b.key[j]; return 0; };

// Take passages in rank order (text already trimmed), skipping near-duplicates and the ones already shown.
function take(list, limit, taken) {
  const out = [];
  for (const c of list) {
    if (out.length >= limit) break;
    if (!c.text || taken.ids.has(c.id)) continue;
    const sh = words6(c.text);
    if (sh.size < 3 && c.text.length < 60) continue;
    if (taken.shingles.some((s) => overlaps(s, sh))) continue;
    taken.ids.add(c.id); taken.shingles.push(sh); out.push({ source: c.source, title: c.title, heading: c.heading, text: c.text });
  }
  return out;
}

// The short points for a page (knowledge/bits.json): written by a Claude session from the course text, the course's
// words shortened. Key "chart.position:n" or "chart.position:n+partner". Missing file or key = no points.
let BITS = null;
export function bitsFor(key) {
  if (!BITS) { try { BITS = JSON.parse(fs.readFileSync(new URL('../knowledge/bits.json', import.meta.url), 'utf8')).bits || {}; } catch { BITS = {}; } }
  const b = BITS[key];
  return b ? { groups: b.groups.map((g) => ({ title: g.title, points: g.points.slice() })), sources: (b.sources || []).slice() } : null;
}
const pairBits = (chart, position, n, p) => bitsFor(`${chart}.${position}:${n}+${p}`) || bitsFor(`${chart}.${position}:${p}+${n}`);

// One heading's whole text: the index cuts a long section into several passages; the page shows it as one card.
function wholeSection(k, i, allowed) {
  const c = k.chunks[i], same = (j) => k.chunks[j] && k.chunks[j].source === c.source && k.chunks[j].heading === c.heading;
  let a = i, b = i;
  while (same(a - 1)) a--;
  while (same(b + 1)) b++;
  const parts = [];
  for (let j = a; j <= b; j++) { const t = keepOnly(k.chunks[j].text, allowed); if (t && !/→\s*[-+]?\d+\s*pts/.test(t)) parts.push(t); }
  return { id: `${c.source}#${a}`, source: c.source, title: c.title, heading: c.heading, text: parts.join('\n\n') };
}

// The passages ranked for number n in one position (the specific ones only), each heading's text whole.
function forPosition(k, chart, position, n, taken, { limit = 4 } = {}) {
  const topics = topicsFor(chart, position);
  const home = HOME[`${chart}.${position}`];
  const alone = new Set([n]);
  const scored = [];
  for (const i of k.about.get(n) || []) {
    const c = k.chunks[i];
    if (ownDiamond(c) || COMBO_SOURCE.test(c.source) || otherChart(c, chart)) continue;
    if (headNums(c.heading).some((x) => x !== n)) continue; // a pair or a case: not about n alone
    const text = keepOnly(c.text, alone);
    if (!text || /→\s*[-+]?\d+\s*pts/.test(text)) continue;
    const has = (t) => c.topics.includes(t);
    const topicFit = topics.length ? (has(topics[0]) ? 0 : 2) + (topics.length > 1 && !has(topics[1]) ? 1 : 0) : 2;
    const wf = wordFit(position, c.heading);
    const named = numRe(n).test(c.heading) ? 0 : /\d/.test(c.heading) ? 2 : 1;
    const sf = sourceFit(chart, c.source);
    // Specific = about this position: its topic, the number in the heading, and either a source written about this
    // chart or the position's own word in the heading. A business book (dates, brands) is never specific here.
    const specific = (topics.length && has(topics[0]) && named === 0 && wf < 2 && (wf === 0 || sf === 0) && !BUSINESS.test(c.source)) || (home && home.test(c.source));
    scored.push({ c: { ...c, text }, specific, key: [sf + topicFit + wf, named, text.length < 200 ? 1 : 0, -sourceWeight(c.source), i] });
  }
  scored.sort(byKey);
  const seen = new Set(), whole = [];
  for (const sc of scored) {
    if (!sc.specific) continue;
    const w = wholeSection(k, sc.key[sc.key.length - 1], alone);
    if (seen.has(w.id) || !w.text) continue;
    seen.add(w.id); whole.push(w);
  }
  return take(whole, limit, taken);
}

// A center's circle: the course on n together with one of its partners ("7 and 13 in the mind center"), from the
// heading or from a paragraph that opens on the pair. The exact numbers rank above their digit sums.
function forPair(k, chart, position, n, partners, taken) {
  const topics = topicsFor(chart, position);
  const out = [];
  const seen = new Set();
  for (const p of partners) {
    const exact = new Set([n, p]);
    const loose = new Set([n, p, reduce(n), reduce(p)]);
    const isPair = (pr, set) => pr && pr.every((x) => set.has(x)) && (set === exact ? (pr.includes(n) && pr.includes(p)) || (n === p && pr[0] === n && pr[1] === n) : (pr.some((x) => x === n || x === reduce(n)) && pr.some((x) => x === p || x === reduce(p))));
    for (const num of new Set([n, p, reduce(n), reduce(p)])) for (const i of k.about.get(num) || []) {
      if (seen.has(i)) continue; seen.add(i);
      const c = k.chunks[i];
      if (ownDiamond(c) || BUSINESS.test(c.source) || /^relations-book/.test(c.source) || otherChart(c, chart)) continue;
      const head = String(c.heading).split(' > ').pop();
      const hm = PAIR_OPEN.exec(head);
      const hp = hm ? [Number(hm[1]), Number(hm[2])] : null;
      let text = '', exactness = 1;
      if (isPair(hp, exact) || isPair(hp, loose)) { text = wholeSection(k, i, loose).text; exactness = isPair(hp, exact) ? 0 : 1; }
      else {
        const ps = paragraphs(c.text).filter((q) => isPair(openingPair(q), loose) && !namesOther(q.slice(0, 160), chart));
        if (!ps.length) continue;
        text = ps.join('\n\n'); exactness = ps.some((q) => isPair(openingPair(q), exact)) ? 0 : 1;
      }
      // The point-scoring tables ("15/6 + 9 in vocation chart solar plexus → -10 pts") are a tool, not a reading.
      if (!text || text.length < 60 || namesOther(text.slice(0, 160), chart) || /→\s*[-+]?\d+\s*pts/.test(text)) continue;
      if (topics.length && !c.topics.includes(topics[0])) continue; // "13/4 near 16/7 in an aura" is not the mind center
      const own = 0;
      const wf = wordFit(position.replace(/Extra$/, ''), c.heading);
      if (wf === 2) continue; // about another position ("15 as the love life aura" is not the emotion center)
      out.push({ c: { ...c, text }, key: [exactness + own + wf, sourceFit(chart, c.source), -sourceWeight(c.source), i] });
    }
  }
  out.sort(byKey);
  return take(out.map((s) => s.c), 3, taken);
}

function head(chart, position, n) {
  const ds = reduce(n);
  return { chart, chartLabel: chartLabel(chart), position, label: positionLabel(chart, position), sum: n, ds, text: fmt(n, ds), name: nameOf(n), verdict: judge(chart, position, n), family: familyOf(chart, position) };
}
const okNum = (n) => Number.isInteger(n) && n >= 1 && n <= 99;
const known = (chart, position) => { const p = BY_KEY.get(`${chart}.${position}`); return p && !p.hidden; };

// The books' own words for a position first (the sub-chart guide and book, server/subchart-words.js), then the
// passages ranked for it. General descriptions of a number are NOT shown (owner 2026-10-19: only what the course
// says about the number in that spot; the general layer comes later, on purpose).
function forSpot(k, chart, position, n, taken, limit) {
  const book = take(wordsFor(chart, position, n), limit, taken);
  return [...book, ...forPosition(k, chart, position, n, taken, { limit: limit - book.length })];
}
// On the vocation and personality charts the name chart's words for the same CENTER come after their own (owner:
// "I want that information there, but the specific description takes precedence"). Not for auras: a name chart
// aura is the brand, friends, associates or love aura, which a sub-chart aura is not.
const NAME_TWIN = new Set(['heart', 'heartExtra', 'solar', 'solarExtra']);

export function meaningFor({ chart, position, sum, pair = null, rel = null } = {}) {
  const n = Number(sum);
  if (!known(chart, position) || !okNum(n)) return null;
  const k = knowledgeIndex();
  const base = head(chart, position, n);
  const partners = (Array.isArray(pair) ? pair : []).map(Number).filter(okNum);
  const rels = (Array.isArray(rel) ? rel : []).map((r) => ({ position: String(r.position), sum: Number(r.sum) })).filter((r) => known(chart, r.position) && r.position !== position && okNum(r.sum));
  if (k.missing) return { ...base, passages: wordsFor(chart, position, n), nameChart: null, pair: null, related: [], missing: true };
  const taken = { ids: new Set(), shingles: [] };
  const passages = forSpot(k, chart, position, n, taken, 4);
  const bits = bitsFor(`${chart}.${position}:${n}`);
  const twin = (chart === 'vocation' || chart === 'personality') && NAME_TWIN.has(position) && known('name', position);
  const nameChart = twin ? { ...head('name', position, n), bits: bitsFor(`name.${position}:${n}`), passages: forPosition(k, 'name', position, n, taken, { limit: 2 }) } : null;
  // A sub-chart's circle: its own course words first, then the name chart's words on the same pair in the same center.
  const pairWords = partners.length ? [...forPair(k, chart, position, n, partners, taken), ...(twin ? forPair(k, 'name', position, n, partners, taken) : [])].slice(0, 3) : [];
  const pbits = partners.map((p) => pairBits(chart, position, n, p) || (twin ? pairBits('name', position, n, p) : null)).filter(Boolean);
  const pairOut = partners.length ? { with: partners.map((p) => ({ sum: p, text: fmt(p, reduce(p)) })), bits: pbits.length ? { groups: pbits.flatMap((b) => b.groups), sources: pbits.flatMap((b) => b.sources) } : null, passages: pairWords } : null;
  const related = rels.map((r) => ({ ...head(chart, r.position, r.sum), bits: bitsFor(`${chart}.${r.position}:${r.sum}`), passages: forSpot(k, chart, r.position, r.sum, taken, 2) }));
  return { ...base, bits, passages, nameChart: nameChart && nameChart.passages.length ? nameChart : null, pair: pairOut, related };
}

export function countWith(db, chart, position, sum) {
  const r = db.prepare('SELECT COUNT(DISTINCT image_id) AS n FROM chart_values WHERE chart = ? AND position = ? AND sum = ?').get(chart, position, Number(sum));
  return r ? r.n : 0;
}
