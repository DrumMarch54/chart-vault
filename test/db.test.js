// Schema changes are numbered migrations; an existing database (made before
// migrations existed, user_version 0) upgrades in place and keeps every row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { openDb, SCHEMA, MIGRATIONS } from '../server/db.js';

test('a database from before migrations upgrades in place and keeps its rows', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-db-'));
  const file = path.join(dir, 'old.sqlite');
  const old = new Database(file);
  old.exec(SCHEMA);
  old.prepare("INSERT INTO images (filename) VALUES ('Screenshot_20250101_000000_Opera.jpg')").run();
  old.prepare("INSERT INTO imports (filename, rows) VALUES ('UserTag.backup', 5)").run();
  old.close();

  let db = openDb(file);
  assert.equal(db.pragma('user_version', { simple: true }), MIGRATIONS.length);
  assert.equal(db.prepare('SELECT count(*) c FROM images').get().c, 1);
  assert.equal(db.prepare('SELECT rows, build FROM imports').get().rows, 5);
  assert.ok(db.prepare('PRAGMA table_info(images)').all().some((c) => c.name === 'uploaded_build'));
  db.close();

  // opening again changes nothing
  db = openDb(file);
  assert.equal(db.pragma('user_version', { simple: true }), MIGRATIONS.length);
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a brand-new database gets every migration', () => {
  const db = openDb(':memory:');
  assert.equal(db.pragma('user_version', { simple: true }), MIGRATIONS.length);
  assert.ok(db.prepare('PRAGMA table_info(imports)').all().some((c) => c.name === 'build'));
});
