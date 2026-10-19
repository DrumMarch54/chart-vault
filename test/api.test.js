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
process.env.BUILD_COMMIT = 'testbld';
process.env.AUTODEPLOY_SCRIPT = path.join(tmp, 'installed-autodeploy.sh');
process.env.AUTODEPLOY_LOG = path.join(tmp, 'autodeploy.log');

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
  r = await json(await api('/api/tags?q=' + encodeURIComponent('12/3 mind center'))); // the spelled-out form finds the stored code
  assert.deepEqual(r.body.map((t) => t.name), ['12mc']);
  assert.equal(r.body[0].display, '12/3 Mind center'); // every tag row says how it reads on screen
  r = await json(await api('/api/tags?q=' + encodeURIComponent('person a'))); // typed with a space, finds the run-together tag
  assert.deepEqual(r.body.map((t) => t.name), ['personA']);
  r = await json(await api('/api/tags/names'));
  assert.equal(r.body['12mc'], '12/3 Mind center'); assert.equal(r.body.personA, 'Person A'); assert.equal(r.body.politics, 'Politics'); assert.equal(r.body.Friend, undefined);
  r = await json(await api('/api/images?ids=1,2,999'));
  assert.equal(r.body.items.length, 2); assert.equal(r.body.total, 2);
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

test('error answers are never cached, good ones keep their own rules', async () => {
  for (const p of ['/nope.css?v=abc', '/api/nope', '/api/images']) {
    const r = await fetch(base + p);
    assert.ok(r.status >= 400, p);
    assert.match(r.headers.get('cache-control') || '', /no-store/, p);
    assert.match(r.headers.get('cdn-cache-control') || '', /no-store/, p);
  }
  assert.equal((await fetch(base + '/CLAUDE.md')).status, 404, 'notes for Claude are not served');
  const ok = await fetch(base + '/app.css?v=x');
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('cache-control'), /immutable/);
});

test('sign-in link: wrong password is "Not authorised.", right one sets the cookie and drops it from the address', async () => {
  const bad = await fetch(base + '/?t=wrong', { redirect: 'manual' });
  assert.equal(bad.status, 401);
  assert.equal(await bad.text(), 'Not authorised.');
  assert.equal(bad.headers.get('set-cookie'), null);
  const good = await fetch(base + '/?t=test-password', { redirect: 'manual' });
  assert.equal(good.status, 302);
  assert.equal(good.headers.get('location'), '/');
  const c = good.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base + '/api/status', { headers: { cookie: c } })).status, 200);
});

test('health is open, says whether the caller is signed in, and shows the build', async () => {
  const anon = await (await fetch(base + '/api/health')).json();
  assert.equal(anon.authenticated, false);
  assert.equal(anon.commit, 'testbld');
  assert.equal(anon.configured, true);
  assert.equal(typeof anon.busy, 'boolean');
  const signed = await (await api('/api/health')).json();
  assert.equal(signed.authenticated, true);
  const bearer = await (await fetch(base + '/api/health', { headers: { authorization: 'Bearer test-password' } })).json();
  assert.equal(bearer.authenticated, true);
});

test('imports and uploads remember the build that made them', async () => {
  const imp = db.prepare('SELECT build FROM imports ORDER BY id DESC LIMIT 1').get();
  assert.equal(imp.build, 'testbld');
  const up = db.prepare('SELECT uploaded_build FROM images WHERE uploaded_at IS NOT NULL').all();
  assert.ok(up.length);
  for (const r of up) assert.equal(r.uploaded_build, 'testbld');
  const short = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(short, /commit testbld/);
  assert.match(short, /LAST IMPORT \S+ build testbld/);
});

test('deploy guard: missing, current, stale, and it needs the password', async () => {
  assert.equal((await fetch(base + '/api/deploy-guard')).status, 401);
  const installed = process.env.AUTODEPLOY_SCRIPT;
  let g = await (await api('/api/deploy-guard')).json();
  assert.equal(g.state, 'missing');
  assert.equal(g.ok, false);
  fs.copyFileSync(new URL('../deploy/autodeploy.sh', import.meta.url), installed);
  fs.writeFileSync(process.env.AUTODEPLOY_LOG, 'deploy log line\n');
  g = await (await api('/api/deploy-guard')).json();
  assert.equal(g.state, 'current');
  assert.equal(g.ok, true);
  assert.deepEqual(g.log_tail, ['deploy log line']);
  const old = new Date(Date.now() - 3600_000);
  fs.utimesSync(process.env.AUTODEPLOY_LOG, old, old);
  g = await (await api('/api/deploy-guard')).json();
  assert.equal(g.stalled, true);
  assert.equal(g.ok, false);
  fs.appendFileSync(installed, '# older\n');
  g = await (await api('/api/deploy-guard')).json();
  assert.equal(g.state, 'stale');
  const status = await (await api('/api/status')).json();
  assert.equal(status.updates.state, 'stale');
  assert.match(await (await api('/api/debug/snapshot?scope=short')).text(), /auto-update: stale/);
});

