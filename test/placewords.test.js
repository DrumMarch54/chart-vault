// public/placewords.js (generated from the business books' text) holds the words of the House Number, Phone and
// Domain, and Business Words tools: the shapes the screens rely on, and a few of the book's own facts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/placewords.js', import.meta.url), 'utf8'), ctx);
const P = JSON.parse(JSON.stringify(ctx.PlaceWords));

test('house: the guide\'s rule, five business lists with nine houses each, who thrives in every house, the numbers to avoid', () => {
  assert.match(P.house.rule.digitSum, /9 \+ 7 \+ 3 = 19 = 1 \+ 9 = 1\. If there is a letter/);
  assert.deepEqual(Object.keys(P.house.business).sort(), ['1', '3', '4', '5', '9']);
  for (const [d, list] of Object.entries(P.house.business)) { assert.equal(Object.keys(list.houses).length, 9, `business ${d}`); assert.ok(list.about.length > 40); }
  assert.match(P.house.business[4].houses[8], /never/);
  assert.match(P.house.business[5].houses[5], /perfect/i);
  for (let d = 1; d <= 9; d++) assert.ok(P.house.homes[d] && P.house.homes[d].who, `house ${d}`);
  assert.deepEqual(P.house.avoid.map((x) => x.n), [12, 16, 48, 84, 58]);
  assert.equal(P.house.balancing[1], 'A I J Q Y');
});

test('phone: the sums the book names and the pairs to avoid', () => {
  assert.deepEqual(Object.keys(P.phone.sums).map(Number).sort((a, b) => a - b), [14, 19, 23, 27, 32, 36, 37, 41, 45, 46, 50, 54, 55]);
  assert.match(P.phone.sums[32], /career/i);
  assert.deepEqual(P.phone.avoidInside, [12, 16, 48, 84]);
  assert.match(P.phone.bad18, /competitive/);
});

test('boost words, personal titles and the manual\'s templates', () => {
  assert.deepEqual(Object.keys(P.boost.lists).map(Number).sort((a, b) => a - b), [17, 19, 21, 23, 27, 32, 36, 37]);
  assert.ok(P.boost.lists[17].includes('bright') && P.boost.lists[19].includes('coach') && P.boost.lists[23].includes('luxury'));
  assert.ok(P.boost.titles.some((t) => t.title === 'Coach' && t.values === '19/1'));
  assert.deepEqual(P.templates.map((t) => t.code), ['5A', '5B', '9A', '9B', '1A', '3A', '3B', '4A']);
  assert.deepEqual(P.templates[0].values, [32, 17, 37, 36]);
  assert.match(P.domain.whois, /whois\.com/);
});
