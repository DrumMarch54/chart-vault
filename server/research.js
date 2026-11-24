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
import { groupInsights } from './insight.js';
import { findItem, membersOf, LINK_KINDS } from './wikidata.js';
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
const MAX_ROUNDS = 80;     // the money limit is the real brake: it asks at every dollar
const MAX_PEOPLE = 1500;   // owner 2026-11-23: "we need a much bigger database"
const DRY_WAYS = 3;        // Search Everything stops after this many ways in a row found nobody new
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
angles: three short ways to find MORE members of this category after this round, each a narrower slice with plenty of public examples not yet found ("Startup founders", "Video game makers", "Tech people outside the US", "Women in tech", "Tech people born before 1950"). Title Case, a few words each. Never one already tried.
When the message gives an ANGLE, every person you find must belong to the category AND fit that angle.
When the message lists people ALREADY FOUND, find ${n} MORE who are not on that list: the next best known, then lesser known but still clearly public ones. Never repeat a listed one. If no more clear, public examples exist, give fewer or an empty list.
Write in plain American English, short.`;

const GROUP_TOOL = {
  name: 'give_group',
  description: 'The group found: the examples of the category, the best known first. Call exactly once, after searching.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false, required: ['category', 'personal', 'note', 'vault_kinds', 'angles', 'people'],
    properties: {
      category: { type: 'string', description: 'The category as a short title in Title Case, like "Computer Coders".' },
      personal: { type: 'boolean', description: 'true when the category is about gender identity, sexual orientation, health, disability, religion, immigration status or being a victim.' },
      note: { type: 'string', description: 'One short sentence for the owner: a doubt about what was meant, or why fewer were found. Empty if nothing to say.' },
      vault_kinds: { type: 'array', items: { type: 'string' }, description: 'Kinds from the list that mean the same as the category, like "field:tech". Empty if none.' },
      angles: { type: 'array', items: { type: 'string' }, description: 'Three narrower ways to find more members next time, like "Startup Founders".' },
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
async function findRound(q, { known = [], personal = false, roundNo = 1, angle = '', tried = [], counts = '' } = {}) {
  const n = ROUND;
  const messages = [{ role: 'user', content: `The category: ${q}${counts ? `\nWHAT COUNTS (the owner's definition; nobody who does not fit it): ${counts}` : ''}${angle ? `\nANGLE: ${angle}` : ''}\nHow many to find: ${n}${known.length ? `\nALREADY FOUND (find others): ${known.join('; ')}` : ''}${tried.length ? `\nANGLES ALREADY TRIED: ${tried.join('; ')}` : ''}` }];
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
    }, { estimateUsd: calls === 1 ? est : 0, what: `research "${q.slice(0, 40)}"${angle ? ` [${angle.slice(0, 30)}]` : ''} round ${roundNo} call ${calls}` });
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
  const angles = (Array.isArray(answer.angles) ? answer.angles : []).map((a) => clean(a, 60)).filter(Boolean).filter((a) => !tried.some((t) => sameName(t, a))).slice(0, 3);
  return { angles, category: clean(answer.category, 60) || q, personal: isPersonal, dropped, note: clean(answer.note, 300), vault_kinds: kinds.map((k) => `${k.type}:${k.value}`), people, usd: round(usd), seconds: round(seconds), calls, searches };
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
  runPlan(db, id, log);
  return id;
}
// ---------- the plan: what counts, a question when unclear, where the free database keeps them ----------
// (owner 2026-11-24: "they all have to actually be relevant ... there may be cases where you need to ask for the
// clarification ... so we get the best data"; Wikidata first, the paid search only for what it misses.)
const PLAN_SYSTEM = `You prepare a research for a numerology app. The owner names a category of people or businesses; the app will collect members with their full birth name and birth date, from the free database Wikidata first, then a web search. Call give_plan exactly once, straight away.
- category: the category as a short title in Title Case.
- what_counts: one or two plain sentences that decide who belongs and who does not, as the owner most likely means it ("Mass shooters: a person who opened fire on people in a public place, killing or trying to kill several at once. Not snipers over days, not police ambushes, not attacks with other weapons."). Use the owner's own words when given.
- question: ONLY when the words could clearly mean two different groups and the difference would change who is collected, one short question to the owner with the choices ("Do you mean people who stream on YouTube as their main work, or anyone with a YouTube channel?"). Otherwise empty. Never ask when the owner already answered.
- personal: true for gender identity, sexual orientation, health, disability, religion, immigration status or being a victim.
- wikidata: up to two ways Wikidata ties people to this category, each { link, words }. link is one of: occupation (their job: "YouTuber", "rapper", "computer programmer"), position (an office held: "President of the United States"), perpetrator (they carried out an event of a type: "mass shooting"), member (member of an organization), award (an award received). words: the plain English name of that occupation, office, event type, organization or award as Wikidata would title it. Empty list when Wikidata has no clean way (personal categories, businesses, loose groups).`;
const PLAN_TOOL = { name: 'give_plan', description: 'The research plan.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['category', 'what_counts', 'question', 'personal', 'wikidata'], properties: {
  category: { type: 'string' }, what_counts: { type: 'string' }, question: { type: 'string' }, personal: { type: 'boolean' },
  wikidata: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['link', 'words'], properties: { link: { type: 'string', enum: LINK_KINDS }, words: { type: 'string' } } } },
} } };

async function makePlan(r) {
  const said = [`The category: ${r.query}`, r.answer ? `The owner's answer to your question "${r.asked || ''}": ${r.answer}` : '', r.what_counts_owner ? `The owner's own definition: ${r.what_counts_owner}` : ''].filter(Boolean).join('\n');
  const res = await callModel('lookup', { max_tokens: 1500, system: PLAN_SYSTEM, tools: [PLAN_TOOL], messages: [{ role: 'user', content: said }] }, { estimateUsd: 0.01, what: `research plan "${r.query.slice(0, 40)}"` });
  const use = (res.message.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_plan');
  if (!use) throw Object.assign(new AiError('The plan came back empty. Try again.'), { usd: res.usd });
  const p = use.input || {};
  return { usd: res.usd, category: clean(p.category, 60) || r.query, what_counts: clean(p.what_counts, 500), question: r.answer || r.what_counts_owner ? '' : clean(p.question, 300), personal: !!p.personal || PERSONAL.test(r.query),
    wikidata: (Array.isArray(p.wikidata) ? p.wikidata : []).filter((w) => w && LINK_KINDS.includes(w.link) && clean(w.words, 80)).slice(0, 2).map((w) => ({ link: w.link, words: clean(w.words, 80) })) };
}

// The free database: everyone it ties to the category, added to the people (a person already found is kept, with the
// fuller birth name of the two). Personal categories never come from here: only people who said it themselves.
async function fromWikidata(db, id, log) {
  const r = loadResult(db, id);
  if (!r || r.personal || !(r.wikidata || []).length) return 0;
  let added = 0;
  const used = [];
  for (const w of r.wikidata) {
    let item = null, got = null;
    try { item = await findItem(w.words); if (item) got = await membersOf(w.link, item); }
    catch (err) { log(`research #${id} free database FAILED: ${err.message}`); used.push({ ...w, error: err.message }); continue; }
    if (!item || !got) { used.push({ ...w, error: 'not found in the free database' }); continue; }
    const now = loadResult(db, id); if (!now) return added;
    let here = 0;
    for (const m of got.people) {
      if (now.people.length >= MAX_PEOPLE) break;
      const p = { kind: 'person', known_as: m.known_as, birth_name: m.birth_name, chart_name: chartName(m.birth_name, 'person'), birth_date: m.birth_date, name_now: '', who: clean(m.who, 160), why: clean(m.who, 160),
        member_source: { url: `https://www.wikidata.org/wiki/${m.qid}`, site: 'wikidata.org', title: 'Wikidata' }, name_source: { url: `https://www.wikidata.org/wiki/${m.qid}`, site: 'wikidata.org', title: m.name_from }, date_source: { url: `https://www.wikidata.org/wiki/${m.qid}`, site: 'wikidata.org', title: 'Wikidata' },
        checked: true, sure: !/Common name only|First and family/.test(m.name_from), name_from: m.name_from, from_db: true, ...(m.other_dates.length ? { other_dates: m.other_dates } : {}) };
      const same = now.people.find((x) => isSame(x, p) || (x.birth_date === p.birth_date && sameName(String(x.known_as).split(' ').pop(), String(p.known_as).split(' ').pop())));
      if (same) { if (!same.from_db && same.birth_name && (same.birth_name.split(' ').length >= p.birth_name.split(' ').length)) continue; continue; }
      now.people.push(p); here++;
    }
    used.push({ ...w, id: item.id, label: item.label, description: item.description, total: got.total, dated: got.people.length, added: here });
    now.wikidata_used = used;
    saveResult(db, id, now);
    added += here;
    log(`research #${id} free database ${w.link} ${item.id} (${item.label}): ${got.people.length} dated, ${here} new`);
  }
  const end = loadResult(db, id); if (end) { end.wikidata_used = used; end.wikidata_done = true; saveResult(db, id, end); }
  return added;
}

