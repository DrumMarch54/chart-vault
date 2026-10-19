// What a number means in a position (server/meaning.js, GET /api/meaning): the course's own passages for the
// number IN THAT POSITION first, the balance verdict, the two parts of a center, and the vault count.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-meaning-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { setInputs } = await import('../server/positions.js');
const { meaningFor, countWith, topicsFor } = await import('../server/meaning.js');

const heads = (list) => list.map((p) => p.heading.split(' > ').pop());

test('mind center 12/3: the mind-center scrape, named 12, nothing about other numbers; unbalanced; made of 7 and 5', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 12, parts: [7, 5] });
  assert.equal(m.text, '12/3'); assert.equal(m.label, 'Mind center'); assert.equal(m.chartLabel, 'Name chart');
  assert.equal(m.name, 'The Expansive Dynamo'); assert.equal(m.verdict, 'unbalanced'); assert.equal(m.family, 'center');
  assert.ok(m.passages.length >= 3, 'passages');
  for (const p of m.passages) { assert.equal(p.source, 'name-chart-mind-and-emotion-centers', p.heading); assert.match(p.heading, /(^|\D)12(\D|$)/); }
  assert.match(heads(m.passages)[0], /12 MV/);
  assert.ok(!heads(m.passages).some((x) => /15 and 12|16 and 12|8 and 12|7 and 12/.test(x)), 'a pairing with another number is not about 12 alone');
  assert.equal(m.general.length, 0, 'enough specific passages, no general ones');
  assert.deepEqual(m.combo.parts, [7, 5]);
  assert.ok(m.combo.passages.length >= 1 && /5 \+ 7|7 \+ 5|5 and 7|7 and 5/.test(m.combo.passages[0].heading), 'the combo guide on 5 + 7');
  assert.ok(!m.combo.passages.some((p) => p.source === 'relations-book'), 'no relationship-between-people passages');
});

test('each name chart aura gets its own aura\'s passage, not another aura\'s', () => {
  const love = meaningFor({ chart: 'name', position: 'lowerRight', sum: 12 });
  assert.match(love.passages[0].heading, /love life aura/i); assert.equal(love.verdict, 'semi');
  const pub = meaningFor({ chart: 'name', position: 'upperLeft', sum: 9 });
  assert.match(pub.passages[0].heading, /brand aura/i);
  assert.ok(!heads(pub.passages).some((x) => /friends|associates|love/i.test(x)));
  const friends = meaningFor({ chart: 'name', position: 'upperRight', sum: 16 });
  assert.match(friends.passages[0].heading, /friends aura/i); assert.equal(friends.verdict, 'unbalanced');
  const assoc = meaningFor({ chart: 'personality', position: 'lowerLeft', sum: 12 });
  assert.match(assoc.passages[0].heading, /associates aura/i);
});

test('sub-charts: the sub-chart book first; emotion center main vibration before sub vibration', () => {
  const v = meaningFor({ chart: 'vocation', position: 'heart', sum: 12 });
  assert.equal(v.passages[0].source, 'subnumeroscope-interpretation-book'); assert.match(v.passages[0].heading, /Vocation/);
  const p = meaningFor({ chart: 'personality', position: 'heart', sum: 12 });
  assert.match(p.passages[0].heading, /Personality Heart Diamond/);
  const s = meaningFor({ chart: 'name', position: 'solar', sum: 12 });
  assert.match(s.passages[0].heading, /12 MV/); assert.equal(s.verdict, 'unbalanced');
});

test('a position the course says little about falls back to the number itself, from the number books', () => {
  const m = meaningFor({ chart: 'name', position: 'first', sum: 19 });
  assert.ok(m.passages.length < 2);
  assert.ok(m.general.length >= 1, 'general passages');
  for (const g of m.general) { assert.match(g.heading, /19/); assert.ok(!/^biz-/.test(g.source), g.source); }
  const y = meaningFor({ chart: 'essence', position: 'year', sum: 11 });
  assert.ok(y.general.length >= 1 && /11/.test(y.general[0].heading));
});

