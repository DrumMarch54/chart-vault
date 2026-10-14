import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Point the app at a throwaway data folder BEFORE importing config.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-test-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const sharp = (await import('sharp')).default;

const SAMPLE = { usertag: [
  { _data: '/DCIM/Screenshots/Screenshot_20251008_223530_Opera.jpg', tag: 'personA' },
  { _data: '/DCIM/Screenshots/Screenshot_20251008_223530_Opera.jpg', tag: '12mc' },
  { _data: '/DCIM/12 Mind Center/Screenshot_20251008_223530_Opera.jpg', tag: 'politics' },
  { _data: '/DCIM/Screenshots/Screenshot_20240910_115242_Firefox.jpg', tag: 'personB' },
  { _data: '/DCIM/Screenshots/Screenshot_20240910_115242_Firefox.jpg', tag: '12mc' },
  { _data: '/DCIM/Charts/Thinking, Feeling, Experiencing.jpg', tag: 'thinking' },
] };

let server, base, cookie, db;
const logs = [];
before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  const app = createApp(db, { log: (m) => logs.push(m) });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { cookie, ...(opts.headers || {}) } });
const json = async (r) => ({ status: r.status, body: await r.json() });

async function fakeJpeg(w = 300, h = 600, seed = 1) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: seed * 40 % 255, g: 90, b: 200 } } }).jpeg().toBuffer();
}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

test('everything is locked without login', async () => {
  for (const p of ['/api/images', '/api/status', '/api/tags', '/img/1', '/thumb/1']) {
    assert.equal((await fetch(base + p)).status, 401, p);
  }
  assert.equal((await fetch(base + '/api/import', { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await fetch(base + '/')).status, 200); // the shell itself is just HTML
});

test('wrong password is refused, right one sets a cookie', async () => {
  let r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'nope' }) });
  assert.equal(r.status, 401);
  r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }) });
  assert.equal(r.status, 200);
  const setCookie = r.headers.get('set-cookie');
  assert.match(setCookie, /cv_session=.*HttpOnly/);
  cookie = setCookie.split(';')[0];
  assert.deepEqual((await json(await api('/api/me'))).body, { loggedIn: true });
  // a forged cookie does not work
  const forged = await fetch(base + '/api/status', { headers: { cookie: 'cv_session=9999999999999.abc' } });
  assert.equal(forged.status, 401);
});

test('import the tag file and read the summary', async () => {
  const r = await json(await api('/api/import?filename=UserTag.backup', { method: 'POST', body: JSON.stringify(SAMPLE) }));
  assert.equal(r.status, 200);
  assert.equal(r.body.images_in_file, 3);
  assert.equal(r.body.new_images, 3);
  assert.equal(r.body.new_tags, 5);
  const bad = await json(await api('/api/import', { method: 'POST', body: 'not a backup' }));
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /not valid JSON|does not look like/);
});

test('status lists the missing files', async () => {
  const r = await json(await api('/api/status'));
  assert.equal(r.body.images, 3);
  assert.equal(r.body.uploaded, 0);
  assert.equal(r.body.missing_count, 3);
  assert.deepEqual(r.body.missing.map((m) => m.filename), ['Screenshot_20251008_223530_Opera.jpg', 'Screenshot_20240910_115242_Firefox.jpg', 'Thinking, Feeling, Experiencing.jpg']);
  assert.ok(r.body.last_import);
});

