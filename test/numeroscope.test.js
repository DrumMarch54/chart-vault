// The quick chart's math, checked against screenshots of the paid tool
// ("Test test" with no date, then with day 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/numeroscope.js', import.meta.url), 'utf8'), ctx);
const N = ctx.Numeroscope;
const t = (v) => (v ? v.text : null);

test('digit sums and notation', () => {
  assert.equal(N.digitSum(19), 1); assert.equal(N.digitSum(22), 4); assert.equal(N.digitSum(88), 7);
  assert.equal(t(N.val(88)), '88/7'); assert.equal(t(N.val(16)), '16/7');
  assert.equal(t(N.add(N.val(23), N.val(60))), '11/2');
  assert.equal(t(N.joined(N.val(1), N.val(12))), '13/4');
  assert.equal(N.val(0), null);
});

test('Chaldean letters: Test = 16/7, 9 never a letter', () => {
  assert.equal(t(N.nameWord('Test').value), '16/7');
  assert.ok(!Object.values(N.LETTERS).includes(9));
  assert.equal(N.nameWord("O'Neil-x").text, "O'Neil-x"); assert.equal(N.nameWord("O'Neil-x").letters.length, 6);
});

test('"Test test" with no date (screenshot 1)', () => {
  const r = N.numeroscope({ name: 'Test test' });
  const n = r.name;
  assert.equal(JSON.stringify(n.words.map((w) => [w.text, w.value.text])), JSON.stringify([['Test', '16/7'], ['test', '16/7']]));
  assert.equal(t(n.le), '14/5'); assert.equal(t(n.big), '32/5');
  assert.equal(t(n.lowerLeft), '12/3'); assert.equal(t(n.lowerRight), '12/3'); assert.equal(t(n.solar), '6/6');
  assert.equal(n.upperLeft, null); assert.equal(n.heart, null); assert.equal(n.pillar, null); assert.equal(n.spine, null);
  assert.equal(n.letters, 8);
  const c = r.consonants;
  assert.equal(JSON.stringify(c.words.map((w) => [w.text, w.value.text])), JSON.stringify([['Tst', '11/2'], ['tst', '11/2']]));
  assert.equal(t(c.le), '4/4'); assert.equal(t(c.big), '22/4'); assert.equal(t(c.lowerLeft), '6/6'); assert.equal(t(c.solar), '12/3');
  const v = r.vowels;
  assert.equal(JSON.stringify(v.words.map((w) => [w.text, w.value.text])), JSON.stringify([['e', '5/5'], ['e', '5/5']]));
  assert.equal(t(v.le), '10/1'); assert.equal(t(v.big), '10/1'); assert.equal(t(v.lowerLeft), '6/6'); assert.equal(t(v.solar), '12/3');
  assert.equal(r.birth.day, null);
});

test('"Test test" born on the 1st (screenshot 2)', () => {
  const r = N.numeroscope({ day: '1', name: 'Test test' });
  assert.equal(t(r.birth.day), '1/1');
  const n = r.name;
  assert.equal(t(n.upperLeft), '8/8'); assert.equal(t(n.upperRight), '8/8'); assert.equal(t(n.heart), '16/7'); assert.equal(t(n.pillar), '19/1');
  assert.equal(t(n.spineDiamond), '15/6'); assert.equal(t(n.spine), '6/6'); assert.equal(t(N.numeroscope({ day: 6, name: 'Kevin Darnell Hart' }).name.spine), '15/6');
  const c = r.consonants;
  assert.equal(t(c.upperLeft), '3/3'); assert.equal(t(c.heart), '6/6'); assert.equal(t(c.pillar), '14/5');
  const v = r.vowels;
  assert.equal(t(v.upperLeft), '6/6'); assert.equal(t(v.heart), '12/3'); assert.equal(t(v.pillar), '8/8');
});

test('empty and partial input never throws', () => {
  for (const input of [{}, { name: '' }, { name: '   ' }, { day: '40' }, { day: '1', month: '13', year: '20' }, { name: '---' }, { name: 'A' }]) {
    const r = N.numeroscope(input);
    assert.ok(r.name && r.consonants && r.vowels);
  }
  const one = N.numeroscope({ name: 'Anna' }).name;
  assert.equal(one.first.text, 'Anna'); assert.equal(one.last, null);
});

test('birth date numbers (course notes)', () => {
  const b = N.birth(19, 12, 1984);
  assert.equal(t(b.day), '19/1'); assert.equal(t(b.month), '12/3'); assert.equal(t(b.year), '22/4');
  assert.equal(t(b.littleLp), '8/8'); assert.equal(t(b.bigLp), '35/8');
  assert.equal(t(b.outerDiamond), '13/4'); assert.equal(t(b.innerDiamond), '14/5'); assert.equal(t(b.dharmaDiamond), '34/7');
  assert.equal(t(b.nexus), '18/9'); assert.equal(t(b.target), '17/8');
  assert.equal(JSON.stringify(b.rhythm.map((p) => p.years)), JSON.stringify([4, 8, 7, 5, 1, 2]));
  assert.equal(JSON.stringify(N.rhythm(9).map((p) => p.years)), JSON.stringify([9, 9, 9]));
  assert.equal(JSON.stringify(N.rhythm(6).map((p) => p.years)), JSON.stringify([6, 3, 6, 3, 6, 3]));
  assert.equal(N.rhythm(8)[0].planet, 'Saturn');
});

