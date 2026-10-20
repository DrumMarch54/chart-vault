// Search by chart position: every chart whose name and birth date are known gets all five charts
// computed with the app's own engine (public/numeroscope.js, loaded here through vm), and every
// number of every position is stored in chart_values so "12/3 in the mind center" is one query.
//
//   chart_inputs  what was typed into the paid tool: day, month, year, name; where it came from
//                 (ocr = read off the picture by the color study, read = read off the picture by a
//                 Claude session, owner = fixed in the app), and the build that wrote it.
//   chart_values  (image_id, chart, position, n, sum, ds) for every number the engine computes.
//                 n counts repeats (two middle names, two extra vibrations); 0 otherwise.
//
// The catalog below names every position in plain words, grouped by chart, and says which of the
// owner's tag codes (public/tag-codes.js, .brain/numerology/tag-codes.md) mean it, so the owner's
// own tags can check the read inputs: a tag that disagrees with the computed chart means a misread
// name or date (or a mistyped tag). Rules: .brain/numerology/chart-construction.md.
import fs from 'node:fs';
import vm from 'node:vm';
import { COMMIT } from './build.js';

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/numeroscope.js', import.meta.url), 'utf8'), ctx);
export const Numeroscope = ctx.Numeroscope;

export const CHARTS = [
  { key: 'essence', label: 'Essence chart', note: 'Birth date only: the purple shape at the top' },
  { key: 'name', label: 'Name chart', note: 'The orange diamond: names and day' },
  { key: 'vocation', label: 'Vocation chart', note: 'Vowels of the names (bottom right)' },
  { key: 'personality', label: 'Personality chart', note: 'Consonants of the names (bottom left)' },
  { key: 'outer', label: 'Outer psyche chart', note: 'Left blue diamond: challenge number and year' },
  { key: 'inner', label: 'Inner psyche chart', note: 'Right blue diamond: month and year' },
];

// The rhombus positions, shared by the name chart, the two sub-charts and the two psyche charts.
// `get` reads the value(s) off a rhombus result; `words` is the label on each chart.
const AURAS = { name: ['Public aura (upper left)', 'Friends aura (upper right)', 'Associates aura (lower left)', 'Love aura (lower right)'], default: ['Upper left aura', 'Upper right aura', 'Lower left aura', 'Lower right aura'] };
const LE = { name: ['Life expression', 'Big life expression'], vocation: ["Heart's desire", "Big heart's desire"], personality: ['Personality number', 'Big personality number'], outer: ['Life expression', 'Big life expression'], inner: ['Life expression', 'Big life expression'] };
const LINE = { name: ['First name', 'Middle name', 'Last name'], vocation: ['First name', 'Middle name', 'Last name'], personality: ['First name', 'Middle name', 'Last name'], outer: ['Challenge number (psychic month)', null, 'Year'], inner: ['Challenge number (month)', null, 'Year'] };
// The line diamond (first beside last, only with no middle name) is named per chart (owner 2026-10-20).
const LINE_DIAMOND = { name: 'Name line diamond (first + last only)', vocation: 'Vocation line diamond (first + last only)', personality: 'Personality line diamond (first + last only)' };
function rhombusPositions(chart) {
  const aura = AURAS[chart] || AURAS.default, le = LE[chart], line = LINE[chart];
  const list = [
    { key: 'first', label: line[0], get: (r) => r.first && r.first.value },
    line[1] ? { key: 'middle', label: line[1], get: (r) => r.middle.map((w) => w.value) } : null,
    { key: 'last', label: line[2], get: (r) => r.last && r.last.value },
    line[1] ? { key: 'anyName', label: 'Any name', get: (r) => r.words.map((w) => w.value), hidden: true } : null,
    { key: 'le', label: le[0], get: (r) => r.le },
    { key: 'big', label: le[1], get: (r) => r.big },
    { key: 'upperLeft', label: aura[0], get: (r) => r.upperLeft },
    { key: 'upperRight', label: aura[1], get: (r) => r.upperRight },
    { key: 'heart', label: 'Mind center', get: (r) => r.heart },
    line[1] ? { key: 'heartExtra', label: 'Mind center extra vibration', get: (r) => r.heartExtra } : null,
    line[1] ? { key: 'heartSubDiamond', label: 'Mind center sub diamond (main + middle name)', get: (r) => r.heartSubDiamond } : null,
    { key: 'mindDiamond', label: 'Mental diamond', get: (r) => r.mindDiamond },
    { key: 'lowerLeft', label: aura[2], get: (r) => r.lowerLeft },
    { key: 'lowerRight', label: aura[3], get: (r) => r.lowerRight },
    { key: 'solar', label: 'Emotion center', get: (r) => r.solar },
    line[1] ? { key: 'solarExtra', label: 'Emotion center extra vibration', get: (r) => r.solarExtra } : null,
    line[1] ? { key: 'solarSubDiamond', label: 'Emotion center sub diamond (main + middle name)', get: (r) => r.solarSubDiamond } : null,
    { key: 'emotionDiamond', label: 'Emotional diamond', get: (r) => r.emotionDiamond },
    { key: 'leDiamond', label: LINE_DIAMOND[chart] || 'Life expression diamond', get: (r) => r.leDiamond },
    { key: 'publicDiamond', label: chart === 'name' ? 'Public diamond (day + first name)' : `Day + ${line[0].toLowerCase()} diamond`, get: (r, day) => Numeroscope.joined(day, r.first && r.first.value) },
    { key: 'spine', label: 'Spine', get: (r) => r.spine },
    { key: 'spineDiamond', label: 'Spine diamond', get: (r) => r.spineDiamond },
    { key: 'pillar', label: 'Pillar', get: (r) => r.pillar },
    chart === 'name' ? { key: 'letters', label: 'Letter count', get: (r) => (r.letters ? Numeroscope.val(r.letters) : null) } : null,
  ];
  return list.filter(Boolean).map((p) => ({ ...p, chart }));
}

