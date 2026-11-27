// "Write It" on a combination card that is not written yet (owner 2026-11-27: "in the app, I can just click something
// and do an API call to have it interpret ... one at a time ... use Fable on medium effort"). PAID, through the one door
// (server/ai.js callModel, kind 'card' = Claude Fable 5.2, effort medium); the price shows on the button before the tap
// and on the card after it, and lands in Settings → AI Reading under "Combination Cards".
// The model gets exactly what a writing chat reads: the playbook (.brain/numerology/combinations.md), the cards the owner
// graded (combination-cards-graded.md) and the writing brief (tools/combo-cards/BRIEF.md) as a cached system prompt, then
// the pair: both spots and what they are, the course's short points for each number in its spot, the course's words on
// the two numbers together, and each number's general guide. A card is written ONCE per pair (spots + numbers, never
// the person), kept in data/combo-cards-app.json, and free on every chart with that pair after.
import fs from 'node:fs';
import { callModel, estimate, textOf, AiError } from './ai.js';
import { bitsFor, guideFor, shortLabel } from './meaning.js';
import { chartLabel } from './positions.js';
import { spotWhat } from './spot-what.js';
import { knowledgeIndex } from './knowledge.js';
import { validKey } from './combo-notes.js';
import { appCards, saveAppCard } from './combo-store.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => { try { return fs.readFileSync(new URL(rel, ROOT), 'utf8'); } catch { return ''; } };
const ds = (n) => { n = Number(n); while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const fmt = (n) => (n > 9 ? `${n}/${ds(n)}` : String(n));

// --- what the model reads ---
let SYSTEM = null;
function system() {
  if (SYSTEM) return SYSTEM;
  SYSTEM = [
    'You write ONE combination card for a numerology app (Chaldean numerology, the Numerologist PRO course). The owner is a trained numerologist reading on a phone. Follow the writing brief, the playbook and every owner correction below to the letter; match the graded model cards in density and tone. Course words come only from the material given; your own reasoning goes in My Reasoning. Every claim carries its number in brackets. Write "they". Never the word "circle": a center\'s two numbers are "in the center". Two numbers a card. American English.',
    'Return JSON only, in the schema given: phrases (exactly three, Title Case, best first), position (By Position), share ({ title: "What They Share" or "What Sets Them Apart", text }, or an empty title and text when nothing is shared or set apart), course ({ about: who or where the quote is about, text: the quote in double quotes }, or both empty when the material has no words on these two numbers together), reasoning (separate points), best, worst, made (one line when the two make a third number in the chart, else empty), primary ("a" or "b": the more dominant position).',
    '=== WRITING BRIEF (tools/combo-cards/BRIEF.md) ===', read('tools/combo-cards/BRIEF.md'),
    '=== THE PLAYBOOK (.brain/numerology/combinations.md) ===', read('.brain/numerology/combinations.md'),
    '=== THE CARDS THE OWNER GRADED (.brain/numerology/combination-cards-graded.md) ===', read('.brain/numerology/combination-cards-graded.md'),
  ].join('\n\n');
  return SYSTEM;
}
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['phrases', 'position', 'share', 'course', 'reasoning', 'best', 'worst', 'made', 'primary'],
  properties: {
    phrases: { type: 'array', items: { type: 'string' } },
    position: { type: 'string' },
    share: { type: 'object', additionalProperties: false, required: ['title', 'text'], properties: { title: { type: 'string' }, text: { type: 'string' } } },
    course: { type: 'object', additionalProperties: false, required: ['about', 'text'], properties: { about: { type: 'string' }, text: { type: 'string' } } },
    reasoning: { type: 'array', items: { type: 'string' } },
    best: { type: 'string' }, worst: { type: 'string' }, made: { type: 'string' },
    primary: { type: 'string', enum: ['a', 'b'] },
  },
};

const parseKey = (key) => key.split('|').map((side) => { const [spot, sum] = side.split('='); const [chart, position] = spot.split('.'); return { spot, chart, position, sum: Number(sum) }; });
const sideName = (x) => `${chartLabel(x.chart).replace(/ chart$/i, ' Chart')} ${shortLabel(x.chart, x.position)} ${fmt(x.sum)}`;