test('upload check only wants files from the tag file that are not uploaded', async () => {
  const names = ['Screenshot_20251008_223530_Opera.jpg', 'Screenshot_20251008_223530_Opera.jpg', 'random.jpg', 'Thinking, Feeling, Experiencing.jpg'];
  const r = await json(await api('/api/upload/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ names }) }));
  assert.deepEqual(r.body, { wanted: ['Screenshot_20251008_223530_Opera.jpg', 'Thinking, Feeling, Experiencing.jpg'], already: 0, unknown: 1 });
});

test('upload a file, get a thumbnail, second upload is skipped', async () => {
  const jpg = await fakeJpeg(300, 600, 1);
  let r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Screenshot_20251008_223530_Opera.jpg'), {
    method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-sha256': sha(jpg) }, body: jpg }));
  assert.equal(r.status, 200);
  assert.equal(r.body.already, false);
  assert.equal(r.body.width, 300);
  const id = r.body.id;

  r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Screenshot_20251008_223530_Opera.jpg'), { method: 'PUT', body: await fakeJpeg(10, 10, 2) }));
  assert.equal(r.body.already, true);

  const img = await api(`/img/${id}`);
  assert.equal(img.status, 200);
  assert.equal(Buffer.compare(Buffer.from(await img.arrayBuffer()), jpg), 0, 'stored file is byte-identical');
  const th = await api(`/thumb/${id}`);
  assert.equal(th.status, 200);
  assert.equal(th.headers.get('content-type'), 'image/webp');
  assert.ok((await th.arrayBuffer()).byteLength > 0);
  assert.ok(fs.existsSync(path.join(process.env.DATA_DIR, 'images', 'Screenshot_20251008_223530_Opera.jpg')));

  const check = await json(await api('/api/upload/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ names: ['Screenshot_20251008_223530_Opera.jpg'] }) }));
  assert.deepEqual(check.body, { wanted: [], already: 1, unknown: 0 });
});

test('damaged, non-image and unknown uploads are refused and leave nothing behind', async () => {
  const jpg = await fakeJpeg(100, 100, 3);
  let r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Screenshot_20240910_115242_Firefox.jpg'), {
    method: 'PUT', headers: { 'x-sha256': 'deadbeef' }, body: jpg }));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /checksum/);
  r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Screenshot_20240910_115242_Firefox.jpg'), { method: 'PUT', body: Buffer.from('this is text, not a picture') }));
  assert.equal(r.status, 400);
  r = await json(await api('/api/upload/file?name=random.jpg', { method: 'PUT', body: jpg }));
  assert.equal(r.status, 404);
  assert.equal(db.prepare("SELECT stored_path FROM images WHERE filename = 'Screenshot_20240910_115242_Firefox.jpg'").get().stored_path, null);
  assert.deepEqual(fs.readdirSync(path.join(process.env.DATA_DIR, 'images', '.tmp')), []);
  assert.deepEqual(fs.readdirSync(path.join(process.env.DATA_DIR, 'images')).sort(), ['.tmp', 'Screenshot_20251008_223530_Opera.jpg']);
});

test('a filename with commas and spaces is stored safely', async () => {
  const jpg = await fakeJpeg(120, 80, 4);
  const r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Thinking, Feeling, Experiencing.jpg'), { method: 'PUT', body: jpg }));
  assert.equal(r.status, 200);
  assert.ok(fs.existsSync(path.join(process.env.DATA_DIR, 'images', 'Thinking, Feeling, Experiencing.jpg')));
});

test('browse: newest first, AND filter, counts', async () => {
  let r = await json(await api('/api/images'));
  assert.equal(r.body.total, 3);
  assert.deepEqual(r.body.items.map((i) => i.filename), ['Screenshot_20251008_223530_Opera.jpg', 'Screenshot_20240910_115242_Firefox.jpg', 'Thinking, Feeling, Experiencing.jpg']);
  assert.equal(r.body.items[0].has_file, true);
  assert.equal(r.body.items[1].has_file, false);
  assert.deepEqual(r.body.items[0].tags.map((t) => t.name), ['personA', 'politics', '12mc']);

  r = await json(await api('/api/images?tag=12mc'));
  assert.equal(r.body.total, 2);
  r = await json(await api('/api/images?tag=12mc&tag=politics'));
  assert.equal(r.body.total, 1);
  assert.equal(r.body.items[0].filename, 'Screenshot_20251008_223530_Opera.jpg');
  r = await json(await api('/api/images?tag=12mc&tag=thinking'));
  assert.equal(r.body.total, 0);
  r = await json(await api('/api/images?uploaded=1'));
  assert.equal(r.body.total, 2);
});

test('tag suggestions: by prefix, with counts, narrowed by current filter', async () => {
  let r = await json(await api('/api/tags?q=p'));
  assert.deepEqual(r.body.map((t) => [t.name, t.count]), [['personA', 1], ['personB', 1], ['politics', 1]]);
  r = await json(await api('/api/tags?q=12'));
  assert.deepEqual(r.body.map((t) => [t.name, t.kind, t.count]), [['12mc', 'position', 2]]);
  r = await json(await api('/api/tags?within=12mc'));
  assert.deepEqual(r.body.map((t) => t.name).sort(), ['personA', 'personB', 'politics']); // 12mc itself excluded, thinking not combinable
  r = await json(await api('/api/tags?q=%25')); // LIKE wildcard typed by user is literal
  assert.deepEqual(r.body, []);
});

