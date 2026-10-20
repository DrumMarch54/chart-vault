import fs from 'node:fs';
const S = process.env.BITS_DIR || new URL('./work', import.meta.url).pathname;
let bad = 0, sets = 0, points = 0;
for (const f of fs.readdirSync(`${S}/bits-jobs`).sort()) {
  const jobs = JSON.parse(fs.readFileSync(`${S}/bits-jobs/${f}`, 'utf8'));
  const outPath = `${S}/bits-out/${f}`;
  if (!fs.existsSync(outPath)) { console.log(`MISSING ${f}`); bad++; continue; }
  let out; try { out = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch (e) { console.log(`BAD JSON ${f}: ${e.message}`); bad++; continue; }
  for (const j of jobs) {
    const b = out[j.id];
    if (!b || !Array.isArray(b.groups) || !b.groups.length) { console.log(`${f} ${j.id}: no groups (${j.labels[0]})`); bad++; continue; }
    for (const g of b.groups) {
      if (!['In balance', 'Out of balance', ''].includes(g.title)) { console.log(`${f} ${j.id}: title "${g.title}"`); bad++; }
      if (!Array.isArray(g.points) || !g.points.length) { console.log(`${f} ${j.id}: empty group`); bad++; continue; }
      for (const p of g.points) {
        points++;
        if (typeof p !== 'string' || (p.match(/\*\*/g) || []).length % 2) { console.log(`${f} ${j.id}: odd ** in ${JSON.stringify(p)}`); bad++; }
        const w = String(p).replace(/\*\*/g, '').split(/\s+/).length;
        if (w > 22) console.log(`${f} ${j.id}: long (${w} words) ${String(p).slice(0, 70)}`);
      }
    }
    sets++;
  }
}
console.log(`sets ok ${sets}, points ${points}, problems ${bad}`);
process.exit(bad ? 1 : 0);
