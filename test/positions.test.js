// Search by chart position: the catalog, the stored numbers, the tag check, the seed and the API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-pos-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
process.env.BUILD_COMMIT = 'posbld';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const P = await import('../server/positions.js');
const { snapshot } = await import('../server/snapshot.js');
const { tagKind } = await import('../server/tags.js');

const addImage = (db, filename, tags = []) => {
  db.prepare("INSERT INTO images (filename, kind) VALUES (?, 'chart')").run(filename);
  const id = db.prepare('SELECT id FROM images WHERE filename = ?').get(filename).id;
  for (const t of tags) {
    db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(t, tagKind(t));
    db.prepare("INSERT INTO image_tags (image_id, tag_id, source) VALUES (?, (SELECT id FROM tags WHERE name = ?), 'import')").run(id, t);
  }
  return id;
};
const KATRINE = { day: 19, month: 8, year: 1984, name: 'Katrine Ditte Pilmark' };
const at = (rows, chart, position, n = 0) => rows.find((r) => r.chart === chart && r.position === position && r.n === n);

test('every catalog position yields a number for a full input, and the class manual example is right', () => {
  const rows = P.computeValues(KATRINE);
  // Katrine has a middle name, so the name charts' name line diamond (first beside last) does not exist for her.
  const noDiamond = (p) => p.key === 'leDiamond' && ['name', 'vocation', 'personality'].includes(p.chart);
  for (const p of P.POSITIONS) assert.equal(!!at(rows, p.chart, p.key), !noDiamond(p), `${p.chart}.${p.key}`);
  assert.equal(at(P.computeValues({ ...KATRINE, name: 'Katrine Pilmark' }), 'name', 'leDiamond').sum, 23);
  assert.equal(at(rows, 'name', 'pillar').sum, 41);
  assert.equal(at(rows, 'name', 'heart').sum, 7); assert.equal(at(rows, 'name', 'heartExtra').sum, 16);
  assert.equal(at(rows, 'name', 'middle').sum, 18); assert.equal(at(rows, 'name', 'first').sum, 20); assert.equal(at(rows, 'name', 'last').sum, 21);
  assert.equal(at(rows, 'name', 'mindDiamond').sum, 34); assert.equal(at(rows, 'name', 'publicDiamond').sum, 12);
  assert.equal(at(rows, 'name', 'letters').sum, 19);
  assert.equal(at(rows, 'essence', 'dharmaDiamond').sum, 84); assert.equal(at(rows, 'essence', 'challengeDiamond').sum, 98);
  assert.equal(at(rows, 'outer', 'first').sum, 18); assert.equal(at(rows, 'inner', 'le').sum, 12);
  assert.equal(at(rows, 'outer', 'mentalFlow').sum, at(rows, 'outer', 'heart').ds * 10 + at(rows, 'inner', 'heart').ds);
  // A name alone gives the name-line positions and nothing above the line.
  const nameOnly = P.computeValues({ name: 'Test test' });
  assert.ok(at(nameOnly, 'name', 'le') && !at(nameOnly, 'name', 'heart') && !at(nameOnly, 'essence', 'day'));
  assert.equal(P.computeValues({}).length, 0);
  // every tag code points at catalog positions that exist
  const keys = new Set(P.POSITIONS.map((p) => `${p.chart}.${p.key}`));
  for (const [code, list] of Object.entries(P.TAG_POSITIONS)) for (const [c, k] of list) assert.ok(keys.has(`${c}.${k}`), `${code} -> ${c}.${k}`);
  // every catalog position has a plain-words label with no internal words
  for (const p of P.catalog().positions) assert.doesNotMatch(p.label, /[A-Z][a-z]+[A-Z]|_|\./, p.label);
});