test('album folders: membership becomes a tag, unknown charts get created, uploads then work', async () => {
  // a chart that is only in an album, never in the tag file
  let r = await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'Screenshot_20250301_101010_Opera.jpg', album: '12 Mind Center' }) }));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { id: r.body.id, has_file: false, created: true, tagged: true, kind: 'chart' });
  const id = r.body.id;
  // again: nothing new
  r = await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'Screenshot_20250301_101010_Opera.jpg', album: '12 Mind Center' }) }));
  assert.deepEqual(r.body, { id, has_file: false, created: false, tagged: false, kind: 'chart' });
  // a known, already-uploaded chart just gets the album tag
  r = await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'Screenshot_20251008_223530_Opera.jpg', album: 'Charts' }) }));
  assert.equal(r.body.has_file, true); assert.equal(r.body.created, false); assert.equal(r.body.tagged, true);
  let img = await json(await api(`/api/images/${r.body.id}`));
  assert.ok(img.body.tags.some((t) => t.name === 'Charts' && t.source === 'album'));
  assert.ok(img.body.paths.includes('/DCIM/Charts/Screenshot_20251008_223530_Opera.jpg'));
  // the new chart can now be uploaded like any other
  const jpg = await fakeJpeg(90, 160, 7);
  r = await json(await api('/api/upload/file?name=' + encodeURIComponent('Screenshot_20250301_101010_Opera.jpg'), { method: 'PUT', body: jpg }));
  assert.equal(r.status, 200); assert.equal(r.body.already, false);
  img = await json(await api(`/api/images/${id}`));
  assert.equal(img.body.has_file, true);
  assert.deepEqual(img.body.tags.map((t) => t.name), ['12 Mind Center']);
  assert.equal(img.body.taken_at, '2025-03-01T10:10:10');
  // a removed album tag stays removed
  await postJsonT(`/api/images/${id}/tags/remove`, { name: '12 Mind Center' });
  r = await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'Screenshot_20250301_101010_Opera.jpg', album: '12 Mind Center' }) }));
  assert.equal(r.body.tagged, false);
  img = await json(await api(`/api/images/${id}`));
  assert.deepEqual(img.body.tags, []);
  // bad input
  r = await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: '', album: 'x' }) }));
  assert.equal(r.status, 400);
  // re-importing the tag file does not disturb album tags or the new chart
  await api('/api/import', { method: 'POST', body: JSON.stringify(SAMPLE) });
  img = await json(await api(`/api/images/${id}`));
  assert.equal(img.body.has_file, true);
});
async function postJsonT(p, data) { return api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }); }

