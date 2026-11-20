// What This Group Shares (owner 2026-11-20): the charts carrying one tag ("schoolshooter", "rapper") against
// every other chart in the vault. For each position and number: how many of the group hold it there, how many
// of the rest do, and how likely a gap that big is by luck alone. No AI, no meanings; counting only.
//
// - One person counts once: several charts with the same typed name and birth date are one.
// - Only charts whose name and date have been read can be counted (chart_values).
// - A position not every chart has (a middle name) is measured among the charts that have it.
// - A small group finds patterns by luck. Hundreds of position-and-number pairs are tried, so each find is
//   labelled by how many finds that strong luck alone would give: Strong (under 1 in 20), Worth a Look
//   (under 1), Could Be Chance (the rest). The label is on the screen with every card.
import { POSITIONS, NOT_A_REPEAT } from './positions.js';
import { positionName } from './similar.js';
import { fmt } from './facts.js';
import { displayName } from './tagnames.js';
import { whoSql } from './people.js';

const VISIBLE = new Set(POSITIONS.filter((p) => !p.hidden).map((p) => `${p.chart}.${p.key}`));
const ORDER = new Map(POSITIONS.map((p, i) => [`${p.chart}.${p.key}`, i]));
const NOT_COUNTED = new Set(NOT_A_REPEAT.spots);
const SKIP_ANYWHERE = new Set(NOT_A_REPEAT.positions);

// P(X >= a) when `n` charts are drawn from `N` of which `K` hold the number (hypergeometric upper tail).
export function chanceOf(a, n, K, N) {
  const lf = [0];
  for (let i = 1; i <= N; i++) lf.push(lf[i - 1] + Math.log(i));
  const lc = (x, y) => (y < 0 || y > x ? -Infinity : lf[x] - lf[y] - lf[x - y]);
  const all = lc(N, n);
  let p = 0;
  for (let k = a; k <= Math.min(n, K); k++) p += Math.exp(lc(K, k) + lc(N - K, n - k) - all);
  return Math.min(1, p);
}

const strengthOf = (expected) => (expected < 0.05 ? 'Strong' : expected < 1 ? 'Worth a Look' : 'Could Be Chance');

// The group is a tag's charts, or (who: [{ type, value, label }], server/people.js) a kind of person: "Rappers",
// "Went to Prison".
export function groupShares(db, tag, { limit = 12, anywhereLimit = 8, who = [] } = {}) {
  if (who.length) return shares(db, { who: who.map((w) => `${w.type}:${w.value}`), tag: '', display: who.map((w) => w.label).join(' + '), tagged: 0, size: 0, rest: 0, tried: 0, cards: [], anywhere: [] },
    (() => { const params = []; const sql = whoSql(who, params); return new Set(db.prepare(`SELECT i.id FROM images i WHERE i.kind = 'chart' ${sql}`).all(...params).map((r) => r.id)); })(), { limit, anywhereLimit });
  const tagRow = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(String(tag || ''));
  const out = { tag: tagRow ? tagRow.name : String(tag || ''), display: displayName(tagRow ? tagRow.name : String(tag || '')), tagged: 0, size: 0, rest: 0, tried: 0, cards: [], anywhere: [] };
  if (!tagRow) return out;
  const tagged = new Set(db.prepare("SELECT it.image_id AS id FROM image_tags it JOIN images i ON i.id = it.image_id WHERE it.tag_id = ? AND i.kind = 'chart'").all(tagRow.id).map((r) => r.id));
  return shares(db, out, tagged, { limit, anywhereLimit });
}

