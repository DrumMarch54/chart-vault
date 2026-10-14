import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { parseUserTagBackup, importTags, addTagToImage, removeTagFromImage, ImportError } from '../server/import.js';
import { tagKind, dateFromFilename, basename } from '../server/tags.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Made-up sample in the exact Samsung shape. Same image under two folders,
// a duplicated pair, mixed-case tags.
const SAMPLE = {
  usertag: [
    { _data: '/DCIM/Screenshots/Screenshot_20251008_223530_Opera.jpg', tag: 'samplePerson' },
    { _data: '/DCIM/Screenshots/Screenshot_20251008_223530_Opera.jpg', tag: '12mc' },
    { _data: '/DCIM/12 Mind Center/Screenshot_20251008_223530_Opera.jpg', tag: '12mc' },
    { _data: '/DCIM/12 Mind Center/Screenshot_20251008_223530_Opera.jpg', tag: 'politics' },
    { _data: '/DCIM/Screenshots/Screenshot_20240910_115242_Firefox.jpg', tag: 'Friend' },
    { _data: '/DCIM/Screenshots/Screenshot_20240910_115242_Firefox.jpg', tag: 'friend' },
    { _data: '/DCIM/Screenshots/Screenshot_20240910_115242_Firefox.jpg', tag: '42' },
    { _data: '/DCIM/Charts/Screenshot_20240910_130628_Firefox.jpg', tag: '13and31lp' },
  ],
};

function counts(db) {
  return {
    images: db.prepare('SELECT count(*) c FROM images').get().c,
    tags: db.prepare('SELECT count(*) c FROM tags').get().c,
    links: db.prepare('SELECT count(*) c FROM image_tags').get().c,
    paths: db.prepare('SELECT count(*) c FROM image_paths').get().c,
  };
}
function tagsOf(db, filename) {
  return db.prepare(`SELECT t.name FROM image_tags it JOIN tags t ON t.id = it.tag_id
    JOIN images i ON i.id = it.image_id WHERE i.filename = ? ORDER BY t.name`).all(filename).map((r) => r.name);
}

test('tag kinds are classified for display', () => {
  assert.equal(tagKind('12mc'), 'position');
  assert.equal(tagKind('21day'), 'position');
  assert.equal(tagKind('4combo9ec'), 'position');
  assert.equal(tagKind('13and31lp'), 'position');
  assert.equal(tagKind('42'), 'number');
  assert.equal(tagKind('99'), 'number');
  assert.equal(tagKind('jefferydahmer'), 'name');
  assert.equal(tagKind('Friend'), 'name');
  assert.equal(tagKind('me'), 'name');
});

test('dates are read from filenames', () => {
  assert.equal(dateFromFilename('Screenshot_20251008_223530_Opera.jpg'), '2025-10-08T22:35:30');
  assert.equal(dateFromFilename('20241221_173204.jpg'), '2024-12-21T17:32:04');
  assert.equal(dateFromFilename('IMG-20241110-WA0000.jpg'), '2024-11-10T00:00:00');
  assert.equal(dateFromFilename('Thinking, Feeling, Experiencing.jpg'), null);
  assert.equal(basename('/DCIM/12 Mind Center/a b.jpg'), 'a b.jpg');
});

test('parser merges paths by filename and keeps tags exactly', () => {
  const parsed = parseUserTagBackup(JSON.stringify(SAMPLE));
  assert.equal(parsed.rows.length, 8);
  assert.equal(parsed.images.size, 3);
  const img = parsed.images.get('Screenshot_20251008_223530_Opera.jpg');
  assert.deepEqual([...img.tags].sort(), ['12mc', 'politics', 'samplePerson']);
  assert.equal(img.paths.size, 2);
  const f = parsed.images.get('Screenshot_20240910_115242_Firefox.jpg');
  assert.deepEqual([...f.tags].sort(), ['42', 'Friend', 'friend']); // case kept, both tags
});