test('essence positions: outer aura 48 reads the outer diamond pages, the day vibration its own pages, no business books first', () => {
  const o = meaningFor({ chart: 'essence', position: 'outerAura', sum: 48, parts: [4, 8] });
  assert.match(o.passages[0].heading, /Outer Diamond 48/);
  assert.ok(!heads(o.passages).some((x) => /inner diamond/i.test(x)));
  const d = meaningFor({ chart: 'essence', position: 'day', sum: 19 });
  assert.match(d.passages[0].heading, /Day Vibration 19/i);
  for (const p of d.passages) assert.ok(!/^biz-/.test(p.source), p.source);
  const d5 = meaningFor({ chart: 'essence', position: 'day', sum: 5 });
  assert.ok(!/^biz-/.test(d5.passages[0].source));
  assert.deepEqual(topicsFor('essence', 'day'), ['dayVibration']);
  assert.deepEqual(topicsFor('outer', 'heart'), ['mindCenter', 'psyche']);
});

test('a center\'s extra vibration keeps the pairing with its main vibration; unknown positions and numbers are null', () => {
  const x = meaningFor({ chart: 'name', position: 'heartExtra', sum: 12, parts: [7, 5] });
  assert.ok(heads(x.passages).some((h) => /7 and 12|12 and 7|Sub vibration 12/i.test(h)), heads(x.passages).join(' | '));
  assert.ok(!heads(x.passages).some((h) => /15 and 12|16 and 12/.test(h)));
  assert.equal(meaningFor({ chart: 'name', position: 'nothing', sum: 12 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 0 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 100 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'anyName', sum: 12 }), null, 'the hidden duplicate is not a position');
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 7, parts: [3] }).combo, null);
});

test('every catalog position and every number 1-99 answers without throwing, with the verdict the balance lists give', async () => {
  const { POSITIONS } = await import('../server/positions.js');
  const { judge } = await import('../server/facts.js');
  let withWords = 0, total = 0;
  for (const p of POSITIONS.filter((q) => !q.hidden)) for (const n of [1, 5, 9, 12, 16, 18, 23, 48, 99]) {
    const m = meaningFor({ chart: p.chart, position: p.key, sum: n });
    assert.ok(m, `${p.chart}.${p.key} ${n}`);
    assert.equal(m.verdict, judge(p.chart, p.key, n));
    total++; if (m.passages.length || m.general.length) withWords++;
  }
  assert.ok(withWords / total > 0.9, `${withWords} of ${total} have words`);
});

let db, server, base;
before(async () => {
  ensureDirs();
  db = openDb();
  db.prepare("INSERT INTO images (filename, kind) VALUES ('a.jpg', 'chart'), ('b.jpg', 'chart'), ('c.jpg', 'chart')").run();
  setInputs(db, 1, { day: 19, month: 8, year: 1984, name: 'Katrine Ditte Pilmark' }, { source: 'read' }); // mind center 7
  setInputs(db, 2, { day: 19, month: 8, year: 1984, name: 'Katrine Pilmark' }, { source: 'read' });
  const app = createApp(db);
  server = app.listen(0); await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server && server.close(); db && db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
const get = (p) => fetch(base + p, { headers: { authorization: 'Bearer test-password' } });

test('GET /api/meaning: the meaning plus how many vault charts hold the number there; bad input is a 400; no password, no answer', async () => {
  assert.equal(countWith(db, 'name', 'heart', 7), 2, 'both Katrines: the upper auras are the same with or without the middle name');
  assert.equal(countWith(db, 'name', 'middle', 18), 1);
  const r = await get('/api/meaning?chart=name&position=heart&sum=7&parts=3,4');
  assert.equal(r.status, 200);
  const m = await r.json();
  assert.equal(m.count, 2); assert.equal(m.text, '7'); assert.equal(m.verdict, 'balanced'); assert.ok(m.passages.length);
  assert.deepEqual(m.combo.parts, [3, 4]);
  const none = await (await get('/api/meaning?chart=name&position=heart&sum=99')).json();
  assert.equal(none.count, 0);
  assert.equal((await get('/api/meaning?chart=name&position=heart&sum=abc')).status, 400);
  assert.equal((await get('/api/meaning?chart=x&position=heart&sum=7')).status, 400);
  assert.equal((await fetch(base + '/api/meaning?chart=name&position=heart&sum=7')).status, 401);
});
