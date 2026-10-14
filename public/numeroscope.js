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
  function nameWord(text, filter) {
    const keep = (c) => c.toUpperCase() in LETTERS && (!filter || filter(c.toUpperCase()));
    const shown = [...String(text)].filter(keep).join('');
    const letters = [...shown.toUpperCase()];
    return { text: shown, letters, value: val(wordSum(letters)) };
  }

  // The rhombus (numeroscope) used by the name, consonant, vowel and psyche charts.
  //   words: values on the center line, first ... last. top: the day vibration (consciousness) or null.
  // CONFIRMED: line values, LE (names' digit sums added), big LE (raw sums added), lower auras
  // (name ds + LE ds), solar plexus (lower auras added), upper auras (name ds + day ds), heart
  // (upper auras added), spine (day ds + LE ds), pillar (day + heart + solar + LE digit sums).
  // Middle names (class manual, Katrine Ditte Pilmark): each adds an extra vibration to both
  // centers (center main ds + middle ds) and everything in the central column goes in the pillar.
  function rhombus(words, top) {
    const live = words.filter((w) => w && w.value);
    const first = live[0] || null, last = live.length > 1 ? live[live.length - 1] : (live[0] || null);
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
    const spineDiamond = joined(top, le);
    const spine = spineDiamond ? val(spineDiamond.ds) : null;
    return {
      words: live, first, last, middle, le, big,
      upperLeft: ul, upperRight: ur, heart, heartExtra, mindDiamond: joined(ul, ur),
      lowerLeft: ll, lowerRight: lr, solar, solarExtra, emotionDiamond: joined(ll, lr),
      leDiamond: live.length > 1 ? joined(first.value, last.value) : null,
      pillar, spineDiamond, spine,
      letters: live.reduce((a, w) => a + w.letters.length, 0),
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
    const cons = parts.map((p) => nameWord(p, (c) => !VOWELS.has(c)));
    const vow = parts.map((p) => nameWord(p, (c) => VOWELS.has(c)));
    return { essence: e, birth: e, psyche: psyche(e), name: rhombus(all, e.day), consonants: rhombus(cons, e.day), vowels: rhombus(vow, e.day) };
  }

  const api = { LETTERS, VOWELS, PLANETS, digitSum, val, add, joined, letterValue, lettersOf, nameWord, rhombus, essence, birth: essence, psyche, rhythm, numeroscope };
  root.Numeroscope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
