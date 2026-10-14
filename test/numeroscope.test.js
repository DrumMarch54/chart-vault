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
  assert.equal(N.nameWord("O'Neil-x").text, 'ONeilx');
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
  assert.equal(t(n.spineDiamond), '15/6'); assert.equal(t(n.spine), '6/6');
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
  assert.equal(one.first, one.last);
});

test('birth date numbers (course notes)', () => {
  const b = N.birth(19, 12, 1984);
  assert.equal(t(b.day), '19/1'); assert.equal(t(b.month), '12/3'); assert.equal(t(b.year), '22/4');
  assert.equal(t(b.littleLp), '8/8'); assert.equal(t(b.higherLp), '35/8');
  assert.equal(t(b.outerDiamond), '13/4'); assert.equal(t(b.innerDiamond), '14/5'); assert.equal(t(b.dharma), '34/7');
  assert.equal(t(b.nexus), '18/9'); assert.equal(t(b.target), '17/8');
  assert.equal(JSON.stringify(b.rhythm.map((p) => p.years)), JSON.stringify([4, 8, 7, 5, 1, 2]));
  assert.equal(JSON.stringify(N.rhythm(9).map((p) => p.years)), JSON.stringify([9, 9, 9]));
  assert.equal(JSON.stringify(N.rhythm(6).map((p) => p.years)), JSON.stringify([6, 3, 6, 3, 6, 3]));
  assert.equal(N.rhythm(8)[0].planet, 'Saturn');
});
