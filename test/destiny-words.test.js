// public/destiny-words.js (generated from the Forecasting Book by tools/make-destiny-words.mjs): the words shown when a
// destiny period is tapped in the Year Rows popup. Every planet number 1-9 has its three parts, the planet agrees with
// the engine's, and each entry's opening words still stand in the book (the "Open the Forecasting Book" button finds them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../public/destiny-words.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('../public/numeroscope.js', import.meta.url), 'utf8'), ctx);
const D = ctx.DestinyWords, N = ctx.Numeroscope;
const book = fs.readFileSync(new URL('../knowledge/raw/forecasting-book.md', import.meta.url), 'utf8');

test('every destiny period 1-9 has the book\'s balanced, unbalanced and lesson words', () => {
  for (let n = 1; n <= 9; n++) {
    const w = D.periods[n];
    assert.ok(w, `period ${n}`);
    for (const k of ['balanced', 'unbalanced', 'lessons']) assert.ok(w[k].length > 40, `${n} ${k}`);
    assert.ok(!/Unbalanced:|The Lessons:|DESTINY RHYTHM/.test(w.balanced + w.unbalanced + w.lessons), `${n} parts are split cleanly`);
    assert.ok(book.includes(w.find), `${n} opening words in the book`);
    assert.ok(w.page > 0);
  }
  assert.equal(D.periods[7].planet, 'Neptune');
  assert.match(D.periods[6].lessons, /infatuation, home and family/);
});

test('the planet of each period agrees with the engine', () => {
  for (const y of [1937, 1963, 1965, 1980, 1998, 2006]) for (const p of N.destinyPeriods(y, 12)) assert.equal(D.periods[p.number].planet, p.planet, `${y} ${p.start}`);
});
