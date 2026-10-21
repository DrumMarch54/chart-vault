// Archetype lines (server/archetypes.js, server/archetype-words.js): the owner's example reads as they said it,
// every number has words in every form, a chart gets its lines, and the API answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../server/archetype-words.js';
import { phrasesFor, linesFor, LINES, wordsFor } from '../server/archetypes.js';
import { openDb } from '../server/db.js';
import { setInputs } from '../server/positions.js';

test('every number 1-9 and 10-99 has a title and words in all four forms, lowercase, no empty word', () => {
  for (let n = 1; n <= 99; n++) {
    const w = WORDS[n];
    assert.ok(w, `no words for ${n}`);
    assert.ok(w.title, `no title for ${n}`);
    for (const k of ['adj', 'noun', 'shadowAdj', 'shadowNoun']) {
      assert.ok(w[k].length >= 2, `${n} ${k} has ${w[k].length} words`);
      for (const word of w[k]) assert.ok(word === word.toLowerCase() || /^[A-Z]{2,4}$/.test(word), `${n} ${k} "${word}" is not lowercase`); // CEO stays CEO
    }
  }
  assert.equal(Object.keys(WORDS).length, 99);
  assert.equal(wordsFor(104).title, WORDS[5].title); // past 99: the digit sum's words
});

test("the owner's example: first name 24/6 with mind center 12/3 is a wholesome expander, in the shadow a victim", () => {
  const r = phrasesFor([{ sum: 24, pos: 'name.first' }, { sum: 12, pos: 'name.heart' }]);
  assert.equal(r.bright[0], 'wholesome expander');
  assert.ok(r.bright.length >= 3 && new Set(r.bright).size === r.bright.length, 'several different wordings');
  assert.ok(r.shadow[0].includes('victim'), r.shadow[0]);
  assert.equal(r.parts[0].label, 'First name'); assert.equal(r.parts[1].label, 'Mind center main vibration');
  assert.equal(r.parts[0].role, 'adjective'); assert.equal(r.parts[1].role, 'noun');
  const three = phrasesFor([{ sum: 8 }, { sum: 20 }, { sum: 12 }]);
  assert.match(three.bright[0], /^executive torchbearer with an? \w+ crown$/);
  assert.deepEqual(phrasesFor([{ sum: 8 }]).bright, []);
});

test('a chart gets one line per LINES entry it has the numbers for; a chart without numbers gets none', () => {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO images (filename, kind) VALUES ('a.jpg', 'chart')").run();
  db.prepare("INSERT INTO images (filename, kind) VALUES ('b.jpg', 'chart')").run();
  setInputs(db, 1, { day: 19, month: 8, year: 1984, name: 'Katrine Ditte Pilmark' }, { source: 'read' });
  const r = linesFor(db, 1);
  assert.equal(r.missing, false);
  assert.equal(r.lines.length, LINES.length);
  const higher = r.lines.find((l) => l.key === 'higher');
  assert.equal(higher.parts.length, 3); assert.equal(higher.parts[2].role, 'crown'); assert.equal(higher.parts[0].text, '19/1');
  assert.match(higher.bright[0], / crown$/);
  for (const l of r.lines) { assert.ok(l.bright.length >= 3, l.key); assert.ok(l.shadow.length >= 2, l.key); assert.ok(l.why); }
  assert.equal(linesFor(db, 2).missing, true);
});
