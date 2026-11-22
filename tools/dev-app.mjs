#!/usr/bin/env node
// Run Chart Vault on a THROWAWAY copy, so a change can be looked at in a real
// browser (phone size 390x844) before it is pushed. Fake charts and tags, a
// temp data folder that is deleted on exit, password "dev". It never touches
// data/, backups/ or .env, and refuses the live port.
//
//   node tools/dev-app.mjs [port]        default 3399
//   then: CHART_VAULT_URL=http://127.0.0.1:3399 LIVE_APP_TOKEN=dev node tools/report.mjs screens /tmp/shots
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LIVE_PORTS = new Set([8090]);
const port = Number(process.argv[2] || 3399);
if (LIVE_PORTS.has(port)) { console.error(`Port ${port} is the live app's port. Pick another.`); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-dev-'));
// Set everything BEFORE config.js is imported: it only fills in what is unset,
// so the real .env cannot leak in.
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'dev';
process.env.PORT = String(port);
process.env.HOST = '127.0.0.1';

const { config, ensureDirs, paths } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');
const { importTags } = await import('../server/import.js');
const sharp = (await import('sharp')).default;

ensureDirs();
const db = openDb(paths.db);
// A saved "My chart" so the tools that start from a person have one (a fake person, like the charts).
const { setMyChart } = await import('../server/mychart.js');
setMyChart({ name: 'Josh Provencio', day: 21, month: 10, year: 1985 });

// Fake tag file: 40 charts, a mix of position, number and name tags; the first
// newest 24 get a generated screenshot, the oldest 16 stay "missing".
const people = ['alexjones', 'JimmyRowe', 'kanyewest', 'Erica', 'schoolshooter', 'joshprovencio']; // run together, like the real tags
const rows = [];
const names = [];
for (let i = 0; i < 40; i++) {
  const d = new Date(Date.UTC(2025, 0, 1) + i * 86400_000 * 7);
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, '') + '_1200' + String(i % 60).padStart(2, '0');
  const fn = `Screenshot_${stamp}_Opera.jpg`;
  names.push(fn);
  const p = `/DCIM/Screenshots/${fn}`;
  rows.push({ _data: p, tag: people[i % people.length] }, { _data: p, tag: `${(i % 9) + 1}mc` }, { _data: p, tag: i % 3 ? 'work' : 'family' });
}
const { parseUserTagBackup } = await import('../server/import.js');
importTags(db, parseUserTagBackup(Buffer.from(JSON.stringify({ usertag: rows }))), { filename: 'fake UserTag.backup' });

const { receiveUpload } = await import('../server/storage.js');
const { Readable } = await import('node:stream');
for (let i = 16; i < 40; i++) {
  const jpg = await sharp({ create: { width: 1080, height: 2340, channels: 3, background: { r: (i * 37) % 255, g: (i * 71) % 255, b: 180 } } })
    .composite([{ input: Buffer.from(`<svg width="1080" height="2340"><text x="540" y="1170" font-size="220" text-anchor="middle" fill="white">${i + 1}</text></svg>`) }])
    .jpeg().toBuffer();
  const req = Readable.from([jpg]);
  req.headers = { 'content-length': String(jpg.length) };
  await receiveUpload(db, req, { filename: names[i] });
}

// Names and dates for the fake charts, so the position search and the chart page's numbers can be looked at.
const { setInputs } = await import('../server/positions.js');
const fakePeople = [['Alex Emric Jones', 11, 2, 1974], ['Jimmy Rowe', 1, 11, 1999], ['Kanye Omari West', 8, 6, 1977], ['Erica', 3, 3, 1991], ['Katrine Ditte Pilmark', 19, 8, 1984], ['Josh Provencio', 21, 10, 1985]];
db.prepare("SELECT id FROM images WHERE kind = 'chart' ORDER BY id").all().forEach((r, i) => { if (i % 5 !== 4) { const [name, day, month, year] = fakePeople[i % fakePeople.length]; setInputs(db, r.id, { name, day, month, year }, { source: 'read' }); } });

// Names under the thumbnails, like the seed gives the real vault: most confirmed, a few left to check, one missing.
const { seedTitles } = await import('../server/titles.js');
const fakeNames = ['Alex Jones', 'Jimmy Rowe', 'Kanye West', 'Erica', 'Patrick Crusius', 'Josh Provencio'];
seedTitles(db, names.map((filename, i) => (i % 7 === 6 ? null : { filename, title: i % 5 === 4 ? '' : i % 6 === 3 ? 'Erica' : fakeNames[i % fakeNames.length], source: 'known', check: i % 6 === 3 || i % 5 === 4 })).filter(Boolean));

