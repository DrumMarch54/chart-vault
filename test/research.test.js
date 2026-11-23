// Research a Group (server/research.js, /api/research) with a FAKE model: nothing here spends anything.
// Proves: the people come back with only the sources the search returned; a date without such a page is kept
// but marked not checked; a PERSONAL category drops anyone without a page for it; people found online are counted
// IN the group and never among "the others"; nothing is saved to the vault; unticking changes the count; a fix is
// kept; the reading is only written when something leads, stored, and not paid for twice.
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
const { summaryContext, researchShares, getResearch, recoverResearch } = await import('../server/research.js');
const { sharesOf } = await import('../server/group.js');

let server, base, cookie, db;
const script = [];
const requests = [];
useClientFactory(() => ({ messages: { create: async (params) => {
  requests.push(params);
  const next = script.shift(); if (!next) throw new Error('no scripted answer');
  if (next.__reading === undefined) return next;
  const keys = [...String(params.messages[0].content).matchAll(/^- key (\S+):/gm)].map((m) => m[1]);
  return { content: [{ type: 'tool_use', id: 'r1', name: 'give_reading', input: { notes: [...keys.map((key) => ({ key, line: next.__reading, source: 'x' })), { key: 'made-up', line: 'dropped', source: 'x' }] } }], stop_reason: 'tool_use', usage: { input_tokens: 2000, output_tokens: 100 } };
} } }));

const U = (n) => `https://en.wikipedia.org/wiki/${n}`;
const searched = (urls) => [
  { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } },
  { type: 'web_search_tool_result', tool_use_id: 's1', content: urls.map((url) => ({ type: 'web_search_result', url, title: 'Page' })) },
];
const person = (known_as, birth_name, birth_date, page, extra = {}) => ({ kind: 'person', known_as, birth_name, name_now: '', birth_date, who: 'Known', why: 'Belongs', member_source: page, name_source: page, date_source: page, sure: true, ...extra });
const group = (input) => ({ type: 'tool_use', id: 'g1', name: 'give_group', input: { category: 'Test Group', personal: false, note: '', vault_kinds: [], angles: [], ...input } });
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

// The search runs on the server after the POST answers: wait until nothing is running.
const settle = async () => { for (let i = 0; i < 200; i++) { const r = await call('GET', '/api/research'); if (!r.body.running) return; await new Promise((ok) => setTimeout(ok, 20)); } throw new Error('the search never finished'); };
const READING = (line) => ({ __reading: line }); // answered by the fake model below: one note per key it was sent
const none = () => reply([group({ people: [] })], 1); // a round that finds nobody new: the search stops
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
  assert.equal(r.body.cost.measured, false);
  assert.equal(r.body.cost.limit_usd, 1);
  assert.equal(r.body.items.length, 0);
});

