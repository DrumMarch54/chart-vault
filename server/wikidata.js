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
  const query = `SELECT ?p ?pLabel ?pDescription ?birthName ?dob ?prec (GROUP_CONCAT(DISTINCT ?gn; separator="|") AS ?given) (SAMPLE(?fnLabel) AS ?family) WHERE {
  ${LINKS[link](item.id)}
  ?p wdt:P31 wd:Q5 .
  ?p p:P569/psv:P569 [ wikibase:timeValue ?dob ; wikibase:timePrecision ?prec ] .
  OPTIONAL { ?p wdt:P1477 ?birthName . FILTER(LANG(?birthName) IN ("en", "mul", "")) }
  OPTIONAL { ?p p:P735 ?gs . ?gs ps:P735 ?gnItem . ?gnItem rdfs:label ?gnLabel . FILTER(LANG(?gnLabel) = "en") OPTIONAL { ?gs pq:P1545 ?ord } BIND(CONCAT(COALESCE(?ord, "9"), "~", ?gnLabel) AS ?gn) }
  OPTIONAL { ?p wdt:P734 ?fnItem . ?fnItem rdfs:label ?fnLabel . FILTER(LANG(?fnLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?p ?pLabel ?pDescription ?birthName ?dob ?prec LIMIT ${LIMIT * 2}`;
  const body = await get(`${SPARQL}?query=${encodeURIComponent(query)}`, `members: ${link} ${item.id} (${item.label})`);
  const rows = (body && body.results && body.results.bindings) || [];
  const byId = new Map();
  for (const b of rows) {
    const id = b.p.value.split('/').pop();
    const one = byId.get(id) || { id, label: b.pLabel ? b.pLabel.value : '', desc: b.pDescription ? b.pDescription.value : '', dates: new Set(), birth: '', given: '', family: '' };
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
    if (!dates.length) { undated++; continue; }
    const given = m.given ? m.given.split('|').map((g) => g.split('~')).sort((a, b) => Number(a[0]) - Number(b[0])).map((g) => g[1]) : [];
    let name = '', from = '';
    if (m.birth) { name = m.birth; from = 'Birth name on Wikidata'; }
    else if (given.length && m.family) { name = [...given, m.family].join(' '); from = given.length > 1 ? 'Given and family names on Wikidata' : 'First and family name on Wikidata'; }
    else { name = m.label; from = 'Common name only (no birth name on Wikidata)'; }
    people.push({ qid: m.id, known_as: m.label, birth_name: name, name_from: from, birth_date: dates.sort()[0], other_dates: dates.slice(1), who: m.desc });
    if (people.length >= LIMIT) break;
  }
  return { people, total: byId.size, undated };
}
