// Wikidata: the free database behind Wikipedia (owner 2026-11-24, asked for a better source than paid web searches;
// measured: 6,949 YouTubers, 3,923 with a birth date, free, in seconds). A research starts here; the paid web search only
// fills what this misses. Read-only public queries, no key, nothing about the owner is sent: only the category's
// database id. Every call is recorded for the snapshot (OUTSIDE CALLS: WIKIDATA).
//
// What a member brings: the name the public knows, the date of birth (day precision only; a year alone is no chart
// date), and the fullest birth name the database holds: its "birth name", else the given names in their order plus the
// family name, else the common name only. Which of the three it was is kept (`name_from`), never guessed.
const SPARQL = 'https://query.wikidata.org/sparql';
const API = 'https://www.wikidata.org/w/api.php';
const UA = 'chart-research/1.0 (numerology app; one query per research)';
const LIMIT = 5000;
const CALLS = [];
const note = (entry) => { CALLS.push({ at: new Date().toISOString(), ...entry }); if (CALLS.length > 20) CALLS.shift(); };
export const wikidataCalls = () => CALLS.slice().reverse();

async function get(url, what) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json, application/json' }, signal: AbortSignal.timeout(90_000) });
    const seconds = Math.round((Date.now() - t0) / 100) / 10;
    if (!res.ok) { note({ what, ok: false, status: res.status, seconds, error: (await res.text()).slice(0, 200) }); throw new Error(`The free database answered ${res.status}.`); }
    const body = await res.json();
    note({ what, ok: true, status: res.status, seconds });
    return body;
  } catch (err) {
    if (!/answered/.test(err.message)) note({ what, ok: false, status: null, seconds: Math.round((Date.now() - t0) / 100) / 10, error: String(err.message).slice(0, 200) });
    throw err;
  }
}

// A category word ("YouTuber", "mass shooting", "President of the United States") to the database's id, with its own
// label and description so the screen can say what was used.
export async function findItem(words) {
  const q = String(words || '').trim().slice(0, 80);
  if (!q) return null;
  const body = await get(`${API}?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=${encodeURIComponent(q)}`, `look up "${q}"`);
  const hit = body && body.search && body.search[0];
  return hit ? { id: hit.id, label: hit.label || q, description: hit.description || '' } : null;
}

// How a member is tied to the category (the plan's `link`):
//   occupation   ?p has occupation X              (YouTubers, rappers, coders)
//   position     ?p held position X              (presidents, popes, prime ministers)
//   perpetrator  ?p is perpetrator of an event of type X   (mass shootings)
//   member       ?p is a member of X             (a band, a party, a team)
//   award        ?p received award X
const LINKS = {
  occupation: (id) => `?p wdt:P106/wdt:P279* wd:${id} .`,
  position: (id) => `?p wdt:P39/wdt:P279* wd:${id} .`,
  perpetrator: (id) => `?e wdt:P31/wdt:P279* wd:${id} . ?e wdt:P8031 ?p .`,
  member: (id) => `?p wdt:P463 wd:${id} .`,
  award: (id) => `?p wdt:P166/wdt:P279* wd:${id} .`,
};
export const LINK_KINDS = Object.keys(LINKS);

