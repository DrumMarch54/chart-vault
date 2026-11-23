// Collapse and expand (the owner's way of reading, interpretation.md; owner 2026-11-23: "zoom out with everything
// and see generalities ... tech people might just have a lot of numbers with four in it", then "zoom in and focus
// on one specific thing"). A group's charts read the way one chart is read, not position by position against
// luck. Counting only; the words come later (research.js hands these to the reading).
//
// EXPAND  the strong positions of every chart together (day, month, year, the names, life expression, the life
//         paths, pillar, the mind and emotion centers of every numeroscope):
//           number  one number that keeps turning up in a strong position ("18/9 in 15 of 20 charts")
//           family  a chart heavy with one family ("9s": 9, 18/9, 27/9 ...)
//           digit   a chart heavy with numbers that have a digit in them ("a 4 in it": 4, 40/4, 44/8, 14/5)
// COLLAPSE one part of the chart where one family leads: the themes group.js finds (a family across a center's
//         positions), then single strong positions ("Sixes as the Name Emotion Center Main Vibration").
//
// The vault is only the yardstick for "more than usual": an insight is kept when a gap that size would be rare by
// luck (the limits below), and the screen shows it as a small "usually 42%". One person counts once.
import { peopleValues, chanceOf, AREA } from './group.js';
import { weightOf } from './facts.js';
import { positionName } from './similar.js';
import { WORDS } from './archetype-words.js';

