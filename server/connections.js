// Which diamonds a tapped number is connected to (owner 2026-11-27, the number screen's "Connected Diamonds"):
// the diamond that MAKES it (the same two numbers side by side: day 8 beside first name 18/9 = public diamond 89/8,
// which is how the 17/8 public aura is made) and every diamond it HELPS MAKE (it is one of the two parts: the public
// aura 17/8 beside the friends aura 17/8 = mental diamond 88/7). Nothing else: a diamond the number is not part of
// never shows (the mind center's sub diamond is not the public aura's). PARTS (server/positions.js) is the one list
// of what a diamond is made of; MADE_BY below names the sum each diamond's two parts also make.
// Rules: .brain/numerology/chart-construction.md. Proven on every chart shape in test/connections.test.js.
//
//   connectionsFor({ chart, position, n, at, inputs })
//     at: the numeroscope the day was drawn over when the essence day was tapped there (its public and spine
//         diamonds); 'name' when not given.
//     -> [{ role: 'made' | 'helps', chart, position, n, sum, parts: [{ chart, position, n, sum }] }], made first;
//        null when the inputs do not hold the tapped number (a stale drawing).
import { POSITIONS, PARTS, MADE_BESIDE, computeValues, normalizeInputs } from './positions.js';

// The mental and emotional flows are diamonds across the two psyche charts (stored on the outer one).
const FLOWS = { mentalFlow: ['outer.heart', 'inner.heart'], emotionalFlow: ['outer.solar', 'inner.solar'] };
// A sum and the diamond of the same two parts: the aura, center or line number is their sum, the diamond writes them
// side by side. Same chart, same repeat (a middle name's sub vibration and its sub diamond).
export const MADE_BY = {
  upperLeft: 'publicDiamond', heart: 'mindDiamond', heartExtra: 'heartSubDiamond', solar: 'emotionDiamond', solarExtra: 'solarSubDiamond',
  le: 'leDiamond', spine: 'spineDiamond', outerAura: 'outerDiamond', innerAura: 'innerDiamond', topAura: 'dharmaDiamond',
};
const RHOMBUS = new Set(['name', 'vocation', 'personality', 'outer', 'inner']);
const INDEXED = new Set(['heartSubDiamond', 'solarSubDiamond']); // one per middle name

// Every diamond on every chart with its two parts resolved to [chart, position].
const split = (chart, part) => (part.includes('.') ? part.split('.') : [chart, part]);
export const DIAMOND_PARTS = POSITIONS.filter((p) => !p.hidden && (MADE_BESIDE.has(p.key) || FLOWS[p.key]))
  .map((p) => ({ chart: p.chart, position: p.key, parts: (FLOWS[p.key] || PARTS[p.key]).map((x) => split(p.chart, x)) }));

export function connectionsFor({ chart, position, n = 0, at = 'name', inputs } = {}) {
  const inp = normalizeInputs(inputs || {});
  if (!inp.name && !inp.day) return null;
  const vals = new Map();
  for (const v of computeValues(inp)) vals.set(`${v.chart}.${v.position}.${v.n}`, v);
  const get = (c, k, i = 0) => vals.get(`${c}.${k}.${i}`) || null;
  const me = get(chart, position, n);
  if (!me) return null;
  const host = RHOMBUS.has(at) ? at : 'name';
  const out = [];
  const add = (role, d, i) => {
    const v = get(d.chart, d.position, i);
    if (!v || out.some((o) => o.chart === d.chart && o.position === d.position && o.n === i)) return;
    // a sub diamond's middle-name part is that middle name (the same repeat); every other part has one value
    const parts = d.parts.map(([c, k]) => get(c, k, k === 'middle' ? i : 0)).filter(Boolean);
    if (parts.length !== 2) return;
    out.push({ role, chart: d.chart, position: d.position, n: i, sum: v.sum, parts: parts.map((p) => ({ chart: p.chart, position: p.position, n: p.n, sum: p.sum })) });
  };
  const made = MADE_BY[position];
  if (made) { const d = DIAMOND_PARTS.find((x) => x.chart === chart && x.position === made); if (d) add('made', d, INDEXED.has(made) ? n : 0); }
  for (const d of DIAMOND_PARTS) {
    const mine = d.parts.some(([c, k]) => c === chart && k === position);
    if (!mine) continue;
    // the essence day sits in every numeroscope's public and spine diamond: only the one it was tapped on counts
    if (chart === 'essence' && RHOMBUS.has(d.chart) && d.chart !== host) continue;
    if (INDEXED.has(d.position)) {
      if (position === 'middle') add('helps', d, n);
      else for (let i = 0; get(d.chart, d.position, i); i++) add('helps', d, i);
    } else add('helps', d, 0);
  }
  return out;
}
