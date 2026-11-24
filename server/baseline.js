// Ordinary people: the yardstick a researched group is measured against (owner 2026-11-24: the vault is "not that
// big and biased ... a lot of them are bad people"). Made-up charts, never saved: birth dates spread evenly over
// 1940-2005, names drawn from about 8,000 real first names (`names.txt.gz`; the same list stands in for surnames,
// whose letter sums spread the same way). Plain math, no AI, nothing spent. The draw is seeded, so the yardstick is the
// same on every start and every count is repeatable.
//
// Why it is needed (measured 2026-11-24 on the owner's charts): with no yardstick the most common numbers in the big
// spots are nearly the same for every group (YouTubers 9, 12/3, 15/6; mass shooters 12/3, 9, 15/6; tech people 12/3,
// 9, 15/6): they are common in everyone's chart by construction. The yardstick drops what everyone has.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { computeValues } from './positions.js';

export const BASELINE_SIZE = Number(process.env.BASELINE_SIZE) || 4000;
const FROM = Date.UTC(1940, 0, 1), TO = Date.UTC(2005, 11, 31);
let cached = null;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// Two pools of the same made-up people: with a middle name and without. A group whose names mostly lack middle names
// (the free database often holds only first and family name) must be measured against people whose names lack them
// too, or the name chart differences would come from the missing middle names (found 2026-11-24 on 4,470 YouTubers).
// [{ id, title, inGroup: false, values }] x2, built once per process, about two seconds.
export function baselinePools() {
  if (cached) return cached;
  const names = zlib.gunzipSync(fs.readFileSync(new URL('./names.txt.gz', import.meta.url))).toString('utf8').split('\n').map((s) => s.trim()).filter((s) => /^[a-z]{2,}$/.test(s));
  const rand = rng(20261124);
  const pick = () => cap(names[Math.floor(rand() * names.length)]);
  const withMiddle = [], without = [];
  for (let i = 0; withMiddle.length < BASELINE_SIZE && i < BASELINE_SIZE * 2; i++) {
    const d = new Date(FROM + Math.floor(rand() * ((TO - FROM) / 86400000 + 1)) * 86400000);
    const first = pick(), middle = pick(), last = pick();
    const date = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    let a = [], b = [];
    try { a = computeValues({ name: `${first} ${middle} ${last}`, ...date }); b = computeValues({ name: `${first} ${last}`, ...date }); } catch { continue; }
    if (!a.length || !b.length) continue;
    withMiddle.push({ id: -1000000 - withMiddle.length, title: '', inGroup: false, baseline: true, values: a });
    without.push({ id: -2000000 - without.length, title: '', inGroup: false, baseline: true, values: b });
  }
  cached = { withMiddle, without };
  return cached;
}
// The yardstick for a group: BASELINE_SIZE ordinary people, the same share with a middle name as the group has.
export function baselineFor(middleShare) {
  const { withMiddle, without } = baselinePools();
  const k = Math.round(Math.max(0, Math.min(1, middleShare)) * withMiddle.length);
  return [...withMiddle.slice(0, k), ...without.slice(k)];
}
