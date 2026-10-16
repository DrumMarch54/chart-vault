// "Ask the vault": a question in plain words ("five charts most influenced by 8", "who has 16 in a center
// and a 1 life path", "the five worst charts") answered by Claude Haiku 5.5 with tools that run the app's
// own searches (server/queries.js, server/positions.js, server/facts.js). The model never sees the whole
// database: it asks the tools and gets back ids, names and numbers. The answer carries the ids to show.
import { callModel, textOf, AiError, estimate } from './ai.js';
import { CHARTS, POSITIONS, positionCounts, getInputs, valuesFor } from './positions.js';
import { listImages } from './queries.js';
import { rankCharts } from './facts.js';

const MAX_QUESTION = 400;
const MAX_TURNS = 8;

const CATALOG = CHARTS.map((c) => `${c.key} (${c.label}): ${POSITIONS.filter((p) => p.chart === c.key && !p.hidden).map((p) => `${p.key} = ${p.label}`).join('; ')}`).join('\n');

const SYSTEM = `You answer questions about a private collection of numerology charts (Chaldean five-chart numeroscopes). You have tools that search the collection; use them, never guess numbers or names. A compound number like 15/6 has sum 15 and digit sum 6; a one-digit number means a digit sum. "Center" means the mind center (heart) or the emotion center (solar); "LP" is the life path; "LE" the life expression; "worst" or "most unbalanced" means rank_charts by imbalance (the rule-based score: unbalanced numbers 11, 12, 16, 18 and the compromises of each position, weighted by how much the position counts); "most influenced by N" means rank_charts by influence with that number.
Charts and positions (chart key, then position keys):
${CATALOG}
Work in as few tool calls as you can. When you have the charts to show, call show_charts with their ids (at most 30) and then answer in 1 to 4 short sentences, in plain American English, naming people by the name the tools returned and numbers like 15/6. If nothing matches, say so and show nothing. Never make up a chart.`;

const TOOLS = [
  { name: 'find_charts', description: 'Charts holding a number in a position. chart "*" = any chart; position "*" = any position of that chart. ds true matches the digit sum instead of the exact compound number. Returns ids, names and how many matched.',
    input_schema: { type: 'object', properties: { chart: { type: 'string' }, position: { type: 'string' }, number: { type: 'integer', minimum: 1, maximum: 99 }, ds: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['number'], additionalProperties: false }, strict: true },
  { name: 'count_by_position', description: 'How many charts hold a number in each position of each chart (a quick overview before find_charts).',
    input_schema: { type: 'object', properties: { number: { type: 'integer', minimum: 1, maximum: 99 }, ds: { type: 'boolean' } }, required: ['number'], additionalProperties: false }, strict: true },
  { name: 'rank_charts', description: 'Rank charts by a rule-based score. by "imbalance" (worst first when order is desc) or "influence" of a number (needs number: a digit 1-9 or a compound 10-99). Returns ids, names, score and why.',
    input_schema: { type: 'object', properties: { by: { type: 'string', enum: ['imbalance', 'influence'] }, number: { type: 'integer', minimum: 1, maximum: 99 }, order: { type: 'string', enum: ['desc', 'asc'] }, limit: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['by'], additionalProperties: false }, strict: true },
  { name: 'chart_numbers', description: 'Every number of every position of one chart, by id, with the typed name and date.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'], additionalProperties: false }, strict: true },
  { name: 'find_people', description: 'Charts whose name matches a word (word-start match on the name under the thumbnail).',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['name'], additionalProperties: false }, strict: true },
  { name: 'show_charts', description: 'The charts to show the owner as the answer, in order. Call once, right before the final answer.',
    input_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'integer' }, maxItems: 30 } }, required: ['ids'], additionalProperties: false }, strict: true },
];
const CHART_KEYS = new Set(['*', ...CHARTS.map((c) => c.key)]);

