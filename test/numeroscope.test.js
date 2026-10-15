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
  assert.equal(t(n.spine), '6/6'); assert.equal(t(n.pillar), '41/5');
  assert.equal(n.middle.length, 1); assert.equal(n.middle[0].text, 'Ditte');
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

test('number colors: table lookups, one-middle-name switch, fallbacks, no secrets of the study leak', () => {
  const c = {};
  vm.runInNewContext(fs.readFileSync(new URL('../public/number-colors.js', import.meta.url), 'utf8'), c);
  const C = c.NumberColors;
  // Peter Joshua Shicora, checked against the owner's paid-tool screenshot.
  assert.equal(C.lookup('first', '24/6', true), 'green4'); assert.equal(C.lookup('middle', '23/5', true), 'green4'); assert.equal(C.lookup('last', '22/4', true), 'red3');
  assert.equal(C.lookup('heart', '12/3', true), 'red3'); assert.equal(C.lookup('heart', '12/3', false), 'gray');
  assert.equal(C.lookup('solar', '4/4', true), 'red1'); assert.equal(C.lookup('pillar', '36/9', true), 'green4'); assert.equal(C.lookup('le', '15/6', true), 'gray');
  assert.equal(C.lookup('c.heart', '11/2', true), 'gray'); assert.equal(C.lookup('v.heart', '3/3', true), 'green2'); assert.equal(C.lookup('v.big', '33/6', true), 'green3');
  // fixed positions and fallbacks
  assert.equal(C.lookup('day', '19/1'), 'dark'); assert.equal(C.lookup('e.month', '5/5'), 'dark'); assert.equal(C.lookup('po.pillar', '24/6'), 'blue'); assert.equal(C.lookup('pi.pillar', '30/3'), 'dark');
  assert.equal(C.lookup('big', '69/6'), 'faded'); assert.equal(C.lookup('first', '99/9'), 'gray'); assert.equal(C.lookup('c.big', '99/9'), 'faded');
  const classes = new Set(Object.values(C.table).flatMap((t) => Object.values(t)));
  for (const k of classes) assert.match(k, /^(gray|dark|faded|blue|green[1-4]|red[1-3])$/);
  assert.ok(Object.keys(C.table).length > 40);
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
  assert.equal(line({ name: 'Billy Camrick Carson II' }), '10/1 16/7 21/3 2/2'); // no day: nothing to add
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

test('one word is the first name alone, never doubled as the surname (Kim)', () => {
  const n = N.numeroscope({ day: 9, month: 10, year: 1958, name: 'Kim' }).name;
  assert.equal(n.first.text, 'Kim'); assert.equal(n.last, null); assert.equal(n.middle.length, 0);
  assert.equal(n.le.ds, n.first.value.ds); assert.equal(n.upperRight, null); assert.equal(n.heart, null); assert.equal(n.solar, null); assert.equal(n.pillar, null); assert.equal(n.leDiamond, null);
  assert.ok(n.upperLeft && n.lowerLeft && n.spine);
  const two = N.numeroscope({ day: 9, name: 'Kim Lee' }).name; assert.equal(two.last.text, 'Lee'); assert.ok(two.heart);
});