// The class manual's worked example: Katrine Ditte Pilmark, born 19 August 1984.
test('Katrine Ditte Pilmark (class manual, middle name)', () => {
  const r = N.numeroscope({ day: 19, month: 8, year: 1984, name: 'Katrine Ditte Pilmark' });
  const n = r.name;
  assert.equal(JSON.stringify(n.words.map((w) => w.value.text)), JSON.stringify(['20/2', '18/9', '21/3']));
  assert.equal(t(n.le), '14/5');
  assert.equal(t(n.upperLeft), '3/3'); assert.equal(t(n.upperRight), '4/4');
  assert.equal(t(n.lowerLeft), '7/7'); assert.equal(t(n.lowerRight), '8/8');
  assert.equal(t(n.heart), '7/7'); assert.equal(t(n.heartExtra[0]), '16/7');
  assert.equal(t(n.solar), '15/6'); assert.equal(t(n.solarExtra[0]), '15/6');
  // sub diamonds: a center's main digit sum beside the middle name's digit sum (owner 2026-10-20)
  assert.equal(t(n.heartSubDiamond[0]), '79/7'); assert.equal(t(n.solarSubDiamond[0]), '69/6');
  assert.equal(N.numeroscope({ day: 19, month: 8, year: 1984, name: 'Katrine Pilmark' }).name.heartSubDiamond.length, 0);
  assert.equal(t(n.spine), '6/6'); assert.equal(t(n.pillar), '41/5');
  assert.equal(n.middle.length, 1); assert.equal(n.middle[0].text, 'Ditte');
  // The name line diamond (first beside last) only exists for a first + last name: a middle name sits between them.
  assert.equal(n.leDiamond, null);
  assert.equal(t(N.numeroscope({ day: 19, month: 8, year: 1984, name: 'Katrine Pilmark' }).name.leDiamond), '23/5');
  const e = r.essence;
  assert.equal(t(e.day), '19/1'); assert.equal(t(e.month), '8/8'); assert.equal(t(e.year), '22/4');
  assert.equal(t(e.littleLp), '13/4'); assert.equal(t(e.bigLp), '40/4');
  assert.equal(t(e.outerAura), '9/9'); assert.equal(t(e.outerDiamond), '18/9');
  assert.equal(t(e.innerAura), '5/5'); assert.equal(t(e.innerDiamond), '14/5');
  assert.equal(t(e.topAura), '12/3'); assert.equal(t(e.dharmaDiamond), '84/3');
  assert.equal(t(e.nexus), '14/5'); assert.equal(t(e.target), '13/4');
  assert.equal(e.target.ds, e.littleLp.ds); assert.equal(e.bigLp.ds, e.littleLp.ds);
  // Psyche: inner line month 8/8 and year 22/4, LE 12/3; outer line 18/9 (outer aura 9 + 9) and year.
  const p = r.psyche;
  assert.equal(t(p.inner.le), '12/3'); assert.equal(t(p.inner.upperLeft), '9/9'); assert.equal(t(p.inner.upperRight), '5/5');
  assert.equal(t(p.challenge), '18/9'); assert.equal(t(p.outer.first.value), '18/9');
  assert.equal(p.outer.le.ds, e.littleLp.ds);
  assert.equal(t(p.outer.pillar), t(N.val(1 + p.outer.heart.ds + p.outer.solar.ds + p.outer.le.ds)));
});

test('Albert Einstein big and little personality / heart\'s desire (Module 10)', () => {
  const r = N.numeroscope({ name: 'Albert Einstein' });
  assert.equal(t(r.consonants.big), '28/1'); assert.equal(t(r.consonants.le), '10/1');
  assert.equal(t(r.vowels.big), '18/9'); assert.equal(t(r.vowels.le), '9/9');
});

test('1949 year vibration is 23/5; month 12 is 12/3; a year typed as 2 digits is ignored', () => {
  const e = N.essence(1, 12, 1949);
  assert.equal(t(e.year), '23/5'); assert.equal(t(e.month), '12/3');
  assert.equal(N.essence(1, 1, 49).year, null);
});

