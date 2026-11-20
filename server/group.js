// What This Group Shares (owner 2026-11-20): the charts carrying one tag ("schoolshooter", "rapper") against
// every other chart in the vault. For each position and number: how many of the group hold it there, how many
// of the rest do, and how likely a gap that big is by luck alone. No AI, no meanings; counting only.
//
// - One person counts once: several charts with the same typed name and birth date are one.
// - Only charts whose name and date have been read can be counted (chart_values).
// - A position not every chart has (a middle name) is measured among the charts that have it.
// - A position that is a copy of another by construction (NOT_A_REPEAT) is not a second find.
// - A small group finds patterns by luck, and thousands of position-and-number pairs are looked at. So every
//   find is measured against luck itself: RANDOM groups of the same size are drawn from the vault, and the label
//   says how often a random group has a find at least this strong. Strong = fewer than 1 random group in 20,
//   Worth a Look = fewer than half, Could Be Chance = the rest. The draw is seeded by the group, so the same
//   group reads the same on every visit.
import { POSITIONS, NOT_A_REPEAT } from './positions.js';
import { positionName } from './similar.js';
import { fmt } from './facts.js';
import { displayName } from './tagnames.js';

const VISIBLE = new Set(POSITIONS.filter((p) => !p.hidden).map((p) => `${p.chart}.${p.key}`));
const ORDER = new Map(POSITIONS.map((p, i) => [`${p.chart}.${p.key}`, i]));
const NOT_COUNTED = new Set(NOT_A_REPEAT.spots);
const SKIP_ANYWHERE = new Set(NOT_A_REPEAT.positions);
const RANDOM_GROUPS = 300;

const logFacts = (N) => { const lf = new Float64Array(N + 1); for (let i = 1; i <= N; i++) lf[i] = lf[i - 1] + Math.log(i); return lf; };
// P(X >= a) when `n` charts are drawn from `N` of which `K` hold the number (hypergeometric upper tail).
function tail(lf, a, n, K, N) {
  const lc = (x, y) => (y < 0 || y > x ? -Infinity : lf[x] - lf[y] - lf[x - y]);
  const all = lc(N, n);
  let p = 0;
  for (let k = a; k <= Math.min(n, K); k++) p += Math.exp(lc(K, k) + lc(N - K, n - k) - all);
  return Math.min(1, p);
}
export const chanceOf = (a, n, K, N) => tail(logFacts(N), a, n, K, N);