const ds = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
const fmt = (n) => (n < 10 ? String(n) : `${n}/${ds(n)}`);
const PLURAL = ['', 'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
const PSYCHE_CENTERS = new Set(['outer.heart', 'outer.solar', 'inner.heart', 'inner.solar']);
export const isStrong = (chart, position) => position !== 'anyName' && (weightOf(chart, position) >= 2 || PSYCHE_CENTERS.has(`${chart}.${position}`));

// How rare a gap must be by luck to count as an insight. Looser where few things are tried, tighter where many are.
const P_NUMBER = 0.03, P_HEAVY = 0.03, P_SPOT = 0.01;
const titleOf = (n) => (WORDS[n] && WORDS[n].title) || '';

export function groupInsights(db, { ids = [], extra = [], themes = [] } = {}) {
  const people = peopleValues(db, ids, extra).map((p) => ({ ...p, strong: p.values.filter((v) => isStrong(v.chart, v.position)) })).filter((p) => p.strong.length);
  const group = people.filter((p) => p.inGroup), rest = people.filter((p) => !p.inGroup);
  const n = group.length, N = people.length;
  const out = { size: n, rest: rest.length, expand: [], collapse: [] };
  if (n < 3 || rest.length < 3) return out;
  const who = (list) => list.map((p) => (p.virtual ? { id: null, ref: p.ref, title: p.title } : { id: p.id, title: p.title }));
  const pct = (a, of) => (of ? Math.round((a / of) * 100) : 0);
  const least = Math.max(3, Math.ceil(n * 0.1));
  // One test: `a` of the group against `k` of the rest. null = not more than usual, or too easily luck.
  const gap = (a, of, k, restOf, limit) => {
    if (a < least || !of || !restOf || a / of <= k / restOf) return null;
    const p = chanceOf(a, of, a + k, of + restOf);
    return p < limit ? p : null;
  };

  // ---- EXPAND: one number in a strong position ----
  const holders = new Map(); // sum -> { g: [people], r: count, spots: Map(spot -> count in the group) }
  for (const p of people) {
    const seen = new Set();
    for (const v of p.strong) {
      let h = holders.get(v.sum); if (!h) holders.set(v.sum, h = { g: [], r: 0, spots: new Map() });
      if (p.inGroup) h.spots.set(`${v.chart}.${v.position}`, (h.spots.get(`${v.chart}.${v.position}`) || 0) + 1);
      if (seen.has(v.sum)) continue; seen.add(v.sum);
      if (p.inGroup) h.g.push(p); else h.r++;
    }
  }
  const numbers = [];
  for (const [sum, h] of holders) {
    const p = gap(h.g.length, n, h.r, rest.length, P_NUMBER);
    if (p === null) continue;
    const where = [...h.spots].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([spot]) => positionName(...spot.split('.')));
    numbers.push({ key: `number:${sum}`, kind: 'number', p, sum, big: fmt(sum), head: titleOf(sum) || `${fmt(sum)} in a Strong Position`, count: `${h.g.length} of ${n} charts`, in_group: h.g.length, group_of: n, usual: pct(h.r, rest.length),
      detail: `In a strong position${where.length ? `, mostly the ${where.join(' and the ')}` : ''}.`, people: who(h.g) });
  }
  numbers.sort((a, b) => a.p - b.p);

  // ---- EXPAND: a chart heavy with one family, or with numbers holding one digit ----
  const heavy = [];
  for (let d = 1; d <= 9; d++) {
    for (const [kind, test] of [['family', (v) => v.ds === d], ['digit', (v) => String(v.sum).includes(String(d))]]) {
      const cnt = (p) => p.strong.filter(test).length;
      const rc = rest.map(cnt), gc = group.map(cnt);
      // "heavy" = more strong positions of this kind than 7 charts in 10 have.
      let k = 2; while (k < 30 && rc.filter((c) => c >= k).length / rest.length > 0.3) k++;
      const g = group.filter((_, i) => gc[i] >= k), r = rc.filter((c) => c >= k).length;
      const p = gap(g.length, n, r, rest.length, P_HEAVY);
      if (p === null) continue;
      const forms = new Map(); for (const x of g) for (const v of x.strong.filter(test)) forms.set(v.sum, (forms.get(v.sum) || 0) + 1);
      const top = [...forms].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => fmt(s));
      heavy.push({ key: `${kind}:${d}`, kind, d, p, big: kind === 'family' ? `${d}s` : `${d}`, head: kind === 'family' ? `Charts Heavy With ${PLURAL[d]}` : `Numbers With a ${d} in Them`, count: `${g.length} of ${n} charts`, in_group: g.length, group_of: n, usual: pct(r, rest.length),
        detail: `${k} or more of the strong positions${kind === 'family' ? ` are a ${d} in one form or another` : ` hold a number with a ${d} in it`}: ${top.join(', ')}.`, people: who(g) });
    }
  }
  heavy.sort((a, b) => a.p - b.p);
  // The same digit as a family and as "in it" is one insight: the stronger stays.
  const heavyKept = []; for (const h of heavy) if (!heavyKept.some((x) => x.d === h.d)) heavyKept.push(h);
  out.expand = [...numbers.slice(0, 4), ...heavyKept.slice(0, 2)].sort((a, b) => a.p - b.p).slice(0, 5);

  // ---- COLLAPSE: the themes first (a family across one part of a chart), then single strong positions ----
  const covered = new Set();
  for (const t of (themes || []).filter((x) => x.luck < 0.5).slice(0, 2)) {
    for (const c of t.charts || []) covered.add(`${c}|${t.area}|${t.family}`);
    out.collapse.push({ key: `theme:${t.area}:${t.family}:${(t.charts || []).join('+')}`, kind: 'theme', big: `${t.family}s`, head: t.title, count: `${t.people} of ${n} charts`, in_group: t.people, group_of: n, usual: null,
      detail: t.items.map((i) => `${i.number} as the ${i.name}: ${i.in_group} of ${i.group_of} (usually ${pct(i.in_rest, i.rest_of)}%)`).join(' · '), items: t.items.map((i) => ({ pos: i.pos, num: i.num, name: i.name, number: i.number })), people: t.charts_of || [] });
  }
  const spots = new Map(); // spot|d -> { g: [people], r, of, restOf, forms }
  const hasSpot = new Map();
  for (const p of people) {
    const seenSpot = new Set(), seenKey = new Set();
    for (const v of p.strong) {
      const spot = `${v.chart}.${v.position}`, key = `${spot}|${v.ds}`;
      if (!seenSpot.has(spot)) { seenSpot.add(spot); const h = hasSpot.get(spot) || { g: 0, r: 0 }; if (p.inGroup) h.g++; else h.r++; hasSpot.set(spot, h); }
      let s = spots.get(key); if (!s) spots.set(key, s = { g: [], r: 0, forms: new Map() });
      if (p.inGroup) s.forms.set(v.sum, (s.forms.get(v.sum) || 0) + 1);
      if (seenKey.has(key)) continue; seenKey.add(key);
      if (p.inGroup) s.g.push(p); else s.r++;
    }
  }
  const leaders = [];
  for (const [key, s] of spots) {
    const [spot, d] = key.split('|'); const [chart, position] = spot.split('.');
    if (covered.has(`${chart}|${AREA[position]}|${d}`)) continue;
    const h = hasSpot.get(spot);
    const p = gap(s.g.length, h.g, s.r, h.r, P_SPOT);
    if (p === null) continue;
    const forms = [...s.forms].sort((a, b) => b[1] - a[1]).map(([sum, c]) => `${fmt(sum)} in ${c}`);
    leaders.push({ key: `spot:${spot}:${d}`, kind: 'spot', p, big: `${d}s`, head: `${PLURAL[d]} as the ${positionName(chart, position)}`, count: `${s.g.length} of ${h.g} charts`, in_group: s.g.length, group_of: h.g, usual: pct(s.r, h.r),
      detail: `${forms.slice(0, 4).join(', ')}.`, items: [{ pos: spot, num: `/${d}`, name: positionName(chart, position), number: `Any ${d}` }], people: who(s.g) });
  }
  leaders.sort((a, b) => a.p - b.p);
  out.collapse.push(...leaders.slice(0, Math.max(0, 3 - out.collapse.length)));
  for (const list of [out.expand, out.collapse]) for (const i of list) delete i.p;
  return out;
}