// Everyone in the category with a birth date to the day. Returns { people, total, undated } or throws.
export async function membersOf(link, item) {
  if (!LINKS[link] || !/^Q\d+$/.test(item.id)) return { people: [], total: 0 };
  const query = `SELECT ?p ?pLabel ?pDescription ?birthName ?dob ?prec ?article (GROUP_CONCAT(DISTINCT ?gn; separator="|") AS ?given) (SAMPLE(?fnLabel) AS ?family) WHERE {
  ${LINKS[link](item.id)}
  ?p wdt:P31 wd:Q5 .
  OPTIONAL { ?p p:P569/psv:P569 [ wikibase:timeValue ?dob ; wikibase:timePrecision ?prec ] . }
  OPTIONAL { ?article schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> . }
  OPTIONAL { ?p wdt:P1477 ?birthName . FILTER(LANG(?birthName) IN ("en", "mul", "")) }
  OPTIONAL { ?p p:P735 ?gs . ?gs ps:P735 ?gnItem . ?gnItem rdfs:label ?gnLabel . FILTER(LANG(?gnLabel) = "en") OPTIONAL { ?gs pq:P1545 ?ord } BIND(CONCAT(COALESCE(?ord, "9"), "~", ?gnLabel) AS ?gn) }
  OPTIONAL { ?p wdt:P734 ?fnItem . ?fnItem rdfs:label ?fnLabel . FILTER(LANG(?fnLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?p ?pLabel ?pDescription ?birthName ?dob ?prec ?article LIMIT ${LIMIT * 2}`;
  const body = await get(`${SPARQL}?query=${encodeURIComponent(query)}`, `members: ${link} ${item.id} (${item.label})`);
  const rows = (body && body.results && body.results.bindings) || [];
  const byId = new Map();
  for (const b of rows) {
    const id = b.p.value.split('/').pop();
    const one = byId.get(id) || { id, label: b.pLabel ? b.pLabel.value : '', desc: b.pDescription ? b.pDescription.value : '', dates: new Set(), birth: '', given: '', family: '', article: '' };
    if (b.article && !one.article) one.article = decodeURIComponent(b.article.value.split('/wiki/').pop()).replace(/_/g, ' ');
    if (b.prec && Number(b.prec.value) >= 11 && b.dob) one.dates.add(b.dob.value.slice(0, 10));
    if (b.birthName && !one.birth) one.birth = b.birthName.value;
    if (b.given && b.given.value && !one.given) one.given = b.given.value;
    if (b.family && !one.family) one.family = b.family.value;
    byId.set(id, one);
  }
  const people = [];
  let undated = 0;
  for (const m of byId.values()) {
    if (/^Q\d+$/.test(m.label)) continue; // no English name at all
    const dates = [...m.dates].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !d.startsWith('-'));
    if (!dates.length && !m.article) { undated++; continue; } // no date and no article to find one in
    const given = m.given ? m.given.split('|').map((g) => g.split('~')).sort((a, b) => Number(a[0]) - Number(b[0])).map((g) => g[1]) : [];
    let name = '', from = '';
    if (m.birth) { name = m.birth; from = 'Birth name on Wikidata'; }
    else if (given.length && m.family) { name = [...given, m.family].join(' '); from = given.length > 1 ? 'Given and family names on Wikidata' : 'First and family name on Wikidata'; }
    else { name = m.label; from = 'Common name only (no birth name on Wikidata)'; }
    if (!dates.length) undated++;
    people.push({ qid: m.id, known_as: m.label, birth_name: name, name_from: from, birth_date: dates.sort()[0] || '', other_dates: dates.slice(1), who: m.desc, article: m.article });
    if (people.length >= LIMIT) break;
  }
  return { people, total: byId.size, undated };
}