export const POSITIONS = [
  { chart: 'essence', key: 'day', label: 'Day vibration', get: (d) => d.essence.day },
  { chart: 'essence', key: 'month', label: 'Month', get: (d) => d.essence.month },
  { chart: 'essence', key: 'year', label: 'Year', get: (d) => d.essence.year },
  { chart: 'essence', key: 'littleLp', label: 'Little life path', get: (d) => d.essence.littleLp },
  { chart: 'essence', key: 'bigLp', label: 'Big life path', get: (d) => d.essence.bigLp },
  { chart: 'essence', key: 'outerAura', label: 'Outer aura (day + month)', get: (d) => d.essence.outerAura },
  { chart: 'essence', key: 'innerAura', label: 'Inner aura (day + year)', get: (d) => d.essence.innerAura },
  { chart: 'essence', key: 'topAura', label: 'Dharma line (month + year)', get: (d) => d.essence.topAura },
  { chart: 'essence', key: 'outerDiamond', label: 'Outer diamond', get: (d) => d.essence.outerDiamond },
  { chart: 'essence', key: 'innerDiamond', label: 'Inner diamond', get: (d) => d.essence.innerDiamond },
  { chart: 'essence', key: 'dharmaDiamond', label: 'Dharma diamond', get: (d) => d.essence.dharmaDiamond },
  { chart: 'essence', key: 'nexus', label: 'Day + life path diamond (nexus)', get: (d) => d.essence.nexus },
  { chart: 'essence', key: 'target', label: 'Target number', get: (d) => d.essence.target },
  { chart: 'essence', key: 'challengeDiamond', label: 'Challenge diamond (outer aura + month)', get: (d) => Numeroscope.joined(d.essence.outerAura, d.essence.month) },
  ...rhombusPositions('name').map((p) => ({ ...p, get: (d) => p.get(d.name, d.essence.day) })),
  ...rhombusPositions('vocation').map((p) => ({ ...p, get: (d) => p.get(d.vowels, d.essence.day) })),
  ...rhombusPositions('personality').map((p) => ({ ...p, get: (d) => p.get(d.consonants, d.essence.day) })),
  ...rhombusPositions('outer').map((p) => ({ ...p, get: (d) => p.get(d.psyche.outer, d.essence.day) })),
  { chart: 'outer', key: 'mentalFlow', label: 'Mental flow (outer + inner mind centers)', get: (d) => Numeroscope.joined(d.psyche.outer.heart, d.psyche.inner.heart) },
  // Emotional flow (owner 2026-10-20): the two psyche emotion centers' digit sums side by side, outer first.
  { chart: 'outer', key: 'emotionalFlow', label: 'Emotional flow (outer + inner emotion centers)', get: (d) => Numeroscope.joined(d.psyche.outer.solar, d.psyche.inner.solar) },
  ...rhombusPositions('inner').map((p) => ({ ...p, get: (d) => p.get(d.psyche.inner, d.essence.day) })),
];
const BY_KEY = new Map(POSITIONS.map((p) => [`${p.chart}.${p.key}`, p]));
export const positionLabel = (chart, key) => { const p = BY_KEY.get(`${chart}.${key}`); return p ? p.label : key; };
export const chartLabel = (chart) => (CHARTS.find((c) => c.key === chart) || {}).label || chart;