// The whole start: plan (one small paid call), then the free database, then the paid web search when the database
// gave few. A question from the plan stops it at status `asking` until the owner answers.
async function runPlan(db, id, log) {
  running++;
  let next = null;
  try {
    const r = loadResult(db, id); if (!r) return;
    let plan;
    try { plan = await makePlan(r); }
    catch (err) { const now = loadResult(db, id); if (now) { now.usd = round(now.usd + (err.usd || 0)); now.wikidata = []; now.planned = true; saveResult(db, id, now); } log(`research #${id} plan FAILED: ${err.message}`); next = 'rounds'; return; }
    const now = loadResult(db, id); if (!now) return;
    now.usd = round(now.usd + plan.usd); now.category = plan.category; now.what_counts = now.what_counts_owner || plan.what_counts; now.personal = now.personal || plan.personal;
    now.wikidata = plan.personal ? [] : plan.wikidata; now.planned = true;
    if (plan.question) { now.status = 'asking'; now.question = plan.question; saveResult(db, id, now); log(`research #${id} asks: ${plan.question}`); return; }
    saveResult(db, id, now);
    const added = await fromWikidata(db, id, log);
    const after = loadResult(db, id); if (!after) return;
    if (after.people.length >= 40) { after.status = 'done'; after.stop = `Found ${fmtCount(added)} in the free database (Wikidata).`; saveResult(db, id, after); next = 'summary'; }
    else next = 'rounds';
  } finally {
    running--;
    if (next === 'rounds') runRounds(db, id, log);
    else if (next === 'summary') { const end = loadResult(db, id); if (end && end.people.length >= 3) writeSummary(db, id).catch((err) => log(`research #${id} summary FAILED: ${err.message}`)); }
  }
}
const fmtCount = (n) => n.toLocaleString('en-US');

