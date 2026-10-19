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
const { meaningFor, countWith, topicsFor, bitsFor } = await import('../server/meaning.js');

const heads = (list) => list.map((p) => p.heading.split(' > ').pop());

test('mind center 12/3 with 8 in its circle: 12 alone, then 12 with 8, then the mental diamond behind it', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 12, pair: [8], rel: [{ position: 'mindDiamond', sum: 75 }] });
  assert.equal(m.text, '12/3'); assert.equal(m.label, 'Mind center'); assert.equal(m.chartLabel, 'Name chart');
  assert.equal(m.name, 'The Expansive Dynamo'); assert.equal(m.verdict, 'unbalanced'); assert.equal(m.family, 'center');
  assert.ok(m.passages.length >= 3, 'passages');
  for (const p of m.passages) { assert.equal(p.source, 'name-chart-mind-and-emotion-centers', p.heading); assert.match(p.heading, /(^|\D)12(\D|$)/); }
  assert.match(heads(m.passages)[0], /12 MV/);
  assert.ok(!heads(m.passages).some((x) => /(15|16|8|7) and 12/.test(x)), 'a pairing with another number is not about 12 alone');
  assert.deepEqual(m.pair.with.map((x) => x.sum), [8]);
  assert.ok(m.pair.passages.length >= 2);
  for (const p of m.pair.passages) assert.match(p.heading + ' ' + p.text.slice(0, 60), /\b(8 and 12|12 and 8|12\/3 and 8|8 and 12\/3|3 \+ 8)/);
  assert.equal(m.related.length, 1); assert.equal(m.related[0].label, 'Mental diamond'); assert.equal(m.related[0].text, '75/3');
});

test('Allison Frank, mind center 7 with 13/4: no passage about 7 with 11/2, and the circle pair 7 and 13 is found', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 7, pair: [13], rel: [{ position: 'mindDiamond', sum: 61 }] });
  const all = m.passages.map((p) => p.text).join('\n');
  assert.doesNotMatch(all, /11\/2 and 7|7 and 11\/2/, 'the "11/2 and 7 in a heart center" paragraph is about another pair');
  assert.match(heads(m.pair.passages)[0], /7 and 13 in the mind center/);
  // the mental diamond on the NAME chart never reads a vocation or personality heart diamond passage
  for (const p of m.related[0].passages) assert.doesNotMatch(p.heading, /vocation|personality/i);
});

test('each name chart aura gets its own aura\'s passage, not another aura\'s', () => {
  const love = meaningFor({ chart: 'name', position: 'lowerRight', sum: 12 });
  assert.match(love.passages[0].heading, /love life aura/i); assert.equal(love.verdict, 'semi');
  const pub = meaningFor({ chart: 'name', position: 'upperLeft', sum: 9 });
  assert.match(pub.passages[0].heading, /brand aura/i);
  assert.ok(!heads(pub.passages).some((x) => /friends|associates|love/i.test(x)));
  const friends = meaningFor({ chart: 'name', position: 'upperRight', sum: 16 });
  assert.match(friends.passages[0].heading, /friends aura/i); assert.equal(friends.verdict, 'unbalanced');
  const assoc = meaningFor({ chart: 'name', position: 'lowerLeft', sum: 12 });
  assert.match(assoc.passages[0].heading, /associates aura/i);
  assert.deepEqual(meaningFor({ chart: 'personality', position: 'lowerLeft', sum: 12 }).passages.filter((p) => /^name-chart-/.test(p.source)), [], 'a name chart aura is not a sub-chart aura');
});

