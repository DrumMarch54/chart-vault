// What one number means in one position: the course's own words, for the tap on a number of a drawn chart
// (the viewer and the Quick Chart). No AI, free, instant. The passages come from the knowledge index
// (knowledge/index.json, server/knowledge.js); the verdict from the balance lists (server/facts.js).
//
//   meaningFor({ chart, position, sum, parts })
//     -> { chart, chartLabel, position, label, sum, ds, text, name, verdict, family,
//          passages: [{ source, title, heading, text }],   the course on this number IN THIS POSITION
//          general:  [...],                                about the number itself, only when few passages fit
//          combo: { parts: [a, b], passages: [...] } | null  the two parts a center, aura or spine is made of
//        }
//     or null when the position is not in the catalog or the number is not 1-99.
//   countWith(db, chart, position, sum) -> how many vault charts hold that number in that position.
//
// Ranking (lower is better): a source written about this chart first (SOURCES), then a passage whose heading
// or topics name the position (TOPICS, from the index), then one whose heading names the number, then the
// longer passage. Business books come last on a person's chart. "Specific" = the passage carries the position's
// first topic; everything else about the number is "general" and only shows when fewer than two fit.
import { POSITIONS, positionLabel, chartLabel } from './positions.js';
import { knowledgeIndex } from './knowledge.js';
import { judge, familyOf, nameOf, fmt } from './facts.js';

const BY_KEY = new Map(POSITIONS.map((p) => [`${p.chart}.${p.key}`, p]));

