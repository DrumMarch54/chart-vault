// Look Up Someone (server/lookup.js, POST /api/lookup) with a FAKE model: nothing here spends anything.
// Proves: a name already in the vault is answered free; the web answer comes back as people with only the
// sources the search returned; web searches are priced ($0.01 each); pause_turn is resumed; nothing is saved
// until Save to Vault, which keeps the public name as the chart's title.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-lookup-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password-long';
process.env.BUILD_COMMIT = 'lookuptest';
process.env.AUTODEPLOY_SCRIPT = path.join(tmp, 'installed-autodeploy.sh');
process.env.AUTODEPLOY_LOG = path.join(tmp, 'autodeploy.log');

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { useClientFactory, setAiSettings, costOf, MODELS } = await import('../server/ai.js');
const { parseUserTagBackup, importTags } = await import('../server/import.js');
const { setInputs } = await import('../server/positions.js');
const { setTitle } = await import('../server/titles.js');

let server, base, cookie, db;
const script = [];
const requests = [];
useClientFactory(() => ({ messages: { create: async (params) => { requests.push(params); const next = script.shift(); if (!next) throw new Error('no scripted answer'); return next; } } }));

const URL1 = 'https://en.wikipedia.org/wiki/50_Cent';
const searched = (urls) => [
  { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } },
  { type: 'web_search_tool_result', tool_use_id: 's1', content: urls.map((url) => ({ type: 'web_search_result', url, title: 'Page' })) },
];
const answer = (people, note = '') => ({ type: 'tool_use', id: 'a1', name: 'give_answer', input: { note, people } });
const fifty = { known_as: '50 Cent', birth_name: 'Curtis James Jackson III', birth_date: '1975-07-06', who: 'American rapper', sure: true, note: '', sources: [URL1, 'https://made-up.example/page'] };

before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  importTags(db, parseUserTagBackup(Buffer.from(JSON.stringify({ usertag: [{ _data: '/DCIM/Screenshots/Screenshot_20250101_120000_Opera.jpg', tag: 'elvispresley' }] }))), { filename: 'fake' });
  setInputs(db, 1, { day: 8, month: 1, year: 1935, name: 'Elvis Aaron Presley' }, { source: 'owner' });
  setTitle(db, 1, 'Elvis Presley');
  setAiSettings({ key: 'sk-ant-api03-FAKEKEYFAKEKEYFAKEKEY-abcdef', cap: 8 });
  const app = createApp(db, { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password-long' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const post = async (p, d) => { const r = await fetch(base + p, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(d) }); return { status: r.status, body: await r.json() }; };

test('a web search is priced at a cent on top of the tokens', () => {
  assert.equal(costOf({ input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } }, MODELS.lookup), 0.03);
});

test('a name already in the vault is answered free, without the AI', async () => {
  const r = await post('/api/lookup', { query: 'Elvis' });
  assert.equal(r.status, 200);
  assert.equal(r.body.people, null);
  assert.deepEqual(r.body.vault.map((i) => i.id), [1]);
  assert.equal(requests.length, 0);
});

test('the web answer: people, only real sources, priced, nothing saved', async () => {
  const before = db.prepare('SELECT COUNT(*) n FROM images').get().n;
  script.push({ content: [...searched([URL1]), answer([fifty])], stop_reason: 'tool_use', usage: { input_tokens: 10000, output_tokens: 400, server_tool_use: { web_search_requests: 2 } } });
  const r = await post('/api/lookup', { query: 'fifty cent' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const p = r.body.people[0];
  assert.equal(p.birth_name, 'Curtis James Jackson III');
  assert.equal(p.birth_date, '1975-07-06');
  assert.deepEqual(p.sources.map((s) => s.url), [URL1]); // the made-up link is dropped
  assert.equal(p.sure, true);
  assert.equal(r.body.searches, 2);
  assert.equal(r.body.usd, 0.0212); // 10000 in + 400 out at Haiku prices + 2 searches
  assert.equal(db.prepare('SELECT COUNT(*) n FROM images').get().n, before);
  const req = requests.at(-1);
  assert.equal(req.model, 'claude-haiku-5-5');
  assert.ok(req.tools.some((t) => t.type === 'web_search_20250305'));
});

test('a paused search turn is resumed; no source makes it unsure; a bad date is dropped', async () => {
  script.push({ content: searched([URL1]), stop_reason: 'pause_turn', usage: { input_tokens: 100, output_tokens: 10, server_tool_use: { web_search_requests: 1 } } });
  script.push({ content: [answer([{ ...fifty, birth_date: '1975-02-30', sources: [] }])], stop_reason: 'tool_use', usage: { input_tokens: 100, output_tokens: 10 } });
  const r = await post('/api/lookup', { query: 'the rapper who got shot nine times', web: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.calls, 2);
  assert.equal(requests.at(-1).messages.at(-1).role, 'assistant'); // resumed, no extra user words
  assert.equal(r.body.people[0].birth_date, '');
  assert.equal(r.body.people[0].sure, false);
});

test('Save to Vault keeps the public name as the title and the birth name as the input', async () => {
  const png = fs.readFileSync(new URL('../public/icons/icon-192.png', import.meta.url));
  const r = await fetch(`${base}/api/quick/save?name=${encodeURIComponent('Curtis James Jackson III')}&date=1975-07-06&title=${encodeURIComponent('50 Cent')}`, { method: 'PUT', headers: { cookie, 'content-type': 'image/png' }, body: png });
  const body = await r.json();
  assert.equal(r.status, 200, JSON.stringify(body));
  assert.equal(db.prepare('SELECT title FROM images WHERE id = ?').get(body.id).title, '50 Cent');
  assert.equal(db.prepare('SELECT name FROM chart_inputs WHERE image_id = ?').get(body.id).name, 'Curtis James Jackson III');
});

test('the snapshot lists the lookups', async () => {
  const r = await fetch(base + '/api/debug/snapshot', { headers: { cookie } });
  const text = await r.text();
  assert.match(text, /LOOK UP SOMEONE/);
  assert.match(text, /"fifty cent" → 50 Cent = Curtis James Jackson III 1975-07-06/);
});