// The owner's own numbers (Drive doc "Peoples Numbers"): born 19 May 1998.
test('Peter (Peoples Numbers): essence, inner and outer psyche', () => {
  const r = N.numeroscope({ day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' });
  const e = r.essence;
  assert.equal(t(e.day), '19/1'); assert.equal(t(e.month), '5/5'); assert.equal(t(e.year), '27/9');
  assert.equal(t(e.littleLp), '15/6'); assert.equal(t(e.bigLp), '42/6');
  assert.equal(t(e.outerDiamond), '15/6'); assert.equal(t(e.innerDiamond), '19/1'); assert.equal(t(e.dharmaDiamond), '59/5');
  assert.equal(t(e.nexus), '16/7'); assert.equal(t(e.target), '15/6');
  const p = r.psyche;
  assert.equal(t(p.inner.leDiamond), '59/5'); assert.equal(t(p.inner.mindDiamond), '61/7'); assert.equal(t(p.inner.pillar), '19/1');
  assert.equal(t(p.outer.leDiamond), '69/6'); assert.equal(t(p.outer.mindDiamond), '71/8'); assert.equal(t(p.outer.pillar), '24/6');
  assert.equal(t(N.joined(p.outer.mindDiamond, p.inner.mindDiamond)), '87/6');
  assert.equal(t(N.joined(p.outer.emotionDiamond, p.inner.emotionDiamond)), '96/6');
  assert.equal(t(N.joined(p.outer.pillar, p.inner.pillar)), '61/7');
  assert.equal(JSON.stringify(r.name.words.map((w) => w.value.text)), JSON.stringify(['24/6', '23/5', '22/4']));
  assert.equal(t(r.name.le), '15/6');
});

// A vault screenshot of the paid tool: Kevin Darnell Hart, 6 July 1979 (image #639).
test('Kevin Darnell Hart (vault screenshot): whole 5-chart set', () => {
  const r = N.numeroscope({ day: 6, month: 7, year: 1979, name: 'Kevin Darnell Hart' });
  const e = r.essence, n = r.name, c = r.consonants, v = r.vowels, p = r.psyche;
  assert.equal(t(e.topAura), '15/6'); assert.equal(t(e.littleLp), '21/3'); assert.equal(t(e.bigLp), '39/3');
  assert.equal(t(e.outerAura), '13/4'); assert.equal(t(e.innerAura), '14/5');
  assert.equal(JSON.stringify(n.words.map((w) => w.value.text)), JSON.stringify(['19/1', '23/5', '12/3']));
  assert.equal(t(n.heart), '16/7'); assert.equal(t(n.heartExtra[0]), '12/3'); assert.equal(t(n.spine), '15/6');
  assert.equal(t(n.upperLeft), '7/7'); assert.equal(t(n.upperRight), '9/9');
  assert.equal(t(n.lowerLeft), '10/1'); assert.equal(t(n.lowerRight), '12/3');
  assert.equal(t(n.solar), '4/4'); assert.equal(t(n.solarExtra[0]), '9/9');
  assert.equal(t(n.big), '54/9'); assert.equal(t(n.le), '9/9'); assert.equal(t(n.pillar), '43/7'); assert.equal(n.letters, 16);
  assert.equal(JSON.stringify(c.words.map((w) => w.text + ' ' + w.value.text)), JSON.stringify(['Kvn 13/4', 'Drnll 17/8', 'Hrt 11/2']));
  assert.equal(t(c.heart), '9/9'); assert.equal(t(c.heartExtra[0]), '17/8'); assert.equal(t(c.solar), '16/7'); assert.equal(t(c.solarExtra[0]), '15/6');
  assert.equal(t(c.big), '41/5'); assert.equal(t(c.le), '14/5'); assert.equal(t(c.pillar), '49/4');
  assert.equal(JSON.stringify(v.words.map((w) => w.text + ' ' + w.value.text)), JSON.stringify(['ei 6/6', 'ae 6/6', 'a 1/1']));
  assert.equal(t(v.heart), '10/1'); assert.equal(t(v.heartExtra[0]), '7/7'); assert.equal(t(v.solar), '6/6'); assert.equal(t(v.solarExtra[0]), '12/3');
  assert.equal(t(v.big), '13/4'); assert.equal(t(v.le), '13/4'); assert.equal(t(v.pillar), '33/6');
  // Outer psyche (left blue): 13/4 and 26/8 on the line, LE 12/3, pillar 24/6. Inner (right): 7/7 and 26/8, LE 15/6, pillar 30/3.
  assert.equal(t(p.outer.first.value), '13/4'); assert.equal(t(p.outer.le), '12/3'); assert.equal(t(p.outer.upperLeft), '10/1'); assert.equal(t(p.outer.upperRight), '14/5');
  assert.equal(t(p.outer.heart), '6/6'); assert.equal(t(p.outer.lowerLeft), '7/7'); assert.equal(t(p.outer.lowerRight), '11/2'); assert.equal(t(p.outer.solar), '9/9'); assert.equal(t(p.outer.pillar), '24/6');
  assert.equal(t(p.inner.le), '15/6'); assert.equal(t(p.inner.heart), '9/9'); assert.equal(t(p.inner.solar), '9/9'); assert.equal(t(p.inner.pillar), '30/3');
});

test('number colors: the paid tool\'s own tables and word-count rules, fixed positions, fallbacks', () => {
  const c = {};
  vm.runInNewContext(fs.readFileSync(new URL('../public/number-colors.js', import.meta.url), 'utf8'), c);
  const C = c.NumberColors;
  // Jon Eugene Minadeo II, 15.12.1982 (four words): every value read off the live tool's page on 2026-10-19.
  const L = (slot, n, w) => C.lookup(slot, n, w);
  assert.equal(L('first', '13/4', 4), 'g20'); assert.equal(L('middle', '29/2', 4), 'r40'); assert.equal(L('middle', '27/9', 4), 'g60'); assert.equal(L('last', '17/8', 4), 'g40');
  assert.equal(L('heart', '6/6', 4), 'g60'); assert.equal(L('heartExtra', '8/8', 4), 'r10'); assert.equal(L('heartExtra', '15/6', 4), 'g60'); assert.equal(L('spine', '11/2', 4), 'r20');
  assert.equal(L('le', '23/5', 4), 'g100'); assert.equal(L('big', '86/5', 4), 'gray n-big'); assert.equal(L('pillar', '56/2', 4), 'gray');
  assert.equal(L('ul', '10/1', 4), 'g20'); assert.equal(L('ur', '14/5', 4), 'g60'); assert.equal(L('ll', '9/9', 4), 'gray');
  assert.equal(L('c.heart', '9/9', 4), 'gray'); assert.equal(L('c.solar', '15/6', 4), 'g20'); assert.equal(L('c.big', '27/9', 4), 'g60'); assert.equal(L('c.pillar', '60/6', 4), 'g20');
  assert.equal(L('v.heart', '12/3', 4), 'gray'); assert.equal(L('v.heartExtra', '8/8', 4), 'r10'); assert.equal(L('v.big', '44/8', 4), 'r80'); assert.equal(L('v.pillar', '50/5', 4), 'g80');
  assert.equal(L('v.solar', '7/7', 4), 'g40'); assert.equal(L('v.ll', '15/6', 4), 'g60'); assert.equal(L('v.lr', '10/1', 4), 'g40');
  // The tool switches tables with the number of words: a 12/3 mind center is red with one middle name, gray otherwise.
  assert.equal(L('heart', '12/3', 3), 'r60'); assert.equal(L('heart', '12/3', 2), 'gray'); assert.equal(L('heart', '12/3', 4), 'gray');
  // Handsome truth, 15.12.1982 (two words), against the owner's screenshot of the tool.
  assert.equal(L('heart', '13/4', 2), 'gray'); assert.equal(L('solar', '12/3', 2), 'gray'); assert.equal(L('le', '10/1', 2), 'g60'); assert.equal(L('v.heart', '4/4', 2), 'r20'); assert.equal(L('c.big', '36/9', 2), 'g60');
  // fixed positions and fallbacks
  assert.equal(L('day', '19/1', 2), 'dark'); assert.equal(L('e.month', '5/5', 2), 'dark'); assert.equal(L('po.pillar', '24/6', 2), 'blue'); assert.equal(L('pi.pillar', '30/3', 2), 'dark');
  assert.equal(L('first', '104/5', 2), 'dark'); assert.equal(L('first', '', 2), 'gray'); assert.equal(L('first', '24/6', 1), L('first', '24/6', 2)); assert.equal(L('heart', '6/6', 9), L('heart', '6/6', 5));
  const classes = new Set(Object.values(C.TABLES).flat());
  for (const k of classes) assert.match(k, /^(gray|g\d+|r\d+)$/);
  for (const k of classes) if (k !== 'gray') assert.ok(C.PALETTE[k], k);
  assert.equal(Object.keys(C.TABLES).length, 10);
  assert.match(C.css, /\.nscope \.n-g60 \{ fill: rgb\(51, 204, 51\); \}/);
});

test('layout: every text position is a finite number (a NaN here means a number silently never draws)', () => {
  const walk = (o, path) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v, path + k + '.'); else if (typeof v === 'number') assert.ok(Number.isFinite(v), path + k); } };
  walk(N.LAYOUT, 'LAYOUT.');
  for (const key of ['nameDxL', 'nameDxR']) assert.ok(key in N.LAYOUT.psy.text, 'psyche line x: ' + key);
  for (const side of ['left', 'right']) for (const key of ['cx', 'auraL', 'auraR', 'nameL', 'nameR', 'bigX']) assert.ok(Number.isFinite(N.LAYOUT.sub[side][key]), side + '.' + key);
});

