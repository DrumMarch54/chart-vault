// server/words.js: English words by number value, for the Business Words tool.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordsFor, wordInfo } from '../server/words.js';

test('a word\'s numbers: value, consonants, vowels, pyramid and its verdict', () => {
  const c = wordInfo('Coach');
  assert.equal(c.word, 'coach');
  assert.equal(c.value.text, '19/1'); assert.equal(c.consonants.text, '11/2'); assert.equal(c.vowels.text, '8/8');
  assert.equal(c.pyramid.length, 5); assert.equal(c.pyramid[0].map((x) => x.sum).join(' '), '3 7 1 3 5'); assert.equal(c.top.text, '9/9');
  assert.equal(c.tone, 'r'); assert.ok(c.ratio >= 0.3);
  assert.ok(c.rank > 0);
  assert.equal(wordInfo('123'), null); assert.equal(wordInfo(''), null);
  assert.equal(wordInfo('bright').value.text, '17/8'); // the book's 17/8 boost list has it
});

test('words worth a value, most common first; a digit sum covers every value landing on it', () => {
  const r = wordsFor(19, { limit: 500 });
  assert.ok(r.total > 1000);
  for (const w of r.words) assert.equal(w.value.sum, 19);
  assert.ok(r.words.some((w) => w.word === 'coach'));
  for (let i = 1; i < r.words.length; i++) assert.ok(r.words[i - 1].rank <= r.words[i].rank);
  const five = wordsFor(5, { limit: 50 });
  for (const w of five.words) assert.equal(w.value.ds, 5);
  assert.ok(five.total > r.total);
  const start = wordsFor(19, { limit: 20, start: 'co' });
  for (const w of start.words) assert.ok(w.word.startsWith('co'));
  assert.deepEqual(wordsFor(19, { limit: 1, offset: 1 }).words[0], r.words[1]);
});
