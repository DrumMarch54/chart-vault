#!/usr/bin/env node
// Put the researched batches (tools/people/out/batch-NN.json, written by Claude sessions following
// tools/people/BRIEF.md) together into server/chart-people.json, the seed the app loads at startup.
// Unknown people are left out; only words the app knows are kept (server/people.js cleanRecord).
//   node tools/people/merge.mjs          writes the seed and prints the counts
import fs from 'node:fs';
import path from 'node:path';
import { cleanRecord, keyOf } from '../../server/people.js';

const dir = new URL('./out/', import.meta.url).pathname;
const seen = new Map(); let unknown = 0, dropped = [];
for (const f of fs.readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f)).sort()) {
  for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    const rec = cleanRecord(e);
    if (!rec) { unknown++; seen.delete(keyOf(e.title)); continue; } // a re-check that finds nobody removes the earlier guess
    const raw = { fields: e.fields || [], flags: e.flags || [] };
    for (const w of [...raw.fields.filter((x) => !rec.fields.includes(x)), ...raw.flags.filter((x) => !rec.flags.includes(x))]) dropped.push(`${e.title}: ${w}`);
    seen.set(keyOf(e.title), rec); // a later batch (a re-check) replaces an earlier one
  }
}
const list = [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(new URL('../../server/chart-people.json', import.meta.url), '[\n' + list.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
const n = (f) => list.filter(f).length;
console.log(`${list.length} people written, ${unknown} unknown left out; searched ${n((r) => r.checked)}, from memory ${n((r) => !r.checked)}, with a note ${n((r) => r.note)}, date differs ${n((r) => r.date_matches === false)}`);
if (dropped.length) console.log('words not on the lists, dropped:\n  ' + dropped.join('\n  '));
