/* Chaldean numeroscope engine. Pure math, no DOM: runs in the browser (window.Numeroscope)
   and in node tests. Every value is {sum, ds, text} = "sum/ds" as the charts write it.
   Rules and sources: .brain/numerology/chart-construction.md. CONFIRMED marks what was
   checked against the paid tool's screenshots; the rest follows the course manual. */
(function (root) {
  'use strict';

  // 1. Chaldean letter values. 9 is never a letter.
  const LETTERS = {
    A: 1, I: 1, J: 1, Q: 1, Y: 1, 'Å': 1,
    B: 2, K: 2, R: 2,
    C: 3, G: 3, L: 3, S: 3,
    D: 4, M: 4, T: 4,
    E: 5, H: 5, N: 5, X: 5,
    U: 6, V: 6, W: 6, 'Æ': 6,
    O: 7, 'Ø': 7, Z: 7,
    F: 8, P: 8,
  };
  const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Æ', 'Ø']);
  const PLANETS = { 1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Uranus', 5: 'Mercury', 6: 'Venus', 7: 'Neptune', 8: 'Saturn', 9: 'Mars' };

  // Digits of a number added up again and again until one digit is left.
  const digitSum = (n) => { n = Math.abs(Math.trunc(n)); while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
  const digitsOf = (n) => String(Math.abs(Math.trunc(n))).split('').reduce((a, d) => a + Number(d), 0);
  // A chart value: the raw sum and its digit sum, written "sum/ds". 0 means "nothing yet".
  const val = (sum) => (sum > 0 ? { sum, ds: digitSum(sum), text: `${sum}/${digitSum(sum)}` } : null);
  // Numerological addition: add the digit sums, never the raw sums. add(23/5, 60/6) = 11/2.
  const add = (...vals) => (vals.length && vals.every(Boolean) ? val(vals.reduce((a, v) => a + v.ds, 0)) : null);
  // Two digit sums side by side ("diamond"): 1 and 2 -> 12/3.
  const joined = (a, b) => (a && b ? val(a.ds * 10 + b.ds) : null);

  const lettersOf = (word) => [...String(word).toUpperCase()].filter((c) => c in LETTERS);
  const letterValue = (c) => LETTERS[String(c).toUpperCase()] || 0;
  const wordSum = (letters) => letters.reduce((a, c) => a + LETTERS[c], 0);

  // One name on a center line: its shown text (only the letters that count), and its value.
  // A name that has letters but none that pass the filter (e.g. "Jr" on the vowel chart) stays on the
  // line as 0/0, still counts as first or last name, and adds nothing (paid tool, vault screenshot).
  // Punctuation typed in the name stays in the labels ("Jr." on the main chart, "." on the vowel chart).
  const ZERO = { sum: 0, ds: 0, text: '0/0' };
  function nameWord(text, filter) {
    const chars = [...String(text)];
    const isLetter = (c) => c.toUpperCase() in LETTERS;
    const keep = (c) => isLetter(c) && (!filter || filter(c.toUpperCase()));
    const letters = chars.filter(keep).map((c) => c.toUpperCase());
    const shown = filter ? chars.filter((c) => !isLetter(c) || keep(c)).join('') : chars.join('');
    const value = letters.length ? val(wordSum(letters)) : (chars.some(isLetter) ? ZERO : null);
    return { text: shown, letters, value };
  }

  // The rhombus (numeroscope) used by the name, consonant, vowel and psyche charts.
  //   words: values on the center line, first ... last. top: the day vibration (consciousness) or null.
  // CONFIRMED: line values, LE (names' digit sums added), big LE (raw sums added), lower auras
  // (name ds + LE ds), solar plexus (lower auras added), upper auras (name ds + day ds), heart
  // (upper auras added), spine (day ds + LE ds), pillar (day + heart + solar + LE digit sums).
  // Middle names (class manual, Katrine Ditte Pilmark): each adds an extra vibration to both
  // centers (center main ds + middle ds) and everything in the central column goes in the pillar.
  function rhombus(words, top) {
    // One word: only the word and its value on the line, nothing else (paid tool, "Muslim" screenshot:
    // main line 21/3, consonant line Mslm 14/5, vowel line ui 7/7, no LE, no auras, no centers).
    const live = words.filter((w) => w && w.value);
    const first = live[0] || null, last = live.length > 1 ? live[live.length - 1] : null;
    const letters = live.reduce((a, w) => a + w.letters.length, 0);
    if (live.length < 2) return { words: live, first, last: null, middle: [], le: null, big: null, upperLeft: null, upperRight: null, heart: null, heartExtra: [], mindDiamond: null, lowerLeft: null, lowerRight: null, solar: null, solarExtra: [], emotionDiamond: null, leDiamond: null, pillar: null, spineDiamond: null, spine: null, letters };
    const middle = live.slice(1, -1);
    const le = live.length ? val(live.reduce((a, w) => a + w.value.ds, 0)) : null;
    const big = live.length ? val(live.reduce((a, w) => a + w.value.sum, 0)) : null;
    const ul = first && top ? add(first.value, top) : null;
    const ur = last && top ? add(last.value, top) : null;
    const heart = add(ul, ur);
    const heartExtra = heart ? middle.map((w) => add(heart, w.value)) : [];
    const ll = first && le ? add(first.value, le) : null;
    const lr = last && le ? add(last.value, le) : null;
    const solar = add(ll, lr);
    const solarExtra = solar ? middle.map((w) => add(solar, w.value)) : [];
    const column = [top, heart, ...heartExtra, ...middle.map((w) => w.value), solar, ...solarExtra, le];
    const pillar = top && heart && solar && le ? val(column.reduce((a, v) => a + v.ds, 0)) : null;
    // Spine = day ds + LE ds written as a plain sum (6 + 9 = 15/6, 1 + 5 = 6/6). CONFIRMED on two screenshots.
    const spine = add(top, le);
    const spineDiamond = joined(top, le);
    return {
      words: live, first, last, middle, le, big,
      upperLeft: ul, upperRight: ur, heart, heartExtra, mindDiamond: joined(ul, ur),
      lowerLeft: ll, lowerRight: lr, solar, solarExtra, emotionDiamond: joined(ll, lr),
      leDiamond: first && last ? joined(first.value, last.value) : null,
      pillar, spineDiamond, spine, letters,
    };
  }

  // Essence (Higher Self) chart from the birth date. Any part may be missing while typing.
  // Day at the bottom point, month top-left, year top-right (course manual).
  function essence(day, month, year) {
    const d = Number(day) || 0, m = Number(month) || 0, y = Number(year) || 0;
    const dv = d >= 1 && d <= 31 ? val(d) : null;
    const mv = m >= 1 && m <= 12 ? val(m) : null;
    const yv = y >= 1000 && y <= 9999 ? val(digitsOf(y)) : null;
    const full = dv && mv && yv;
    const littleLp = full ? val(dv.ds + mv.ds + yv.ds) : null;
    const bigLp = full ? val(digitsOf(d) + digitsOf(m) + digitsOf(y)) : null;
    const outerAura = add(dv, mv), innerAura = add(dv, yv), topAura = add(mv, yv);
    return {
      day: dv, month: mv, year: yv, littleLp, bigLp,
      outerAura, innerAura, topAura,
      outerDiamond: joined(dv, mv), innerDiamond: joined(dv, yv), dharmaDiamond: joined(mv, yv),
      nexus: joined(dv, littleLp), target: joined(dv, topAura),
      planets: { day: dv && PLANETS[dv.ds], month: mv && PLANETS[mv.ds], year: yv && PLANETS[yv.ds] },
      rhythm: yv ? rhythm(yv.ds) : null,
    };
  }

  // Psyche charts: month and year on the center line, day on top (Module 7).
  // Inner: month and year as they are. Outer: the essence outer aura's digit sum (+9 while under
  // 10, the "teenage" range) on the left instead of the month.
  function psyche(e) {
    const w = (text, value) => (value ? { text, letters: [], value } : null);
    const inner = e.month && e.year ? rhombus([w('month', e.month), w('year', e.year)], e.day) : rhombus([], null);
    let challenge = null;
    if (e.outerAura) { let n = e.outerAura.ds; if (n < 10) n += 9; challenge = val(n); }
    const outer = challenge && e.year ? rhombus([w('challenge', challenge), w('year', e.year)], e.day) : rhombus([], null);
    return { inner, outer, challenge };
  }

  // Destiny rhythm from the birth year's digit sum (vortex math), 27-year cycle. Not shown yet.
  function rhythm(ds) {
    let seq;
    if (ds === 9) seq = [9, 9, 9];
    else if (ds === 3 || ds === 6) seq = ds === 3 ? [3, 6, 3, 6, 3, 6] : [6, 3, 6, 3, 6, 3];
    else { const ring = [1, 2, 4, 8, 7, 5]; const i = ring.indexOf(ds); seq = ring.slice(i).concat(ring.slice(0, i)); }
    return seq.map((years) => ({ years, planet: PLANETS[years] }));
  }

  // Everything the quick chart shows, from the four boxes.
  function numeroscope({ day, month, year, name }) {
    const e = essence(day, month, year);
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const all = parts.map((p) => nameWord(p));
    // Augmentation on the main name chart only (13 vault charts with Jr, Sr, Sir, II, III): a one-digit
    // name value gets the day's digit sum added, and 9 more if that is still under 10. Jr (3) with day 2
    // -> 14/5, with day 14 -> 17/8; Sir (6) with day 22 -> 10/1. The augmented value feeds LE, big LE
    // and the auras. The consonant and vowel charts never augment (they show 3/3, 0/0, 5/5 as they are).
    if (e.day) for (const w of all) if (w.value && w.value.sum < 10) { let n = w.value.sum + e.day.ds; if (n < 10) n += 9; w.value = val(n); }
    const cons = parts.map((p) => nameWord(p, (c) => !VOWELS.has(c)));
    const vow = parts.map((p) => nameWord(p, (c) => VOWELS.has(c)));
    return { essence: e, birth: e, psyche: psyche(e), name: rhombus(all, e.day), consonants: rhombus(cons, e.day), vowels: rhombus(vow, e.day) };
  }

  // Single name chart (Module 12, Name Change method step 3): the numeroscope applied to ONE word, every
  // letter taking the place of a name. First letter = first name, last letter = surname, the letters
  // between = middle names (one extra vibration each in both centers). No augmentation: the letter values
  // are used as they are. CONFIRMED on the owner's paid-tool screenshots (Shicora, Joshua, Peter, day 19):
  // Shicora 3 5 1 3 7 2 1 -> auras 4/4 2/2 7/7 5/5, heart 6/6 + 11 7 9 13 8, solar 12/3 + 8 4 6 10 5,
  // LE 22/4, pillar 86/5, 7 letters. Vowels and consonants of the word give its vocation and personality charts.
  function letterWords(word, filter) {
    return [...String(word)].filter((c) => c.toUpperCase() in LETTERS && (!filter || filter(c.toUpperCase())))
      .map((c) => ({ text: c, letters: [c.toUpperCase()], value: val(LETTERS[c.toUpperCase()]) }));
  }

  // Number pyramid of a word: letter values at the bottom, each row above adds neighbours' digit sums
  // (14/5 + 10/1 = 6/6) until one number is left at the top. rows[0] is the letter row.
  function pyramid(values) {
    const rows = [];
    let row = values.filter(Boolean);
    while (row.length) { rows.push(row); if (row.length === 1) break; row = row.slice(1).map((v, i) => val(row[i].ds + v.ds)); }
    return rows;
  }

  // Weighting the pyramid (Module 12, "Weighting numbers"): tension numbers 11/2 = 0.5 point, 12/3, 16/7,
  // 18/9 = 1 point; tension-boosting pairs (4+4 -> 8, 4+8 -> 12, 13+8 -> 12, 18+12 -> 12, 8+8 -> 16,
  // 16+18 -> 16) 1 point. Each point is multiplied by its row's ratio, which grows exponentially from
  // row 1 (the letters) to n on row n: ratio(k) = 1 + (n-1) * 2^(k-n). Book examples: 4 rows -> 1.375,
  // 1.75, 2.5, 4; 10 rows -> 1.0176, ..., 1.2813 (row 5), 3.25 (row 8), 10. A tension number on top adds
  // its points * n once more. Total ratio = total weight / N, N = n(n+1)/2 cells; under 0.3 is approved.
  // CONFIRMED on the paid tool: Joshua 2.90625/21, Shicora 6.375/28, Peter 15/15 (11/2 on top, +2.5).
  const TENSION = { 11: 0.5, 12: 1, 16: 1, 18: 1 };
  const COMBOS = [[4, 4, 8], [4, 8, 12], [13, 8, 12], [18, 12, 12], [8, 8, 16], [16, 18, 16]];
  function weighPyramid(rows) {
    const n = rows.length;
    if (!n) return { n, cells: 0, numbers: [], combos: [], penalty: 0, top: null, total: 0, ratio: 0, approved: true };
    const ratio = (k) => 1 + (n - 1) * Math.pow(2, k - n);
    const numbers = []; // 10/1 .. 18/9, rows 2 and up
    for (let sum = 10; sum <= 18; sum++) {
      let count = 0, weight = 0;
      rows.forEach((row, i) => { if (i === 0) return; for (const v of row) if (v.sum === sum) { count++; weight += (TENSION[sum] || 0) * ratio(i + 1); } });
      numbers.push({ value: val(sum), count, weight });
    }
    const combos = COMBOS.map(([a, b, made]) => {
      let count = 0, weight = 0;
      rows.forEach((row, i) => { if (i === 0) return; row.forEach((v, j) => { const p = rows[i - 1][j].sum, q = rows[i - 1][j + 1].sum; if (v.sum === made && ((p === a && q === b) || (p === b && q === a))) { count++; weight += ratio(i + 1); } }); });
      return { a: val(a), b: val(b), made: val(made), count, weight };
    });
    const top = rows[n - 1][0];
    const penalty = TENSION[top.sum] ? TENSION[top.sum] * n : 0;
    const total = numbers.reduce((s, x) => s + x.weight, 0) + combos.reduce((s, x) => s + x.weight, 0) + penalty;
    const cells = n * (n + 1) / 2;
    return { n, cells, numbers, combos, penalty, top, total, ratio: total / cells, approved: total / cells < 0.3 };
  }

  function singleName(word, day) {
    const top = day ? (typeof day === 'object' ? day : val(Number(day) || 0)) : null;
    const letters = letterWords(word);
    const rows = pyramid(letters.map((w) => w.value));
    return {
      word: String(word || ''), letters: letters.length,
      name: rhombus(letters, top),
      consonants: rhombus(letterWords(word, (c) => !VOWELS.has(c)), top),
      vowels: rhombus(letterWords(word, (c) => VOWELS.has(c)), top),
      pyramid: rows, weight: weighPyramid(rows),
    };
  }

  // Layout of the quick chart drawing, in drawing units: the orange diamond's top is y=357, its center
  // x=371, its height 756; text y values are baselines. Shapes measured on the owner's reference
  // screenshot; every number's position calibrated against 436 vault screenshots of the paid tool
  // (tools/color-study, .brain/numerology/number-colors.md).
  const LAYOUT = {
    // Re-measured 2026-10-15 on the owner's paid-tool screenshot (Peter Joshua Shicora, 21 10 1985) with
    // tools/color-study-style box and shape detection; every shape and number compared in these units.
    // Circles are slightly wider than tall in the paid tool (r = [rx, ry]); center lines are thin.
    main: { cx: 371, hw: 277, hh: 378, lineY: 735, line: 5, circleUp: 148.5, circleDown: 145, r: [110, 106.5], tri: [1179.5, 1268, 64.5], big: [269, 1147, 52], letter: [662, 637.5, 28.5],
      text: { dvY: 335.3, day: 37.8, auraL: 210, auraR: 531, upY: 523.4, heartY: 540.1, heart: 34.8, extraUp: 89.5, extra: 24.3, spineX: 524, spineY: 641.5, spine: 23.3, nameL: 78.5, nameR: 660, extra2: [-59.4, 64.7], solarExtra2: [-59.4, 70.1], nameY: 722.1, name: 27.7, lineY: 769.6, lineFont: 35.3, lowY: 946.4, solarY: 831.5, solar: 35.4, extraDown: 90.7, leY: 1154, le: 35.8, pillarY: 1249.7, pillar: 26, small: 25.4, letterY: 647.6, letterFont: 23.8 } },
    hex: { top: 51.3, ul: 111.5, ll: 234, bottom: 300, hw: 110, circle: [175, 44.5], small: [251, 13.5],
      text: { topAuraY: 100.5, monthX: 246, yearX: 502.8, monthY: 100.5, lpY: 165.6, bigLpY: 198.1, lp: 25.8, auraY: 210, auraL: 286, auraR: 454.5, aura: 24, corner: 24.2 } },
    // sideDx shifts the line values and auras of one psyche chart against its center column (measured).
    psy: { cxL: 133.2, cxR: 608.3, cy: 330.4, hw: 101, hh: 139, line: 3, up: 55.2, down: 54, r: [40.5, 39.4], tri: [505, 539, 24.6], sideDxL: 1, sideDxR: 3.4,
      text: { dvY: 181.8, day: 22.5, auraDx: 70, upY: 254.3, heartY: 275.9, heart: 24.2, nameDxL: -125, nameDxR: 125, lineY: 335.2, lineFont: 23.3, lowY: 422.8, solarY: 389.9, leY: 493.3, le: 21, pillarY: 535.8, pillar: 18.9, pillarBold: false, small: 19.2 } },
    // The two sub-charts are not mirror images: the paid tool anchors the consonant chart's auras at their
    // left edge and the vowel chart's at their right edge, and its line values sit off-center. Measured.
    // Middle names: one sits at the center (main chart: halfway between first and last); two sit at middle2
    // (main chart: evenly spaced). Two extra vibrations sit side by side at extra2 / solarExtra2.
    sub: { cy: 1047.4, hw: 101.5, hh: 140, line: 2, up: 52.9, down: 54.3, r: 41.2, tri: [1220, 1267.5, 34], bigY: 1200.3, bigR: 25.3,
      left: { cx: 115.4, auraL: 21.2, auraR: 170, auraAnchor: 'start', nameL: 21.6, nameR: 224.3, middle2: [-43, 56], extra2: [-32.6, 27.3], solarExtra2: [-36.6, 24.1], bigX: 55.5 },
      right: { cx: 620.4, auraL: 563.6, auraR: 716.9, auraAnchor: 'end', nameL: 513.8, nameR: 716.7, middle2: [-51, 45], extra2: [-31.5, 25.7], solarExtra2: [-29, 29], bigX: 557.1 },
      text: { dvY: 892.6, day: 19.4, upY: 981.4, heartY: 982.8, heart: 21, extraUp: 29.1, extra: 15.7, nameY: 1034.3, name: 14.2, lineY: 1060.7, lineFont: 19.3, lowY: 1129.8, solarY: 1097.1, solar: 21, extraDown: 26.3, leY: 1208.1, le: 21, pillarY: 1260.4, pillar: 17, small: 19.4 } },
  };


  const api = { LAYOUT, LETTERS, VOWELS, PLANETS, TENSION, digitSum, val, add, joined, letterValue, lettersOf, nameWord, rhombus, essence, birth: essence, psyche, rhythm, numeroscope, letterWords, pyramid, weighPyramid, singleName };
  root.Numeroscope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
