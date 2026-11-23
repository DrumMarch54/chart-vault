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
import { POSITIONS, NOT_A_REPEAT, computeValues } from './positions.js';
import { positionName } from './similar.js';
import { fmt } from './facts.js';
import { displayName } from './tagnames.js';
import { whoSql } from './people.js';

const VISIBLE = new Set(POSITIONS.filter((p) => !p.hidden).map((p) => `${p.chart}.${p.key}`));
const ORDER = new Map(POSITIONS.map((p, i) => [`${p.chart}.${p.key}`, i]));
const NOT_COUNTED = new Set(NOT_A_REPEAT.spots);
const SKIP_ANYWHERE = new Set(NOT_A_REPEAT.positions);
const RANDOM_GROUPS = 300;

// THEMES (owner 2026-11-23: "so many nines in the solar plexus centers"): finds are not read one by one. Several
// finds of the same number family (9, 18/9, 27/9, 81/9 ...) sitting in the same part of a numeroscope are ONE theme:
// "Nines in the Name Chart's Emotion Center". The parts follow the course: a center is its main and sub vibration,
// its sub diamond and the diamond behind it. The same part in several charts (the sexual centers of the name,
// vocation, personality and psyche charts) is one theme too.
const AREA = {
  heart: 'mind', heartExtra: 'mind', heartSubDiamond: 'mind', mindDiamond: 'mind',
  solar: 'emotion', solarExtra: 'emotion', solarSubDiamond: 'emotion', emotionDiamond: 'emotion',
  first: 'line', middle: 'line', last: 'line', leDiamond: 'line',
  le: 'le', big: 'le', pillar: 'le', spine: 'le', spineDiamond: 'le',
  upperLeft: 'auras', upperRight: 'auras', lowerLeft: 'auras', lowerRight: 'auras',
};
const AREA_NAME = { mind: ['Mind Center', 'Mind Centers'], emotion: ['Emotion Center (Solar Plexus)', 'Emotion Centers (Solar Plexus)'], line: ['Name Line', 'Name Lines'], le: ['Life Expression and Pillar', 'Life Expression and Pillar'], auras: ['Auras', 'Auras'] };
const CHART_NAME = { name: 'Name Chart', vocation: 'Vocation Chart', personality: 'Personality Chart', outer: 'Outer Psyche Chart', inner: 'Inner Psyche Chart' };
const PLURAL = ['', 'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines'];
const THEME_P = 0.02; // a find must be at least this unusual by itself to join a theme


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

// The group is a tag's charts, or (who: [{ type, value, label }], server/people.js) a kind of person: "Rappers",
// "Went to Prison".
export function groupShares(db, tag, { limit = 12, anywhereLimit = 8, randomGroups = RANDOM_GROUPS, who = [] } = {}) {
  const blank = { tagged: 0, size: 0, rest: 0, random_groups: randomGroups, cards: [], anywhere: [], themes: [] };
  if (who.length) {
    const params = [], sql = whoSql(who, params);
    const ids = new Set(db.prepare(`SELECT i.id FROM images i WHERE i.kind = 'chart' ${sql}`).all(...params).map((r) => r.id));
    return shares(db, { who: who.map((w) => `${w.type}:${w.value}`), tag: '', display: who.map((w) => w.label).join(' + '), ...blank }, ids, { limit, anywhereLimit, randomGroups });
  }
  const tagRow = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(String(tag || ''));
  const out = { tag: tagRow ? tagRow.name : String(tag || ''), display: displayName(tagRow ? tagRow.name : String(tag || '')), ...blank };
  if (!tagRow) return out;
  const tagged = new Set(db.prepare("SELECT it.image_id AS id FROM image_tags it JOIN images i ON i.id = it.image_id WHERE it.tag_id = ? AND i.kind = 'chart'").all(tagRow.id).map((r) => r.id));
  return shares(db, out, tagged, { limit, anywhereLimit, randomGroups });
}

// A group that is not all in the vault (Research a Group, server/research.js): `ids` are vault charts, `extra` are
// people found online and not saved: [{ name, day, month, year, title, ref }]. Their numbers come from the engine
// directly; they are only ever IN the group, never among "the others", so strangers never shift the yardstick.
// A find's charts carry `ref` for such a person (no chart id to open).
export function sharesOf(db, { ids = [], extra = [], display = '', limit = 12, anywhereLimit = 8, randomGroups = RANDOM_GROUPS } = {}) {
  return shares(db, { tag: '', display, tagged: 0, size: 0, rest: 0, random_groups: randomGroups, cards: [], anywhere: [], themes: [] }, new Set(ids), { limit, anywhereLimit, randomGroups, extra });
}

const personKey = (r) => `${String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${r.day || ''}.${r.month || ''}.${r.year || ''}`;

