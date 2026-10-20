// tables.json + rules.json (from fetch.mjs) -> public/number-colors.js. The app asks for a slot ('heart',
// 'c.big', 'v.middle', ...), a number ('12/3') and how many words the name has; the answer is a color class.
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const tables = JSON.parse(fs.readFileSync(path.join(here, 'tables.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(here, 'rules.json'), 'utf8'));

// Class per color: the tool mixes gray (127) toward pure green or pure red by a share t; the class says which.
const classOf = (rgba) => {
  const m = /rgba\((\d+),(\d+),(\d+)/.exec(rgba); if (!m) return 'gray';
  const [r, g] = [Number(m[1]), Number(m[2])];
  if (r === g) return 'gray';
  if (g > r) return 'g' + Math.round((127 - r) / 127 * 10) * 10;
  return 'r' + Math.round((r - 127) / 128 * 10) * 10;
};
const palette = {};
for (const a of Object.values(tables)) for (const c of a.slice(1)) { const k = classOf(c); const m = /rgba\((\d+),(\d+),(\d+)/.exec(c); if (m) palette[k] = `rgb(${m[1]}, ${m[2]}, ${m[3]})`; }
const short = (name) => name.replace(/^color/, '').replace(/Array/, '');
const T = {}; for (const [name, a] of Object.entries(tables)) T[short(name)] = a.slice(1).map(classOf);

// The app's slots -> the tool's element ids. Prefix '' = name chart, 'c.' = consonants (USK), 'v.' = vowels (USV).
const IDS = { first: 'firstNameNum', middle: ['middleNameNum1', 'middleNameNum2', 'middleNameNum3'], last: 'surNameNum', le: 'lifeExpression', big: 'BIGlifeExpressionInner',
  ul: 'topleftaura', ur: 'toprightaura', heart: 'heart', heartExtra: ['heartchild1', 'heartchild2', 'heartchild3'], ll: 'bottomleftaura', lr: 'bottomrightaura',
  solar: 'hara', solarExtra: ['harachild1', 'harachild2', 'harachild3'], spine: 'spine', pillar: 'pillar' };
const SUB_IDS = { ...IDS, big: 'storpersonlighed' };
const RULES = {};
for (const [words, map] of Object.entries(rules)) {
  const r = {};
  for (const [pre, ids] of [['', IDS], ['c.', SUB_IDS], ['v.', SUB_IDS]]) {
    const idp = pre === 'c.' ? 'USK' : pre === 'v.' ? 'USV' : '';
    for (const [slot, id] of Object.entries(ids)) {
      const list = Array.isArray(id) ? id : [id];
      const found = list.map((i) => map[idp + i]).filter((t) => t && t !== 'PLAIN');
      if (found.length) r[pre + slot] = short(found[0]);
    }
  }
  RULES[words] = r;
}
const out = `/* Number colors exactly as the paid Quick Numeroscope tool colors them, read off the tool's own page script
   (tools/color-study/paid: fetch.mjs reads the live tool, gen.mjs writes this file; do not edit by hand).
   TABLES: one table per kind of position, index = the number (1..99), value = a color class. RULES: per number
   of words in the name, which table each position uses (the tool switches tables with the word count).
   PALETTE: the tool's colors; gray = neutral, gNN = NN % toward green, rNN = NN % toward red. The big life
   expression is drawn at a third of its strength (n-big). Fixed: day numbers and the essence chart dark,
   psyche charts blue, letter count blue. Numbers of 100 and more have no table entry and draw dark. */
(function (root) {
  'use strict';
  const PALETTE = ${JSON.stringify(palette)};
  const TABLES = {
${Object.entries(T).map(([k, a]) => `    ${JSON.stringify(k)}: ${JSON.stringify(a)},`).join('\n')}
  };
  const RULES = ${JSON.stringify(RULES, null, 2).replace(/\n/g, '\n  ')};
  const FIXED = { day: 'dark', 'c.day': 'dark', 'v.day': 'dark', letters: 'blue', 'pi.pillar': 'dark' };
  const extraOf = { heartExtra: 'heart', solarExtra: 'solar' };
  // words = how many words the typed name has (the tool's rules change with it); 1 falls back to 2 where its own
  // block sets nothing, more than 5 uses the 5-word rules.
  function tableFor(slot, words) {
    const w = Math.min(Math.max(Number(words) || 2, 1), 5);
    const bare = slot.replace(/^(c|v)\\./, ''), pre = slot.slice(0, slot.length - bare.length);
    const pick = (ww) => RULES[ww][slot] || (extraOf[bare] ? RULES[ww][pre + extraOf[bare]] : null);
    return pick(w) || (w === 1 ? pick(2) : null);
  }
  function lookup(slot, text, words) {
    if (slot in FIXED) return FIXED[slot];
    if (slot.startsWith('e.')) return 'dark';
    if (slot.startsWith('pi.') || slot.startsWith('po.')) return 'blue';
    const n = parseInt(String(text), 10);
    const table = tableFor(slot, words);
    const cls = !table || !(n >= 1) ? 'gray' : n >= TABLES[table].length + 1 ? 'dark' : TABLES[table][n - 1];
    return slot === 'big' ? cls + ' n-big' : cls;
  }
  const css = Object.entries(PALETTE).map(([k, v]) => \`.nscope .n-\${k} { fill: \${v}; } .pyr .n-\${k} { color: \${v}; }\`).join('\\n') + '\\n.nscope .n-big, .pyr .n-big { opacity: .33; }';
  if (typeof document !== 'undefined' && document.head) { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }
  root.NumberColors = { PALETTE, TABLES, RULES, lookup, tableFor, css };
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
fs.writeFileSync(path.join(here, '..', '..', '..', 'public', 'number-colors.js'), out);
console.log('palette', Object.keys(palette).sort().join(' '));
console.log('rules', Object.entries(RULES).map(([w, r]) => `${w} words: ${Object.keys(r).length} slots`).join('; '));
console.log('wrote public/number-colors.js');