test('a name with no vowels stays on the vowel line as 0/0 (Charles Christopher White Jr., vault screenshot)', () => {
  const r = N.numeroscope({ day: 2, month: 1, year: 1965, name: 'Charles Christopher White Jr.' });
  assert.equal(JSON.stringify(r.vowels.words.map((w) => [w.text, w.value.text])), JSON.stringify([['ae', '6/6'], ['ioe', '13/4'], ['ie', '6/6'], ['.', '0/0']]));
  assert.equal(t(r.vowels.le), '16/7'); assert.equal(t(r.vowels.upperRight), '2/2'); assert.equal(t(r.vowels.lowerRight), '7/7'); assert.equal(t(r.vowels.pillar), '48/3');
  assert.equal(JSON.stringify(r.consonants.words.map((w) => w.text)), JSON.stringify(['Chrls', 'Chrstphr', 'Wht', 'Jr.']));
  assert.equal(t(r.consonants.pillar), '38/2');
  // main chart: Jr (3) is augmented by the day: 3 + 2 = 5, under 10 so + 9 = 14/5
  assert.equal(JSON.stringify(r.name.words.map((w) => w.value.text)), JSON.stringify(['22/4', '45/9', '21/3', '14/5']));
  assert.equal(t(r.name.le), '21/3'); assert.equal(t(r.name.big), '102/3'); assert.equal(t(r.name.heart), '13/4');
  assert.equal(JSON.stringify(r.name.heartExtra.map(t)), JSON.stringify(['13/4', '7/7'])); assert.equal(t(r.name.solar), '15/6'); assert.equal(t(r.name.pillar), '53/8');
});

test('augmentation of one-digit names on the main chart (vault screenshots)', () => {
  const line = (inp) => N.numeroscope(inp).name.words.map((w) => w.value.text).join(' ');
  assert.equal(line({ day: 14, month: 10, year: 1981, name: 'Joseph Paul Borelli Jr' }), '29/2 18/9 23/5 17/8'); // 3 + 5 = 8 -> 17
  assert.equal(line({ day: 24, month: 8, year: 1961, name: 'Paul William Chek Sr' }), '18/9 19/1 15/6 11/2'); // 5 + 6 = 11, stays
  assert.equal(line({ day: 22, month: 1, year: 1990, name: 'Sir Robert Bryson Hall II' }), '10/1 22/4 20/2 12/3 15/6'); // Sir 6 + 4 = 10
  assert.equal(line({ day: 28, month: 10, year: 1955, name: 'William Henry Gates III' }), '19/1 18/9 16/7 13/4'); // 3 + 1 = 4 -> 13
  // No day: step 1 has nothing to add, step 2 still lifts a one-digit value by 9 (owner: "Sj should be 13/4")
  assert.equal(line({ name: 'Billy Camrick Carson II' }), '10/1 16/7 21/3 11/2');
  assert.equal(line({ name: 'Sj' }), '13/4');
  assert.equal(line({ day: 19, name: 'Sj' }), '14/5'); // 4 + 1 = 5, under 10 so + 9
  assert.equal(line({ day: 19, month: 5, name: 'Sj', augment: false }), '4/4'); // switched off: raw value
  assert.equal(line({ day: 2, month: 1, year: 1965, name: 'Charles Christopher White Jr.', augment: false }), '22/4 45/9 21/3 3/3');
  assert.equal(N.numeroscope({ day: 2, month: 1, year: 1965, name: 'Charles Christopher White Jr.', augment: false }).name.le.text, '19/1'); // raw 3 feeds LE
  assert.equal(N.numeroscope({ day: 2, month: 1, year: 1965, name: 'Charles Christopher White Jr.', augment: false }).psyche.outer.words[0].value.text, N.numeroscope({ day: 2, month: 1, year: 1965, name: 'Charles Christopher White Jr.' }).psyche.outer.words[0].value.text); // the psyche month keeps the course rule
  assert.equal(N.numeroscope({ day: 1, name: 'Test test' }).vowels.words.map((w) => w.value.text).join(' '), '5/5 5/5'); // sub-charts never augment
});