// The owner answers the plan's question (or writes What Counts in their own words): the plan is made again with it.
export function answerResearch(db, id, { answer = '', what_counts = '' } = {}, { log = () => {} } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running' || r.status === 'checking') throw new AiError('The search is still running. Try again when it stops.');
  const a = clean(answer, 300), w = clean(what_counts, 500);
  if (!a && !w) throw new AiError('Type an answer first.');
  if (a) r.answer = a;
  if (w) { r.what_counts_owner = w; r.what_counts = w; }
  if (r.status === 'asking' || !r.planned) { r.status = 'running'; r.stop = ''; if (r.question) r.asked = r.question; r.question = ''; saveResult(db, id, r); runPlan(db, id, log); }
  else saveResult(db, id, r);
}
// An older research (no plan yet): make the plan and add the free database's members.
export function addFromDatabase(db, id, { log = () => {} } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running' || r.status === 'checking') return;
  r.status = 'running'; r.stop = ''; r.closed = false; r.wikidata_done = false;
  saveResult(db, id, r);
  runPlan(db, id, log);
}

// ---------- Check Who Fits: every person against What Counts (no web search, about a cent per 60 people) ----------
const FIT_SYSTEM = `You check who belongs to a research group. You get WHAT COUNTS (the owner's definition) and a numbered list of people, each with what they are known for. Call give_fit once with every person who does NOT fit, each with a few words why ("knife and truck attack, no shooting"). Be strict: a person whose listed facts, or what is widely known about them, fall under anything What Counts excludes, or who does not meet what it requires, does NOT fit. Leave a person in only when they plainly fit, or when nothing is known that decides it.`;
const FIT_TOOL = { name: 'give_fit', description: 'The people who do not fit.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['misfits'], properties: { misfits: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ref', 'why'], properties: { ref: { type: 'integer' }, why: { type: 'string' } } } } } } };
export function checkFits(db, id, { log = () => {} } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running' || r.status === 'checking') return;
  if (!r.what_counts) throw new AiError('Write What Counts first.');
  for (const p of r.people) delete p.unfit; // every check reads everyone afresh
  r.status = 'checking'; r.checking = { fits: true, total: r.people.length, done: 0, unfit: 0, usd: 0 };
  saveResult(db, id, r);
  (async () => {
    running++;
    try {
      for (let start = 0; ; start += 60) {
        const now = loadResult(db, id); if (!now || now.status !== 'checking') return;
        const batch = now.people.map((p, ref) => ({ p, ref })).slice(start, start + 60);
        if (!batch.length) break;
        // Opus, not Haiku: the first run with Haiku let a truck-and-knife attack and two sniper sprees through (2026-11-24).
        const res = await callModel('reading', { max_tokens: 4000, output_config: { effort: 'low' }, system: FIT_SYSTEM, tools: [FIT_TOOL], messages: [{ role: 'user', content: `WHAT COUNTS: ${now.what_counts}\n\n${batch.map(({ p, ref }) => `${ref}: ${p.known_as} (${p.birth_date || 'no date'}): ${p.why || p.who || ''}`).join('\n')}` }] }, { estimateUsd: 0.01, what: `research #${id} who fits ${start + 1}-${start + batch.length}` });
        const use = (res.message.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_fit');
        const cur = loadResult(db, id); if (!cur) return;
        const refs = new Set(batch.map((b) => b.ref));
        for (const m of (use && use.input && Array.isArray(use.input.misfits) ? use.input.misfits : [])) if (refs.has(Number(m.ref)) && cur.people[m.ref]) { cur.people[m.ref].unfit = clean(m.why, 160); cur.checking.unfit++; }
        cur.checking.done += batch.length; cur.checking.usd = round(cur.checking.usd + res.usd); cur.usd = round(cur.usd + res.usd);
        saveResult(db, id, cur);
      }
      const end = loadResult(db, id);
      if (end && end.status === 'checking') {
        // Who does not fit is taken out of the group (unticked), never deleted: one tap puts them back.
        const row = db.prepare('SELECT off FROM research WHERE id = ?').get(id);
        const off = parse(row && row.off, { p: [], v: [] });
        const offP = new Set(off.p || []); end.people.forEach((p, i) => { if (p.unfit) offP.add(i); });
        db.prepare('UPDATE research SET off = ? WHERE id = ?').run(JSON.stringify({ p: [...offP], v: off.v || [] }), id);
        end.status = 'done'; end.stop = `Checked ${end.checking.total} against What Counts: ${end.checking.unfit} did not fit and were taken out (they stay on the list, unticked).`;
        saveResult(db, id, end);
        log(`research #${id} who fits: ${end.checking.unfit} of ${end.checking.total} taken out, $${end.checking.usd}`);
      }
    } catch (err) {
      const now = loadResult(db, id); if (now) { now.status = 'done'; now.stop = `Checking who fits stopped: ${err.message}`; saveResult(db, id, now); }
      log(`research #${id} who fits FAILED: ${err.message}`);
    } finally { running--; }
  })();
}


// "Keep Going": the owner allows another dollar (or resumes a search the restart cut short).
// More of a group that already exists. `angle` = one narrower slice; `auto` = Search Everything: the plain search, then
// every suggested angle in turn, until DRY_WAYS ways in a row find nobody new; `keep` = carry on exactly as it was
// (after the money stop, or a restart); none of them = the plain search once more. Each call allows one more dollar.
export function moreResearch(db, id, { log = () => {}, angle = '', auto = false, keep = false } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running' || r.status === 'checking') return;
  const a = clean(angle, 60);
  if (a) { r.angle = a; r.auto = false; r.tried = [...new Set([...(r.tried || []), a])]; r.angles = (r.angles || []).filter((x) => !sameName(x, a)); }
  else if (auto) { r.auto = true; r.angle = ''; r.dry_ways = 0; }
  else if (!keep) { r.angle = ''; r.auto = false; }
  r.closed = false;
  r.limit = round(Math.max(r.limit || LIMIT_USD, r.usd) + LIMIT_USD);
  r.status = 'running'; r.stop = '';
  saveResult(db, id, r);
  runRounds(db, id, log);
}
// The same category asked again: the research that already holds it (so the owner adds to it, never starts a twin).
export function findResearch(db, query) {
  const q = clean(query, MAX_QUERY);
  if (!q) return null;
  for (const row of db.prepare('SELECT id, query, category, result FROM research ORDER BY id DESC').all()) {
    const r = parse(row.result, {});
    if (r.status === 'failed') continue;
    if (sameName(row.query, q) || sameName(row.category, q)) return row.id;
  }
  return null;
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
      try { got = await findRound(r.query, { known: r.people.slice(-600).map((p) => p.known_as), personal: r.personal, roundNo: r.rounds + 1, angle: r.angle || '', tried: r.tried || [], counts: r.what_counts || '' }); }
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
      for (const p of unique) if (now.angle) p.angle = now.angle;
      if (got.angles.length) now.angles = got.angles.filter((a) => !(now.tried || []).some((t) => sameName(t, a)));
      now.dropped += got.dropped; now.usd = round(now.usd + got.usd); now.seconds = round(now.seconds + got.seconds); now.calls += got.calls; now.searches += got.searches; now.rounds += 1;
      const dry = unique.length < DRY;
      // Search Everything: a dry way moves on to the next suggested angle by itself, until several in a row are dry.
      let moved = false;
      if (!dry) now.dry_ways = 0;
      if (dry && now.auto) {
        now.dry_ways = (now.dry_ways || 0) + 1;
        const next = (now.angles || []).find((a) => !(now.tried || []).some((t) => sameName(t, a)));
        if (now.dry_ways >= DRY_WAYS) { now.status = 'done'; now.auto = false; now.stop = `${DRY_WAYS} ways of searching in a row found nobody new.`; }
        else if (!next) { now.status = 'done'; now.auto = false; now.stop = 'Every suggested angle has been tried.'; }
        else { now.angle = next; now.tried = [...(now.tried || []), next]; moved = true; }
      } else if (dry) { now.status = 'done'; now.stop = now.rounds === 1 && !unique.length ? 'Nobody was found.' : now.angle ? `No more new ones turned up for “${now.angle}”.` : 'No more new ones turned up searching the plain way.'; }
      saveResult(db, id, now);
      log(`research #${id} "${now.category}" round ${now.rounds}: ${unique.length} new, ${now.people.length} in all, $${now.usd}`);
      rememberResearch({ id, query: now.query, round: now.rounds, category: now.category, personal: now.personal, fresh: unique.length, found: now.people.length, dropped: now.dropped, unchecked: now.people.filter((p) => !p.checked).length, kinds: now.vault_kinds.join(', '), searches: got.searches, usd: got.usd, note: got.note });
      if (dry && !moved) break;
    }
    // The summary is written on the server straight away, so a phone that was away still finds it ready.
    const end = loadResult(db, id);
    if (end && end.people.length >= 3) await writeSummary(db, id).then((sm) => { if (sm.usd) log(`research #${id} summary: $${sm.usd}`); }).catch((err) => log(`research #${id} summary FAILED: ${err.message}`));
  } catch (err) { log(`research #${id} FAILED: ${err && err.message}`); }
  finally { running--; }
}
// ---------- Check the Dates (owner 2026-11-23: "full clarity as to ... how we're doing our research") ----------
// A person whose date came with no web page from the search ("Not Confirmed") is looked up again, in batches:
// the AI must find a page for the name and the date. A date that disagrees is changed and the old one kept
// (`was`); a person with no page found stays Not Confirmed. Through the one paid door, like every search.
const CHECK_BATCH = 10;
export const CHECK_USD_EACH = 0.012;
const CHECK_SYSTEM = `You confirm birth names and birth dates for a numerology app. For EACH person listed, search the web for a reliable page (an encyclopedia, an official biography, major news; a business: its official register) that gives their full birth name and exact birth date (a business: registered name and date of incorporation). Then call give_checks once with one entry per person, in the same order.
- date: YYYY-MM-DD as the page gives it; empty if no page gives the full date. date_source: the URL of that page, from the search results.
- birth_name: the full birth name as the page gives it; empty if not given. name_source: its URL.
- Never fill a date or a name from memory: only from a page the search returned. A page about someone else with the same name does not count.`;
const CHECK_TOOL = { name: 'give_checks', description: 'What the pages say, one entry per person, in order.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['people'], properties: { people: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ref', 'date', 'date_source', 'birth_name', 'name_source'], properties: { ref: { type: 'integer' }, date: { type: 'string' }, date_source: { type: 'string' }, birth_name: { type: 'string' }, name_source: { type: 'string' } } } } } } };
const toCheck = (r) => r.people.map((p, ref) => ({ p, ref })).filter(({ p }) => !p.checked && !p.fixed && !p.check_failed);