// ---------- Wikipedia's first line: the full birth name and the birth date (free) ----------
// (owner 2026-11-24: "we absolutely need the middle name. It'll fuck up the whole chart ... if you don't have their full
// legal name"). An English article opens with the full name, and a changed name says "born ...":
//   "Elon Reeve Musk ( ; born June 28, 1971) is ..."   "Stefani Joanne Angelina Germanotta (born March 28, 1986), known
//   professionally as Lady Gaga"   "Caitlyn Marie Jenner (born William Bruce Jenner; October 28, 1949)".
// The birth name inside "born ...;" wins; else the lead name before the bracket. A lead that does not read as a name
// (a sentence, one word) is never taken.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = MONTHS.join('|');
const isName = (t) => { const w = t.split(/\s+/).filter(Boolean); return w.length >= 2 && w.length <= 8 && t.length <= 90 && w.every((x) => /^[\p{Lu}\p{Lt}][\p{L}'’.\-]*$/u.test(x) || /^(al|el|ad|ar|as|at|bin|ibn|d|o)[-'’][\p{Lu}][\p{L}'’\-]*$/u.test(x) || /^(de|da|van|von|der|den|la|le|del|di|bin|al|ibn|y|e|du|dos|das|ter|ten)$/i.test(x) || /^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/.test(x)); };
const clean = (t) => String(t || '').replace(/["“”][^"“”]*["“”]/g, ' ').replace(/\s+/g, ' ').replace(/[,;\s]+$/, '').trim();
export function readLead(extract) {
  const text = String(extract || '').replace(/\s+/g, ' ').trim();
  const open = text.indexOf(' (');
  const lead = clean(open > 0 ? text.slice(0, open) : '');
  let paren = '';
  if (open > 0) { let depth = 0; for (let i = open + 1; i < text.length; i++) { const c = text[i]; if (c === '(') depth++; if (c === ')') { depth--; if (!depth) { paren = text.slice(open + 2, i); break; } } } }
  const born = (/\bborn ([^;,()]+?)(?:[;,)]|$)/.exec(paren) || [])[1];
  const bornName = born && !new RegExp(`^(${MONTH_RE}|\\d)`).test(born.trim()) ? clean(born) : '';
  let date = '';
  const a = new RegExp(`(${MONTH_RE}) (\\d{1,2}), (\\d{4})`).exec(paren), b = new RegExp(`(\\d{1,2}) (${MONTH_RE}) (\\d{4})`).exec(paren);
  const first = a && (!b || a.index < b.index) ? [a[3], MONTHS.indexOf(a[1]) + 1, a[2]] : b ? [b[3], MONTHS.indexOf(b[2]) + 1, b[1]] : null;
  if (first) date = `${first[0]}-${String(first[1]).padStart(2, '0')}-${String(first[2]).padStart(2, '0')}`;
  const name = bornName && isName(bornName) ? bornName : isName(lead) ? lead : '';
  return { name, from: name ? (name === bornName ? 'Birth name on Wikipedia ("born ...")' : 'Full name on Wikipedia') : '', date };
}
// Many articles at once (20 a request, one request at a time): Map title -> { name, from, date }.
export async function readArticles(titles, { onProgress = () => {} } = {}) {
  const out = new Map();
  const list = [...new Set(titles.filter(Boolean))];
  for (let i = 0; i < list.length; i += 20) {
    const part = list.slice(i, i + 20);
    let body = null;
    try { body = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&exsentences=2&redirects=1&titles=${encodeURIComponent(part.join('|'))}`, `wikipedia first lines ${i + 1}-${i + part.length} of ${list.length}`); }
    catch { continue; }
    const back = new Map(); // a redirected or normalized title -> the asked one
    const section = new Set(); // a redirect to a SECTION of another page ("Dylan Klebold" -> "Eric Harris and Dylan Klebold"): not the person's own first line
    for (const n of [...((body.query && body.query.normalized) || []), ...((body.query && body.query.redirects) || [])]) { back.set(n.to, back.get(n.from) || n.from); if (n.tofragment) section.add(n.to); }
    for (const pg of Object.values((body.query && body.query.pages) || {})) {
      if (!pg.extract || section.has(pg.title)) continue;
      out.set(back.get(pg.title) || pg.title, readLead(pg.extract));
    }
    onProgress(Math.min(i + 20, list.length), list.length);
  }
  return out;
}

// Fill each person's FULL birth name (and a missing birth date) from their Wikipedia article's first line.
// people: [{ birth_name, birth_date, known_as, article?, name_from, other_dates? }], changed in place.
//  - an article from the database (`article`) is the person's own: a "born ..." name, or a lead name at least as long as
//    the one held that ends in the same family name, is taken; a missing date is taken.
//  - no article (found by the web search): the public name is tried as a title, and only taken when the article's
//    birth date is the SAME as the person's: a namesake never lends a name.
// Returns { asked, names, dates }.
const lastWord = (s) => String(s || '').trim().split(/\s+/).pop().toLowerCase();
export async function fillFromWikipedia(people, { onProgress } = {}) {
  const titleOf = (p) => p.article || (p.known_as && p.birth_date ? p.known_as : '');
  const need = people.filter((p) => titleOf(p) && !/^(Birth name|Full name) on Wikipedia/.test(p.name_from || '') && !p.fixed);
  const read = await readArticles(need.map(titleOf), { onProgress });
  let names = 0, dates = 0;
  for (const p of need) {
    const w = read.get(titleOf(p));
    if (!w) continue;
    const own = !!p.article;
    if (!own && (!w.date || w.date !== p.birth_date)) continue;
    if (w.name) {
      const have = String(p.birth_name || '').trim().split(/\s+/).filter(Boolean).length;
      const born = /^Birth name/.test(w.from);
      const fits = born || /^Common name only/.test(p.name_from || '') || !p.birth_name || lastWord(w.name) === lastWord(p.birth_name) || lastWord(w.name) === lastWord(p.known_as);
      if (fits && (born || w.name.split(/\s+/).length >= have) && w.name !== p.birth_name) { p.birth_name = w.name; names++; }
      if (fits) { p.name_from = w.from; p.wiki = titleOf(p); }
    }
    if (own && w.date) {
      if (!p.birth_date) { p.birth_date = w.date; p.date_from = 'Wikipedia'; dates++; }
      else if (w.date !== p.birth_date) p.other_dates = [...new Set([...(p.other_dates || []), w.date])];
    }
  }
  return { asked: need.length, names, dates };
}
