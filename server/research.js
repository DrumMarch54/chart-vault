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
import { chunksFor, coreText } from './knowledge.js';

// The search runs in ROUNDS (owner 2026-11-23: "shoot for as many as we can find ... the more data, the better"):
// each round asks for up to 30 more, naming everyone already found, until a round brings fewer than DRY new ones.
// It never passes LIMIT_USD without the owner's tap ("prevent it from racking up a huge bill"): it stops and asks.
const ROUND = 30;
const ROUND_SEARCHES = 14;
const ROUND_GUESS_USD = 0.17; // the first real round, 2026-11-23: 14 searches, $0.17
const DRY = 5;
const MAX_ROUNDS = 12;
const MAX_PEOPLE = 300;
export const LIMIT_USD = 1;
const SUMMARY_GUESS_USD = 0.12;
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
How to search: you have at most ${ROUND_SEARCHES} searches. Start with lists of the category, then spend the rest on the birth names and dates you are least sure of. A name or date you know well but did not see in a search result is allowed: leave its source empty (it is shown as not checked online) and set sure to false. Never guess: a name or date you do not know stays empty. Never blend two people.
Sources: member_source, name_source and date_source are URLs taken from the search results, or empty.
why: a few words on why they belong ("Created Linux", "Came out as transgender in 2020").
vault_kinds: the owner's vault already sorts its charts into these kinds: ${KINDS_LIST}. List the kinds that mean the SAME as the category (computer coders = field:tech). Only a kind that is the same group; otherwise an empty list. Never one for a personal category.
category: the category as a short title in Title Case ("Computer Coders").
When the message lists people ALREADY FOUND, find ${n} MORE who are not on that list: the next best known, then lesser known but still clearly public ones. Never repeat a listed one. If no more clear, public examples exist, give fewer or an empty list.
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

// What one round costs: the average of the real ones once there are any, a guess before that.
export function researchCost(db) {
  const r = db.prepare("SELECT coalesce(sum(usd), 0) usd, coalesce(sum(coalesce(json_extract(result, '$.rounds'), 1)), 0) rounds FROM research WHERE usd > 0").get();
  return { round_usd: round(r.rounds ? r.usd / r.rounds : ROUND_GUESS_USD), measured: r.rounds > 0, rounds: r.rounds, limit_usd: LIMIT_USD };
}

// One paid round: the web search for up to ROUND people, not repeating `known`. Returns what it found, cleaned.
async function findRound(q, { known = [], personal = false, roundNo = 1 } = {}) {
  const n = ROUND;
  const messages = [{ role: 'user', content: `The category: ${q}\nHow many to find: ${n}${known.length ? `\nALREADY FOUND (find others): ${known.join('; ')}` : ''}` }];
  const found = new Map();
  let usd = 0, seconds = 0, calls = 0, searches = 0, answer = null, nudged = false;
  const errors = [];
  const est = estimate('lookup', { inputChars: 120000 + n * 6000, outputTokens: 400 + n * 160 }) + ROUND_SEARCHES * WEB_SEARCH_USD;
  while (calls < MAX_CALLS && !answer) {
    calls++;
    const r = await callModel('lookup', {
      max_tokens: 2000 + n * 300, output_config: { effort: 'medium' }, system: systemFor(n),
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: ROUND_SEARCHES }, GROUP_TOOL],
      messages,
    }, { estimateUsd: calls === 1 ? est : 0, what: `research "${q.slice(0, 40)}" round ${roundNo} call ${calls}` });
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
  if (!answer) { const e = new AiError(errors.length ? `The web search failed (${[...new Set(errors)].join(', ')}). Try again in a minute.` : 'No answer came back. Try saying it another way.'); e.usd = usd; throw e; }

  const isPersonal = personal || !!answer.personal || PERSONAL.test(q);
  const src = (u) => (u && found.has(u) ? { url: u, site: hostOf(u), title: found.get(u) } : null); // only a page the search returned
  let dropped = 0;
  const people = [];
  for (const p of Array.isArray(answer.people) ? answer.people : []) {
    if (people.length >= n) break;
    const kind = p.kind === 'business' ? 'business' : 'person';
    const known_as = clean(p.known_as, 120), birth = clean(p.birth_name, 160);
    if (!known_as && !birth) continue;
    const member = src(p.member_source), name = src(p.name_source), date = src(p.date_source);
    if (isPersonal && !member) { dropped++; continue; } // nobody is listed in a personal category without a page for it
    const birthDate = validDate(p.birth_date);
    const now = kind === 'person' ? clean(p.name_now, 160) : '';
    people.push({
      kind, known_as: known_as || birth, birth_name: birth, chart_name: chartName(birth || known_as, kind), birth_date: birthDate,
      name_now: now && !sameName(now, birth) ? now : '', who: clean(p.who, 160), why: clean(p.why, 160),
      member_source: member, name_source: name, date_source: date,
      checked: !!date && !!birthDate, sure: !!p.sure && !!date && !!name && !!birthDate,
    });
  }
  const kinds = isPersonal ? [] : parseWho(Array.isArray(answer.vault_kinds) ? answer.vault_kinds.slice(0, 3) : []);
  return { category: clean(answer.category, 60) || q, personal: isPersonal, dropped, note: clean(answer.note, 300), vault_kinds: kinds.map((k) => `${k.type}:${k.value}`), people, usd: round(usd), seconds: round(seconds), calls, searches };
}

