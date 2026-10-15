// Reads inputs.json [{id, day, month, year, name}] and prints slots.json {id: [{cls, text, x, y, size, bold}]}
// using the same placement rules as public/app.js numeroscopeSvg.
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../public/numeroscope.js', import.meta.url), 'utf8'), ctx);
const N = ctx.Numeroscope, L = N.LAYOUT;
const inputs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = {};
for (const inp of inputs) {
  const data = N.numeroscope(inp);
  const slots = [];
  const txt = (cls, x, y, v, size, bold, par) => { if (v) slots.push({ cls, x, y, text: typeof v === 'string' ? v : v.text, size, bold: !!bold, par: par ? par.map((p) => p && p.ds).sort().join('+') : undefined }); };
  const M = L.main, H = L.hex, P = L.psy, S = L.sub;
  const spread = (n, pair, i) => (n <= 1 || !pair ? 0 : pair[0] + (pair[1] - pair[0]) * i / (n - 1));
  const numbers = (pre, c, t, cx, top) => {
    txt(pre + 'day', cx, t.dvY, top, t.day, 1);
    const sd = t.sideDx || 0; txt(pre + 'ul', t.auraL ?? cx - t.auraDx + sd, t.upY, c.upperLeft, t.small); txt(pre + 'ur', t.auraR ?? cx + t.auraDx + sd, t.upY, c.upperRight, t.small);
    txt(pre + 'heart', cx, t.heartY, c.heart, t.heart, 1, [c.upperLeft, c.upperRight]);
    c.heartExtra.forEach((v, i) => txt(pre + 'heartExtra', cx + spread(c.heartExtra.length, t.extra2, i), t.heartY + t.extraUp, v, t.extra, 0, [c.heart, c.middle[i].value]));
    if (t.spineX) txt(pre + 'spine', t.spineX, t.spineY, c.spine, t.small);
    if (c.first) txt(pre + 'first', t.nameL ?? cx + t.nameDxL + sd, t.lineY, c.first.value, t.lineFont, pre === '');
    c.middle.forEach((w, i) => { const nL = t.nameL ?? cx + t.nameDxL, nR = t.nameR ?? cx + t.nameDxR; const x = t.middle2 && c.middle.length <= 2 ? cx + spread(c.middle.length, t.middle2, i) : nL + (nR - nL) * (i + 1) / (c.middle.length + 1); txt(pre + 'middle', x, t.lineY, w.value, t.lineFont, pre === ''); });
    if (c.last) txt(pre + 'last', t.nameR ?? cx + t.nameDxR + sd, t.lineY, c.last.value, t.lineFont, pre === '');
    txt(pre + 'll', t.auraL ?? cx - t.auraDx + sd, t.lowY, c.lowerLeft, t.small); txt(pre + 'lr', t.auraR ?? cx + t.auraDx + sd, t.lowY, c.lowerRight, t.small);
    txt(pre + 'solar', cx, t.solarY, c.solar, t.solar || t.heart, 1, [c.lowerLeft, c.lowerRight]);
    c.solarExtra.forEach((v, i) => txt(pre + 'solarExtra', cx + spread(c.solarExtra.length, t.solarExtra2, i), t.solarY + t.extraDown, v, t.extra, 0, [c.solar, c.middle[i].value]));
    if (t.bigX !== undefined) txt(pre + 'big', t.bigX, t.leY, c.big, t.le, 1);
    txt(pre + 'le', cx, t.leY, c.le, t.le, 1);
    txt(pre + 'pillar', cx, t.pillarY, c.pillar, t.pillar, 1);
  };
  const day = data.essence.day;
  numbers('', data.name, { ...M.text, bigX: M.big[0] }, M.cx, day);
  numbers('c.', data.consonants, { ...S.text, ...S.left }, S.left.cx, day);
  numbers('v.', data.vowels, { ...S.text, ...S.right }, S.right.cx, day);
  txt('letters', M.letter[0], M.text.letterY, data.name.letters ? String(data.name.letters) : null, M.text.letterFont, 1);
  const bare = (c) => ({ ...c, big: null, middle: [], heartExtra: [], solarExtra: [] });
  numbers('po.', bare(data.psyche.outer), { ...P.text, sideDx: P.sideDxL }, P.cxL, day); numbers('pi.', bare(data.psyche.inner), { ...P.text, sideDx: P.sideDxR }, P.cxR, day);
  const e = data.essence, T = H.text;
  txt('e.topAura', 371, T.topAuraY, e.topAura, T.corner); txt('e.month', T.monthX, T.monthY, e.month, T.corner, 1); txt('e.year', T.yearX, T.monthY, e.year, T.corner, 1);
  txt('e.outerAura', T.auraL, T.auraY, e.outerAura, T.aura); txt('e.innerAura', T.auraR, T.auraY, e.innerAura, T.aura);
  txt('e.littleLp', 371, T.lpY, e.littleLp, T.lp, 1); txt('e.bigLp', 371, T.bigLpY, e.bigLp, T.lp, 1);
  out[inp.id] = slots;
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log('charts', Object.keys(out).length);
