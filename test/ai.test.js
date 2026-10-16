// The paid AI door (server/ai.js, reading.js, ask.js) with a FAKE model: nothing here spends anything.
// Proves: the key never comes back out (settings, status, snapshot, errors); a reading is paid for once;
// the monthly cap blocks and warns; "ask the vault" runs the tools the model asks for and returns the charts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-ai-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password-long';
process.env.BUILD_COMMIT = 'aitest';
process.env.AUTODEPLOY_SCRIPT = path.join(tmp, 'installed-autodeploy.sh');
process.env.AUTODEPLOY_LOG = path.join(tmp, 'autodeploy.log');

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { useClientFactory, costOf, MODELS } = await import('../server/ai.js');
const { parseUserTagBackup, importTags } = await import('../server/import.js');
const { setInputs } = await import('../server/positions.js');

const KEY = 'sk-ant-api03-FAKEKEYFAKEKEYFAKEKEY-abcdef';
let server, base, cookie, db;
const logs = [];
// The fake model: each call takes the next answer from the script. Every request is kept for assertions.
const script = [];
const requests = [];
const msg = (content, stop = 'end_turn', usage = { input_tokens: 1000, output_tokens: 200 }) => ({ content, stop_reason: stop, usage, model: 'fake' });
useClientFactory((key) => ({ messages: { create: async (params) => { requests.push({ key, params }); const next = script.shift(); if (!next) throw new Error('no scripted answer'); if (next instanceof Error) throw next; return typeof next === 'function' ? next(params) : next; } } }));

before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  const rows = [
    { _data: '/DCIM/Screenshots/Screenshot_20250101_120000_Opera.jpg', tag: 'alexjones' },
    { _data: '/DCIM/Screenshots/Screenshot_20250102_120000_Opera.jpg', tag: 'joshprovencio' },
    { _data: '/DCIM/Screenshots/Screenshot_20250103_120000_Opera.jpg', tag: 'noname' },
  ];
  importTags(db, parseUserTagBackup(Buffer.from(JSON.stringify({ usertag: rows }))), { filename: 'fake' });
  setInputs(db, 1, { day: 19, month: 5, year: 1998, name: 'Peter Jensen' }, { source: 'owner' });
  setInputs(db, 2, { day: 21, month: 10, year: 1985, name: 'Josh Provencio' }, { source: 'owner' });
  const app = createApp(db, { log: (m) => logs.push(m) });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password-long' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { cookie, ...(opts.headers || {}) } });
const json = async (r) => ({ status: r.status, body: await r.json() });
const put = (p, d) => api(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });
const post = (p, d) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });

test('no key: settings say so and a reading is refused with a screen sentence', async () => {
  let r = await json(await api('/api/ai/settings'));
  assert.equal(r.status, 200); assert.equal(r.body.key_set, false); assert.equal(r.body.cap, 8);
  r = await json(await post('/api/images/1/reading', {}));
  assert.equal(r.status, 400); assert.match(r.body.error, /No AI key yet/);
});

test('the key is stored and never comes back out', async () => {
  let r = await json(await put('/api/ai/settings', { key: KEY, cap: '8' }));
  assert.equal(r.status, 200); assert.equal(r.body.key_set, true); assert.equal(r.body.key_hint, KEY.slice(-4));
  assert.ok(!JSON.stringify(r.body).includes(KEY));
  for (const p of ['/api/ai/settings', '/api/ai/spend', '/api/status', '/api/debug/snapshot', '/api/debug/snapshot?id=1']) {
    const t = await (await api(p)).text();
    assert.ok(!t.includes(KEY), `${p} leaks the key`);
    assert.ok(!t.includes(KEY.slice(0, 20)), `${p} leaks part of the key`);
  }
  const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'ai.json'), 'utf8'));
  assert.equal(stored.key, KEY);
  r = await json(await put('/api/ai/settings', { cap: 'abc' }));
  assert.equal(r.status, 400);
});

test('a chart without numbers cannot be read', async () => {
  const r = await json(await post('/api/images/3/reading', {}));
  assert.equal(r.status, 400); assert.match(r.body.error, /no name and date/);
});

test('a reading is written once, stored, paid once, and shown again from the store', async () => {
  script.push(msg([{ type: 'text', text: '## Nexus\nDay 19/1 with life path 6/6 [Main Combo Guide].\n\n## One Sentence\nAn enthusiastic magnet.' }], 'end_turn', { input_tokens: 40000, output_tokens: 600 }));
  let r = await json(await post('/api/images/1/reading', {}));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.cached, false);
  assert.match(r.body.reading.text, /Nexus/);
  assert.equal(r.body.reading.model, MODELS.reading.id);
  assert.equal(r.body.reading.build, 'aitest');
  const usd = costOf({ input_tokens: 40000, output_tokens: 600 }, MODELS.reading);
  assert.equal(r.body.reading.usd, usd);
  assert.equal(r.body.spend.spent, usd);
  // the model saw the chart's numbers, the facts and the course words, and the key was used
  const req = requests.at(-1);
  assert.equal(req.key, KEY);
  assert.equal(req.params.model, MODELS.reading.id);
  assert.match(req.params.messages[0].content, /THE CHART/);
  assert.match(req.params.messages[0].content, /Peter Jensen/);
  assert.match(req.params.messages[0].content, /WHAT THE RULES FOUND/);
  assert.ok(req.params.system.some((b) => /Nexus/.test(b.text)), 'the style block names the Nexus');
  // second time: no call, no charge
  const calls = requests.length;
  r = await json(await post('/api/images/1/reading', {}));
  assert.equal(r.body.cached, true); assert.equal(requests.length, calls); assert.equal(r.body.spend.spent, usd);
  r = await json(await api('/api/images/1/reading'));
  assert.equal(r.status, 200); assert.match(r.body.reading.text, /Nexus/); assert.ok(r.body.estimate.possible); assert.ok(r.body.estimate.usd > 0);
  const snap = await (await api('/api/debug/snapshot?id=1')).text();
  assert.match(snap, /ai readings: reading by claude-opus-5-5 build aitest/);
});