test('add and remove tags on a chart', async () => {
  const list = await json(await api('/api/images?tag=thinking'));
  const id = list.body.items[0].id;
  let r = await json(await api(`/api/images/${id}/tags`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Friend' }) }));
  assert.equal(r.body.added, true);
  assert.deepEqual(r.body.image.tags.map((t) => t.name), ['Friend', 'thinking']);
  r = await json(await api(`/api/images/${id}/tags`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '   ' }) }));
  assert.equal(r.status, 400);
  r = await json(await api(`/api/images/${id}/tags/remove`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'thinking' }) }));
  assert.equal(r.body.removed, true);
  assert.deepEqual(r.body.image.tags.map((t) => t.name), ['Friend']);
  // re-import does not bring 'thinking' back, but keeps 'Friend'
  await api('/api/import', { method: 'POST', body: JSON.stringify(SAMPLE) });
  r = await json(await api(`/api/images/${id}`));
  assert.deepEqual(r.body.tags.map((t) => t.name), ['Friend']);
  assert.deepEqual(r.body.paths, ['/DCIM/Charts/Thinking, Feeling, Experiencing.jpg']);
});

test('backup runs and the zip contains the database, tags and images', async () => {
  let r = await json(await api('/api/backup/run', { method: 'POST' }));
  assert.equal(r.status, 200);
  assert.match(r.body.result, /^ok/);
  const bdir = process.env.BACKUP_DIR;
  assert.ok(fs.existsSync(path.join(bdir, 'chart-vault.sqlite')));
  assert.ok(fs.existsSync(path.join(bdir, 'tags.json')));
  assert.ok(fs.existsSync(path.join(bdir, 'images', 'Screenshot_20251008_223530_Opera.jpg')));
  const tags = JSON.parse(fs.readFileSync(path.join(bdir, 'tags.json'), 'utf8'));
  assert.equal(tags.images.length, 3);
  const t = tags.images.find((i) => i.filename === 'Thinking, Feeling, Experiencing.jpg');
  assert.deepEqual(t.tags, ['Friend']);
  assert.deepEqual(t.removed_tags, ['thinking']);

  const zip = await api('/api/backup/download');
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  const buf = Buffer.from(await zip.arrayBuffer());
  assert.ok(buf.length > 1000);
  const text = buf.toString('latin1');
  for (const name of ['chart-vault.sqlite', 'tags.json', 'README.txt', 'images/Screenshot_20251008_223530_Opera.jpg', 'images/Thinking, Feeling, Experiencing.jpg']) {
    assert.ok(text.includes(name), `zip has ${name}`);
  }
  assert.ok(!text.includes('.tmp/'));
  const status = await json(await api('/api/status'));
  assert.ok(status.body.last_backup);
  assert.deepEqual(status.body.lost_files, []);
});

test('debug snapshot: locked, plain text, never shows the password, scopes and id work', async () => {
  assert.equal((await fetch(base + '/api/debug/snapshot')).status, 401);
  // scripts may use the password as a bearer token instead of the cookie
  const bearer = await fetch(base + '/api/debug/snapshot?scope=short', { headers: { authorization: 'Bearer test-password' } });
  assert.equal(bearer.status, 200);
  assert.equal((await fetch(base + '/api/debug/snapshot', { headers: { authorization: 'Bearer wrong' } })).status, 401);
  const short = await bearer.text();
  assert.match(short, /CHART VAULT SNAPSHOT/);
  assert.match(short, /charts with tags 3/);
  assert.match(short, /LAST 20 LOG LINES/);
  assert.ok(!short.includes('test-password'));
  assert.ok(!short.includes('MISSING SCREENSHOT FILENAMES'));
  const full = await (await api('/api/debug/snapshot?scope=full')).text();
  assert.match(full, /MISSING SCREENSHOT FILENAMES/);
  assert.match(full, /Screenshot_20240910_115242_Firefox.jpg/);
  assert.match(full, /IMPORT HISTORY/);
  const one = await (await api('/api/debug/snapshot?id=' + encodeURIComponent('Thinking, Feeling, Experiencing.jpg'))).text();
  assert.match(one, /^CHART \d+: Thinking, Feeling, Experiencing.jpg/);
  assert.match(one, /tags \(1\): Friend\[name,app\]/);
  assert.match(one, /removed in app: thinking/);
  assert.match(one, /on disk: image yes, thumb yes/);
  const none = await (await api('/api/debug/snapshot?id=999999')).text();
  assert.match(none, /No chart/);
});
