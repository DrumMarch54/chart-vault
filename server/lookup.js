// "Look Up Someone" (owner's ask 2026-11-01): the owner says a name ("Fifty Cent") or describes someone
// ("the rapper who got shot nine times"); Claude Haiku 5.5 searches the web for the person's birth name and
// birth date and hands back up to three people. Businesses and organizations too (owner 2026-11-14): the
// registered name and the date of incorporation (the course, Module 12), every other name and date the
// sources give laid out for the owner to pick. The screen draws each one's chart with a Save to Vault
// button: nothing is saved until the owner taps it. Free first: a name already in the vault is shown
// without spending. Every call goes through server/ai.js (the one paid door): the cap, the spend and the
// record. A source is only shown when it came back from the search itself (never a made-up link).
import { callModel, AiError, estimate, WEB_SEARCH_USD } from './ai.js';
import { listImages } from './queries.js';

const MAX_QUERY = 200;
const MAX_CALLS = 4; // a pause_turn resume is a call too
const MAX_SEARCHES = 4;

const SYSTEM = `You find famous or public people, businesses and organizations for a numerology app. The owner says a name, a nickname, a stage name, a company or brand, or only describes someone or something ("the rapper who got shot nine times"). The words may come from voice-to-text, so a name can be misheard ("fifty cent" = 50 Cent).
Search the web, then call give_answer exactly once.
Decide what is meant: a person (kind "person") or a business, company, brand, charity, club, band, team or other organization (kind "business").
For a person: the name they are known by, their FULL BIRTH NAME (every first, middle and last name given at birth, spelled as the sources spell it; not a later married or legal change name; keep a suffix like Jr. or III only if sources include it in the birth name), and their birth date.
For a business or organization: the name the public knows (the brand), its REGISTERED NAME exactly as the official business register writes it, legal ending included ("Apple Inc.", "Beiersdorf AG"), and its DATE OF INCORPORATION or registration as the register gives it (that is its birth date). Look for the official register first (a US Secretary of State registry, Companies House, OpenCorporates, a national company register, SEC filings), then the company's own site and encyclopedias. An organization that was never registered: its founding date.
Full transparency (owner 2026-11-14): the owner picks, so never hide a doubt. For a business always give BOTH dates when the sources have them: the founding date and the date of incorporation or registration, each saying what it is. Say where the registered name and date are recorded (register, state or country) in register, and what the main date is in date_what. A founding date known only to the year or month still goes in other_dates as YYYY or YYYY-MM.
Lay out every real alternative, because the owner picks the right one: in other_names, the brand name if it differs, earlier registered names (say the years), and the parent or another entity of the same name; in other_dates, the founding date when it differs from the incorporation date, a re-incorporation, a date under an earlier name, or a date another source gives, each saying what it is. For a person: other spellings of the birth name and other birth dates the sources give. Nothing goes in them that no source says.
Prefer reliable sources (official registers, encyclopedias, official biographies, major news). If sources disagree, give the most supported one as the main answer, the rest in other_names or other_dates, and say so in note.
Give one result when the words clearly mean one. Give up to three when the words fit several, best match first. If nothing fits, give an empty list and say why in note.
Never guess a name or date that no source gives; leave it empty instead.
Anyone in the news counts, including people known for a crime or a tragedy: the app only draws a chart from a name and a date.
Every person or business you name goes in people, never only in note. An empty list means nothing fits at all.
Write in plain American English, short.`;

