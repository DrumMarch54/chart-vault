#!/usr/bin/env node
// Which course sections describe a number in a spot, and which of them the number screen shows (the plan's step 2,
// .brain/PLAN-number-screen.md, owner 2026-11-27: "the course's text for the number in THIS exact spot AND its text
// for the number in this KIND of spot"). Free, no AI, reads knowledge/index.json and server/meaning.js only.
//
//   node tools/audit-spots.mjs [out.json]
//
// A section counts when the last part of its heading names ONE number (or one number in two forms, "AURA 5 AND
// 14/5") and words for the spot's kind ("AURA 17/8", "17/8 IN THE HEART CENTER", "Number 17 as the love life aura").
// Per spot and per source: the numbers the source covers, how many the screen shows, and the ones it does not.
import fs from 'node:fs';
import { knowledgeIndex } from '../server/knowledge.js';
import { meaningFor, shortLabel } from '../server/meaning.js';
import { POSITIONS } from '../server/positions.js';
import { wordsFor } from '../server/subchart-words.js';

const k = knowledgeIndex();
const ds = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

// Words a heading uses for a kind of spot. `not` = words for a neighbouring spot of the same kind.
const AURA_WORDS = { upperLeft: /brand|public|adult|top left|upper left/i, upperRight: /friend|teen|top right|upper right/i, lowerLeft: /associate|twenties|bottom left|lower left/i, lowerRight: /love|childhood|bottom right|lower right/i };
const otherAura = (key) => new RegExp(Object.entries(AURA_WORDS).filter(([k2]) => k2 !== key).map(([, r]) => r.source).join('|') + '|outer aura|inner aura|top aura', 'i');
const KIND = {
  upperLeft: { yes: /\baura\b/i, not: otherAura('upperLeft') }, upperRight: { yes: /\baura\b/i, not: otherAura('upperRight') },
  lowerLeft: { yes: /\baura\b/i, not: otherAura('lowerLeft') }, lowerRight: { yes: /\baura\b/i, not: otherAura('lowerRight') },
  heart: { yes: /heart cent|mind cent|\bMV\b|main vib/i, not: /solar|emotion|\bSV\b|sub.?vib|diamond/i },
  heartExtra: { yes: /(heart|mind)[^>]*(\bSV\b|sub.?vib|extra vib)|(\bSV\b|sub.?vib)[^>]*(heart|mind)/i, not: /solar|emotion|diamond/i },
  solar: { yes: /solar plexus|emotion(al)? cent/i, not: /\bSV\b|sub.?vib|diamond|heart cent|mind cent/i },
  solarExtra: { yes: /(solar|emotion)[^>]*(\bSV\b|sub.?vib|extra vib)|(\bSV\b|sub.?vib)[^>]*(solar|emotion)/i, not: /heart|mind|diamond/i },
  spine: { yes: /spine/i, not: /diamond/i }, pillar: { yes: /pillar/i, not: /^$/ },
  le: { yes: /life expression|heart'?s desire|personality number/i, not: /diamond|big/i }, big: { yes: /big (life expression|heart|personality)/i, not: /diamond/i },
  first: { yes: /first name|name line|challenge/i, not: /diamond/i }, middle: { yes: /middle name|name line/i, not: /diamond/i }, last: { yes: /surname|last name|name line/i, not: /diamond/i },
  mindDiamond: { yes: /heart diamond|mental diamond|mind diamond|mental strateg/i, not: /^$/ }, emotionDiamond: { yes: /solar plexus diamond|emotional? diamond/i, not: /^$/ },
  publicDiamond: { yes: /public diamond/i, not: /^$/ }, spineDiamond: { yes: /spine diamond/i, not: /^$/ }, leDiamond: { yes: /life expression diamond|name line diamond/i, not: /^$/ },
  heartSubDiamond: { yes: /sub ?diamond/i, not: /solar|emotion/i }, solarSubDiamond: { yes: /sub ?diamond/i, not: /heart|mind/i },
};
const ESSENCE = {
  day: /day vib|^day \d|birth ?day/i, month: /month vib|^month \d/i, year: /year vib/i, littleLp: /life path/i, bigLp: /(big|higher) life path|life path/i,
  outerAura: /outer aura/i, outerDiamond: /outer diamond/i, innerAura: /inner aura/i, innerDiamond: /inner diamond/i,
  topAura: /dharma line|top aura|dharma number/i, dharmaDiamond: /dharma/i, nexus: /nexus|dvlp|dv-lp/i, target: /target/i, challengeDiamond: /challenge diamond/i,
};
const fits = (chart, key, head) => {
  if (chart === 'essence') return ESSENCE[key] ? ESSENCE[key].test(head) : false;
  const r = KIND[key]; return r ? r.yes.test(head) && !r.not.test(head) : false;
};
// The one number (two forms of one number allowed) the heading's last part names; null when none or several.
const NUM = /(?<![\d/.:])(\d{1,2})(?:\/(\d))?(?![\d])/g;
function headNumbers(head) {
  const last = head.split(' > ').pop().replace(/^\s*\d+\.\s/, '').replace(/\b(?:appendix|part|step|module|chapter|lesson|section|case|example|video|page)\s+\d+/gi, '');
  const ns = [...new Set([...last.matchAll(NUM)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 99))];
  if (!ns.length) return [];
  return ns.every((n) => ds(n) === ds(ns[0])) ? ns : [];
}
const BUSINESS = /^biz-(?!superdates-int)/;
// The same words under another heading (a doc that copies the book) count as shown: the page drops near-duplicates.
const words6 = (text) => { const w = String(text).toLowerCase().match(/[a-z']+/g) || []; const out = new Set(); for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' ')); return out; };
const overlaps = (a, b) => { if (!a.size || !b.size) return false; let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.min(a.size, b.size) > 0.5; };
const SKIP = /^(np-energetics|diamond-method|framework-diamonds|lecture-numbers-1-9-diamonds|lecture-diamond-unpacked|lecture-name-cleanse|main-combo-guide|combos-number-notes|nlm-charts-only-combos|guide-|number-notes|numbers-1-99-website|numbers-1-9-chart)/;

// Which chart a source is written for: a source written for another chart never counts there; the name chart's
// books on a psyche or sub-chart spot are marked (the course builds those charts like the name chart: owner's call).
const GROUP = [[/^(name-chart-|name-numeroscope|name-templates|lecture-name-chart|lecture-rules-for-pure)/, 'name'], [/^vocation-/, 'vocation'], [/^personality-/, 'personality'],
  [/^(subvibrations|subnumeroscope|sub-charts)/, 'sub'], [/^(psyche-|nlm-.*psyche|psychic-)/, 'psyche'], [/^(essence-|higher-self-|nlm-dharma|nlm-dvlp|framework-dharma)/, 'essence']];
const groupOf = (slug) => (GROUP.find(([r]) => r.test(slug)) || [null, null])[1];
function relation(chart, slug) {
  const g = groupOf(slug);
  if (!g) return 'general';
  const mine = chart === 'outer' || chart === 'inner' ? 'psyche' : chart;
  if (g === mine || (g === 'sub' && (chart === 'vocation' || chart === 'personality'))) return 'own';
  if (g === 'name' && chart !== 'essence') return 'name';
  return null;
}
// sections[chart.key][source] = Map(number -> heading)
const charts = ['essence', 'name', 'vocation', 'personality', 'outer', 'inner'];
const spots = POSITIONS.filter((p) => !p.hidden && p.key !== 'letters' && p.key !== 'anyName');
const sections = new Map();
for (const c of k.chunks) {
  if (!c.heading || BUSINESS.test(c.source) || SKIP.test(c.source)) continue;
  const tail = c.heading.split(' > ').slice(-2).join(' > ');
  const nums = headNumbers(c.heading);
  if (!nums.length) continue;
  for (const p of spots) {
    if (!fits(p.chart, p.key, tail) || !relation(p.chart, c.source)) continue;
    const id = `${p.chart}.${p.key}`;
    if (!sections.has(id)) sections.set(id, new Map());
    const bySource = sections.get(id);
    if (!bySource.has(c.source)) bySource.set(c.source, new Map());
    for (const n of nums) if (!bySource.get(c.source).has(n)) bySource.get(c.source).set(n, { head: c.heading.split(' > ').pop(), sh: words6(c.text) });
  }
}

const out = [];
for (const p of spots) {
  const id = `${p.chart}.${p.key}`;
  const shownBy = new Map(); // number -> Set of sources shown
  const shownText = new Map(); // number -> word runs of every passage shown
  let withWords = 0, withPoints = 0;
  for (let n = 1; n <= 99; n++) {
    const m = meaningFor({ chart: p.chart, position: p.key, sum: n });
    if (!m) continue;
    const srcs = new Set([...m.passages, ...(m.nameChart ? m.nameChart.passages : [])].map((x) => x.source));
    if (srcs.size) withWords++;
    if (m.bits) withPoints++;
    shownBy.set(n, srcs);
    shownText.set(n, [...m.passages, ...(m.nameChart ? m.nameChart.passages : [])].map((x) => words6(x.text)));
  }
  const sources = [...(sections.get(id) || new Map())].map(([source, nums]) => {
    const covered = [...nums.keys()].sort((a, b) => a - b);
    const missing = covered.filter((n) => !(shownBy.get(n) || new Set()).has(source) && !(shownText.get(n) || []).some((sh) => overlaps(sh, nums.get(n).sh)));
    return { source, from: relation(p.chart, source), covered: covered.length, shown: covered.length - missing.length, missing, sample: nums.get(covered[0]).head };
  }).filter((s) => s.covered >= 2).sort((a, b) => b.covered - a.covered);
  const sub = p.chart === 'vocation' || p.chart === 'personality' ? [...Array(99).keys()].filter((i) => wordsFor(p.chart, p.key, i + 1).length).length : null;
  out.push({ spot: id, chart: p.chart, label: shortLabel(p.chart, p.key), numbersWithWords: withWords, numbersWithPoints: withPoints, subchartBookNumbers: sub, sources });
}
const file = process.argv[2];
if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
for (const r of out) {
  const holes = r.sources.filter((s) => s.missing.length);
  console.log(`${r.spot.padEnd(28)} words ${String(r.numbersWithWords).padStart(2)}  points ${String(r.numbersWithPoints).padStart(2)}  ${r.sources.map((s) => `${s.source} ${s.shown}/${s.covered}`).join('; ') || '-'}`);
  for (const s of holes) console.log(`    not shown from ${s.source} [${s.from}]: ${s.missing.join(', ')}  (e.g. "${s.sample}")`);
}
