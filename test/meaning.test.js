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
const { meaningFor, countWith, topicsFor, bitsFor, setsFor } = await import('../server/meaning.js');

const heads = (list) => list.map((p) => p.heading.split(' > ').pop());

test('mind center 12/3 with 8 in its circle: 12 alone, then 12 with 8, then the mental diamond behind it', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 12, pair: [8], rel: [{ position: 'mindDiamond', sum: 75 }] });
  assert.equal(m.text, '12/3'); assert.equal(m.label, 'Mind center main vibration'); assert.equal(m.chartLabel, 'Name chart');
  assert.equal(m.name, 'The Expansive Dynamo'); assert.equal(m.verdict, 'unbalanced'); assert.equal(m.family, 'center');
  assert.ok(m.passages.length >= 3, 'passages');
  for (const p of m.passages) { assert.match(p.source, /^name-chart-(mind-and-emotion-centers|problem-areas)$/, p.heading); assert.match(p.heading, /(^|\D)12(\D|$)/); }
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

test('no general descriptions of a number: only what the course says about it in that spot; a business book only in its appendix', () => {
  const m = meaningFor({ chart: 'name', position: 'first', sum: 19 });
  assert.equal(m.general, undefined);
  for (const p of m.passages) assert.ok(!/^(book-|guide-|other-guide-|numbers-1-99-website|number-notes|biz-)/.test(p.source), p.source);
  const d = meaningFor({ chart: 'essence', position: 'day', sum: 19 });
  assert.match(d.passages[0].heading, /Day Vibration 19/i);
  for (const p of d.passages) assert.ok(!/^biz-/.test(p.source) || /^Day Vibrations > Day Vibration 19/.test(p.heading), `${p.source}: ${p.heading}`);
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
  const nine = meaningFor({ chart: 'name', position: 'heart', sum: 9 }).bits;
  assert.ok(nine && nine.groups.some((g) => g.points.length), 'every page with course words has points');
  assert.ok(meaningFor({ chart: 'vocation', position: 'heart', sum: 7 }).bits.groups[0].points.length >= 2, 'sub-chart pages too');
  assert.equal(meaningFor({ chart: 'name', position: 'heart', sum: 99 }).bits, null, 'no course words = no points');
  // every point file entry is well formed and names real course files
  const file = JSON.parse(fs.readFileSync(new URL('../knowledge/bits.json', import.meta.url), 'utf8'));
  const sets = { ...(file.sets || {}) }, pages = { ...(file.pages || {}) };
  for (const [key, b] of Object.entries(file.bits || {})) { sets[key] = b; pages[key] = key; }
  for (const [key, ids] of Object.entries({ ...pages, ...(file.more || {}) })) {
    assert.match(key, /^[a-z]+\.[A-Za-z]+:\d{1,2}(\+\d{1,2})?$/, key);
    for (const id of [].concat(ids)) assert.ok(sets[id], `${key} -> ${id}`);
    assert.ok(bitsFor(key));
  }
  for (const [id, b] of Object.entries(sets)) {
    assert.ok(b.groups.length && b.groups.every((g) => ['In balance', 'Out of balance', '', 'Path to Integration', 'When Choosing a Name', 'Name Cleanse'].includes(g.title) && g.points.length), id);
    for (const g of b.groups) for (const pt of g.points) assert.equal((pt.match(/\*\*/g) || []).length % 2, 0, `${id}: unpaired ** in "${pt}"`);
    for (const src of b.sources) assert.ok(fs.existsSync(new URL(`../knowledge/raw/${src}.md`, import.meta.url)), `${id}: ${src}`);
  }
  assert.ok(Object.keys(pages).length >= 2);
});

