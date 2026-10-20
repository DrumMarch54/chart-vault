// Charts like this one (owner's ask 2026-10-19): every other chart scored by how many positions hold the very
// same number, per chart (essence, name, vocation, personality, outer and inner psyche). "Same" = the same
// position, the same repeat index and the same number (12/3 is not 3/3). Hidden helper positions (any name)
// do not count. The owner ranks by every chart together or by one chart; the counts for all six come back
// either way, so the screen can show "Essence 9 of 11 · Name 3 of 15".
import { CHARTS, POSITIONS } from './positions.js';

// --- naming what is alike, in the course's own words (.brain/numerology/lingo.md; owner 2026-10-19: "Outer Psyche
// Life Expression Diamond", never "half the outer psyche"). A matched diamond implies the positions it is made of,
// so only the biggest matching structure is named; Title Case everywhere.
const CHART_NAME = { essence: 'Essence Chart', name: 'Name Chart', vocation: 'Vocation Chart', personality: 'Personality Chart', outer: 'Outer Psyche Chart', inner: 'Inner Psyche Chart' };
const PREFIX = { essence: '', name: '', vocation: 'Vocation ', personality: 'Personality ', outer: 'Outer Psyche ', inner: 'Inner Psyche ' };
const SPECIAL = {
  'essence.nexus': 'DVLP', 'essence.topAura': 'Dharma Line', 'essence.outerAura': 'Outer Aura', 'essence.innerAura': 'Inner Aura', 'essence.challengeDiamond': 'Challenge Diamond',
  'name.leDiamond': 'Name Line Diamond', 'name.publicDiamond': 'Public Diamond', 'name.upperLeft': 'Public Aura', 'name.upperRight': 'Friends Aura', 'name.lowerLeft': 'Associates Aura', 'name.lowerRight': 'Love Aura',
  'vocation.le': "Heart's Desire", 'vocation.big': "Big Heart's Desire", 'personality.le': 'Personality Number', 'personality.big': 'Big Personality Number',
  'outer.first': 'Outer Psyche Challenge Number', 'outer.publicDiamond': 'Outer Psyche Day + Challenge Number Diamond', 'inner.publicDiamond': 'Inner Psyche Day + Challenge Number Diamond',
  'outer.mentalFlow': 'Mental Flow', 'outer.emotionalFlow': 'Emotional Flow', 'inner.first': 'Inner Psyche Challenge Number',
  'vocation.leDiamond': 'Vocation Line Diamond', 'personality.leDiamond': 'Personality Line Diamond',
};
const SMALL = new Set(['and', 'of', 'the', 'a', '+']);
const titleCase = (t) => t.split(' ').map((w, i) => (i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
// Every chart has a mind center, a spine, a pillar ...: on the name chart those get "Name" in front, so a chip
// never leaves the owner asking "which spine?" (owner 2026-10-19). Positions only the name chart has (Public
// Aura, Life Expression, First Name, Name Line Diamond) stay bare.
const AMBIGUOUS = new Set(['heart', 'heartExtra', 'heartSubDiamond', 'solar', 'solarExtra', 'solarSubDiamond', 'mindDiamond', 'emotionDiamond', 'spine', 'spineDiamond', 'pillar', 'letters']);
export function positionName(chart, key) {
  const k = `${chart}.${key}`;
  if (SPECIAL[k]) return SPECIAL[k];
  const p = POSITIONS.find((x) => x.chart === chart && x.key === key);
  let label = p ? p.label : key;
  const paren = /\(([^)]*)\)/.exec(label);
  label = label.replace(/\s*\([^)]*\)/g, '').trim();
  if (paren && !/\s|\+/.test(paren[1].trim())) label = paren[1].trim();
  const prefix = chart === 'name' && AMBIGUOUS.has(key) ? 'Name ' : (PREFIX[chart] || '');
  return prefix + titleCase(label.toLowerCase());
}
// A matched structure stands for its parts: name the diamond, not the auras it is made of.
const IMPLIES = {
  essence: { outerDiamond: ['day', 'month', 'outerAura'], innerDiamond: ['day', 'year', 'innerAura'], dharmaDiamond: ['month', 'year', 'topAura'], nexus: ['day', 'littleLp'], challengeDiamond: ['outerAura', 'month'] },
  rhombus: { leDiamond: ['first', 'last', 'le', 'big'], mindDiamond: ['upperLeft', 'upperRight', 'heart'], emotionDiamond: ['lowerLeft', 'lowerRight', 'solar'], heartSubDiamond: ['heart', 'middle', 'heartExtra'], solarSubDiamond: ['solar', 'middle', 'solarExtra'], spineDiamond: ['spine', 'le'], publicDiamond: ['first'] },
};
const PRIORITY = ['leDiamond', 'mindDiamond', 'emotionDiamond', 'heartSubDiamond', 'solarSubDiamond', 'outerDiamond', 'innerDiamond', 'dharmaDiamond', 'nexus', 'challengeDiamond', 'spineDiamond', 'publicDiamond', 'heart', 'solar', 'le', 'big', 'littleLp', 'bigLp', 'pillar', 'spine', 'day', 'first', 'last', 'middle', 'heartExtra', 'solarExtra', 'upperLeft', 'upperRight', 'lowerLeft', 'lowerRight', 'outerAura', 'innerAura', 'topAura', 'month', 'year', 'target', 'letters', 'mentalFlow', 'emotionalFlow'];
const rank = (key) => { const i = PRIORITY.indexOf(key); return i < 0 ? PRIORITY.length : i; };
// Too small to be worth a word on the line (they still count in the score).
const TRIVIAL = new Set(['letters', 'month', 'year', 'target']);
// The named structures that match in one chart, biggest first, parts of a matched structure left out.
export function namedMatches(chart, keys) {
  const set = new Set(keys);
  const implies = IMPLIES[chart === 'essence' ? 'essence' : 'rhombus'];
  const covered = new Set();
  for (const k of set) for (const part of implies[k] || []) covered.add(part);
  return [...set].filter((k) => !covered.has(k) && !TRIVIAL.has(k)).sort((a, b) => rank(a) - rank(b)).map((k) => positionName(chart, k));
}
// One line for a similar chart: whole charts that are the same, nearly the same ones, then the biggest matching
// structures by name (two per chart, three phrases in all, the ranking chart first). The gist, not a list.
export function gistOf(x, by = 'all') { const a = alikeOf(x, by); return a.length ? a.join(' · ') : 'A few scattered numbers'; }
export function alikeOf({ per, of, matches }, by = 'all') {
  const order = CHARTS.map((c) => c.key).sort((a, b) => (a === by ? -1 : b === by ? 1 : 0));
  const phrases = [];
  for (const chart of order) {
    const total = of[chart] || 0, same = per[chart] || 0; if (!total || !same) continue;
    if (same === total) { phrases.push(`Same ${CHART_NAME[chart]}`); continue; }
    if (same / total >= 0.75) { phrases.push(`${CHART_NAME[chart]} Nearly the Same`); continue; }
    const names = namedMatches(chart, (matches || []).filter((m) => m.startsWith(chart + '.')).map((m) => m.slice(chart.length + 1)));
    phrases.push(...names.slice(0, 2));
  }
  return phrases.slice(0, 3);
}

