// The person's photo (server/photos.js): the seed is sound, only seeded files are ever fetched, a fetched photo is
// kept on disk and never fetched twice, a failure is recorded, and the chart's person answer carries the photo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-photos-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { seedPeople, loadPeopleSeed, keyOf } = await import('../server/people.js');
const { loadPhotoSeed, photoFor, photoFile, photosReport } = await import('../server/photos.js');

const SEED = loadPhotoSeed();
const PEOPLE = new Map(loadPeopleSeed().map((p) => [keyOf(p.title), p]));

test('the photo seed: one per person, a known person, a Wikidata id, a Commons file and a licence', () => {
  assert.ok(SEED.length > 100, `only ${SEED.length} photos`);
  const seen = new Set();
  for (const e of SEED) {
    assert.ok(!seen.has(keyOf(e.title)), `${e.title} twice`); seen.add(keyOf(e.title));
    const p = PEOPLE.get(keyOf(e.title));
    assert.ok(p && p.kind === 'person', `${e.title} is not a person in chart-people.json`);
    assert.match(e.qid, /^Q\d+$/);
    assert.ok(e.file && !/[/\\]/.test(e.file), `${e.title}: bad file name`);
    assert.ok(e.license, `${e.title}: no licence`);
  }
});

test('photoFor: a seeded name (any case) gets a photo and its credit; anyone else none', () => {
  const e = SEED[0];
  const ph = photoFor(e.title.toUpperCase());
  assert.match(ph.url, new RegExp(`^/api/photos/${e.qid}-[0-9a-f]{8}\\.jpg$`));
  assert.equal(ph.license, e.license);
  assert.match(ph.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.equal(photoFor('Some Neighbor Nobody Knows'), null);
});

test('photoFile: fetched once, shrunk to a JPEG, kept; an unknown id is never fetched; a failure is recorded', async () => {
  const dir = path.join(tmp, 'photos');
  const id = photoFor(SEED[0].title).url.split('/').pop().replace(/\.jpg$/, '');
  const png = await sharp({ create: { width: 1200, height: 1600, channels: 4, background: '#c08040' } }).png().toBuffer();
  const asked = [];
  const fake = async (url) => { asked.push(url); return new Response(png, { status: 200 }); };
  assert.equal(await photoFile(dir, 'Q1-deadbeef', { fetchFn: fake }), null);
  assert.equal(await photoFile(dir, '../../etc/passwd', { fetchFn: fake }), null);
  assert.equal(asked.length, 0);
  const [a, b] = await Promise.all([photoFile(dir, id, { fetchFn: fake }), photoFile(dir, id, { fetchFn: fake })]);
  assert.equal(a, b);
  assert.equal(asked.length, 1, 'two phones at once still fetch once');
  assert.match(asked[0], /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
  const meta = await sharp(fs.readFileSync(a)).metadata();
  assert.equal(meta.format, 'jpeg'); assert.equal(meta.width, 480);
  await photoFile(dir, id, { fetchFn: fake });
  assert.equal(asked.length, 1, 'kept on disk, never fetched again');

  const id2 = photoFor(SEED[1].title).url.split('/').pop().replace(/\.jpg$/, '');
  await assert.rejects(photoFile(dir, id2, { fetchFn: async () => new Response('no', { status: 429 }) }), /429/);
  const rep = photosReport(dir).join('\n');
  assert.match(rep, /FAILED .* 429/); assert.match(rep, /fetched and kept on this server 1/);
});

let server, base, db;
before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  const e = SEED[0];
  seedPeople(db, [PEOPLE.get(keyOf(e.title)), { title: 'Some Neighbor', kind: 'person', summary: 'A neighbor.' }]);
  db.prepare("INSERT INTO images (filename, kind, title) VALUES ('a.jpg', 'chart', ?), ('b.jpg', 'chart', 'Some Neighbor')").run(e.title);
  server = createApp(db, { log: () => {} }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server && server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('the chart\'s person answer carries the photo; an unknown photo is a 404 that is never cached', async () => {
  const get = (p) => fetch(base + p, { headers: { authorization: 'Bearer test-password' } });
  const a = await (await get('/api/images/1/person')).json();
  assert.equal(a.person.photo.url, photoFor(SEED[0].title).url);
  const b = await (await get('/api/images/2/person')).json();
  assert.equal(b.person.photo, null);
  const r = await get('/api/photos/Q1-deadbeef.jpg');
  assert.equal(r.status, 404);
  assert.match(r.headers.get('cache-control') || '', /no-store/);
  assert.equal((await fetch(base + a.person.photo.url)).status, 401, 'behind the password like everything else');
});