test('store, search by position, tag check, fix and clear', () => {
  const db = openDb(':memory:');
  const k = addImage(db, 'k.jpg', ['7mc', '16mc', '8mc', '41plr', '34md', '43md', '9lp', '4combo3mc', '19day', 'katrine']);
  const other = addImage(db, 'o.jpg', ['12mc']);
  const none = addImage(db, 'n.jpg');
  P.setInputs(db, k, KATRINE, { source: 'read' });
  P.setInputs(db, other, { day: 1, name: 'Test test' }, { source: 'read' });
  assert.equal(P.getInputs(db, k).source, 'read'); assert.equal(P.getInputs(db, k).build, 'posbld');
  const ids = (q) => { const params = []; const sql = `SELECT i.id FROM images i WHERE 1=1 ${P.positionSql(q, params)}`; return db.prepare(sql).all(...params).map((r) => r.id); };
  assert.deepEqual(ids({ chart: 'name', position: 'heart', number: 7 }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'heart', number: 16 }), [other]); // Test test: heart 16/7
  assert.deepEqual(ids({ chart: 'name', position: '*', number: 16 }), [k, other]); // Katrine's extra vibration 16/7
  assert.deepEqual(ids({ chart: '*', position: '*', number: 41 }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'pillar', number: 5, ds: true }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'heart', number: 99 }), []);
  // Combinations. A center's = the two numbers in its circle (main and extra vibration): Katrine's mind center is
  // 7 with 16/7 under it. A diamond's = its two parts: her upper auras 3 and 4 make the mental diamond 34.
  const combo = (a, b) => ({ combo: [{ number: a, ds: a < 10 }, { number: b, ds: b < 10 }] });
  assert.deepEqual(ids({ chart: 'name', position: 'heart', ...combo(7, 16) }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'heart', ...combo(16, 7) }), [k]); // either way round
  assert.deepEqual(ids({ chart: 'name', position: 'heart', ...combo(4, 3) }), [], 'the auras are not the circle');
  assert.deepEqual(ids({ chart: 'name', position: 'mindDiamond', ...combo(4, 3) }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'heart', ...combo(4, 9) }), []);
  assert.deepEqual(ids({ chart: 'name', position: '*', ...combo(4, 3) }), [k]);
  assert.deepEqual(ids({ chart: '*', position: '*', ...combo(4, 3) }), [k]);
  assert.deepEqual(ids({ chart: 'name', position: 'first', ...combo(4, 3) }), []); // not a center or diamond
  // Several conditions at once (day 19 AND mind center 7): every one must hold. Katrine: day 19, heart 7; Test: day 1, heart 16.
  const both = (list) => { const params = []; return db.prepare(`SELECT i.id FROM images i WHERE 1=1${P.conditionsSql(list, params)}`).all(...params).map((r) => r.id); };
  const day19 = P.parseCondition('essence.day', '19'), heart7 = P.parseCondition('name.heart', '7'), heart16 = P.parseCondition('name.heart', '16');
  assert.deepEqual(both([day19, heart7]), [k]);
  assert.deepEqual(both([day19, heart16]), []); // each holds on a different chart, never both on one
  assert.deepEqual(both([P.parseCondition('*.*', '16'), P.parseCondition('name.mindDiamond', '4+3')]), [k]); // a plain number and a combination mix
  assert.deepEqual(both([]), [k, other, none].filter((id) => both([]).includes(id))); // no condition narrows nothing
  assert.equal(both([]).length, 3);
  assert.equal(P.parseCondition('bogus.heart', '7'), null); assert.equal(P.parseCondition('name.heart', 'abc'), null); assert.equal(P.parseCondition('', '7'), null);
  assert.deepEqual(P.parseFixed('essence.day:19,name.heart:4+3,junk,bogus.x:1'), [day19, P.parseCondition('name.heart', '4+3')]); // parsing only
  // Counts narrowed by what is fixed: with day 19 fixed, 16 is found only on Katrine's chart (her extra vibration), not on Test's heart.
  const narrowed = P.positionCounts(db, { number: 16 }, [day19]);
  assert.equal(narrowed.fixedTotal, 1); assert.equal(narrowed.total, 1); assert.equal(narrowed.counts['name.heart'] || 0, 0); assert.equal(narrowed.counts['name.heartExtra'], 1);
  assert.equal(P.positionCounts(db, { number: 16 }).fixedTotal, null); assert.equal(P.positionCounts(db, { number: 16 }).total, 2);
  const narrowedCombo = P.positionCounts(db, combo(4, 3), [P.parseCondition('essence.day', '1')]);
  assert.equal(narrowedCombo.total, 0); assert.equal(narrowedCombo.fixedTotal, 1);
  const cc = P.positionCounts(db, combo(4, 3));
  assert.equal(cc.counts['name.heart'] || 0, 0); assert.equal(cc.counts['name.mindDiamond'], 1); assert.equal(cc.perChart.name, 1); assert.equal(cc.total, 1);
  assert.equal(P.positionCounts(db, combo(7, 16)).counts['name.heart'], 1);
  assert.ok(P.comboPositions('name').some((p) => p.key === 'heart') && !P.comboPositions('name').some((p) => p.key === 'first'));
  const c = P.positionCounts(db, { number: 16 });
  assert.equal(c.counts['name.heart'], 1); assert.equal(c.counts['name.heartExtra'], 1); assert.equal(c.perChart.name, 2); assert.equal(c.total, 2);
  // the owner's tags: 7mc, 16mc (extra), 41plr, 34md, 43md (digits the other way), 9lp (digit sum of 13/4? no: 18/9 is the outer diamond; LP is 13/4 -> disagrees), 4combo3mc (auras 3 and 4), 19day agree; 8mc disagrees
  const check = P.tagCheck(db);
  assert.equal(check.tags, 10);
  assert.deepEqual(check.disagreeing.map((d) => d.tag).sort(), ['12mc', '8mc', '9lp']);
  assert.equal(check.agree, 7);
  // fix: the owner corrects the name; values follow at once; source becomes owner
  P.setInputs(db, k, { ...KATRINE, name: 'Katrine Pilmark' });
  assert.equal(P.getInputs(db, k).source, 'owner');
  assert.deepEqual(ids({ chart: 'name', position: 'heartExtra', number: 16 }), []);
  assert.equal(P.valuesFor(db, k).find((c) => c.chart === 'name').values.find((v) => v.position === 'pillar').text, '19/1');
  assert.throws(() => P.setInputs(db, k, { name: '', day: '' }), /Type a name or a date/);
  assert.throws(() => P.setInputs(db, k, { name: 'x', day: '40' }), /day must be/);
  assert.throws(() => P.setInputs(db, k, { name: 'x', year: '84' }), /four digits/);
  P.clearInputs(db, k);
  assert.equal(P.getInputs(db, k), null); assert.deepEqual(ids({ chart: '*', position: '*', number: 16 }), [other]);
  assert.equal(P.inputStats(db).without_inputs, 2);
  assert.deepEqual(P.chartsWithoutInputs(db).map((r) => r.id).sort(), [k, none].sort());
  assert.equal(P.recomputeAll(db), 1);
});