// Module 12: single name charts and number pyramids, checked against the owner's paid-tool screenshots
// (Peter Joshua Shicora, 19 May 1998: the popup for each name).
test('single name chart: every letter is a name (Shicora, Joshua, Peter, day 19)', () => {
  const s = N.singleName('Shicora', 19), n = s.name;
  assert.equal(s.letters, 7);
  assert.equal(JSON.stringify(n.words.map((w) => w.text + w.value.sum)), JSON.stringify(['S3', 'h5', 'i1', 'c3', 'o7', 'r2', 'a1']));
  assert.equal(t(n.upperLeft), '4/4'); assert.equal(t(n.upperRight), '2/2'); assert.equal(t(n.heart), '6/6');
  assert.equal(n.heartExtra.map((v) => v.sum).join(' '), '11 7 9 13 8');
  assert.equal(t(n.lowerLeft), '7/7'); assert.equal(t(n.lowerRight), '5/5'); assert.equal(t(n.solar), '12/3');
  assert.equal(n.solarExtra.map((v) => v.sum).join(' '), '8 4 6 10 5');
  assert.equal(t(n.le), '22/4'); assert.equal(t(n.pillar), '86/5');
  // vocation (vowels i o a) and personality (consonants S h c r)
  assert.equal(t(s.vowels.heart), '4/4'); assert.equal(s.vowels.heartExtra.map((v) => v.sum).join(' '), '11'); assert.equal(t(s.vowels.lowerLeft), '10/1'); assert.equal(t(s.vowels.solar), '2/2'); assert.equal(t(s.vowels.le), '9/9'); assert.equal(t(s.vowels.pillar), '34/7');
  assert.equal(t(s.consonants.heart), '7/7'); assert.equal(s.consonants.heartExtra.map((v) => v.sum).join(' '), '12 10'); assert.equal(t(s.consonants.solar), '13/4'); assert.equal(t(s.consonants.le), '13/4'); assert.equal(t(s.consonants.pillar), '44/8');
  const j = N.singleName('Joshua', 19);
  assert.equal(t(j.name.heart), '4/4'); assert.equal(j.name.heartExtra.map((v) => v.sum).join(' '), '11 7 9 10'); assert.equal(t(j.name.solar), '12/3'); assert.equal(t(j.name.le), '23/5'); assert.equal(t(j.name.pillar), '77/5');
  assert.equal(t(j.vowels.heart), '10/1'); assert.equal(t(j.vowels.le), '14/5'); assert.equal(t(j.consonants.heart), '8/8'); assert.equal(t(j.consonants.lowerRight), '14/5'); assert.equal(t(j.consonants.pillar), '38/2');
  const p = N.singleName('Peter', 19);
  assert.equal(t(p.name.upperLeft), '9/9'); assert.equal(t(p.name.heart), '12/3'); assert.equal(p.name.heartExtra.map((v) => v.sum).join(' '), '8 7 8'); assert.equal(t(p.name.lowerLeft), '14/5'); assert.equal(t(p.name.solar), '13/4'); assert.equal(t(p.name.le), '24/6'); assert.equal(t(p.name.pillar), '77/5');
  assert.equal(t(p.vowels.heart), '12/3'); assert.equal(t(p.vowels.pillar), '8/8'); assert.equal(t(p.consonants.solar), '11/2'); assert.equal(t(p.consonants.pillar), '28/1');
  // no day: nothing above the line
  const nd = N.singleName('Peter', null); assert.equal(nd.name.heart, null); assert.equal(t(nd.name.solar), '13/4'); assert.equal(nd.name.pillar, null);
  for (const w of ['', '-', 'A', 'Ab']) assert.ok(N.singleName(w, 19).weight);
});

test('number pyramid and its weight (book formula; Joshua 2.90625/21, Shicora 6.375/28, Peter 15/15)', () => {
  const rows = (w) => N.singleName(w, 19).pyramid.map((r) => r.map((v) => v.text).join(' '));
  assert.equal(JSON.stringify(rows('Peter')), JSON.stringify(['8/8 5/5 4/4 5/5 2/2', '13/4 9/9 9/9 7/7', '13/4 18/9 16/7', '13/4 16/7', '11/2']));
  assert.equal(rows('Shicora')[5], '6/6 4/4'); assert.equal(rows('Shicora')[6], '10/1');
  const W = (w) => N.singleName(w, 19).weight;
  const j = W('Joshua'); assert.equal(j.total, 2.90625); assert.equal(j.cells, 21); assert.equal(j.ratio.toFixed(3), '0.138'); assert.equal(j.approved, true);
  assert.equal(j.numbers.find((x) => x.value.sum === 11).weight, 0.65625); assert.equal(j.numbers.find((x) => x.value.sum === 18).weight, 2.25); assert.equal(j.numbers.find((x) => x.value.sum === 10).count, 5);
  const s = W('Shicora'); assert.equal(s.total, 6.375); assert.equal(s.cells, 28); assert.equal(s.numbers.find((x) => x.value.sum === 12).count, 3); assert.equal(s.penalty, 0);
  const p = W('Peter'); assert.equal(p.total, 15); assert.equal(p.cells, 15); assert.equal(p.ratio, 1); assert.equal(p.approved, false); assert.equal(p.penalty, 2.5);
  assert.equal(p.numbers.find((x) => x.value.sum === 16).weight, 5); assert.equal(p.numbers.find((x) => x.value.sum === 18).weight, 2);
  assert.equal(p.combos.find((x) => x.a.sum === 16 && x.b.sum === 18).weight, 3); assert.equal(p.combos.filter((x) => x.count).length, 1);
  // the book's ratio tables: 4 rows 1.375 / 1.75 / 2.5 / 4; 10 rows 1.0176 / 1.2813 (row 5) / 3.25 (row 8) / 10
  const ratio = (k, n) => 1 + (n - 1) * Math.pow(2, k - n);
  assert.deepEqual([1, 2, 3, 4].map((k) => ratio(k, 4)), [1.375, 1.75, 2.5, 4]);
  assert.equal(ratio(1, 10).toFixed(4), '1.0176'); assert.equal(ratio(5, 10), 1.28125); assert.equal(ratio(8, 10), 3.25); assert.equal(ratio(10, 10), 10);
});

