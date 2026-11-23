// Research a Group (owner's ask 2026-11-23): the owner says a category ("computer coders", "trans people", "coffee
// chains"); Claude Haiku 5.5 searches the web for 10, 20 or 30 well-known examples with the name and date a chart
// needs; the vault's own people of the same kind join in, free; the app counts what the group shares against the
// rest of the vault (server/group.js, the same count as What This Group Shares); Claude Opus 5.5 writes a short
// summary from those finds and the course's words only. Every research is kept (Past Research) and opens again free.
//
// - Nothing is saved to the vault here: the screen draws each chart and the owner taps Save to Vault.
// - People found online are only ever IN the group, never among "the others": strangers never shift the yardstick.
// - Public figures and publicly known businesses only. A PERSONAL category (gender identity, sexual orientation,
//   health, religion ...) lists only people who said it about themselves in public, and only with a page the search
//   returned for it; anyone without such a page is dropped and counted in `dropped`.
// - A date the search itself did not return a page for is kept but marked `checked: false` ("not checked online").
// - A changed name (owner 2026-11-23): the chart and every count use the BIRTH name; `name_now` is the name used
//   today, drawn as a second chart one tap away.
// - Every paid call goes through server/ai.js (the one door); never called by a test or a tool.
import crypto from 'node:crypto';
import { callModel, AiError, estimate, textOf, WEB_SEARCH_USD } from './ai.js';
import { chartName } from './lookup.js';
import { sharesOf } from './group.js';
import { FIELDS, FLAGS, parseWho, whoSql } from './people.js';
import { meaningFor } from './meaning.js';
import { chunksFor } from './knowledge.js';

export const SIZES = [10, 20, 30];
const SEARCHES = { 10: 6, 20: 10, 30: 14 };
// Before any real search has been measured: a guess from Look Up's own cost (3 to 10 cents for up to 8 searches).
const GUESS_USD = { 10: 0.1, 20: 0.15, 30: 0.25 };
const SUMMARY_GUESS_USD = 0.04;
const MAX_QUERY = 200;
const MAX_CALLS = 6; // a pause_turn resume is a call too
const MAX_CONTEXT = 30_000;

// Words that make a category personal whatever the model says about it (a second lock on the same door).
const PERSONAL = /\b(trans|transgender|transsexual|non-?binary|gay|lesbian|bisexual|queer|lgbt\w*|homosexual|intersex|autis\w+|asperger\w*|bipolar|schizo\w+|depress\w+|adhd|dyslex\w+|cancer|hiv|aids|disab\w+|deaf|blind|mental\w*|illness\w*|disease\w*|diagnos\w+|disorder\w*|addict\w+|alcoholic\w*|infertil\w+|abortion\w*)\b/i;

const KINDS_LIST = [...Object.entries(FIELDS).map(([k, v]) => `field:${k} = ${v}`), ...Object.entries(FLAGS).map(([k, v]) => `flag:${k} = ${v}`)].join('; ');

