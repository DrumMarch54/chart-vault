// Research a Group (server/research.js, /api/research) with a FAKE model: nothing here spends anything.
// Proves: the people come back with only the sources the search returned; a date without such a page is kept
// but marked not checked; a PERSONAL category drops anyone without a page for it; people found online are counted
// IN the group and never among "the others"; nothing is saved to the vault; unticking changes the count; a fix is
// kept; the summary is only written when something stands out, stored, and not paid for twice.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-research-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password-long';
process.env.BUILD_COMMIT = 'researchtest';
process.env.AUTODEPLOY_SCRIPT = path.join(tmp, 'installed-autodeploy.sh');
process.env.AUTODEPLOY_LOG = path.join(tmp, 'autodeploy.log');

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { useClientFactory, setAiSettings } = await import('../server/ai.js');
const { parseUserTagBackup, importTags } = await import('../server/import.js');
const { setInputs } = await import('../server/positions.js');
const { summaryContext, researchShares, getResearch } = await import('../server/research.js');
const { sharesOf } = await import('../server/group.js');

let server, base, cookie, db;
const script = [];
const requests = [];
useClientFactory(() => ({ messages: { create: async (params) => { requests.push(params); const next = script.shift(); if (!next) throw new Error('no scripted answer'); return next; } } }));

const U = (n) => `https://en.wikipedia.org/wiki/${n}`;
const searched = (urls) => [
  { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } },
  { type: 'web_search_tool_result', tool_use_id: 's1', content: urls.map((url) => ({ type: 'web_search_result', url, title: 'Page' })) },
];
const person = (known_as, birth_name, birth_date, page, extra = {}) => ({ kind: 'person', known_as, birth_name, name_now: '', birth_date, who: 'Known', why: 'Belongs', member_source: page, name_source: page, date_source: page, sure: true, ...extra });
const group = (input) => ({ type: 'tool_use', id: 'g1', name: 'give_group', input: { category: 'Test Group', personal: false, note: '', vault_kinds: [], ...input } });
const reply = (content, searches = 2) => ({ content, stop_reason: 'tool_use', usage: { input_tokens: 1000, output_tokens: 100, server_tool_use: { web_search_requests: searches } } });

// A vault of 12 charts with different names and dates: "the others".
const VAULT = Array.from({ length: 12 }, (_, i) => ({ name: `Person Number${'abcdefghijkl'[i]} Vault`, day: 1 + i * 2, month: 1 + (i % 12), year: 1950 + i * 3 }));

