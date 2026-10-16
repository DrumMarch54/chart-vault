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

const app = createApp(db, { log: (m) => console.log(m) });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Dev Chart Vault (throwaway data in ${tmp}) at http://127.0.0.1:${port}`);
  console.log(`Sign-in link: http://127.0.0.1:${port}/?t=dev`);
});
const cleanup = () => { server.close(); try { db.close(); } catch {} fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); };
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
void config;