function brief(db, rows) {
  return rows.map((r) => ({ id: r.id, name: r.title || r.filename, born: (({ day, month, year } = {}) => (day && month && year ? `${day}.${month}.${year}` : null))(getInputs(db, r.id) || {}) }));
}
function runTool(db, name, input, shown) {
  switch (name) {
    case 'find_charts': {
      const chart = CHART_KEYS.has(input.chart) ? input.chart : '*';
      const position = input.position && /^[A-Za-z*]+$/.test(input.position) ? input.position : '*';
      const r = listImages(db, { position: { chart, position, number: input.number, ds: !!input.ds }, limit: Math.min(input.limit || 20, 50) });
      return { matched: r.total, charts: brief(db, r.items) };
    }
    case 'count_by_position': return positionCounts(db, { number: input.number, ds: !!input.ds });
    case 'rank_charts': {
      if (input.by === 'influence' && !input.number) return { error: 'influence needs a number' };
      const ranked = rankCharts(db, { by: input.by, number: input.number || null, order: input.order || 'desc', limit: Math.min(input.limit || 5, 30) });
      const ids = ranked.map((r) => r.id);
      const rows = ids.length ? listImages(db, { ids, limit: 50 }).items : [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      return { charts: ranked.map((r) => ({ ...brief(db, [byId.get(r.id) || { id: r.id, filename: `#${r.id}` }])[0], score: r.score, why: r.why })) };
    }
    case 'chart_numbers': {
      const inp = getInputs(db, input.id);
      if (!inp) return { error: 'no numbers for this chart' };
      const img = listImages(db, { ids: [input.id], limit: 1 }).items[0];
      return { name: img ? img.title || img.filename : `#${input.id}`, typed: inp, charts: valuesFor(db, input.id).map((c) => ({ chart: c.label, values: c.values.map((v) => `${v.label}${v.n ? ' ' + (v.n + 1) : ''} ${v.sum < 10 ? v.sum : v.text}`) })) };
    }
    case 'find_people': {
      const r = listImages(db, { name: String(input.name || '').slice(0, 80), limit: Math.min(input.limit || 20, 50) });
      return { matched: r.total, charts: brief(db, r.items) };
    }
    case 'show_charts': {
      const ids = (input.ids || []).filter((n) => Number.isInteger(n)).slice(0, 30);
      shown.splice(0, shown.length, ...ids);
      return { ok: true, shown: ids.length };
    }
    default: return { error: `unknown tool ${name}` };
  }
}

export async function askVault(db, question) {
  const q = String(question || '').trim().replace(/\s+/g, ' ');
  if (!q) throw new AiError('Type a question first.');
  if (q.length > MAX_QUESTION) throw new AiError(`Keep the question under ${MAX_QUESTION} characters.`);
  const messages = [{ role: 'user', content: q }];
  const shown = [];
  let usd = 0, seconds = 0, turns = 0, text = '';
  const est = estimate('ask', { inputChars: SYSTEM.length + 4000, outputTokens: 800 }) * 3;
  while (turns < MAX_TURNS) {
    turns++;
    const r = await callModel('ask', { max_tokens: 2000, output_config: { effort: 'low' }, system: SYSTEM, tools: TOOLS, messages }, { estimateUsd: turns === 1 ? est : 0, what: `ask turn ${turns}` });
    usd += r.usd; seconds += r.seconds;
    const msg = r.message;
    if (msg.stop_reason === 'refusal') throw new AiError('The AI declined to answer this question.');
    const uses = (msg.content || []).filter((b) => b.type === 'tool_use');
    text = textOf(msg) || text;
    if (msg.stop_reason !== 'tool_use' || !uses.length) break;
    messages.push({ role: 'assistant', content: msg.content });
    messages.push({ role: 'user', content: uses.map((u) => {
      let out;
      try { out = runTool(db, u.name, u.input || {}, shown); } catch (err) { out = { error: String(err && err.message || err) }; }
      return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out).slice(0, 20000) };
    }) });
  }
  if (!text) text = shown.length ? `${shown.length} chart${shown.length === 1 ? '' : 's'} found.` : 'No answer came back. Try asking another way.';
  const items = shown.length ? listImages(db, { ids: shown, limit: 50 }).items : [];
  const order = new Map(shown.map((id, i) => [id, i]));
  items.sort((a, b) => order.get(a.id) - order.get(b.id));
  return { question: q, answer: text, ids: shown, items, usd: Math.round(usd * 10000) / 10000, seconds, turns };
}
export const ASK_TOOLS = TOOLS;