const digitSum = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
const strengthOf = (share) => (share < 0.05 ? 'Strong' : share < 0.5 ? 'Worth a Look' : 'Could Be Chance');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function groupShares(db, tag, { limit = 12, anywhereLimit = 8, randomGroups = RANDOM_GROUPS } = {}) {
  const tagRow = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(String(tag || ''));
  const out = { tag: tagRow ? tagRow.name : String(tag || ''), display: displayName(tagRow ? tagRow.name : String(tag || '')), tagged: 0, size: 0, rest: 0, random_groups: randomGroups, cards: [], anywhere: [] };
  if (!tagRow) return out;
  const tagged = new Set(db.prepare("SELECT it.image_id AS id FROM image_tags it JOIN images i ON i.id = it.image_id WHERE it.tag_id = ? AND i.kind = 'chart'").all(tagRow.id).map((r) => r.id));
  out.tagged = tagged.size;

  // One chart per person (same typed name and date = one person); a person is in the group if any of their charts is.
  const byKey = new Map();
  for (const r of db.prepare("SELECT i.id, i.title, ci.name, ci.day, ci.month, ci.year FROM images i JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.kind = 'chart' ORDER BY i.id").all()) {
    const key = `${String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${r.day || ''}.${r.month || ''}.${r.year || ''}`;
    const p = byKey.get(key);
    const inGroup = tagged.has(r.id);
    if (!p) byKey.set(key, { id: r.id, title: r.title || r.name || '', inGroup });
    else if (inGroup && !p.inGroup) { p.id = r.id; p.title = r.title || r.name || p.title; p.inGroup = true; }
  }
  const people = [...byKey.values()];                       // index = the person's number below
  const indexOf = new Map(people.map((p, i) => [p.id, i]));
  const real = Uint8Array.from(people, (p) => (p.inGroup ? 1 : 0));
  const n = real.reduce((s, x) => s + x, 0);
  out.size = n; out.rest = people.length - n;
  if (n < 3 || out.rest < 3) return out;

  // spot -> everyone who has the position at all; spot|number -> everyone holding that number there.
  const has = new Map(), holds = new Map(), any = new Map();
  const put = (map, key, i) => { let s = map.get(key); if (!s) map.set(key, s = new Set()); s.add(i); };
  for (const v of db.prepare('SELECT image_id AS id, chart, position, sum, ds FROM chart_values').iterate()) {
    const i = indexOf.get(v.id); if (i === undefined) continue;
    const spot = `${v.chart}.${v.position}`;
    if (!VISIBLE.has(spot) || NOT_COUNTED.has(spot)) continue; // a copy of another position is not a second find
    put(has, spot, i);
    put(holds, `${spot}|${v.sum}`, i);
    if (v.sum > 9) put(holds, `${spot}|/${v.ds}`, i);         // any number with this digit sum (12/3, 21/3, 30/3 ...)
    if (!SKIP_ANYWHERE.has(v.position)) put(any, String(v.sum), i);
  }
  const spots = [...has.keys()];
  const spotIdx = new Map(spots.map((s, i) => [s, i]));
  const hasArr = spots.map((s) => Uint32Array.from(has.get(s)));
  const rows = [...holds].map(([key, set]) => { const [spot, num] = key.split('|'); return { spot, num, s: spotIdx.get(spot), who: Uint32Array.from(set) }; });
  const anyRows = [...any].map(([num, set]) => ({ num, who: Uint32Array.from(set) }));

  const lf = logFacts(people.length);
  const floor = n < 8 ? 2 : 3; // fewer charts than this sharing a number is never a find
  const hit = (who, flags) => { let a = 0; for (let k = 0; k < who.length; k++) a += flags[who[k]]; return a; };
  // Every find in one group (the real one, or a random one): position finds and anywhere finds, each with its chance.
  function finds(flags, keep) {
    const gOf = hasArr.map((arr) => hit(arr, flags));
    let best = 1, bestAny = 1;
    const list = [], anyList = [];
    for (const r of rows) {
      if (r.who.length < floor) continue;
      const a = hit(r.who, flags); if (a < floor) continue;
      const of = gOf[r.s], N = hasArr[r.s].length, K = r.who.length;
      if (!of || a / of <= (K - a) / Math.max(N - of, 1)) continue;
      const p = tail(lf, a, of, K, N);
      if (p < best) best = p;
      if (keep) list.push({ ...r, p, in_group: a, group_of: of, in_rest: K - a, rest_of: N - of });
    }
    for (const r of anyRows) {
      const a = hit(r.who, flags); if (a < floor) continue;
      const K = r.who.length, N = people.length;
      if (a / n <= (K - a) / (N - n)) continue;
      const p = tail(lf, a, n, K, N);
      if (p < bestAny) bestAny = p;
      if (keep) anyList.push({ ...r, p, in_group: a, group_of: n, in_rest: K - a, rest_of: N - n });
    }
    return { best, bestAny, list, anyList };
  }
  const mine = finds(real, true);

  // Luck itself: the strongest find in each of many random groups of the same size.
  let seed = n; for (let i = 0; i < real.length; i++) if (real[i]) seed = (Math.imul(seed, 31) + people[i].id) >>> 0;
  const rand = rng(seed);
  const order = Uint32Array.from(people, (_, i) => i);
  const luck = [], luckAny = [];
  for (let t = 0; t < randomGroups; t++) {
    const flags = new Uint8Array(people.length);
    for (let k = 0; k < n; k++) { const j = k + Math.floor(rand() * (order.length - k)); const x = order[k]; order[k] = order[j]; order[j] = x; flags[order[k]] = 1; }
    const f = finds(flags, false);
    luck.push(f.best); luckAny.push(f.bestAny);
  }
  const share = (dist, p) => dist.reduce((c, x) => c + (x <= p ? 1 : 0), 0) / Math.max(dist.length, 1); // random groups with a find this strong

  const names = (who) => { const set = []; for (const i of who) if (real[i]) set.push(i); return set.sort((x, y) => x - y); };
  const titles = (idx) => idx.map((i) => ({ id: people[i].id, title: people[i].title }));
  // A digit-sum find that is one number in disguise (every 3 in the group is a 12/3) says nothing new: drop it.
  const exact = mine.list.filter((f) => !f.num.startsWith('/'));
  const kept = mine.list.filter((f) => !f.num.startsWith('/') || !exact.some((e) => e.spot === f.spot && digitSum(Number(e.num)) === Number(f.num.slice(1)) && e.in_group === f.in_group));
  kept.sort((x, y) => x.p - y.p || y.in_group - x.in_group || (ORDER.get(x.spot) ?? 999) - (ORDER.get(y.spot) ?? 999));
  // The same charts sharing several positions (a day gives the whole essence chart) is one find, not five.
  const cards = new Map();
  for (const f of kept) {
    const idx = names(f.who), who = idx.join(',');
    const [chart, position] = f.spot.split('.');
    const family = f.num.startsWith('/');
    const item = { pos: f.spot, num: f.num, name: positionName(chart, position), number: family ? `Digit Sum ${f.num.slice(1)}` : fmt(Number(f.num), digitSum(Number(f.num))), family, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of };
    const c = cards.get(who);
    if (c) { if (c.items.some((i) => i.pos === item.pos)) continue; if (c.items.length < 3) c.items.push(item); else c.more += 1; continue; }
    if (cards.size >= limit) continue;
    const luckShare = share(luck, f.p);
    cards.set(who, { strength: strengthOf(luckShare), luck: luckShare, chance: f.p, items: [item], more: 0, charts: titles(idx) });
  }
  out.cards = [...cards.values()];

  mine.anyList.sort((x, y) => x.p - y.p || y.in_group - x.in_group);
  out.anywhere = mine.anyList.slice(0, anywhereLimit).map((f) => { const luckShare = share(luckAny, f.p); return { num: f.num, number: fmt(Number(f.num), digitSum(Number(f.num))), strength: strengthOf(luckShare), luck: luckShare, chance: f.p, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of, charts: titles(names(f.who)) }; });
  return out;
}
