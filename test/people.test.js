// Who each person is (server/people.js): the researched facts, the kinds of people, the search by kind.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-people-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
process.env.BUILD_COMMIT = 'testbld';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const P = await import('../server/people.js');
const { setTitle } = await import('../server/titles.js');
const { snapshot } = await import('../server/snapshot.js');

const SEED = [
  { title: 'Lil Wayne', kind: 'person', known_as: 'Lil Wayne', summary: 'American rapper.', fields: ['rapper', 'music', 'made_up'], roles: ['rapper'], country: 'US',
    born: '1982-09-27', date_matches: true, events: [{ year: 2010, what: 'Served eight months at Rikers Island' }], flags: ['prison', 'convicted_crime', 'nonsense'], fame: 5, checked: true,
    sources: ['https://en.wikipedia.org/wiki/Lil_Wayne', 'not a url'], note: '' },
  { title: 'Kyle Forgeard · NELK', kind: 'person', summary: 'Canadian YouTuber.', fields: ['youtube'], flags: ['founder'], fame: 3, checked: false, sources: [] },
  { title: 'Some Neighbor', kind: 'unknown' },
];
function addChart(db, filename, title) {
  const id = db.prepare("INSERT INTO images (filename, kind, title) VALUES (?, 'chart', ?)").run(filename, title).lastInsertRowid;
  return Number(id);
}

let server, base, db, wayne1, wayne2, kyle, nobody;
const api = (p) => fetch(base + p, { headers: { authorization: 'Bearer test-password' } }).then((r) => r.json());
before(async () => {
  ensureDirs();
  db = openDb(':memory:');
  wayne1 = addChart(db, 'a.jpg', 'Lil Wayne'); wayne2 = addChart(db, 'b.jpg', 'lil wayne');
  kyle = addChart(db, 'c.jpg', 'Kyle Forgeard · NELK'); nobody = addChart(db, 'd.jpg', 'Some Neighbor');
  const app = createApp(db, { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('the seed adds people once, refreshes a changed one, and never keeps an unknown person', () => {
  assert.deepEqual(P.seedPeople(db, SEED), { added: 2, updated: 0, same: 0 });
  assert.deepEqual(P.seedPeople(db, SEED), { added: 0, updated: 0, same: 2 });
  const changed = SEED.map((e) => (e.title === 'Lil Wayne' ? { ...e, flags: ['prison'] } : e));
  assert.deepEqual(P.seedPeople(db, changed), { added: 0, updated: 1, same: 1 });
  assert.deepEqual(P.personFor(db, wayne1).flags, ['prison']);
  P.seedPeople(db, SEED);
  assert.equal(db.prepare('SELECT count(*) c FROM people').get().c, 2);
});

test('only known words and real links are kept', () => {
  const w = P.personFor(db, wayne1);
  assert.deepEqual(w.fields, ['rapper', 'music']);
  assert.deepEqual(w.flags, ['prison', 'convicted_crime']);
  assert.deepEqual(w.sources, ['https://en.wikipedia.org/wiki/Lil_Wayne']);
  assert.equal(w.field_names[0].label, 'Rappers');
  assert.equal(w.charts, 2);
});

test('a chart belongs to the person whose name it carries, any case; a renamed chart follows its name', () => {
  assert.equal(P.personFor(db, wayne2).known_as, 'Lil Wayne');
  assert.equal(P.personFor(db, nobody), null);
  setTitle(db, nobody, 'Kyle Forgeard · NELK');
  assert.equal(P.personFor(db, nobody).summary, 'Canadian YouTuber.');
  setTitle(db, nobody, 'Some Neighbor');
  assert.equal(P.personFor(db, nobody), null);
});

test('kinds of people, and the chart list narrowed to one', async () => {
  const k = await api('/api/people/kinds');
  assert.equal(k.people, 2); assert.equal(k.charts_known, 3); assert.equal(k.charts_unknown, 1);
  assert.deepEqual(k.fields.find((f) => f.who === 'field:rapper'), { who: 'field:rapper', label: 'Rappers', people: 1, charts: 2 });
  const list = await api('/api/images?who=flag:prison');
  assert.deepEqual(list.items.map((i) => i.id).sort(), [wayne1, wayne2]);
  assert.equal((await api('/api/images?who=flag:prison&who=field:youtube')).total, 0);
  assert.equal((await api('/api/images?who=field:bogus')).total, 4, 'an unknown word is dropped, not an error');
  assert.equal((await api(`/api/images/${kyle}/person`)).person.checked, false);
  assert.equal((await api(`/api/images/${nobody}/person`)).person, null);
});

test('What This Group Shares takes a kind of person as the group', async () => {
  const { groupShares } = await import('../server/group.js');
  const { setInputs } = await import('../server/positions.js');
  const names = ['Ann Lee', 'Bob Ray', 'Cy Dunn', 'Di Vance', 'Ed Moss', 'Flo Kerr', 'Gus Hale', 'Hal Pike'];
  P.seedPeople(db, names.slice(0, 4).map((title) => ({ title, kind: 'person', fields: ['sports'], flags: [] })));
  names.forEach((title, i) => { const id = addChart(db, `g${i}.jpg`, title); setInputs(db, id, { name: title, day: i < 4 ? 7 : 10 + i, month: 1 + i, year: 1980 + i }, { source: 'read' }); });
  const g = groupShares(db, '', { who: P.parseWho(['field:sports']) });
  assert.equal(g.display, 'Athletes'); assert.equal(g.size, 4); assert.equal(g.rest, 4);
  assert.ok(g.cards.some((c) => c.items.some((i) => i.pos === 'essence.day' && i.num === '7' && i.in_group === 4)), 'all four athletes share day 7');
  const viaApi = await api('/api/group?who=field:sports');
  assert.equal(viaApi.size, 4);
});

test('About Cards to Check lists what is not settled, never a friend', async () => {
  const c = await api('/api/people/check');
  assert.ok(c.memory.some((x) => x.title === 'Kyle Forgeard · NELK'), 'from memory only');
  assert.equal(c.memory.some((x) => x.title === 'Lil Wayne'), false, 'a looked-up person is not listed');
  assert.ok(c.date.every((x) => x.image_id) && c.note.every((x) => x.image_id));
  assert.equal([...c.date, ...c.note, ...c.memory].some((x) => x.title === 'Some Neighbor'), false);
});

test('the snapshot counts them', () => {
  const s = snapshot(db, { scope: 'short' });
  assert.match(s, /WHO EACH PERSON IS/);
  assert.match(s, /people 6 \(6 with a chart here\)/);
  assert.match(snapshot(db, { id: String(wayne1) }), /person: person, American rapper\./);
});