test('one word shows only its value on the line, nothing else (paid tool, Muslim)', () => {
  const r = N.numeroscope({ name: 'Muslim' });
  assert.equal(r.name.first.text, 'Muslim'); assert.equal(t(r.name.first.value), '21/3'); assert.equal(r.name.last, null); assert.equal(r.name.letters, 6);
  assert.equal(r.consonants.first.text, 'Mslm'); assert.equal(t(r.consonants.first.value), '14/5'); assert.equal(r.vowels.first.text, 'ui'); assert.equal(t(r.vowels.first.value), '7/7');
  for (const c of [r.name, r.consonants, r.vowels]) for (const k of ['le', 'big', 'upperLeft', 'lowerLeft', 'heart', 'solar', 'pillar', 'spine']) assert.equal(c[k], null, k);
  const n = N.numeroscope({ day: 9, month: 10, year: 1958, name: 'Kim' }).name;
  assert.equal(n.first.text, 'Kim'); assert.equal(n.last, null); assert.equal(n.le, null); assert.equal(n.upperLeft, null);
  const two = N.numeroscope({ day: 9, name: 'Kim Lee' }).name; assert.equal(two.last.text, 'Lee'); assert.ok(two.heart && two.le);
});

// Forecasting (Module 17): destiny periods, year rows, day vibrations. Checked against the course's own
// worked cases: Robert Redford's formula sequence, JFK's 1963 and Nixon's 1972 year rows.
test('destiny periods and formulas follow the course examples (born 1936, 1937, 1938, 1940, 1944)', () => {
  const seq = (y, n) => N.destinyPeriods(y, n).map((p) => `${p.number}:${p.start}-${p.end}`).join(' ');
  assert.equal(seq(1936, 7), '1:1936-1936 2:1937-1938 4:1939-1942 8:1943-1950 7:1951-1957 5:1958-1962 1:1963-1963');
  assert.equal(seq(1938, 4), '3:1938-1940 6:1941-1946 3:1947-1949 6:1950-1955');
  assert.equal(seq(1940, 5), '5:1940-1944 1:1945-1945 2:1946-1947 4:1948-1951 8:1952-1959');
  assert.equal(seq(1944, 3), '9:1944-1952 9:1953-1961 9:1962-1970');
  const f = (b, y) => N.yearFormula(b, y).code;
  assert.equal([1936, 1937, 1938, 1939, 1940, 1942, 1943, 1950, 1951, 1962, 1963].map((y) => f(1936, y)).join(' '), 'F0 F1 F3 F1 F2 F3 F1 F3 F1 F3 F4');
  assert.equal([1937, 1938, 1939, 1963, 1964, 1965].map((y) => f(1937, y)).join(' '), 'F0 F3 F1 F4 F1 F3');
  assert.equal([1940, 1941, 1944, 1945, 1946, 1947].map((y) => f(1940, y)).join(' '), 'F0 F2 F3 F4 F1 F3');
  assert.equal(N.yearFormula(1936, 1945).previous.number, 4); assert.equal(N.yearFormula(1936, 1945).period.number, 8); assert.equal(N.yearFormula(1936, 1945).age, 9);
  assert.equal(N.destinyPeriods('', 3).length, 0); assert.equal(N.yearFormula(1990, 1980), null);
});

test('JFK 1963 (F2): vertical 5-1-6 = 51/6 and horizontal 6-11/2-5 = 65/2 around November 22', () => {
  const r = N.yearRows({ day: 29, month: 5, year: 1917, name: 'John Fitzgerald Kennedy' }, 1963);
  assert.equal(r.formula.code, 'F2'); assert.equal(r.formula.age, 46);
  const col = (k) => r.rows.map((x) => (x[k] ? x[k].text : '-')).join(' ');
  assert.equal(col('main'), '1/1 2/2 3/3 2/2 5/5 1/1 6/6');
  assert.equal(col('shadow'), '9/9 2/2 11/2 2/2 4/4 1/1 5/5');
  assert.equal(col('aura'), '10/1 4/4 5/5 4/4 9/9 2/2 11/2');
  assert.equal(r.rows[6].vertical.text, '51/6'); assert.equal(r.rows[4].vertical.text, '32/5');
  assert.equal(r.rows.map((x) => `${x.month}/${x.day}`).join(' '), '1/1 2/22 4/15 6/6 7/28 9/18 11/9');
  assert.equal(`${r.rows[0].until.month}/${r.rows[0].until.day}`, '2/21'); assert.equal(`${r.rows[6].until.month}/${r.rows[6].until.day}`, '12/31');
});

