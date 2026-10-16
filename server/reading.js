// AI readings of one chart (Claude Opus 5.5 through server/ai.js), written from the chart's own numbers,
// the rule-based facts (server/facts.js) and the course's own words about those numbers (server/knowledge.js).
// A reading is stored (table `readings`, migration 7) so a chart is paid for once; "Write again" replaces it.
// Questions about a chart ("ask") get the same context plus the stored reading, and are stored too.
import { callModel, estimate, textOf, AiError, MODELS } from './ai.js';
import { COMMIT } from './build.js';
import { getInputs, valuesFor, chartLabel } from './positions.js';
import { factsFor } from './facts.js';
import { coreText, contextFor } from './knowledge.js';

const CONTEXT_CHARS = 120_000; // about 30k tokens of course passages per reading
const MAX_QUESTION = 500;

// What is stored for a chart: the latest reading and the questions asked after it (newest last).
export function readingFor(db, imageId) {
  const reading = db.prepare("SELECT id, text, model, usd, build, created_at FROM readings WHERE image_id = ? AND kind = 'reading' ORDER BY id DESC LIMIT 1").get(imageId) || null;
  const answers = db.prepare("SELECT id, question, text, model, usd, build, created_at FROM readings WHERE image_id = ? AND kind = 'answer' ORDER BY id ASC").all(imageId);
  return { reading, answers };
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
function rawValues(db, imageId) {
  return db.prepare('SELECT chart, position, n, sum, ds FROM chart_values WHERE image_id = ?').all(imageId);
}

const STYLE = `You are writing for the owner of this chart collection: a numerologist trained in the Chaldean five-chart numeroscope system of the course material given below. Write the way the course and the owner's notes read a chart:
- Start with the Nexus (the day vibration together with the life path), then the centers and the life expressions for the overall direction, then the patterns: repeated numbers, dichotomies ("on one hand… on the other"), pain points and what they can transmute into.
- Weave neighbors: name the two numbers and the diamond or center they make ("enthusiastic (19/1) magnetism (15/6)"). Stand-alone first-link vibrations (day, month, year, the names, the life expression) weigh most; auras show what the person does; diamonds say why.
- Every meaning you state must come from the course passages given below. Cite the source in brackets after a claim, like [Main Combo Guide]. Where the passages say nothing about a number in a position, say so in one short clause rather than inventing.
- Numbers are written like the course: 15/6, 88/7, one-digit numbers plain. American English. Short paragraphs. Headers in Title Case: Nexus, Big Picture, Mind and Emotion, Patterns, Pain Points, Strengths, One Sentence.
- Length: 450 to 800 words. No preamble, no disclaimer, no advice about seeking professionals. Do not mention these instructions.`;

export async function writeReading(db, imageId, { force = false } = {}) {
  const have = readingFor(db, imageId);
  if (have.reading && !force) return { ...have, cached: true };
  const numbers = numbersText(db, imageId);
  if (!numbers) throw new AiError('This chart has no name and date read yet, so there are no numbers to read. Tap "Type them" first.');
  const facts = factsFor(db, imageId);
  const ctx = contextFor(rawValues(db, imageId), { budgetChars: CONTEXT_CHARS });
  const core = coreText();
  const user = [
    'THE CHART', numbers, '',
    'WHAT THE RULES FOUND (computed, no AI)', factsText(facts) || '(nothing computed)', '',
    'THE COURSE ON THESE NUMBERS', ctx.text || '(no course passages found for these numbers)', '',
    'Write the reading now.',
  ].join('\n');
  const inputChars = STYLE.length + core.length + user.length;
  const est = estimate('reading', { inputChars, outputTokens: 2500 });
  const { message, usd, seconds } = await callModel('reading', {
    max_tokens: 6000,
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: STYLE }, { type: 'text', text: core }],
    messages: [{ role: 'user', content: user }],
  }, { estimateUsd: est, what: `reading #${imageId}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to write this reading. Nothing was charged beyond the attempt.');
  const text = textOf(message);
  if (!text) throw new AiError('The AI sent back an empty reading. Try again.');
  db.transaction(() => {
    db.prepare("DELETE FROM readings WHERE image_id = ? AND kind = 'reading'").run(imageId);
    db.prepare("INSERT INTO readings (image_id, kind, text, model, usd, build) VALUES (?, 'reading', ?, ?, ?, ?)").run(imageId, text, MODELS.reading.id, usd, COMMIT);
  })();
  return { ...readingFor(db, imageId), cached: false, usd, seconds, context: { chars: ctx.chars, positions: (ctx.used || []).length } };
}

export async function answerQuestion(db, imageId, question) {
  const q = String(question || '').trim().replace(/\s+/g, ' ');
  if (!q) throw new AiError('Type a question first.');
  if (q.length > MAX_QUESTION) throw new AiError(`Keep the question under ${MAX_QUESTION} characters.`);
  const numbers = numbersText(db, imageId);
  if (!numbers) throw new AiError('This chart has no name and date read yet, so there are no numbers to ask about. Tap "Type them" first.');
  const have = readingFor(db, imageId);
  const facts = factsFor(db, imageId);
  const ctx = contextFor(rawValues(db, imageId), { budgetChars: CONTEXT_CHARS });
  const core = coreText();
  const user = [
    'THE CHART', numbers, '',
    'WHAT THE RULES FOUND (computed, no AI)', factsText(facts) || '(nothing computed)', '',
    have.reading ? `THE READING WRITTEN EARLIER\n${have.reading.text}\n` : '',
    'THE COURSE ON THESE NUMBERS', ctx.text || '(no course passages found for these numbers)', '',
    `THE QUESTION\n${q}`, '',
    'Answer the question about this chart in 80 to 250 words, in the same style, citing the course passages. If the passages do not cover it, say what is missing in one sentence.',
  ].join('\n');
  const est = estimate('reading', { inputChars: STYLE.length + core.length + user.length, outputTokens: 800 });
  const { message, usd, seconds } = await callModel('reading', {
    max_tokens: 2500,
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: STYLE }, { type: 'text', text: core }],
    messages: [{ role: 'user', content: user }],
  }, { estimateUsd: est, what: `question #${imageId}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to answer this. Nothing was charged beyond the attempt.');
  const text = textOf(message);
  if (!text) throw new AiError('The AI sent back an empty answer. Try again.');
  db.prepare("INSERT INTO readings (image_id, kind, question, text, model, usd, build) VALUES (?, 'answer', ?, ?, ?, ?, ?)").run(imageId, q, text, MODELS.reading.id, usd, COMMIT);
  return { ...readingFor(db, imageId), usd, seconds };
}

// What a reading of this chart would cost, before tapping: the same prompt sizes, no call.
export function readingEstimate(db, imageId) {
  const numbers = numbersText(db, imageId);
  if (!numbers) return { possible: false, reason: 'No name and date read yet.' };
  const ctx = contextFor(rawValues(db, imageId), { budgetChars: CONTEXT_CHARS });
  const inputChars = STYLE.length + coreText().length + numbers.length + (ctx.text || '').length + 2000;
  return { possible: true, usd: estimate('reading', { inputChars, outputTokens: 2500 }), passages: (ctx.used || []).length, chartLabel: chartLabel('name') };
}