// Who each person is: a few made-up records for the fake names, so the About card and Kinds of People can be looked at.
const { seedPeople } = await import('../server/people.js');
seedPeople(db, [
  { title: 'Alex Jones', kind: 'person', known_as: 'Alex Jones', summary: 'American radio host and founder of a media company, known for conspiracy theories.', fields: ['commentary', 'conspiracy', 'podcast'], roles: ['radio host'], country: 'US', born: '1974-02-11', date_matches: true,
    events: [{ year: 1999, what: 'Founded his media company' }, { year: 2022, what: 'Ordered to pay about $1.5 billion in defamation cases' }], flags: ['founder', 'bankruptcy', 'cancelled_or_banned', 'major_scandal'], fame: 4, checked: true, sources: ['https://en.wikipedia.org/wiki/Alex_Jones'] },
  { title: 'Kanye West', kind: 'person', summary: 'American rapper, producer and fashion designer.', fields: ['rapper', 'music', 'fashion'], roles: ['rapper', 'producer'], country: 'US', born: '1977-06-18', date_matches: false, note: 'Made-up dev record: sources give 18 June 1977.', events: [{ year: 2004, what: 'Released The College Dropout' }], flags: ['major_award', 'billionaire', 'major_scandal'], fame: 5, checked: false, sources: [] },
  { title: 'Patrick Crusius', kind: 'person', summary: 'Gunman who killed 23 people at a store in El Paso in 2019.', fields: ['mass_violence', 'crime'], roles: ['mass shooter'], country: 'US', events: [{ year: 2019, what: 'El Paso shooting' }, { year: 2023, what: 'Sentenced to 90 life terms' }], flags: ['convicted_crime', 'violent_crime', 'killed_someone', 'prison'], fame: 3, checked: true, sources: ['https://en.wikipedia.org/wiki/2019_El_Paso_shooting'] },
  { title: 'Jimmy Rowe', kind: 'person', summary: 'American YouTuber.', fields: ['youtube'], roles: ['youtuber'], country: 'US', flags: [], fame: 2, checked: false, sources: [] },
], { build: 'dev' });