test('Nixon 1972 (F4): the seven vertical triples 19/1 17/8 85/4 41/5 51/6 67/4 45/9 on the course dates', () => {
  const r = N.yearRows({ day: 9, month: 1, year: 1913, name: 'Richard Milhous Nixon' }, 1972);
  assert.equal(r.formula.code, 'F4'); assert.equal(r.rows.length, 15);
  const sums = r.rows.filter((x) => x.source === 'sum');
  assert.equal(sums.map((x) => x.vertical.text).join(' '), '19/1 17/8 85/4 41/5 51/6 67/4 45/9');
  assert.equal(sums.map((x) => `${x.month}/${x.day}`).join(' '), '2/18 4/9 5/27 7/16 9/3 10/21 12/8');
  assert.equal(r.rows[5].label, 'Last period'); assert.equal(r.rows[5].main.text, '5/5');
  assert.equal(r.rows[7].label, 'This period'); assert.equal(r.rows[9].label, 'Leaving this period'); assert.equal(r.rows[9].main.text, '1/1');
});

test('year rows without a name leave the life expression and pillar rows blank; the birth year has age 0', () => {
  const r = N.yearRows({ day: 9, month: 1, year: 1913 }, 1972);
  assert.equal(r.hasName, false);
  assert.equal(r.rows[3].main, null); assert.equal(r.rows[4].main, null); assert.equal(r.rows[5].main.text, '5/5'); assert.equal(r.rows[6].main, null);
  const b = N.yearRows({ day: 1, month: 1, year: 2000, name: 'Test test' }, 2000);
  assert.equal(b.formula.code, 'F0'); assert.equal(b.rows[5].main.text, '0'); assert.equal(b.rows[6].main.text, b.rows[4].main.text);
  assert.equal(N.yearRows({ day: 1, month: 1, year: '' }, 2000), null);
});

test('day rows from the book page 136: date 27, day vibration 2, LE 7, month 1, year 8', () => {
  // The book's own table (shadow column 7 2 9/9 7 16/7 1 8/8 8 16/7). Built from the digit sums it shows.
  const r = N.dayRows({ day: 2, month: 1, year: 2000, name: 'Test test' }, 2033, 10, 27); // 2033 -> 8, Test test LE 14/5 is not 7, so check the rows that do not need LE
  assert.equal(r.rows.map((x) => x.main.text).slice(0, 3).join(' '), '9/9 2/2 11/2'); assert.equal(r.rows.map((x) => x.shadow.text).slice(0, 3).join(' '), '7/7 2/2 9/9');
  assert.equal(r.rows[0].aura.text, '16/7'); assert.equal(r.rows[7].shadow.text, '8/8'); assert.equal(r.rows[5].shadow.text, '1/1');
});

test('day vibrations: JFK on 22 Nov 1963; the shadow column starts from the last digit of the date', () => {
  const d = N.dayRows({ day: 29, month: 5, year: 1917, name: 'John Fitzgerald Kennedy' }, 1963, 11, 22);
  assert.equal(d.rows.map((x) => x.main.text).join(' '), '4/4 2/2 6/6 2/2 8/8 2/2 10/1 1/1 2/2');
  assert.equal(d.rows.map((x) => x.shadow.text).join(' '), '2/2 2/2 4/4 2/2 6/6 2/2 8/8 1/1 9/9'); // only the date row differs (book p.136)
  assert.equal(N.dayRows({ day: 3, month: 1, year: 1990 }, 2026, 10, 3).rows[0].shadow.text, '0');
});

test('psyche rows use the outer psyche chart: JFK 1961 (F3) and 1963 columns from the case book', () => {
  const col = (r, k) => r.rows.map((x) => (x.psyche[k] ? x.psyche[k].text : '-')).join(' ');
  const r61 = N.yearRows({ day: 29, month: 5, year: 1917, name: 'John Fitzgerald Kennedy' }, 1961);
  assert.equal(r61.formula.code, 'F3');
  assert.equal(r61.rows.slice(2, 5).map((x) => x.shadow.text).join(' '), '9/9 2/2 11/2'); // "shadow column 9-2-11/2"
  assert.equal(r61.rows.slice(2, 5).map((x) => x.psyche.shadow.text).join(' '), '9/9 7/7 16/7'); // "psyche column 9-7-16/7"
  assert.equal([r61.rows[2].psyche.main.text, r61.rows[2].psyche.aura.text, r61.rows[2].psyche.shadow.text].join(' '), '10/1 10/1 9/9'); // "horizontal psyche row 10/1-10/1-9"
  const r63 = N.yearRows({ day: 29, month: 5, year: 1917, name: 'John Fitzgerald Kennedy' }, 1963);
  assert.equal(col(r63, 'main'), '1/1 2/2 3/3 7/7 10/1 1/1 2/2'); // 1st psyche column 3-7-10/1
  assert.equal(col(r63, 'shadow'), '9/9 2/2 11/2 7/7 9/9 1/1 10/1'); // 3rd psyche column 11/2-7-9
  assert.equal([r63.rows[6].psyche.main.text, r63.rows[6].psyche.aura.text, r63.rows[6].psyche.shadow.text].join(' '), '2/2 3/3 10/1'); // psyche row 2-3-10/1 on Nov 22
});

