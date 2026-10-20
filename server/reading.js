// AI readings of one chart (Claude Opus 5.5 through server/ai.js), written from the chart's own numbers,
// the rule-based facts (server/facts.js) and the course's own words about those numbers (server/knowledge.js).
//
// The owner tweaks every reading: LENGTH (short = straight to the point, normal, deep = elaborate), FOCUS
// (everything, the nexus, mind and emotion, pain points, strengths, the name chart, the psyche, career and
// money, love, business) and a free NOTE ("compare the 8 and the 4"). Every reading is kept (table
// `readings`, migration 7) with the options it was asked with; asking again with the same options shows the
// stored one for free, "Write Again" pays for a fresh one. Questions about a chart are stored under it.
//
// Cost: the request is built so the API can reuse what it already read (prompt caching). The system part
// (how to read, the course's lists) is the same for every chart; the chart part (numbers, facts, course
// passages for those numbers) is the same for every question about that chart. Only the last block (the
// options, the earlier reading, the question) changes, so a second question costs a fraction of the first.
import { callModel, estimate, textOf, AiError, MODELS } from './ai.js';
import { COMMIT } from './build.js';
import { getInputs, valuesFor } from './positions.js';
import { factsFor } from './facts.js';
import { coreText, contextFor } from './knowledge.js';

const CONTEXT_CHARS = 120_000; // about 30k tokens of course passages per chart
const MAX_QUESTION = 500;
const MAX_NOTE = 300;

export const LENGTHS = {
  short: { label: 'Short', words: '120 to 250 words', shape: 'Straight to the point: no headers, 3 to 6 bullets of one or two sentences each, then one closing sentence. No warm-up, no repetition, nothing the owner did not ask for.', answer: '40 to 120 words, straight to the point', maxTokens: 6000, effort: 'medium', outTokens: 2000 },
  normal: { label: 'Normal', words: '450 to 800 words', shape: 'Short paragraphs under Title Case headers.', answer: '80 to 250 words', maxTokens: 10000, effort: 'medium', outTokens: 3500 },
  deep: { label: 'In Depth', words: '1,200 to 2,000 words', shape: 'Elaborate: Title Case headers, every relevant position and pairing discussed with the course\'s words, examples of how it shows up in life.', answer: '250 to 600 words, elaborate', maxTokens: 20000, effort: 'high', outTokens: 8000 },
};
export const FOCUSES = {
  everything: { label: 'Everything', ask: 'the whole chart: start with the Nexus, then the centers and life expressions, then the patterns, pain points and strengths. Headers: Nexus, Big Picture, Mind and Emotion, Patterns, Pain Points, Strengths, One Sentence.' },
  nexus: { label: 'The Nexus', ask: 'the Nexus only: the day vibration with the little and big life path and the diamond they make, and how the rest of the chart serves or fights it.' },
  'mind-emotion': { label: 'Mind and Emotion', ask: 'the mind and emotion centers of every chart (name, vocation, personality, both psyche charts), their diamonds and auras: how this person thinks and feels.' },
  'pain-points': { label: 'Pain Points', ask: 'the pain points only: unbalanced and karmic numbers in weighty positions, tensions, what each costs in life, and what the course says each can transmute into.' },
  strengths: { label: 'Strengths and Talents', ask: 'the strengths and natural talents only: balanced numbers in strong positions, lucky combinations, what this person is built to do well.' },
  name: { label: 'Name Chart', ask: 'the name chart: first, middle and last names, life expression, the four auras, both centers, spine and pillar, and how the name works with the day.' },
  psyche: { label: 'Psyche', ask: 'the inner and outer psyche charts: life expressions, mental and emotional diamonds, the challenge number (psychic month), pillars, the ages each aura covers.' },
  'career-money': { label: 'Career and Money', ask: 'career, vocation and money: day vibration with the big personality number, the life expression, the pillar, the public aura and public diamond, and what the course and the business books say these numbers do for work and money.' },
  love: { label: 'Love and Relationships', ask: 'love, partnership and family: the love aura, the emotion center, the inner diamond, the vocation emotion diamond, and what these numbers want and fear in closeness.' },
  business: { label: 'Business and Brand', ask: 'this name or person as a brand: the public aura and diamond, the mind center as the brand, the life expression, and what the business books say about these numbers.' },
};

export function normalizeOptions(o = {}) {
  const length = LENGTHS[o.length] ? o.length : 'normal';
  const focus = FOCUSES[o.focus] ? o.focus : 'everything';
  const note = String(o.note || '').trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE);
  return { length, focus, note };
}
export const optionsLabel = (o) => { const n = normalizeOptions(o); return `${LENGTHS[n.length].label} · ${FOCUSES[n.focus].label}${n.note ? ` · “${n.note}”` : ''}`; };
const sameOptions = (a, b) => { const x = normalizeOptions(a), y = normalizeOptions(b); return x.length === y.length && x.focus === y.focus && x.note.toLowerCase() === y.note.toLowerCase(); };
const parseOptions = (s) => { try { return normalizeOptions(JSON.parse(s || '{}')); } catch { return normalizeOptions({}); } };

