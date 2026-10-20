// Facts from the course rules (server/facts.js): nexus first, unbalanced centers, ranking, rarity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-facts-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
process.env.BUILD_COMMIT = 'factbld';

const { openDb } = await import('../server/db.js');
const P = await import('../server/positions.js');
const F = await import('../server/facts.js');

// Inputs found by trying names against the engine (computeValues) until each hit what the test needs.
const SIXTEEN = { day: 1, month: 5, year: 1990, name: 'Test test' };   // name chart mind center 16/7; first and last name both 16/7
const REPEAT = { day: 7, month: 4, year: 1983, name: 'Anna Lee' };     // 10/1 in many positions
const CLEAN = { day: 2, month: 6, year: 1990, name: 'Lucy Hale' };     // no unbalanced number in any judged position
const KATRINE = { day: 19, month: 8, year: 1984, name: 'Katrine Ditte Pilmark' };
const at = (rows, chart, position) => rows.find((r) => r.chart === chart && r.position === position && r.n === 0);

function seed() {
  const db = openDb(':memory:');
  const add = (filename, kind = 'chart') => { db.prepare('INSERT INTO images (filename, kind) VALUES (?, ?)').run(filename, kind); return db.prepare('SELECT id FROM images WHERE filename = ?').get(filename).id; };
  const ids = { sixteen: add('s.jpg'), repeat: add('r.jpg'), clean: add('c.jpg'), katrine: add('k.jpg'), empty: add('e.jpg'), other: add('o.jpg', 'other') };
  P.setInputs(db, ids.sixteen, SIXTEEN, { source: 'read' });
  P.setInputs(db, ids.repeat, REPEAT, { source: 'read' });
  P.setInputs(db, ids.clean, CLEAN, { source: 'read' });
  P.setInputs(db, ids.katrine, KATRINE, { source: 'read' });
  P.setInputs(db, ids.other, SIXTEEN, { source: 'read' }); // not a chart: never ranked, never counted
  return { db, ids };
}

test('the chosen inputs still hit what they were chosen for', () => {
  assert.equal(at(P.computeValues(SIXTEEN), 'name', 'heart').sum, 16);
  const rows = P.computeValues(REPEAT).filter((r) => r.sum === 10 && r.position !== 'anyName');
  assert.ok(rows.length >= 5, `Anna Lee repeats 10/1 ${rows.length} times`);
  for (const r of P.computeValues(CLEAN)) assert.notEqual(F.judge(r.chart, r.position, r.sum), 'unbalanced', `${r.chart}.${r.position} = ${r.sum} is unbalanced`);
});

test('BALANCE lists are sound: every number 1-99, every position exists, the weights follow the hierarchy', () => {
  const keys = new Set(P.POSITIONS.map((p) => `${p.chart}.${p.key}`));
  for (const [fam, f] of Object.entries(F.BALANCE.families)) {
    for (const k of f.positions) assert.ok(keys.has(k), `${fam}: ${k} is not a catalog position`);
    for (const n of [...f.balanced, ...f.semi, ...(Array.isArray(f.unbalanced) ? f.unbalanced : [])]) assert.ok(Number.isInteger(n) && n >= 1 && n <= 99, `${fam}: ${n}`);
  }
  for (const k of [...F.BALANCE.karmicPositions, ...F.BALANCE.fourCenters, ...F.BALANCE.sixCenters, ...F.BALANCE.psycheCenters]) assert.ok(keys.has(k), k);
  assert.equal(F.weightOf('essence', 'day'), 3); assert.equal(F.weightOf('name', 'le'), 3);
  assert.equal(F.weightOf('name', 'heart'), 2); assert.equal(F.weightOf('essence', 'littleLp'), 2); assert.equal(F.weightOf('name', 'pillar'), 2);
  assert.equal(F.weightOf('name', 'upperLeft'), 1); assert.equal(F.weightOf('outer', 'heart'), 1); assert.equal(F.weightOf('name', 'anyName'), 0);
  assert.equal(F.judge('name', 'heart', 16), 'unbalanced'); assert.equal(F.judge('name', 'heart', 8), 'semi'); assert.equal(F.judge('name', 'heart', 7), 'balanced');
  assert.equal(F.judge('vocation', 'solar', 9), 'unbalanced'); assert.equal(F.judge('vocation', 'solar', 14), 'balanced');
  assert.equal(F.judge('name', 'first', 11), 'unbalanced'); assert.equal(F.judge('name', 'first', 31), null);
  assert.equal(F.judge('name', 'upperLeft', 16), 'unbalanced'); assert.equal(F.judge('name', 'upperLeft', 12), 'semi');
  assert.equal(F.judge('name', 'pillar', 48), 'unbalanced'); assert.equal(F.judge('vocation', 'le', 15), 'unbalanced');
  assert.equal(F.judge('essence', 'day', 16), null); // the day is not judged, only named karmic
  for (const n of Object.keys(F.NAMES)) assert.ok(Number(n) >= 10 && Number(n) <= 99);
  assert.equal(Object.keys(F.NAMES).length, 90);
  assert.equal(F.fmt(5, 5), '5'); assert.equal(F.fmt(15, 6), '15/6');
});

