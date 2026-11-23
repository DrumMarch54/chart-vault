// Collapse and expand (the owner's way of reading, interpretation.md; owner 2026-11-23: "zoom out with everything
// and see generalities ... tech people might just have a lot of numbers with four in it", then "zoom in and focus
// on one specific thing"). A group's charts read the way one chart is read. Counting only; the words come later
// (research.js hands these to the reading).
//
// EXPAND  the strong positions of every chart together (day, month, year, the names, life expression, the life
//         paths, pillar, the mind and emotion centers of every numeroscope):
//           number  one number that keeps turning up in a strong position ("18/9 in 15 of 20 charts")
//           family  a chart heavy with one family ("9s": 9, 18/9, 27/9 ...)
//           digit   a chart heavy with numbers that have a digit in them ("a 4 in it": 4, 40/4, 44/8, 14/5)
// COLLAPSE one part of the chart where one family leads: the themes group.js finds (a family across a center's
//         positions), then single strong positions ("Sixes as the Name Emotion Center Main Vibration").
//
// SOLID OR LEAN (owner 2026-11-23: "I want the insights to be solid"). The first build called a card clear when its
// own gap was rare. Tested on 40 groups of RANDOM vault people, 38 got a "clear" card: with a hundred numbers tried,
// something always looks rare. So every card is now measured the way themes are: RANDOM groups of the same size are
// drawn from everyone, the same search is run on each, and the card's label says how many random groups find
// something at least as strong of the same kind. Solid = fewer than 1 random group in 20 AND the theme shows in
// both halves of the group (a fluke carried by a few charts fails that). Everything else is a Lean. The birth
// year is a position like any other (owner: "maybe a certain type of people were born in a certain year"); it is
// never corrected away.
import { peopleValues, AREA } from './group.js';
import { weightOf } from './facts.js';
import { positionName } from './similar.js';
import { WORDS } from './archetype-words.js';