// What the owner's tag codes mean in catalog terms: code -> [[chart, key], ...]. A tag like "12mc"
// agrees with a chart when one of these positions holds 12. Learned from the 436 OCR-read charts
// (tools/color-study/vault-inputs.json): "mc" and "ec" also cover the center's diamond (66mc on Michael
// Jackson is the mind diamond 66), "osle" is the outer psyche LE diamond (61osle), a one-digit tag
// means the digit sum (9lp = life path 18/9), a combo tag names the two parts of a center or diamond
// (4combo9ec = 13/4 and 9 in the emotion center's circle; 8combo15publicdiamond = day 8 beside first name 15/6), and a
// diamond may be tagged with its digits the other way round (68pd for 86). "nr" codes compare the digit sum.
export const TAG_POSITIONS = {
  day: [['essence', 'day']], month: [['essence', 'month']], year: [['essence', 'year']],
  lp: [['essence', 'littleLp'], ['essence', 'bigLp']], llp: [['essence', 'littleLp']], hlp: [['essence', 'bigLp']],
  od: [['essence', 'outerDiamond']], dharma: [['essence', 'dharmaDiamond']], dvlp: [['essence', 'nexus']], cd: [['essence', 'challengeDiamond']],
  fn: [['name', 'first']], mn: [['name', 'middle']], ln: [['name', 'last']], name: [['name', 'anyName']],
  le: [['name', 'le'], ['name', 'big']], mc: [['name', 'heart'], ['name', 'heartExtra'], ['name', 'mindDiamond'], ['name', 'heartSubDiamond']], ec: [['name', 'solar'], ['name', 'solarExtra'], ['name', 'emotionDiamond'], ['name', 'solarSubDiamond']], sp: [['name', 'solar'], ['name', 'solarExtra'], ['name', 'emotionDiamond'], ['name', 'solarSubDiamond']],
  pa: [['name', 'upperLeft']], aa: [['name', 'lowerLeft']], pd: [['name', 'publicDiamond']], publicdiamond: [['name', 'publicDiamond']],
  md: [['name', 'mindDiamond']], ed: [['name', 'emotionDiamond']], sd: [['name', 'spineDiamond']], plr: [['name', 'pillar']], nldiamond: [['name', 'leDiamond']],
  psn: [['personality', 'le'], ['personality', 'big']], hd: [['vocation', 'le'], ['vocation', 'big']],
  vmd: [['vocation', 'mindDiamond']], ved: [['vocation', 'emotionDiamond']], pmd: [['personality', 'mindDiamond']], ped: [['personality', 'emotionDiamond']],
  personalitychart: [['personality', 'mindDiamond'], ['personality', 'emotionDiamond'], ['personality', 'leDiamond'], ['personality', 'heartSubDiamond'], ['personality', 'solarSubDiamond']],
  vocationchart: [['vocation', 'mindDiamond'], ['vocation', 'emotionDiamond'], ['vocation', 'leDiamond'], ['vocation', 'heartSubDiamond'], ['vocation', 'solarSubDiamond']],
  opms: [['outer', 'mindDiamond']], oms: [['outer', 'mindDiamond']], ipms: [['inner', 'mindDiamond']],
  opled: [['outer', 'leDiamond']], ople: [['outer', 'leDiamond']], pled: [['outer', 'leDiamond']], osle: [['outer', 'le'], ['outer', 'leDiamond']], ipled: [['inner', 'leDiamond']],
  mentalflow: [['outer', 'mentalFlow']], emotionalflow: [['outer', 'emotionalFlow']],
};
// The two parts a center or diamond is made of (for combo tags): "4combo9ec" = 4 and 9 in the lower auras.
const DIAMONDS = new Set(['mindDiamond', 'emotionDiamond', 'heartSubDiamond', 'solarSubDiamond', 'leDiamond', 'publicDiamond', 'spineDiamond', 'outerDiamond', 'innerDiamond', 'dharmaDiamond', 'nexus', 'target', 'challengeDiamond', 'mentalFlow', 'emotionalFlow']);
// A CENTER's combination is the two numbers in its circle: the main vibration and an extra vibration ("12/3 and 8
// in the mind center"). The owner's combo tags say so: 37 of 38 name the circle, none only the auras (live vault,
// 2026-10-19). The auras around a center make its DIAMOND (mindDiamond, emotionDiamond).
const PARTS = {
  heart: ['heart', 'heartExtra'], heartExtra: ['heart', 'middle'], mindDiamond: ['upperLeft', 'upperRight'], heartSubDiamond: ['heart', 'middle'],
  solar: ['solar', 'solarExtra'], solarExtra: ['solar', 'middle'], emotionDiamond: ['lowerLeft', 'lowerRight'], solarSubDiamond: ['solar', 'middle'],
  leDiamond: ['first', 'last'], publicDiamond: ['essence.day', 'first'], spineDiamond: ['essence.day', 'le'],
  outerDiamond: ['day', 'month'], innerDiamond: ['day', 'year'], dharmaDiamond: ['month', 'year'], nexus: ['day', 'littleLp'], target: ['day', 'topAura'], challengeDiamond: ['outerAura', 'month'],
};

