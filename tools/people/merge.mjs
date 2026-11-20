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
// A re-check ADDS, it never takes away (owner 2026-11-20): flags, fields and events are joined; a birth date, death or
// country the first pass had stays unless the re-check found a real one; "unknown" never wipes an earlier record.
// A flag says what the person did or is known for, not how a court case ended (charges dropped, died before trial).
const keepOld = (now, before) => (now === null || now === undefined || now === 'unknown' ? before : now);
function combine(before, now) {
  const join = (a, b) => [...new Set([...(a || []), ...(b || [])])];
  const ev = new Map(); for (const e of [...(before.events || []), ...(now.events || [])]) ev.set(`${e.year}|${e.what}`, e);
  const born = keepOld(now.born, before.born);
  return {
    ...before, ...now,
    fields: join(before.fields, now.fields), flags: join(before.flags, now.flags), roles: join(before.roles, now.roles),
    events: [...ev.values()].sort((x, y) => (x.year || 0) - (y.year || 0)),
    born, date_matches: now.born ? now.date_matches : before.date_matches,
    died: keepOld(now.died, before.died), death_cause: keepOld(now.death_cause, before.death_cause), age_at_death: keepOld(now.age_at_death, before.age_at_death),
    country: keepOld(now.country, before.country), summary: now.summary || before.summary, known_as: now.known_as || before.known_as,
    sources: join(now.sources, before.sources), checked: !!(now.checked || before.checked),
  };
}
for (const f of fs.readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f)).sort()) {
  for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    const key = keyOf(e.title), before = seen.get(key);
    if (cleanRecord(e) === null) { if (!before) unknown++; continue; }
    const raw = before ? combine(before, e) : e;
    const rec = cleanRecord(raw);
    for (const w of [...(raw.fields || []).filter((x) => !rec.fields.includes(x)), ...(raw.flags || []).filter((x) => !rec.flags.includes(x))]) dropped.push(`${e.title}: ${w}`);
    seen.set(key, raw);
  }
}
for (const [k, raw] of seen) seen.set(k, cleanRecord(raw));
const list = [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(new URL('../../server/chart-people.json', import.meta.url), '[\n' + list.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
const n = (f) => list.filter(f).length;
console.log(`${list.length} people written, ${unknown} unknown left out; searched ${n((r) => r.checked)}, from memory ${n((r) => !r.checked)}, with a note ${n((r) => r.note)}, date differs ${n((r) => r.date_matches === false)}`);
if (dropped.length) console.log('words not on the lists, dropped:\n  ' + dropped.join('\n  '));
