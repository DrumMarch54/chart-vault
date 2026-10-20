// The number tools' math against the course books' own worked examples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
for (const f of ['numeroscope.js', 'tag-codes.js', 'numbertools.js']) vm.runInNewContext(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8'), ctx);
const T = ctx.NumberTools;
const t = (v) => (v ? v.text : null);
const N_PLANETS = ctx.Numeroscope.PLANETS;

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
  // A primary code as the BIG essence alone is not enough: 31 Oct 2026 (31/4 day, essence 6, big essence 15/6, 46/1
  // natural talent) is not a Super Date (owner, 2026-10-16); the day or the essence itself must carry the code.
  const oct31 = T.dayEnergy(2026, 10, 31);
  assert.equal(oct31.rating, 'good'); assert.ok(oct31.reasons.some((r) => r.startsWith('no primary success code as the day or the essence')));
  const oct17 = T.dayEnergy(2026, 10, 17); // 17/8 day: a soft primary code as the day itself, 10/1 strong as the essence
  assert.equal(oct17.rating, 'super');
  assert.equal(T.dayEnergy(2026, 2, 30), null);
});

test('prices: the book\'s own verdicts (Marketing Numerology pp. 38-54)', () => {
  assert.equal(T.priceCheck(995).value.text, '23/5'); assert.ok(T.priceCheck(995).good);
  assert.equal(T.priceCheck(1097).value.text, '17/8'); assert.ok(T.priceCheck(1097).good);
  assert.equal(T.priceCheck(2400).clean, 24); assert.equal(T.priceCheck(4200).clean, 42); assert.equal(T.priceCheck(12597).clean, null); // p. 38
  assert.equal(T.priceCheck(19000).clean, 19); assert.equal(T.priceCheck(2000).clean, 20); assert.ok(T.priceCheck(2000).good); // pp. 47, 53
  assert.equal(T.priceCheck(''), null);
  // No-go prices, p. 48, every example on the page.
  for (const p of [84, 448, 1348]) assert.ok(T.priceCheck(p).warnings.some((w) => w.includes('4 and 8')), String(p));
  for (const p of [120, 1200, 39, 129, 255, 390, 444, 84, 1344]) { const c = T.priceCheck(p); assert.equal(c.verdict, 'avoid', String(p)); assert.ok(c.warnings.some((w) => w.startsWith('12/3')), String(p)); }
  for (const p of [16, 160, 1600, 16000, 88, 187, 1096, 11095, 448, 1348]) { const c = T.priceCheck(p); assert.equal(c.verdict, 'avoid', String(p)); assert.ok(c.warnings.some((w) => w.startsWith('16/7')), String(p)); }
  // 8 digit sums: only 8 and 17/8 (pp. 40, 43). "Never end in 8" is the digit sum: 298 = 19/1 has no warning.
  assert.equal(T.priceCheck(899).verdict, 'avoid'); assert.ok(T.priceCheck(899).warnings[0].startsWith('26/8'));
  assert.equal(T.priceCheck(1997).verdict, 'avoid'); assert.ok(T.priceCheck(1997).warnings[0].startsWith('26/8'));
  assert.equal(T.priceCheck(395).verdict, 'good'); assert.equal(T.priceCheck(298).verdict, 'good');
  // 18/9 only as a sharp offer (pp. 40, 53); $1800 is 18 reinforced by zeros, a little too hard (p. 51).
  assert.equal(T.priceCheck(549).verdict, 'care'); assert.ok(T.priceCheck(549).cautions[0].startsWith('18/9'));
  assert.equal(T.priceCheck(1800).verdict, 'care'); assert.ok(T.priceCheck(1800).cautions.some((w) => w.startsWith('18 reinforced')));
  // The digit sum must land on 5, 9 or 1 (p. 40); a 6 or 20/2 for a softer price (p. 53). $250 = 7, $300 = 3.
  // a digit sum outside 1, 5, 9 is a tip, not a caution (owner's call 2026-10-16)
  assert.equal(T.priceCheck(250).verdict, 'good'); assert.ok(T.priceCheck(250).notes.some((n) => n.startsWith('Lands on 7')));
  assert.equal(T.priceCheck(300).verdict, 'good'); assert.equal(T.priceCheck(285).verdict, 'good');
  // 36 as the first two digits of 3695 (p. 51), a magnetic number in the row (p. 40).
  const c3695 = T.priceCheck(3695); assert.equal(c3695.lead, 36); assert.ok(c3695.rowNums.includes(36)); assert.ok(c3695.good);
  // Find a Price lands on the vibration, never on a warning; the book's 995 is among the 23/5 prices.
  const found = T.priceFind(23, [100, 999]);
  assert.ok(found.length > 0 && found.every((c) => (c.sum === 23 || c.clean === 23) && c.good));
  assert.ok(found.map((c) => c.price).includes(230)); // the clean 23 (p. 39)
  assert.ok(found.map((c) => c.price).includes(995));
  assert.ok(T.priceFind(18, [100, 999]).every((c) => c.verdict === 'care' && c.sum === 18));
  assert.ok(T.priceFind(21, [100, 9999], 200).map((c) => c.price).includes(210)); // a clean 21 (p. 39)
  for (const [n] of T.PRICE_VIBES) assert.ok(T.priceFind(n, [10, 99999], 5).length > 0, `no price lands on ${n}`);
  // Find a Price ranks with a fast copy of the pyramid weight: it must equal Numeroscope.weighPyramid's.
  for (let p = 10; p < 200000; p += 37) { const c = T.priceCheck(p); assert.ok(Math.abs(T.pyramidRatio(c.digits) - c.weight.ratio) < 1e-9, String(p)); }
});

