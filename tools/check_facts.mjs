#!/usr/bin/env node
// Checks the lists server/facts.js reads the course rules from: every number in a BALANCE list is 1-99,
// every position a family or a core list names exists in the catalog (server/positions.js), no position is
// in two families, and every archetype name 10-99 is present. Exits 1 and says what is off.
import { BALANCE, NAMES, TEENAGE, NOTES } from '../server/facts.js';
import { POSITIONS } from '../server/positions.js';

const keys = new Set(POSITIONS.map((p) => `${p.chart}.${p.key}`));
const problems = [];
const seen = new Map();
for (const [fam, f] of Object.entries(BALANCE.families)) {
  for (const k of f.positions) {
    if (!keys.has(k)) problems.push(`${fam}: ${k} is not a catalog position`);
    if (seen.has(k)) problems.push(`${k} is in both ${seen.get(k)} and ${fam}`);
    seen.set(k, fam);
  }
  const nums = [...f.balanced, ...f.semi, ...(Array.isArray(f.unbalanced) ? f.unbalanced : [])];
  for (const n of nums) if (!Number.isInteger(n) || n < 1 || n > 99) problems.push(`${fam}: ${n} is not a number 1-99`);
  if (f.unbalanced !== 'other') for (const n of f.unbalanced) if (f.balanced.includes(n)) problems.push(`${fam}: ${n} is both balanced and unbalanced`);
  for (const n of f.semi) if (f.balanced.includes(n)) problems.push(`${fam}: ${n} is both balanced and semi-balanced`);
}
for (const k of [...BALANCE.karmicPositions, ...BALANCE.fourCenters, ...BALANCE.sixCenters, ...BALANCE.psycheCenters]) if (!keys.has(k)) problems.push(`${k} is not a catalog position`);
for (const n of [...BALANCE.karmic, ...BALANCE.tension]) if (!Number.isInteger(n) || n < 1 || n > 99) problems.push(`karmic/tension: ${n}`);
for (let n = 10; n <= 99; n++) if (!NAMES[n]) problems.push(`no archetype name for ${n}`);
for (let n = 10; n <= 18; n++) if (!TEENAGE[n]) problems.push(`no teenage meaning for ${n}`);
for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) if (!NOTES[n]) problems.push(`no guide note for ${n}`);

if (problems.length) { console.error(problems.join('\n')); console.error(`check_facts: ${problems.length} problem(s)`); process.exit(1); }
console.log(`check_facts: ${Object.keys(BALANCE.families).length} families, ${seen.size} positions, ${Object.keys(NAMES).length} names: all good`);