test('sub-charts: the sub-chart guide\'s own words for the spot first, the name chart\'s center after, a heart diamond only as the diamond', () => {
  const v = meaningFor({ chart: 'vocation', position: 'heart', sum: 7, rel: [{ position: 'mindDiamond', sum: 39 }] });
  assert.equal(v.passages[0].source, 'subvibrations-book'); assert.equal(v.passages[0].heading, 'Vocation Chart Heart Center');
  assert.match(v.passages[0].text, /^Also excellent\. The 7 brings a deep sense of spirituality/);
  assert.doesNotMatch(v.passages[0].text, /pts/, 'the point score is cut, the words kept');
  assert.ok(v.passages.every((p) => !/^name-chart-/.test(p.source)), 'the name chart has its own section');
  assert.equal(v.nameChart.chart, 'name'); assert.ok(v.nameChart.passages.length >= 1);
  assert.match(v.nameChart.passages[0].heading, /7 MV/);
  assert.match(heads(v.related[0].passages)[0], /Heart Diamond \(Vocation\)/);
  const v12 = meaningFor({ chart: 'vocation', position: 'heart', sum: 12 });
  assert.ok(!heads(v12.passages).some((x) => /heart diamond/i.test(x)), 'the diamond 12 is not the center 12');
  const s9 = meaningFor({ chart: 'vocation', position: 'solar', sum: 9 });
  assert.match(s9.passages[0].text, /A 9 in the solar plexus is generally very challenging/);
  const p11 = meaningFor({ chart: 'personality', position: 'heart', sum: 11 });
  assert.equal(p11.passages[0].heading, 'Personality Chart Heart Main Vibrations');
  const hd = meaningFor({ chart: 'vocation', position: 'le', sum: 15 });
  assert.match(heads(hd.passages)[0], /Heart.s Desire Numbers/);
  assert.ok(heads(hd.passages).some((x) => /digit sum of 15/.test(x)));
  const aura = meaningFor({ chart: 'vocation', position: 'upperLeft', sum: 12 });
  assert.equal(aura.nameChart, null, 'a name chart aura (brand, friends, ...) is not a sub-chart aura');
  const s = meaningFor({ chart: 'name', position: 'solar', sum: 12 });
  assert.match(s.passages[0].heading, /12 MV/); assert.equal(s.verdict, 'unbalanced'); assert.equal(s.nameChart, null);
});

test('the outer aura never shows a number\'s own diamond or a name chart aura; the outer diamond comes from the essence codes', () => {
  const o = meaningFor({ chart: 'essence', position: 'outerAura', sum: 7, rel: [{ position: 'outerDiamond', sum: 25 }] });
  const every = [...o.passages, ...o.related.flatMap((r) => r.passages)];
  for (const p of every) {
    assert.doesNotMatch(p.heading + ' ' + p.text.slice(0, 300), /(big|little|small) diamond|NUMBER 7 - DIAMOND|diamond of the number/i, p.heading);
    assert.ok(!/^(diamond-method|name-chart-|name-numeroscope)/.test(p.source), p.source);
  }
  assert.match(heads(o.related[0].passages)[0], /Outer Diamond 25/);
});

test('no general descriptions of a number: only what the course says about it in that spot; never a business book', () => {
  const m = meaningFor({ chart: 'name', position: 'first', sum: 19 });
  assert.equal(m.general, undefined);
  for (const p of m.passages) assert.ok(!/^(book-|guide-|other-guide-|numbers-1-99-website|number-notes|biz-)/.test(p.source), p.source);
  const d = meaningFor({ chart: 'essence', position: 'day', sum: 19 });
  assert.match(d.passages[0].heading, /Day Vibration 19/i);
  for (const p of d.passages) assert.ok(!/^biz-/.test(p.source), p.source);
  assert.deepEqual(topicsFor('essence', 'day'), ['dayVibration']);
  assert.deepEqual(topicsFor('outer', 'heart'), ['mindCenter', 'psyche']);
});

