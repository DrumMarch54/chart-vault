// Who a chart is: the name under the thumbnail (server/titles.js). Separate from the tags.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-titles-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
process.env.BUILD_COMMIT = 'testbld';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const T = await import('../server/titles.js');
const { listImages, getImage, imageContext } = await import('../server/queries.js');
const { snapshot } = await import('../server/snapshot.js');
const { tagKind } = await import('../server/tags.js');

function addChart(db, filename, tags = []) {
  db.prepare("INSERT INTO images (filename, kind) VALUES (?, 'chart')").run(filename);
  const id = db.prepare('SELECT id FROM images WHERE filename = ?').get(filename).id;
  for (const t of tags) {
    db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(t, tagKind(t));
    db.prepare("INSERT INTO image_tags (image_id, tag_id, source) VALUES (?, (SELECT id FROM tags WHERE name = ?), 'import')").run(id, t);
  }
  return id;
}

let server, base, db;
const api = (p, init) => fetch(base + p, { ...init, headers: { authorization: 'Bearer test-password', 'content-type': 'application/json', ...(init && init.headers) } });
before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  const app = createApp(db, { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('seed is merge-only: fills empty names, never touches an existing or owner-set one, skips unknown files', () => {
  const a = addChart(db, 'a.jpg', ['Celebrity', 'charliesheen']);
  const b = addChart(db, 'b.jpg', ['John']);
  const c = addChart(db, 'c.jpg', []);
  T.setTitle(db, c, 'Owner Typed');
  const r = T.seedTitles(db, [
    { filename: 'a.jpg', title: 'Charlie Sheen', source: 'known' },
    { filename: 'b.jpg', title: 'John', source: 'tag', check: true },
    { filename: 'c.jpg', title: 'Seed Wins?', source: 'known' },
    { filename: 'nope.jpg', title: 'Nobody', source: 'known' },
  ]);
  assert.deepEqual(r, { added: 2, skipped: 1, unknown: 1 });
  assert.equal(getImage(db, a).title, 'Charlie Sheen');
  assert.equal(getImage(db, a).title_check, false);
  assert.equal(getImage(db, b).title_check, true);
  assert.equal(getImage(db, c).title, 'Owner Typed');
  // running the seed again changes nothing
  assert.deepEqual(T.seedTitles(db, [{ filename: 'a.jpg', title: 'Someone Else', source: 'known' }]), { added: 0, skipped: 1, unknown: 0 });
  assert.equal(getImage(db, a).title, 'Charlie Sheen');
});

test('the browse list carries the name; a flagged or empty name is listed to check, an owner-set one is not', () => {
  const items = listImages(db, {}).items;
  assert.equal(items.find((i) => i.filename === 'a.jpg').title, 'Charlie Sheen');
  const d = addChart(db, 'd.jpg', ['Josh']);
  T.seedTitles(db, [{ filename: 'd.jpg', title: 'Josh', source: 'tag', check: true }]); // a first name only, flagged by the seed
  const e = addChart(db, 'e.jpg', []); // no name at all
  const check = T.titlesToCheck(db);
  const ids = check.map((r) => r.id);
  assert.ok(ids.includes(d) && ids.includes(e), 'flagged and empty names are listed');
  assert.ok(ids.includes(db.prepare("SELECT id FROM images WHERE filename = 'b.jpg'").get().id), 'a flagged name is listed');
  assert.ok(!ids.includes(db.prepare("SELECT id FROM images WHERE filename = 'a.jpg'").get().id), 'a confirmed two-word name is not');
  assert.ok(!ids.includes(db.prepare("SELECT id FROM images WHERE filename = 'c.jpg'").get().id), 'an owner-set name is never listed');
  assert.deepEqual(check.find((r) => r.id === d).tags, ['Josh']);
  T.acceptTitle(db, d);
  assert.ok(!T.titlesToCheck(db).map((r) => r.id).includes(d), 'accepted = no longer listed');
  const s = T.titleStats(db);
  assert.equal(s.unnamed, 1);
  assert.ok(s.named >= 3 && s.by_owner === 1);
});

test('search by name: a word that starts any word of the name, any case; suggestions group by name', () => {
  addChart(db, 'f.jpg', []); T.setTitle(db, db.prepare("SELECT id FROM images WHERE filename = 'f.jpg'").get().id, 'John Smith');
  addChart(db, 'g.jpg', []); T.setTitle(db, db.prepare("SELECT id FROM images WHERE filename = 'g.jpg'").get().id, 'Elton John');
  addChart(db, 'h.jpg', []); T.setTitle(db, db.prepare("SELECT id FROM images WHERE filename = 'h.jpg'").get().id, 'Johnny Depp');
  addChart(db, 'i.jpg', []); T.setTitle(db, db.prepare("SELECT id FROM images WHERE filename = 'i.jpg'").get().id, 'Kyle Forgeard · NELK');
  const names = (q) => listImages(db, { name: q }).items.map((i) => i.title).sort();
  assert.deepEqual(names('john'), ['Elton John', 'John', 'John Smith', 'Johnny Depp']);
  assert.deepEqual(names('JOHN SMITH'), ['John Smith']);
  assert.deepEqual(names('smith'), ['John Smith']);
  assert.deepEqual(names('nelk'), ['Kyle Forgeard · NELK']);
  assert.deepEqual(names('ohn'), [], 'only the start of a word');
  assert.deepEqual(names('%'), [], 'LIKE wildcards are plain letters');
  const sug = T.suggestNames(db, 'jo');
  assert.equal(sug.count, 5, 'Josh too');
  assert.deepEqual(sug.names.map((n) => n.name).sort(), ['Elton John', 'John', 'John Smith', 'Johnny Depp', 'Josh']);
  const ctx = imageContext(db, db.prepare("SELECT id FROM images WHERE filename = 'f.jpg'").get().id, { name: 'smith' });
  assert.deepEqual(ctx, { index: 1, total: 1, prev: null, next: null });
});

test('API: set, accept, list to check, suggest; a name is trimmed and capped; snapshot shows it and never the password', async () => {
  const id = db.prepare("SELECT id FROM images WHERE filename = 'e.jpg'").get().id;
  let r = await api(`/api/images/${id}/title`, { method: 'PUT', body: JSON.stringify({ title: '  Some   Body  ' }) });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).title, 'Some Body');
  assert.equal(getImage(db, id).title_source, 'owner');
  r = await api(`/api/images/${id}/title`, { method: 'PUT', body: JSON.stringify({ title: 'x'.repeat(200) }) });
  assert.equal(r.status, 400);
  r = await api(`/api/images/${id}/title`, { method: 'PUT', body: JSON.stringify({}) });
  assert.equal(r.status, 400);
  r = await api('/api/images/999999/title', { method: 'PUT', body: JSON.stringify({ title: 'x' }) });
  assert.equal(r.status, 404);
  const bId = db.prepare("SELECT id FROM images WHERE filename = 'b.jpg'").get().id;
  r = await api(`/api/images/${bId}/title/ok`, { method: 'POST' });
  assert.equal((await r.json()).image.title_check, false);
  const check = await (await api('/api/titles/check')).json();
  assert.ok(Array.isArray(check.items) && typeof check.to_check === 'number');
  assert.ok(!check.items.some((i) => i.id === bId));
  const sug = await (await api('/api/names?q=john')).json();
  assert.equal(sug.count, 4);
  const list = await (await api('/api/images?name=smith')).json();
  assert.equal(list.total, 1);
  assert.equal((await fetch(base + '/api/names?q=john')).status, 401, 'locked like everything else');
  const snap = snapshot(db, { id: String(id) });
  assert.match(snap, /name: "Some Body" \(source owner\)/);
  assert.ok(!snap.includes('test-password'));
  const full = snapshot(db, { scope: 'full' });
  assert.match(full, /chart names: \d+ named/);
  assert.ok(!full.includes('test-password'));
});

