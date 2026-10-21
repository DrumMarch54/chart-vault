// Archetype lines (owner's ask 2026-10-21): words on the combination of two or three numbers, the way the
// course weaves them ("enthusiastic (19/1) magnetism (15/6)", "CEO of the occult", "principled magician";
// interpretation.md "Narrative weaving", knowledge/raw/nlm-narrative-weaving.md). The owner's own example:
// first name 24/6 with mind center main vibration 12/3 = a "wholesome expander"; in the shadow, the victim
// (12/3) of the family (24/6).
//
// The rule: the FIRST number gives the adjective, the SECOND the noun; a third number (the higher self's dharma
// diamond) is the crown over both. Every number's words are in archetype-words.js (the owner corrects them
// there). A line comes in a bright and a shadow form, each with a few wordings, so the same pair can be said
// more than one way; the wordings rotate through the word lists.
//
//   linesFor(db, imageId) -> [{ key, title, why, parts: [...], bright: [...], shadow: [...] }]  the chart's lines
//   phrasesFor(numbers)   -> { parts, bright, shadow }  for numbers typed into the Archetype Words tool
import { WORDS } from './archetype-words.js';
import { positionLabel, chartLabel } from './positions.js';

const ds = (n) => { let x = Math.abs(Math.round(n)); while (x > 9) x = String(x).split('').reduce((a, c) => a + Number(c), 0); return x; };
export const fmt = (sum) => (sum < 10 ? String(sum) : `${sum}/${ds(sum)}`);
// A number's words: its own entry for 1-99; a number past 99 (a big life expression like 104/5) reads as its digit sum.
export const wordsFor = (sum) => WORDS[sum] || WORDS[ds(sum)] || null;

// The lines drawn on every chart: which positions, and who gives the adjective and the noun (the first part
// the adjective, the second the noun, `crown` the third number). `why` says it on the screen, in a few words.
export const LINES = [
  { key: 'higher', title: 'Higher Self', parts: [['essence', 'day'], ['essence', 'littleLp']], crown: ['essence', 'dharmaDiamond'],
    why: 'Who you are (the day) colors the road you walk (the life path); the dharma diamond is the crown over both.' },
  { key: 'core', title: 'Core and Reality', parts: [['essence', 'day'], ['name', 'le']],
    why: 'At the core, the day; what daily life keeps attracting, the life expression.' },
  { key: 'name', title: 'Name Chart', parts: [['name', 'first'], ['name', 'heart']],
    why: 'How you come across (the first name) colors how you think (the mind center main vibration).' },
  { key: 'centers', title: 'Mind and Emotion', parts: [['name', 'heart'], ['name', 'solar']],
    why: 'The way of thinking (mind center) colors the way of feeling (emotion center).' },
  { key: 'le', title: 'Life Expression and Pillar', parts: [['name', 'le'], ['name', 'pillar']],
    why: 'What life expresses through you, standing on the pillar underneath.' },
  { key: 'outer', title: 'Outer Psyche', parts: [['outer', 'heart'], ['outer', 'leDiamond']],
    why: 'The outer mental strategies color the outer psyche life expression diamond.' },
  { key: 'inner', title: 'Inner Psyche', parts: [['inner', 'heart'], ['inner', 'leDiamond']],
    why: 'The inner mental strategies color the inner psyche life expression diamond.' },
];

const pick = (list, i) => list[i % list.length];
const an = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const uniq = (list) => [...new Set(list)];

// The wordings for two parts (and a crown): bright ones from adj + noun, shadow ones from shadowAdj + shadowNoun.
// Three bright wordings walk down the word lists together (first words, second words, third words), then one
// the other way round (the second number's adjective on the first number's noun). Shadow: two, then the reverse.
function weave(a, b, crown = null) {
  const A = wordsFor(a.sum), B = wordsFor(b.sum), C = crown ? wordsFor(crown.sum) : null;
  if (!A || !B) return { bright: [], shadow: [] };
  const tail = (shadow, i) => (C ? ` with ${an(pick(shadow ? C.shadowAdj : C.adj, i))} ${pick(shadow ? C.shadowAdj : C.adj, i)} crown` : '');
  const bright = uniq([0, 1, 2].map((i) => `${pick(A.adj, i)} ${pick(B.noun, i)}${tail(false, i)}`).concat(`${pick(B.adj, 0)} ${pick(A.noun, 0)}${tail(false, 0)}`));
  const shadow = uniq([0, 1].map((i) => `${pick(A.shadowAdj, i)} ${pick(B.shadowNoun, i)}${tail(true, i)}`).concat(`${pick(B.shadowAdj, 0)} ${pick(A.shadowNoun, 0)}${tail(true, 0)}`));
  return { bright, shadow };
}

const part = (r, role) => { const w = wordsFor(r.sum); return { chart: r.chart, position: r.position, label: positionLabel(r.chart, r.position), chartLabel: chartLabel(r.chart), sum: r.sum, ds: r.ds, text: fmt(r.sum), title: w ? w.title : null, role }; };

// The chart's lines from its stored numbers (chart_values, the first value of each position).
export function linesFor(db, imageId) {
  const rows = db.prepare('SELECT chart, position, sum, ds FROM chart_values WHERE image_id = ? AND n = 0 AND sum > 0').all(imageId);
  if (!rows.length) return { missing: true, lines: [] };
  const at = (chart, position) => rows.find((r) => r.chart === chart && r.position === position) || null;
  const lines = [];
  for (const L of LINES) {
    const a = at(...L.parts[0]), b = at(...L.parts[1]), c = L.crown ? at(...L.crown) : null;
    if (!a || !b) continue;
    const { bright, shadow } = weave(a, b, c);
    if (!bright.length) continue;
    lines.push({ key: L.key, title: L.title, why: L.why, parts: [part(a, 'adjective'), part(b, 'noun'), ...(c ? [part(c, 'crown')] : [])], bright, shadow });
  }
  return { missing: false, lines };
}

// Numbers typed into the tool, in order: the first gives the adjective, the second the noun, a third the crown.
// Each number may carry a position ("name.first") for its label; the words do not depend on it.
export function phrasesFor(numbers) {
  const parts = numbers.slice(0, 3).map((n, i) => {
    const w = wordsFor(n.sum);
    const [chart, position] = (n.pos || '').split('.');
    return { sum: n.sum, ds: ds(n.sum), text: fmt(n.sum), title: w ? w.title : null, alt: w ? w.alt : null, words: w, role: ['adjective', 'noun', 'crown'][i],
      label: chart && position && position !== '*' ? positionLabel(chart, position) : null, chartLabel: chart && chart !== '*' ? chartLabel(chart) : null };
  });
  if (parts.length < 2) return { parts, bright: [], shadow: [] };
  const { bright, shadow } = weave(parts[0], parts[1], parts[2] || null);
  return { parts, bright, shadow };
}
