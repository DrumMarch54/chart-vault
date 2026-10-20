// English words by their number value, for the Business Words tool (Marketing Numerology, "TOOL: Business words":
// "enter the desired number value and the relevant names / word lists will be displayed ... organized by consonant
// and vowel values. Next to each word a triangle icon with a number at the top: the top number in the word's number
// pyramid, colored by our rating of the pyramid"). The words are the 60,000 most common English words
// (server/words.txt.gz, most common first), valued with the app's own letter table (public/numeroscope.js), so a
// word reads exactly as it does on a name line. Nothing here is a course word: the book's own lists live in
// public/placewords.js.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Numeroscope as N } from './positions.js';

const VOWELS = N.VOWELS;
let index = null; // sum -> [{ word, rank }], most common first
let all = null, rankOf = null;
function build() {
  if (index) return;
  all = zlib.gunzipSync(fs.readFileSync(new URL('./words.txt.gz', import.meta.url))).toString('utf8').split('\n').map((w) => w.trim()).filter((w) => /^[a-z]{3,}$/.test(w));
  index = new Map(); rankOf = new Map();
  all.forEach((word, rank) => { rankOf.set(word, rank); const v = N.nameWord(word).value; if (!v || !v.sum) return; if (!index.has(v.sum)) index.set(v.sum, []); index.get(v.sum).push({ word, rank }); });
}

// The pyramid's verdict, as the Price Tool colors it: red for a tension number on top or a heavy pyramid (ratio
// 0.3 or more, the book's line), yellow for some weight, green for none.
const tone = (w) => ((w.top && N.TENSION[w.top.sum]) || w.ratio >= 0.3 ? 'r' : w.ratio > 0 ? 'y' : 'g');
const slim = (v) => (v ? { sum: v.sum, ds: v.ds, text: `${v.sum}/${v.ds}` } : null);

// One word's numbers: its value, consonants, vowels, the pyramid's top and verdict.
export function wordInfo(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  const value = N.nameWord(w).value;
  if (!value || !value.sum) return null;
  const k = N.nameWord(w, (c) => !VOWELS.has(c)).value, v = N.nameWord(w, (c) => VOWELS.has(c)).value;
  const rows = N.pyramid(N.letterWords(w).map((x) => x.value));
  const weight = N.weighPyramid(rows);
  build();
  const rank = rankOf.has(w) ? rankOf.get(w) : null;
  return { word: w, rank, value: slim(value), consonants: slim(k && k.sum ? k : null), vowels: slim(v && v.sum ? v : null),
    top: slim(weight.top), tone: tone(weight), ratio: Number(weight.ratio.toFixed(3)), pyramid: rows.map((r) => r.map(slim)) };
}

// Words worth one value (10-99, or a digit sum 1-9 for every value landing on it), most common first.
export function wordsFor(sum, { limit = 60, offset = 0, start = '' } = {}) {
  build();
  const n = Number(sum);
  const sums = n >= 10 ? [n] : [...index.keys()].filter((s) => N.val(s).ds === n);
  const prefix = String(start || '').toLowerCase().replace(/[^a-z]/g, '');
  const rows = sums.flatMap((s) => index.get(s) || []).filter((r) => !prefix || r.word.startsWith(prefix)).sort((a, b) => a.rank - b.rank);
  const page = rows.slice(offset, offset + limit).map((r) => { const i = wordInfo(r.word); return { word: i.word, rank: r.rank, value: i.value, consonants: i.consonants, vowels: i.vowels, top: i.top, tone: i.tone }; });
  return { sum: n, total: rows.length, offset, words: page };
}
