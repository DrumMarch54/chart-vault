// "Look Up Someone" (owner's ask 2026-11-01): the owner says a name ("Fifty Cent") or describes someone
// ("the rapper who got shot nine times"); Claude Haiku 5.5 searches the web for the person's birth name and
// birth date and hands back up to three people. The screen draws each one's chart with a Save to Vault
// button: nothing is saved until the owner taps it. Free first: a name already in the vault is shown
// without spending. Every call goes through server/ai.js (the one paid door): the cap, the spend and the
// record. A source is only shown when it came back from the search itself (never a made-up link).
import { callModel, AiError, estimate, WEB_SEARCH_USD } from './ai.js';
import { listImages } from './queries.js';

const MAX_QUERY = 200;
const MAX_CALLS = 4; // a pause_turn resume is a call too
const MAX_SEARCHES = 4;

const SYSTEM = `You find famous or public people for a numerology app. The owner says a name, a nickname, a stage name, or only describes someone ("the rapper who got shot nine times"). The words may come from voice-to-text, so a name can be misheard ("fifty cent" = 50 Cent).
Search the web, then call give_answer exactly once.
For each person: the name they are known by, their FULL BIRTH NAME (every first, middle and last name given at birth, spelled as the sources spell it; not a later married or legal change name; keep a suffix like Jr. or III only if sources include it in the birth name), and their birth date. Prefer reliable sources (encyclopedias, official biographies, major news). If sources disagree on the date or the name, give the most supported one and say so in note.
Give one person when the words clearly mean one. Give up to three when the description fits several, best match first. If nobody fits, give an empty list and say why in note.
Never guess a birth name or date that no source gives; leave it empty instead.
Anyone in the news counts, including people known for a crime or a tragedy: the app only draws a chart from a name and a date.
Every person you name goes in people, never only in note. An empty list means nobody fits at all.
Write in plain American English, short.`;

const ANSWER_TOOL = {
  name: 'give_answer',
  description: 'The people found, best match first (at most three, each with at most four sources). Call exactly once, after searching.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['people', 'note'],
    properties: {
      note: { type: 'string', description: 'One short sentence for the owner: doubts, disagreements between sources, or why nobody was found. Empty if nothing to say.' },
      people: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['known_as', 'birth_name', 'birth_date', 'who', 'sure', 'note', 'sources'],
        properties: {
          known_as: { type: 'string', description: 'The name the public knows, like "50 Cent".' },
          birth_name: { type: 'string', description: 'Full birth name, every given name, like "Curtis James Jackson III". Empty if no source gives it.' },
          birth_date: { type: 'string', description: 'YYYY-MM-DD. Empty if no source gives the full date.' },
          who: { type: 'string', description: 'A few words: what they are known for, like "American rapper from Queens".' },
          sure: { type: 'boolean', description: 'true when the sources agree on both the birth name and the date.' },
          note: { type: 'string', description: 'What disagrees or is uncertain for this person. Empty if nothing.' },
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
    const person = {
      known_as: clean(p.known_as, 120), birth_name: clean(p.birth_name, 160), birth_date: validDate(p.birth_date),
      who: clean(p.who, 160), sure: !!p.sure, note: clean(p.note, 300),
      sources: (Array.isArray(p.sources) ? p.sources : []).filter((u) => found.has(u)).slice(0, 4).map((url) => ({ url, site: hostOf(url), title: found.get(url) })),
    };
    if (!person.sources.length) person.sure = false; // nothing the search returned backs it up
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
  for (const e of RECENT.slice().reverse()) lines.push(`  ${e.at} "${e.query}" → ${e.error ? `FAILED ${e.error}` : `${e.people.map((p) => `${p.known_as || '?'} = ${p.birth_name || '(no birth name)'} ${p.birth_date || '(no date)'}${p.sure ? '' : ' UNSURE'}`).join('; ') || 'nobody'}${e.note ? ` · note: ${e.note}` : ''} · ${e.searches} searches · $${e.usd}`}`);
  if (!RECENT.length) lines.push('  none');
  return lines;
}
export const LOOKUP_TOOLS = [ANSWER_TOOL];