const ANSWER_TOOL = {
  name: 'give_answer',
  description: 'The people or businesses found, best match first (at most three, each with at most four sources). Call exactly once, after searching.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['people', 'note'],
    properties: {
      note: { type: 'string', description: 'One short sentence for the owner: doubts, disagreements between sources, or why nobody was found. Empty if nothing to say.' },
      people: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['kind', 'known_as', 'birth_name', 'birth_date', 'date_what', 'register', 'other_names', 'other_dates', 'who', 'sure', 'note', 'sources'],
        properties: {
          kind: { type: 'string', enum: ['person', 'business'], description: 'person, or business for any business, company, brand or organization.' },
          known_as: { type: 'string', description: 'The name the public knows, like "50 Cent" or "Nivea".' },
          birth_name: { type: 'string', description: 'A person: full birth name, every given name, like "Curtis James Jackson III". A business: the registered name exactly as the register writes it, legal ending included, like "Apple Inc.". Empty if no source gives it.' },
          birth_date: { type: 'string', description: 'YYYY-MM-DD. A person: the birth date. A business: the date of incorporation or registration. Empty if no source gives the full date.' },
          date_what: { type: 'string', description: 'A few words: what birth_date is, like "Incorporated in California" or "Born". Empty if no date.' },
          register: { type: 'string', description: 'A business: where the registered name and date are recorded, like "California Secretary of State" or "Companies House (UK)". Empty if not found or a person.' },
          other_names: { type: 'array', description: 'Other names the owner may mean (brand name, earlier registered names, other spellings). Empty if none.', items: {
            type: 'object', additionalProperties: false, required: ['name', 'what'],
            properties: { name: { type: 'string' }, what: { type: 'string', description: 'A few words: what this name is, like "Brand name" or "Registered name 1977-2007".' } } } },
          other_dates: { type: 'array', description: 'Other dates the owner may mean (founding date, earlier incorporation, a date another source gives). Empty if none.', items: {
            type: 'object', additionalProperties: false, required: ['date', 'what'],
            properties: { date: { type: 'string', description: 'YYYY-MM-DD, or YYYY-MM or YYYY when only that much is known' }, what: { type: 'string', description: 'A few words: what this date is, like "Founded as a partnership".' } } } },
          who: { type: 'string', description: 'A few words: what they are known for, like "American rapper from Queens" or "American maker of phones and computers".' },
          sure: { type: 'boolean', description: 'true when the sources agree on both the name and the date and there is no other name or date to choose from.' },
          note: { type: 'string', description: 'What disagrees or is uncertain for this result. Empty if nothing.' },
          sources: { type: 'array', items: { type: 'string' }, description: 'The URLs from the search results that give the name or the date.' },
        },
      } },
    },
  },
};

const clean = (s, n = 200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const validDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return '';
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1000 ? m[0] : '';
};
// The course (Module 12, "Business creation"): the legal ending (LLC, Inc., Corp., ...) is not counted.
// Only clear legal endings come off; "Company" and "Co." stay (they can be part of the name), the box is editable.
const LEGAL_END = /[\s,]+(inc\.?|incorporated|l\.?l\.?c\.?|corp\.?|corporation|ltd\.?|limited|l\.?l\.?p\.?|l\.?p\.?|plc|p\.?b\.?c\.?|gmbh|ag|a\/s|aps|ab|asa|oy|s\.?a\.?s?\.?|s\.?p\.?a\.?|s\.?r\.?l\.?|n\.?v\.?|b\.?v\.?|pty\.?|k\.?k\.?)$/i;
export function chartName(name, kind) {
  let n = clean(name, 160);
  if (kind !== 'business') return n;
  for (let i = 0; i < 3; i++) { const m = n.replace(LEGAL_END, '').replace(/[\s,]+$/, ''); if (m === n || !m) break; n = m; }
  return n;
}
const letters = (s) => (String(s).match(/\p{L}/gu) || []).length;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// Every URL the web search itself returned, with its page title: the only sources a card may show.
function searchResults(content, into) {
  for (const b of content || []) {
    if (b.type !== 'web_search_tool_result' || !Array.isArray(b.content)) continue;
    for (const r of b.content) if (r && r.type === 'web_search_result' && r.url && !into.has(r.url)) into.set(r.url, clean(r.title, 120));
  }
}
function searchErrors(content) {
  return (content || []).filter((b) => b.type === 'web_search_tool_result' && b.content && !Array.isArray(b.content)).map((b) => b.content.error_code || 'error');
}

