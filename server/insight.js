// Collapse and expand (the owner's way of reading, interpretation.md; owner 2026-11-23: "zoom out with everything
// and see generalities ... tech people might just have a lot of numbers with four in it", then "zoom in and focus
// on one specific thing"). A group's charts read the way one chart is read. Counting only; the words come later
// (research.js hands these to the reading).
//
// EXPAND  a number that keeps turning up: in a strong position (day, month, year, the names, life expression, the
//         life paths, pillar, the mind and emotion centers of every numeroscope), anywhere in the chart, or many
//         times in one chart; a chart heavy with one family ("9s": 9, 18/9, 27/9 ...) or with numbers that have a
//         digit in them ("a 4 in it": 4, 40/4, 44/8, 14/5).
// COMBINATIONS: two numbers CLOSE TOGETHER (a diamond's two parts, a center's main and sub vibration, a center and
//         the auras beside it) or BOTH PRIMARY (day, life path, life expression, the names); never two far apart.
//         (owner 2026-11-23: "a certain number combination in the center, or numbers nearby each other ...
//         day and first name 8 and 15/6"; then, on mass shooters, "some sort of 4 combined with 9"): the two numbers
//         that make each diamond or center (`PARTS`), in every chart. 1 to 18 stay as they are, above counts as its
//         digit (26/8 -> 8), either way round. Read at three depths, because the owner sees "some sort of 4": the
//         exact pair (13/4 + 18/9), one side as a family (13/4 + Any 9) and both as families (Any 4 + Any 9); in one
//         spot or anywhere. And two numbers that are both in the same chart, wherever they sit (13/4 and 16/7).
// COLLAPSE one part of the chart where one family leads: the themes group.js finds (a family across a center's
//         positions), then single strong positions ("Sixes as the Name Emotion Center Main Vibration").
//
// SOLID OR LEAN (owner 2026-11-23: "I want the insights to be solid"). The first build called a card clear when its
// own gap was rare. Tested on 40 groups of RANDOM vault people, 38 got a "clear" card: with hundreds of things tried,
// something always looks rare. So every card is measured the way themes are: RANDOM groups of the same size are
// drawn from everyone, the same search is run on each, and the card's label says how many random groups find
// something at least as strong of the same kind. Solid = almost no random group (see SOLID) AND the theme shows in
// both halves of the group. The birth year is a position like any other (owner: "maybe a certain type of people
// were born in a certain year"); it is never corrected away.
//
import { peopleValues, AREA } from './group.js';
import { weightOf } from './facts.js';
import { PARTS, POSITIONS, NOT_A_REPEAT } from './positions.js';
import { positionName } from './similar.js';
import { WORDS } from './archetype-words.js';