const ds = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
const fmt = (n) => (n < 10 ? String(n) : `${n}/${ds(n)}`);
const PLURAL = ['', 'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
const PSYCHE_CENTERS = new Set(['outer.heart', 'outer.solar', 'inner.heart', 'inner.solar']);
export const isStrong = (chart, position) => position !== 'anyName' && (weightOf(chart, position) >= 2 || PSYCHE_CENTERS.has(`${chart}.${position}`));
const titleOf = (n) => (WORDS[n] && WORDS[n].title) || '';

const RANDOM_GROUPS = 200;
const SOLID = 0.05;      // fewer than 1 random group in 20 finds something this strong
const STRONG_LEAN = 0.2; // fewer than 1 random group in 5
const LEAN = 0.5;        // fewer than half: past that it is what any pile of charts shows, and it is not a card
const SHOWN = 0.2;       // a gap must at least be this rare by itself to be a card at all
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function groupInsights(db, { ids = [], extra = [], themes = [], randomGroups = RANDOM_GROUPS } = {}) {
  const people = peopleValues(db, ids, extra).map((p) => ({ ...p, strong: p.values.filter((v) => isStrong(v.chart, v.position)) })).filter((p) => p.strong.length);
  const N = people.length;
  const real = Uint8Array.from(people, (p) => (p.inGroup ? 1 : 0));
  const n = real.reduce((s, x) => s + x, 0);
  const out = { size: n, rest: N - n, random_groups: randomGroups, solid: 0, expand: [], collapse: [] };
  if (n < 3 || N - n < 3) return out;

  // P(X >= a) when `of` charts are drawn from `Nu` of which `K` hold it (hypergeometric upper tail).
  const lf = new Float64Array(N + 1); for (let i = 1; i <= N; i++) lf[i] = lf[i - 1] + Math.log(i);
  const lc = (x, y) => (y < 0 || y > x ? -Infinity : lf[x] - lf[y] - lf[x - y]);
  const tail = (a, of, K, Nu) => { const all = lc(Nu, of); let p = 0; for (let k = a; k <= Math.min(of, K); k++) p += Math.exp(lc(K, k) + lc(Nu - K, of - k) - all); return Math.min(1, p); };

  // ---- every thing that can be an insight, as "who holds it" among "who could" (index lists into `people`) ----
  const rows = []; // { kind: 'number' | 'heavy' | 'spot', holders: Uint32Array, universe: Uint32Array | null, ... }
  const put = (map, key, i) => { let s = map.get(key); if (!s) map.set(key, s = new Set()); s.add(i); };
  const byNumber = new Map(), bySpot = new Map(), hasSpot = new Map();
  people.forEach((p, i) => { for (const v of p.strong) { put(byNumber, v.sum, i); const spot = `${v.chart}.${v.position}`; put(hasSpot, spot, i); put(bySpot, `${spot}|${v.ds}`, i); } });
  for (const [sum, set] of byNumber) rows.push({ kind: 'number', sum, holders: Uint32Array.from(set), universe: null });
  // "Heavy" = more strong positions of that kind than 7 charts in 10 have (the line is drawn over everyone, once).
  for (let d = 1; d <= 9; d++) for (const [type, test] of [['family', (v) => v.ds === d], ['digit', (v) => String(v.sum).includes(String(d))]]) {
    const cnt = people.map((p) => p.strong.filter(test).length);
    let k = 2; while (k < 30 && cnt.filter((c) => c >= k).length / N > 0.3) k++;
    const holders = []; cnt.forEach((c, i) => { if (c >= k) holders.push(i); });
    if (holders.length) rows.push({ kind: 'heavy', type, d, k, test, holders: Uint32Array.from(holders), universe: null });
  }
  const universes = new Map([...hasSpot].map(([spot, set]) => [spot, Uint32Array.from(set)]));
  for (const [key, set] of bySpot) { const [spot, d] = key.split('|'); rows.push({ kind: 'spot', spot, d: Number(d), holders: Uint32Array.from(set), universe: universes.get(spot) }); }

  const hit = (list, flags) => { let a = 0; for (let k = 0; k < list.length; k++) a += flags[list[k]]; return a; };
  const least = Math.max(3, Math.ceil(n * 0.1));
  // The search itself, on any group (the real one, or a random one): each row's gap and how rare it is.
  function search(flags, size, keep) {
    const best = { number: 1, heavy: 1, spot: 1 };
    const found = [];
    const ofCache = new Map();
    for (const r of rows) {
      const a = hit(r.holders, flags); if (a < least) continue;
      let of = size, Nu = N;
      if (r.universe) { of = ofCache.get(r.universe); if (of === undefined) ofCache.set(r.universe, of = hit(r.universe, flags)); Nu = r.universe.length; }
      const K = r.holders.length;
      if (!of || Nu - of <= 0 || a / of <= (K - a) / (Nu - of)) continue;
      const p = tail(a, of, K, Nu);
      if (p < best[r.kind]) best[r.kind] = p;
      if (keep) found.push({ r, p, a, of, k: K - a, restOf: Nu - of });
    }
    return { best, found };
  }
  const mine = search(real, n, true);

  // Luck itself: the strongest thing of each kind in each of many random groups of the same size.
  let seed = n; for (let i = 0; i < N; i++) if (real[i]) seed = (Math.imul(seed, 31) + people[i].id) >>> 0;
  const rand = rng(seed);
  const order = Uint32Array.from(people, (_, i) => i);
  const luck = { number: [], heavy: [], spot: [] };
  for (let t = 0; t < randomGroups; t++) {
    const flags = new Uint8Array(N);
    for (let k = 0; k < n; k++) { const j = k + Math.floor(rand() * (N - k)); const x = order[k]; order[k] = order[j]; order[j] = x; flags[order[k]] = 1; }
    const b = search(flags, n, false).best;
    luck.number.push(b.number); luck.heavy.push(b.heavy); luck.spot.push(b.spot);
  }
  const luckOf = (kind, p) => luck[kind].reduce((c, x) => c + (x <= p ? 1 : 0), 0) / Math.max(randomGroups, 1);

  // The split test: the group cut in two (every other member); a real theme is above the usual rate in BOTH halves.
  const members = []; for (let i = 0; i < N; i++) if (real[i]) members.push(i);
  const memberList = Uint32Array.from(members);
  const half = [new Uint8Array(N), new Uint8Array(N)]; members.forEach((i, k) => { half[k % 2][i] = 1; });
  const bothHalves = (f) => half.every((flags) => { const of = hit(f.r.universe || memberList, flags); return of > 0 && hit(f.r.holders, flags) / of > f.r.holders.length / (f.r.universe ? f.r.universe.length : N); });

  const who = (list) => list.map((i) => people[i]).map((p) => (p.virtual ? { id: null, ref: p.ref, title: p.title } : { id: p.id, title: p.title }));
  const inGroup = (r) => Array.from(r.holders).filter((i) => real[i]);
  const pct = (a, of) => (of ? Math.round((a / of) * 100) : 0);
  const stamp = (f) => { const l = luckOf(f.r.kind, f.p), halves = bothHalves(f); return { luck: l, halves, solid: l < SOLID && halves }; };
  // Cards of one part: every solid one (up to `most`), then leans (fewer than half the random groups match them)
  // up to two cards in all. What most random groups also show is never a card: a part may honestly be empty.
  const choose = (list, most) => { const solid = list.filter((x) => x.solid).slice(0, most); return solid.length >= 2 ? solid : [...solid, ...list.filter((x) => !x.solid && x.luck < LEAN).slice(0, 2 - solid.length)]; };

  // ---- EXPAND ----
  const expand = [];
  for (const f of mine.found.filter((x) => x.r.kind === 'number' && x.p < SHOWN)) {
    const g = inGroup(f.r);
    const spots = new Map(); for (const i of g) for (const v of people[i].strong) if (v.sum === f.r.sum) spots.set(`${v.chart}.${v.position}`, (spots.get(`${v.chart}.${v.position}`) || 0) + 1);
    const where = [...spots].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([spot]) => positionName(...spot.split('.')));
    expand.push({ key: `number:${f.r.sum}`, kind: 'number', p: f.p, sum: f.r.sum, big: fmt(f.r.sum), head: titleOf(f.r.sum) || `${fmt(f.r.sum)} in a Strong Position`, count: `${f.a} of ${n} charts`, in_group: f.a, group_of: n, usual: pct(f.k, f.restOf),
      detail: `In a strong position${where.length ? `, mostly the ${where.join(' and the ')}` : ''}.`, people: who(g), ...stamp(f) });
  }
  const heavy = [];
  for (const f of mine.found.filter((x) => x.r.kind === 'heavy' && x.p < SHOWN)) {
    const g = inGroup(f.r), r = f.r;
    const forms = new Map(); for (const i of g) for (const v of people[i].strong.filter(r.test)) forms.set(v.sum, (forms.get(v.sum) || 0) + 1);
    const top = [...forms].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => fmt(s));
    heavy.push({ key: `${r.type}:${r.d}`, kind: r.type, d: r.d, p: f.p, big: r.type === 'family' ? `${r.d}s` : `${r.d}`, head: r.type === 'family' ? `Charts Heavy With ${PLURAL[r.d]}` : `Numbers With a ${r.d} in Them`, count: `${f.a} of ${n} charts`, in_group: f.a, group_of: n, usual: pct(f.k, f.restOf),
      detail: `${r.k} or more of the strong positions${r.type === 'family' ? ` are a ${r.d} in one form or another` : ` hold a number with a ${r.d} in it`}: ${top.join(', ')}.`, people: who(g), ...stamp(f) });
  }
  heavy.sort((a, b) => a.p - b.p);
  const heavyKept = []; for (const h of heavy) if (!heavyKept.some((x) => x.d === h.d)) heavyKept.push(h); // the same digit as a family and as "in it" is one card
  out.expand = choose([...expand, ...heavyKept].sort((a, b) => a.p - b.p), 4);

  // ---- COLLAPSE: the themes first (a family across one part of a chart), then single strong positions ----
  const covered = new Set();
  const themeCards = (themes || []).filter((x) => x.luck < 0.5).slice(0, 2).map((t) => {
    for (const c of t.charts || []) covered.add(`${c}|${t.area}|${t.family}`);
    return { key: `theme:${t.area}:${t.family}:${(t.charts || []).join('+')}`, kind: 'theme', big: `${t.family}s`, head: t.title, count: `${t.people} of ${n} charts`, in_group: t.people, group_of: n, usual: null,
      detail: t.items.map((i) => `${i.number} as the ${i.name}: ${i.in_group} of ${i.group_of} (usually ${pct(i.in_rest, i.rest_of)} in 100)`).join(' · '), items: t.items.map((i) => ({ pos: i.pos, num: i.num, name: i.name, number: i.number })), people: t.charts_of || [],
      luck: t.luck, halves: null, solid: t.luck < SOLID };
  });
  const leaders = [];
  for (const f of mine.found.filter((x) => x.r.kind === 'spot' && x.p < SHOWN)) {
    const [chart, position] = f.r.spot.split('.');
    if (covered.has(`${chart}|${AREA[position]}|${f.r.d}`)) continue;
    const g = inGroup(f.r);
    const forms = new Map(); for (const i of g) for (const v of people[i].strong) if (`${v.chart}.${v.position}` === f.r.spot && v.ds === f.r.d) forms.set(v.sum, (forms.get(v.sum) || 0) + 1);
    leaders.push({ key: `spot:${f.r.spot}:${f.r.d}`, kind: 'spot', p: f.p, big: `${f.r.d}s`, head: `${PLURAL[f.r.d]} as the ${positionName(chart, position)}`, count: `${f.a} of ${f.of} charts`, in_group: f.a, group_of: f.of, usual: pct(f.k, f.restOf),
      detail: `${[...forms].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([sum, c]) => `${fmt(sum)} in ${c}`).join(', ')}.`, items: [{ pos: f.r.spot, num: `/${f.r.d}`, name: positionName(chart, position), number: `Any ${f.r.d}` }], people: who(g), ...stamp(f) });
  }
  leaders.sort((a, b) => a.p - b.p);
  out.collapse = [...themeCards, ...choose(leaders, 3)].sort((a, b) => Number(b.solid) - Number(a.solid)).slice(0, 3);
  for (const list of [out.expand, out.collapse]) for (const i of list) { delete i.p; delete i.test; i.lean = !i.solid; i.level = i.solid ? 'solid' : i.luck < STRONG_LEAN ? 'strong' : 'lean'; }
  out.solid = [...out.expand, ...out.collapse].filter((i) => i.solid).length;
  return out;
}