// Charts already in the vault for this person: born the same day (any name), or the same name (word-start).
function inVault(db, person) {
  const ids = new Set();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(person.birth_date);
  if (m) for (const r of db.prepare('SELECT image_id FROM chart_inputs WHERE day = ? AND month = ? AND year = ? LIMIT 20').all(+m[3], +m[2], +m[1])) ids.add(r.image_id);
  for (const n of [person.known_as, person.birth_name]) if (n && n.length >= 3) for (const r of listImages(db, { name: n, limit: 10 }).items) ids.add(r.id);
  return ids.size ? listImages(db, { ids: [...ids].slice(0, 20), limit: 20 }).items : [];
}

// The vault first, for free: charts whose name starts with the words said.
export function vaultMatches(db, query) {
  const q = clean(query, MAX_QUERY);
  if (q.length < 3) return [];
  return listImages(db, { name: q, limit: 12 }).items;
}

export async function lookupPerson(db, query) {
  const q = clean(query, MAX_QUERY);
  if (!q) throw new AiError('Say or type a name first.');
  const messages = [{ role: 'user', content: q }];
  const found = new Map();
  let usd = 0, seconds = 0, calls = 0, searches = 0, answer = null, nudged = false;
  const errors = [];
  const est = estimate('lookup', { inputChars: 60000, outputTokens: 1500 }) + MAX_SEARCHES * WEB_SEARCH_USD;
  while (calls < MAX_CALLS && !answer) {
    calls++;
    const r = await callModel('lookup', {
      max_tokens: 4000, output_config: { effort: 'low' }, system: SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }, ANSWER_TOOL],
      messages,
    }, { estimateUsd: calls === 1 ? est : 0, what: `lookup "${q.slice(0, 40)}" call ${calls}` });
    usd += r.usd; seconds += r.seconds;
    const msg = r.message;
    searches += (msg.usage && msg.usage.server_tool_use && msg.usage.server_tool_use.web_search_requests) || 0;
    searchResults(msg.content, found);
    errors.push(...searchErrors(msg.content));
    if (msg.stop_reason === 'refusal') throw new AiError('The AI declined this search.');
    const use = (msg.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_answer');
    if (use) {
      answer = use.input || {};
      // The person named in the note but the list left empty (2026-11-09, "James Holmes shooter"): ask once more.
      const empty = !Array.isArray(answer.people) || !answer.people.length;
      if (empty && /\b(1[0-9]|20)\d\d\b/.test(String(answer.note || '')) && !nudged && calls < MAX_CALLS) {
        nudged = true; answer = null;
        messages.push({ role: 'assistant', content: msg.content });
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: use.id, content: 'Your note names a person but people is empty. Call give_answer again with that person in people.', is_error: true }] });
        continue;
      }
      break;
    }
    messages.push({ role: 'assistant', content: msg.content });
    if (msg.stop_reason === 'pause_turn') continue; // the server resumes its own search turn
    // It answered in words instead of the tool: ask once for the tool, then give up.
    if (nudged) break;
    nudged = true;
    messages.push({ role: 'user', content: 'Now call give_answer with what you found.' });
  }
  if (!answer) throw new AiError(errors.length ? `The web search failed (${[...new Set(errors)].join(', ')}). Try again in a minute.` : 'No answer came back. Try saying it another way.');
  const people = (Array.isArray(answer.people) ? answer.people : []).slice(0, 3).map((p) => {
    const kind = p.kind === 'business' ? 'business' : 'person';
    const person = {
      kind, known_as: clean(p.known_as, 120), birth_name: clean(p.birth_name, 160), birth_date: validDate(p.birth_date),
      who: clean(p.who, 160), sure: !!p.sure, note: clean(p.note, 300), register: kind === 'business' ? clean(p.register, 120) : '',
      sources: (Array.isArray(p.sources) ? p.sources : []).filter((u) => found.has(u)).slice(0, 4).map((url) => ({ url, site: hostOf(url), title: found.get(url) })),
    };
    // Every name and date to choose from, the main answer first (owner 2026-11-14: "lay everything out and I
    // will click what's correct"). `chart` is what the chart is drawn from: a business without its legal ending.
    // A business name with a legal ending is offered both ways (owner 2026-11-14: "tell me, and let me see it
    // with and without it"): without first (the course leaves it out), then with. `ending` names what comes off.
    const names = [], dates = [];
    const same = (x, y) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === y.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); // "Apple, Inc" = "Apple Inc."
    const pushName = (o) => { if (o.chart && !names.some((x) => same(x.chart, o.chart))) names.push({ ...o, long: kind === 'business' && letters(o.chart) > 34 }); };
    const addName = (name, what) => {
      const n = clean(name, 160), c = chartName(n, kind), w = clean(what, 80);
      if (c === n) return pushName({ name: n, chart: n, what: w, ending: '' });
      const ending = n.slice(c.length).replace(/^[\s,]+/, '');
      pushName({ name: n, chart: c, what: w, ending, with: false });
      pushName({ name: n, chart: n, what: w, ending, with: true });
    };
    // A date known only to the year or month is shown too (it cannot be drawn): `partial`.
    const addDate = (date, what) => {
      const raw = clean(date, 10), d = validDate(raw), part = !d && /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(raw) ? raw : '';
      const key = d || part;
      if (key && !dates.some((x) => x.date === key)) dates.push({ date: key, what: clean(what, 80), ...(part ? { partial: true } : {}) });
    };
    addName(person.birth_name, kind === 'business' ? 'Registered name' : 'Birth name');
    for (const o of Array.isArray(p.other_names) ? p.other_names.slice(0, 5) : []) addName(o && o.name, o && o.what);
    addDate(person.birth_date, clean(p.date_what, 80) || (kind === 'business' ? 'Registered (incorporated)' : 'Birth date'));
    for (const o of Array.isArray(p.other_dates) ? p.other_dates.slice(0, 5) : []) addDate(o && o.date, o && o.what);
    person.names = names; person.dates = dates;
    const drawable = dates.filter((d) => !d.partial).length, realNames = names.filter((n) => !n.with).length;
    if (!person.sources.length || realNames > 1 || drawable > 1 || dates.length > drawable) person.sure = false; // more than one to choose from = check it
    person.vault = inVault(db, person).map((i) => ({ id: i.id, title: i.title || i.filename, has_file: !!i.has_file }));
    return person;
  }).filter((p) => p.known_as || p.birth_name);
  return { query: q, people, note: clean(answer.note, 300), usd: Math.round(usd * 10000) / 10000, seconds, calls, searches };
}

