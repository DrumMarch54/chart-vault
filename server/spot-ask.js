// Ask About This (owner's ask 2026-11-07): a question typed on a number's meaning page ("what does 12/3 here do to
// love?"), answered by the AI from the course's words for THAT spot only: the passages and short points the page
// shows, the number with its circle partner, the diamonds behind it, and a few more course passages on the number
// for that position's topic. Paid, through the one door (server/ai.js callModel); never called by a test or a tool.
// Answers are not stored: the page keeps them while it is open; every call is in the snapshot's AI calls.
import { callModel, estimate, textOf, AiError } from './ai.js';
import { meaningFor, topicsFor } from './meaning.js';
import { chunksFor } from './knowledge.js';

const MAX_QUESTION = 500;
const MAX_CONTEXT = 40_000; // about 10k tokens: the page's words plus a few more passages

const SYSTEM = `You answer the owner's question about ONE number in ONE position of a Chaldean five-chart numeroscope, as taught in the course whose passages are given. The owner is a trained numerologist reading on a phone.
- Use only the course passages given. Every meaning you state must come from them; cite the source in brackets after the claim, like [Main Combo Guide]. If the passages do not answer the question, say so in one sentence and say what they do cover.
- Keep the course's distinctions: a passage about a different compound (12/3 vs 3, 15/6 vs 6), another position or another chart is NOT about this spot; say so when you use it.
- Numbers are written like the course: 15/6, one-digit numbers plain. American English. Plain words, short paragraphs or a few bullets. No preamble, no disclaimer.
- Length: 60 to 200 words unless the question asks for more.`;

const block = (p) => `[${p.book || p.title}${p.heading ? ` > ${String(p.heading).split(' > ').pop()}` : ''}${p.page ? `, p. ${p.page}` : ''}]\n${p.text}`;
const points = (bits) => (bits ? bits.groups.map((g) => `${g.title ? `${g.title}:\n` : ''}${g.points.map((t) => `- ${t.replace(/\*\*/g, '')}`).join('\n')}`).join('\n') : '');

// The words the model gets, built from the same lookup as the page (server/meaning.js), so the answer stands on
// what the owner can read on the screen, plus up to six more passages on the number for this position's topic.
export function spotContext({ chart, position, sum, pair = [], rel = [] }) {
  const m = meaningFor({ chart, position, sum, pair, rel });
  if (!m) return null;
  const parts = [`THE SPOT: ${m.text} as the ${m.label} of the ${m.chartLabel}${m.name ? ` (${m.name})` : ''}.${m.verdict ? ` The course's balance verdict here: ${m.verdict}.` : ''}`];
  const seen = new Set();
  const add = (title, bits, passages) => {
    const ps = (passages || []).filter((p) => { const k = `${p.source}|${p.text.slice(0, 80)}`; if (seen.has(k)) return false; seen.add(k); return true; });
    if (!bits && !ps.length) return;
    parts.push(`\n${title}`, points(bits), ...ps.map(block));
  };
  add(`THE COURSE ON ${m.text} IN THIS SPOT`, m.bits, m.passages);
  if (m.nameChart) add(`THE NAME CHART'S WORDS ON ${m.text} IN THE SAME CENTER`, m.nameChart.bits, m.nameChart.passages);
  if (m.pair) add(`${m.text} TOGETHER WITH ${m.pair.with.map((x) => x.text).join(' AND ')} IN THIS CIRCLE (the course writes these as a family: points naming other compounds are about those)`, m.pair.bits, m.pair.passages);
  for (const r of m.related) add(`THE DIAMOND BEHIND IT: ${r.label} ${r.text}`, r.bits, r.passages);
  const topic = topicsFor(chart, position)[0] || null;
  const more = chunksFor(sum, topic, 6);
  add(`MORE COURSE PASSAGES ON ${m.text}${topic ? ` (topic: ${topic})` : ''}: may be about other positions; say so if you use them`, null, more);
  let text = parts.filter(Boolean).join('\n\n');
  if (text.length > MAX_CONTEXT) text = text.slice(0, MAX_CONTEXT);
  return { text, label: `${m.text} in the ${m.label} of the ${m.chartLabel}` };
}

export async function askAboutSpot(spot, question) {
  const q = String(question || '').trim().replace(/\s+/g, ' ');
  if (!q) throw new AiError('Type a question first.');
  if (q.length > MAX_QUESTION) throw new AiError(`Keep the question under ${MAX_QUESTION} characters.`);
  const ctx = spotContext(spot);
  if (!ctx) throw new AiError('That position or number is not one the app knows.');
  const est = estimate('reading', { inputChars: SYSTEM.length + ctx.text.length + q.length, outputTokens: 700 });
  const { message, usd, seconds } = await callModel('reading', {
    max_tokens: 3000,
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: ctx.text, cache_control: { type: 'ephemeral' } }, { type: 'text', text: `THE QUESTION\n${q}` }] }],
  }, { estimateUsd: est, what: `spot question ${spot.chart}.${spot.position} ${spot.sum}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to answer this.');
  const text = textOf(message);
  if (!text) throw new AiError('The AI sent back an empty answer. Try again.');
  return { text, usd, seconds, about: ctx.label };
}
