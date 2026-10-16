// Number tools: the big diamond (Number fun, Relationship), the energy of a date (Today, Coming days),
// price rules (Price tool) and shared destiny rhythms (Karmic connections). Pure math, no DOM, runs in
// node for the tests (test/numbertools.test.js) and in the browser (public/tools.js draws it).
// Sources, all in the owner's Drive "Hub" (.brain/numerology/software-tools.md says where each was read):
//   big diamond      The Diamond Method book pp. 7-28, CONFIRMED on its worked example 14/5
//   energy of a date Forecasting Numerology pp. 20-23 (24.12.1999 case), Success Codes & Superdates pp. 19-31, 198-200
//   success codes    Success Codes & Superdates pp. 22-32 and 31; the Super / Good / Beware rule follows the course's
//                    wording as NotebookLM summarized it on 2026-10-15 (.brain/numerology/software-tools.md)
//   prices           Marketing Numerology pp. 37-55 (Drive folder "Business PDF's"); the words per number in bizwords.js
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
  // Where a primary code must stand for a Super Date: the day vibration or the essence, the book's "strongest
  // positions" (GV / ST, p. 31). The big essence repeats the essence's digit sum and does not count: 31 Oct 2026
  // (31/4 day, 6 essence, 15/6 big essence) was called Super for its big essence alone (owner, 2026-10-16).
  const DOMINANT = ['dv', 'lp'];
  const STRONG_POS = ['dv', 'lp']; // the strongest positions (GV and ST in the book): the day and the essence
  const isPsyche = (pos) => /^p[io]/.test(pos);
  // Super / Good / Beware, the paid tool's three colors (gold, green, red), from the course's rules:
  //  Beware: a number to avoid anywhere in the day chart or in a psyche center, pillar or life expression;
  //          12, 57, 75, 39, 48, 84 or 11 as the day or the essence; 18, 81, 99 as the day, the essence or
  //          the target; 4 and 8 meeting (day, month, year) in a diamond (the 4-12/3-8 clash).
  //  Super:  nothing of that, the psyche charts free of use-with-care numbers (the video: "good in both the
  //          main chart and the psyche chart"), a primary code (strong or soft) as the day or the essence itself,
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

  // ---------- prices (Marketing Numerology pp. 37-55, the owner's Drive folder "Business PDF's") ----------
  // The vibrations to pick from in Find a Price, as the book names them: digit-sum prices (p. 40: 1, 10/1, 19/1;
  // 14/5, 23/5, 32/5; 8 and 17/8; 9, 27/9, 36/9, 45/9, 54/9; p. 41: 37/1, and 28/1 "can sometimes work"; p. 53:
  // 18/9 as a sharp offer; 54/9 is left out: no price under $999,999 but 999,999 adds up to 54), clean prices (pp. 38-39, 52: 21/3, 24/6) and softer prices (p. 53: 15/6, 33/6, 20/2).
  // Their words come from the book through public/bizwords.js (generated by tools/make-bizwords.mjs).
  const PRICE_VIBES = [[19, 'sum'], [37, 'sum'], [10, 'sum'], [28, 'sum'], [14, 'sum'], [23, 'sum'], [32, 'sum'], [17, 'sum'], [27, 'sum'], [36, 'sum'], [45, 'sum'], [18, 'offer'],
    [21, 'clean'], [24, 'clean'], [15, 'soft'], [33, 'soft'], [20, 'soft']];
  const PRICE_RANGES = [[10, 99], [100, 999], [1000, 9999], [10000, 99999], [100000, 999999]];
  // Clean prices: the number stands in the price, followed by zeros (pp. 38-39: 24, 240, 2400 and the inverse 4200;
  // 21, 210, 2100; 23, 230, 2300 and the reversal 32/5; p. 47: 19.000 = 19/1; p. 53: 2.000 = 20/2).
  const CLEAN = [21, 23, 24, 32, 42, 19, 27, 36, 37, 20];
  // "Some magnetic numbers can be included as whole numbers in the row, such as 19, 23, 27, 32, 36, 37" (p. 40).
  const MAGNETIC = [19, 23, 27, 32, 36, 37];
  // What the book says about one price. Three verdicts:
  //  avoid  a no-go price (p. 48): 12/3 or 16/7 as the digit sum or standing in the price ($120, $1600); 4 and 8 in
  //         the same price; an 8 digit sum other than 8 and 17/8 (p. 40 "Number 8: Only 8 and 17/8 (not the other 8
  //         numbers such as 26/8 and 35/8)", p. 43 "Prices should never end in 8, except for 17/8 … The other 8 digit
  //         sum numbers should not be used": "end in 8" is the digit sum, not the last digit; the book's rule for the
  //         last digit is p. 40 "The last number can be a 5, 7 or 9").
  //  care   allowed only in a certain way: 18/9 "except as a strong offer" (pp. 40, 53); 18 reinforced by zeros is "a
  //         little too hard" (p. 51, $1800).
  //  A digit sum other than 1, 5 or 9 (p. 40 "The digit sum must land on 5, 9 or 1") is only a tip, never a caution:
  //  the owner's call 2026-10-16 ("we don't have to avoid digit sums other than those numbers, just be smart"), and
  //  the book itself prices on 6, 20/2 (p. 53) and 21/3 (p. 46, 597).
  //  good   everything else.
  // The rules alone (string work, no pyramid): shared by priceCheck and the fast search of priceFind.
  function priceRules(digitsStr) {
    const digits = digitsStr.split('').map(Number);
    const sum = digits.reduce((a, b) => a + b, 0);
    const value = val(sum);
    const stripped = digitsStr.replace(/0+$/, '');
    const clean = CLEAN.find((c) => stripped === String(c) || (c === 20 && stripped === '2' && digitsStr.length >= 4)) || null;
    // A two-digit number followed by zeros reads as that number (120 is a 12/3 price, 1800 an 18/9 one, p. 48, 51).
    const visible = stripped.length === 2 ? Number(stripped) : clean;
    const warnings = [], cautions = [], notes = [];
    if (sum === 12 || visible === 12) warnings.push('12/3 can be about loss and victimization: avoid in business (p. 48)');
    if (sum === 16 || visible === 16) warnings.push('16/7 is about losing: avoid at all costs (p. 48)');
    if (digits.includes(4) && digits.includes(8)) warnings.push('4 and 8 in the same price confuse the buyer and create doubt: "on the one hand and on the other hand…" (p. 48)');
    if (value.ds === 8 && sum !== 8 && sum !== 17) warnings.push(`${value.text}: of the 8 prices use only 8 and 17/8; the other 8 digit sums should not be used (pp. 40, 43)`);
    if (sum === 18) cautions.push('18/9: avoid, except as a competitive, sharp offer (pp. 40, 53)');
    if (visible === 18 && sum !== 18) cautions.push('18 reinforced by zeros: a little too hard (p. 51)');
    const bookSum = [1, 5, 9].includes(value.ds) || sum === 8 || sum === 17 || value.ds === 6 || sum === 20 || sum === 21 || clean;
    if (!bookSum && !warnings.length) notes.push(`Lands on ${value.ds}: the book's favorite prices land on 1, 5 or 9 (a 6 or 20/2 for a softer price); fine when ${value.ds} suits what you sell (pp. 40, 53)`);
    const last = digits[digits.length - 1];
    if ([5, 7, 9].includes(last)) notes.push(`Ends in ${last}: a good last digit (p. 40)`);
    if (clean) notes.push(`Clean ${val(clean).text} price: the number is visible, not only in the digit sum (pp. 38-39)`);
    const rowNums = [];
    for (let i = 0; i + 1 < digits.length; i++) { const n = digits[i] * 10 + digits[i + 1]; if (MAGNETIC.includes(n) && n !== clean && !rowNums.includes(n)) rowNums.push(n); }
    for (const n of rowNums) notes.push(`${val(n).text} stands in the price: a magnetic number in the row (p. 40)`);
    const verdict = warnings.length ? 'avoid' : cautions.length ? 'care' : 'good';
    // lead = the first two digits, which the book reads too ("36 is included as the first two digits", p. 51; "the
    // first two digits are the millionaire number 73", p. 53).
    const lead = digitsStr.length >= 3 && digits[0] ? digits[0] * 10 + digits[1] : null;
    return { price: Number(digitsStr), digits, sum, value, name: nameOf(sum), clean, visible, lead, rowNums, warnings, cautions, notes, verdict, good: verdict === 'good' };
  }
  function priceCheck(price) {
    const digitsStr = String(price).replace(/[^\d]/g, '').replace(/^0+/, '');
    if (!digitsStr) return null;
    const r = priceRules(digitsStr);
    // The number pyramid of the price (0 digits stay as 0 cells, as in the paid tool's price pyramids).
    const pyramid = []; let row = r.digits.map((x) => val(x));
    while (row.length) { pyramid.push(row); if (row.length === 1) break; row = row.slice(1).map((v, i) => val(row[i].ds + v.ds)); }
    return { ...r, pyramid, weight: N.weighPyramid(pyramid) };
  }
  // The pyramid's weight ratio without building the pyramid: the same sums as Numeroscope.weighPyramid (tension
  // numbers and combinations below the first row, the top's penalty), for ranking thousands of prices quickly.
  // test/numbertools.test.js proves it equal to weighPyramid. Keep the two lists in step with numeroscope.js.
  const TENSION = N.TENSION, COMBOS = [[4, 4, 8], [4, 8, 12], [13, 8, 12], [18, 12, 12], [8, 8, 16], [16, 18, 16]];
  function pyramidRatio(digits) {
    const n = digits.length;
    let prev = digits, total = 0;
    for (let i = 1; i < n; i++) {
      const w = 1 + (n - 1) * Math.pow(2, i + 1 - n), cur = [];
      for (let j = 0; j + 1 < prev.length; j++) {
        const p = prev[j], q = prev[j + 1], s = (p > 9 ? p - 9 : p) + (q > 9 ? q - 9 : q);
        cur.push(s);
        total += (TENSION[s] || 0) * w;
        for (const [a, b, made] of COMBOS) if (s === made && ((p === a && q === b) || (p === b && q === a))) total += w;
      }
      prev = cur;
    }
    total += (TENSION[prev[0]] || 0) * n;
    return total / (n * (n + 1) / 2);
  }
  const VERDICT_WORDS = { good: 'Good Price', care: 'Only With Care', avoid: 'Avoid' };
  // Prices in a range whose digits add up to `sum` (or, for a clean number, that show it: $210 for 21), following the
  // book: last digit 5, 7 or 9 (or a clean 0 ending), no warning, no caution but the chosen 18/9's own. Best (lightest
  // pyramid) first. The cheap tests run first; the full reading is built only for the prices returned.
  function priceFind(sum, [lo, hi], limit = 40) {
    sum = Number(sum);
    const cleanToo = CLEAN.includes(sum); // 21 → also $210, $2100 (the number stands in the price, pp. 38-39)
    const hits = [];
    let passes = null;
    for (let p = lo; p <= hi; p++) {
      const last = p % 10;
      if (last !== 5 && last !== 7 && last !== 9 && last !== 0) continue;
      let ds = 0; for (let x = p; x; x = Math.floor(x / 10)) ds += x % 10;
      if (ds !== sum && !(cleanToo && last === 0)) continue;
      const str = String(p);
      if (last === 0) { // a 0 at the end only for a clean price (the number followed by zeros)
        const st = str.replace(/0+$/, '');
        const c = CLEAN.find((n) => st === String(n) || (n === 20 && st === '2' && str.length >= 4));
        if (!c || (ds !== sum && c !== sum)) continue;
      }
      if (str.includes('4') && str.includes('8')) continue; // p. 48, before anything else costs time
      // Without a 0 at the end nothing stands in the price, so the warnings depend on the digit sum alone: read once.
      if (last !== 0 && passes !== null) { if (passes) hits.push({ p, ratio: pyramidRatio(str.split('').map(Number)) }); continue; }
      const r = priceRules(str);
      const ok = !r.warnings.length && !r.cautions.some((w) => !w.startsWith('18/9'));
      if (last !== 0) { passes = ok; if (ok) hits.push({ p, ratio: pyramidRatio(r.digits) }); continue; }
      if ((ds !== sum && r.clean !== sum) || !r.clean || !ok) continue;
      hits.push({ p, ratio: pyramidRatio(r.digits) });
    }
    hits.sort((a, b) => a.ratio - b.ratio || a.p - b.p);
    return hits.slice(0, limit).map((h) => priceCheck(h.p));
  }

  // ---------- the ruler of the day and its undertone (Superdates Cosmic Calendar pp. 51-108) ----------
  // Pluto has no day of its own: "Associated numbers: 0 and 9 (through Mars-Pluto resonance) … Dates vibrating with
  // 9, 18, 27, or compound numbers containing 0 often carry Pluto's undertone of karmic closure and new beginnings"
  // (p. 104); "20 … the receptive 2 merges with the cosmic 0 (Pluto)" (p. 56).
  const plutoUndertone = (v) => !!v && ([9, 18, 27].includes(v.sum) || (v.sum >= 10 && String(v.sum).includes('0')));

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

  root.NumberTools = { val, littleDiamond, bigDiamond, numbersContaining, dayEnergy, comingDays, rateDate, RATING_WORDS, CODES, CODE_WORDS, POSITION_WORDS, codeKind, PRICE_VIBES, PRICE_RANGES, VERDICT_WORDS, priceCheck, priceFind, pyramidRatio, plutoUndertone, karmic, nameOf };
})(typeof globalThis !== 'undefined' ? globalThis : this);
