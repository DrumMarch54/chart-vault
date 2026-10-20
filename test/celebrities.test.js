// public/celebrities.js (generated from the statistics book) holds what the book says, group by group.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/celebrities.js', import.meta.url), 'utf8'), ctx);
const C = JSON.parse(JSON.stringify(ctx.Celebrities)); // plain objects: the vm's own Object prototype would fail deepEqual
const group = (name) => C.groups.find((g) => g.name === name);

test('the book\'s groups are all there, largest first', () => {
  assert.ok(C.groups.length >= 160, `only ${C.groups.length} groups`);
  assert.equal(C.groups[0].name, 'Athletes');
  for (const g of C.groups) {
    assert.ok(g.size > 0, `${g.name} has no size`);
    assert.ok(!/[(\d]/.test(g.name), `name not clean: ${g.name}`);
    assert.ok(g.ranks.length > 0, `${g.name} has no ranks`);
    for (const r of g.ranks) for (const d of r.days) assert.ok(d >= 1 && d <= 31, `${g.name}: day ${d}`);
  }
});

test('the worked examples match the book', () => {
  const a = group('Athletes');
  assert.equal(a.size, 21744);
  assert.deepEqual(a.ranks[0], { days: [1], count: 803 });
  const e = group('Entertainment');
  assert.equal(e.size, 16202);
  assert.deepEqual(e.ranks[0], { days: [17], count: 593 });
  assert.ok(e.line.includes('shine like a star'));
});

test('a tie keeps every day of the tie', () => {
  const l = group('Linguists');
  assert.ok(l.ranks.some((r) => r.days.length === 2 && r.days[0] === 11 && r.days[1] === 23));
});

test('byDay is the groups turned round', () => {
  const ent = C.byDay['17'].find((x) => x.group === 'Entertainment');
  assert.deepEqual(ent, { group: 'Entertainment', size: 16202, place: 1 });
  for (let d = 1; d <= 31; d++) assert.ok(Array.isArray(C.byDay[String(d)]), `day ${d}`);
  assert.ok(C.note.includes('slightly more'));
});
