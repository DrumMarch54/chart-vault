// Every meaning page with course words, grouped by the exact set of passages it shows, so each distinct text is
// written up once. Pair pages (a center's circle) likewise. Output: batches of jobs for the writing agents.
import fs from 'node:fs';
import { meaningFor } from '../../server/meaning.js';
import { POSITIONS, positionLabel, chartLabel } from '../../server/positions.js';
const S = process.env.BITS_DIR ? process.env.BITS_DIR + '/bits-jobs' : new URL('./work/bits-jobs', import.meta.url).pathname;
const sets = new Map(); // signature -> { id, keys: [], labels: [], passages }
const sig = (ps) => ps.map((p) => p.source + '|' + p.heading).sort().join('\n');
const put = (key, label, passages) => {
  if (!passages.length) return;
  const s = sig(passages);
  if (!sets.has(s)) sets.set(s, { id: `set${sets.size + 1}`, keys: [], labels: [], passages: passages.map((p) => ({ source: p.source, title: p.title, heading: p.heading, text: p.text })) });
  const e = sets.get(s); e.keys.push(key); e.labels.push(label);
};
const fmt = (n) => (n < 10 ? String(n) : `${n}/${String(n).split('').reduce((a, d) => a + Number(d), 0) > 9 ? String(String(n).split('').reduce((a, d) => a + Number(d), 0)).split('').reduce((a, d) => a + Number(d), 0) : String(n).split('').reduce((a, d) => a + Number(d), 0)}`);
for (const p of POSITIONS.filter((q) => !q.hidden)) for (let n = 1; n <= 99; n++) {
  const m = meaningFor({ chart: p.chart, position: p.key, sum: n });
  put(`${p.chart}.${p.key}:${n}`, `${m.text} in the ${chartLabel(p.chart)}'s ${positionLabel(p.chart, p.key)}`, m.passages);
}
// the circle pairs: every main + extra 1..99 x 1..99 would be 10k calls; the course only pairs numbers up to 18 (plus a few).
let pairPages = 0;
for (const pos of ['heart', 'solar']) for (let n = 1; n <= 99; n++) for (let q = 1; q <= 99; q++) {
  if (n > 18 && q > 18) continue;
  const m = meaningFor({ chart: 'name', position: pos, sum: n, pair: [q] });
  if (m.pair && m.pair.passages.length) { pairPages++; put(`name.${pos}:${n}+${q}`, `${m.text} with ${fmt(q)} in the Name chart's ${positionLabel('name', pos)}`, m.pair.passages); }
}
const all = [...sets.values()];
console.log('sets', all.length, 'pages', all.reduce((a, s) => a + s.keys.length, 0), 'pair pages', pairPages, 'chars', all.reduce((a, s) => a + s.passages.reduce((b, p) => b + p.text.length, 0), 0));
// batches of about 45k chars
const batches = []; let cur = [], size = 0;
for (const s of all) { const c = s.passages.reduce((b, p) => b + p.text.length, 0); if (cur.length && size + c > 45000) { batches.push(cur); cur = []; size = 0; } cur.push(s); size += c; }
if (cur.length) batches.push(cur);
for (const f of fs.readdirSync(S)) fs.unlinkSync(`${S}/${f}`);
batches.forEach((b, i) => fs.writeFileSync(`${S}/batch-${String(i + 1).padStart(2, '0')}.json`, JSON.stringify(b, null, 1)));
console.log('batches', batches.length);