test('a question about a chart is answered and stored under the reading', async () => {
  script.push(msg([{ type: 'text', text: 'The 16/7 in the mind center shuts down what the 1 wants to shine [Name Numeroscope Guide].' }]));
  let r = await json(await post('/api/images/1/ask', { question: 'What does the 16 do?' }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.answers.length, 1); assert.equal(r.body.answers[0].question, 'What does the 16 do?');
  assert.match(requests.at(-1).params.messages[0].content, /THE READING WRITTEN EARLIER/);
  r = await json(await post('/api/images/1/ask', { question: '' }));
  assert.equal(r.status, 400);
});

test('the cap blocks the next call and the app is warned once', async () => {
  const spent = (await json(await api('/api/ai/spend'))).body.spent;
  await put('/api/ai/settings', { cap: String(spent) }); // cap = what is spent: reached
  let r = await json(await post('/api/images/2/reading', {}));
  assert.equal(r.status, 400); assert.match(r.body.error, /monthly cap of \$/);
  r = await json(await api('/api/ai/spend'));
  assert.equal(r.body.level, 'over'); assert.ok(r.body.warning); assert.equal(r.body.warning.level, 'over');
  await post('/api/ai/warning-seen', { level: 'over' });
  r = await json(await api('/api/ai/spend'));
  assert.equal(r.body.warning, null);
  // near the cap: 80% warns
  await put('/api/ai/settings', { cap: String(Math.round((spent / 0.9) * 100) / 100) });
  r = await json(await api('/api/ai/spend'));
  assert.equal(r.body.level, 'near'); assert.ok(r.body.warning);
  await put('/api/ai/settings', { cap: '8' });
});

test('a model error never shows the key and reads as a sentence', async () => {
  const err = new Error(`boom with ${KEY} inside`); err.status = 500;
  script.push(err);
  const r = await json(await post('/api/images/2/reading', {}));
  assert.equal(r.status, 400); assert.match(r.body.error, /problem on its side/);
  const snap = await (await api('/api/debug/snapshot?scope=short')).text();
  assert.match(snap, /FAILED status 500/); assert.ok(!snap.includes(KEY)); assert.match(snap, /\[secret\]/);
});

test('ask the vault: the model calls the tools, the answer carries the charts', async () => {
  script.push(msg([{ type: 'tool_use', id: 't1', name: 'rank_charts', input: { by: 'influence', number: 8, limit: 5 } }], 'tool_use'));
  script.push((params) => {
    const result = JSON.parse(params.messages.at(-1).content[0].content);
    assert.ok(Array.isArray(result.charts), 'rank_charts answered with charts');
    const ids = result.charts.map((c) => c.id);
    return msg([{ type: 'tool_use', id: 't2', name: 'show_charts', input: { ids } }], 'tool_use');
  });
  script.push(msg([{ type: 'text', text: 'Two charts carry the 8 most strongly.' }]));
  const r = await json(await post('/api/ask', { question: 'five people most influenced by 8' }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.answer, 'Two charts carry the 8 most strongly.');
  assert.equal(r.body.turns, 3);
  assert.ok(r.body.ids.length >= 1 && r.body.ids.length <= 2);
  assert.equal(r.body.items.length, r.body.ids.length);
  assert.ok(r.body.items.every((i) => i.id && 'title' in i));
  assert.equal(requests.at(-1).params.model, MODELS.ask.id);
  assert.ok(requests.at(-1).params.tools.some((t) => t.name === 'find_charts'));
});

test('ask the vault: find_charts by position and chart_numbers work as tools', async () => {
  script.push(msg([{ type: 'tool_use', id: 't1', name: 'find_charts', input: { chart: 'essence', position: 'day', number: 19 } }, { type: 'tool_use', id: 't2', name: 'chart_numbers', input: { id: 1 } }], 'tool_use'));
  script.push((params) => {
    const results = params.messages.at(-1).content;
    const found = JSON.parse(results[0].content), numbers = JSON.parse(results[1].content);
    assert.equal(found.matched, 1); assert.equal(found.charts[0].id, 1); assert.equal(found.charts[0].born, '19.5.1998');
    assert.match(JSON.stringify(numbers), /Day vibration 19\/1/);
    return msg([{ type: 'tool_use', id: 't3', name: 'show_charts', input: { ids: [1] } }], 'tool_use');
  });
  script.push(msg([{ type: 'text', text: 'One chart.' }]));
  const r = await json(await post('/api/ask', { question: 'who has a 19 day' }));
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.ids, [1]);
});

test('facts are free and need no key', async () => {
  await put('/api/ai/settings', { key: '' });
  const r = await json(await api('/api/images/1/facts'));
  assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.facts)); assert.ok(r.body.facts.length);
  const r2 = await json(await api('/api/images/3/facts'));
  assert.equal(r2.body.missing, true);
});
