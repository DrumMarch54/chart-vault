// Like make-jobs.mjs, but only the pages whose short points are missing or stale: a page with no entry in
// knowledge/bits.json, or one whose passages now come from other sources than the ones its points were written from
// (the store changed: a document re-headed, a new home document). Existing good points are kept by merge-bits --add.
//   BITS_DIR=<dir> node tools/bits/make-jobs-missing.mjs
import fs from 'node:fs';
import { meaningFor } from '../../server/meaning.js';
import { POSITIONS, positionLabel, chartLabel } from '../../server/positions.js';
const S = process.env.BITS_DIR ? process.env.BITS_DIR + '/bits-jobs' : new URL('./work/bits-jobs', import.meta.url).pathname;
fs.mkdirSync(S, { recursive: true });
const bits = JSON.parse(fs.readFileSync(new URL('../../knowledge/bits.json', import.meta.url), 'utf8'));
const have = (key, passages) => {
  const id = bits.pages[key]; const set = id && bits.sets[id];
  if (!set) return false;
  const now = [...new Set(passages.map((p) => p.source))].sort().join(',');
  const was = [...new Set(set.sources || [])].sort().join(',');
  return now === was || id.startsWith('hand/');
};
const sets = new Map();
const sig = (ps) => ps.map((p) => p.source + '|' + p.heading).sort().join('\n');
let kept = 0;
const put = (key, label, passages) => {
  if (!passages.length) return;
  if (have(key, passages)) { kept++; return; }
  const s = sig(passages);
  if (!sets.has(s)) sets.set(s, { id: `set${sets.size + 1}`, keys: [], labels: [], passages: passages.map((p) => ({ source: p.source, title: p.title, heading: p.heading, text: p.text })) });
  const e = sets.get(s); e.keys.push(key); e.labels.push(label);
};
const ds = (n) => { let d = String(n).split('').reduce((a, x) => a + Number(x), 0); while (d > 9) d = String(d).split('').reduce((a, x) => a + Number(x), 0); return d; };
const fmt = (n) => (n < 10 ? String(n) : `${n}/${ds(n)}`);
for (const p of POSITIONS.filter((q) => !q.hidden)) for (let n = 1; n <= 99; n++) {
  const m = meaningFor({ chart: p.chart, position: p.key, sum: n });
  put(`${p.chart}.${p.key}:${n}`, `${m.text} in the ${chartLabel(p.chart)}'s ${positionLabel(p.chart, p.key)}`, m.passages);
}
for (const pos of ['heart', 'solar']) for (let n = 1; n <= 99; n++) for (let q = 1; q <= 99; q++) {
  if (n > 18 && q > 18) continue;
  const m = meaningFor({ chart: 'name', position: pos, sum: n, pair: [q] });
  if (m.pair && m.pair.passages.length) put(`name.${pos}:${n}+${q}`, `${m.text} with ${fmt(q)} in the Name chart's ${positionLabel('name', pos)}`, m.pair.passages);
}
const all = [...sets.values()];
console.log('pages kept', kept, '| to write: sets', all.length, 'pages', all.reduce((a, s) => a + s.keys.length, 0), 'chars', all.reduce((a, s) => a + s.passages.reduce((b, p) => b + p.text.length, 0), 0));
const batches = []; let cur = [], size = 0;
for (const s of all) { const c = s.passages.reduce((b, p) => b + p.text.length, 0); if (cur.length && size + c > 45000) { batches.push(cur); cur = []; size = 0; } cur.push(s); size += c; }
if (cur.length) batches.push(cur);
for (const f of fs.readdirSync(S)) fs.unlinkSync(`${S}/${f}`);
batches.forEach((b, i) => fs.writeFileSync(`${S}/add-${String(i + 1).padStart(2, '0')}.json`, JSON.stringify(b, null, 1)));
console.log('batches', batches.length);