function shares(db, out, tagged, { limit, anywhereLimit, randomGroups, extra = [] }) {
  out.tagged = tagged.size + extra.length;

  // One chart per person (same typed name and date = one person); a person is in the group if any of their charts is.
  const byKey = new Map();
  for (const r of db.prepare("SELECT i.id, i.title, ci.name, ci.day, ci.month, ci.year FROM images i JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.kind = 'chart' ORDER BY i.id").all()) {
    const key = personKey(r);
    const p = byKey.get(key);
    const inGroup = tagged.has(r.id);
    if (!p) byKey.set(key, { id: r.id, title: r.title || r.name || '', inGroup });
    else if (inGroup && !p.inGroup) { p.id = r.id; p.title = r.title || r.name || p.title; p.inGroup = true; }
  }
  // People who are not in the vault: a made-up negative id, the values straight from the engine. Someone the vault
  // already holds (same name and date) is that vault person, now in the group.
  const virtual = [];
  extra.forEach((e, n) => {
    const p = byKey.get(personKey(e));
    if (p) { p.inGroup = true; if (p.ref === undefined) p.ref = e.ref; return; }
    let values = [];
    try { values = computeValues({ day: e.day, month: e.month, year: e.year, name: e.name }); } catch { values = []; }
    if (!values.length) return;
    const person = { id: -(n + 1), title: e.title || e.name || '', inGroup: true, ref: e.ref, virtual: true };
    byKey.set(personKey(e), person);
    virtual.push({ person, values });
  });
  const people = [...byKey.values()];                       // index = the person's number below
  const indexOf = new Map(people.map((p, i) => [p.id, i]));
  const real = Uint8Array.from(people, (p) => (p.inGroup ? 1 : 0));
  const n = real.reduce((s, x) => s + x, 0);
  out.size = n; out.rest = people.length - n;
  if (n < 3 || out.rest < 3) return out;

  // spot -> everyone who has the position at all; spot|number -> everyone holding that number there.
  const has = new Map(), holds = new Map(), any = new Map();
  const put = (map, key, i) => { let s = map.get(key); if (!s) map.set(key, s = new Set()); s.add(i); };
  const take = (i, v) => {
    const spot = `${v.chart}.${v.position}`;
    if (!VISIBLE.has(spot) || NOT_COUNTED.has(spot)) return;   // a copy of another position is not a second find
    put(has, spot, i);
    put(holds, `${spot}|${v.sum}`, i);
    put(holds, `${spot}|/${v.ds}`, i);                        // the number family: 9, 18/9, 27/9 ... (2026-11-23: the plain 9 was left out, so a group's nines were split in two)
    if (!SKIP_ANYWHERE.has(v.position)) put(any, String(v.sum), i);
  };
  for (const v of db.prepare('SELECT image_id AS id, chart, position, sum, ds FROM chart_values').iterate()) {
    const i = indexOf.get(v.id); if (i !== undefined) take(i, v);
  }
  for (const { person, values } of virtual) { const i = indexOf.get(person.id); for (const v of values) take(i, v); }
  const spots = [...has.keys()];
  const spotIdx = new Map(spots.map((s, i) => [s, i]));
  const hasArr = spots.map((s) => Uint32Array.from(has.get(s)));
  const rows = [...holds].map(([key, set]) => {
    const [spot, num] = key.split('|');
    const [chart, position] = spot.split('.');
    const d = num.startsWith('/') ? Number(num.slice(1)) : digitSum(Number(num));
    const area = CHART_NAME[chart] ? AREA[position] : null; // the higher self triangle has no centers: no themes there
    return { spot, num, s: spotIdx.get(spot), who: Uint32Array.from(set), theme: area ? `${area}|${d}` : null };
  });
  const anyRows = [...any].map(([num, set]) => ({ num, who: Uint32Array.from(set) }));

  const lf = logFacts(people.length);
  const floor = n < 8 ? 2 : 3; // fewer charts than this sharing a number is never a find
  const hit = (who, flags) => { let a = 0; for (let k = 0; k < who.length; k++) a += flags[who[k]]; return a; };
  // Every find in one group (the real one, or a random one): position finds and anywhere finds, each with its chance.
  function finds(flags, keep) {
    const gOf = hasArr.map((arr) => hit(arr, flags));
    let best = 1, bestAny = 1;
    const list = [], anyList = [];
    const themes = new Map(); // "emotion|9" -> position -> its strongest find
    for (const r of rows) {
      if (r.who.length < floor) continue;
      const a = hit(r.who, flags); if (a < floor) continue;
      const of = gOf[r.s], N = hasArr[r.s].length, K = r.who.length;
      if (!of || a / of <= (K - a) / Math.max(N - of, 1)) continue;
      const p = tail(lf, a, of, K, N);
      if (p < best) best = p;
      const row = keep ? { ...r, p, in_group: a, group_of: of, in_rest: K - a, rest_of: N - of } : null;
      if (keep) list.push(row);
      if (r.theme && p < THEME_P) {
        let t = themes.get(r.theme); if (!t) themes.set(r.theme, t = new Map());
        const had = t.get(r.spot);
        if (!had || p < had.p) t.set(r.spot, keep ? row : { p });
      }
    }
    // A theme is two or more positions of one part holding the same family; its weight adds up how unusual each is.
    let bestTheme = 0;
    const themeList = [];
    for (const [key, t] of themes) {
      if (t.size < 2) continue;
      let score = 0; for (const f of t.values()) score -= Math.log10(Math.max(f.p, 1e-12));
      if (score > bestTheme) bestTheme = score;
      if (keep) themeList.push({ key, score, finds: [...t.values()].sort((x, y) => x.p - y.p) });
    }
    for (const r of anyRows) {
      const a = hit(r.who, flags); if (a < floor) continue;
      const K = r.who.length, N = people.length;
      if (a / n <= (K - a) / (N - n)) continue;
      const p = tail(lf, a, n, K, N);
      if (p < bestAny) bestAny = p;
      if (keep) anyList.push({ ...r, p, in_group: a, group_of: n, in_rest: K - a, rest_of: N - n });
    }
    return { best, bestAny, list, anyList, bestTheme, themeList };
  }
  const mine = finds(real, true);

  // Luck itself: the strongest find in each of many random groups of the same size.
  let seed = n; for (let i = 0; i < real.length; i++) if (real[i]) seed = (Math.imul(seed, 31) + people[i].id) >>> 0;
  const rand = rng(seed);
  const order = Uint32Array.from(people, (_, i) => i);
  const luck = [], luckAny = [], luckTheme = [];
  for (let t = 0; t < randomGroups; t++) {
    const flags = new Uint8Array(people.length);
    for (let k = 0; k < n; k++) { const j = k + Math.floor(rand() * (order.length - k)); const x = order[k]; order[k] = order[j]; order[j] = x; flags[order[k]] = 1; }
    const f = finds(flags, false);
    luck.push(f.best); luckAny.push(f.bestAny); luckTheme.push(f.bestTheme);
  }
  const share = (dist, p) => dist.reduce((c, x) => c + (x <= p ? 1 : 0), 0) / Math.max(dist.length, 1); // random groups with a find this strong

  const names = (who) => { const set = []; for (const i of who) if (real[i]) set.push(i); return set.sort((x, y) => x - y); };
  const titles = (idx) => idx.map((i) => (people[i].virtual ? { id: null, ref: people[i].ref, title: people[i].title } : { id: people[i].id, title: people[i].title }));
  out.members = people.filter((p) => p.inGroup).map((p) => (p.virtual ? { id: null, ref: p.ref, title: p.title } : { id: p.id, title: p.title, ...(p.ref !== undefined ? { ref: p.ref } : {}) }));
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
    const item = { pos: f.spot, num: f.num, name: positionName(chart, position), number: family ? `Any ${f.num.slice(1)}` : fmt(Number(f.num), digitSum(Number(f.num))), family, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of };
    const c = cards.get(who);
    if (c) { if (c.items.some((i) => i.pos === item.pos)) continue; if (c.items.length < 3) c.items.push(item); else c.more += 1; continue; }
    if (cards.size >= limit) continue;
    const luckShare = share(luck, f.p);
    cards.set(who, { strength: strengthOf(luckShare), luck: luckShare, chance: f.p, items: [item], more: 0, charts: titles(idx) });
  }
  out.cards = [...cards.values()];

  // The themes, heaviest first; the label says how many random groups have a theme at least this heavy.
  const itemOf = (f) => { const [chart, position] = f.spot.split('.'); const family = f.num.startsWith('/'); return { pos: f.spot, num: f.num, name: positionName(chart, position), number: family ? `Any ${f.num.slice(1)}` : fmt(Number(f.num), digitSum(Number(f.num))), family, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of }; };
  out.themes = mine.themeList.sort((x, y) => y.score - x.score).slice(0, 6).map((t) => {
    const [area, d] = t.key.split('|');
    const charts = [...new Set(t.finds.map((f) => f.spot.split('.')[0]))].sort((x, y) => Object.keys(CHART_NAME).indexOf(x) - Object.keys(CHART_NAME).indexOf(y));
    const title = charts.length === 1 ? `${PLURAL[d]} in the ${CHART_NAME[charts[0]]}'s ${AREA_NAME[area][0]}` : `${PLURAL[d]} in the ${AREA_NAME[area][1]}: ${charts.map((c) => CHART_NAME[c]).join(', ')}`;
    const who = new Set(); for (const f of t.finds) for (const i of names(f.who)) who.add(i);
    const luckShare = luckTheme.reduce((c, x) => c + (x >= t.score ? 1 : 0), 0) / Math.max(luckTheme.length, 1);
    return { title, family: Number(d), area, charts, strength: strengthOf(luckShare), luck: luckShare, items: t.finds.slice(0, 6).map(itemOf), more: Math.max(0, t.finds.length - 6), people: who.size, charts_of: titles([...who].sort((x, y) => x - y)) };
  });

  mine.anyList.sort((x, y) => x.p - y.p || y.in_group - x.in_group);
  out.anywhere = mine.anyList.slice(0, anywhereLimit).map((f) => { const luckShare = share(luckAny, f.p); return { num: f.num, number: fmt(Number(f.num), digitSum(Number(f.num))), strength: strengthOf(luckShare), luck: luckShare, chance: f.p, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of, charts: titles(names(f.who)) }; });
  return out;
}