test('day rows: Wimbledon 2017 final at 2 PM (case book): the 2 PM triple, the fulfillment numbers, the even hours', () => {
  const v = N.dayRows({ day: 17, month: 6, year: 1980, name: 'Venus Ebony Starr Williams' }, 2017, 7, 15);
  const g = N.dayRows({ day: 8, month: 10, year: 1993, name: 'Garbiñe Muguruza Blanco' }, 2017, 7, 15);
  const at = (r, i) => r.rows.slice(i, i + 3).map((x) => x.main.text).join(' ');
  assert.equal(at(v, 4), '12/3 7/7 10/1'); assert.equal(at(g, 4), '8/8 7/7 15/6');
  assert.equal(v.fulfillment.text, '12/3'); assert.equal(g.fulfillment.text, '8/8');
  assert.equal(v.rows.map((x) => x.from).join(','), '0,160,320,480,640,800,960,1120,1280'); assert.equal(v.rows[8].until, 1440);
  assert.ok(v.rows[5].from <= 14 * 60 && 14 * 60 < v.rows[5].until); // 2 PM sits in the middle row of that triple
  assert.ok(v.rows[0].psyche.main && v.rows[3].psyche.main);
  assert.equal(N.dayRows({ day: 1, month: 1, year: 2000 }, 2026, 1, 1).fulfillment, null);
});

// Whole name pyramid (owner 2026-10-17): every name run together with no spaces is one word, so the pyramid of
// "Katrine Ditte Pilmark" is the pyramid of "KatrineDittePilmark": spaces never count, letters only.
test('whole name pyramid: spaces do not count, the letter row is every letter of every name', () => {
  const whole = N.singleName('KatrineDittePilmark', 19), spaced = N.singleName('Katrine Ditte Pilmark', 19);
  assert.equal(whole.letters, 19);
  assert.deepEqual(whole.pyramid.map((r) => r.map((v) => v.sum)), spaced.pyramid.map((r) => r.map((v) => v.sum)));
  assert.equal(whole.pyramid.length, 19); assert.equal(whole.pyramid[0].length, 19); assert.equal(whole.pyramid[18].length, 1);
  assert.equal(whole.weight.ratio, spaced.weight.ratio);
  // its bottom row is the letters K A T R I N E D I T T E P I L M A R K with the course's letter values (T = 4, R = 2, P = 8)
  assert.deepEqual(Array.from(whole.pyramid[0], (v) => v.sum), [2, 1, 4, 2, 1, 5, 5, 4, 1, 4, 4, 5, 8, 1, 3, 4, 1, 2, 2]); // the course's letter values
});

// The price's chart: a number sequence on the central line (Six Themes book, "Numeroscopes on number sequences";
// Price Tool → Price Chart). Checked by hand against the single-name rules: digits as names, 0 drawn but silent.
test('sequence: digits on the central line, the digit sum at the bottom, a 0 adds nothing', () => {
  const s = N.sequence('3695', null), c = s.chart;
  assert.equal(s.digits.join(''), '3695');
  assert.equal(t(c.le), '23/5'); assert.equal(t(c.lowerLeft), '8/8'); assert.equal(t(c.lowerRight), '10/1'); assert.equal(t(c.solar), '9/9');
  assert.equal(c.heart, null); assert.equal(c.pillar, null); // no day on top: no upper half
  const z = N.sequence('2400', null).chart;
  assert.equal(z.words.length, 4); assert.ok(z.words[2].zero && z.words[3].zero); assert.equal(t(z.le), '6/6'); assert.equal(t(z.last.value), '4/4');
  const d = N.sequence('995', 19).chart;
  assert.equal(t(d.upperLeft), '10/1'); assert.equal(t(d.upperRight), '6/6'); assert.equal(t(d.heart), '7/7'); assert.equal(t(d.pillar), '41/5');
  assert.equal(N.sequence('5', null).chart.le, null); // one digit: only the line
  assert.equal(N.sequence('', null).digits.length, 0);
});

test('digits in a typed name (vault screenshots of the paid tool, 2026-10-21)', () => {
  const line = (inp, chart = 'name') => N.numeroscope(inp)[chart].words.map((w) => w.value.text).join(' ');
  // a word that is only digits is that number in every chart, never augmented
  assert.equal(line({ day: 4, month: 7, year: 1776, name: 'America 13' }), '17/8 13/4');
  assert.equal(line({ day: 4, month: 7, year: 1776, name: 'America 13' }, 'consonants'), '9/9 13/4');
  assert.equal(line({ day: 4, month: 7, year: 1776, name: 'America 13' }, 'vowels'), '8/8 13/4');
  const us = N.numeroscope({ day: 4, month: 7, year: 1776, name: 'America 13' });
  assert.equal(t(us.name.le), '12/3'); assert.equal(t(us.name.big), '30/3'); assert.equal(t(us.name.solar), '9/9');
  assert.equal(line({ day: 20, month: 4, year: 1990, name: 'Asmondgold 11' }), '41/5 11/2');
  assert.equal(line({ day: 8, month: 5, year: 1996, name: '6ix9ine 17' }), '32/5 17/8');
  assert.equal(line({ day: 21, month: 3, year: 2006, name: 'x 0' }), '17/8 0/0'); // x (5) augmented 5 + 3 = 8 -> 17; 0 stays 0/0
  assert.equal(line({ day: 20, month: 3, year: 1854, name: 'Republican 0' }), '36/9 0/0');
  // a digit inside a word counts on the main line only; the sub-charts skip it
  const n3 = N.numeroscope({ day: 13, month: 8, year: 2004, name: 'N3on 0' });
  assert.equal(line({ day: 13, month: 8, year: 2004, name: 'N3on 0' }), '20/2 0/0');
  assert.equal(t(n3.name.le), '2/2'); assert.equal(t(n3.name.big), '20/2'); assert.equal(t(n3.name.heart), '10/1'); assert.equal(t(n3.name.solar), '6/6');
  assert.equal(line({ day: 13, month: 8, year: 2004, name: 'N3on 0' }, 'consonants'), '10/1 0/0');
  assert.equal(line({ day: 13, month: 8, year: 2004, name: 'N3on 0' }, 'vowels'), '7/7 0/0');
});