test('parser accepts a UTF-8 BOM and escaped slashes', () => {
  const text = '﻿{"usertag":[{"_data":"\\/DCIM\\/Screenshots\\/Screenshot_20251008_223530_Opera.jpg","tag":"x"}]}';
  const parsed = parseUserTagBackup(Buffer.from(text, 'utf8'));
  assert.equal(parsed.images.size, 1);
  assert.ok(parsed.images.has('Screenshot_20251008_223530_Opera.jpg'));
});

test('parser accepts one JSON object per line', () => {
  const text = SAMPLE.usertag.map((r) => JSON.stringify(r)).join('\n');
  const parsed = parseUserTagBackup(text);
  assert.equal(parsed.images.size, 3);
});

test('parser refuses files that are not tag backups', () => {
  assert.throws(() => parseUserTagBackup(''), ImportError);
  assert.throws(() => parseUserTagBackup('hello world'), ImportError);
  assert.throws(() => parseUserTagBackup('{"foo":1}'), ImportError);
  assert.throws(() => parseUserTagBackup('{"usertag":[]}'), ImportError);
  assert.throws(() => parseUserTagBackup('{"usertag":[{"_data":"/a/b.jpg"}]}'), ImportError);
  assert.throws(() => parseUserTagBackup('{"usertag":[{"_data":"/a/b.jpg","tag":"  "}]}'), ImportError);
});

test('first import creates images, tags and links; summary is right', () => {
  const db = openDb(':memory:');
  const s = importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)), { filename: 'UserTag.backup' });
  assert.equal(s.rows, 8);
  assert.equal(s.images_in_file, 3);
  assert.equal(s.tags_in_file, 7);
  assert.equal(s.new_images, 3);
  assert.equal(s.new_tags, 7);
  assert.equal(s.new_links, 7); // 8 rows minus one duplicated (image,12mc) pair
  assert.equal(s.skipped_removed, 0);
  assert.deepEqual(counts(db), { images: 3, tags: 7, links: 7, paths: 4 });
  assert.deepEqual(tagsOf(db, 'Screenshot_20251008_223530_Opera.jpg'), ['12mc', 'politics', 'samplePerson']);
  assert.equal(db.prepare('SELECT taken_at FROM images WHERE filename = ?').get('Screenshot_20251008_223530_Opera.jpg').taken_at, '2025-10-08T22:35:30');
  assert.equal(db.prepare('SELECT count(*) c FROM imports').get().c, 1);
});

test('importing the same file again changes nothing', () => {
  const db = openDb(':memory:');
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  const before = counts(db);
  const s = importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  assert.equal(s.new_images, 0);
  assert.equal(s.new_tags, 0);
  assert.equal(s.new_links, 0);
  assert.deepEqual(counts(db), before);
});

test('importing a newer file adds only what is new and deletes nothing', () => {
  const db = openDb(':memory:');
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  const newer = { usertag: [
    ...SAMPLE.usertag.slice(0, 4), // the older file lost some rows: must NOT delete anything
    { _data: '/DCIM/Screenshots/Screenshot_20251008_223530_Opera.jpg', tag: 'youtube' },
    { _data: '/DCIM/Screenshots/Screenshot_20251101_090000_Opera.jpg', tag: 'newPerson' },
    { _data: '/DCIM/Screenshots/Screenshot_20251101_090000_Opera.jpg', tag: '12mc' },
  ] };
  const s = importTags(db, parseUserTagBackup(JSON.stringify(newer)));
  assert.equal(s.new_images, 1);
  assert.equal(s.new_tags, 2); // youtube, newPerson
  assert.equal(s.new_links, 3);
  assert.deepEqual(counts(db), { images: 4, tags: 9, links: 10, paths: 5 });
  assert.deepEqual(tagsOf(db, 'Screenshot_20240910_115242_Firefox.jpg'), ['42', 'Friend', 'friend']);
  assert.deepEqual(tagsOf(db, 'Screenshot_20251008_223530_Opera.jpg'), ['12mc', 'politics', 'samplePerson', 'youtube']);
});

