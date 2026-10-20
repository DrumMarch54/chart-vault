// How a tag reads on screen. Tags are STORED exactly as written ("alexjones", "AlexJones",
// "schoolshooter"); this only decides how they are shown ("Alex Jones", "School Shooter").
// The stored tag never changes, and a search typed with spaces ("alex jones") still finds the
// stored form (queries.js). Run-together words are split with two lists:
//   server/words.txt.gz  the 60,000 most common English words and names, most common first
//                        (from the wordninja project, MIT)
//   server/names.txt.gz  about 9,000 first names (from random-name and NameDatabases, MIT)
// Three tries, in order: the tag is a word already (keep it) · it splits into known words that
// are all common ("School Shooter", "Alex Jones") · it starts with a first name and the rest is a
// surname the lists do not know ("Josh Provencio", "Lex Fridman"). Otherwise it stays as written,
// capitalized: a wrong split ("Thun Berg") reads worse than no split ("Thunberg").
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';

const codesCtx = {};
vm.runInNewContext(fs.readFileSync(new URL('../public/tag-codes.js', import.meta.url), 'utf8'), codesCtx);
export const TagCodes = codesCtx.TagCodes;

const lines = (file) => zlib.gunzipSync(fs.readFileSync(new URL(file, import.meta.url))).toString('utf8').split('\n').filter(Boolean);
const WORDS = new Map(); // word -> rank (0 = most common)
lines('./words.txt.gz').forEach((w, i) => WORDS.set(w, i));
const NAMES = new Set(lines('./names.txt.gz'));
for (const n of ['kanye', 'keir', 'lex', 'bam', 'elon', 'nicki', 'doja', 'adin', 'kai', 'hasan', 'ozzy', 'kodak', 'waka', 'wiz', 'cardi', 'skee', 'lil', 'myron', 'nahko', 'klaus', 'macaulay', 'hodge', 'jian', 'iilhan', 'ilhan', 'zach', 'zack', 'shanin']) NAMES.add(n);

// Spellings the lists cannot know. Only casing and spacing, never the letters themselves.
const FIXED = {
  usa: 'USA', uk: 'UK', tmz: 'TMZ', youtube: 'YouTube', tiktok: 'TikTok', gg33: 'GG33', nmc: 'NMC', chatgpt: 'ChatGPT',
  ishowspeed: 'IShowSpeed', juicewrld: 'Juice WRLD', cardib: 'Cardi B', mrbeast: 'MrBeast', xqc: 'xQc', h3h3: 'H3H3',
};
// Small words stay small inside a name: "Chud the Builder", "Morgan and Morgan".
const SMALL = new Set(['the', 'and', 'of', 'a', 'an', 'in', 'on', 'at', 'to', 'for']);
// Short pieces are where a wrong split comes from ("Jeff S", "Robb in", "Crow Der", "Thun Berg"), so:
// single letters never; two letters only as initials ("DJ Academics", "JD Vance"), as a joining
// word between two others ("Dakota of Earth"), or as a known ending ("Highest IQ"); three letters
// only as a real short name or word, or a common word (rank under 1,000); four letters only when
// fairly common (rank under 20,000) or a first name; longer pieces whenever the list knows them.
const TWO_ANY = new Set(['aj', 'tj', 'cj', 'jj', 'dj', 'jd', 'pj', 'rj', 'og', 'mr', 'dr', 'st', 'mc']);
const TWO_MID = new Set(['of', 'on', 'de', 'da', 'la', 'le', 'el']);
const TWO_END = new Set(['iq', 'tv', 'uk', 'us']);
const THREE = new Set(('tim kim joe sam ben bob dan don ron jon jim tom ray roy lex kai amy ann eve ian jay lee leo max ted ken rob wes meg sue pat kay jen deb bea zoe ali ava mia ada ivy kit mel abe art cal eli gus hal ira jed jeb joy lou mac moe ned nat rex sal sid sol stu tad van vic liz bam lil wiz cam lia zac jax rae mae kat dom ike pam val nik raj dee eva ana fay gil jan jem kel lew mat rod doc rev ' +
  'dad mom son kid bro sis god man men boy guy gal dog cat car war law fed red big old new').split(' '));
