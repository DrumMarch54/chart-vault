// Finds a photo for each person in server/chart-people.json and writes server/chart-photos.json (owner 2026-11-25:
// "a picture for people ... so that I can see the person"). Run from a cloud session: node tools/people/photos.mjs
//
// The photo is the person's own picture in Wikidata (P18), a file on Wikimedia Commons (free licences only).
// A wrong face is worse than none, so a person gets a photo ONLY when exactly one Wikidata human with their name
// was born on their birth date (to the day; a year-only date needs the exact name too). Everything else is skipped
// and listed with the reason. Free, no key, nothing about the owner is sent: only the public names searched.
// Re-run after merge.mjs adds people; it rewrites the whole file. Never hand-edit the output.
import fs from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('server/chart-photos.json', ROOT);
const UA = 'chart-vault-photos/1.0 (personal numerology app; one lookup per person)';
const API = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PHOTOS_CACHE=<dir> keeps every answer on disk, so a re-run while tuning the rules asks nothing twice.
const CACHE = process.env.PHOTOS_CACHE || null;
async function get(url) {
  const file = CACHE && `${CACHE}/${Buffer.from(url).toString('base64url').slice(-180)}.json`;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const body = await fetchJson(url);
  if (file) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(file, JSON.stringify(body)); }
  return body;
}
async function fetchJson(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (i + 1)); continue; }
    if (!res.ok) throw new Error(`${res.status} for ${url.slice(0, 80)}`);
    return res.json();
  }
  throw new Error(`gave up on ${url.slice(0, 80)}`);
}
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const people = JSON.parse(fs.readFileSync(new URL('server/chart-people.json', ROOT), 'utf8')).filter((p) => p.kind === 'person' && p.title);
const out = [], skipped = [];

// The birth dates a person may carry: the one the research found online, and the date on each of their charts
// (the owner's own find, server/chart-inputs.json by filename, joined to the person by the chart's name).
const keyOf = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
const titleOf = new Map(JSON.parse(fs.readFileSync(new URL('server/chart-titles.json', ROOT), 'utf8')).map((x) => [x.filename, keyOf(x.title)]));
const chartDates = new Map();
for (const i of JSON.parse(fs.readFileSync(new URL('server/chart-inputs.json', ROOT), 'utf8'))) {
  const t = titleOf.get(i.filename);
  if (!t || !i.year || !i.month || !i.day) continue;
  const d = `${i.year}-${String(i.month).padStart(2, '0')}-${String(i.day).padStart(2, '0')}`;
  chartDates.set(t, [...new Set([...(chartDates.get(t) || []), d])]);
}
// The name to search: "Dana White · UFC" is Dana White, "Audrey Hale (Aiden Hale)" both names.
const searchNames = (p) => [...new Set([p.title, p.known_as].filter(Boolean).flatMap((n) => {
  const base = String(n).split(' · ')[0].trim();
  const inner = (/\(([^)]+)\)/.exec(base) || [])[1];
  return [base.replace(/\s*\(.*?\)\s*/g, ' ').trim(), inner && inner.trim()];
}).filter(Boolean))];

// 1. Search each person's names; keep the candidate ids.
const cands = new Map();
for (const p of people) {
  const names = searchNames(p);
  const ids = new Set();
  for (const n of names) {
    const b = await get(`${API}?action=wbsearchentities&format=json&language=en&type=item&limit=7&search=${encodeURIComponent(n)}`);
    for (const s of b.search || []) ids.add(s.id);
    await sleep(150);
  }
  cands.set(p.title, [...ids]);
}

// 2. Read every candidate: human? born when? which picture? what is it called?
const all = [...new Set([...cands.values()].flat())];
const ent = new Map();
for (const ids of chunks(all, 50)) {
  const b = await get(`${API}?action=wbgetentities&format=json&props=claims|labels|aliases&languages=en&ids=${ids.join('|')}`);
  for (const [id, e] of Object.entries(b.entities || {})) ent.set(id, e);
  await sleep(150);
}
const vals = (e, p) => ((e.claims && e.claims[p]) || []).filter((c) => c.rank !== 'deprecated' && c.mainsnak && c.mainsnak.datavalue).sort((a, b) => (b.rank === 'preferred') - (a.rank === 'preferred')).map((c) => c.mainsnak.datavalue.value);
const human = (e) => vals(e, 'P31').some((v) => v.id === 'Q5');
const births = (e) => vals(e, 'P569').map((v) => ({ day: v.precision >= 11 ? v.time.slice(1, 11) : null, year: v.time.slice(1, 5) }));
const names = (e) => [e.labels && e.labels.en && e.labels.en.value, ...((e.aliases && e.aliases.en) || []).map((a) => a.value)].filter(Boolean).map(norm);

for (const p of people) {
  const days = [...new Set([/^\d{4}-\d{2}-\d{2}$/.test(p.born || '') ? p.born : null, ...(chartDates.get(keyOf(p.title)) || [])].filter(Boolean))];
  const year = !days.length && /^\d{4}/.test(p.born || '') ? p.born.slice(0, 4) : null;
  if (!days.length && !year) { skipped.push([p.title, 'no birth date in the record or on the chart']); continue; }
  const es = cands.get(p.title).map((id) => [id, ent.get(id)]).filter(([, e]) => e && human(e));
  const hits = es.filter(([, e]) => (days.length ? births(e).some((b) => days.includes(b.day))
    : births(e).some((b) => b.year === year) && searchNames(p).some((n) => names(e).includes(norm(n)))));
  if (hits.length !== 1) { skipped.push([p.title, hits.length ? `${hits.length} people with this name and date` : 'nobody with this name and birth date']); continue; }
  const [qid, e] = hits[0];
  const file = vals(e, 'P18')[0];
  if (!file) { skipped.push([p.title, `${qid} has no photo`]); continue; }
  out.push({ title: p.title, qid, file });
}

// 3. Who made each picture and under which licence (shown under the photo; most Commons licences require it).
const byFile = new Map(out.map((x) => ['File:' + x.file.replace(/_/g, ' '), x]));
for (const titles of chunks([...byFile.keys()], 50)) {
  const b = await get(`${COMMONS}?action=query&format=json&prop=imageinfo&iiprop=extmetadata|mime&titles=${encodeURIComponent(titles.join('|'))}`);
  const norms = new Map((b.query.normalized || []).map((n) => [n.to, n.from]));
  for (const pg of Object.values(b.query.pages || {})) {
    const x = byFile.get(norms.get(pg.title) || pg.title);
    const ii = pg.imageinfo && pg.imageinfo[0];
    if (!x || !ii) continue;
    const m = ii.extmetadata || {};
    x.mime = ii.mime;
    x.credit = stripHtml(m.Artist && m.Artist.value).slice(0, 100) || null;
    x.license = stripHtml(m.LicenseShortName && m.LicenseShortName.value) || null;
    x.license_url = (m.LicenseUrl && m.LicenseUrl.value) || null;
  }
  await sleep(150);
}
const kept = out.filter((x) => {
  if (!x.license) { skipped.push([x.title, 'picture has no licence on file']); return false; }
  if (!/^image\/(jpeg|png|webp|gif|tiff|svg\+xml)$/.test(x.mime || '')) { skipped.push([x.title, `not a photo (${x.mime})`]); return false; }
  delete x.mime; return true;
}).sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(OUT, '[\n' + kept.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
console.log(`people ${people.length}   with a photo ${kept.length}   skipped ${skipped.length}`);
for (const [t, why] of skipped.sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  skipped  ${t}: ${why}`);