test('tags added in the app survive a later import', () => {
  const db = openDb(':memory:');
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  const id = db.prepare('SELECT id FROM images WHERE filename = ?').get('Screenshot_20240910_130628_Firefox.jpg').id;
  assert.equal(addTagToImage(db, id, 'family').added, true);
  assert.equal(addTagToImage(db, id, 'family').added, false); // already there, no duplicate
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  assert.deepEqual(tagsOf(db, 'Screenshot_20240910_130628_Firefox.jpg'), ['13and31lp', 'family']);
  assert.equal(db.prepare("SELECT source FROM image_tags it JOIN tags t ON t.id=it.tag_id WHERE it.image_id=? AND t.name='family'").get(id).source, 'app');
});

test('tags removed in the app stay removed after a later import', () => {
  const db = openDb(':memory:');
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  const id = db.prepare('SELECT id FROM images WHERE filename = ?').get('Screenshot_20240910_115242_Firefox.jpg').id;
  assert.equal(removeTagFromImage(db, id, 'friend').removed, true);
  assert.deepEqual(tagsOf(db, 'Screenshot_20240910_115242_Firefox.jpg'), ['42', 'Friend']);
  const s = importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  assert.equal(s.skipped_removed, 1);
  assert.deepEqual(tagsOf(db, 'Screenshot_20240910_115242_Firefox.jpg'), ['42', 'Friend']);
  // The tag itself still exists for other images / suggestions.
  assert.ok(db.prepare('SELECT 1 FROM tags WHERE name = ?').get('friend'));
  // Adding it back in the app undoes the removal.
  addTagToImage(db, id, 'friend');
  assert.deepEqual(tagsOf(db, 'Screenshot_20240910_115242_Firefox.jpg'), ['42', 'Friend', 'friend']);
  assert.equal(db.prepare('SELECT count(*) c FROM removed_tags').get().c, 0);
});

test('a bad file leaves the database untouched', () => {
  const db = openDb(':memory:');
  importTags(db, parseUserTagBackup(JSON.stringify(SAMPLE)));
  const before = counts(db);
  assert.throws(() => parseUserTagBackup('{"usertag":[{"_data":"/x/y.jpg","tag":"ok"},{"_data":"/x/z.jpg"}]}'), ImportError);
  assert.deepEqual(counts(db), before);
});

// The real backup is private and kept out of git. When it is present locally
// (data/UserTag.backup), check the numbers the user gave us.
const REAL = path.join(here, '..', 'data', 'UserTag.backup');
test('real UserTag.backup imports with the expected totals', { skip: !fs.existsSync(REAL) && 'data/UserTag.backup not present' }, () => {
  const parsed = parseUserTagBackup(fs.readFileSync(REAL));
  assert.equal(parsed.rows.length, 2613);
  assert.equal(parsed.images.size, 701);
  const db = openDb(':memory:');
  const s = importTags(db, parsed);
  assert.equal(s.new_images, 701);
  assert.equal(s.new_tags, 1393);
  assert.equal(s.tags_in_file, 1393);
  const again = importTags(db, parsed);
  assert.equal(again.new_images + again.new_tags + again.new_links, 0);
  // every image has at least one tag, and every tag is used
  assert.equal(db.prepare('SELECT count(*) c FROM images WHERE id NOT IN (SELECT image_id FROM image_tags)').get().c, 0);
  assert.equal(db.prepare('SELECT count(*) c FROM tags WHERE id NOT IN (SELECT tag_id FROM image_tags)').get().c, 0);
  // all 735 phone paths were kept
  assert.equal(db.prepare('SELECT count(*) c FROM image_paths').get().c, 735);
});