const ds = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
const fmt = (n) => (n < 10 ? String(n) : `${n}/${ds(n)}`);
const PLURAL = ['', 'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
const PSYCHE_CENTERS = new Set(['outer.heart', 'outer.solar', 'inner.heart', 'inner.solar']);
export const isStrong = (chart, position) => position !== 'anyName' && (weightOf(chart, position) >= 2 || PSYCHE_CENTERS.has(`${chart}.${position}`));
const titleOf = (n) => (WORDS[n] && WORDS[n].title) || '';
// "Anywhere in the chart" = every position the chart shows, a copy of another position never counted twice.
const SHOWN_SPOTS = new Set(POSITIONS.filter((p) => !p.hidden).map((p) => `${p.chart}.${p.key}`));
for (const s of NOT_A_REPEAT.spots) SHOWN_SPOTS.delete(s);
const SKIP = new Set(NOT_A_REPEAT.positions);
const counts = (v) => SHOWN_SPOTS.has(`${v.chart}.${v.position}`) && !SKIP.has(v.position);

// ---- combinations ----
const comboNum = (n) => (n <= 18 ? n : ds(n));
const ESSENCE_DIAMONDS = new Set(['outerDiamond', 'innerDiamond', 'dharmaDiamond', 'nexus', 'target', 'challengeDiamond']);
// A side of a combination: "13" = that number (1 to 18 as written, above as its digit), "f4" = the family (4, 13/4).
const sideText = (s) => (s[0] === 'f' ? `Any ${s.slice(1)}` : fmt(Number(s)));
const sideNum = (s) => Number(s[0] === 'f' ? s.slice(1) : s);
const sideFam = (s) => ds(sideNum(s));
const order = (x, y) => (sideFam(x) - sideFam(y) || sideNum(x) - sideNum(y) || (x[0] === 'f') - (y[0] === 'f')) <= 0 ? [x, y] : [y, x];
const sideHolds = (s, n) => (s[0] === 'f' ? ds(n) === Number(s.slice(1)) : comboNum(n) === Number(s));
const NUMEROSCOPES = ['name', 'vocation', 'personality', 'outer', 'inner'];
const CHART_WORD = { name: 'Name Chart', vocation: 'Vocation Chart', personality: 'Personality Chart', outer: 'Outer Psyche', inner: 'Inner Psyche' };
const PRIMARY = ['essence.day', 'essence.littleLp', 'name.le', 'name.first', 'name.middle', 'name.last'];
// Every diamond or center of one person: [{ spot, x, y }] with the two parts as the chart holds them.
function diamondsOf(values) {
  const at = new Map();
  for (const v of values) { const k = `${v.chart}.${v.position}`; let l = at.get(k); if (!l) at.set(k, l = []); l.push(v.sum); }
  const out = [], seen = new Set();
  for (const v of values) {
    const parts = PARTS[v.position];
    if (!parts || (v.chart === 'essence') !== ESSENCE_DIAMONDS.has(v.position)) continue;
    const spot = `${v.chart}.${v.position}`;
    if (seen.has(spot)) continue; seen.add(spot);
    const side = (p) => at.get(p.includes('.') ? p : `${v.chart}.${p}`) || [];
    for (const x of side(parts[0])) for (const y of side(parts[1])) out.push({ spot, x, y });
  }
  // The owner's rule (2026-11-23, Brenton Tarrant's chart: the public aura 12/3 beside the mind center 4 "could be
  // considered a 12/3 combined with a 4 ... because they're right next to each other"): two numbers are a
  // combination when they sit CLOSE TOGETHER, or when both are PRIMARY positions. Never two that are far apart
  // (a mind center with the personality number is no combination).
  // Close together: a center and each aura beside it, in every numeroscope.
  for (const chart of NUMEROSCOPES) for (const [center, auras, label] of [['heart', ['upperLeft', 'upperRight'], 'Mind Center and the Auras Beside It'], ['solar', ['lowerLeft', 'lowerRight'], 'Emotion Center and the Auras Beside It']]) {
    for (const x of at.get(`${chart}.${center}`) || []) for (const aura of auras) for (const y of at.get(`${chart}.${aura}`) || []) out.push({ spot: `${chart}.${center}`, x, y, label: `${CHART_WORD[chart]} ${label}` });
  }
  // Primary positions, any two of them: the day, the life path, the life expression and the names.
  const primary = PRIMARY.map((k) => [k, at.get(k) || []]);
  for (let i = 0; i < primary.length; i++) for (let j = i + 1; j < primary.length; j++) for (const x of primary[i][1]) for (const y of primary[j][1]) out.push({ spot: primary[i][0], x, y, label: 'Primary Positions (Day, Life Path, Life Expression, Names)' });
  return out;
}
// The readings of one pair, from exact to loose: "13|18", "13|f9", "f4|18", "f4|f9".
function pairKeys(x, y) {
  const a = comboNum(x), b = comboNum(y);
  const keys = [order(String(a), String(b)), order(`f${ds(a)}`, `f${ds(b)}`)];
  if (a > 9) keys.push(order(String(a), `f${ds(b)}`));
  if (b > 9) keys.push(order(`f${ds(a)}`, String(b)));
  return keys.map((k) => k.join('|'));
}
const pairText = (key) => key.split('|').map(sideText).join(' + ');
const partName = (chart, part) => { const [c, p] = part.includes('.') ? part.split('.') : [chart, part]; return positionName(c, p); };

const RANDOM_GROUPS = 300;
// Five kinds of search run on every group (numbers, heavy charts, combinations, numbers together, places), so the
// bar for each is a fifth of 1 in 20: a group of random people then gets a Solid card about 1 time in 20 at most.
const SOLID = 0.01;
const STRONG_LEAN = 0.2; // fewer than 1 random group in 5
const LEAN = 0.5;        // fewer than half: past that it is what any pile of charts shows, and it is not a card
const SHOWN = 0.2;       // a gap must at least be this rare by itself to be a card at all
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Everyone with a name and a date, each with the three ways a chart is read here.
function prepare(db, ids, extra) {
  return peopleValues(db, ids, extra).map((p) => ({ ...p, strong: p.values.filter((v) => isStrong(v.chart, v.position)), all: p.values.filter(counts), diamonds: diamondsOf(p.values) })).filter((p) => p.strong.length);
}
function tailMaker(N) {
  const lf = new Float64Array(N + 1); for (let i = 1; i <= N; i++) lf[i] = lf[i - 1] + Math.log(i);
  const lc = (x, y) => (y < 0 || y > x ? -Infinity : lf[x] - lf[y] - lf[x - y]);
  // P(X >= a) when `of` charts are drawn from `Nu` of which `K` hold it (hypergeometric upper tail).
  return (a, of, K, Nu) => { const all = lc(Nu, of); let p = 0; for (let k = a; k <= Math.min(of, K); k++) p += Math.exp(lc(K, k) + lc(Nu - K, of - k) - all); return Math.min(1, p); };
}
// "Often" = more of it than 7 charts in 10 have (the line is drawn over everyone, once).
const oftenLine = (cnt, N) => { let k = 2; while (k < 40 && cnt.filter((c) => c >= k).length / N > 0.3) k++; return k; };

export function groupInsights(db, { ids = [], extra = [], themes = [], randomGroups = RANDOM_GROUPS } = {}) {
  const people = prepare(db, ids, extra);
  const N = people.length;
  const real = Uint8Array.from(people, (p) => (p.inGroup ? 1 : 0));
  const n = real.reduce((s, x) => s + x, 0);
  const out = { size: n, rest: N - n, random_groups: randomGroups, solid: 0, expand: [], combos: [], collapse: [] };
  if (n < 3 || N - n < 3) return out;
  const tail = tailMaker(N);
  const least = Math.max(3, Math.ceil(n * 0.1));

  // ---- every thing that can be an insight, as "who holds it" among "who could" (index lists into `people`) ----
  const rows = []; // { kind (which luck it is measured against), t (what it is), holders, universe | null, ... }
  const add = (row, set) => { if (set.size >= least) rows.push({ ...row, holders: Uint32Array.from(set) }); };
  const put = (map, key, i) => { let s = map.get(key); if (!s) map.set(key, s = new Set()); s.add(i); };
  const inStrong = new Map(), anywhere = new Map(), times = new Map(), bySpot = new Map(), hasSpot = new Map();
  people.forEach((p, i) => {
    for (const v of p.strong) { put(inStrong, v.sum, i); const spot = `${v.chart}.${v.position}`; put(hasSpot, spot, i); put(bySpot, `${spot}|${v.ds}`, i); }
    for (const v of p.all) { put(anywhere, v.sum, i); let t = times.get(v.sum); if (!t) times.set(v.sum, t = new Map()); t.set(i, (t.get(i) || 0) + 1); }
  });
  for (const [sum, set] of inStrong) add({ kind: 'number', t: 'strong', sum, universe: null }, set);
  for (const [sum, set] of anywhere) add({ kind: 'number', t: 'any', sum, universe: null }, set);
  for (const [sum, t] of times) { const cnt = people.map((_, i) => t.get(i) || 0), k = oftenLine(cnt, N); const set = new Set(); cnt.forEach((c, i) => { if (c >= k) set.add(i); }); add({ kind: 'number', t: 'often', sum, k, universe: null }, set); }
  for (let d = 1; d <= 9; d++) for (const [type, test] of [['family', (v) => v.ds === d], ['digit', (v) => String(v.sum).includes(String(d))]]) {
    const cnt = people.map((p) => p.strong.filter(test).length), k = oftenLine(cnt, N);
    const set = new Set(); cnt.forEach((c, i) => { if (c >= k) set.add(i); });
    add({ kind: 'heavy', t: 'heavy', type, d, k, test, universe: null }, set);
  }
  const universes = new Map([...hasSpot].map(([spot, set]) => [spot, Uint32Array.from(set)]));
  for (const [key, set] of bySpot) { const [spot, d] = key.split('|'); add({ kind: 'spot', t: 'spot', spot, d: Number(d), universe: universes.get(spot) }, set); }
  // A number (1 to 18 as written) sitting in a center: the name chart's two centers, or any numeroscope's.
  const nameCenter = new Map(), anyCenter = new Map();
  people.forEach((p, i) => { for (const v of p.values) { if (!/^(heart|solar|heartExtra|solarExtra)$/.test(v.position) || v.sum > 18) continue; put(anyCenter, v.sum, i); if (v.chart === 'name') put(nameCenter, v.sum, i); } });
  for (const [sum, set] of nameCenter) add({ kind: 'spot', t: 'center', sum, where: 'name', universe: null }, set);
  for (const [sum, set] of anyCenter) add({ kind: 'spot', t: 'center', sum, where: 'any', universe: null }, set);
  // Combinations: each pair at every depth, in its spot (among those who have that diamond) and anywhere.
  const comboAny = new Map();
  people.forEach((p, i) => { for (const c of p.diamonds) for (const key of pairKeys(c.x, c.y)) put(comboAny, key, i); });
  // A pair is read wherever it sits, not once per spot: reading every pair in each of the 46 diamonds tried about
  // twenty times more things, and the luck that comes with trying buried the pairs the owner sees (mass shooters,
  // 13/4 beside a 9: 39 of 122 against 20 in 100 usually).
  for (const [key, set] of comboAny) add({ kind: 'combo', t: 'comboAny', pair: key, universe: null }, set);
  // Two numbers (1 to 18) that are both somewhere in the same chart.
  const small = [...anywhere].filter(([sum]) => sum <= 18).sort((a, b) => a[0] - b[0]);
  for (let x = 0; x < small.length; x++) for (let y = x + 1; y < small.length; y++) {
    const [a, sa] = small[x], [b, sb] = small[y];
    const set = new Set(); for (const i of sa) if (sb.has(i)) set.add(i);
    if (set.size < N * 0.9) add({ kind: 'together', t: 'together', a, b, universe: null }, set); // a pair nearly every chart has says nothing
  }

  const hit = (list, flags) => { let a = 0; for (let k = 0; k < list.length; k++) a += flags[list[k]]; return a; };
  const KINDS = ['number', 'heavy', 'spot', 'combo', 'together'];
  // The search itself, on any group (the real one, or a random one): each row's gap and how rare it is.
  function search(flags, size, keep) {
    const best = { number: 1, heavy: 1, spot: 1, combo: 1, together: 1 };
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
  const shuffle = Uint32Array.from(people, (_, i) => i);
  const luck = Object.fromEntries(KINDS.map((k) => [k, []]));
  for (let t = 0; t < randomGroups; t++) {
    const flags = new Uint8Array(N);
    for (let k = 0; k < n; k++) { const j = k + Math.floor(rand() * (N - k)); const x = shuffle[k]; shuffle[k] = shuffle[j]; shuffle[j] = x; flags[shuffle[k]] = 1; }
    const b = search(flags, n, false).best;
    for (const kind of KINDS) luck[kind].push(b[kind]);
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
  const base = (f) => ({ p: f.p, in_group: f.a, group_of: f.of, usual: pct(f.k, f.restOf), people: who(inGroup(f.r)), ...stamp(f) });
  // Cards of one part, up to `most`: the solid ones first, then leans (fewer than half the random groups match them). What most random groups also show is never a card: a part may honestly be empty.
  const choose = (list, most) => { const solid = list.filter((x) => x.solid).slice(0, most); return [...solid, ...list.filter((x) => !x.solid && x.luck < LEAN).slice(0, most - solid.length)]; };
  const shown = (t) => mine.found.filter((x) => x.r.t === t && x.p < SHOWN);

  // ---- EXPAND ----
  const numbers = [];
  for (const f of shown('strong')) {
    const spots = new Map(); for (const i of inGroup(f.r)) for (const v of people[i].strong) if (v.sum === f.r.sum) spots.set(`${v.chart}.${v.position}`, (spots.get(`${v.chart}.${v.position}`) || 0) + 1);
    const where = [...spots].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([spot]) => positionName(...spot.split('.')));
    numbers.push({ key: `number:${f.r.sum}`, kind: 'number', sum: f.r.sum, big: fmt(f.r.sum), head: titleOf(f.r.sum) || `${fmt(f.r.sum)} in a Strong Position`, count: `${f.a} of ${n} charts`, detail: `In a strong position${where.length ? `, mostly the ${where.join(' and the ')}` : ''}.`, ...base(f) });
  }
  for (const f of shown('any')) numbers.push({ key: `anywhere:${f.r.sum}`, kind: 'number', sum: f.r.sum, big: fmt(f.r.sum), head: titleOf(f.r.sum) || `${fmt(f.r.sum)} in the Chart`, count: `${f.a} of ${n} charts`, detail: 'Somewhere in the chart, any position.', ...base(f) });
  for (const f of shown('often')) numbers.push({ key: `often:${f.r.sum}`, kind: 'number', sum: f.r.sum, big: fmt(f.r.sum), head: titleOf(f.r.sum) || `${fmt(f.r.sum)} Many Times`, count: `${f.a} of ${n} charts`, detail: `${f.r.k} or more times in one chart.`, ...base(f) });
  numbers.sort((a, b) => a.p - b.p);
  const numbersKept = []; for (const x of numbers) if (!numbersKept.some((y) => y.sum === x.sum)) numbersKept.push(x); // one card per number: its strongest reading
  const heavy = [];
  for (const f of shown('heavy')) {
    const r = f.r;
    const forms = new Map(); for (const i of inGroup(r)) for (const v of people[i].strong.filter(r.test)) forms.set(v.sum, (forms.get(v.sum) || 0) + 1);
    const top = [...forms].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => fmt(s));
    heavy.push({ key: `${r.type}:${r.d}`, kind: r.type, d: r.d, big: r.type === 'family' ? `${r.d}s` : `${r.d}`, head: r.type === 'family' ? `Charts Heavy With ${PLURAL[r.d]}` : `Numbers With a ${r.d} in Them`, count: `${f.a} of ${n} charts`,
      detail: `${r.k} or more of the strong positions${r.type === 'family' ? ` are a ${r.d} in one form or another` : ` hold a number with a ${r.d} in it`}: ${top.join(', ')}.`, ...base(f) });
  }
  heavy.sort((a, b) => a.p - b.p);
  const heavyKept = []; for (const h of heavy) if (!heavyKept.some((x) => x.d === h.d)) heavyKept.push(h); // the same digit as a family and as "in it" is one card
  // Two numbers that are both somewhere in a chart are NOT a combination (the owner's rule: a combination is close
  // together or both primary). It is a fact about the whole chart, so it sits here: at most two such cards.
  const together = shown('together').map((f) => ({ key: `together:${f.r.a}+${f.r.b}`, kind: 'together', a: f.r.a, b: f.r.b, big: `${fmt(f.r.a)} & ${fmt(f.r.b)}`, head: 'Both Somewhere in the Chart', count: `${f.a} of ${n} charts`, detail: 'Each in the chart, not side by side: not a combination.', ...base(f) })).sort((a, b) => a.p - b.p).slice(0, 2);
  out.expand = choose([...numbersKept, ...heavyKept, ...together].sort((a, b) => Number(b.solid) - Number(a.solid) || a.p - b.p), 4);

  // ---- COMBINATIONS ----
  const combos = [];
  for (const f of shown('comboAny')) {
    const r = f.r, [sa, sb] = r.pair.split('|');
    const card = { kind: 'combo', pair: r.pair, a: sideNum(sa), b: sideNum(sb), fam: `${sideFam(sa)}|${sideFam(sb)}`, big: pairText(r.pair), ...base(f) };
    {
      const where = new Map(); for (const i of inGroup(r)) for (const c of people[i].diamonds) if (pairKeys(c.x, c.y).includes(r.pair)) { const w = c.label || positionName(...c.spot.split('.')); where.set(w, (where.get(w) || 0) + 1); }
      const top = [...where].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([w]) => w);
      combos.push({ ...card, key: `comboAny:${r.pair}`, head: 'Close Together or Both Primary', count: `${f.a} of ${n} charts`, detail: `Mostly the ${top.join(' and the ')}.` });
    }
  }
  combos.sort((x, y) => Number(y.solid) - Number(x.solid) || x.p - y.p);
  const combosKept = []; for (const c of combos) if (!combosKept.some((x) => x.fam === c.fam)) combosKept.push(c); // one card per pair of families: its strongest reading
  out.combos = choose(combosKept, 4);

  // ---- COLLAPSE: the themes first (a family across one part of a chart), then single strong positions ----
  const covered = new Set();
  const themeCards = (themes || []).filter((x) => x.luck < 0.5).slice(0, 2).map((t) => {
    for (const c of t.charts || []) covered.add(`${c}|${t.area}|${t.family}`);
    return { key: `theme:${t.area}:${t.family}:${(t.charts || []).join('+')}`, kind: 'theme', big: `${t.family}s`, head: t.title, count: `${t.people} of ${n} charts`, in_group: t.people, group_of: n, usual: null,
      detail: t.items.map((i) => `${i.number} as the ${i.name}: ${i.in_group} of ${i.group_of} (usually ${pct(i.in_rest, i.rest_of)} in 100)`).join(' · '), items: t.items.map((i) => ({ pos: i.pos, num: i.num, name: i.name, number: i.number })), people: t.charts_of || [],
      luck: t.luck, halves: null, solid: t.luck < SOLID };
  });
  const leaders = [];
  for (const f of shown('spot')) {
    const [chart, position] = f.r.spot.split('.');
    if (covered.has(`${chart}|${AREA[position]}|${f.r.d}`)) continue;
    const forms = new Map(); for (const i of inGroup(f.r)) for (const v of people[i].strong) if (`${v.chart}.${v.position}` === f.r.spot && v.ds === f.r.d) forms.set(v.sum, (forms.get(v.sum) || 0) + 1);
    leaders.push({ key: `spot:${f.r.spot}:${f.r.d}`, kind: 'spot', big: `${f.r.d}s`, head: `${PLURAL[f.r.d]} as the ${positionName(chart, position)}`, count: `${f.a} of ${f.of} charts`,
      detail: `${[...forms].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([sum, c]) => `${fmt(sum)} in ${c}`).join(', ')}.`, items: [{ pos: f.r.spot, num: `/${f.r.d}`, name: positionName(chart, position), number: `Any ${f.r.d}` }], ...base(f) });
  }
  for (const f of shown('center')) leaders.push({ key: `center:${f.r.where}:${f.r.sum}`, kind: 'center', sum: f.r.sum, big: fmt(f.r.sum), head: f.r.where === 'name' ? 'In a Name Chart Center' : 'In a Center of Any Chart', count: `${f.a} of ${n} charts`,
    detail: f.r.where === 'name' ? 'The mind or emotion center of the name chart, main or sub vibration.' : 'A mind or emotion center of any numeroscope, main or sub vibration.', items: [], ...base(f) });
  leaders.sort((a, b) => a.p - b.p);
  const leadersKept = []; for (const l of leaders) if (!(l.kind === 'center' && leadersKept.some((x) => x.kind === 'center' && x.sum === l.sum))) leadersKept.push(l);
  out.collapse = [...themeCards, ...choose(leadersKept, 4)].sort((a, b) => Number(b.solid) - Number(a.solid)).slice(0, 4);
  for (const list of [out.expand, out.combos, out.collapse]) for (const i of list) { delete i.p; delete i.fam; i.lean = !i.solid; i.level = i.solid ? 'solid' : i.luck < STRONG_LEAN ? 'strong' : 'lean'; }
  out.solid = [...out.expand, ...out.combos, ...out.collapse].filter((i) => i.solid).length;
  return out;
}