test('archetype pics: separate kind, number tags from the album name, kept out of the chart list', async () => {
  const mark = async (filename, album, tags, kind) => json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename, album, tags, kind }) }));
  let r = await mark('arch1.jpg', '69 and 96 pics', ['69', '96'], 'archetype');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { id: r.body.id, has_file: false, created: true, tagged: true, kind: 'archetype' });
  const id = r.body.id;
  await mark('arch2.jpg', '15 pics', ['15'], 'archetype');
  // an existing chart marked again as archetype keeps being a chart
  r = await mark('Screenshot_20251008_223530_Opera.jpg', '15 pics', ['15'], 'archetype');
  assert.equal(r.body.kind, 'chart');
  // charts list does not show archetype pics; archetype list does not show charts
  const charts = await json(await api('/api/images'));
  assert.ok(!charts.body.items.some((i) => i.filename.startsWith('arch')));
  const arch = await json(await api('/api/images?kind=archetype'));
  assert.deepEqual(arch.body.items.map((i) => i.filename).sort(), ['arch1.jpg', 'arch2.jpg']);
  assert.equal(arch.body.items.find((i) => i.filename === 'arch1.jpg').tags.map((t) => t.name).join(','), '69,96');
  // tag 15 exists on both sides; each side counts only its own pictures
  const sugC = await json(await api('/api/tags?q=15'));
  const sugA = await json(await api('/api/tags?q=15&kind=archetype'));
  assert.ok(sugC.body.find((t) => t.name === '15').count >= 1);
  assert.deepEqual(sugA.body.map((t) => [t.name, t.count]), [['15', 1]]);
  const both = await json(await api('/api/images?kind=archetype&tag=69&tag=96'));
  assert.equal(both.body.total, 1);
  // the All tags list counts charts and archetype pics apart for every tag
  const all = await json(await api('/api/tags/all'));
  const t15 = all.body.find((t) => t.name === '15');
  assert.equal(t15.archetypes, 1); assert.ok(t15.charts >= 1); assert.equal(t15.count, t15.charts + t15.archetypes);
  assert.deepEqual(all.body.find((t) => t.name === '69'), { name: '69', kind: 'number', count: 1, charts: 0, archetypes: 1, display: '69/6' });
  // status counts them apart; missing list is charts only
  const st = await json(await api('/api/status'));
  assert.equal(st.body.archetypes, 2);
  assert.ok(!st.body.missing.some((m) => m.filename.startsWith('arch')));
  // detail says what it is; bad kind refused
  const one = await json(await api(`/api/images/${id}`));
  assert.equal(one.body.kind, 'archetype');
  r = await mark('arch3.jpg', 'x', ['1'], 'banana');
  assert.equal(r.status, 400);
});

test('viewer context: previous and next within the current filter and order', async () => {
  const all = await json(await api('/api/images'));
  const ids = all.body.items.map((i) => i.id);
  let c = await json(await api(`/api/images/${ids[0]}/context`));
  assert.deepEqual(c.body, { index: 1, total: all.body.total, prev: null, next: ids[1] });
  c = await json(await api(`/api/images/${ids[1]}/context`));
  assert.equal(c.body.prev, ids[0]); assert.equal(c.body.index, 2);
  const f = await json(await api('/api/images?tag=12mc'));
  const fids = f.body.items.map((i) => i.id);
  c = await json(await api(`/api/images/${fids[fids.length - 1]}/context?tag=12mc`));
  assert.deepEqual(c.body, { index: fids.length, total: fids.length, prev: fids.length > 1 ? fids[fids.length - 2] : null, next: null });
  // a chart outside the filter has no place in it
  const outside = await json(await api('/api/images?tag=thinking'));
  if (outside.body.items.length) {
    c = await json(await api(`/api/images/${outside.body.items[0].id}/context?tag=12mc`));
    assert.equal(c.body.index, null);
  }
  assert.equal((await api('/api/images/999999/context')).status, 404);
});

