// Number tools: the big diamond (Number fun, Relationship), the energy of a date (Today, Coming days),
// price rules (Price tool) and shared destiny rhythms (Karmic connections). Pure math, no DOM, runs in
// node for the tests (test/numbertools.test.js) and in the browser (public/tools.js draws it).
// Sources, all in the owner's Drive "Hub" (.brain/numerology/software-tools.md says where each was read):
//   big diamond      The Diamond Method book pp. 7-28, CONFIRMED on its worked example 14/5
//   energy of a date Forecasting Numerology pp. 20-23 (24.12.1999 case), Success Codes & Superdates pp. 19-31, 198-200
//   success codes    Success Codes & Superdates pp. 22-32 and 31; the Super / Good / Beware rule follows the course's
//                    wording as NotebookLM summarized it on 2026-10-15 (.brain/numerology/software-tools.md)
//   prices           Marketing Numerology pp. 36-55
//   karmic           Forecasting Numerology pp. 63-77: shared destiny rhythms = same birth-year digit sum
(function (root) {
  'use strict';
  const N = root.Numeroscope;
  const digitSum = N.digitSum;
  const digitsOf = (n) => String(Math.abs(Math.trunc(n))).split('').reduce((a, d) => a + Number(d), 0);
  // A value like the numeroscope's, but 0 allowed and one-digit numbers written plain ("5", "15/6").
  const val = (sum) => ({ sum, ds: digitSum(sum), text: sum < 10 ? String(sum) : `${sum}/${digitSum(sum)}` });
  const names = () => (root.TagCodes && root.TagCodes.NAMES) || {};
  const nameOf = (sum) => names()[sum] || '';

  // ---------- the big diamond (Diamond Method) ----------
  // One little diamond: a top-left (outer), b top-right (inner), single digits. The life expression (le)
  // at the bottom = a + b; outer aura = a + le; inner aura = b + le; the center = outer aura + inner aura.
  // Under 10 the book puts 0 in the top-left corner (p. 16 of the Relations book), so 5 reads as 0 and 5.
  function littleDiamond(a, b) {
    const le = val(a + b), outer = val(a + le.ds), inner = val(b + le.ds), center = val(outer.ds + inner.ds);
    const code = a * 10 + b;
    return { a, b, code, text: code < 10 ? String(code) : `${code}/${digitSum(code)}`, name: nameOf(code), le, outer, inner, center };
  }
  // The level below a diamond: its outer diamond (le first, then a), inner diamond (le, then b), and the
  // two unbalanced ones with the order reversed (a then le; b then le). Book pp. 13-18, 21-24.
  const unpack = (d) => ({ ...d, outerD: littleDiamond(d.le.ds, d.a), outerU: littleDiamond(d.a, d.le.ds), innerD: littleDiamond(d.le.ds, d.b), innerU: littleDiamond(d.b, d.le.ds) });
  // The whole big diamond of a number 1-99 (or of two single digits, e.g. two people's day vibrations):
  // physical = the main diamond, emotional = the essence diamond (its two auras), spiritual = the
  // integration diamond (the essence diamond's two auras). The top level always lands on a 9 (p. 28).
  function bigDiamond(a, b) {
    if (b === undefined) { const n = Number(a); a = Math.floor(n / 10); b = n % 10; }
    const main = littleDiamond(a, b);
    const essence = littleDiamond(main.outer.ds, main.inner.ds);
    const integration = littleDiamond(essence.outer.ds, essence.inner.ds);
    return { main: unpack(main), essence: unpack(essence), integration: unpack(integration) };
  }
  // Every number 10-99 whose big diamond holds `n` somewhere (Number fun: "find other numbers a
  // particular diamond is part of", book p. 31).
  function numbersContaining(n) {
    n = Number(n);
    const out = [];
    for (let x = 10; x <= 99; x++) {
      if (x === n) continue;
      const B = bigDiamond(x);
      const codes = [];
      for (const lvl of [B.main, B.essence, B.integration]) for (const d of [lvl, lvl.outerD, lvl.innerD, lvl.outerU, lvl.innerU]) codes.push(d.code);
      if (codes.includes(n)) out.push(x);
    }
    return out;
  }

  // ---------- the energy of a date ----------
  // Forecasting Numerology p. 20-21 (24.12.1999): day vibration at the bottom, month top-left, year top-right;
  // little life path = the three digit sums added, big life path = every digit added; outer aura = day + month
  // (outer diamond = the two digit sums side by side, 63/9), inner aura = day + year (61/7), dharma line =
  // month + year (31/4). Superdates p. 199: target = day ds followed by the dharma ds; DVLP = day ds + life path ds.
  const PLANETS = N.PLANETS;
  // Success codes (Superdates pp. 22-32) and the numbers to avoid (p. 31), as the course and NotebookLM's
  // reading of it (2026-10-15) list them. Category 1 = strong + soft (the primary codes), 2 = strength,
  // 3 = special. 35/53 = the 3-5-8 money triad in a diamond; 28/82 do a little of the leadership codes' work
  // but not in the strongest positions.
  const CODES = {
    strong: [58, 85, 35, 53, 10, 19, 37, 46, 55, 64, 73, 91],
    soft: [5, 14, 23, 32, 41, 50, 68, 77, 86, 95, 45, 54, 17, 15, 24, 33, 42, 51, 60, 69, 78, 87, 96],
    strength: [9, 27, 36, 63, 72, 90, 21, 30, 28, 82],
    special: [13, 49, 94, 56, 65, 67, 76, 25, 34, 52, 70, 71, 89, 98],
    avoid: [16, 61, 79, 88, 97, 29, 92],
    care: [12, 57, 75, 39, 48, 84, 11],
    limited: [18, 81, 99],
  };
  const CODE_WORDS = { strong: 'strong success code', soft: 'soft success code', strength: 'strength code', special: 'special code', avoid: 'number to avoid', care: 'use with care', limited: 'strength code, not in a strong position' };
  const codeKind = (sum) => { for (const k of ['avoid', 'care', 'limited', 'strong', 'soft', 'strength', 'special']) if (CODES[k].includes(sum)) return k; return null; };
  // Every position a date is read in (Superdates p. 20, NotebookLM 2026-10-15): the day chart's positions
  // and the centers, life expression and pillar of both psyche charts (the auras repeat the diamonds).
  const POSITION_WORDS = {
    dv: 'day vibration', mv: 'month', yv: 'year', lp: 'essence', bigLp: 'big essence', outer: 'outer diamond', inner: 'inner diamond', dvlp: 'natural talent', dharma: 'dharma line', target: 'target number',
    piHeart: 'inner psyche heart', piSolar: 'inner psyche solar plexus', piLe: 'inner psyche life expression', piPillar: 'inner psyche pillar',
    poHeart: 'outer psyche heart', poSolar: 'outer psyche solar plexus', poLe: 'outer psyche life expression', poPillar: 'outer psyche pillar',
  };
  const DOMINANT = ['dv', 'lp', 'bigLp']; // where a primary code counts most
  const STRONG_POS = ['dv', 'lp']; // the strongest positions (GV and ST in the book): the day and the essence
  const isPsyche = (pos) => /^p[io]/.test(pos);
  // Super / Good / Beware, the paid tool's three colors (gold, green, red), from the course's rules:
  //  Beware: a number to avoid anywhere in the day chart or in a psyche center, pillar or life expression;
  //          12, 57, 75, 39, 48, 84 or 11 as the day or the essence; 18, 81, 99 as the day, the essence or
  //          the target; 4 and 8 meeting (day, month, year) in a diamond (the 4-12/3-8 clash).
  //  Super:  nothing of that, the psyche charts free of use-with-care numbers (the video: "good in both the
  //          main chart and the psyche chart"), a primary code (strong or soft) as the day or the essence,
  //          and both a strong and a soft code in the day chart (p. 23: "a balanced combination of both").
  //  Good:   everything else.
  function rateDate(positions, pairs) {
    const found = [];
    for (const [pos, v] of Object.entries(positions)) { if (!v) continue; const kind = codeKind(v.sum); if (kind) found.push({ pos, value: v, kind, words: CODE_WORDS[kind] }); }
    const where = (c) => `${c.value.text} as the ${POSITION_WORDS[c.pos] || c.pos}`;
    const bad = [], psycheCare = [];
    for (const c of found) {
      if (c.kind === 'avoid') bad.push(`${where(c)}: a number to avoid completely`);
      else if (c.kind === 'care' && STRONG_POS.includes(c.pos)) bad.push(`${where(c)}: to be avoided as the day or the essence`);
      else if (c.kind === 'care' && isPsyche(c.pos)) psycheCare.push(`${where(c)}: use with care`);
      else if (c.kind === 'limited' && (STRONG_POS.includes(c.pos) || c.pos === 'target')) bad.push(`${where(c)}: too hard as the day, the essence or the target`);
    }
    for (const [a, b, name] of pairs) if (a && b && ((a.ds === 4 && b.ds === 8) || (a.ds === 8 && b.ds === 4))) bad.push(`4 and 8 meet in the ${name}: the 4-12/3-8 clash`);
    if (bad.length) return { rating: 'beware', reasons: bad, codes: found };
    const primary = found.filter((c) => !isPsyche(c.pos) && (c.kind === 'strong' || c.kind === 'soft'));
    const strong = primary.filter((c) => c.kind === 'strong'), soft = primary.filter((c) => c.kind === 'soft');
    const dominant = primary.filter((c) => DOMINANT.includes(c.pos));
    const reasons = [];
    if (dominant.length) reasons.push(`a primary success code as the ${POSITION_WORDS[dominant[0].pos]} (${dominant[0].value.text})`);
    if (strong.length) reasons.push(`strong: ${strong.map(where).join(', ')}`);
    if (soft.length) reasons.push(`soft: ${soft.map(where).join(', ')}`);
    if (dominant.length && strong.length && soft.length && !psycheCare.length) return { rating: 'super', reasons, codes: found };
    const missing = [];
    if (!dominant.length) missing.push('no primary success code as the day or the essence');
    if (!strong.length) missing.push('no strong success code');
    if (!soft.length) missing.push('no soft success code');
    return { rating: 'good', reasons: missing.concat(psycheCare, reasons), codes: found };
  }
  function dayEnergy(y, m, d) {
    y = Number(y); m = Number(m); d = Number(d);
    const dt = new Date(y, m - 1, d);
    if (!(y >= 1000 && y <= 9999) || dt.getFullYear() !== y || dt.getMonth() + 1 !== m || dt.getDate() !== d) return null; // no Feb 30
    const scope = N.numeroscope({ day: String(d), month: String(m), year: String(y), name: '' });
    const e = scope.essence;
    if (!(e.day && e.month && e.year)) return null;
    const dv = val(d), mv = val(m), yv = val(digitsOf(y));
    const lp = val(dv.ds + mv.ds + yv.ds), bigLp = val(digitsOf(d) + digitsOf(m) + digitsOf(y));
    const outerAura = val(dv.ds + mv.ds), innerAura = val(dv.ds + yv.ds), dharmaAura = val(mv.ds + yv.ds);
    const two = (p, q) => val(p * 10 + q);
    const outer = two(dv.ds, mv.ds), inner = two(dv.ds, yv.ds), dharma = two(mv.ds, yv.ds);
    const target = two(dv.ds, dharmaAura.ds), dvlp = two(dv.ds, lp.ds);
    const pi = scope.psyche.inner, po = scope.psyche.outer;
    const positions = { dv, lp, bigLp, outer, inner, dvlp, dharma, target,
      piHeart: pi.heart, piSolar: pi.solar, piLe: pi.le, piPillar: pi.pillar, poHeart: po.heart, poSolar: po.solar, poLe: po.le, poPillar: po.pillar };
    const rated = rateDate(positions, [[dv, mv, 'outer diamond'], [dv, yv, 'inner diamond'], [mv, yv, 'dharma line']]);
    return { y, m, d, weekday: dt.getDay(), dv, mv, yv, lp, bigLp, outerAura, innerAura, dharmaAura, outer, inner, dharma, target, dvlp, ruler: PLANETS[dv.ds], essenceRuler: PLANETS[lp.ds], codes: rated.codes, rating: rated.rating, reasons: rated.reasons, essence: e, psyche: scope.psyche };
  }
  const RATING_WORDS = { super: 'Super Date', good: 'Good Date', beware: 'Beware' };
  // n days from a date on (Coming days).
  function comingDays(y, m, d, n = 31) {
    const out = [];
    for (let i = 0; i < n; i++) { const dt = new Date(Number(y), Number(m) - 1, Number(d) + i); out.push(dayEnergy(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())); }
    return out;
  }

  // ---------- prices (Marketing Numerology pp. 36-55) ----------
  // The vibrations the book recommends, each with its one-line reason, and the price ranges of the tool.
  const PRICE_VIBES = [
    [19, 'Luck and winning mentality, the best product, warm; great for new customers'], [37, 'The biggest money number with 23/5 and 32/5: magnetism, trust, a rock star vibe, international'],
    [14, 'Quick decisions, lower prices, selling large quantities fast'], [23, 'Soft and comfortable, luxury and abundance, a strong money number that works for everything'],
    [32, 'Charisma, magnetism and persuasion, expansion; good for just about everything'], [17, 'Spotlight and attention, an eye-catcher for one product, not for every price'],
    [27, 'Seriousness and confidence; business customers, schools, courses, training'], [36, 'Corporate authority and organization; landing the big players'],
    [21, 'Trust, skill and precision (clean price: 21, 210, 2100)'], [24, 'Warm, welcoming and feminine (clean price: 24, 240, 2400)'],
    [10, 'Winning mentality and success, easy to say yes to'], [28, 'Success and the millionaire vibe, but also efficiency with an edge'],
    [15, 'Mysterious and alluring, a softer price'], [33, 'Strong and loving at once'], [20, 'Soft and welcoming, a clean round price'],
  ];
  const PRICE_RANGES = [[10, 99], [100, 999], [1000, 9999], [10000, 99999], [100000, 999999]];
  // What the book says about one price: its digit sum, whether a magnetic number is visible in it as a
  // clean number (24, 240, 2400 → 24/6), and every warning: 12/3 or 16/7 digit sum, 4 and 8 together,
  // ending in 8 (except 17/8), 18/9 only as a sharp offer.
  const CLEAN = [21, 23, 24, 32, 42, 19, 27, 36, 37];
  function priceCheck(price) {
    const digitsStr = String(price).replace(/[^\d]/g, '');
    if (!digitsStr || /^0+$/.test(digitsStr)) return null;
    const digits = digitsStr.split('').map(Number);
    const sum = digits.reduce((a, b) => a + b, 0);
    const value = val(sum);
    const stripped = digitsStr.replace(/0+$/, '');
    const clean = CLEAN.find((c) => stripped === String(c)) || null;
    // A two-digit number followed by zeros reads as that number (120 is a 12/3 price, 1800 an 18/9 one).
    const visible = stripped.length === 2 ? Number(stripped) : null;
    const warnings = [], notes = [];
    if (sum === 12 || visible === 12) warnings.push('12/3: loss and victimization, avoid in business');
    if (sum === 16 || visible === 16) warnings.push('16/7: about losing, avoid at all costs');
    if (visible === 18) warnings.push('18 reinforced by zeros: too hard, only as a sharp offer');
    if (digits.includes(4) && digits.includes(8)) warnings.push('4 and 8 in the same price: creates doubt, a long "on the one hand" decision');
    const last = digits[digits.length - 1];
    if (last === 8 && sum !== 17) warnings.push('Ends in 8: prices should never end in 8, except 17/8');
    if (sum === 18) warnings.push('18/9: too hard, only as a sharp offer');
    if (sum === 26 || sum === 35) warnings.push(`${value.text}: the other 8 numbers should not be used, only 8 and 17/8`);
    if ([5, 7, 9].includes(last)) notes.push(`Ends in ${last}: a good last digit`);
    if (clean) notes.push(`Clean ${clean}/${digitSum(clean)} price: the number is visible, not only in the digit sum`);
    const vibe = PRICE_VIBES.find(([n]) => n === sum);
    if (vibe) notes.push(vibe[1]);
    // The number pyramid of the price (0 digits stay as 0 cells, as in the paid tool's price pyramids).
    const pyramid = []; let row = digits.map((x) => val(x));
    while (row.length) { pyramid.push(row); if (row.length === 1) break; row = row.slice(1).map((v, i) => val(row[i].ds + v.ds)); }
    const weight = N.weighPyramid(pyramid);
    return { price: Number(digitsStr), digits, sum, value, name: nameOf(sum), clean, warnings, notes, pyramid, weight, good: !warnings.length };
  }
  // Prices in a range whose digits add up to `sum`, following the book: last digit 5, 7 or 9 (or a
  // clean 0 ending for 21/23/24/32), never 4 and 8 together, no warning. Best (lightest pyramid) first.
  function priceFind(sum, [lo, hi], limit = 40) {
    sum = Number(sum);
    const out = [];
    for (let p = lo; p <= hi; p++) {
      const ds = digitsOf(p);
      if (ds !== sum) continue;
      const last = p % 10;
      if (![5, 7, 9, 0].includes(last)) continue;
      const c = priceCheck(p);
      if (!c || c.warnings.length) continue;
      if (last === 0 && !c.clean) continue;
      out.push(c);
    }
    out.sort((a, b) => a.weight.ratio - b.weight.ratio || a.price - b.price);
    return out.slice(0, limit);
  }

  // ---------- karmic connections (Forecasting pp. 63-77) ----------
  // People share destiny rhythms when their birth years have the same digit sum: same rhythm, same periods.
  function karmic(myYear, otherYears) {
    const mine = Number(myYear);
    const ds = (y) => digitSum(digitsOf(Number(y)));
    if (!(mine >= 1000 && mine <= 9999)) return null;
    const periods = N.destinyPeriods(mine, 12);
    return { year: mine, ds: ds(mine), rhythm: periods.slice(0, 6).map((p) => p.number), periods,
      others: (otherYears || []).map((y) => Number(y)).filter((y) => y >= 1000 && y <= 9999).map((y) => ({ year: y, ds: ds(y), shared: ds(y) === ds(mine), sameYear: y === mine })) };
  }

  root.NumberTools = { val, littleDiamond, bigDiamond, numbersContaining, dayEnergy, comingDays, rateDate, RATING_WORDS, CODES, CODE_WORDS, POSITION_WORDS, codeKind, PRICE_VIBES, PRICE_RANGES, priceCheck, priceFind, karmic, nameOf };
})(typeof globalThis !== 'undefined' ? globalThis : this);