test('seed: merge-only by filename, never over an owner fix; the shipped seed file is sound', () => {
  const db = openDb(':memory:');
  const a = addImage(db, 'a.jpg'), b = addImage(db, 'b.jpg');
  P.setInputs(db, b, { name: 'Owner Fixed', day: 2 });
  const r = P.seedInputs(db, [{ filename: 'a.jpg', ...KATRINE, source: 'ocr' }, { filename: 'b.jpg', name: 'Seed Name', day: 3 }, { filename: 'zz.jpg', name: 'Nobody' }, { filename: 'a.jpg', name: 'Again' }]);
  assert.deepEqual(r, { added: 1, skipped: 2, unknown: 1 });
  assert.equal(P.getInputs(db, a).name, 'Katrine Ditte Pilmark'); assert.equal(P.getInputs(db, a).source, 'ocr');
  assert.equal(P.getInputs(db, b).name, 'Owner Fixed');
  assert.deepEqual(P.seedInputs(db, [{ filename: 'a.jpg', ...KATRINE }]), { added: 0, skipped: 1, unknown: 0 });
  const seed = P.loadSeedFile();
  assert.ok(seed.length > 600, 'the shipped seed has the vault');
  const names = new Set();
  for (const s of seed) {
    assert.ok(s.filename && !names.has(s.filename), `duplicate or missing filename ${s.filename}`); names.add(s.filename);
    assert.ok(s.name, `${s.filename} has no name`);
    const v = P.normalizeInputs(s);
    assert.ok((s.day == null) === (v.day === null) && (s.year == null) === (v.year === null), `${s.filename} has a bad date`);
  }
});

test('parseNumber reads what the owner types', () => {
  assert.deepEqual(P.parseNumber('12'), { number: 12, ds: false });
  assert.deepEqual(P.parseNumber('12/3'), { number: 12, ds: false });
  assert.deepEqual(P.parseNumber('/3'), { number: 3, ds: true });
  assert.deepEqual(P.parseNumber(' 7 '), { number: 7, ds: false });
  for (const bad of ['', 'abc', '1234', '12/34', null]) assert.equal(P.parseNumber(bad), null, String(bad));
  // Two numbers = a combination in a center or diamond; a one-digit part is the digit sum, a bigger one exact.
  const c = P.parseNumber('4+9');
  assert.deepEqual(c.combo, [{ number: 4, ds: true }, { number: 9, ds: true }]); assert.equal(c.number, 4);
  assert.deepEqual(P.parseNumber('13 and 18').combo, [{ number: 13, ds: false }, { number: 18, ds: false }]);
  assert.deepEqual(P.parseNumber('4 9').combo, P.parseNumber('4, 9').combo);
  assert.equal(P.parseNumber('4+abc'), null);
});

// --- API ---
let server, base, cookie, db;
before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  const app = createApp(db, { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { cookie, ...(opts.headers || {}) } });
const json = async (r) => ({ status: r.status, body: await r.json() });

