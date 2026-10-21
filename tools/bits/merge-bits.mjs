// Assemble the agents' outputs into knowledge/bits.json: { about, sets: { id: { sources, groups } }, pages: { key: id } }.
// Hand-written entries already in bits.json (the owner's approved test page) win over the agents' text.
import fs from 'node:fs';
const S = process.env.BITS_DIR || new URL('./work', import.meta.url).pathname;
const P = new URL('../../knowledge/bits.json', import.meta.url).pathname;
const old = JSON.parse(fs.readFileSync(P, 'utf8'));
const keep = { ...(old.bits || {}) }; // the hand-written pages win: old shape, or sets under hand/ in the new shape
for (const [key, id] of Object.entries(old.pages || {})) if (id.startsWith('hand/') && old.sets?.[id]) keep[key] = old.sets[id];
// BITS_ADD=1: keep every set and page already in bits.json and ADD the new batches (make-jobs-missing.mjs);
// a page written again points at its new set. Without it the file is rebuilt from the batches alone.
const add = process.env.BITS_ADD === '1';
const out = { about: old.about, sets: add ? { ...(old.sets || {}) } : {}, pages: add ? { ...(old.pages || {}) } : {}, more: { ...(old.more || {}) } };
// the hand-written second sets ("more": the path to integration, the name-change rules) are kept as written
for (const id of new Set(Object.values(old.more || {}))) if (old.sets?.[id]) out.sets[id] = old.sets[id];
let n = 0, missing = 0, skipped = 0;
for (const f of fs.readdirSync(`${S}/bits-jobs`).sort()) {
  const jobs = JSON.parse(fs.readFileSync(`${S}/bits-jobs/${f}`, 'utf8'));
  const res = fs.existsSync(`${S}/bits-out/${f}`) ? JSON.parse(fs.readFileSync(`${S}/bits-out/${f}`, 'utf8')) : {};
  for (const j of jobs) {
    const b = res[j.id];
    if (!b || !b.groups || !b.groups.length) { missing++; continue; }
    // A page whose course text is only a list of names or a formula gets no points: the writers were told to
    // leave it empty, some wrote "the course lists examples only" instead. Such groups are dropped.
    const FILLER = /\b(lists? (only )?(famous |named )?(examples|names|people)|examples? only|no trait (text|words)|only (a )?list of|course (only )?(lists|gives|names|provides)|legend\b|no course words|no (trait|number) (words|text)|describes the \*\*chart|passage (describes|is|only))/i;
    const groups = b.groups.map((g) => ({ title: g.title, points: (g.points || []).filter((pt) => typeof pt === 'string' && pt.trim() && !FILLER.test(pt)) })).filter((g) => g.points.length);
    if (!groups.length) { skipped++; continue; }
    const id = `${f.replace('.json', '')}/${j.id}`;
    if (add && out.sets[id]) throw new Error(`set id ${id} already in bits.json: name the batch files differently`);
    out.sets[id] = { sources: [...new Set(j.passages.map((p) => p.source))], groups };
    for (const key of j.keys) out.pages[key] = id;
    n++;
  }
}
for (const [key, b] of Object.entries(keep)) { out.sets[`hand/${key}`] = { sources: b.sources, groups: b.groups }; out.pages[key] = `hand/${key}`; }
fs.writeFileSync(P, JSON.stringify(out, null, 1) + '\n');
console.log(`sets ${n} (missing ${missing}, empty ${skipped}), pages ${Object.keys(out.pages).length}, hand-written kept ${Object.keys(keep).length}, file ${(fs.statSync(P).size / 1024).toFixed(0)} KB`);