const systemFor = (n) => `You build a research group for a numerology app. The owner names a category of people or of businesses ("computer coders", "coffee chains", "lottery winners"). The words may come from voice-to-text, so a word can be misheard. Find ${n} well-known, clearly fitting examples, each with the name and the date a chart is drawn from. Search the web, then call give_group exactly once.
What the category holds: people (kind "person") or businesses, companies, brands, bands, teams and other organizations (kind "business"). Never a fictional character.
Who to pick: the examples a knowledgeable person would name first, undisputed members of the category, and varied (not all from one country, decade, company or team unless the category says so). Only public figures and publicly known businesses. Never a private person. Anyone in the news counts, including people known for a crime.
Personal categories: when the category is about gender identity, sexual orientation, health or a diagnosis, disability, religion or belief, immigration status, or having been the victim of a crime, set personal to true and list ONLY people who have said it about themselves in public (their own statement, an interview, a memoir, their official bio). member_source must then be a page from the search results that says so. Never someone who was outed, is rumored or speculated about, or is described that way only by other people. Fewer than ${n} is fine.
For a person: known_as (the name the public knows), birth_name (the FULL BIRTH NAME: every first, middle and last name given at birth, spelled as the sources spell it), birth_date. name_now: the full name the person uses today when they changed their name after birth (a transition, a legal change, a religious name, a marriage); empty when they still use the birth name; a stage name or nickname is known_as, never name_now.
For a business: known_as (the brand), birth_name (the REGISTERED NAME as the official register writes it, legal ending included, like "Apple Inc."), birth_date (the DATE OF INCORPORATION or registration; a body that was never registered: its founding date). name_now is empty.
How to search: you have at most ${SEARCHES[n]} searches. Start with lists of the category, then spend the rest on the birth names and dates you are least sure of. A name or date you know well but did not see in a search result is allowed: leave its source empty (it is shown as not checked online) and set sure to false. Never guess: a name or date you do not know stays empty. Never blend two people.
Sources: member_source, name_source and date_source are URLs taken from the search results, or empty.
why: a few words on why they belong ("Created Linux", "Came out as transgender in 2020").
vault_kinds: the owner's vault already sorts its charts into these kinds: ${KINDS_LIST}. List the kinds that mean the SAME as the category (computer coders = field:tech). Only a kind that is the same group; otherwise an empty list. Never one for a personal category.
category: the category as a short title in Title Case ("Computer Coders").
Write in plain American English, short.`;