// A FAKE AI model: the Reading section, Ask the Vault and the AI settings can be looked at without spending
// a cent. A fake key is stored in the throwaway data folder; answers arrive after a second, like the real thing.
const { useClientFactory, setAiSettings } = await import('../server/ai.js');
setAiSettings({ key: 'sk-ant-dev-fake-key-0000000000000000', cap: 8 });
const FAKE_READING = '## Nexus\nThe 19/1 day vibration with the 6/6 life path makes a 16/7 nexus: the Heavenly Prince carrying the Awakening Soul [Chart Notes].\n\n## Big Picture\nEnthusiastic (19/1) magnetism (15/6) in the outer diamond, read with the 36/9 pillar: a charismatic group leader [Main Combo Guide].\n\n## Pain Points\n- 16/7 in the mind center: fear and overthinking shut the communication down [Name Numeroscope Guide].\n- 12/3 in the love aura: misunderstandings at home [Name Chart Auras].\n\n## One Sentence\nA radiant leader whose mind must learn to trust what it already knows.';
useClientFactory(() => ({ messages: { create: async (params) => {
  await new Promise((r) => setTimeout(r, 1000));
  const usage = { input_tokens: 42000, output_tokens: 700 };
  // Look Up Someone: a fake web search and answer (the dev app never searches the real web).
  if (params.tools && params.tools.some((t) => t.type && t.type.startsWith('web_search'))) {
    // Same name, two people (say "james holmes shooter"): the one that fits, and a same-name other folded below.
    if (/holmes/i.test(String(params.messages[0].content))) {
      const u1 = 'https://en.wikipedia.org/wiki/James_Eagan_Holmes', u2 = 'https://en.wikipedia.org/wiki/James_Holmes_(footballer)';
      return { content: [
        { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'James Holmes shooter birth' } },
        { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', url: u1, title: 'James Eagan Holmes - Wikipedia' }, { type: 'web_search_result', url: u2, title: 'James Holmes (footballer) - Wikipedia' }] },
        { type: 'tool_use', id: 'a1', name: 'give_answer', input: { note: '', people: [
          { kind: 'person', match: 'same_name', match_why: 'A football player, not a shooter', known_as: 'James Holmes', birth_name: 'James Holmes', birth_date: '1953-11-11', date_what: 'Born', register: '', other_names: [], other_dates: [], who: 'Former football player', sure: true, note: '', sources: [u2] },
          { kind: 'person', match: 'fits', match_why: 'He is the Aurora theater shooter', known_as: 'James Holmes', birth_name: 'James Eagan Holmes', birth_date: '1987-12-13', date_what: 'Born', date_source: u1, name_source: u1, register: '', other_names: [], other_dates: [], who: 'Aurora, Colorado theater shooter', sure: true, note: '', sources: [u1] }] } },
      ], stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 300, server_tool_use: { web_search_requests: 1 } } };
    }
    // A business (say "apple"): two names and two dates to pick from, as the real search lays them out.
    if (/apple/i.test(String(params.messages[0].content))) {
      const url = 'https://en.wikipedia.org/wiki/Apple_Inc.';
      return { content: [
        { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'Apple Inc. date of incorporation' } },
        { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', url, title: 'Apple Inc. - Wikipedia' }] },
        { type: 'tool_use', id: 'a1', name: 'give_answer', input: { note: '', people: [{ kind: 'business', known_as: 'Apple', birth_name: 'Apple Inc.', birth_date: '1977-01-03', date_what: 'Incorporated in California', register: 'California Secretary of State', who: 'American maker of phones and computers',
          other_names: [{ name: 'Apple Computer, Inc.', what: 'Registered name 1977-2007' }], other_dates: [{ date: '1976-04-01', what: 'Founded as a partnership' }, { date: '1976', what: 'Founding year another source gives' }], sure: false, note: 'Founded April 1, 1976; incorporated January 3, 1977.', sources: [url] }] } },
      ], stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 300, server_tool_use: { web_search_requests: 2 } } };
    }
    const url = 'https://en.wikipedia.org/wiki/50_Cent';
    return { content: [
      { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: '50 Cent birth name' } },
      { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', url, title: '50 Cent - Wikipedia' }] },
      { type: 'tool_use', id: 'a1', name: 'give_answer', input: { note: '', people: [{ known_as: '50 Cent', birth_name: 'Curtis James Jackson III', birth_date: '1975-07-06', who: 'American rapper from Queens, New York', sure: true, note: '', sources: [url] }] } },
    ], stop_reason: 'tool_use', usage: { input_tokens: 9000, output_tokens: 300, server_tool_use: { web_search_requests: 1 } } };
  }
  if (params.tools) {
    const last = params.messages.at(-1);
    if (last.role === 'user' && typeof last.content === 'string') return { content: [{ type: 'tool_use', id: 't1', name: 'rank_charts', input: { by: 'imbalance', limit: 5 } }], stop_reason: 'tool_use', usage: { input_tokens: 3000, output_tokens: 80 } };
    if (last.content[0] && last.content[0].tool_use_id === 't1') { const ids = JSON.parse(last.content[0].content).charts.map((c) => c.id); return { content: [{ type: 'tool_use', id: 't2', name: 'show_charts', input: { ids } }], stop_reason: 'tool_use', usage: { input_tokens: 3200, output_tokens: 60 } }; }
    return { content: [{ type: 'text', text: 'These five carry the most unbalanced numbers in weighty positions: a 16/7 or 12/3 in a center, or an 18/9 on the name line.' }], stop_reason: 'end_turn', usage: { input_tokens: 3400, output_tokens: 90 } };
  }
  const all = [].concat(params.messages[0].content).map((b) => (typeof b === 'string' ? b : b.text)).join('\n');
  const q = /THE QUESTION\n([^\n]+)/.exec(all);
  if (!q && /Length: 120 to 250 words/.test(all)) return { content: [{ type: 'text', text: '- Nexus 16/7: the Heavenly Prince carrying the Awakening Soul [Chart Notes].\n- 16/7 mind center: fear and overthinking [Name Numeroscope Guide].\n- 12/3 love aura: misunderstandings at home [Name Chart Auras].\nA radiant leader whose mind must learn to trust itself.' }], stop_reason: 'end_turn', usage: { input_tokens: 2000, output_tokens: 300, cache_read_input_tokens: 40000 } };
  return { content: [{ type: 'text', text: q ? `About "${q[1]}": the 16/7 in the mind center is the fear reflex of the 7; next to the 19/1 day it shows as a brilliant mind that doubts itself in public [Name Numeroscope Guide].` : FAKE_READING }], stop_reason: 'end_turn', usage };
} } }));

const app = createApp(db, { log: (m) => console.log(m) });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Dev Chart Vault (throwaway data in ${tmp}) at http://127.0.0.1:${port}`);
  console.log(`Sign-in link: http://127.0.0.1:${port}/?t=dev`);
});
const cleanup = () => { server.close(); try { db.close(); } catch {} fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); };
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
void config;