test('an extra vibration pairs with its main vibration; unknown positions and numbers are null', () => {
  const x = meaningFor({ chart: 'name', position: 'heartExtra', sum: 13, pair: [7] });
  assert.ok(heads(x.passages).every((h) => !/7 and 13/.test(h)), 'the pair is its own section');
  assert.match(heads(x.pair.passages)[0], /7 and 13 in the mind center/);
  assert.equal(meaningFor({ chart: 'name', position: 'nothing', sum: 12 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 0 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 100 }), null);
  assert.equal(meaningFor({ chart: 'name', position: 'anyName', sum: 12 }), null, 'the hidden duplicate is not a position');
  const plain = meaningFor({ chart: 'name', position: 'heart', sum: 7, rel: [{ position: 'bogus', sum: 3 }, { position: 'mindDiamond', sum: 0 }] });
  assert.equal(plain.pair, null); assert.deepEqual(plain.related, []);
});

test('every catalog position answers without throwing, with the verdict the balance lists give', async () => {
  const { POSITIONS } = await import('../server/positions.js');
  const { judge } = await import('../server/facts.js');
  let withWords = 0, total = 0;
  for (const p of POSITIONS.filter((q) => !q.hidden)) for (const n of [1, 5, 9, 12, 16, 18, 23, 48, 99]) {
    const m = meaningFor({ chart: p.chart, position: p.key, sum: n });
    assert.ok(m, `${p.chart}.${p.key} ${n}`);
    assert.equal(m.verdict, judge(p.chart, p.key, n));
    total++; if (m.passages.length) withWords++;
  }
  assert.ok(withWords > 100, `${withWords} of ${total} have words`);
});

test('a long course section is one card, and the short points ride with it (Allison Frank, mind center 7 with 13/4)', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 7, pair: [13] });
  const mv = m.passages.filter((p) => /7 MV$/.test(p.heading));
  assert.equal(mv.length, 1, 'the "7 MV" section is one card, not two');
  assert.match(mv[0].text, /^With a 7 in your heart center/); assert.match(mv[0].text, /untrustworthy\.$/);
  assert.deepEqual(m.bits.groups.map((g) => g.title), ['In balance', 'Out of balance']);
  assert.ok(m.pair.bits && m.pair.bits.groups[0].points.length >= 3);
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 9 }).bits, null, 'no points written yet = none shown');
  // every point file entry is well formed and names real course files
  const all = JSON.parse(fs.readFileSync(new URL('../knowledge/bits.json', import.meta.url), 'utf8')).bits;
  for (const [key, b] of Object.entries(all)) {
    assert.match(key, /^[a-z]+\.[A-Za-z]+:\d{1,2}(\+\d{1,2})?$/, key);
    assert.ok(b.groups.length && b.groups.every((g) => typeof g.title === 'string' && g.points.length), key);
    for (const src of b.sources) assert.ok(fs.existsSync(new URL(`../knowledge/raw/${src}.md`, import.meta.url)), `${key}: ${src}`);
    assert.ok(bitsFor(key));
  }
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
  const r = await get('/api/meaning?chart=name&position=heart&sum=7&pair=16&rel=mindDiamond:34,bogus:3');
  assert.equal(r.status, 200);
  const m = await r.json();
  assert.equal(m.count, 2); assert.equal(m.text, '7'); assert.equal(m.verdict, 'balanced'); assert.ok(m.passages.length);
  assert.deepEqual(m.pair.with.map((x) => x.sum), [16]);
  assert.equal(m.related.length, 1); assert.equal(m.related[0].position, 'mindDiamond'); assert.equal(m.related[0].count, 2, 'both Katrines: upper auras 3 and 4');
  const none = await (await get('/api/meaning?chart=name&position=heart&sum=99')).json();
  assert.equal(none.count, 0);
  assert.equal((await get('/api/meaning?chart=name&position=heart&sum=abc')).status, 400);
  assert.equal((await get('/api/meaning?chart=x&position=heart&sum=7')).status, 400);
  assert.equal((await fetch(base + '/api/meaning?chart=name&position=heart&sum=7')).status, 401);
});