test('quick chart "Save to vault": a PNG becomes a chart tagged with the typed name; a bad save leaves no record', async () => {
  const png = await sharp({ create: { width: 806, height: 1270, channels: 3, background: '#fff' } }).png().toBuffer();
  let r = await json(await api('/api/quick/save?name=' + encodeURIComponent('Peter Joshua Shicora') + '&date=1998-05-19', { method: 'PUT', headers: { 'x-sha256': sha(png) }, body: png }));
  assert.equal(r.status, 200); assert.equal(r.body.already, false); assert.equal(r.body.width, 806);
  const img = (await json(await api(`/api/images/${r.body.id}`))).body;
  assert.match(img.filename, /^Quick_Peter-Joshua-Shicora_1998-05-19_\d{8}_\d{6}\.png$/);
  assert.equal(img.has_file, true); assert.equal(img.kind, 'chart');
  assert.deepEqual(img.tags.map((t) => [t.name, t.kind]), [['Peter Joshua Shicora', 'name']]);
  assert.ok(img.paths.includes(`/Quick chart/${img.filename}`)); assert.ok(img.taken_at);
  // the typed name and date are its inputs: drawn by the app, searchable by position, year rows
  assert.deepEqual(img.inputs, { day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' });
  assert.equal(db.prepare('SELECT source FROM chart_inputs WHERE image_id = ?').get(img.id).source, 'quick');
  assert.ok((await json(await api(`/api/images/${img.id}/numbers`))).body.charts.length > 0);
  // a save from before 2026-10-17 had no inputs: the startup sweep reads them off the tag and the filename
  const { seedQuickInputs } = await import('../server/positions.js');
  db.prepare("INSERT INTO images (filename, taken_at, kind) VALUES ('Quick_Jane-Doe_1990-02-03_20261010_101010.png', '2026-10-10T10:10:10', 'chart')").run();
  const old = db.prepare("SELECT id FROM images WHERE filename = 'Quick_Jane-Doe_1990-02-03_20261010_101010.png'").get().id;
  db.prepare("INSERT OR IGNORE INTO tags (name, kind) VALUES ('Jane Doe', 'name')").run();
  db.prepare("INSERT INTO image_tags (image_id, tag_id, source) VALUES (?, (SELECT id FROM tags WHERE name = 'Jane Doe'), 'app')").run(old);
  assert.deepEqual(seedQuickInputs(db), { added: 1, looked: 1 });
  assert.deepEqual((await json(await api(`/api/images/${old}`))).body.inputs, { day: 3, month: 2, year: 1990, name: 'Jane Doe' });
  assert.deepEqual(seedQuickInputs(db), { added: 0, looked: 0 });
  // refused: no name, or not a picture; nothing is left behind
  const before = db.prepare('SELECT COUNT(*) AS n FROM images').get().n;
  r = await json(await api('/api/quick/save?name=', { method: 'PUT', body: png })); assert.equal(r.status, 400);
  r = await json(await api('/api/quick/save?name=Bob', { method: 'PUT', body: Buffer.from('not a picture') })); assert.equal(r.status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM images').get().n, before);
  assert.equal((await json(await api('/api/quick/save?name=Bob', { method: 'GET' }))).status, 404);
});

test('usage: names and counts only, bad names dropped, shown on status and in the snapshot', async () => {
  const bump = (name) => api('/api/usage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  assert.equal((await fetch(base + '/api/usage', { method: 'POST' })).status, 401);
  for (const n of ['screen.status', 'screen.status', 'viewer.add_tag']) assert.equal((await bump(n)).status, 200);
  // a name that is not a plain name (a tag, a filename, typed text) is dropped, never stored, never an error the phone sees
  for (const bad of ['Screenshot_20251008.jpg', 'tag with spaces', 'x'.repeat(61), '', 42]) assert.equal((await bump(bad)).status, 200);
  const list = (await json(await api('/api/usage'))).body;
  assert.deepEqual(list.map((r) => [r.name, r.count]), [['screen.status', 2], ['viewer.add_tag', 1]]);
  const status = (await json(await api('/api/status'))).body;
  assert.equal(status.usage[0].name, 'screen.status');
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, /WHAT YOU USE MOST[\s\S]*screen\.status 2/);
  assert.doesNotMatch(snap, /Screenshot_20251008\.jpg 1/);
});

test('my chart: locked, empty at first, saved on the server, bad dates refused, shown in the snapshot', async () => {
  assert.equal((await fetch(base + '/api/mychart')).status, 401);
  const empty = await (await api('/api/mychart')).json();
  assert.equal(empty.day, 0); assert.equal(empty.name, '');
  const bad = await api('/api/mychart', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'X', day: 32, month: 1, year: 1990 }) });
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /birth date/);
  const ok = await (await api('/api/mychart', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '  Peter Joshua Shicora ', day: '21', month: '10', year: '1985' }) })).json();
  assert.equal(ok.name, 'Peter Joshua Shicora'); assert.equal(ok.day, 21); assert.equal(ok.year, 1985);
  const again = await (await api('/api/mychart')).json();
  assert.equal(again.month, 10);
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, /My chart: Peter Joshua Shicora 21\.10\.1985/);
  // Clearing the date is allowed; the name can stay.
  const cleared = await (await api('/api/mychart', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Peter', day: '', month: '', year: '' }) })).json();
  assert.equal(cleared.day, 0); assert.equal(cleared.name, 'Peter');
});