before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  importTags(db, parseUserTagBackup(Buffer.from(JSON.stringify({ usertag: VAULT.map((v, i) => ({ _data: `/DCIM/Screenshots/Screenshot_202501${String(i + 1).padStart(2, '0')}_120000_Opera.jpg`, tag: `p${i}` })) }))), { filename: 'fake' });
  VAULT.forEach((v, i) => setInputs(db, i + 1, v, { source: 'owner' }));
  setAiSettings({ key: 'sk-ant-api03-FAKEKEYFAKEKEYFAKEKEY-abcdef', cap: 8 });
  const app = createApp(db, { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password-long' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const call = async (method, p, d) => { const r = await fetch(base + p, { method, headers: { cookie, 'content-type': 'application/json' }, ...(d ? { body: JSON.stringify(d) } : {}) }); return { status: r.status, body: await r.json() }; };

const CODERS = [
  person('Linus Torvalds', 'Linus Benedict Torvalds', '1969-12-28', U('Linus')),
  person('Bill Gates', 'William Henry Gates III', '1955-10-28', U('Bill')),
  person('Grace Hopper', 'Grace Brewster Murray', '1906-12-09', U('Grace'), { name_now: 'Grace Brewster Murray Hopper' }),
  person('Guido van Rossum', 'Guido van Rossum', '1956-01-31', '', { date_source: 'https://made-up.example/guido', sure: true }),
  person('Nobody Knows', 'Nobody Knows', '', U('Nobody')),
  person('Bill Gates', 'William Gates', '1955-10-28', U('Bill')), // the same person twice
];
let id;

test('the costs are a guess until a real search has run', async () => {
  const r = await call('GET', '/api/research');
  assert.deepEqual(r.body.costs.map((c) => [c.size, c.measured]), [[10, false], [20, false], [30, false]]);
  assert.equal(r.body.items.length, 0);
});

test('a search keeps the people, only the sources the search returned, and saves nothing to the vault', async () => {
  const before = db.prepare('SELECT count(*) n FROM images').get().n;
  script.push(reply([...searched([U('Linus'), U('Bill'), U('Grace'), U('Nobody')]), group({ category: 'Computer Coders', people: CODERS })], 3));
  const r = await call('POST', '/api/research', { query: 'computer coders', size: 10 });
  assert.equal(r.status, 200);
  id = r.body.id;
  assert.equal(requests.at(-1).tools[0].max_uses, 6);
  const g = (await call('GET', `/api/research/${id}`)).body;
  assert.equal(g.category, 'Computer Coders');
  assert.deepEqual(g.people.map((p) => p.known_as), ['Linus Torvalds', 'Bill Gates', 'Grace Hopper', 'Guido van Rossum', 'Nobody Knows']);
  const guido = g.people[3], grace = g.people[2], nobody = g.people[4];
  assert.equal(guido.date_source, null, 'a made-up page is never shown');
  assert.equal(guido.checked, false);
  assert.equal(guido.sure, false);
  assert.equal(g.people[0].checked, true);
  assert.equal(g.people[0].date_source.site, 'en.wikipedia.org');
  assert.equal(grace.name_now, 'Grace Brewster Murray Hopper');
  assert.equal(grace.chart_name, 'Grace Brewster Murray', 'the chart is the birth name');
  assert.equal(nobody.drawable, false);
  assert.equal(g.usd > 0.03, true, 'three web searches are a cent each');
  assert.equal(db.prepare('SELECT count(*) n FROM images').get().n, before, 'nothing is saved to the vault');
  const list = (await call('GET', '/api/research')).body;
  assert.equal(list.items[0].found, 5);
  assert.equal(list.costs[0].measured, true);
});

test('people found online are counted in the group, never among the others', async () => {
  const s = (await call('GET', `/api/research/${id}/shares`)).body;
  assert.equal(s.size, 4, 'four have a full date');
  assert.equal(s.undated, 1);
  assert.equal(s.rest, 12, 'the vault is the yardstick, unchanged');
  assert.equal(s.members.every((m) => m.id === null && Number.isInteger(m.ref)), true);
});

test('unticking someone takes them out of the count, and a fix is kept', async () => {
  const s0 = (await call('GET', `/api/research/${id}/shares`)).body;
  await call('PUT', `/api/research/${id}/off`, { p: [0], v: [] });
  const s1 = (await call('GET', `/api/research/${id}/shares`)).body;
  assert.equal(s1.size, 3);
  assert.notEqual(s1.key, s0.key);
  await call('PUT', `/api/research/${id}/off`, { p: [], v: [] });
  const bad = await call('PUT', `/api/research/${id}/person/4`, { birth_date: '1970-02-31' });
  assert.equal(bad.status, 400);
  const fixed = await call('PUT', `/api/research/${id}/person/4`, { birth_name: 'Nobody Knows', birth_date: '1970-02-03' });
  assert.equal(fixed.body.people[4].birth_date, '1970-02-03');
  assert.equal(fixed.body.people[4].fixed, true);
  assert.equal((await call('GET', `/api/research/${id}/shares`)).body.size, 5);
});

test('someone the vault already has is that vault chart, counted once', async () => {
  setInputs(db, 1, { name: 'Linus Benedict Torvalds', day: 28, month: 12, year: 1969 }, { source: 'owner' });
  const g = (await call('GET', `/api/research/${id}`)).body;
  assert.equal(g.people[0].vault.id, 1);
  const s = (await call('GET', `/api/research/${id}/shares`)).body;
  assert.equal(s.size, 5);
  assert.equal(s.rest, 11, 'the vault chart moved into the group');
  assert.equal(s.members.find((m) => m.title && m.id === 1).ref, 0);
  setInputs(db, 1, VAULT[0], { source: 'owner' });
});

test('a personal category lists only people with a page for it', async () => {
  script.push(reply([...searched([U('A')]), group({ category: 'Trans People', personal: false, vault_kinds: ['field:tech'], people: [person('With Page', 'With Page', '1980-01-01', U('A')), person('No Page', 'No Page', '1981-01-01', '')] })]));
  const r = await call('POST', '/api/research', { query: 'trans people', size: 10 });
  const g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.personal, true, 'the words decide, whatever the model says');
  assert.deepEqual(g.people.map((p) => p.known_as), ['With Page']);
  assert.equal(g.dropped, 1);
  assert.deepEqual(g.vault_kinds, [], 'no vault kind is attached to a personal category');
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('the summary costs nothing when nothing stands out, and is not written twice', async () => {
  const n = requests.length;
  const s = researchShares(db, id);
  const ctx = summaryContext(getResearch(db, id), s);
  if (!ctx) {
    const r = await call('POST', `/api/research/${id}/summary`, {});
    assert.equal(r.body.summary.none, 'luck');
    assert.equal(requests.length, n, 'no model call');
  } else {
    script.push({ content: [{ type: 'text', text: 'The group leans on 19/1.' }], stop_reason: 'end_turn', usage: { input_tokens: 2000, output_tokens: 100 } });
    const r = await call('POST', `/api/research/${id}/summary`, {});
    assert.equal(r.body.summary.text, 'The group leans on 19/1.');
    assert.equal(requests.length, n + 1);
    assert.match(requests.at(-1).messages[0].content, /^THE GROUP: Computer Coders/);
  }
  const again = await call('POST', `/api/research/${id}/summary`, {});
  assert.equal(again.status, 200);
  assert.equal(requests.length <= n + 1, true, 'the same group again is the stored one');
});

test('a find in a group of strangers is written up from the counted finds only', () => {
  // Six strangers born the same day share the whole essence chart: a find no random group has.
  const extra = ['Ann Lee', 'Bob Ray', 'Cy Dunn', 'Di Moss', 'Ed Hale', 'Flo Pike'].map((name, ref) => ({ name, day: 19, month: 7, year: 1990, title: name, ref }));
  const s = sharesOf(db, { extra, display: 'Same Day' });
  assert.equal(s.size, 6);
  assert.equal(s.cards[0].strength, 'Strong');
  assert.equal(s.cards[0].charts.length, 6);
  assert.equal(s.cards[0].charts.every((c) => c.id === null), true);
  const ctx = summaryContext({ category: 'Same Day' }, { ...s, online: 6 });
  assert.match(ctx.text, /THE FINDS\n- Strong: /);
  assert.match(ctx.text, /6 of 6 in the group/);
});

test('removing a research, and the snapshot never shows a secret', async () => {
  const snap = await (await fetch(base + '/api/debug/snapshot', { headers: { cookie } })).text();
  assert.match(snap, /RESEARCH A GROUP/);
  assert.match(snap, /Computer Coders/);
  assert.equal(snap.includes('FAKEKEYFAKEKEY'), false);
  assert.equal(snap.includes('test-password-long'), false);
  assert.equal((await call('DELETE', `/api/research/${id}`)).status, 200);
  assert.equal((await call('GET', `/api/research/${id}`)).status, 404);
});