// The topics (tools/build-knowledge.mjs TOPICS) that say a passage is about a position: first one counts most.
const ESSENCE = {
  day: ['dayVibration'], month: ['month'], year: ['year'], littleLp: ['lifePath'], bigLp: ['lifePath'],
  nexus: ['nexus', 'essenceDiamonds'], outerAura: ['essenceDiamonds', 'auras'], innerAura: ['essenceDiamonds', 'auras'], topAura: ['essenceDiamonds', 'auras'],
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
const SOURCES = {
  essence: /^(essence-|framework-|higher-self-|diamond-method|lecture-positions-in-the-essence|lecture-life-path|lecture-numbers-1-9-diamonds|lecture-diamond-unpacked|nlm-dharma|nlm-dvlp|nlm-day-month|nlm-higher-self|article-dharma|humanity-archetyping)/,
  name: /^(name-chart-|name-numeroscopes-book|name-numeroscope-|subvibrations|six-themes|lecture-name-chart|lecture-rules-for-pure|powerpoint-undernumeroscopes)/,
  vocation: /^(subnumeroscope-interpretation|vocation-chart-|sub-charts-overview|framework-vocation|lecture-vocation|lecture-vowels|powerpoint-undernumeroscopes|name-chart-)/,
  personality: /^(subnumeroscope-interpretation|personality-chart-|sub-charts-overview|framework-vocation|powerpoint-undernumeroscopes|name-chart-)/,
  outer: /^(psyche-|psychic-disorders|nlm-psyche|nlm-outer-psyche|nlm-inner-psyche|nlm-25-26-psyche|lecture-psyche|lecture-interpretations-of-your-psyche|six-themes-book-part-1|name-chart-)/,
  inner: /^(psyche-|psychic-disorders|nlm-psyche|nlm-outer-psyche|nlm-inner-psyche|nlm-25-26-psyche|lecture-psyche|lecture-interpretations-of-your-psyche|six-themes-book-part-1|name-chart-)/,
};
const BUSINESS = /^biz-/;
const TRANSCRIPT = /^(lecture-|facebook-questions|all-chart-videos)/;
const sourceFit = (chart, slug) => (SOURCES[chart] && SOURCES[chart].test(slug) ? 0 : BUSINESS.test(slug) ? 3 : TRANSCRIPT.test(slug) ? 2 : 1);

// The words a passage's heading uses for a position. A heading with the position's own word fits best (0); one
// with another position's word (a "friends aura" passage on the public aura, "big life path" on the little one)
// is about that other position (2); neither, 1.
const W = {
  upperLeft: /brand|public|top left|upper left/i, upperRight: /friends|top right|upper right/i, lowerLeft: /associates|bottom left|lower left|twenties/i, lowerRight: /love|bottom right|lower right|childhood/i,
  heart: /\bMV\b|main vibration|heart (?:center|centre|diamond)|mind (?:center|centre)|mental diamond/i, heartExtra: /\bSV\b|sub ?vibration|extra vibration|middle name diamond/i,
  solar: /\bMV\b|main vibration|solar plexus|emotion(?:al)? (?:center|centre|diamond)/i, solarExtra: /\bSV\b|sub ?vibration|extra vibration|middle name diamond/i,
  first: /first name|challenge|psychic month/i, middle: /middle name/i, last: /last name|surname|family name/i,
  le: /life expression|heart'?’?s desire|personality number|\bLE\b/i, big: /big (?:life expression|heart|personality)|\bBLE\b/i, pillar: /pillar/i, spine: /spine/i,
  day: /day vibration|\bDV\b/i, month: /\bmonth/i, year: /\byear/i, littleLp: /life path|\bLP\b/i, bigLp: /big life path|higher life path|\bHLP\b|\bBLP\b/i,
  outerAura: /outer (?:aura|diamond)|\bOD\b/i, outerDiamond: /outer (?:aura|diamond)|\bOD\b/i, innerAura: /inner (?:aura|diamond)|\bID\b/i, innerDiamond: /inner (?:aura|diamond)|\bID\b/i,
  topAura: /dharma/i, dharmaDiamond: /dharma/i, nexus: /nexus|\bDVLP\b|DV-LP|DV\/LP/i, target: /target/i, challengeDiamond: /challenge/i,
};
function wordFit(position, heading) {
  const own = W[position];
  if (own && own.test(heading)) return 0;
  return Object.keys(W).some((p) => p !== position && W[p].test(heading)) ? 2 : 1;
}
// The owner's own scrape docs that ARE a position: a passage from one counts as specific when it names the number.
const HOME = { 'outer.lowerRight': /^psyche-childhood-aura/, 'inner.lowerRight': /^psyche-childhood-aura/, 'outer.lowerLeft': /^psyche-twenties-aura/, 'inner.lowerLeft': /^psyche-twenties-aura/, 'outer.first': /^nlm-outer-psyche-challenge/ };
// General descriptions of a number: the number books and guides, the website's 1-99, the number notes.
const GENERAL = /^(book-|guide-|other-guide-|numbers-1-99-website|numbers-1-9-chart|number-notes|energy-type|number-title)/;

const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const numRe = (n) => new RegExp(`(?<![\\d/.:])${n}(?![\\d])`);
// Every number a heading names ("15 and 12 in the mind center" -> 15, 12; "12/3" is one number). A heading that
// names another number too is about a pair or a case, not about this number alone.
const HEAD_NUMS = /(?<![\d/.:])(\d{1,2})(?:\/\d)?(?![\d])/g;
// Only the heading's own line counts ("Appendix 1: Outer Diamonds > Outer Diamond 48" is about 48), and a
// numbered part, step or case is not a number ("Step 2", "Module 12").
const headNums = (heading) => [...new Set([...String(heading).split(' > ').pop().replace(/\b(?:appendix|part|step|module|chapter|theme|lesson|week|section|case|example|video)\s+\d+/gi, '').matchAll(HEAD_NUMS)].map((m) => Number(m[1])))];
const words6 = (text) => { const w = text.toLowerCase().match(/[a-z']+/g) || []; const out = new Set(); for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' ')); return out; };
const overlaps = (a, b) => { if (!a.size || !b.size) return false; let n = 0; for (const s of a) if (b.has(s)) n++; return n / Math.min(a.size, b.size) > 0.5; };
const strip = (c) => ({ source: c.source, title: c.title, heading: c.heading, text: c.text });
const byKey = (a, b) => { for (let j = 0; j < a.key.length; j++) if (a.key[j] !== b.key[j]) return a.key[j] - b.key[j]; return 0; };

// Take passages in rank order, skipping near-duplicates (the same text scraped twice) and the ones already shown.
function take(k, ranked, limit, taken) {
  const out = [];
  for (const i of ranked) {
    if (out.length >= limit) break;
    const c = k.chunks[i];
    if (taken.ids.has(c.id)) continue;
    const sh = words6(c.text);
    if (taken.shingles.some((s) => overlaps(s, sh))) continue;
    taken.ids.add(c.id); taken.shingles.push(sh); out.push(strip(c));
  }
  return out;
}

export function meaningFor({ chart, position, sum, parts = null } = {}) {
  const p = BY_KEY.get(`${chart}.${position}`);
  const n = Number(sum);
  if (!p || p.hidden || !Number.isInteger(n) || n < 1 || n > 99) return null;
  const ds = reduce(n);
  const k = knowledgeIndex();
  const topics = topicsFor(chart, position);
  const base = { chart, chartLabel: chartLabel(chart), position, label: positionLabel(chart, position), sum: n, ds, text: fmt(n, ds), name: nameOf(n), verdict: judge(chart, position, n), family: familyOf(chart, position) };
  if (k.missing) return { ...base, passages: [], general: [], combo: null, missing: true };

  const partSet = new Set(Array.isArray(parts) ? parts.map(Number) : []);
  const home = HOME[`${chart}.${position}`];
  const scored = [];
  for (const i of k.about.get(n) || []) {
    const c = k.chunks[i];
    const has = (t) => c.topics.includes(t);
    // A heading naming other numbers too is about a pair or a case: skipped, except the center's own pair with
    // its extra vibration ("7 and 12 in the mind center" for an extra vibration 12 under a 7).
    const others = headNums(c.heading).filter((x) => x !== n);
    if (others.length && !(/Extra$/.test(position) && others.every((x) => partSet.has(x)))) continue;
    const topicFit = topics.length ? (has(topics[0]) ? 0 : 2) + (topics.length > 1 && !has(topics[1]) ? 1 : 0) : 2;
    const wf = wordFit(position, c.heading);
    const named = numRe(n).test(c.heading) ? 0 : /\d/.test(c.heading) ? 2 : 1;
    const general = has('general') || k.sourceTopic.get(c.source) === 'numbers' || GENERAL.test(c.source);
    const specific = (topics.length && has(topics[0]) && named === 0 && wf < 2) || (home && home.test(c.source));
    scored.push({ i, specific, general: general && named === 0 && wf !== 2 && !BUSINESS.test(c.source), key: [sourceFit(chart, c.source) + topicFit + wf, named, c.text.length < 200 ? 1 : 0, -sourceWeight(c.source), i] });
  }
  scored.sort(byKey);
  const taken = { ids: new Set(), shingles: [] };
  const passages = take(k, scored.filter((s) => s.specific).map((s) => s.i), 4, taken);
  // About the number itself, when the course says little about it in this position.
  const general = passages.length < 2 ? take(k, scored.filter((s) => !s.specific && s.general).map((s) => s.i), 2, taken) : [];
  return { ...base, passages, general, combo: comboFor(k, topics, parts, taken) };
}

// How much a source is trusted for "what does this number mean" (same ladder as server/knowledge.js).
function sourceWeight(slug) {
  if (/^(book-|essence-codes|essence-book|subnumeroscope-interpretation|name-numeroscopes|subvibrations|diamond-method|psyche-book|guide-|main-combo-guide|number-notes|name-chart-|numbers-1-99-website|numbers-1-9-chart)/.test(slug)) return 3;
  if (/^(lecture-|biz-transcript-|facebook-questions|all-chart-videos)/.test(slug)) return 1;
  return 2;
}

// The two parts a center is made of (its auras, or the center and a middle name): the passages whose heading
// names both numbers together ("7 and 5 in the mind center", "5 + 7 Combinations"), the position's own first.
function comboFor(k, topics, parts, taken) {
  if (!Array.isArray(parts) || parts.length !== 2) return null;
  const [a, b] = parts.map(Number);
  if (![a, b].every((x) => Number.isInteger(x) && x >= 1 && x <= 99)) return null;
  const pair = new RegExp(`(?<![\\d/.:])(${a}(?:/\\d)?\\s*(?:and|\\+|&|with|beside|next to|-)\\s*${b}|${b}(?:/\\d)?\\s*(?:and|\\+|&|with|beside|next to|-)\\s*${a})(?![\\d])`, 'i');
  const scored = [];
  const seen = new Set();
  for (const n of new Set([a, b])) for (const i of k.about.get(n) || []) {
    if (seen.has(i)) continue; seen.add(i);
    const c = k.chunks[i];
    if (!pair.test(c.heading) || BUSINESS.test(c.source) || /^relations-book/.test(c.source)) continue;
    const own = topics.length && c.topics.includes(topics[0]) ? 0 : 1;
    const combo = c.topics.includes('combos') || /combo/i.test(c.source) ? 0 : 1;
    scored.push({ i, key: [own, combo, c.text.length < 200 ? 1 : 0, -sourceWeight(c.source), i] });
  }
  if (!scored.length) return { parts: [a, b], passages: [] };
  scored.sort(byKey);
  return { parts: [a, b], passages: take(k, scored.map((s) => s.i), 2, taken) };
}

export function countWith(db, chart, position, sum) {
  const r = db.prepare('SELECT COUNT(DISTINCT image_id) AS n FROM chart_values WHERE chart = ? AND position = ? AND sum = ?').get(chart, position, Number(sum));
  return r ? r.n : 0;
}