const HIDDEN = POSITIONS.filter((p) => p.hidden).map((p) => `${p.chart}.${p.key}`);
const hiddenSql = (alias) => (HIDDEN.length ? ` AND (${alias}.chart || '.' || ${alias}.position) NOT IN (${HIDDEN.map((h) => `'${h}'`).join(',')})` : '');

export function similarCharts(db, imageId, { by = 'all', limit = 60 } = {}) {
  const chartKeys = CHARTS.map((c) => c.key);
  const of = {};
  for (const r of db.prepare(`SELECT chart, count(*) AS c FROM chart_values a WHERE image_id = ?${hiddenSql('a')} GROUP BY chart`).all(imageId)) of[r.chart] = r.c;
  const rows = db.prepare(`SELECT b.image_id AS id, b.chart, b.position
    FROM chart_values a JOIN chart_values b ON b.chart = a.chart AND b.position = a.position AND b.n = a.n AND b.sum = a.sum AND b.image_id != a.image_id
    JOIN images i ON i.id = b.image_id
    WHERE a.image_id = ? AND i.kind = 'chart'${hiddenSql('a')}`).all(imageId);
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, per: {}, total: 0, matches: [] });
    const e = byId.get(r.id); e.per[r.chart] = (e.per[r.chart] || 0) + 1; e.total += 1;
    const m = `${r.chart}.${r.position}`; if (!e.matches.includes(m)) e.matches.push(m);
  }
  const key = chartKeys.includes(by) ? by : 'all';
  const score = (e) => (key === 'all' ? e.total : (e.per[key] || 0));
  const list = [...byId.values()].filter((e) => score(e) > 0).sort((a, b) => score(b) - score(a) || b.total - a.total || a.id - b.id).slice(0, limit);
  if (list.length) {
    const ids = list.map((e) => e.id);
    const info = db.prepare(`SELECT i.id, i.filename, i.title, (i.stored_path IS NOT NULL) AS has_file, ci.day, ci.month, ci.year, ci.name
      FROM images i LEFT JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    const m = new Map(info.map((r) => [r.id, r]));
    for (const e of list) { const r = m.get(e.id) || {}; e.filename = r.filename; e.title = r.title; e.has_file = !!r.has_file; e.inputs = r.name || r.day ? { day: r.day, month: r.month, year: r.year, name: r.name } : null; }
  }
  const totalOf = Object.values(of).reduce((a, b) => a + b, 0);
  return { id: imageId, by: key, of, totalOf, charts: CHARTS.map((c) => ({ key: c.key, label: c.label })),
    items: list.map((e) => { const per = Object.fromEntries(chartKeys.map((k) => [k, e.per[k] || 0])); const x = { per, of, matches: e.matches }; return { ...e, per, alike: alikeOf(x, key), gist: gistOf(x, key) }; }) };
}