// For the owner's combo TAGS only: a part may also be what sits in the diamond's corner. "8combo15publicdiamond" on
// Johnny Somali (day 26/8, first name 16/7, public aura 15/6) names the day with the public aura that the day makes
// (owner 2026-10-20: "there is an 8 combo 15/6 there technically"). The position search keeps the strict pairs.
const TAG_PARTS = { publicDiamond: ['essence.day', 'first', 'upperLeft'] };

// Every number of every position for one set of inputs: [{ chart, position, n, sum, ds }].
export function computeValues({ day, month, year, name }) {
  const data = Numeroscope.numeroscope({ day, month, year, name });
  const out = [];
  for (const p of POSITIONS) {
    const v = p.get(data);
    const list = Array.isArray(v) ? v : [v];
    list.forEach((val, n) => { if (val && val.sum > 0) out.push({ chart: p.chart, position: p.key, n, sum: val.sum, ds: val.ds }); });
  }
  return out;
}

// --- storage ---
const clean = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
export function normalizeInputs({ day, month, year, name } = {}) {
  const nm = String(name || '').trim().replace(/\s+/g, ' ');
  return { day: clean(day, 1, 31), month: clean(month, 1, 12), year: clean(year, 1000, 9999), name: nm.length > 120 ? nm.slice(0, 120) : nm };
}
export class InputError extends Error {}

