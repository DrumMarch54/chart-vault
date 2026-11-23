// Collapse and expand (server/insight.js): the cards of a researched group. No model, nothing spent.
// The first build called a card "clear" for 38 of 40 groups of RANDOM people (2026-11-23). These tests hold the fix:
// random groups almost never get a Solid card, what most random groups also show is not a card at all, and a real
// shared number still comes out Solid.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-insight-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password-long';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { parseUserTagBackup, importTags } = await import('../server/import.js');
const { setInputs } = await import('../server/positions.js');
const { groupInsights, isStrong } = await import('../server/insight.js');

// A made-up vault of 240 people: names put together from syllables, birthdays spread over sixty years.
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (list) => list[Math.floor(rnd() * list.length)];
const A = ['Al', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit', 'Lu', 'Mo', 'Ned', 'Ola', 'Pat', 'Quin', 'Ray', 'Sam', 'Tess'];
const B = ['an', 'bert', 'ton', 'ley', 'mar', 'ven', 'dor', 'lin', 'ric', 'sa', 'wyn', 'do'];
const name = () => `${pick(A)}${pick(B)} ${pick(A)}${pick(B)}${rnd() < 0.6 ? ` ${pick(A)}${pick(B)}` : ''}`;
const VAULT = Array.from({ length: 240 }, () => ({ name: name(), day: 1 + Math.floor(rnd() * 28), month: 1 + Math.floor(rnd() * 12), year: 1940 + Math.floor(rnd() * 60) }));
let db, ids;

before(() => {
  ensureDirs();
  db = openDb(':memory:');
  importTags(db, parseUserTagBackup(Buffer.from(JSON.stringify({ usertag: VAULT.map((v, i) => ({ _data: `/DCIM/S/Screenshot_${String(i).padStart(6, '0')}_x.jpg`, tag: `p${i}` })) }))), { filename: 'fake' });
  ids = db.prepare('SELECT id FROM images ORDER BY id').all().map((r) => r.id);
  VAULT.forEach((v, i) => setInputs(db, ids[i], v, { source: 'owner' }));
});

test('the strong positions are the first links and the centers, never the helper positions', () => {
  for (const [c, p] of [['essence', 'day'], ['essence', 'year'], ['name', 'first'], ['name', 'le'], ['name', 'solar'], ['vocation', 'heart'], ['inner', 'solar'], ['outer', 'heart'], ['name', 'pillar']]) assert.equal(isStrong(c, p), true, `${c}.${p}`);
  for (const [c, p] of [['name', 'anyName'], ['name', 'upperLeft'], ['name', 'emotionDiamond'], ['essence', 'outerAura']]) assert.equal(isStrong(c, p), false, `${c}.${p}`);
});

test('groups of random people almost never get a Solid card, and never a card most random groups also show', () => {
  let solid = 0, cards = 0;
  for (let t = 0; t < 10; t++) {
    const pool = ids.slice(), group = [];
    for (let k = 0; k < 24; k++) group.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const ins = groupInsights(db, { ids: group, randomGroups: 120 });
    for (const i of [...ins.expand, ...ins.combos, ...ins.collapse]) {
      cards++; if (i.solid) solid++;
      assert.equal(i.solid || i.luck < 0.5, true, 'a card is solid, or fewer than half the random groups match it');
      assert.ok(['solid', 'strong', 'lean'].includes(i.level));
      assert.equal(i.solid, i.level === 'solid');
    }
    assert.equal(ins.solid, [...ins.expand, ...ins.combos, ...ins.collapse].filter((i) => i.solid).length);
  }
  assert.equal(solid <= 2, true, `${solid} solid cards in 10 random groups (${cards} cards in all)`);
});

test('people who really share a number get it as a Solid card, with who holds it', () => {
  // Twelve strangers born the same day: the day number sits in a strong position in every chart.
  const extra = Array.from({ length: 12 }, (_, ref) => ({ name: name(), day: 19, month: 7, year: 1990, title: `Stranger ${ref}`, ref }));
  const ins = groupInsights(db, { extra, randomGroups: 120 });
  assert.equal(ins.size, 12);
  assert.equal(ins.rest, 240, 'people found online never join the others');
  const day = ins.expand.find((i) => i.key === 'number:19');
  assert.ok(day, '19/1 fills the group');
  assert.equal(day.level, 'solid');
  assert.equal(day.halves, true);
  assert.equal(day.count, '12 of 12 charts');
  assert.equal(day.people.every((p) => p.id === null && Number.isInteger(p.ref)), true);
  assert.equal(ins.solid >= 1, true);
  // Same day and month: every one of them has the same pairs in the essence diamonds (day 19/1 + month 7, ...).
  assert.equal(ins.combos.length >= 1, true, 'a combination they all share');
  for (const c of ins.combos) { assert.match(c.big, /^\d+(\/\d)? \+ \d+(\/\d)?$/); assert.equal(c.a <= c.b, true); assert.equal(c.a <= 18 && c.b <= 18, true, 'above 18 counts as its digit'); }
  assert.equal(ins.combos[0].level, 'solid');
  assert.equal(ins.combos[0].count, '12 of 12 charts');
});

test('too few people: nothing is said', () => {
  const ins = groupInsights(db, { ids: ids.slice(0, 2) });
  assert.deepEqual([ins.expand, ins.collapse], [[], []]);
});