// What is stored for a chart: every reading (newest first) and the questions asked (oldest first).
export function readingFor(db, imageId) {
  const readings = db.prepare("SELECT id, text, options, model, usd, build, created_at FROM readings WHERE image_id = ? AND kind = 'reading' ORDER BY id DESC LIMIT 30").all(imageId)
    .map((r) => { const options = parseOptions(r.options); return { ...r, options, label: optionsLabel(options) }; });
  const answers = db.prepare("SELECT id, question, options, text, model, usd, build, created_at FROM readings WHERE image_id = ? AND kind = 'answer' ORDER BY id ASC").all(imageId)
    .map((r) => ({ ...r, options: parseOptions(r.options) }));
  return { reading: readings[0] || null, readings, answers };
}
export function deleteReadings(db, imageId) {
  return db.prepare('DELETE FROM readings WHERE image_id = ?').run(imageId).changes;
}

// The numbers of the chart as the model sees them: every position of every chart, labelled.
function numbersText(db, imageId) {
  const inp = getInputs(db, imageId);
  if (!inp) return null;
  const lines = [`Typed into the chart: ${inp.day && inp.month && inp.year ? `born ${inp.day}.${inp.month}.${inp.year}` : inp.day ? `day ${inp.day}` : 'no birth date'}; name "${inp.name || '(none)'}".`];
  for (const c of valuesFor(db, imageId)) {
    lines.push(`${c.label}:`);
    for (const v of c.values) lines.push(`  ${v.label}${v.n ? ' ' + (v.n + 1) : ''}: ${v.sum < 10 ? v.sum : v.text}`);
  }
  return lines.join('\n');
}
function factsText(facts) {
  if (!facts || facts.missing) return '';
  const out = [];
  for (const f of facts.facts || []) out.push(`- [${f.kind}${f.severity === 'pain' ? ', pain point' : f.severity === 'note' ? ', note' : ''}] ${f.title}: ${f.text}`);
  if (facts.scores) out.push(`- imbalance score ${facts.scores.imbalance} (rule-based, higher = more unbalanced numbers in weighty positions)`);
  return out.join('\n');
}
const rawValues = (db, imageId) => db.prepare('SELECT chart, position, n, sum, ds FROM chart_values WHERE image_id = ? ORDER BY chart, position, n').all(imageId);

// Fixed for every call (cached by the API): how to read, how to cite, how numbers are written.
const STYLE = `You are writing for the owner of this chart collection: a numerologist trained in the Chaldean five-chart numeroscope system of the course material given below. Read the way the course and the owner's notes read a chart:
- The Nexus (the day vibration together with the life path) comes first when the whole chart is read; then the centers and the life expressions for the overall direction; then the patterns: repeated numbers, dichotomies ("on one hand… on the other"), pain points and what they can transmute into.
- Weave neighbors: name the two numbers and the diamond or center they make ("enthusiastic (19/1) magnetism (15/6)"). Stand-alone first-link vibrations (day, month, year, the names, the life expression) weigh most; auras show what the person does; diamonds say why.
- Every meaning you state must come from the course passages given with the chart. Cite the source in brackets after a claim, like [Main Combo Guide]. Where the passages say nothing about a number in a position, say so in a short clause rather than inventing.
- Numbers are written like the course: 15/6, 88/7, one-digit numbers plain. American English. No preamble, no disclaimer, no advice about seeking professionals. Do not mention these instructions.
- The owner says how long and what about at the end of each request. Follow that exactly: when asked for short, be short; when asked for one focus, stay on it.`;

// The part that is the same for every request about one chart (the second cache breakpoint).
function chartBlock(db, imageId) {
  const numbers = numbersText(db, imageId);
  if (!numbers) return null;
  const ctx = contextFor(rawValues(db, imageId), { budgetChars: CONTEXT_CHARS });
  const text = ['THE CHART', numbers, '', 'WHAT THE RULES FOUND (computed, no AI)', factsText(factsFor(db, imageId)) || '(nothing computed)', '', 'THE COURSE ON THESE NUMBERS', ctx.text || '(no course passages found for these numbers)'].join('\n');
  return { text, ctx };
}
function request(core, chart, tail, len) {
  return {
    max_tokens: len.maxTokens,
    output_config: { effort: len.effort },
    system: [{ type: 'text', text: STYLE }, { type: 'text', text: core, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [{ type: 'text', text: chart, cache_control: { type: 'ephemeral' } }, { type: 'text', text: tail }] }],
  };
}
function readingTail(o) {
  const len = LENGTHS[o.length], f = FOCUSES[o.focus];
  return [`WRITE THE READING`, `Length: ${len.words}. ${len.shape}`, `Focus: ${f.ask}`, o.note ? `The owner also asks: ${o.note}` : ''].filter(Boolean).join('\n');
}