const ACRONYMS = new Set(['iq', 'dj', 'tv', 'nba', 'nfl', 'ufc', 'mma', 'cia', 'fbi', 'ceo', 'cnn', 'abc', 'nbc', 'cbs', 'bbc', 'mtv', 'wwe', 'nyc', 'uk', 'usa', 'gop', 'lgbt', 'jfk', 'mlk', 'ufo', 'espn', 'nasa', 'jd', 'aj', 'tj', 'cj', 'jj', 'pj', 'rj', 'og']);

const MAX_WORD = 20;
const rank = (w) => (WORDS.has(w) ? WORDS.get(w) : Infinity);
const isName = (w) => (w.length >= 4 ? NAMES.has(w) : THREE.has(w));
// A first name is always a cheap piece; otherwise the rarer the word, the dearer.
const cost = (w) => (isName(w) ? 8 : 2 * Math.log(rank(w) + 2));
const allowed = (w, first, last) => {
  if (w.length === 1) return false;
  if (w.length === 2) return TWO_ANY.has(w) || (TWO_MID.has(w) && !first && !last) || (TWO_END.has(w) && last);
  if (w.length === 3) return THREE.has(w) || rank(w) < 1000;
  if (w.length === 4) return isName(w) || rank(w) < 20000;
  return WORDS.has(w) || isName(w);
};

// Cheapest split of a run of lowercase letters into known words only, every piece a real one.
// Null when there is none.
function splitKnown(s) {
  const n = s.length, best = new Array(n + 1).fill(null);
  best[0] = { cost: 0, at: -1 };
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - MAX_WORD); j < i; j++) {
      const prev = best[j]; if (!prev) continue;
      const piece = s.slice(j, i);
      if (!allowed(piece, j === 0, i === n)) continue;
      const total = prev.cost + cost(piece) + (j ? 6 : 0);
      if (!best[i] || total < best[i].cost) best[i] = { cost: total, at: j };
    }
  }
  if (!best[n]) return null;
  const pieces = [];
  for (let i = n; i > 0; i = best[i].at) pieces.unshift(s.slice(best[i].at, i));
  return pieces;
}
const knownRest = (rest) => (rest.length >= 4 && allowed(rest, false, true) ? [rest] : rest.length >= 4 ? splitKnown(rest) : null);