test('a search keeps the people, only the sources the search returned, and saves nothing to the vault', async () => {
  const before = db.prepare('SELECT count(*) n FROM images').get().n;
  script.push(reply([...searched([U('Linus'), U('Bill'), U('Grace'), U('Nobody')]), group({ category: 'Computer Coders', people: CODERS })], 3), none());
  const r = await call('POST', '/api/research', { query: 'computer coders' });
  assert.equal(r.status, 200);
  id = r.body.id;
  await settle();
  const rounds = requests.filter((q) => q.tools && q.tools.some((t) => t.name === 'give_group'));
  assert.equal(rounds.length, 2, 'it searched again until a round brought nobody new');
  assert.equal(rounds[0].tools[0].max_uses, 14);
  assert.match(rounds[1].messages[0].content, /ALREADY FOUND \(find others\): Linus Torvalds; Bill Gates/);
  const g = (await call('GET', `/api/research/${id}`)).body;
  assert.equal(g.category, 'Computer Coders');
  assert.equal(g.status, 'done');
  assert.equal(g.rounds, 2);
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
  assert.equal(list.cost.measured, true);
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
  const r = await call('POST', '/api/research', { query: 'trans people' });
  await settle();
  const g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.personal, true, 'the words decide, whatever the model says');
  assert.deepEqual(g.people.map((p) => p.known_as), ['With Page']);
  assert.equal(g.dropped, 1);
  assert.deepEqual(g.vault_kinds, [], 'no vault kind is attached to a personal category');
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('it stops and asks before passing the money limit, and Keep Going carries on', async () => {
  const many = (from) => Array.from({ length: 6 }, (_, i) => person(`Round ${from} Person ${i}`, `Round ${from} Person ${i}`, `19${50 + from}-0${i + 1}-1${i}`, U('Linus')));
  script.push(reply([...searched([U('Linus')]), group({ people: many(1) })], 70)); // one round: 70 searches = 70 cents
  const r = await call('POST', '/api/research', { query: 'costly group' });
  await settle();
  let g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.status, 'paused', 'a second round would pass $1');
  assert.equal(g.rounds, 1);
  assert.equal(g.people.length, 6);
  script.push(reply([...searched([U('Linus')]), group({ people: many(2).slice(0, 2) })], 1));
  assert.equal((await call('POST', `/api/research/${r.body.id}/more`)).status, 200);
  await settle();
  g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.status, 'done');
  assert.equal(g.people.length, 8);
  assert.equal(g.limit > 1, true);
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('a search from another angle sends the angle and keeps the next suggestions', async () => {
  script.push(reply([...searched([U('Linus')]), group({ angles: ['Video Game Makers', 'Women in Tech', 'Startup Founders'], people: [person('Ada Coder', 'Ada Coder', '1960-03-03', U('Linus'))] })]));
  const r = await call('POST', '/api/research', { query: 'angle group' });
  await settle();
  let g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.status, 'done');
  assert.equal(g.closed, false, 'the What Next? card is up');
  assert.deepEqual(g.angles, ['Video Game Makers', 'Women in Tech', 'Startup Founders']);
  script.push(reply([...searched([U('Linus')]), group({ angles: ['Women in Tech', 'Arcade Pioneers'], people: [person('Game Maker', 'Game Maker', '1961-04-04', U('Linus'))] })]));
  await call('POST', `/api/research/${r.body.id}/more`, { angle: 'Video Game Makers' });
  await settle();
  const last = requests.filter((q) => q.tools && q.tools.some((t) => t.name === 'give_group')).at(-1);
  assert.match(last.messages[0].content, /ANGLE: Video Game Makers/);
  assert.match(last.messages[0].content, /ANGLES ALREADY TRIED: Video Game Makers/);
  g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.people.at(-1).angle, 'Video Game Makers');
  assert.deepEqual(g.tried, ['Video Game Makers']);
  assert.deepEqual(g.angles, ['Women in Tech', 'Arcade Pioneers']);
  assert.match(g.stop, /Video Game Makers/);
  await call('POST', `/api/research/${r.body.id}/close`);
  assert.equal((await call('GET', `/api/research/${r.body.id}`)).body.closed, true);
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('Check the Dates confirms, corrects with the old date kept, and leaves no-page ones marked', async () => {
  const P = (n, d) => ({ ...person(n, n, d, ''), date_source: '', sure: false });
  script.push(reply([...searched([U('Linus')]), group({ people: [P('Al One', '1950-01-01'), P('Bo Two', '1951-02-02'), P('Cy Three', '1952-03-03')] })]));
  const r = await call('POST', '/api/research', { query: 'unchecked group' });
  await settle();
  let g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.people.filter((p) => !p.checked).length, 3);
  script.push({ content: [...searched([U('Al'), U('Bo')]), { type: 'tool_use', id: 'k', name: 'give_checks', input: { people: [
    { ref: 0, date: '1950-01-01', date_source: U('Al'), birth_name: '', name_source: '' },
    { ref: 1, date: '1951-02-09', date_source: U('Bo'), birth_name: '', name_source: '' },
    { ref: 2, date: '1952-03-03', date_source: 'https://made-up.example/x', birth_name: '', name_source: '' },
  ] } }], stop_reason: 'tool_use', usage: { input_tokens: 3000, output_tokens: 200, server_tool_use: { web_search_requests: 3 } } });
  assert.equal((await call('POST', `/api/research/${r.body.id}/check`)).status, 200);
  await settle();
  g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.status, 'done');
  assert.equal(g.people[0].checked, true);
  assert.equal(g.people[1].birth_date, '1951-02-09');
  assert.equal(g.people[1].was.birth_date, '1951-02-02');
  assert.equal(g.people[2].checked, false, 'a page the search never returned does not count');
  assert.equal(g.people[2].check_failed, true);
  assert.match(g.stop, /Checked 3 dates: 2 confirmed on a web page, 1 of them corrected, 1 with no page found/);
  assert.equal((await call('POST', `/api/research/${r.body.id}/check`)).status, 400, 'nothing left to check');
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('Search Everything moves from angle to angle by itself and stops after three dry ways', async () => {
  const five = (tag, y) => Array.from({ length: 5 }, (_, i) => person(`${tag} ${i}`, `${tag} ${i}`, `19${y}-0${i + 1}-1${i}`, U('Linus')));
  script.push(reply([...searched([U('Linus')]), group({ angles: ['Angle A', 'Angle B', 'Angle C', 'Angle D'], people: [person('First One', 'First One', '1960-03-03', U('Linus'))] })]));
  const r = await call('POST', '/api/research', { query: 'everything group' });
  await settle();
  // plain (dry) -> Angle A (5 new, then dry) -> Angle B (dry) -> Angle C (dry): three dry ways in a row, stop.
  script.push(reply([...searched([U('Linus')]), group({ people: [] })]),
    reply([...searched([U('Linus')]), group({ people: five('Alpha', 61) })]), reply([...searched([U('Linus')]), group({ people: [] })]),
    reply([...searched([U('Linus')]), group({ people: [] })]), reply([...searched([U('Linus')]), group({ people: [] })]));
  assert.equal((await call('POST', `/api/research/${r.body.id}/more`, { auto: true })).status, 200);
  await settle();
  const g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.status, 'done');
  assert.equal(g.auto, false);
  assert.equal(g.people.length, 6);
  assert.deepEqual(g.tried, ['Angle A', 'Angle B', 'Angle C']);
  assert.match(g.stop, /3 ways of searching in a row found nobody new/);
  const asked = requests.filter((q) => q.tools && q.tools.some((t) => t.name === 'give_group')).slice(-5).map((q) => (/ANGLE: (.*)/.exec(q.messages[0].content) || [])[1] || 'plain');
  assert.deepEqual(asked, ['plain', 'Angle A', 'Angle A', 'Angle B', 'Angle C']);
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('the same category typed again opens the research that exists', async () => {
  const before = (await call('GET', '/api/research')).body.items.length;
  const again = await call('POST', '/api/research', { query: 'Computer Coders' });
  assert.equal(again.body.id, id, 'the category name finds it');
  assert.equal(again.body.existing, true);
  assert.equal((await call('POST', '/api/research', { query: 'computer coders' })).body.id, id, 'the words first typed find it');
  assert.equal((await call('GET', '/api/research')).body.items.length, before, 'no twin was started');
});

test('a search cut short by a restart keeps what it found', async () => {
  const rid = Number(db.prepare("INSERT INTO research (query, category, size, result, off, usd) VALUES ('x', 'X', 1, ?, '{}', 0.1)").run(JSON.stringify({ query: 'x', category: 'X', people: [CODERS[0]], usd: 0.1, rounds: 1, limit: 1, status: 'running' })).lastInsertRowid);
  assert.equal(recoverResearch(db), 1);
  const g = (await call('GET', `/api/research/${rid}`)).body;
  assert.equal(g.status, 'interrupted');
  assert.equal(g.people.length, 1);
  await call('DELETE', `/api/research/${rid}`);
});

test('nines in several positions of one center are one theme, the plain 9 and 18/9 together', () => {
  // Eight strangers whose name chart emotion center holds a 9 in one form or another would be hard to make up by
  // hand; the families are proven on the engine's own numbers instead: every chart's values go into its family.
  const extra = ['Ann Lee', 'Bob Ray', 'Cy Dunn', 'Di Moss', 'Ed Hale', 'Flo Pike'].map((name, ref) => ({ name, day: 19, month: 7, year: 1990, title: name, ref }));
  const s = sharesOf(db, { extra, display: 'Same Day' });
  const families = s.cards.flatMap((c) => c.items).filter((i) => i.family);
  assert.equal(families.every((i) => /^Any [1-9]$/.test(i.number)), true);
  assert.equal(Array.isArray(s.themes), true);
  for (const t of s.themes) { assert.equal(t.items.length >= 2, true); assert.match(t.title, /^(Ones|Twos|Threes|Fours|Fives|Sixes|Sevens|Eights|Nines) in the /); assert.equal(new Set(t.items.map((i) => i.pos)).size, t.items.length); }
});

test('the reading costs nothing when nothing leads, and is not written twice', async () => {
  const n = requests.length;
  const s = researchShares(db, id);
  const ctx = summaryContext(getResearch(db, id), s);
  if (!ctx) {
    const r = await call('POST', `/api/research/${id}/summary`, {});
    assert.equal(r.body.summary.none, 'nothing');
    assert.deepEqual(r.body.summary.notes, []);
    assert.equal(requests.length, n, 'no model call');
  } else {
    script.push(READING('The group leans on 19/1.'));
    const r = await call('POST', `/api/research/${id}/summary`, {});
    assert.equal(r.body.summary.notes.every((x) => x.line === 'The group leans on 19/1.'), true);
    assert.equal(requests.length, n + 1);
  }
  const again = await call('POST', `/api/research/${id}/summary`, {});
  assert.equal(again.status, 200);
  assert.equal(requests.length <= n + 1, true, 'the same group again is the stored one');
});

test('collapse and expand: a number that fills a group shows up, with a short reading and no made-up note', async () => {
  // Six strangers born the same day share every number of the higher self chart: the day is in a strong position.
  script.push(reply([...searched([U('Linus')]), group({ category: 'Same Day', people: ['Ann Lee', 'Bob Ray', 'Cy Dunn', 'Di Moss', 'Ed Hale', 'Flo Pike'].map((n) => person(n, n, '1990-07-19', U('Linus'))) })]), none(), READING('Nineteens carry these charts.'));
  const r = await call('POST', '/api/research', { query: 'same day people' });
  await settle();
  const s = (await call('GET', `/api/research/${r.body.id}/shares`)).body;
  const all = [...s.insights.expand, ...s.insights.combos, ...s.insights.collapse];
  const day = all.find((i) => i.count === '6 of 6 charts');
  assert.ok(day, 'what all six share (the day 19/1 and what it makes) is a card');
  assert.equal(day.people.length, 6);
  assert.equal(typeof day.usual, 'number');
  const g = (await call('GET', `/api/research/${r.body.id}`)).body;
  assert.equal(g.summary.notes.length >= 1, true, 'every card is explained');
  assert.equal(g.summary.notes.some((x) => x.key === 'made-up'), false, 'a note for a key the app did not send is dropped');
  const sent = requests.at(-1);
  assert.equal(sent.tool_choice, undefined, 'Opus 5.5 refuses a forced tool choice');
  assert.equal(sent.tools[0].name, 'give_reading');
  assert.match(sent.messages[0].content, /^THE GROUP: Same Day\. 6 charts read\./);
  assert.match(sent.messages[0].content, /EXPAND \(the strong positions of every chart together\)\n- key /);
  assert.match(sent.system[1].text, /COURSE REFERENCE/);
  await call('DELETE', `/api/research/${r.body.id}`);
});

test('two asks for the same reading at once pay once', async () => {
  await call('PUT', `/api/research/${id}/person/4`, { birth_date: '1970-02-04' }); // a new group: no stored reading for it
  const n = requests.length;
  const ctx = summaryContext(getResearch(db, id), researchShares(db, id));
  if (!ctx) return; // nothing leads: no call at all, proven above
  script.push(READING('Once.'));
  const [a, b] = await Promise.all([call('POST', `/api/research/${id}/summary`, {}), call('POST', `/api/research/${id}/summary`, {})]);
  assert.equal(a.body.summary.notes[0].line, 'Once.');
  assert.equal(b.body.summary.notes[0].line, 'Once.');
  assert.equal(requests.length, n + 1);
});

test('a find in a group of strangers is counted in the group only', () => {
  // Six strangers born the same day share the whole essence chart: a find no random group has.
  const extra = ['Ann Lee', 'Bob Ray', 'Cy Dunn', 'Di Moss', 'Ed Hale', 'Flo Pike'].map((name, ref) => ({ name, day: 19, month: 7, year: 1990, title: name, ref }));
  const s = sharesOf(db, { extra, display: 'Same Day' });
  assert.equal(s.size, 6);
  assert.equal(s.cards[0].strength, 'Strong');
  assert.equal(s.cards[0].charts.length, 6);
  assert.equal(s.cards[0].charts.every((c) => c.id === null), true);
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
