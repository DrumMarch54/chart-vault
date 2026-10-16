// Tag codes read spelled out on screen; stored names never change; a search matches either form.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/tag-codes.js', import.meta.url), 'utf8'), ctx);
const T = ctx.TagCodes;

test('codes read spelled out (owner, 2026-10-15); names and unknown codes stay as written', () => {
  const want = { '19fn': '19/1 First name', '12mc': '12/3 Mind center', '6MC': '6 Mind center', '4combo9ec': '4 + 9 Emotion center', '8combo15': '8 + 15/6',
    '13and31lp': '13/4 + 31/4 Life path', '9nrlp': '9 Life path, reduced', '42': '42/6', '18sp': '18/9 Solar plexus', '56cd': '56/2 Challenge diamond',
    '88sd': '88/7 Spine diamond', '15pd': '15/6 Public diamond', '6pa': '6 Public aura', '12aa': '12/3 Associates aura', '69mentalflow': '69/6 Mental flow',
    politics: 'politics', JimmyRowe: 'JimmyRowe', '16ia': '16ia', '1900rugrat': '1900rugrat' };
  for (const [raw, shown] of Object.entries(want)) assert.equal(T.pretty(raw), shown, raw);
});

test('a typed search expands to the stored forms', () => {
  assert.equal(JSON.stringify(T.expandQuery('19/1 first')), JSON.stringify(['19fn']));
  assert.equal(JSON.stringify(T.expandQuery('12 mind center')), JSON.stringify(['12mc']));
  assert.equal(JSON.stringify(T.expandQuery('7 life path reduced')), JSON.stringify(['7nrlp']));
  assert.ok(T.expandQuery('8 + 15 mind').includes('8combo15mc'));
  assert.equal(JSON.stringify(T.expandQuery('politics')), JSON.stringify([]));
  assert.ok(T.expandQuery('19').includes('19fn') && T.expandQuery('19').includes('19mc'));
});