test('drawn charts: list rows and the chart carry the read name and date; ?drawn=0 lists the ones still showing the screenshot', async () => {
  const { setInputs } = await import('../server/positions.js');
  const all = (await json(await api('/api/images?limit=200'))).body.items.filter((i) => !i.inputs);
  assert.ok(all.length >= 2);
  const drawnOne = all[0], plainOne = all[1];
  setInputs(db, drawnOne.id, { day: 21, month: 10, year: 1985, name: 'Peter Joshua Shicora' }, { source: 'owner' });
  const after = (await json(await api('/api/images?limit=200'))).body.items;
  const d = after.find((i) => i.id === drawnOne.id), p = after.find((i) => i.id === plainOne.id);
  assert.deepEqual(d.inputs, { day: 21, month: 10, year: 1985, name: 'Peter Joshua Shicora' });
  assert.equal(p.inputs, null);
  const one = (await json(await api(`/api/images/${drawnOne.id}`))).body;
  assert.deepEqual(one.inputs, { day: 21, month: 10, year: 1985, name: 'Peter Joshua Shicora' });
  assert.equal((await json(await api(`/api/images/${plainOne.id}`))).body.inputs, null);
  const undrawn = (await json(await api('/api/images?drawn=0&limit=200'))).body;
  assert.ok(!undrawn.items.some((i) => i.id === drawnOne.id));
  assert.ok(undrawn.items.some((i) => i.id === plainOne.id));
  assert.equal(undrawn.total, after.filter((i) => !i.inputs).length);
  const drawn = (await json(await api('/api/images?drawn=1&limit=200'))).body;
  assert.ok(drawn.items.some((i) => i.id === drawnOne.id));
  assert.ok(!drawn.items.some((i) => i.id === plainOne.id));
  assert.equal(drawn.total, after.filter((i) => i.inputs).length);
  // the viewer's swipes follow the same list
  const ctx = (await json(await api(`/api/images/${plainOne.id}/context?drawn=0`))).body;
  assert.equal(ctx.total, undrawn.total);
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, new RegExp(`DRAWN CHARTS: ${drawn.total} charts are drawn`));
  assert.match(snap, /still show the screenshot/);
  db.prepare('DELETE FROM chart_inputs WHERE image_id = ?').run(drawnOne.id);
  db.prepare('DELETE FROM chart_values WHERE image_id = ?').run(drawnOne.id);
});

test('delete a chart: picture goes to the trash, record kept, imports skip it, restore brings everything back', async () => {
  const { paths } = await import('../server/config.js');
  // a chart with a picture, a tag added in the app, and a typed name and date
  const items = (await json(await api('/api/images?limit=200&uploaded=1'))).body.items;
  const target = items.find((i) => i.has_file && i.filename === 'Screenshot_20251008_223530_Opera.jpg');
  assert.ok(target, 'needs an uploaded chart from the tag file');
  await api(`/api/images/${target.id}/tags`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'keepme' }) });
  await api(`/api/images/${target.id}/inputs`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' }) });
  const before = (await json(await api(`/api/images/${target.id}`))).body;
  const fullBefore = path.join(paths.images, db.prepare('SELECT stored_path FROM images WHERE id = ?').get(target.id).stored_path);
  assert.ok(fs.existsSync(fullBefore));
  const tagNames = before.tags.map((t) => t.name);
  assert.ok(tagNames.includes('keepme'));

  // locked without login, 404 for a chart that is not there
  assert.equal((await fetch(base + `/api/images/${target.id}`, { method: 'DELETE' })).status, 401);
  assert.equal((await api('/api/images/999999', { method: 'DELETE' })).status, 404);

  const r = await json(await api(`/api/images/${target.id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'wrong person' }) }));
  assert.equal(r.status, 200);
  assert.equal(r.body.filename, target.filename);
  assert.equal(r.body.file_kept, true);
  assert.equal((await api(`/api/images/${target.id}`)).status, 404);
  assert.ok(!fs.existsSync(fullBefore), 'picture left the images folder');
  assert.ok(fs.readdirSync(paths.trash).some((f) => f.startsWith(`${target.id}_`)), 'picture is in the trash');
  assert.ok(!(await json(await api('/api/images?limit=200'))).body.items.some((i) => i.id === target.id));
  // the tags themselves are still there
  assert.ok(db.prepare('SELECT 1 FROM tags WHERE name = ?').get('keepme'));

  const del = (await json(await api('/api/deleted'))).body.items;
  const mine = del.find((d) => d.filename === target.filename);
  assert.ok(mine);
  assert.equal(mine.reason, 'wrong person');
  assert.ok(mine.tags.includes('keepme'));
  assert.equal(mine.inputs.name, 'Peter Joshua Shicora');
  assert.equal(mine.has_file, true);
  assert.equal((await api(`/api/deleted/${mine.id}/thumb`)).status, 200);
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, /deleted charts \(in the trash, restorable\) 1/);
  assert.match(snap, new RegExp(`deleted .* ${target.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

  // re-importing the tag file does not bring it back; the album import neither
  const imp = (await json(await api('/api/import?filename=UserTag.backup', { method: 'POST', body: JSON.stringify(SAMPLE) }))).body;
  assert.equal(imp.skipped_deleted, 1);
  assert.equal((await api(`/api/images?limit=200`)).status, 200);
  assert.ok(!db.prepare('SELECT 1 FROM images WHERE filename = ?').get(target.filename));
  const alb = (await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: target.filename, album: 'Some album' }) }))).body;
  assert.equal(alb.deleted, true);
  assert.ok(!db.prepare('SELECT 1 FROM images WHERE filename = ?').get(target.filename));

  // restore: same filename, tags, name and date, picture back in place
  const back = (await json(await api(`/api/deleted/${mine.id}/restore`, { method: 'POST' }))).body;
  assert.equal(back.filename, target.filename);
  const after = (await json(await api(`/api/images/${back.id}`))).body;
  assert.deepEqual(after.tags.map((t) => t.name).sort(), tagNames.sort());
  assert.deepEqual(after.inputs, { day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' });
  assert.equal(after.has_file, true);
  assert.equal((await api(`/img/${back.id}`)).status, 200);
  assert.equal((await api(`/thumb/${back.id}`)).status, 200);
  assert.equal((await json(await api('/api/deleted'))).body.items.length, 0);
  assert.equal((await api(`/api/deleted/${mine.id}/restore`, { method: 'POST' })).status, 404);
  db.prepare('DELETE FROM chart_inputs WHERE image_id = ?').run(back.id);
  db.prepare('DELETE FROM chart_values WHERE image_id = ?').run(back.id);
});