// One lowercase run of letters -> its words. "alexjones" -> ["alex", "jones"]; unknown stays whole.
function splitRun(s) {
  if (s.length < 4 || WORDS.has(s) || isName(s)) return [s];
  const all = splitKnown(s);
  if (all) return all;
  // A first name, then the rest. The longest name whose rest is known wins ("eric" + "andre", not
  // "erica" + "ndre"). Failing that, a name and a surname the lists do not know ("joshprovencio"):
  // the most common such name wins ("mike" + "lindell", not "mikel" + "indell"), and a three-letter
  // name that merely starts a longer word is skipped ("wes" of "westboro").
  const unknownRest = [];
  for (let k = Math.min(s.length - 4, MAX_WORD); k >= 3; k--) {
    const name = s.slice(0, k), rest = s.slice(k);
    if (!isName(name)) continue;
    const more = knownRest(rest); if (more) return [name, ...more];
    let longer = false;
    if (k === 3) for (let m = 4; m <= Math.min(s.length - 1, MAX_WORD); m++) if (WORDS.has(s.slice(0, m)) || isName(s.slice(0, m))) longer = true;
    if (!longer) unknownRest.push([name, rest]);
  }
  // Among names with an unknown rest: the longest one the word list knows ("steven" + "crowder",
  // not "steve" + "ncrowder"); a name only the name list knows loses ("mike" + "lindell", not
  // "mikel" + "indell").
  if (unknownRest.length) return unknownRest.sort((a, b) => (WORDS.has(b[0]) - WORDS.has(a[0])) || b[0].length - a[0].length)[0];
  // A word the lists do not know, then known words ("chud" + "the builder", "westboro" + "baptist
  // church"). Not when that word is really a common word plus a letter or two ("whitefr" + "agility").
  for (let k = 4; k <= Math.min(10, s.length - 4); k++) {
    const head = s.slice(0, k);
    if (WORDS.has(head)) continue;
    let misSplit = false;
    for (let m = 4; m < k - 1; m++) if (k - m < 4 && rank(s.slice(0, m)) < 10000) misSplit = true;
    if (misSplit) continue;
    const more = knownRest(s.slice(k)); if (more) return [head, ...more];
  }
  // A common word, then one the lists do not know ("white" + "fragility", "predator" + "poachers").
  for (let k = Math.min(s.length - 4, 12); k >= 5; k--) if (rank(s.slice(0, k)) < 10000 && /^[^aeiouy]/.test(s.slice(k))) return [s.slice(0, k), s.slice(k)];
  return [s];
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const prettyCache = new Map();

export function displayName(name) {
  name = String(name);
  if (prettyCache.has(name)) return prettyCache.get(name);
  let out;
  if (TagCodes.parse(name)) out = TagCodes.pretty(name); // "19fn" -> "19/1 First name" (position and number tags)
  else if (FIXED[name.toLowerCase()]) out = FIXED[name.toLowerCase()];
  else {
    // Split where the writer already did: "AlexJones", "rachelM", "adam22", "rachel_m". A lone capital
    // before a capitalized word ("DJacademics") is a false split; that run is read as one lowercase word.
    let tokens = name.match(/\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\d+|[^\p{L}\d]+/gu) || [name];
    tokens = tokens.flatMap((t, i, arr) => (/^[A-Z]$/.test(t) && /^[A-Z][a-z]/.test(arr[i + 1] || '') ? [] : /^[A-Z][a-z]/.test(t) && /^[A-Z]$/.test(arr[i - 1] || '') ? [(arr[i - 1] + t).toLowerCase()] : [t]));
    // "McConaughey", "MacArthur", "DeNiro": a surname prefix stays glued to the capitalized word after it.
    tokens = tokens.flatMap((t, i, arr) => (/^(Mc|Mac|De|Di|La|Le|Van|Von|O')$/.test(t) && /^[A-Z][a-z]/.test(arr[i + 1] || '') ? [] : /^[A-Z][a-z]/.test(t) && /^(Mc|Mac|De|Di|La|Le|Van|Von|O')$/.test(arr[i - 1] || '') ? [arr[i - 1] + t] : [t]));
    const words = [];
    for (const tok of tokens) {
      if (/^[A-Z]?[a-z]+$/.test(tok)) words.push(...splitRun(tok.toLowerCase()).map((w, i) => (i === 0 && /^[A-Z]/.test(tok) ? cap(w) : w)));
      else words.push(tok);
    }
    out = '';
    let prev = null, first = true; // the previous word (null after a separator / at the start); first word of the whole tag
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (/^[^\p{L}\d]+$/u.test(w)) { out += w; prev = null; continue; }
      const digits = /^\d+$/.test(w);
      // A space between words; a number stays glued to a short or unknown handle ("penguinz0", "h3h3"),
      // and gets a space after a real word ("Adam 22", "Channel 5", "Test 123").
      if (prev !== null) {
        const prevDigits = /^\d+$/.test(prev);
        if (digits) out += (prev.length >= 3 && WORDS.has(prev.toLowerCase())) ? ' ' : '';
        else if (prevDigits) out += (words[i - 2] === undefined || out.endsWith(' ') || out.slice(-prev.length - 1, -prev.length) === ' ') ? ' ' : '';
        else out += ' ';
      }
      const lw = w.toLowerCase();
      out += ACRONYMS.has(lw) && !digits ? lw.toUpperCase() : (!first && SMALL.has(lw) && /^[a-z]+$/.test(w)) ? lw : (/^\p{Ll}/u.test(w) ? cap(w) : w);
      prev = w; first = false;
    }
  }
  prettyCache.set(name, out);
  return out;
}

// Every tag whose screen form differs from the stored one: { stored: shown }.
export function displayMap(names) {
  const out = {};
  for (const n of names) { const d = displayName(n); if (d !== n) out[n] = d; }
  return out;
}