test('factsFor: nexus first, the 16 chart has a pain fact on the mind center, texts are plain', () => {
  const { db, ids } = seed();
  const f = F.factsFor(db, ids.sixteen);
  assert.equal(f.missing, false);
  assert.equal(f.inputs.name, 'Test test');
  assert.equal(f.facts[0].kind, 'nexus');
  assert.match(f.facts[0].text, /^Day 1 \(Bold & Pioneering\) with life path 7 \(Global & Contemplative\) makes the nexus 17\/8 \(The Star\)/);
  const order = ['nexus', 'repeated', 'unbalanced', 'karmic', 'tension', 'centers', 'rarity', 'weaving'];
  let last = -1;
  for (const x of f.facts) { const i = order.indexOf(x.kind); assert.ok(i >= last, `${x.kind} out of order`); last = i; }
  const heart = f.facts.find((x) => x.kind === 'unbalanced' && x.positions.some((p) => p.chart === 'name' && p.position === 'heart'));
  assert.ok(heart, 'an unbalanced fact names name.heart');
  assert.equal(heart.severity, 'pain');
  assert.match(heart.text, /16\/7 is unbalanced as mind center/);
  assert.match(heart.text, /bony, suffering, shut down/);
  const line = f.facts.filter((x) => x.kind === 'unbalanced' && x.positions.some((p) => p.chart === 'name' && (p.position === 'first' || p.position === 'last')));
  assert.equal(line.length, 2); // first and last name 16/7, no guide note for the line: structure only
  assert.doesNotMatch(line[0].text, /guide's note/);
  const karmic = f.facts.find((x) => x.kind === 'karmic' && x.positions[0].position === 'heart');
  assert.ok(karmic && karmic.severity === 'pain'); assert.match(karmic.text, /reacts with fear/);
  assert.ok(f.facts.some((x) => x.kind === 'repeated' && x.title.startsWith('16/7 appears')));
  assert.ok(f.facts.some((x) => x.kind === 'centers' && /Centers: \d+ balanced/.test(x.title)));
  const rarity = f.facts.filter((x) => x.kind === 'rarity');
  assert.ok(rarity.length >= 8);
  assert.match(rarity.find((x) => x.positions[0].position === 'heart').text, /^1 of 4 charts in the vault have 16\/7 as mind center: only this one\./);
  assert.ok(f.facts.some((x) => x.kind === 'weaving' && x.title === 'Day and month' && /make outer diamond 15\/6 \(The Enchanter\)/.test(x.text)));
  assert.ok(f.facts.some((x) => x.kind === 'weaving' && x.title === 'Life expression and pillar' && /are read together/.test(x.text)));
  for (const x of f.facts) {
    assert.ok(['info', 'note', 'pain'].includes(x.severity), x.kind);
    assert.ok(x.title && x.text && Array.isArray(x.positions) && x.positions.length, x.kind);
    assert.doesNotMatch(x.text, /[a-z][A-Z]|_|undefined|null|NaN/, x.text); // no camelCase keys or holes on screen
    for (const p of x.positions) assert.ok(p.chart && p.position && p.sum > 0 && p.ds > 0);
  }
  assert.equal(typeof f.scores.imbalance, 'number'); assert.ok(f.scores.imbalance > 0);
  assert.equal(typeof f.scores.influence['7'], 'number');
  // Katrine's middle name 18/9 (name line unbalanced), extra vibration 16/7
  const k = F.factsFor(db, ids.katrine);
  assert.ok(k.facts.some((x) => x.kind === 'unbalanced' && x.positions[0].position === 'middle' && x.severity === 'pain'));
  assert.ok(k.facts.some((x) => x.kind === 'unbalanced' && x.positions[0].position === 'heartExtra' && /avoid 16 and 18 as extra vibrations/.test(x.text)));
  // a clean chart has no pain in its judged positions
  const c = F.factsFor(db, ids.clean);
  assert.equal(c.facts.filter((x) => x.kind === 'unbalanced' && x.severity === 'pain').length, 0);
  assert.deepEqual(F.factsFor(db, ids.empty), { missing: true });
  assert.deepEqual(F.factsFor(db, 999999), { missing: true });
});

test('chartScores and rankCharts: the 16 chart ranks above the clean one; influence 8 has scores and why', () => {
  const { db, ids } = seed();
  const t0 = Date.now();
  const scores = F.chartScores(db);
  assert.ok(Date.now() - t0 < 200);
  assert.deepEqual([...scores.keys()].sort((a, b) => a - b), [ids.sixteen, ids.repeat, ids.clean, ids.katrine].sort((a, b) => a - b)); // not the 'other' image, not the empty one
  const s16 = scores.get(ids.sixteen), sc = scores.get(ids.clean);
  assert.ok(s16.imbalance > sc.imbalance, `${s16.imbalance} > ${sc.imbalance}`);
  assert.ok(s16.influence instanceof Map && s16.top.includes(16));
  // imbalance by hand for the 16 chart: mind center 16 (2x3) + first 16 (3x3) + last 16 (3x3) + ... at least 24
  assert.ok(s16.imbalance >= 24);
  // the formula on one position: 17/8 as the nexus (weight 1, teenage) gives 8 two points
  const rows = P.computeValues(SIXTEEN);
  const expect8 = rows.filter((r) => r.ds === 8 && !['anyName', 'letters'].includes(r.position)).reduce((a, r) => a + F.weightOf(r.chart, r.position) + (r.sum >= 10 && r.sum <= 18 ? 1 : 0), 0);
  assert.equal(s16.influence.get(8), expect8);
  assert.equal(F.factsFor(db, ids.sixteen).scores.influence['8'], expect8);

  const worst = F.rankCharts(db, { by: 'imbalance', limit: 5 });
  assert.equal(worst.length, 4);
  assert.ok(worst.findIndex((r) => r.id === ids.sixteen) < worst.findIndex((r) => r.id === ids.clean));
  assert.ok(worst.every((r) => typeof r.score === 'number' && typeof r.why === 'string' && r.why.length));
  assert.match(worst.find((r) => r.id === ids.sixteen).why, /16\/7 (first name|last name|mind center)/);
  assert.equal(worst[0].score, Math.max(...worst.map((r) => r.score)));
  const best = F.rankCharts(db, { by: 'imbalance', order: 'asc', limit: 1 });
  assert.equal(best.length, 1); assert.equal(best[0].score, Math.min(...worst.map((r) => r.score)));

  const eights = F.rankCharts(db, { by: 'influence', number: 8, limit: 3 });
  assert.equal(eights.length, 3);
  assert.ok(eights[0].score >= eights[1].score && eights[1].score >= eights[2].score);
  for (const r of eights) { assert.equal(typeof r.score, 'number'); assert.ok(r.why.length); }
  const hit = eights.find((r) => r.id === ids.sixteen);
  if (hit) { assert.equal(hit.score, expect8); assert.match(hit.why, /17\/8/); }
  // a compound number: its digit sum plus one per exact hit
  const by17 = F.rankCharts(db, { by: 'influence', number: 17, limit: 10 });
  const exact17 = P.computeValues(SIXTEEN).filter((r) => r.sum === 17).length;
  assert.equal(by17.find((r) => r.id === ids.sixteen).score, expect8 + exact17);
  assert.throws(() => F.rankCharts(db, { by: 'influence' }), /needs a number/);
  assert.throws(() => F.rankCharts(db, { by: 'bogus' }), /by must be/);
  assert.deepEqual(F.rankCharts(db, { by: 'imbalance', limit: 0 }), []);
});

test('positionRarity agrees with a direct count', () => {
  const { db, ids } = seed();
  const r = F.positionRarity(db, 'name', 'heart', 16);
  const same = db.prepare("SELECT count(DISTINCT v.image_id) c FROM chart_values v JOIN images i ON i.id = v.image_id WHERE i.kind = 'chart' AND v.chart = 'name' AND v.position = 'heart' AND v.sum = 16").get().c;
  const total = db.prepare("SELECT count(DISTINCT v.image_id) c FROM chart_values v JOIN images i ON i.id = v.image_id WHERE i.kind = 'chart' AND v.chart = 'name' AND v.position = 'heart'").get().c;
  assert.deepEqual(r, { same, total });
  assert.deepEqual(r, { same: 1, total: 4 });
  assert.deepEqual(F.positionRarity(db, 'name', 'heart', 99), { same: 0, total: 4 });
  assert.deepEqual(F.positionRarity(db, 'bogus', 'heart', 16), { same: 0, total: 0 });
  void ids;
  fs.rmSync(tmp, { recursive: true, force: true });
});