// The generated words (public/readings.js, public/bizwords.js) against the books' own pages.
const W = {};
for (const f of ['readings.js', 'bizwords.js']) vm.runInNewContext(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8'), W);
test('every example price in the book passes the book\'s own rules (Marketing Numerology pp. 46-53)', () => {
  const ex = W.BizWords.prices.examples;
  assert.ok(ex.length >= 60);
  for (const e of ex) { const c = T.priceCheck(e.price); assert.equal(c.verdict, 'good', `${e.price} (p. ${e.page}): ${c.warnings.concat(c.cautions).join('; ')}`); assert.ok(e.clean ? c.clean === e.sum : c.sum === e.sum, String(e.price)); }
  assert.ok(ex.some((e) => e.price === 599 && e.sum === 23 && e.note === 'money and abundance vibe' && e.page === 46));
});

test('business words: The Numbers 10-99 in Business, Numbers Overview, Business Manual, Module 12', () => {
  const B = W.BizWords;
  assert.equal(B.business[23].name, 'The Royal Star of the Lion'); assert.equal(B.business[23].color, 'green');
  assert.equal(B.business[28].color, 'orange'); assert.match(B.business[28].warn, /legal challenges/);
  for (const n of [12, 16, 18, 29, 38, 39, 40, 48, 61, 79, 83, 84, 88, 92]) assert.equal(B.business[n].color, 'red', String(n)); // the book's red list lines
  assert.equal(B.business[30].color, 'black');
  for (let n = 10; n <= 99; n++) assert.ok(B.business[n] && B.business[n].text, String(n));
  for (let n = 1; n <= 99; n++) assert.ok(B.overview[n] && B.overview[n].text, String(n));
  assert.equal(B.overview[1].name, 'The Illuminator (Sun)');
  assert.equal(B.businessFamilies[5].title, 'Movement, Communication, and Networking');
  assert.match(B.prices.hundreds[9].text, /buy now or don’t buy at all/); // p. 54
  assert.equal(B.prices.labels.sum17.words, 'spotlight and attention'); assert.equal(B.prices.labels.sum27.words, 'authority and leadership'); // p. 53 ("9/27")
  assert.equal(B.companyDay[5].head, 'Good for all types of business, both as DV and LP'); // Business Manual p. 14
  assert.match(B.companyDay[2].head, /^Usually not recommended as a DV/);
  assert.equal(JSON.stringify(B.codes.find((c) => c.name === 'Money numbers').nums), '[19,37,21,14,23,32]'); // Module 12 p. 10
  assert.equal(JSON.stringify(B.customers.find((c) => c.who === 'Real estate agents').digits), '[1,3]'); // Module 12 p. 4
});

test('day words: code groups, the target\'s adjustment, the ruler of the day, the three colors', () => {
  const R = W.Readings;
  const group = (n) => R.codes.filter((g) => g.nums.includes(n)).map((g) => g.name).join(' | ');
  assert.equal(group(58), 'World conqueror code'); assert.equal(group(35), 'Money & manifestation codes'); // Superdates p. 24
  assert.equal(group(71), 'Visibility & spotlight'); assert.equal(group(21), 'Quality & Stability'); // pp. 25-27
  // p. 200: Day 3, Month 8, Year 6 → target 35, "your adjustment must commit (8)"; p. 156: 68 → 5 "lighten".
  const e = T.dayEnergy(2004, 8, 3);
  assert.equal(e.target.text, '35/8'); assert.equal(R.quality[e.target.ds], 'commit'); assert.equal(R.quality[5], 'lighten');
  // The ruler chapters (Cosmic Calendar pp. 51-108) follow the app's planets: 1 Sun, 5 Mercury, 8 Saturn.
  for (const [d, planet] of Object.entries(N_PLANETS)) assert.equal(R.ruler[planet].number, d, planet);
  assert.equal(R.ruler.Sun.title, 'Visibility, Purpose and Creative Leadership'); assert.ok(R.ruler.Mercury.themes.length >= 5);
  assert.match(R.ruler.Saturn.dates, /17 stands as the harmonized Saturn/);
  assert.equal(R.ratings.super.practice, 'Ideal for launches, announcements, high-visibility actions'); // p. 288
  assert.equal(R.ratings.beware.light, 'pause and reflect'); assert.equal(R.ratings.good.tool, 'supportive and flowing.'); // pp. 288, 43
  // Pluto's undertone (p. 104): 9, 18, 27 and numbers with a 0.
  assert.deepEqual([5, 9, 10, 18, 20, 27, 30, 31].map((n) => T.plutoUndertone(T.val(n))), [false, true, true, true, true, true, true, false]);
});

test('karmic connections: shared destiny rhythms = same birth-year digit sum', () => {
  const k = T.karmic(1936, [1945, 1943, 1936]);
  assert.equal(k.ds, 1); assert.equal(JSON.stringify(k.rhythm), '[1,2,4,8,7,5]');
  assert.equal(JSON.stringify(k.others.map((o) => o.shared)), '[true,false,true]');
  assert.equal(k.others[2].sameYear, true);
  assert.equal(T.karmic(99, []), null);
});

// Find a Date: the Cosmic Calendar's "strategic resonance map" (ch. 8) by the day of the month, Super and Good days only.
test('findDates lists only the purpose\'s days that are Super or Good, and reads the company fit from the book\'s table', () => {
  const r = T.findDates('launch', 2026, 10, 20, 90, 17);
  assert.equal(r.purpose.key, 'launch');
  assert.ok(r.days.length > 0);
  for (const e of r.days) { assert.ok([1, 3, 17, 21].includes(e.d), `day ${e.d}`); assert.notEqual(e.rating, 'beware'); }
  assert.equal(r.days.length + r.skipped, T.comingDays(2026, 10, 20, 90).filter((e) => [1, 3, 17, 21].includes(e.d)).length);
  assert.equal(JSON.stringify({ ds: r.fit.ds, best: r.fit.best, avoid: r.fit.avoid }), JSON.stringify({ ds: 8, best: [8, 26, 9], avoid: [11, 22] }));
  assert.equal(r.days.find((e) => e.d === 1).fits, false);
  const fit5 = T.findDates('marketing', 2026, 1, 1, 60, 14);
  assert.equal(fit5.fit.best.join(), '5,23,27'); assert.equal(fit5.days.find((e) => e.d === 5 || e.d === 23).fits, true);
  assert.equal(T.findDates('marketing', 2026, 1, 1, 60, 2).fit.unknown, true);
  assert.equal(T.findDates('launch', 2026, 1, 1, 60).fit, null);
  assert.equal(T.findDates('nothing', 2026, 1, 1, 60).days.length, 0);
  assert.equal(T.PURPOSES.map((p) => p.key).join(), 'launch,marketing,partnership,teaching,contract,branding,team,pr');
});

// Plan With Year Rows: the Forecasting book's good and difficult combinations found in a year's rows.
test('rowHits finds single numbers in every cell and vertical triads down a column (Nixon 1972, JFK 1963)', () => {
  const N = ctx.Numeroscope;
  const nixon = T.rowHits(N.yearRows({ day: 9, month: 1, year: 1913, name: 'Richard Milhous Nixon' }, 1972).rows);
  const conqueror = nixon.filter((h) => h.combo.key === '5-8-13' && h.self === 'human' && h.col === 'main');
  assert.equal(conqueror.length, 1);
  assert.equal(conqueror[0].cells.map((c) => c.row).join(), '4,5,6');
  assert.equal(conqueror[0].value.sum, 13);
  const single = nixon.find((h) => h.combo.key === '17');
  assert.ok(single); assert.equal(single.cells.length, 1); assert.equal(single.value.sum, 17);
  assert.ok(nixon.every((h) => ['good', 'difficult'].includes(h.combo.kind)));
  const onlyGood = T.rowHits(N.yearRows({ day: 9, month: 1, year: 1913, name: 'Richard Milhous Nixon' }, 1972).rows, T.ROW_COMBOS.good.map((c) => c.key));
  assert.ok(onlyGood.length < nixon.length); assert.ok(onlyGood.every((h) => h.combo.kind === 'good'));
  const jfk = T.rowHits(N.yearRows({ day: 29, month: 5, year: 1917, name: 'John Fitzgerald Kennedy' }, 1963).rows, ['11']);
  assert.ok(jfk.length >= 2); assert.ok(jfk.every((h) => h.value.sum === 11));
  assert.equal(T.rowHits([], ['10']).length, 0);
});
