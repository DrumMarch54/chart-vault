// Wikipedia's first line read as a full birth name and a date (no network: readLead only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readLead } from '../server/wikidata.js';

test('the full birth name and the date come off the first line', () => {
  assert.deepEqual(readLead('Elon Reeve Musk ( ; born June 28, 1971) is a businessman'), { name: 'Elon Reeve Musk', from: 'Full name on Wikipedia', date: '1971-06-28' });
  assert.equal(readLead('Felix Arvid Ulf Kjellberg (born 24 October 1989), known online as PewDiePie').date, '1989-10-24');
  assert.equal(readLead('Adam Peter Lanza ( ) (April 22, 1992 – December 14, 2012) was').name, 'Adam Peter Lanza');
});
test('a changed name gives the birth name after "born"', () => {
  const r = readLead('Caitlyn Marie Jenner (born William Bruce Jenner; October 28, 1949) is an American media personality');
  assert.equal(r.name, 'William Bruce Jenner'); assert.match(r.from, /^Birth name/); assert.equal(r.date, '1949-10-28');
});
test('a nickname in quotes is left out, a sentence is never a name', () => {
  assert.equal(readLead('James Stephen "Jimmy" Donaldson (born May 7, 1998), known online as MrBeast').name, 'James Stephen Donaldson');
  assert.equal(readLead('MrBeast is an American YouTuber').name, '');
  assert.equal(readLead('The shooting at the school (December 14, 2012) was').name, '');
});
test('an Arabic family name with al- reads as a name', () => {
  assert.equal(readLead('Khalid al-Islambuli (Arabic: خالد الإسلامبولي, romanized: Khālid; 15 January 1955 – 15 April 1982) was').name, 'Khalid al-Islambuli');
});