test('possible duplicates: same picture or same name and date are listed; "keep both" hides a group', async () => {
  const { setInputs } = await import('../server/positions.js');
  // two charts with the same name and date
  const items = (await json(await api('/api/images?limit=200'))).body.items.filter((i) => !i.inputs);
  const [a, b, c] = items;
  setInputs(db, a.id, { day: 1, month: 2, year: 1990, name: 'Twin Person' }, { source: 'owner' });
  setInputs(db, b.id, { day: 1, month: 2, year: 1990, name: 'twin  person' }, { source: 'owner' });
  setInputs(db, c.id, { day: 2, month: 2, year: 1990, name: 'Twin Person' }, { source: 'owner' });
  let d = (await json(await api('/api/duplicates'))).body;
  const g = d.groups.find((x) => x.why === 'same name and birth date' && x.charts.some((ch) => ch.id === a.id));
  assert.ok(g);
  assert.deepEqual(g.charts.map((ch) => ch.id).sort(), [a.id, b.id].sort());
  assert.ok(!g.charts.some((ch) => ch.id === c.id));
  // the same picture twice: a second chart with the very same bytes
  const bytes = await fakeJpeg(300, 600, 7);
  const files = [];
  for (const f of ['Screenshot_20260301_000001_Opera.jpg', 'Screenshot_20260301_000002_Opera.jpg']) files.push((await json(await api('/api/album/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: f, album: 'Twins' }) }))).body);
  const [p, q] = files.map((r, i) => ({ id: r.id, filename: `Screenshot_20260301_00000${i + 1}_Opera.jpg` }));
  for (const f of [p, q]) {
    const r = await api(`/api/upload/file?name=${encodeURIComponent(f.filename)}`, { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-sha256': sha(bytes) }, body: bytes });
    assert.equal(r.status, 200, f.filename);
  }
  d = (await json(await api('/api/duplicates'))).body;
  const pic = d.groups.find((x) => x.why === 'same picture' && x.charts.some((ch) => ch.id === p.id));
  assert.ok(pic);
  assert.deepEqual(pic.charts.map((ch) => ch.id).sort(), [p.id, q.id].sort());
  assert.equal(d.groups.indexOf(pic), 0, 'same picture comes first');
  // keep both: the group goes away and stays away; a bad ask is refused
  assert.equal((await api('/api/duplicates/keep', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [a.id] }) })).status, 400);
  await api('/api/duplicates/keep', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: [b.id, a.id] }) });
  d = (await json(await api('/api/duplicates'))).body;
  assert.ok(!d.groups.some((x) => x.charts.some((ch) => ch.id === a.id)));
  assert.equal(d.kept, 1);
  assert.ok(d.groups.some((x) => x.key === pic.key));
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, /possible duplicates: 1 groups \(1 same picture\), 1 kept on purpose/);
  for (const id of [a.id, b.id, c.id]) { db.prepare('DELETE FROM chart_inputs WHERE image_id = ?').run(id); db.prepare('DELETE FROM chart_values WHERE image_id = ?').run(id); }
});