// The last lookups this process ran, for the snapshot: what was said, who came back, the cost.
const RECENT = [];
export function rememberLookup(entry) { RECENT.push({ at: new Date().toISOString(), ...entry }); if (RECENT.length > 20) RECENT.shift(); }
export function lookupReport() {
  const lines = [`LOOK UP SOMEONE: last ${RECENT.length} this process`];
  for (const e of RECENT.slice().reverse()) lines.push(`  ${e.at} "${e.query}" → ${e.error ? `FAILED ${e.error}` : `${e.people.map((p) => `${p.kind === 'business' ? '[business] ' : ''}${p.known_as || '?'} = ${p.birth_name || '(no birth name)'} ${p.birth_date || '(no date)'}${p.sure ? '' : ' UNSURE'}${p.register ? ` · register: ${p.register}` : ''}${(p.names || []).length > 1 ? ` · names: ${p.names.map((n) => `${n.chart} (${n.what}${n.ending ? `, ${n.with ? 'with' : 'without'} ${n.ending}` : ''})`).join(', ')}` : ''}${(p.dates || []).length > 1 ? ` · dates: ${p.dates.map((d) => `${d.date} (${d.what}${d.partial ? ', not a full date' : ''})`).join(', ')}` : ''}`).join('; ') || 'nobody'}${e.note ? ` · note: ${e.note}` : ''} · ${e.searches} searches · $${e.usd}`}`);
  if (!RECENT.length) lines.push('  none');
  return lines;
}
export const LOOKUP_TOOLS = [ANSWER_TOOL];