export function checkDates(db, id, { log = () => {} } = {}) {
  const r = loadResult(db, id);
  if (!r) throw new AiError('That research is gone.');
  if (r.status === 'running' || r.status === 'checking') return;
  const list = toCheck(r);
  if (!list.length) throw new AiError('Every date here is already confirmed on a web page.');
  r.status = 'checking'; r.checking = { total: list.length, done: 0, changed: 0, confirmed: 0, usd: 0 };
  saveResult(db, id, r);
  runChecks(db, id, log);
}
async function runChecks(db, id, log) {
  running++;
  try {
    for (;;) {
      const r = loadResult(db, id);
      if (!r || r.status !== 'checking') return;
      const batch = toCheck(r).slice(0, CHECK_BATCH);
      if (!batch.length) break;
      const found = new Map();
      let answer = null, usd = 0, err = null;
      const messages = [{ role: 'user', content: batch.map(({ p, ref }) => `ref ${ref}: ${p.known_as}${p.birth_name && p.birth_name !== p.known_as ? ` (birth name given as ${p.birth_name})` : ''}${p.birth_date ? `, date given as ${p.birth_date}` : ''}${p.who ? `, ${p.who}` : ''}${p.kind === 'business' ? ' [a business]' : ''}`).join('\n') }];
      try {
        for (let calls = 1; calls <= 4 && !answer; calls++) {
          const res = await callModel('lookup', { max_tokens: 4000, output_config: { effort: 'low' }, system: CHECK_SYSTEM, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: batch.length + 4 }, CHECK_TOOL], messages },
            { estimateUsd: calls === 1 ? batch.length * CHECK_USD_EACH : 0, what: `research #${id} check ${batch.length} dates call ${calls}` });
          usd += res.usd;
          searchResults(res.message.content, found);
          const use = (res.message.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_checks');
          if (use) { answer = use.input || {}; break; }
          messages.push({ role: 'assistant', content: res.message.content });
          if (res.message.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Now call give_checks.' });
        }
      } catch (e) { err = e; }
      const now = loadResult(db, id); if (!now) return;
      const c = now.checking || { total: batch.length, done: 0, changed: 0, confirmed: 0, usd: 0 };
      c.usd = round(c.usd + usd + ((err && err.usd) || 0)); now.usd = round(now.usd + usd);
      if (err || !answer) {
        now.status = 'done'; now.stop = `Checking the dates stopped: ${err instanceof AiError ? err.message : 'no answer came back'}. Tap Check the Dates to try the rest.`;
        now.checking = c; saveResult(db, id, now);
        log(`research #${id} date check FAILED: ${err ? err.message : 'no answer'}`);
        if (err && !(err instanceof AiError)) throw err;
        return;
      }
      const src = (u) => (u && found.has(u) ? { url: u, site: hostOf(u), title: found.get(u) } : null);
      const byRef = new Map((Array.isArray(answer.people) ? answer.people : []).map((x) => [Number(x.ref), x]));
      for (const { ref } of batch) {
        const p = now.people[ref]; const a = byRef.get(ref);
        const date = a ? validDate(a.date) : '', ds = a && src(a.date_source), name = a ? clean(a.birth_name, 160) : '', ns = a && src(a.name_source);
        c.done++;
        if (!date || !ds) { p.check_failed = true; continue; } // no page for it: stays Not Confirmed, never asked twice
        if (date !== p.birth_date) { p.was = { birth_date: p.birth_date }; p.birth_date = date; c.changed++; }
        if (name && ns && !sameName(name, p.birth_name)) { p.was = { ...(p.was || {}), birth_name: p.birth_name }; p.birth_name = name; p.chart_name = chartName(name, p.kind); }
        p.date_source = ds; if (ns) p.name_source = ns;
        p.checked = true; p.confirmed_later = true; c.confirmed++;
      }
      now.checking = c; saveResult(db, id, now);
      log(`research #${id} checked ${c.done} of ${c.total} dates: ${c.confirmed} confirmed, ${c.changed} changed, $${c.usd}`);
    }
    const end = loadResult(db, id);
    if (end && end.status === 'checking') { const c = end.checking; end.status = 'done'; end.stop = `Checked ${c.total} dates: ${c.confirmed} confirmed on a web page${c.changed ? `, ${c.changed} of them corrected` : ''}${c.total - c.confirmed ? `, ${c.total - c.confirmed} with no page found` : ''}.`; saveResult(db, id, end); }
  } catch (e) { log(`research #${id} date check FAILED: ${e && e.message}`); }
  finally { running--; }
}
// "Done": the What Next? card folds away until the next search or check.
export function closeResearch(db, id) {
  const r = loadResult(db, id);
  if (!r) return false;
  r.closed = true; saveResult(db, id, r); return true;
}