// ---------- the search job (runs on the server; the phone only watches it) ----------
// status: running | done | paused (it would pass the money limit: the owner decides) | interrupted (the app
// restarted mid-search; what was found is kept) | failed (the first round failed; nothing found).
const saveResult = (db, id, r) => db.prepare('UPDATE research SET result = ?, category = ?, size = ?, usd = ? WHERE id = ?').run(JSON.stringify(r), r.category || r.query, r.people.length, r.usd || 0, id);
const loadResult = (db, id) => { const row = db.prepare('SELECT result FROM research WHERE id = ?').get(id); return row ? parse(row.result, null) : null; };
const isSame = (a, b) => sameName(a.known_as, b.known_as) || (!!a.birth_date && a.birth_date === b.birth_date && sameName(a.chart_name, b.chart_name));

// Starts a search and returns its id at once. `limit` is the dollars this research may spend before it asks.
export function startResearch(db, query, { build = null, log = () => {} } = {}) {
  const q = clean(query, MAX_QUERY);
  if (!q) throw new AiError('Type a category first.');
  const r = { query: q, category: q, personal: PERSONAL.test(q), dropped: 0, note: '', vault_kinds: [], people: [], usd: 0, seconds: 0, calls: 0, searches: 0, rounds: 0, limit: LIMIT_USD, status: 'running', stop: '' };
  const id = Number(db.prepare('INSERT INTO research (query, category, size, result, off, usd, build) VALUES (?, ?, 0, ?, ?, 0, ?)').run(q, q, JSON.stringify(r), JSON.stringify({ p: [], v: [] }), build).lastInsertRowid);
  runRounds(db, id, log);
  return id;
}
// "Keep Going": the owner allows another dollar (or resumes a search the restart cut short).
export function moreResearch(db, id, { log = () => {} } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running') return;
  r.limit = round(Math.max(r.limit || LIMIT_USD, r.usd) + LIMIT_USD);
  r.status = 'running'; r.stop = '';
  saveResult(db, id, r);
  runRounds(db, id, log);
}
async function runRounds(db, id, log) {
  running++;
  try {
    for (;;) {
      const r = loadResult(db, id);
      if (!r || r.status !== 'running') return; // removed, or stopped from outside
      const stopWith = (status, stop) => { r.status = status; r.stop = stop; saveResult(db, id, r); };
      if (r.people.length >= MAX_PEOPLE) { stopWith('done', `Stopped at ${MAX_PEOPLE}: plenty to count.`); break; }
      if (r.rounds >= MAX_ROUNDS) { stopWith('done', 'Stopped after many rounds.'); break; }
      const each = r.rounds ? r.usd / r.rounds : ROUND_GUESS_USD;
      if (r.rounds && r.usd + each > r.limit) { stopWith('paused', `Another round would pass $${r.limit.toFixed(2)}.`); break; }
      let got;
      try { got = await findRound(r.query, { known: r.people.map((p) => p.known_as), personal: r.personal, roundNo: r.rounds + 1 }); }
      catch (err) {
        const now = loadResult(db, id); if (!now) return;
        now.usd = round(now.usd + (err.usd || 0));
        now.status = now.people.length ? 'done' : 'failed'; now.stop = err instanceof AiError ? err.message : 'Something went wrong in the search.';
        saveResult(db, id, now);
        log(`research #${id} round ${now.rounds + 1} FAILED: ${err.message}`);
        rememberResearch({ id, query: now.query, error: now.stop });
        if (!(err instanceof AiError)) throw err;
        break;
      }
      const now = loadResult(db, id); if (!now) return; // removed while the round ran
      const fresh = got.people.filter((p) => !now.people.some((x) => isSame(x, p)) );
      const unique = []; for (const p of fresh) if (!unique.some((x) => isSame(x, p))) unique.push(p);
      now.people.push(...unique.slice(0, MAX_PEOPLE - now.people.length));
      if (!now.rounds) { now.category = got.category; now.vault_kinds = got.vault_kinds; now.note = got.note; }
      now.personal = now.personal || got.personal;
      if (now.personal) now.vault_kinds = [];
      now.dropped += got.dropped; now.usd = round(now.usd + got.usd); now.seconds = round(now.seconds + got.seconds); now.calls += got.calls; now.searches += got.searches; now.rounds += 1;
      const dry = unique.length < DRY;
      if (dry) { now.status = 'done'; now.stop = now.rounds === 1 && !unique.length ? 'Nobody was found.' : 'No more new ones turned up.'; }
      saveResult(db, id, now);
      log(`research #${id} "${now.category}" round ${now.rounds}: ${unique.length} new, ${now.people.length} in all, $${now.usd}`);
      rememberResearch({ id, query: now.query, round: now.rounds, category: now.category, personal: now.personal, fresh: unique.length, found: now.people.length, dropped: now.dropped, unchecked: now.people.filter((p) => !p.checked).length, kinds: now.vault_kinds.join(', '), searches: got.searches, usd: got.usd, note: got.note });
      if (dry) break;
    }
    // The summary is written on the server straight away, so a phone that was away still finds it ready.
    const end = loadResult(db, id);
    if (end && end.people.length >= 3) await writeSummary(db, id).then((sm) => { if (sm.usd) log(`research #${id} summary: $${sm.usd}`); }).catch((err) => log(`research #${id} summary FAILED: ${err.message}`));
  } catch (err) { log(`research #${id} FAILED: ${err && err.message}`); }
  finally { running--; }
}
// At startup: a search that was running when the app restarted is marked interrupted; what it found is kept.
export function recoverResearch(db) {
  let n = 0;
  for (const row of db.prepare('SELECT id, result FROM research').all()) {
    const r = parse(row.result, null);
    if (r && r.status === 'running') { r.status = 'interrupted'; r.stop = 'The app restarted during the search. What was found is kept.'; saveResult(db, row.id, r); n++; }
  }
  return n;
}