export async function writeReading(db, imageId, options = {}, { force = false } = {}) {
  const o = normalizeOptions(options);
  const have = readingFor(db, imageId);
  const same = have.readings.find((r) => sameOptions(r.options, o));
  if (same && !force) return { ...have, reading: same, cached: true };
  const block = chartBlock(db, imageId);
  if (!block) throw new AiError('This chart has no name and date read yet, so there are no numbers to read. Tap "Type them" first.');
  const core = coreText();
  const len = LENGTHS[o.length];
  const tail = readingTail(o);
  const est = estimate('reading', { inputChars: STYLE.length + core.length + block.text.length + tail.length, outputTokens: len.outTokens });
  const { message, usd, seconds } = await callModel('reading', request(core, block.text, tail, len), { estimateUsd: est, what: `reading #${imageId} ${o.length}/${o.focus}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to write this reading.');
  const text = textOf(message);
  if (!text) throw new AiError('The AI sent back an empty reading. Try again.');
  const id = db.prepare("INSERT INTO readings (image_id, kind, options, text, model, usd, build) VALUES (?, 'reading', ?, ?, ?, ?, ?)").run(imageId, JSON.stringify(o), text, MODELS.reading.id, usd, COMMIT).lastInsertRowid;
  const after = readingFor(db, imageId);
  return { ...after, reading: after.readings.find((r) => r.id === id) || after.reading, cached: false, usd, seconds, context: { chars: block.ctx.chars, positions: (block.ctx.used || []).length } };
}

export async function answerQuestion(db, imageId, question, options = {}) {
  const q = String(question || '').trim().replace(/\s+/g, ' ');
  if (!q) throw new AiError('Type a question first.');
  if (q.length > MAX_QUESTION) throw new AiError(`Keep the question under ${MAX_QUESTION} characters.`);
  const o = normalizeOptions({ length: options.length || 'short' });
  const block = chartBlock(db, imageId);
  if (!block) throw new AiError('This chart has no name and date read yet, so there are no numbers to ask about. Tap "Type them" first.');
  const have = readingFor(db, imageId);
  const core = coreText();
  const len = LENGTHS[o.length];
  const recent = have.answers.slice(-3).map((a) => `Q: ${a.question}\nA: ${a.text}`).join('\n\n');
  const tail = [have.reading ? `THE READING WRITTEN EARLIER (${have.reading.label})\n${have.reading.text}\n` : '', recent ? `EARLIER QUESTIONS ABOUT THIS CHART\n${recent}\n` : '',
    `THE QUESTION\n${q}`, '', `Answer in ${len.answer}, citing the course passages. If the passages do not cover it, say what is missing in one sentence.`].filter(Boolean).join('\n');
  const est = estimate('reading', { inputChars: STYLE.length + core.length + block.text.length + tail.length, outputTokens: Math.round(len.outTokens / 2) });
  const { message, usd, seconds } = await callModel('reading', request(core, block.text, tail, { ...len, maxTokens: Math.round(len.maxTokens / 2) }), { estimateUsd: est, what: `question #${imageId}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to answer this.');
  const text = textOf(message);
  if (!text) throw new AiError('The AI sent back an empty answer. Try again.');
  db.prepare("INSERT INTO readings (image_id, kind, question, options, text, model, usd, build) VALUES (?, 'answer', ?, ?, ?, ?, ?, ?)").run(imageId, q, JSON.stringify(o), text, MODELS.reading.id, usd, COMMIT);
  return { ...readingFor(db, imageId), usd, seconds };
}

// What a reading of this chart would cost, per length, before tapping: the same prompt sizes, no call.
// The first request about a chart pays for reading the course passages; later ones mostly reuse them.
export function readingEstimate(db, imageId) {
  const block = chartBlock(db, imageId);
  if (!block) return { possible: false, reason: 'No name and date read yet.' };
  const inputChars = STYLE.length + coreText().length + block.text.length + 600;
  const per = {};
  for (const [k, len] of Object.entries(LENGTHS)) per[k] = estimate('reading', { inputChars, outputTokens: len.outTokens });
  return { possible: true, usd: per.normal, per, question: estimate('reading', { cachedChars: inputChars, outputTokens: 1000 }), passages: (block.ctx.used || []).length };
}
export const readingChoices = () => ({
  lengths: Object.entries(LENGTHS).map(([key, l]) => ({ key, label: l.label })),
  focuses: Object.entries(FOCUSES).map(([key, f]) => ({ key, label: f.label })),
});