// Write the inputs of one chart and recompute its values. Throws InputError when nothing usable was given.
export function setInputs(db, imageId, inputs, { source = 'owner', build = COMMIT } = {}) {
  const v = normalizeInputs(inputs);
  if (!v.name && !v.day && !v.month && !v.year) throw new InputError('Type a name or a date first.');
  if ((inputs.day ?? '') !== '' && v.day === null) throw new InputError('The day must be a number from 1 to 31.');
  if ((inputs.month ?? '') !== '' && v.month === null) throw new InputError('The month must be a number from 1 to 12.');
  if ((inputs.year ?? '') !== '' && v.year === null) throw new InputError('The year must have four digits.');
  db.transaction(() => {
    db.prepare(`INSERT INTO chart_inputs (image_id, day, month, year, name, source, build, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(image_id) DO UPDATE SET day = excluded.day, month = excluded.month, year = excluded.year, name = excluded.name, source = excluded.source, build = excluded.build, updated_at = excluded.updated_at`)
      .run(imageId, v.day, v.month, v.year, v.name, source, build);
    writeValues(db, imageId, v);
  })();
  return getInputs(db, imageId);
}
function writeValues(db, imageId, v) {
  db.prepare('DELETE FROM chart_values WHERE image_id = ?').run(imageId);
  const ins = db.prepare('INSERT INTO chart_values (image_id, chart, position, n, sum, ds) VALUES (?, ?, ?, ?, ?, ?)');
  for (const r of computeValues(v)) ins.run(imageId, r.chart, r.position, r.n, r.sum, r.ds);
}
export function clearInputs(db, imageId) {
  db.transaction(() => { db.prepare('DELETE FROM chart_inputs WHERE image_id = ?').run(imageId); db.prepare('DELETE FROM chart_values WHERE image_id = ?').run(imageId); })();
}
export function getInputs(db, imageId) {
  return db.prepare('SELECT image_id, day, month, year, name, source, build, updated_at FROM chart_inputs WHERE image_id = ?').get(imageId) || null;
}
// Everything the engine computed for one chart, grouped by chart in catalog order, with labels.
export function valuesFor(db, imageId) {
  const rows = db.prepare('SELECT chart, position, n, sum, ds FROM chart_values WHERE image_id = ?').all(imageId);
  const have = new Map(rows.map((r) => [`${r.chart}.${r.position}.${r.n}`, r]));
  return CHARTS.map((c) => ({
    chart: c.key, label: c.label,
    values: POSITIONS.filter((p) => p.chart === c.key && !p.hidden).flatMap((p) => {
      const out = [];
      for (let n = 0; ; n++) { const r = have.get(`${p.chart}.${p.key}.${n}`); if (!r) break; out.push({ position: p.key, n, label: p.label, sum: r.sum, ds: r.ds, text: `${r.sum}/${r.ds}` }); }
      return out;
    }),
  })).filter((c) => c.values.length);
}

// Recompute every stored chart with the current engine (Status screen button; after an engine change).
export function recomputeAll(db) {
  const rows = db.prepare('SELECT image_id, day, month, year, name FROM chart_inputs').all();
  db.transaction(() => { for (const r of rows) writeValues(db, r.image_id, r); })();
  return rows.length;
}