export function reopenResearch(db, id) {
  const r = loadResult(db, id);
  if (!r) return false;
  r.closed = false; saveResult(db, id, r); return true;
}

// At startup: a search that was running when the app restarted is marked interrupted; what it found is kept.
export function recoverResearch(db) {
  let n = 0;
  for (const row of db.prepare('SELECT id, result FROM research').all()) {
    const r = parse(row.result, null);
    if (r && r.status === 'checking') { r.status = 'done'; r.stop = 'The app restarted while checking the dates. Tap Check the Dates again for the rest.'; saveResult(db, row.id, r); n++; }
    if (r && r.status === 'checking' && r.checking && r.checking.fits) { r.status = 'done'; r.stop = 'The app restarted while checking who fits. Tap Check Who Fits again.'; saveResult(db, row.id, r); n++; continue; }
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
  const stored = parse(row.summary, null);
  const summary = stored && stored.v === READING_V ? stored : null; // an older kind of summary is not shown: the reading is written anew
  return { id: row.id, query: r.query, category: r.category, status: r.status || 'done', stop: r.stop || '', closed: !!r.closed, auto: !!r.auto, what_counts: r.what_counts || '', question: r.question || '', planned: !!r.planned, wikidata_used: r.wikidata_used || [], wikidata_done: !!r.wikidata_done, angles: r.angles || [], tried: r.tried || [], angle: r.angle || '', checking: r.checking || null, rounds: r.rounds ?? 1, limit: r.limit || LIMIT_USD, personal: !!r.personal, dropped: r.dropped || 0, note: r.note || '',
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
const COUNTED = new Map(); // research id -> { key, vault, result }
export function researchShares(db, id) {
  const g = getResearch(db, id);
  if (!g) return null;
  const on = g.people.filter((p) => p.on);
  // A name without a date still counts for what a name alone makes (names, life expression, name chart centers ...;
  // owner 2026-11-24: "edge cases where there will only be a person's full legal name").
  const extra = on.filter((p) => p.chart_name).map((p) => ({ name: p.chart_name, ...(dateParts(p.birth_date) || {}), title: p.known_as, ref: p.ref }));
  const ids = g.vault.filter((v) => v.on).map((v) => v.id);
  const key = crypto.createHash('sha1').update(JSON.stringify([extra.map((e) => `${e.name}|${e.day}.${e.month}.${e.year}`).sort(), ids.slice().sort((a, b) => a - b)])).digest('hex').slice(0, 16);
  // The count takes a second or two (hundreds of random groups): kept per research while the group and the vault's
  // charts stay the same, so going back to the screen is instant (owner 2026-11-23: "it sits and loads ... Counting").
  const vaultMark = JSON.stringify(db.prepare('SELECT count(*) n, max(updated_at) t FROM chart_inputs').get());
  const kept = COUNTED.get(id);
  if (kept && kept.key === key && kept.vault === vaultMark) return kept.result;
  // Measured against ordinary people (server/baseline.js), never the rest of the vault (owner 2026-11-24).
  const insights = groupInsights(db, { ids, extra });
  const result = { size: insights.size, rest: insights.rest, tagged: on.length + ids.length, insights, key, undated: on.filter((p) => !p.drawable).length, online: extra.length, from_vault: ids.length };
  COUNTED.set(id, { key, vault: vaultMark, result });
  return result;
}

// ---------- the reading (paid, Opus) ----------
// Collapse and expand (owner 2026-11-23: the first summaries were "pointless ... way too wordy", statistics talk
// and the same thing twice). The counter (insight.js) says what fills the group's charts and where a number leads;
// the model, with the reading guide every chart Reading gets, writes ONE short line of the course's meaning per
// insight and three to five lines that weave them, the way the owner reads a single chart. No statistics words.
// One explanation per card, in the group's context (owner 2026-11-23: "13/4 in a mind center for mass shooters,
// what does that mean? You need to explain it right there"; the separate reading only repeated the cards).
const READING_V = 4;
const READING_SYSTEM = `You explain the findings of a numerology research on a GROUP of people (or businesses) for a trained numerologist. The app counted the group's Chaldean numeroscopes against the owner's vault and hands you the FINDINGS, each with a key, what it is, its counts, and course passages. The COURSE REFERENCE below is how this system reads a chart: what each position governs (the mind center: thought, communication, values; the emotion center or solar plexus: inner emotional life, self-esteem, sex and love life, also called the sexual center; the day: who you are; the life path: the road; the life expression: what you express; the names: how you meet the world; the pillar: the ground you stand on). Call give_reading exactly once, straight away, with no text before it.
- notes: one entry per finding key. line: TWO short sentences, at most 40 words in all, that explain the finding FOR THIS GROUP: first what this number means in that place (in the course's own vocabulary: the archetype, its balanced and unbalanced sides, what that part of the chart governs), then what that says about the group, named by the group's name ("For mass shooters: ..."). A combination is read as the two numbers acting on each other (the owner weaves neighbors: "enthusiastic (19/1) magnetism (15/6)"). A strong influence of a number is read across the whole chart.
- source: the name of the source the meaning came from, as given in brackets.
- Every meaning comes from the course reference or the passages given; nothing invented. When nothing given covers it, give its archetype title and what that part of the chart governs, nothing more.
- Speak of the group as a whole, never a named person, and of what shows up in their charts, never that the numbers cause anything. Never use statistics words (percent, chance, luck, random, sample, significant, likely), never hedge, no preamble. Numbers as the course writes them: 18/9, one-digit numbers plain.`;
const READING_TOOL = { name: 'give_reading', description: 'One explanation per finding, in the group\'s context.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['notes'], properties: {
  notes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'line', 'source'], properties: { key: { type: 'string' }, line: { type: 'string' }, source: { type: 'string' } } } },
} } };