// The course's words on the two numbers together, by family ("6 and 11/2", "12/3 + 9"), from the combination sources.
function pairWords(a, b) {
  const k = knowledgeIndex();
  const alt = (n) => [...new Set([n, ds(n)])].join('|');
  const re = new RegExp(`(?<![\\d/])(?:${alt(a)})(?:/\\d)?\\s*(?:and|\\+|&|with|beside|next to)\\s*(?:${alt(b)})(?:/\\d)?(?![\\d])|(?<![\\d/])(?:${alt(b)})(?:/\\d)?\\s*(?:and|\\+|&|with|beside|next to)\\s*(?:${alt(a)})(?:/\\d)?(?![\\d])`);
  const out = [];
  for (const c of k.chunks) {
    if (!/^(main-combo-guide|combos-number-notes|name-chart-mind-and-emotion-centers|name-numeroscopes-book|psyche-|relations-book|lecture-relationship)/.test(c.source)) continue;
    for (const para of String(c.text).replace(/\*\*/g, '').split(/\n+/)) if (para.length > 40 && re.test(para)) out.push(`[${c.title || c.source} > ${String(c.heading).split(' > ').pop()}] ${para.slice(0, 700)}`);
  }
  return [...new Set(out)].slice(0, 12).join('\n');
}
function numberIn(x) {
  const b = bitsFor(`${x.chart}.${x.position}:${x.sum}`);
  const g = guideFor(x.sum);
  const lines = [`${sideName(x)}${spotWhat(x.chart, x.position) ? ` — what this spot is: ${spotWhat(x.chart, x.position)}` : ''}`];
  if (b) for (const gr of b.groups) lines.push(`  ${gr.title || 'Points'}: ${gr.points.map((p) => p.replace(/\*\*/g, '')).join(' | ')}`);
  else lines.push('  (the course has no short points for this number in this spot)');
  if (g) lines.push(`  The number in general: ${g.name}${g.alt ? ` (${g.alt})` : ''}. ${String(g.intro || '').replace(/\*\*/g, '').slice(0, 600)}`, ...(g.groups || []).slice(0, 4).map((x) => `  ${x.title}: ${x.points.slice(0, 5).join(' | ').replace(/\*\*/g, '').slice(0, 700)}`));
  return lines.join('\n');
}
export function cardRequest(key) {
  const [a, b] = parseKey(key);
  const user = [`THE PAIR: ${sideName(a)} (a) + ${sideName(b)} (b).`, '', 'EACH NUMBER IN ITS SPOT (the course\'s short points, then the number in general):', numberIn(a), numberIn(b), '',
    'THE COURSE ON THESE TWO NUMBERS TOGETHER (by family; it may be written for another place: say which in "about"):', pairWords(a.sum, b.sum) || '(nothing found)'].join('\n');
  return { a, b, user };
}
export function cardEstimate(key) {
  const { user } = cardRequest(key);
  // the playbook is cached after the first card in five minutes; the first one pays for writing it
  return Math.round((estimate('card', { inputChars: system().length * 1.25 + user.length, outputTokens: 4500 })) * 100) / 100;
}

let WRITING = 0; // cards being written now: the deploy waits (a restart mid-call throws the paid work away)
export const cardsWriting = () => WRITING;
export async function writeCard(key, opts = {}) {
  if (!validKey(key)) throw new AiError('That pair is not one the app knows.');
  if (appCards()[key]) return appCards()[key];
  WRITING++;
  try { return await write(key, opts); } finally { WRITING--; }
}
async function write(key, { label = '' } = {}) {
  const { a, b, user } = cardRequest(key);
  const { message, usd, seconds, model } = await callModel('card', {
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: system(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  }, { estimateUsd: cardEstimate(key), what: `combo card ${label || key}` });
  if (message.stop_reason === 'refusal') throw new AiError('The AI declined to write this card. Nothing else was charged after the decline.');
  let j;
  try { j = JSON.parse(textOf(message)); } catch { throw new AiError(`The AI's answer could not be read (it was charged $${usd.toFixed(2)}). Try again.`); }
  const [first, second] = j.primary === 'b' ? [b, a] : [a, b];
  const card = {
    a: { spot: first.spot, sum: first.sum }, b: { spot: second.spot, sum: second.sum },
    phrases: (j.phrases || []).filter(Boolean).slice(0, 3), position: j.position,
    ...(j.share && j.share.title && j.share.text ? { share: { title: /Apart/.test(j.share.title) ? 'What Sets Them Apart' : 'What They Share', text: j.share.text } } : {}),
    ...(j.course && j.course.text ? { course: { about: j.course.about || '', text: j.course.text } } : {}),
    reasoning: (j.reasoning || []).filter(Boolean), best: j.best, worst: j.worst, ...(j.made ? { made: j.made } : {}),
    by: 'app', model: model.label, usd, seconds, written: new Date().toISOString().slice(0, 10),
  };
  saveAppCard(key, card);
  return card;
}