// Seed: the inputs read off the vault's own pictures, kept in the repo by filename (server/chart-inputs.json)
// so a rebuilt database gets them back. Merge-only: a chart that already has inputs (an owner fix above all)
// is never touched; a chart the database does not know is skipped.
export function seedInputs(db, seed, { build = COMMIT } = {}) {
  const find = db.prepare('SELECT i.id, (SELECT 1 FROM chart_inputs c WHERE c.image_id = i.id) AS has FROM images i WHERE i.filename = ?');
  let added = 0, skipped = 0, unknown = 0;
  db.transaction(() => {
    for (const s of seed) {
      const row = find.get(s.filename);
      if (!row) { unknown++; continue; }
      if (row.has) { skipped++; continue; }
      const v = normalizeInputs(s);
      if (!v.name && !v.day) { skipped++; continue; }
      db.prepare(`INSERT INTO chart_inputs (image_id, day, month, year, name, source, build, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)
        .run(row.id, v.day, v.month, v.year, v.name, s.source || 'seed', build);
      writeValues(db, row.id, v);
      added++;
    }
  })();
  return { added, skipped, unknown };
}
// Charts saved from the Quick Chart before 2026-10-17 carry their name in the app-added tag and their date in
// the filename (Quick_<Name>_<YYYY-MM-DD>_<stamp>.png) but had no inputs row. Give them one at startup, once.
export function seedQuickInputs(db, { build = COMMIT } = {}) {
  const rows = db.prepare(`SELECT i.id, i.filename, (SELECT t.name FROM image_tags it JOIN tags t ON t.id = it.tag_id WHERE it.image_id = i.id AND t.kind = 'name' AND it.source = 'app' ORDER BY it.rowid LIMIT 1) AS tag
    FROM images i WHERE i.kind = 'chart' AND i.filename LIKE 'Quick\\_%' ESCAPE '\\' AND i.id NOT IN (SELECT image_id FROM chart_inputs)`).all();
  let added = 0;
  for (const r of rows) {
    const m = /^Quick_(.+?)(?:_(\d{4})-(\d{2})-(\d{2}))?_\d{8}_\d{6}\.png$/.exec(r.filename);
    const name = r.tag || (m ? m[1].replace(/-/g, ' ') : '');
    if (!name) continue;
    try { setInputs(db, r.id, { day: m && m[4] ? Number(m[4]) : '', month: m && m[3] ? Number(m[3]) : '', year: m && m[2] ? Number(m[2]) : '', name }, { source: 'quick', build }); added++; } catch { /* a name that cannot be read stays as it is */ }
  }
  return { added, looked: rows.length };
}
export function loadSeedFile() {
  try { return JSON.parse(fs.readFileSync(new URL('./chart-inputs.json', import.meta.url), 'utf8')); } catch { return []; }
}

// --- search ---
// The SQL fragment that narrows images to those with `number` in a position. chart '*' = any chart,
// position '*' = any position of that chart. ds: match the digit sum instead of the exact number.
// Which positions are made of two parts a combination can be looked for in (the centers and the diamonds), per chart.
export const comboPositions = (chart) => POSITIONS.filter((p) => (chart === '*' || !chart || p.chart === chart) && PARTS[p.key] && !p.hidden);
// One part of a combination: a one-digit number is the digit sum (4 = a 13/4 or a 22/4), a bigger one the number itself.
const partSql = (alias, part) => `${alias}.${part.ds ? 'ds' : 'sum'} = ?`;
// "4 and 9 in the emotion center" = 4 and 9 in its circle, main and extra vibration, either way round (the owner's
// combo tags: 4combo9ec); in a diamond, its two parts. A part may live in another chart (the public diamond's day).
function comboSql(chart, position, [a, b], params) {
  const targets = position && position !== '*' ? comboPositions(chart).filter((p) => p.key === position) : comboPositions(chart);
  if (!targets.length) return 'AND 0';
  const one = (p) => {
    const [c1, k1] = PARTS[p.key][0].includes('.') ? PARTS[p.key][0].split('.') : [p.chart, PARTS[p.key][0]];
    const [c2, k2] = PARTS[p.key][1].includes('.') ? PARTS[p.key][1].split('.') : [p.chart, PARTS[p.key][1]];
    params.push(c1, k1, c2, k2, a.number, b.number, b.number, a.number);
    return `EXISTS (SELECT 1 FROM chart_values x JOIN chart_values y ON y.image_id = x.image_id WHERE x.image_id = i.id AND x.chart = ? AND x.position = ? AND y.chart = ? AND y.position = ? AND ((${partSql('x', a)} AND ${partSql('y', b)}) OR (${partSql('x', b)} AND ${partSql('y', a)})))`;
  };
  return 'AND (' + targets.map(one).join(' OR ') + ')';
}
export function positionSql({ chart, position, number, ds = false, combo = null }, params) {
  if (combo) return comboSql(chart, position, combo, params);
  const col = ds ? 'ds' : 'sum';
  let where = `${col} = ?`; params.push(number);
  if (chart && chart !== '*') { where += ' AND chart = ?'; params.push(chart); }
  if (position && position !== '*') { where += ' AND position = ?'; params.push(position); }
  return `AND i.id IN (SELECT image_id FROM chart_values WHERE ${where})`;
}
// Several conditions at once (owner's ask 2026-10-17: "the day is one number AND the first name is another"):
// a chart must meet every one of them. Each is a position search of its own, so a combination in a center
// (4+9) and a plain number mix freely.
export const conditionsSql = (list, params) => (list || []).map((c) => ' ' + positionSql(c, params)).join('');
// One condition from what the address carries: pos "name.heart" (chart.position, * = any) and the number text
// ("12", "/3", "4+9"). null when either part is not usable, so a bad address searches nothing rather than erring.
const CHART_KEYS = new Set(['*', ...CHARTS.map((c) => c.key)]);
export function parseCondition(pos, numText) {
  const num = parseNumber(numText);
  if (typeof pos !== 'string' || !pos || !num) return null;
  const [chart, position = '*'] = pos.split('.');
  if (!CHART_KEYS.has(chart) || !/^[A-Za-z*]+$/.test(position)) return null;
  return { chart, position, number: num.number, ds: num.ds, combo: num.combo || null };
}
// Conditions already fixed, as the counts endpoint receives them: "essence.day:8,name.first:4+9".
export const parseFixed = (text) => String(text || '').split(',').filter(Boolean).map((part) => { const i = part.indexOf(':'); return i < 0 ? null : parseCondition(part.slice(0, i), part.slice(i + 1)); }).filter(Boolean);
// "12", "12/3", "3" -> { number, ds }. A number typed as "/3" means any number whose digit sum is 3.
// Two numbers ("4+9", "4 and 9", "13+18") -> { combo: [part, part] }: a combination in a center or diamond.
export function parseNumber(text) {
  const t = String(text || '').trim();
  const two = /^(\S+?)\s*(?:\+|&|,|and)\s*(\S+)$/i.exec(t) || /^(\d+)\s+(\d+)$/.exec(t);
  if (two) {
    const parts = [two[1], two[2]].map((x) => { const n = parseNumber(x); return n && !n.combo ? (n.number < 10 && !n.ds ? { number: n.number, ds: true } : n) : null; });
    return parts.every(Boolean) ? { number: parts[0].number, ds: parts[0].ds, combo: parts } : null;
  }
  const m = /^(\d{1,3})?\s*(?:\/\s*(\d))?$/.exec(t);
  if (!m || (!m[1] && !m[2])) return null;
  if (!m[1]) return { number: Number(m[2]), ds: true };
  return { number: Number(m[1]), ds: false };
}

// How many charts hold `number` in each position (the picker shows the count beside every position).
// For a combination: how many charts have the two parts meeting in each center or diamond.
// `fixed`: conditions already chosen; only charts meeting all of them are counted, so the picker shows
// how far the next number narrows the search ("41 have day 8; 3 of them have first name 15").
export function positionCounts(db, { number, ds = false, combo = null }, fixed = []) {
  const fp = [];
  const within = fixed.length ? `AND image_id IN (SELECT i.id FROM images i WHERE i.kind = 'chart'${conditionsSql(fixed, fp)})` : '';
  const fixedTotal = fixed.length ? db.prepare(`SELECT count(*) AS c FROM images i WHERE i.kind = 'chart'${conditionsSql(fixed, [])}`).get(...fp).c : null;
  if (combo) {
    const count = (chart, position) => { const params = []; const sql = positionSql({ chart, position, combo }, params); return db.prepare(`SELECT count(*) AS c FROM images i WHERE i.kind = 'chart' ${sql}${conditionsSql(fixed, params)}`).get(...params).c; };
    const counts = {}; for (const p of comboPositions('*')) counts[`${p.chart}.${p.key}`] = count(p.chart, p.key);
    const perChart = {}; for (const c of CHARTS) perChart[c.key] = count(c.key, '*');
    return { number, ds, combo, counts, perChart, total: count('*', '*'), fixedTotal };
  }
  const col = ds ? 'ds' : 'sum';
  const rows = db.prepare(`SELECT chart, position, count(DISTINCT image_id) AS c FROM chart_values WHERE ${col} = ? ${within} GROUP BY chart, position`).all(number, ...fp);
  const counts = {}; for (const r of rows) counts[`${r.chart}.${r.position}`] = r.c;
  const perChart = {}; for (const r of db.prepare(`SELECT chart, count(DISTINCT image_id) AS c FROM chart_values WHERE ${col} = ? ${within} GROUP BY chart`).all(number, ...fp)) perChart[r.chart] = r.c;
  const total = db.prepare(`SELECT count(DISTINCT image_id) AS c FROM chart_values WHERE ${col} = ? ${within}`).get(number, ...fp).c;
  return { number, ds, counts, perChart, total, fixedTotal };
}
export const catalog = () => ({ charts: CHARTS, positions: POSITIONS.filter((p) => !p.hidden).map((p) => ({ chart: p.chart, key: p.key, label: p.label, combo: !!PARTS[p.key] })) });

// --- the quality gate: do the owner's position tags agree with the computed charts? ---
export function tagCheck(db) {
  const rows = db.prepare(`SELECT i.id, i.filename, t.name AS tag FROM images i JOIN image_tags it ON it.image_id = i.id JOIN tags t ON t.id = it.tag_id
    WHERE i.kind = 'chart' AND t.kind = 'position' AND i.id IN (SELECT image_id FROM chart_inputs)`).all();
  const vals = db.prepare('SELECT chart, position, sum, ds FROM chart_values WHERE image_id = ?');
  let agree = 0, disagree = 0, unknown = 0;
  const disagreeing = [];
  const cache = new Map();
  for (const r of rows) {
    const p = ctxTagCodes().parse(r.tag);
    if (!p || !p.code) { unknown++; continue; }
    const code = p.code.toLowerCase();
    const reduced = code.startsWith('nr') && TAG_POSITIONS[code.slice(2)];
    const where = TAG_POSITIONS[reduced ? code.slice(2) : code];
    if (!where) { unknown++; continue; }
    if (!cache.has(r.id)) cache.set(r.id, vals.all(r.id));
    const have = cache.get(r.id);
    const at = (c, k) => have.filter((v) => { const [cc, kk] = k.includes('.') ? k.split('.') : [c, k]; return v.chart === cc && v.position === kk; });
    const matches = (v, num) => (reduced || num < 10 ? v.ds === num || v.sum === num : v.sum === num) || (DIAMONDS.has(v.position) && num >= 10 && num < 100 && v.sum === (num % 10) * 10 + Math.floor(num / 10));
    const hit = (num, parts) => where.some(([c, k]) => at(c, k).some((v) => matches(v, num)) || (parts && (TAG_PARTS[k] || PARTS[k] || []).some((pk) => at(c, pk).some((v) => matches(v, num)))));
    const ok = p.numbers.length > 1 ? p.numbers.every((num) => hit(num, true)) : hit(p.numbers[0], false);
    if (ok) agree++; else { disagree++; disagreeing.push({ id: r.id, filename: r.filename, tag: r.tag }); }
  }
  return { tags: rows.length, agree, disagree, unknown, disagreeing };
}
let tagCodes = null;
function ctxTagCodes() {
  if (!tagCodes) { const c = {}; vm.runInNewContext(fs.readFileSync(new URL('../public/tag-codes.js', import.meta.url), 'utf8'), c); tagCodes = c.TagCodes; }
  return tagCodes;
}

// Counts for the Status screen and the snapshot.
export function inputStats(db) {
  const g = (sql, ...a) => db.prepare(sql).get(...a);
  return {
    charts: g("SELECT count(*) c FROM images WHERE kind = 'chart'").c,
    with_inputs: g("SELECT count(*) c FROM chart_inputs ci JOIN images i ON i.id = ci.image_id WHERE i.kind = 'chart'").c,
    with_date: g("SELECT count(*) c FROM chart_inputs ci JOIN images i ON i.id = ci.image_id WHERE i.kind = 'chart' AND ci.day IS NOT NULL AND ci.month IS NOT NULL AND ci.year IS NOT NULL").c,
    without_inputs: g("SELECT count(*) c FROM images i WHERE i.kind = 'chart' AND i.id NOT IN (SELECT image_id FROM chart_inputs)").c,
    by_source: Object.fromEntries(db.prepare('SELECT source, count(*) c FROM chart_inputs GROUP BY source').all().map((r) => [r.source, r.c])),
    values: g('SELECT count(*) c FROM chart_values').c,
  };
}
export function chartsWithoutInputs(db, limit = 1000) {
  return db.prepare(`SELECT i.id, i.filename, (i.stored_path IS NOT NULL) AS has_file FROM images i WHERE i.kind = 'chart' AND i.id NOT IN (SELECT image_id FROM chart_inputs)
    ORDER BY (i.taken_at IS NULL), i.taken_at DESC, i.id DESC LIMIT ?`).all(limit);
}