test('every card from a course PDF says its book and page; a hand-written point carries its own citation', () => {
  const m = meaningFor({ chart: 'name', position: 'heart', sum: 7 });
  const book = m.passages.find((p) => p.source === 'name-numeroscopes-book');
  assert.ok(book, 'the Name Numeroscopes book is on the page');
  assert.equal(book.book, 'Name Numeroscopes book'); assert.equal(book.page, 140); assert.equal(book.pageEnd, 140);
  const doc = m.passages.find((p) => p.source === 'name-chart-mind-and-emotion-centers');
  assert.equal(doc.book, undefined); assert.equal(doc.page, undefined);
  const v = meaningFor({ chart: 'vocation', position: 'heart', sum: 7, rel: [{ position: 'mindDiamond', sum: 39 }] });
  assert.equal(v.passages[0].book, 'Sub-chart Guide'); assert.equal(v.passages[0].page, 61);
  assert.equal(v.related[0].passages[0].book, 'Sub-chart Interpretation book'); assert.equal(v.related[0].passages[0].page, 162);
  const pillar = meaningFor({ chart: 'outer', position: 'pillar', sum: 16 });
  assert.equal(pillar.passages[0].book, 'Psyche book'); assert.equal(pillar.passages[0].page, 51);
  const od = meaningFor({ chart: 'essence', position: 'outerDiamond', sum: 14 });
  assert.equal(od.passages[0].book, 'Essence appendix'); assert.equal(od.passages[0].page, 18); assert.ok(od.passages[0].pageEnd >= 18);
  const day = meaningFor({ chart: 'essence', position: 'day', sum: 14 });
  const path = day.bits.groups.find((g) => g.title === 'Path to Integration');
  assert.ok(path && path.points[0].includes('69/6') && path.points[0].includes('36/9'), 'the Diamond Method path for the 14th');
  assert.deepEqual(path.cites[0], { book: 'Diamond Method book', page: 43 });
  assert.equal(day.bits.groups.indexOf(path), day.bits.groups.length - 1, 'the path comes after the page\'s own points');
  const rule = meaningFor({ chart: 'vocation', position: 'heartExtra', sum: 13 }).bits.groups.find((g) => g.title === 'When Choosing a Name');
  assert.ok(rule && /secondary vibration/.test(rule.points[0])); assert.equal(rule.cites[0].page, 4);
  assert.ok(!meaningFor({ chart: 'name', position: 'heartExtra', sum: 13 }).bits?.groups.some((g) => g.title === 'When Choosing a Name'), 'the booklet rules are for the sub-charts only');
  // the two lectures (2026-10-22): sub-chart rules by the minute, the Name Cleanse group on the five hard numbers, once
  const seven = meaningFor({ chart: 'vocation', position: 'solar', sum: 7 }).bits.groups.find((g) => g.title === 'When Choosing a Name');
  const i7 = seven.points.findIndex((p) => /7 is susceptible/.test(p));
  assert.deepEqual(seven.cites[i7], { book: 'Sub-chart Rules lecture', at: '36:54' });
  assert.ok(seven.points.findIndex((p) => /First priority/.test(p)) < i7, 'the position\'s general rule comes before the number\'s own');
  const eleven = meaningFor({ chart: 'vocation', position: 'heart', sum: 11 });
  assert.ok(eleven.bits.groups.some((g) => g.title === 'Name Cleanse'), 'the Name Cleanse group on an 11');
  assert.ok(!eleven.nameChart.bits.groups.some((g) => g.title === 'Name Cleanse'), 'not again in the name chart twin');
  assert.ok(!meaningFor({ chart: 'name', position: 'heart', sum: 7 }).bits.groups.some((g) => g.title === 'Name Cleanse'), 'a 7 has no Name Cleanse group');
  // the screens' own sets (hand/karmic/*, hand/rows/*) are reached by id, a page's set never is
  assert.ok(setsFor('hand/rows/17') && setsFor(['hand/karmic/connected']).groups[0].cites[0].book === 'Karmic Connections book');
  assert.equal(setsFor('hand/name.heart:7'), null); assert.equal(setsFor('hand/rows/nothere'), null);
  const dharma = meaningFor({ chart: 'essence', position: 'dharmaDiamond', sum: 15 });
  assert.deepEqual(dharma.bits.groups[0].cites, [{ book: 'Essence book', page: 47 }]);
  assert.match(dharma.bits.groups[0].points[0], /charisma code/);
  // every citation in the points file names a book from knowledge/books.json and sits beside its point
  const file = JSON.parse(fs.readFileSync(new URL('../knowledge/bits.json', import.meta.url), 'utf8'));
  // (a book page, or the minute of a lecture named in books.json "lectures": { book, at: "mm:ss" })
  const bj = JSON.parse(fs.readFileSync(new URL('../knowledge/books.json', import.meta.url), 'utf8'));
  const books = new Set(Object.values(bj.books).map((b) => b.book)), lectures = new Set(Object.values(bj.lectures || {}).map((b) => b.book));
  for (const slug of Object.keys(bj.lectures || {})) assert.ok(fs.existsSync(new URL(`../knowledge/raw/${slug}.md`, import.meta.url)), slug);
  for (const [id, b] of Object.entries(file.sets)) for (const g of b.groups) if (g.cites) {
    assert.equal(g.cites.length, g.points.length, `${id}: one citation per point`);
    for (const c of g.cites) if (c) {
      if (c.at) { assert.ok(lectures.has(c.book), `${id}: ${c.book}`); assert.match(c.at, /^\d{2}:\d{2}$/, id); assert.equal(c.page, undefined, id); }
      else { assert.ok(books.has(c.book), `${id}: ${c.book}`); assert.ok(Number.isInteger(c.page) && c.page > 0, id); }
    }
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

// The position map (.brain/numerology/position-sources.md, 2026-10-20): every spot the course describes finds its words.
test('GET /api/book: a course book for a screen, its passages paged, its hand-written points cited; other books refused', async () => {
  const get = (q) => fetch(`${base}/api/book?${q}`, { headers: { authorization: 'Bearer test-password' } });
  const rows = await (await get('slug=year-row-cases-book&num=17')).json();
  assert.equal(rows.book, 'Year Row Cases book'); assert.equal(rows.num, 17);
  assert.ok(rows.passages.length >= 5, 'the cases book talks about 17/8 on many pages');
  for (const p of rows.passages) { assert.equal(p.book, 'Year Row Cases book'); assert.ok(p.page >= 6 && p.page <= 91, p.page); assert.equal(p.source, 'year-row-cases-book'); }
  assert.ok(!rows.passages.some((p) => /^(Introduction|Coming Up)/.test(p.heading.split(' > ').pop())), 'no front or back matter');
  const g = rows.bits.groups[0];
  assert.ok(g.points.length >= 3 && g.cites.length === g.points.length);
  assert.ok(g.points.some((t) => /star of visibility/.test(t)));
  assert.deepEqual(g.cites[g.points.findIndex((t) => /star of visibility/.test(t))], { book: 'Year Row Cases book', page: 35 });
  assert.equal((await (await get('slug=year-row-cases-book&num=99')).json()).bits, null, 'a number the book never reads has no points');
  const k = await (await get('slug=karmic-connections-book&sets=connected,same,free,nothere')).json();
  assert.equal(k.book, 'Karmic Connections book'); assert.equal(k.num, null);
  assert.deepEqual(Object.keys(k.sets).sort(), ['connected', 'free', 'same']);
  assert.ok(k.sets.connected.groups[0].points[0].includes('destiny rhythms')); assert.equal(k.sets.connected.groups[0].cites[0].page, 9);
  assert.ok(k.bits.groups[0].points.length >= 12, 'the whole book as short points');
  assert.ok(k.passages.some((p) => p.book === 'Karmic Connections book' && p.page === 11), 'the book\'s own pages');
  assert.ok(k.passages.some((p) => p.book === 'Forecasting book' && /KARMIC CONNECTIONS/.test(p.heading)), 'the Forecasting book\'s karmic chapter follows (the index keeps one copy of a reprinted paragraph)');
  assert.ok(!k.passages.some((p) => /^TOOL: /.test(p.heading.split(' > ').pop())));
  assert.equal((await get('slug=essence-book')).status, 400, 'a meaning-page book is not served here');
  assert.equal((await get('slug=year-row-cases-book&num=0')).status, 400);
  assert.equal((await fetch(`${base}/api/book?slug=karmic-connections-book`)).status, 401, 'password-protected like everything else');
});

test('essence: the month doc, the dharma fusion doc and the Superdates appendix (day, life path, DVLP) are the spot\'s own words', () => {
  const month = meaningFor({ chart: 'essence', position: 'month', sum: 12 });
  assert.equal(month.passages[0].source, 'higher-self-month-positions'); assert.match(month.passages[0].heading, /Month Vibration 12: Expansion/);
  for (const position of ['topAura', 'dharmaDiamond']) {
    const d = meaningFor({ chart: 'essence', position, sum: 10 });
    assert.equal(d.passages[0].source, 'higher-self-dharma-fusion'); assert.match(d.passages[0].heading, /Dharma Number 10\/1/);
  }
  const day = meaningFor({ chart: 'essence', position: 'day', sum: 15 });
  assert.equal(day.passages[0].source, 'biz-superdates-int'); assert.match(day.passages[0].heading, /Day Vibration 15$/);
  assert.equal(day.passages[1].source, 'humanity-archetyping-book', 'the statistics book (NP-Statistics) follows');
  const day1 = meaningFor({ chart: 'essence', position: 'day', sum: 1 });
  assert.match(day1.passages[0].heading, /Day Vibration 1 > Winner Mentality/, 'a sub-heading under the number still counts');
  const nexus = meaningFor({ chart: 'essence', position: 'nexus', sum: 22 });
  assert.equal(nexus.passages[0].source, 'biz-superdates-int'); assert.match(nexus.passages[0].heading, /DVLP 22/);
  const lp = meaningFor({ chart: 'essence', position: 'littleLp', sum: 22 });
  assert.deepEqual(lp.passages.map((p) => p.source), ['biz-superdates-int', 'essence-book']);
  // the Superdates "Target Number" and "Outer Diamond" entries are two digits side by side, not this app's sums
  for (const position of ['target', 'outerAura']) for (const p of meaningFor({ chart: 'essence', position, sum: 12 }).passages) assert.notEqual(p.source, 'biz-superdates-int', position);
});

test('psyche: the childhood and twenties docs come first, the psyche pillar list is read', () => {
  const child = meaningFor({ chart: 'outer', position: 'lowerRight', sum: 7 });
  assert.equal(child.passages[0].source, 'psyche-childhood-aura'); assert.equal(child.passages[0].heading, 'THE NUMBER 7 IN CHILDHOOD');
  assert.match(child.passages[0].text, /BIG PSYCHE LIFE EXPRESSION: 51/);
  const ten = meaningFor({ chart: 'inner', position: 'lowerRight', sum: 10 });
  assert.equal(ten.passages[0].heading, 'THE NUMBER 10 IN CHILDHOOD');
  const twenties = meaningFor({ chart: 'outer', position: 'lowerLeft', sum: 14 });
  assert.equal(twenties.passages[0].source, 'psyche-twenties-aura'); assert.equal(twenties.passages[0].heading, 'THE NUMBER 14 IN THE TWENTIES');
  const pillar = meaningFor({ chart: 'inner', position: 'pillar', sum: 16 });
  assert.deepEqual(heads(pillar.passages), ['Psyche Pillar 16/7', 'Psyche Pillar Digit Sum 7 (the digit sum of 16)']);
  assert.match(pillar.passages[0].text, /existential crises/);
  const p11 = meaningFor({ chart: 'outer', position: 'pillar', sum: 11 });
  assert.deepEqual(heads(p11.passages), ['Psyche Pillar Digit Sum 2 (the digit sum of 11)']);
});

test('the problem-areas docs: name line, life expression, spine, centers, auras, sub-chart pillars and heart\'s desire', () => {
  const first = meaningFor({ chart: 'name', position: 'first', sum: 11 });
  assert.deepEqual(first.passages.map((p) => [p.source, p.heading]), [['name-chart-problem-areas', 'Name Line > 11/2 on the name line']]);
  assert.match(first.passages[0].text, /oversensitive/);
  assert.equal(meaningFor({ chart: 'name', position: 'last', sum: 22 }).passages[0].heading, 'Name Line > 22/4 on the name line');
  const le = meaningFor({ chart: 'name', position: 'le', sum: 12 });
  assert.equal(le.passages[0].heading, 'Life Expression Numbers > Life expression 12/3');
  assert.equal(meaningFor({ chart: 'name', position: 'spine', sum: 12 }).passages.at(-1).heading, 'Spine > Spine 12/3');
  const mc = meaningFor({ chart: 'name', position: 'heart', sum: 12 });
  assert.match(mc.passages[0].heading, /12 MV/, 'the mind center doc stays first');
  assert.ok(mc.passages.some((p) => p.heading === 'Mind Center Vibrations > Mind center 12/3'), 'the problem-areas note follows');
  const aura = meaningFor({ chart: 'name', position: 'upperRight', sum: 16 });
  assert.match(aura.passages[0].heading, /friends aura/i);
  assert.ok(aura.passages.some((p) => p.heading === 'Unbalanced Auras > 16/7 aura'));
  const bl = meaningFor({ chart: 'name', position: 'lowerLeft', sum: 11 });
  assert.ok(bl.passages.some((p) => p.heading === 'Unbalanced Auras > Bottom left aura 11'));
  assert.ok(!meaningFor({ chart: 'name', position: 'upperLeft', sum: 11 }).passages.some((p) => p.heading === 'Unbalanced Auras > Bottom left aura 11'));
  const vle = meaningFor({ chart: 'vocation', position: 'le', sum: 12 });
  assert.ok(vle.passages.some((p) => p.source === 'vocation-chart-problem-areas' && p.heading === "Little Heart's Desire > 12/3"));
  assert.ok(!meaningFor({ chart: 'vocation', position: 'big', sum: 12 }).passages.some((p) => p.heading === "Little Heart's Desire > 12/3"), 'little is not big');
  const vp = meaningFor({ chart: 'vocation', position: 'pillar', sum: 61 });
  assert.deepEqual(vp.passages.map((p) => p.heading), ['Vocation Chart Pillar', 'Pillars > 61/7'], 'the guide first, the owner\'s note after');
  const pp = meaningFor({ chart: 'personality', position: 'pillar', sum: 29 });
  assert.ok(pp.passages.some((p) => p.heading === 'Pillar Numbers > 29/2'));
  const pa = meaningFor({ chart: 'personality', position: 'lowerLeft', sum: 18 });
  assert.match(pa.passages[0].heading, /^Auras > Bottom Left Aura 18\/9:?$/);
  const va = meaningFor({ chart: 'vocation', position: 'lowerRight', sum: 11 });
  assert.deepEqual(heads(va.passages), ['Vocation chart bottom right aura 11/2', 'Aura 11/2 (feeling unprotected)']);
  assert.doesNotMatch(va.passages[1].text, /pts/, 'the aura scores are cut, the words kept');
  const ec = meaningFor({ chart: 'personality', position: 'solarExtra', sum: 18 });
  assert.ok(ec.passages.some((p) => p.heading === 'Sub Vibrations > EC sub vibration 18/9'));
  // a pair entry ("EC combo 9-11/2", "8 and 15/6") never shows under one number
  for (const [chart, position, sum] of [['name', 'solar', 9], ['vocation', 'solar', 8], ['vocation', 'solar', 15]]) for (const p of meaningFor({ chart, position, sum }).passages) assert.doesNotMatch(p.heading, /combo|and 15|9-11/i, `${chart}.${position} ${sum}: ${p.heading}`);
});

test('the sub-chart book: a Solar Plexus Diamond (Vocation) section whose paragraph the OCR put under the next heading', () => {
  for (const [n, re] of [[29, /^In the Solar Plexus Diamond position, the number 29/], [33, /^When the number 33 occupies the Solar Plexus Diamond/], [22, /^In the Solar Plexus Diamond of the Vocation Chart, the number 22/]]) {
    const m = meaningFor({ chart: 'vocation', position: 'emotionDiamond', sum: n });
    assert.equal(m.passages[0].heading, `Number ${n} > Solar Plexus Diamond (Vocation)`); assert.match(m.passages[0].text, re);
    const hd = meaningFor({ chart: 'vocation', position: 'le', sum: n });
    assert.doesNotMatch(hd.passages[0].text, /Solar Plexus Diamond/, 'and the heart\'s desire section no longer carries it');
  }
});

test('psyche spine reads the spine doc for one-digit numbers too; the challenge number has its homes', () => {
  for (const n of [5, 6, 7, 8]) assert.equal(meaningFor({ chart: 'outer', position: 'spine', sum: n }).passages[0].heading, `${n}/${n} AS SPINE NUMBER`);
  assert.equal(meaningFor({ chart: 'name', position: 'spine', sum: 7 }).passages[0].heading, '7/7 AS SPINE NUMBER');
  assert.equal(meaningFor({ chart: 'essence', position: 'topAura', sum: 9 }).passages[0].heading, 'Dharma Number 9/9');
  const o15 = meaningFor({ chart: 'outer', position: 'first', sum: 15 });
  assert.match(o15.passages[0].heading, /15\/6 as an Outer Challenge/); assert.equal(o15.passages[0].source, 'nlm-psyche-example-15-6-and-5-challenge');
  const i5 = meaningFor({ chart: 'inner', position: 'first', sum: 5 });
  assert.deepEqual(heads(i5.passages), ['5 as an Inner Challenge', 'Month Vibration 5: The Communicator'], 'the inner challenge number is the month vibration');
  assert.equal(meaningFor({ chart: 'outer', position: 'first', sum: 18 }).passages[0].heading, '3) Comparing the Challenge Numbers > The Number 18/9 (Outer Psyche)');
  assert.ok(meaningFor({ chart: 'inner', position: 'first', sum: 8 }).passages.some((p) => p.heading.endsWith('The Number 8 (Inner Psyche)')));
});

test('the psyche solar plexus reads "Psyche Chart Solar Plexus Codes" first, whole, then the name chart\'s emotion center', () => {
  for (const [n, re] of [[3, /Code 3 /], [12, /Code 12\/3/], [18, /Code 18\/9/]]) {
    const m = meaningFor({ chart: 'outer', position: 'solar', sum: n });
    assert.equal(m.passages[0].source, 'psyche-solar-plexus-codes'); assert.match(m.passages[0].heading, re);
  }
  assert.match(meaningFor({ chart: 'inner', position: 'solar', sum: 18 }).passages[0].text, /super-ego \(1 and 8\)/, 'a home passage keeps its paragraphs whole');
  assert.match(meaningFor({ chart: 'inner', position: 'solar', sum: 6 }).passages[1].heading, /6 MV/);
});

test('the outer challenge number 15/6 shows its own section only, never the 65/2 compound of the worked example', () => {
  const m = meaningFor({ chart: 'outer', position: 'first', sum: 15 });
  assert.equal(m.passages[0].heading, '15/6 as an Outer Challenge');
  for (const p of m.passages) assert.doesNotMatch(p.text, /65\/2/, p.heading);
});
