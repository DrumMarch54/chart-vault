// What This Group Shares (server/group.js): a tag's charts against the rest of the vault. Counting only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-group-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
process.env.BUILD_COMMIT = 'grpbld';

const { openDb } = await import('../server/db.js');
const P = await import('../server/positions.js');
const G = await import('../server/group.js');

const NAMES = ['Anna Lee', 'Lucy Hale', 'Tom Ford', 'Mark Twain', 'Jane Doe', 'Sam Cooke', 'Nina Simone', 'Otis Redding', 'Etta James', 'Ray Charles', 'Bill Withers', 'Al Green', 'Carole King', 'Joni Mitchell', 'Neil Young', 'Van Morrison'];
function seed() {
  const db = openDb(':memory:');
  const add = (filename, inputs, tags = []) => {
    db.prepare("INSERT INTO images (filename, kind) VALUES (?, 'chart')").run(filename);
    const id = db.prepare('SELECT id FROM images WHERE filename = ?').get(filename).id;
    if (inputs) P.setInputs(db, id, inputs, { source: 'read' });
    for (const t of tags) {
      db.prepare("INSERT OR IGNORE INTO tags (name, kind) VALUES (?, 'name')").run(t);
      db.prepare("INSERT INTO image_tags (image_id, tag_id, source) VALUES (?, (SELECT id FROM tags WHERE name = ?), 'app')").run(id, t);
    }
    return id;
  };
  const ids = {};
  // Four people born on the 7th carry the tag; twelve others, on twelve other days, do not.
  NAMES.slice(0, 4).forEach((name, i) => { ids[name] = add(`g${i}.jpg`, { day: 7, month: 2 + i, year: 1970 + i * 3, name }, ['sevens']); });
  NAMES.slice(4).forEach((name, i) => { ids[name] = add(`r${i}.jpg`, { day: 8 + i, month: 1 + (i % 12), year: 1960 + i * 2, name }); });
  ids.twin = add('twin.jpg', { day: 7, month: 2, year: 1970, name: 'anna  LEE' }, ['sevens']); // the same person twice
  ids.blank = add('blank.jpg', null, ['sevens']);                                             // no name and date read
  add('tiny1.jpg', { day: 3, month: 3, year: 1999, name: 'Tiny One' }, ['tiny']);
  return { db, ids };
}

test('chance of a gap by luck: the hypergeometric tail', () => {
  assert.ok(Math.abs(G.chanceOf(2, 2, 2, 4) - 1 / 6) < 1e-9);
  assert.ok(Math.abs(G.chanceOf(0, 3, 2, 10) - 1) < 1e-9);
  assert.ok(Math.abs(G.chanceOf(1, 1, 3, 10) - 0.3) < 1e-9);
  assert.ok(G.chanceOf(4, 4, 4, 100) < 1e-6);
});

test('the day everyone in the group shares comes first, one person counts once, unread charts are left out', () => {
  const { db, ids } = seed();
  const r = G.groupShares(db, 'sevens');
  assert.equal(r.tagged, 6);            // every chart with the tag
  assert.equal(r.size, 4);              // people with a name and date; the twin is the same person
  assert.equal(r.rest, 13);
  const top = r.cards[0];
  assert.equal(top.strength, 'Strong');
  assert.ok(top.luck < 0.05);         // hardly any random group of four shares a day four ways
  assert.deepEqual(G.groupShares(db, 'sevens').cards.map((c) => c.luck), r.cards.map((c) => c.luck)); // the same on every visit
  const day = top.items.find((i) => i.pos === 'essence.day');
  assert.ok(day, 'the day vibration is in the first card');
  assert.equal(day.number, '7'); assert.equal(day.num, '7'); assert.equal(day.in_group, 4); assert.equal(day.group_of, 4); assert.equal(day.in_rest, 0);
  assert.equal(top.charts.length, 4);
  assert.ok(!top.charts.some((c) => c.id === ids.blank));
  // No card repeats a position, and no card is about the charts outside the group.
  for (const c of r.cards) { assert.equal(new Set(c.items.map((i) => i.pos)).size, c.items.length); for (const i of c.items) assert.ok(i.in_group / i.group_of > (i.rest_of ? i.in_rest / i.rest_of : 0)); }
  assert.ok(r.anywhere.every((a) => a.in_group >= 2));
});

test('every find opens as a position search the app can read', () => {
  const { db } = seed();
  const r = G.groupShares(db, 'sevens');
  for (const c of r.cards) for (const i of c.items) assert.ok(P.parseCondition(i.pos, i.num), `${i.pos} ${i.num}`);
  for (const a of r.anywhere) assert.ok(P.parseCondition('*.*', a.num));
});

test('a group too small to say anything, and a tag that does not exist, answer with no cards', () => {
  const { db } = seed();
  const tiny = G.groupShares(db, 'tiny');
  assert.equal(tiny.size, 1); assert.deepEqual(tiny.cards, []);
  const none = G.groupShares(db, 'nobody');
  assert.equal(none.tagged, 0); assert.deepEqual(none.cards, []);
});