test('API: catalog, counts, search, context, numbers, fix, recompute, status, snapshot', async () => {
  const k = addImage(db, 'Screenshot_20250101_000000_Opera.jpg', ['7mc']);
  const o = addImage(db, 'Screenshot_20250102_000000_Opera.jpg');
  P.setInputs(db, k, KATRINE, { source: 'read' });
  P.setInputs(db, o, { day: 1, name: 'Test test' }, { source: 'read' });
  assert.equal((await fetch(base + '/api/positions')).status, 401);
  const cat = (await json(await api('/api/positions'))).body;
  assert.equal(cat.charts.length, 6); assert.ok(cat.positions.some((p) => p.chart === 'name' && p.key === 'heart' && p.label === 'Mind center'));
  const counts = (await json(await api('/api/positions/counts?num=16'))).body;
  assert.equal(counts.total, 2); assert.equal(counts.counts['name.heart'], 1);
  assert.equal((await api('/api/positions/counts?num=abc')).status, 400);
  let r = (await json(await api('/api/images?pos=name.heart&num=7'))).body;
  assert.equal(r.total, 1); assert.equal(r.items[0].id, k);
  r = (await json(await api('/api/images?pos=name.*&num=16'))).body; assert.equal(r.total, 2);
  r = (await json(await api('/api/images?pos=*.*&num=%2F7'))).body; assert.equal(r.total, 2); // digit sum 7
  r = (await json(await api('/api/images?pos=name.heart&num=7&tag=7mc'))).body; assert.equal(r.total, 1);
  r = (await json(await api('/api/images?pos=bogus.heart&num=7'))).body; assert.equal(r.total, 2); // an unknown chart is ignored, not an error
  // Two positions at once, pairwise in the address: day 19 AND mind center 7 is Katrine alone; day 1 AND mind center 7 is nobody.
  r = (await json(await api('/api/images?pos=essence.day&num=19&pos=name.heart&num=7'))).body; assert.equal(r.total, 1); assert.equal(r.items[0].id, k);
  r = (await json(await api('/api/images?pos=essence.day&num=1&pos=name.heart&num=7'))).body; assert.equal(r.total, 0);
  const ctx2 = (await json(await api(`/api/images/${k}/context?pos=essence.day&num=19&pos=name.heart&num=7`))).body; assert.equal(ctx2.total, 1);
  const narrowed = (await json(await api('/api/positions/counts?num=16&fixed=' + encodeURIComponent('essence.day:19')))).body;
  assert.equal(narrowed.fixedTotal, 1); assert.equal(narrowed.total, 1);
  const ctx = (await json(await api(`/api/images/${o}/context?pos=name.*&num=16`))).body;
  assert.equal(ctx.total, 2); assert.equal(ctx.index, 1); assert.equal(ctx.next, k);
  let n = (await json(await api(`/api/images/${k}/numbers`))).body;
  assert.equal(n.inputs.name, 'Katrine Ditte Pilmark'); assert.ok(n.charts.find((c) => c.chart === 'name').values.some((v) => v.label === 'Pillar' && v.text === '41/5'));
  // the owner fixes the date: the name chart changes, the source is owner
  let f = await json(await api(`/api/images/${k}/inputs`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...KATRINE, day: '1' }) }));
  assert.equal(f.status, 200); assert.equal(f.body.inputs.source, 'owner'); assert.equal(f.body.inputs.day, 1);
  f = await json(await api(`/api/images/${k}/inputs`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x', day: '99' }) }));
  assert.equal(f.status, 400); assert.match(f.body.error, /day/);
  assert.equal((await api('/api/images/999999/inputs', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"name":"x"}' })).status, 404);
  f = await json(await api(`/api/images/${k}/inputs`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clear: true }) }));
  assert.equal(f.body.inputs, null);
  n = (await json(await api(`/api/images/${k}/numbers`))).body; assert.equal(n.inputs, null); assert.deepEqual(n.charts, []);
  const rc = (await json(await api('/api/positions/recompute', { method: 'POST' }))).body;
  assert.equal(rc.recomputed, 1);
  const st = (await json(await api('/api/status'))).body;
  assert.equal(st.positions.with_inputs, 1); assert.equal(st.positions.without_inputs, 1); assert.equal(typeof st.positions.check.agree, 'number');
  const snap = snapshot(db, { scope: 'full', commit: 'x' });
  assert.match(snap, /POSITION SEARCH/); assert.match(snap, /CHARTS WITHOUT INPUTS \(1\)/); assert.doesNotMatch(snap, /test-password/);
  const one = snapshot(db, { id: String(o), commit: 'x' });
  assert.match(one, /inputs: 1\.\?\.\? "Test test"/); assert.match(one, /Name chart: .*Life expression 14\/5/);
  assert.match(snapshot(db, { id: String(k), commit: 'x' }), /inputs: none/);
});