const GROUP_TOOL = {
  name: 'give_group',
  description: 'The group found: the examples of the category, the best known first. Call exactly once, after searching.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['category', 'personal', 'note', 'vault_kinds', 'people'],
    properties: {
      category: { type: 'string', description: 'The category as a short title in Title Case, like "Computer Coders".' },
      personal: { type: 'boolean', description: 'true when the category is about gender identity, sexual orientation, health, disability, religion, immigration status or being a victim.' },
      note: { type: 'string', description: 'One short sentence for the owner: a doubt about what was meant, or why fewer were found. Empty if nothing to say.' },
      vault_kinds: { type: 'array', items: { type: 'string' }, description: 'Kinds from the list that mean the same as the category, like "field:tech". Empty if none.' },
      people: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['kind', 'known_as', 'birth_name', 'name_now', 'birth_date', 'who', 'why', 'member_source', 'name_source', 'date_source', 'sure'],
        properties: {
          kind: { type: 'string', enum: ['person', 'business'] },
          known_as: { type: 'string', description: 'The name the public knows.' },
          birth_name: { type: 'string', description: 'A person: the full birth name. A business: the registered name, legal ending included. Empty if not known.' },
          name_now: { type: 'string', description: 'A person who changed their name after birth: the full name they use today. Empty otherwise.' },
          birth_date: { type: 'string', description: 'YYYY-MM-DD. A person: the birth date. A business: the date of incorporation. Empty if the full date is not known.' },
          who: { type: 'string', description: 'A few words: what they are known for.' },
          why: { type: 'string', description: 'A few words: why they belong to the category.' },
          member_source: { type: 'string', description: 'The URL (from the search results) showing they belong to the category. Empty if none.' },
          name_source: { type: 'string', description: 'The URL (from the search results) that gives the birth or registered name. Empty if none.' },
          date_source: { type: 'string', description: 'The URL (from the search results) that gives the date. Empty if none.' },
          sure: { type: 'boolean', description: 'true when a search result confirms both the name and the date.' },
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
const round = (n) => Math.round((n || 0) * 10000) / 10000;
const sameName = (a, b) => clean(a).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === clean(b).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

function searchResults(content, into) {
  for (const b of content || []) {
    if (b.type !== 'web_search_tool_result' || !Array.isArray(b.content)) continue;
    for (const r of b.content) if (r && r.type === 'web_search_result' && r.url && !into.has(r.url)) into.set(r.url, clean(r.title, 120));
  }
}
const searchErrors = (content) => (content || []).filter((b) => b.type === 'web_search_tool_result' && b.content && !Array.isArray(b.content)).map((b) => b.content.error_code || 'error');

// Searches running right now: a deploy waits for them (app.js isBusy), so a paid search is never thrown away.
let running = 0;
export const researchRunning = () => running;

// What a search of each size costs: the average of the real ones once there are any, a guess before that.
export function researchCosts(db) {
  const rows = db.prepare('SELECT size, avg(usd) usd, count(*) n FROM research WHERE usd > 0 GROUP BY size').all();
  const by = new Map(rows.map((r) => [r.size, r]));
  return SIZES.map((size) => { const r = by.get(size); return { size, usd: round(r ? r.usd : GUESS_USD[size]), measured: !!r, searches: r ? r.n : 0 }; });
}

// The paid step: the web search. Returns the group as stored (people, note, kinds, cost); patterns are counted later.
export async function findGroup(query, size) {
  const q = clean(query, MAX_QUERY);
  if (!q) throw new AiError('Say or type a category first.');
  const n = SIZES.includes(Number(size)) ? Number(size) : 20;
  const messages = [{ role: 'user', content: `The category: ${q}\nHow many to find: ${n}` }];
  const found = new Map();
  let usd = 0, seconds = 0, calls = 0, searches = 0, answer = null, nudged = false;
  const errors = [];
  const est = estimate('lookup', { inputChars: 120000 + n * 6000, outputTokens: 400 + n * 160 }) + SEARCHES[n] * WEB_SEARCH_USD;
  running++;
  try {
    while (calls < MAX_CALLS && !answer) {
      calls++;
      const r = await callModel('lookup', {
        max_tokens: 2000 + n * 300, output_config: { effort: 'medium' }, system: systemFor(n),
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: SEARCHES[n] }, GROUP_TOOL],
        messages,
      }, { estimateUsd: calls === 1 ? est : 0, what: `research "${q.slice(0, 40)}" (${n}) call ${calls}` });
      usd += r.usd; seconds += r.seconds;
      const msg = r.message;
      searches += (msg.usage && msg.usage.server_tool_use && msg.usage.server_tool_use.web_search_requests) || 0;
      searchResults(msg.content, found);
      errors.push(...searchErrors(msg.content));
      if (msg.stop_reason === 'refusal') throw new AiError('The AI declined this search.');
      const use = (msg.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_group');
      if (use) { answer = use.input || {}; break; }
      messages.push({ role: 'assistant', content: msg.content });
      if (msg.stop_reason === 'pause_turn') continue; // the server resumes its own search turn
      if (nudged) break;
      nudged = true;
      messages.push({ role: 'user', content: 'Now call give_group with what you found.' });
    }
  } finally { running--; }
  if (!answer) throw new AiError(errors.length ? `The web search failed (${[...new Set(errors)].join(', ')}). Try again in a minute.` : 'No answer came back. Try saying it another way.');

  const personal = !!answer.personal || PERSONAL.test(q);
  const src = (u) => (u && found.has(u) ? { url: u, site: hostOf(u), title: found.get(u) } : null); // only a page the search returned
  let dropped = 0;
  const seen = [];
  const people = [];
  for (const p of Array.isArray(answer.people) ? answer.people : []) {
    if (people.length >= n) break;
    const kind = p.kind === 'business' ? 'business' : 'person';
    const known = clean(p.known_as, 120), birth = clean(p.birth_name, 160);
    if (!known && !birth) continue;
    if (seen.some((s) => sameName(s, known || birth))) continue;
    const member = src(p.member_source), name = src(p.name_source), date = src(p.date_source);
    if (personal && !member) { dropped++; continue; } // nobody is listed in a personal category without a page for it
    seen.push(known || birth);
    const birthDate = validDate(p.birth_date);
    const now = kind === 'person' ? clean(p.name_now, 160) : '';
    people.push({
      kind, known_as: known || birth, birth_name: birth, chart_name: chartName(birth || known, kind), birth_date: birthDate,
      name_now: now && !sameName(now, birth) ? now : '', who: clean(p.who, 160), why: clean(p.why, 160),
      member_source: member, name_source: name, date_source: date,
      checked: !!date && !!birthDate, sure: !!p.sure && !!date && !!name && !!birthDate,
    });
  }
  const kinds = personal ? [] : parseWho(Array.isArray(answer.vault_kinds) ? answer.vault_kinds.slice(0, 3) : []);
  return {
    query: q, size: n, category: clean(answer.category, 60) || q, personal, dropped, note: clean(answer.note, 300),
    vault_kinds: kinds.map((k) => `${k.type}:${k.value}`), people,
    usd: round(usd), seconds: round(seconds), calls, searches,
  };
}

// ---------- storage (migration 11) ----------
export function storeResearch(db, r, build) {
  return Number(db.prepare('INSERT INTO research (query, category, size, result, off, usd, build) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(r.query, r.category, r.size, JSON.stringify(r), JSON.stringify({ p: [], v: [] }), r.usd || 0, build || null).lastInsertRowid);
}
export function pastResearch(db, limit = 100) {
  return db.prepare('SELECT id, query, category, size, result, usd, created_at FROM research ORDER BY id DESC LIMIT ?').all(limit)
    .map((row) => { let n = 0; try { n = JSON.parse(row.result).people.length; } catch {} return { id: row.id, query: row.query, category: row.category, size: row.size, found: n, usd: row.usd, created_at: row.created_at }; });
}
export function deleteResearch(db, id) { return db.prepare('DELETE FROM research WHERE id = ?').run(id).changes > 0; }
const rowOf = (db, id) => db.prepare('SELECT * FROM research WHERE id = ?').get(id) || null;
const parse = (s, fallback) => { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : fallback; } catch { return fallback; } };

const dateParts = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { day: +m[3], month: +m[2], year: +m[1] } : null; };

// The vault chart that IS this person: the same typed name and birth date.
function vaultChart(db, p) {
  const d = dateParts(p.birth_date);
  if (!d || !p.chart_name) return null;
  const want = p.chart_name.toLowerCase().replace(/\s+/g, ' ');
  for (const r of db.prepare('SELECT ci.image_id AS id, ci.name, i.title FROM chart_inputs ci JOIN images i ON i.id = ci.image_id WHERE ci.day = ? AND ci.month = ? AND ci.year = ? AND i.kind = \'chart\' ORDER BY ci.image_id').all(d.day, d.month, d.year)) {
    if (String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ') === want) return { id: r.id, title: r.title || r.name };
  }
  return null;
}
// The vault's own people of the same kind (any of the kinds; one row per chart).
function vaultMembers(db, kinds) {
  const out = new Map();
  for (const k of parseWho(kinds)) {
    const params = [], sql = whoSql([k], params);
    for (const r of db.prepare(`SELECT i.id, i.title, ci.name, ci.day, ci.month, ci.year FROM images i LEFT JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.kind = 'chart' ${sql} ORDER BY i.title`).all(...params)) {
      if (!out.has(r.id)) out.set(r.id, { id: r.id, title: r.title || r.name || 'No name', inputs: r.name || r.day ? { name: r.name || '', day: r.day, month: r.month, year: r.year } : null, kind: k.label });
    }
  }
  return [...out.values()];
}

// One research as the screens need it: the people found (each with whether it is ticked and whether the vault
// has it), the vault's own people of that kind, and the stored summary.
export function getResearch(db, id) {
  const row = rowOf(db, id);
  if (!row) return null;
  const r = parse(row.result, null);
  if (!r) return null;
  const off = parse(row.off, {});
  const offP = new Set(Array.isArray(off.p) ? off.p : []), offV = new Set(Array.isArray(off.v) ? off.v : []);
  const people = (r.people || []).map((p, i) => ({ ...p, ref: i, on: !offP.has(i), vault: vaultChart(db, p), drawable: !!(p.chart_name && dateParts(p.birth_date)) }));
  const taken = new Set(people.filter((p) => p.vault).map((p) => p.vault.id));
  const vault = vaultMembers(db, r.vault_kinds || []).filter((v) => !taken.has(v.id)).map((v) => ({ ...v, on: !offV.has(v.id) }));
  const summary = parse(row.summary, null);
  return { id: row.id, query: r.query, category: r.category, size: r.size, personal: !!r.personal, dropped: r.dropped || 0, note: r.note || '',
    vault_kinds: parseWho(r.vault_kinds || []).map((k) => k.label), people, vault, summary,
    usd: r.usd || 0, seconds: r.seconds || 0, searches: r.searches || 0, at: row.created_at, build: row.build };
}

// Who is ticked: { p: [refs unticked], v: [vault chart ids unticked] }.
export function setOff(db, id, body) {
  const row = rowOf(db, id);
  if (!row) return false;
  const ints = (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0))].slice(0, 2000);
  db.prepare('UPDATE research SET off = ? WHERE id = ?').run(JSON.stringify({ p: ints(body && body.p), v: ints(body && body.v) }), id);
  return true;
}

// The owner fixes a name or a date the search got wrong: kept with the research, so the counts follow it.
export function fixPerson(db, id, ref, body) {
  const row = rowOf(db, id);
  const r = row && parse(row.result, null);
  const p = r && r.people && r.people[ref];
  if (!p) return null;
  const b = body || {};
  if (b.birth_name !== undefined) { const name = clean(b.birth_name, 160); if (!name) throw new AiError('Type a name first.'); p.birth_name = name; p.chart_name = chartName(name, p.kind); }
  if (b.birth_date !== undefined) { const d = b.birth_date === '' ? '' : validDate(b.birth_date); if (b.birth_date !== '' && !d) throw new AiError('That is not a whole date. Fill in the day, the month and a four-digit year.'); p.birth_date = d; }
  if (b.name_now !== undefined) p.name_now = clean(b.name_now, 160);
  p.fixed = true; p.sure = true;
  db.prepare('UPDATE research SET result = ? WHERE id = ?').run(JSON.stringify(r), id);
  return getResearch(db, id);
}

// ---------- the patterns (free) ----------
// Everyone ticked, counted against the rest of the vault. People found online whose date is missing cannot be counted.
export function researchShares(db, id) {
  const g = getResearch(db, id);
  if (!g) return null;
  const on = g.people.filter((p) => p.on);
  const extra = on.filter((p) => p.drawable).map((p) => ({ name: p.chart_name, ...dateParts(p.birth_date), title: p.known_as, ref: p.ref }));
  const ids = g.vault.filter((v) => v.on).map((v) => v.id);
  const shares = sharesOf(db, { ids, extra, display: g.category });
  const key = crypto.createHash('sha1').update(JSON.stringify([extra.map((e) => `${e.name}|${e.day}.${e.month}.${e.year}`).sort(), ids.slice().sort((a, b) => a - b)])).digest('hex').slice(0, 16);
  return { ...shares, key, undated: on.length - extra.length, online: extra.length, from_vault: ids.length };
}

// ---------- the summary (paid, Opus) ----------
const SUMMARY_SYSTEM = `You write a short "What Stands Out" note for a numerologist's research group: a category of people or businesses whose Chaldean five-chart numeroscopes the app counted against every other chart in the owner's vault. You get THE FINDS (counted by the app: how many of the group hold a number, how many of the others do, and a strength label measured against random groups of the same size) and COURSE PASSAGES on those numbers.
- Report only the finds listed. Never invent a pattern, a count or a person. Keep the strength honest: Strong = unlikely to be luck; Worth a Look = may well be luck, and say so.
- Meanings come only from the course passages given; cite the source in brackets after the claim, like [Main Combo Guide]. When no passage covers a number in that position, give the count and say the course words given do not cover it there. A passage about another position or another compound (12/3 vs 3) is not about this find; say so if you use it.
- Describe the group, never a person: do not characterize anyone individually, and never say the numbers cause or explain who someone is. Use "the group leans on", "shows up more often than in the vault".
- Numbers as the course writes them (15/6; one-digit numbers plain). Position names exactly as given. Plain American English.
- 120 to 220 words: the strongest find first, a few short paragraphs or bullets, one closing line that a group this size shows a lean, not a proof. No preamble, no heading.`;

const pctOf = (a, of) => (of ? Math.round((a / of) * 100) : 0);
const block = (p) => `[${p.book || p.title}${p.heading ? ` > ${String(p.heading).split(' > ').pop()}` : ''}${p.page ? `, p. ${p.page}` : ''}]\n${p.text}`;

// What the model gets: the finds worth a look and the course's words on those numbers. null = nothing stands out.
export function summaryContext(g, s) {
  const cards = (s.cards || []).filter((c) => c.strength !== 'Could Be Chance').slice(0, 5);
  const anywhere = (s.anywhere || []).filter((a) => a.strength !== 'Could Be Chance').slice(0, 4);
  if (!cards.length && !anywhere.length) return null;
  const count = (x) => `${x.in_group} of ${x.group_of} in the group (${pctOf(x.in_group, x.group_of)}%), ${x.in_rest} of ${x.rest_of} others in the vault (${pctOf(x.in_rest, x.rest_of)}%)`;
  const finds = [`THE GROUP: ${g.category}. ${s.size} counted (${s.online} found online, ${s.size - s.online} from the vault), against ${s.rest} others in the vault.`, '', 'THE FINDS'];
  const words = [];
  const seen = new Set();
  const addWords = (title, bits, passages) => {
    const ps = (passages || []).filter((p) => { const k = `${p.source}|${String(p.text).slice(0, 80)}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const pts = bits && bits.groups ? bits.groups.map((x) => x.points.map((t) => `- ${t.replace(/\*\*/g, '')}`).join('\n')).join('\n') : '';
    if (pts || ps.length) words.push(`\n${title}`, pts, ...ps.map(block));
  };
  for (const c of cards) for (const i of c.items) {
    finds.push(`- ${c.strength}: ${i.number} as the ${i.name}: ${count(i)}. Held by: ${c.charts.map((x) => x.title).join(', ')}.`);
    const [chart, position] = i.pos.split('.');
    if (i.family) { const n = Number(i.num.slice(1)); addWords(`COURSE PASSAGES ON ${n} (any number with this digit sum; may be about other positions)`, null, chunksFor(n, null, 2)); continue; }
    let m = null;
    try { m = meaningFor({ chart, position, sum: Number(i.num), pair: [], rel: [] }); } catch { m = null; }
    if (m && ((m.bits && m.bits.groups && m.bits.groups.length) || (m.passages && m.passages.length))) addWords(`THE COURSE ON ${i.number} AS THE ${i.name.toUpperCase()}`, m.bits, (m.passages || []).slice(0, 2));
    else addWords(`COURSE PASSAGES ON ${i.number} (not about this position; say so if you use them)`, null, chunksFor(Number(i.num), null, 2));
  }
  for (const a of anywhere) {
    finds.push(`- ${a.strength}: ${a.number} anywhere in the chart: ${count(a)}. Held by: ${a.charts.map((x) => x.title).join(', ')}.`);
    addWords(`COURSE PASSAGES ON ${a.number} (general: may be about one position; say so if you use them)`, null, chunksFor(Number(a.num), null, 3));
  }
  let text = [...finds, '', 'COURSE PASSAGES', ...words.filter(Boolean)].join('\n');
  if (text.length > MAX_CONTEXT) text = text.slice(0, MAX_CONTEXT);
  return { text, finds: cards.length + anywhere.length };
}

export function summaryEstimate(db) {
  const r = db.prepare("SELECT avg(json_extract(summary, '$.usd')) usd, count(*) n FROM research WHERE json_extract(summary, '$.usd') > 0").get();
  return { usd: round(r && r.n ? r.usd : SUMMARY_GUESS_USD), measured: !!(r && r.n) };
}

// Writes (or returns) the summary for the group as it is ticked now. The same group again = the stored one, free.
export async function writeSummary(db, id, { again = false } = {}) {
  const g = getResearch(db, id);
  if (!g) throw new AiError('That research is gone.');
  const s = researchShares(db, id);
  if (g.summary && g.summary.key === s.key && !again) return g.summary;
  const save = (summary) => { db.prepare('UPDATE research SET summary = ? WHERE id = ?').run(JSON.stringify(summary), id); return summary; };
  if (s.size < 3) return save({ key: s.key, text: '', none: 'small', usd: 0, size: s.size, at: new Date().toISOString() });
  const ctx = summaryContext(g, s);
  if (!ctx) return save({ key: s.key, text: '', none: 'luck', usd: 0, size: s.size, at: new Date().toISOString() });
  const est = estimate('reading', { inputChars: SUMMARY_SYSTEM.length + ctx.text.length, outputTokens: 600 });
  running++;
  try {
    const { message, usd, seconds } = await callModel('reading', {
      max_tokens: 2500, output_config: { effort: 'medium' }, system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: ctx.text }],
    }, { estimateUsd: est, what: `research summary #${id} (${ctx.finds} finds)` });
    if (message.stop_reason === 'refusal') throw new AiError('The AI declined to write this summary.');
    const text = textOf(message);
    if (!text) throw new AiError('The AI sent back an empty summary. Try again.');
    return save({ key: s.key, text, usd: round(usd), seconds, size: s.size, finds: ctx.finds, at: new Date().toISOString() });
  } finally { running--; }
}

// ---------- the snapshot ----------
const RECENT = [];
export function rememberResearch(entry) { RECENT.push({ at: new Date().toISOString(), ...entry }); if (RECENT.length > 20) RECENT.shift(); }
export function researchReport(db) {
  const kept = db ? db.prepare('SELECT count(*) n, max(created_at) last, coalesce(sum(usd), 0) usd FROM research').get() : null;
  const lines = [`RESEARCH A GROUP: ${running} running now · last ${RECENT.length} this process${kept ? ` · ${kept.n} kept (Past Research)${kept.last ? `, newest ${kept.last}` : ''}, $${round(kept.usd)} spent on searches in all` : ''}`];
  if (db) for (const c of researchCosts(db)) lines.push(`  a search for ${c.size}: about $${c.usd.toFixed(2)} (${c.measured ? `average of ${c.searches} real` : 'a guess, none run yet'})`);
  for (const e of RECENT.slice().reverse()) lines.push(`  ${e.at} "${e.query}" (${e.size}) → ${e.error ? `FAILED ${e.error}` : `#${e.id} ${e.category}${e.personal ? ' [personal: only self-stated, sourced]' : ''}: ${e.found} found${e.dropped ? `, ${e.dropped} dropped (no page for it)` : ''}, ${e.unchecked} not checked online, vault kinds ${e.kinds || 'none'} · ${e.searches} searches · $${e.usd}${e.note ? ` · note: ${e.note}` : ''}`}`);
  if (db) for (const r of db.prepare('SELECT id, query, category, size, usd, created_at FROM research ORDER BY id DESC LIMIT 10').all()) lines.push(`  kept #${r.id} ${r.created_at} "${r.query}" → ${r.category} (${r.size}) $${round(r.usd)}`);
  return lines;
}
export const RESEARCH_TOOLS = [GROUP_TOOL];