// ---------- storage (migration 11) ----------
export function pastResearch(db, limit = 100) {
  return db.prepare('SELECT id, query, category, result, usd, created_at FROM research ORDER BY id DESC LIMIT ?').all(limit)
    .map((row) => { const r = parse(row.result, {}); return { id: row.id, query: row.query, category: row.category, found: (r.people || []).length, status: r.status || 'done', usd: row.usd, created_at: row.created_at }; });
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
  return { id: row.id, query: r.query, category: r.category, status: r.status || 'done', stop: r.stop || '', rounds: r.rounds ?? 1, limit: r.limit || LIMIT_USD, personal: !!r.personal, dropped: r.dropped || 0, note: r.note || '',
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
// The model reads like the owner does (owner 2026-11-23: "so many nines in the solar plexus centers ... isn't it
// obvious?"): it gets the reading guide every chart Reading gets (coreText: what each position governs, the owner's
// own notes for AIs), the THEMES the counter found (one number family across one part of the chart), then the
// single finds, each with its counts and its honest label, and the course's words on those numbers there.
const SUMMARY_SYSTEM = `You write a short "What Stands Out" note for a numerologist's research group: a category of people or businesses whose Chaldean five-chart numeroscopes the app counted against every other chart in the owner's vault. The COURSE REFERENCE below is how this system reads a chart: use it to say what a part of the chart governs (the emotion center is the solar plexus: inner emotional life, sex and love life; it is called the sexual center too). You get THE THEMES (one number family, like 9, 18/9, 27/9, 81/9, sitting in one part of the chart in several positions), THE FINDS (single positions) and COURSE PASSAGES on those numbers. Every count was made by the app; every label was measured against random groups of the same size.
- Lead with the themes: a theme is the main thing to report, the way a numerologist sees it at a glance ("nines in the name chart's emotion center"). Give its counts. Then the single finds worth a word. Skip finds that add nothing.
- Report only what is listed. Never invent a pattern, a count or a person. Keep every label honest, in plain words: Strong = unlikely to be luck; Worth a Look = may be luck; Could Be Chance = random groups do this well most of the time, so say it is only a hint.
- A number family is one vibration in several forms: 18/9 and 27/9 are 9s and are also their own numbers. Say which forms show up when the counts give them.
- Meanings come only from the course reference and the course passages given; cite the source in brackets after the claim, like [Main Combo Guide] or [Positions]. When nothing given covers a number in that position, give the count and say so. A passage about another position or another compound is not about this find; say so if you use it.
- Describe the group, never a person: do not characterize anyone individually, and never say the numbers cause or explain who someone is. Use "the group leans on", "shows up more often than in the vault".
- Numbers as the course writes them (15/6; one-digit numbers plain). Position names exactly as given. Plain American English.
- 150 to 280 words: the strongest theme first, short paragraphs or bullets, one closing line that a group this size shows a lean, not a proof. No preamble, no heading.`;

const pctOf = (a, of) => (of ? Math.round((a / of) * 100) : 0);
const block = (p) => `[${p.book || p.title}${p.heading ? ` > ${String(p.heading).split(' > ').pop()}` : ''}${p.page ? `, p. ${p.page}` : ''}]\n${p.text}`;

// What the model gets: the themes, the finds, and the course's words on those numbers. null = nothing to report.
export function summaryContext(g, s) {
  const themes = (s.themes || []).slice(0, 4);
  const worth = (s.cards || []).filter((c) => c.strength !== 'Could Be Chance');
  const cards = (worth.length >= 3 ? worth : (s.cards || [])).slice(0, 6);
  const anywhere = (s.anywhere || []).filter((a) => a.strength !== 'Could Be Chance').slice(0, 4);
  if (!themes.length && !worth.length && !anywhere.length) return null;
  const count = (x) => `${x.in_group} of ${x.group_of} in the group (${pctOf(x.in_group, x.group_of)}%), ${x.in_rest} of ${x.rest_of} others in the vault (${pctOf(x.in_rest, x.rest_of)}%)`;
  const luck = (x) => `${x.strength}: ${x.luck === 0 ? 'no random group did this well' : `${Math.max(1, Math.round(x.luck * 100))} in 100 random groups do this well`}`;
  const lines = [`THE GROUP: ${g.category}. ${s.size} counted (${s.online} found online, ${s.size - s.online} from the vault), against ${s.rest} others in the vault.`];
  const words = [];
  const seen = new Set();
  const addWords = (title, bits, passages) => {
    const ps = (passages || []).filter((p) => { const k = `${p.source}|${String(p.text).slice(0, 80)}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const pts = bits && bits.groups ? bits.groups.map((x) => x.points.map((t) => `- ${t.replace(/\*\*/g, '')}`).join('\n')).join('\n') : '';
    if (pts || ps.length) words.push(`\n${title}`, pts, ...ps.map(block));
  };
  const wordsFor = (i) => {
    const [chart, position] = i.pos.split('.');
    if (i.family) { const n = Number(i.num.slice(1)); addWords(`COURSE PASSAGES ON ${n} (the family: may be about other positions; say so if you use them)`, null, chunksFor(n, null, 2)); return; }
    let m = null;
    try { m = meaningFor({ chart, position, sum: Number(i.num), pair: [], rel: [] }); } catch { m = null; }
    if (m && ((m.bits && m.bits.groups && m.bits.groups.length) || (m.passages && m.passages.length))) addWords(`THE COURSE ON ${i.number} AS THE ${i.name.toUpperCase()}`, m.bits, (m.passages || []).slice(0, 2));
    else addWords(`COURSE PASSAGES ON ${i.number} (not about this position; say so if you use them)`, null, chunksFor(Number(i.num), null, 2));
  };
  if (themes.length) lines.push('', 'THE THEMES');
  for (const t of themes) {
    lines.push(`- ${t.title}. ${t.people} of the group hold at least one of these. ${luck(t)}.`);
    for (const i of t.items) { lines.push(`    ${i.number} as the ${i.name}: ${count(i)}`); wordsFor(i); }
    addWords(`COURSE PASSAGES ON ${t.family} (the family itself)`, null, chunksFor(t.family, null, 2));
  }
  if (cards.length || anywhere.length) lines.push('', 'THE FINDS (single positions)');
  for (const c of cards) for (const i of c.items) { lines.push(`- ${luck(c)}. ${i.number} as the ${i.name}: ${count(i)}. Held by: ${c.charts.map((x) => x.title).join(', ')}.`); wordsFor(i); }
  for (const a of anywhere) {
    lines.push(`- ${luck(a)}. ${a.number} anywhere in the chart: ${count(a)}.`);
    addWords(`COURSE PASSAGES ON ${a.number} (general: may be about one position; say so if you use them)`, null, chunksFor(Number(a.num), null, 2));
  }
  let text = [...lines, '', 'COURSE PASSAGES', ...words.filter(Boolean)].join('\n');
  if (text.length > MAX_CONTEXT) text = text.slice(0, MAX_CONTEXT);
  return { text, finds: themes.length + cards.length + anywhere.length, themes: themes.length };
}

export function summaryEstimate(db) {
  const r = db.prepare("SELECT avg(json_extract(summary, '$.usd')) usd, count(*) n FROM research WHERE json_extract(summary, '$.usd') > 0").get();
  return { usd: round(r && r.n ? r.usd : SUMMARY_GUESS_USD), measured: !!(r && r.n) };
}

// Writes (or returns) the summary for the group as it is ticked now. The same group again = the stored one, free.
// A second ask while one is being written waits for that one (2026-11-23: the phone lost the answer, Try Again
// paid a second time while the first was still running).
const writing = new Map();
export function writeSummary(db, id, opts = {}) {
  const busy = writing.get(id);
  if (busy) return busy;
  const job = writeSummaryNow(db, id, opts).finally(() => writing.delete(id));
  writing.set(id, job);
  return job;
}
async function writeSummaryNow(db, id, { again = false } = {}) {
  const g = getResearch(db, id);
  if (!g) throw new AiError('That research is gone.');
  const s = researchShares(db, id);
  if (g.summary && g.summary.key === s.key && !again) return g.summary;
  const save = (summary) => { db.prepare('UPDATE research SET summary = ? WHERE id = ?').run(JSON.stringify(summary), id); return summary; };
  if (s.size < 3) return save({ key: s.key, text: '', none: 'small', usd: 0, size: s.size, at: new Date().toISOString() });
  const ctx = summaryContext(g, s);
  if (!ctx) return save({ key: s.key, text: '', none: 'luck', usd: 0, size: s.size, at: new Date().toISOString() });
  const core = coreText();
  const est = estimate('reading', { inputChars: SUMMARY_SYSTEM.length + core.length + ctx.text.length, outputTokens: 800 });
  running++;
  try {
    const { message, usd, seconds } = await callModel('reading', {
      max_tokens: 3000, output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SUMMARY_SYSTEM }, ...(core ? [{ type: 'text', text: core, cache_control: { type: 'ephemeral' } }] : [])],
      messages: [{ role: 'user', content: ctx.text }],
    }, { estimateUsd: est, what: `research summary #${id} (${ctx.themes} themes, ${ctx.finds} finds)` });
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
  if (db) { const c = researchCost(db); lines.push(`  one round of 30: about $${c.round_usd.toFixed(2)} (${c.measured ? `average of ${c.rounds} real` : 'a guess, none run yet'}); a search asks before passing $${LIMIT_USD.toFixed(2)}`); }
  for (const e of RECENT.slice().reverse()) lines.push(`  ${e.at} "${e.query}" → ${e.error ? `#${e.id ?? '-'} FAILED ${e.error}` : `#${e.id} ${e.category} round ${e.round}${e.personal ? ' [personal: only self-stated, sourced]' : ''}: ${e.fresh} new, ${e.found} in all${e.dropped ? `, ${e.dropped} dropped (no page for it)` : ''}, ${e.unchecked} not checked online, vault kinds ${e.kinds || 'none'} · ${e.searches} searches · $${e.usd}${e.note ? ` · note: ${e.note}` : ''}`}`);
  if (db) for (const row of db.prepare('SELECT id, query, category, result, summary, usd, created_at FROM research ORDER BY id DESC LIMIT 10').all()) { const r = parse(row.result, {}), sm = parse(row.summary, null); lines.push(`  kept #${row.id} ${row.created_at} "${row.query}" → ${row.category}: ${(r.people || []).length} found in ${r.rounds || 1} round(s), ${r.status || 'done'}${r.stop ? ` (${r.stop})` : ''}, $${round(row.usd)} of limit $${(r.limit || LIMIT_USD).toFixed(2)}; summary ${sm ? (sm.text ? `written $${sm.usd}` : `none (${sm.none})`) : 'not written'}`); }
  return lines;
}
export const RESEARCH_TOOLS = [GROUP_TOOL];