function shares(db, out, tagged, { limit, anywhereLimit }) {
  out.tagged = tagged.size;

  // One chart per person (same typed name and date = one person); a person is in the group if any of their charts is.
  const people = new Map();
  for (const r of db.prepare("SELECT i.id, i.title, ci.name, ci.day, ci.month, ci.year FROM images i JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.kind = 'chart' ORDER BY i.id").all()) {
    const key = `${String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${r.day || ''}.${r.month || ''}.${r.year || ''}`;
    const p = people.get(key);
    const inGroup = tagged.has(r.id);
    if (!p) people.set(key, { id: r.id, title: r.title || r.name || '', inGroup });
    else if (inGroup && !p.inGroup) { p.id = r.id; p.title = r.title || r.name || p.title; p.inGroup = true; }
  }
  const rep = new Map([...people.values()].map((p) => [p.id, p]));
  const group = [...rep.values()].filter((p) => p.inGroup);
  out.size = group.length; out.rest = rep.size - group.length;
  if (group.length < 3 || out.rest < 3) return out;

  // spot -> who has the position at all; spot|number -> who holds that number there. [group ids, rest ids]
  const has = new Map(), holds = new Map(), any = new Map();
  const put = (map, key, id, inGroup) => { let e = map.get(key); if (!e) map.set(key, e = [new Set(), new Set()]); e[inGroup ? 0 : 1].add(id); };
  for (const v of db.prepare('SELECT image_id AS id, chart, position, sum, ds FROM chart_values').iterate()) {
    const p = rep.get(v.id); if (!p) continue;
    const spot = `${v.chart}.${v.position}`;
    if (!VISIBLE.has(spot) || NOT_COUNTED.has(spot)) continue; // a copy of another position by construction is not a second find
    put(has, spot, v.id, p.inGroup);
    put(holds, `${spot}|${v.sum}`, v.id, p.inGroup);
    if (v.sum > 9) put(holds, `${spot}|/${v.ds}`, v.id, p.inGroup); // any number with this digit sum (12/3, 21/3, 30/3 ...)
    if (!SKIP_ANYWHERE.has(v.position)) put(any, String(v.sum), v.id, p.inGroup);
  }

  const floor = group.length < 8 ? 2 : 3; // fewer charts than this sharing a number is never a find
  const test = (g, r, gOf, rOf) => {
    const a = g.size, b = r.size;
    if (a < floor || !gOf || a / gOf <= (rOf ? b / rOf : 0)) return null;
    return chanceOf(a, gOf, a + b, gOf + rOf);
  };
  const names = (set) => group.filter((p) => set.has(p.id)).map((p) => ({ id: p.id, title: p.title }));

  const found = [];
  for (const [key, [g, r]] of holds) {
    const [spot, num] = key.split('|');
    const [hg, hr] = has.get(spot);
    const p = test(g, r, hg.size, hr.size);
    if (p === null) continue;
    found.push({ spot, num, p, g, in_group: g.size, group_of: hg.size, in_rest: r.size, rest_of: hr.size });
  }
  out.tried = found.length;
  // A digit-sum find that is one number in disguise (every 3 in the group is a 12/3) says nothing new: drop it.
  const exact = new Map(found.filter((f) => !f.num.startsWith('/')).map((f) => [`${f.spot}|${f.num}`, f]));
  const digitSum = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
  const kept = found.filter((f) => {
    if (!f.num.startsWith('/')) return true;
    const ds = Number(f.num.slice(1));
    return ![...exact.values()].some((e) => e.spot === f.spot && digitSum(Number(e.num)) === ds && e.in_group === f.in_group);
  });
  kept.sort((x, y) => x.p - y.p || y.in_group - x.in_group || (ORDER.get(x.spot) ?? 999) - (ORDER.get(y.spot) ?? 999));
  // The same charts sharing several positions (a day gives the whole essence chart) is one find, not five.
  const cards = new Map();
  for (const f of kept) {
    const who = [...f.g].sort((x, y) => x - y).join(',');
    const [chart, position] = f.spot.split('.');
    const family = f.num.startsWith('/');
    const item = { pos: f.spot, num: f.num, name: positionName(chart, position), number: family ? `Digit Sum ${f.num.slice(1)}` : fmt(Number(f.num), digitSum(Number(f.num))), family, in_group: f.in_group, group_of: f.group_of, in_rest: f.in_rest, rest_of: f.rest_of };
    const c = cards.get(who);
    if (c) { if (c.items.some((i) => i.pos === item.pos)) continue; if (c.items.length < 3) c.items.push(item); else c.more += 1; continue; }
    if (cards.size >= limit) continue;
    cards.set(who, { strength: strengthOf(f.p * out.tried), chance: f.p, items: [item], more: 0, charts: names(f.g) });
  }
  out.cards = [...cards.values()];

  const anyFound = [];
  for (const [num, [g, r]] of any) {
    const p = test(g, r, group.length, out.rest);
    if (p !== null) anyFound.push({ num, p, g, r });
  }
  anyFound.sort((x, y) => x.p - y.p || y.g.size - x.g.size);
  out.anywhere = anyFound.slice(0, anywhereLimit).map((f) => ({ num: f.num, number: fmt(Number(f.num), digitSum(Number(f.num))), strength: strengthOf(f.p * anyFound.length), chance: f.p, in_group: f.g.size, group_of: group.length, in_rest: f.r.size, rest_of: out.rest, charts: names(f.g) }));
  return out;
}