const block = (p) => `[${p.book || p.title}${p.heading ? ` > ${String(p.heading).split(' > ').pop()}` : ''}${p.page ? `, p. ${p.page}` : ''}]\n${p.text}`;

// What the model gets: the insights with their counts and the course's words on those numbers. null = nothing leads.
export function summaryContext(g, s) {
  const ins = { expand: [], combos: [], collapse: [], ...(s.insights || {}) };
  if (!ins.expand.length && !ins.combos.length && !ins.collapse.length) return null;
  const lines = [`THE GROUP: ${g.category}. ${ins.size} charts read.`, 'THE FINDINGS']; // one list: the screen shows them in this order
  const words = [];
  const seen = new Set();
  const addWords = (title, bits, passages) => {
    const ps = (passages || []).filter((p) => { const k = `${p.source}|${String(p.text).slice(0, 80)}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const pts = bits && bits.groups ? bits.groups.map((x) => x.points.map((t) => `- ${t.replace(/\*\*/g, '')}`).join('\n')).join('\n') : '';
    if (pts || ps.length) words.push(`\n${title}`, pts, ...ps.map(block));
  };
  const spotWords = (i) => {
    const [chart, position] = i.pos.split('.');
    if (i.num.startsWith('/')) { const n = Number(i.num.slice(1)); addWords(`COURSE PASSAGES ON ${n} (general, may be about other positions)`, null, chunksFor(n, null, 2)); return; }
    let m = null;
    try { m = meaningFor({ chart, position, sum: Number(i.num), pair: [], rel: [] }); } catch { m = null; }
    if (m && ((m.bits && m.bits.groups && m.bits.groups.length) || (m.passages && m.passages.length))) addWords(`THE COURSE ON ${i.number} AS THE ${i.name.toUpperCase()}`, m.bits, (m.passages || []).slice(0, 2));
    else addWords(`COURSE PASSAGES ON ${i.number} (general, not about this position)`, null, chunksFor(Number(i.num), null, 2));
  };
  const say = (i) => `- key ${i.key}: ${i.head}${i.kind === 'number' ? ` (${i.big})` : ''}. ${i.count}. ${i.detail}${i.level === 'solid' ? ' [SOLID: random groups almost never show this]' : i.level === 'strong' ? ' [a strong lean, not yet solid]' : ' [only a lean: say it lightly, in a few words]'}`;
  lines.push('', 'EXPAND (the strong positions of every chart together)');
  for (const i of ins.expand) {
    lines.push(say(i));
    if (i.kind === 'number') addWords(`COURSE PASSAGES ON ${i.big} (general)`, null, chunksFor(i.sum, null, 3));
    else addWords(`COURSE PASSAGES ON ${i.d} (general)`, null, chunksFor(i.d, null, 3));
  }
  if (!ins.expand.length) lines.push('- nothing fills the charts as a whole');
  lines.push('', 'COMBINATIONS (the two numbers that make a diamond or center, read together: "8 + 15/6")');
  for (const i of ins.combos) {
    lines.push(say(i));
    // The course on the pair: passages on the one number that also name the other.
    const other = new RegExp(`(^|[^0-9/])${i.b}(?![0-9])`); // a = the first side's number, b = the second's (a family side is its digit)
    addWords(`COURSE PASSAGES ON ${i.big}`, null, chunksFor(i.a, null, 40).filter((c) => other.test(c.text)).slice(0, 2));
  }
  if (!ins.combos.length) lines.push('- no combination stands out');
  lines.push('', 'COLLAPSE (one part of the chart)');
  for (const i of ins.collapse) { lines.push(say(i)); for (const it of (i.items || []).slice(0, 4)) spotWords(it); }
  if (!ins.collapse.length) lines.push('- no single place stands out');
  let text = [...lines, '', 'COURSE PASSAGES', ...words.filter(Boolean)].join('\n');
  if (text.length > MAX_CONTEXT) text = text.slice(0, MAX_CONTEXT);
  return { text, finds: ins.expand.length + ins.combos.length + ins.collapse.length, keys: [...ins.expand, ...ins.combos, ...ins.collapse].map((i) => i.key) };
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
  if (s.size < 3) return save({ v: READING_V, key: s.key, lines: [], notes: [], none: 'small', usd: 0, size: s.size, at: new Date().toISOString() });
  const ctx = summaryContext(g, s);
  const base = { v: READING_V, key: s.key, size: s.size, at: new Date().toISOString() };
  if (!ctx) return save({ ...base, lines: [], notes: [], none: 'nothing', usd: 0 });
  const core = coreText();
  const est = estimate('reading', { inputChars: READING_SYSTEM.length + core.length + ctx.text.length, outputTokens: 700 });
  running++;
  try {
    const { message, usd, seconds } = await callModel('reading', {
      // 3000 was too few for twelve cards: the answer was cut off before the reading (2026-11-23, 24 cents lost).
      max_tokens: 10000, output_config: { effort: 'medium' },
      system: [{ type: 'text', text: READING_SYSTEM }, ...(core ? [{ type: 'text', text: core, cache_control: { type: 'ephemeral' } }] : [])],
      tools: [READING_TOOL], // no forced tool_choice: Opus 5.5 refuses it (400, 2026-11-23); the prompt says call it once
      messages: [{ role: 'user', content: ctx.text }],
    }, { estimateUsd: est, what: `research reading #${id} (${ctx.finds} insights)` });
    if (message.stop_reason === 'refusal') throw new AiError('The AI declined to write this reading.');
    if (message.stop_reason === 'max_tokens') throw new AiError('The reading was cut off before it was finished. Try again.');
    const use = (message.content || []).find((b) => b.type === 'tool_use' && b.name === 'give_reading');
    const input = use && use.input ? use.input : null;
    const notes = (input && Array.isArray(input.notes) ? input.notes : []).filter((x) => x && ctx.keys.includes(x.key)).map((x) => ({ key: x.key, line: clean(x.line, 600), source: clean(x.source, 80) })).filter((x) => x.line);
    if (!notes.length) throw new AiError('The explanations came back empty. Try again.');
    return save({ ...base, lines: [], notes, usd: round(usd), seconds, finds: ctx.finds });
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
  if (db) for (const row of db.prepare('SELECT id, query, category, result, summary, usd, created_at FROM research ORDER BY id DESC LIMIT 10').all()) { const r = parse(row.result, {}), sm = parse(row.summary, null); lines.push(`  kept #${row.id} ${row.created_at} "${row.query}" → ${row.category}: ${(r.people || []).length} found in ${r.rounds || 1} round(s), ${r.status || 'done'}${r.stop ? ` (${r.stop})` : ''}, $${round(row.usd)} of limit $${(r.limit || LIMIT_USD).toFixed(2)}; reading ${sm ? (sm.v !== READING_V ? 'an older kind, to be rewritten' : sm.lines && sm.lines.length ? `written $${sm.usd}` : `none (${sm.none})`) : 'not written'}`); }
  return lines;
}
export const RESEARCH_TOOLS = [GROUP_TOOL];