test('shortName: first and last word, a lone word as is, Jr./II kept with the last name', async () => {
  const { shortName } = await import('../server/titles.js');
  assert.equal(shortName('Matthew David McConaughey'), 'Matthew McConaughey');
  assert.equal(shortName('Alexander Boris de Pfeffel Johnson'), 'Alexander Johnson');
  assert.equal(shortName('Ruhi Çenet'), 'Ruhi Çenet');
  assert.equal(shortName('Prince'), 'Prince');
  assert.equal(shortName('Paul William Chek Sr.'), 'Paul Chek Sr.');
  assert.equal(shortName('Russell Pierce Jones II'), 'Russell Jones II');
  assert.equal(shortName('  '), '');
});

test('the seed file in the repo is sound: one entry per filename, every name short and tidy, flagged ones are few', () => {
  const seed = T.loadTitleSeed();
  assert.ok(seed.length > 600, `expected the whole vault, got ${seed.length}`);
  const files = new Set();
  for (const s of seed) {
    assert.ok(typeof s.filename === 'string' && s.filename, 'filename');
    assert.ok(!files.has(s.filename), `duplicate ${s.filename}`); files.add(s.filename);
    assert.equal(typeof s.title, 'string');
    assert.equal(s.title, T.clean(s.title), `untidy name "${s.title}"`);
    assert.ok(['known', 'typed', 'tag', 'none'].includes(s.source), s.source);
    if (!s.title) assert.ok(s.check, `an empty name must be flagged (${s.filename})`);
  }
  const flagged = seed.filter((s) => s.check).length;
  assert.ok(flagged < 60, `${flagged} flagged`);
});
