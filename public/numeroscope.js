/* Chaldean numeroscope engine. Pure math, no DOM: runs in the browser (window.Numeroscope)
   and in node tests. Every value is {sum, ds, text} = "sum/ds" as the charts write it.
   What is confirmed against the paid tool's screenshots is marked CONFIRMED; the rest
   follows the course notes and waits for a screenshot to prove it. */
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
  // A chart value: the raw sum and its digit sum, written "sum/ds". 0 means "nothing yet".
  const val = (sum) => (sum > 0 ? { sum, ds: digitSum(sum), text: `${sum}/${digitSum(sum)}` } : null);
  // Numerological addition: add the digit sums, never the raw sums. add(23/5, 60/6) = 11/2.
  const add = (...vals) => (vals.every(Boolean) ? val(vals.reduce((a, v) => a + v.ds, 0)) : null);
  // Two digit sums side by side: 1 and 2 -> 12/3.
  const joined = (a, b) => (a && b ? val(a.ds * 10 + b.ds) : null);

  // Letters of one word, uppercased, anything that is not a known letter dropped.
  const lettersOf = (word) => [...String(word).toUpperCase()].filter((c) => c in LETTERS);
  const letterValue = (c) => LETTERS[c.toUpperCase()] || 0;
  const wordSum = (letters) => letters.reduce((a, c) => a + LETTERS[c], 0);

  // One name on a center line: its shown text, its letters, and its value.
  function nameWord(text, filter) {
    const keep = (c) => c.toUpperCase() in LETTERS && (!filter || filter(c.toUpperCase()));
    const shown = [...String(text)].filter(keep).join('');
    const letters = [...shown.toUpperCase()];
    return { text: shown, letters, value: val(wordSum(letters)) };
  }

  // The rhombus chart used by the name, consonant and vowel charts.
  //   words: names on the center line (first ... last), dv: day vibration or null.
  // CONFIRMED by screenshots ("Test test", day 1): line values, LE (sum of the names'
  // digit sums), big LE (sum of the raw sums), lower auras (name ds + LE ds), solar plexus
  // (left lower aura ds + right lower aura ds), upper auras (name ds + DV ds), heart
  // (upper auras added), pillar (DV + heart + solar + LE digit sums).
  function rhombus(words, dv) {
    const live = words.filter((w) => w.value);
    const first = live[0] || null, last = live.length > 1 ? live[live.length - 1] : (live[0] || null);
    const middle = live.slice(1, -1);
    const le = live.length ? val(live.reduce((a, w) => a + w.value.ds, 0)) : null;
    const big = live.length ? val(live.reduce((a, w) => a + w.value.sum, 0)) : null;
    const ul = first && dv ? add(first.value, dv) : null;
    const ur = last && dv ? add(last.value, dv) : null;
    const heart = add(ul, ur);
    const ll = first && le ? add(first.value, le) : null;
    const lr = last && le ? add(last.value, le) : null;
    const solar = add(ll, lr);
    const pillar = dv && heart && solar && le ? val(dv.ds + heart.ds + middle.reduce((a, w) => a + w.value.ds, 0) + solar.ds + le.ds) : null;
    // Spine diamond = day digit sum beside LE digit sum (1 and 5 -> 15/6); spine number = its digit sum (6/6). CONFIRMED.
    const spineDiamond = joined(dv, le);
    const spine = spineDiamond ? val(spineDiamond.ds) : null;
    return { words: live, first, last, middle, le, big, upperLeft: ul, upperRight: ur, heart, lowerLeft: ll, lowerRight: lr, solar, pillar, spineDiamond, spine, letters: live.reduce((a, w) => a + w.letters.length, 0) };
  }

  // Birth date pieces. Any part may be missing (null) while the owner is still typing.
  // CONFIRMED: day 1 -> 1/1 shown under the top shape. The rest follows the notes.
  function birth(day, month, year) {
    const d = Number(day) || 0, m = Number(month) || 0, y = Number(year) || 0;
    const dv = d >= 1 && d <= 31 ? val(d) : null;
    const mv = m >= 1 && m <= 12 ? val(m) : null;
    const yv = y >= 1000 && y <= 9999 ? val(String(y).split('').reduce((a, c) => a + Number(c), 0)) : null;
    const littleLp = dv && mv && yv ? val(dv.ds + mv.ds + yv.ds) : null;
    const higherLp = dv && mv && yv ? val([d, m, y].join('').split('').reduce((a, c) => a + Number(c), 0)) : null;
    const topAura = add(mv, yv);
    return {
      day: dv, month: mv, year: yv, littleLp, higherLp,
      outerDiamond: joined(dv, mv), innerDiamond: joined(dv, yv), dharma: joined(mv, yv),
      nexus: joined(dv, littleLp), target: joined(dv, topAura),
      innerPsyche: dv && mv && yv ? { top: dv, left: mv, right: yv, bottom: add(mv, yv) } : null,
      rhythm: yv ? rhythm(yv.ds) : null,
    };
  }

  // Destiny rhythm from the birth year's digit sum (vortex math), 27-year cycle.
  function rhythm(ds) {
    let seq;
    if (ds === 9) seq = [9, 9, 9];
    else if (ds === 3 || ds === 6) seq = ds === 3 ? [3, 6, 3, 6, 3, 6] : [6, 3, 6, 3, 6, 3];
    else { const ring = [1, 2, 4, 8, 7, 5]; const i = ring.indexOf(ds); seq = ring.slice(i).concat(ring.slice(0, i)); }
    return seq.map((years) => ({ years, planet: PLANETS[years] }));
  }

  // Everything the quick chart shows, from the four boxes.
  function numeroscope({ day, month, year, name }) {
    const b = birth(day, month, year);
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const all = parts.map((p) => nameWord(p));
    const cons = parts.map((p) => nameWord(p, (c) => !VOWELS.has(c)));
    const vow = parts.map((p) => nameWord(p, (c) => VOWELS.has(c)));
    return { birth: b, name: rhombus(all, b.day), consonants: rhombus(cons, b.day), vowels: rhombus(vow, b.day) };
  }

  const api = { LETTERS, VOWELS, PLANETS, digitSum, val, add, joined, letterValue, lettersOf, nameWord, rhombus, birth, rhythm, numeroscope };
  root.Numeroscope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
