// The number tools' math against the course books' own worked examples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
for (const f of ['numeroscope.js', 'tag-codes.js', 'numbertools.js']) vm.runInNewContext(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8'), ctx);
const T = ctx.NumberTools;
const t = (v) => (v ? v.text : null);

test('big diamond of 14/5: every diamond of the Diamond Method example (book p. 10)', () => {
  const B = T.bigDiamond(14);
  const m = B.main;
  assert.equal(t(m.le), '5'); assert.equal(t(m.outer), '6'); assert.equal(t(m.inner), '9'); assert.equal(t(m.center), '15/6'); assert.equal(m.name, 'The Mediator');
  assert.equal(m.outerD.code, 51); assert.equal(t(m.outerD.center), '9'); assert.equal(t(m.outerD.outer), '11/2'); assert.equal(t(m.outerD.inner), '7'); assert.equal(t(m.outerD.le), '6');
  assert.equal(m.outerU.code, 15); assert.equal(m.innerD.code, 54); assert.equal(t(m.innerD.outer), '14/5'); assert.equal(t(m.innerD.inner), '13/4'); assert.equal(m.innerU.code, 45);
  const e = B.essence;
  assert.equal(e.code, 69); assert.equal(t(e.le), '15/6'); assert.equal(t(e.outer), '12/3'); assert.equal(t(e.inner), '15/6'); assert.equal(t(e.center), '9');
  assert.equal(e.outerD.code, 66); assert.equal(t(e.outerD.center), '18/9'); assert.equal(e.outerU.code, 66); assert.equal(e.innerD.code, 69); assert.equal(e.innerU.code, 96);
  const i = B.integration;
  assert.equal(i.code, 36); assert.equal(t(i.le), '9'); assert.equal(i.outerD.code, 93); assert.equal(i.outerU.code, 39); assert.equal(i.innerD.code, 96); assert.equal(i.innerU.code, 69);
  // The top level always lands on a 9 (book p. 28): true for every number 10-99.
  for (let n = 10; n <= 99; n++) assert.equal(T.bigDiamond(n).integration.le.ds, 9, String(n));
});

test('a single digit sits in the inner corner with 0 outside; 14/5 is found inside 64/1', () => {
  const B = T.bigDiamond(5);
  assert.equal(B.main.a, 0); assert.equal(B.main.b, 5); assert.equal(t(B.main.le), '5');
  assert.ok(T.numbersContaining(14).includes(64));
});

test('relationship: John 25/7 and Eve 21/3 (the paid tool\'s example)', () => {
  const B = T.bigDiamond(7, 3);
  assert.equal(t(B.main.le), '10/1'); assert.equal(t(B.main.outer), '8'); assert.equal(t(B.main.inner), '4'); assert.equal(t(B.main.center), '12/3');
  assert.equal(B.main.outerD.code, 17); assert.equal(t(B.main.outerD.center), '15/6'); assert.equal(B.main.innerD.code, 13);
  assert.equal(B.essence.code, 84); assert.equal(t(B.essence.le), '12/3'); assert.equal(B.integration.code, 27);
});

test('energy of 24.12.1999 (Forecasting Numerology pp. 20-21)', () => {
  const e = T.dayEnergy(1999, 12, 24);
  assert.equal(t(e.dv), '24/6'); assert.equal(t(e.mv), '12/3'); assert.equal(t(e.yv), '28/1');
  assert.equal(t(e.lp), '10/1'); assert.equal(t(e.bigLp), '37/1');
  assert.equal(t(e.outerAura), '9'); assert.equal(t(e.outer), '63/9');
  assert.equal(t(e.innerAura), '7'); assert.equal(t(e.inner), '61/7');
  assert.equal(t(e.dharmaAura), '4'); assert.equal(t(e.dharma), '31/4');
  assert.equal(t(e.target), '64/1'); assert.equal(t(e.dvlp), '61/7'); assert.equal(e.ruler, 'Venus');
});

test('target number example (Superdates p. 200): day 3, month 8, year 6 → 35/8', () => {
  // 3 Aug 2004: year 2+0+0+4 = 6
  const e = T.dayEnergy(2004, 8, 3);
  assert.equal(t(e.dharmaAura), '14/5'); assert.equal(e.dharmaAura.ds, 5); assert.equal(t(e.target), '35/8');
});

test('coming days and ratings', () => {
  const days = T.comingDays(2026, 10, 15, 3);
  assert.equal(days.length, 3); assert.equal(days[1].d, 16); assert.equal(days[2].d, 17);
  for (const d of days) assert.ok(['super', 'good', 'beware'].includes(d.rating));
  // Beware: a number to avoid anywhere in the day chart (Superdates p. 31), with the reason spelled out.
  const oct16 = T.dayEnergy(2026, 10, 16);
  assert.equal(oct16.rating, 'beware'); assert.ok(oct16.reasons.some((r) => r.startsWith('16/7 as the day vibration')));
  const oct15 = T.dayEnergy(2026, 10, 15); // 15/6 day, but 61/7 as the outer and inner diamonds
  assert.equal(oct15.rating, 'beware'); assert.ok(oct15.reasons.some((r) => r.startsWith('61/7 as the outer diamond')));
  // Super: a primary code as the day or the essence, a strong and a soft code, nothing to avoid, psyche clean.
  const feb5 = T.dayEnergy(2026, 2, 5); // 5 day, 58/4 natural talent and 53/8 target (the 3-5-8 money triad)
  assert.equal(feb5.rating, 'super'); assert.ok(feb5.reasons.some((r) => r.startsWith('strong:'))); assert.ok(feb5.reasons.some((r) => r.startsWith('soft:')));
  assert.equal(feb5.essenceRuler, 'Saturn');
  // 4 and 8 meeting in a diamond is the 4-12/3-8 clash: 4 Aug 2029 (year 2+0+2+9 = 13/4, day 4, month 8).
  const clash = T.dayEnergy(2029, 8, 4);
  assert.equal(clash.rating, 'beware'); assert.ok(clash.reasons.some((r) => r.includes('4 and 8 meet')));
  // Good: nothing to avoid, but not the full set of codes. The reasons say what is missing.
  const good = T.comingDays(2026, 1, 1, 365).find((d) => d.rating === 'good');
  assert.ok(good && good.reasons.some((r) => r.startsWith('no ') || r.includes('use with care')));
  assert.equal(T.dayEnergy(2026, 2, 30), null);
});

test('prices: the book\'s own verdicts (Marketing Numerology pp. 40-54)', () => {
  assert.equal(T.priceCheck(995).value.text, '23/5'); assert.ok(T.priceCheck(995).good);
  assert.equal(T.priceCheck(1097).value.text, '17/8'); assert.ok(T.priceCheck(1097).good);
  assert.equal(T.priceCheck(2400).clean, 24); assert.equal(T.priceCheck(12597).clean, null);
  assert.ok(T.priceCheck(448).warnings.some((w) => w.includes('4 and 8')));
  assert.ok(T.priceCheck(120).warnings.some((w) => w.includes('12/3')));
  assert.ok(T.priceCheck(88).warnings.some((w) => w.includes('16/7')));
  assert.ok(T.priceCheck(1800).warnings.some((w) => w.includes('18')));
  assert.ok(T.priceCheck(1600).warnings.some((w) => w.includes('16/7')));
  assert.equal(T.priceCheck(''), null);
  const found = T.priceFind(23, [100, 999]);
  assert.ok(found.length > 0);
  assert.ok(found.every((c) => c.sum === 23 && !c.warnings.length));
  assert.ok(found.map((c) => c.price).includes(995));
});

test('karmic connections: shared destiny rhythms = same birth-year digit sum', () => {
  const k = T.karmic(1936, [1945, 1943, 1936]);
  assert.equal(k.ds, 1); assert.equal(JSON.stringify(k.rhythm), '[1,2,4,8,7,5]');
  assert.equal(JSON.stringify(k.others.map((o) => o.shared)), '[true,false,true]');
  assert.equal(k.others[2].sameYear, true);
  assert.equal(T.karmic(99, []), null);
});
