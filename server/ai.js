// The one door to the paid AI (Anthropic). Everything that spends money goes through `callModel` here:
//   - the key, the monthly cap and the spend live in ONE store, data/ai.json. The key never leaves the
//     server: `aiSettings()` says set / not set and the last 4 characters only, and `redact()` blanks it
//     from any text on its way out (snapshot, logs, errors).
//   - every call is recorded (model, tokens, dollars, ok / FAILED, the error verbatim), the last 20 kept
//     in memory for the snapshot, and the dollars are added to this month's spend.
//   - `canSpend()` refuses at the cap and says why; `spendState()` carries the warning for the screens
//     (near = 80 % of the cap or more, over = at the cap). No silent dollar.
// Prices (USD per million tokens, Anthropic list prices 2026-10): the model and the price travel together
// so a wrong price is one line to fix.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { redactionWords } from './auth.js';

export const MODELS = {
  reading: { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  ask: { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};
export const DEFAULT_CAP = 8;
export const WARN_AT = 0.8;

const file = () => path.join(config.dataDir, 'ai.json');
const month = (d = new Date()) => d.toISOString().slice(0, 7);

function load() {
  try { return normalize(JSON.parse(fs.readFileSync(file(), 'utf8'))); } catch { return normalize({}); }
}
function normalize(o) {
  const cap = Number(o.cap);
  return {
    key: typeof o.key === 'string' ? o.key.trim() : '',
    cap: Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_CAP,
    spend: o.spend && typeof o.spend === 'object' ? o.spend : {}, // { '2026-10': { usd, calls } }
    warned: o.warned && typeof o.warned === 'object' ? o.warned : {}, // { '2026-10': 'near' | 'over' } the last warning shown
  };
}
function save(o) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(o, null, 2));
  fs.renameSync(tmp, file());
}

// What the screens may know. Never the key.
export function aiSettings() {
  const o = load();
  return { key_set: !!o.key, key_hint: o.key ? o.key.slice(-4) : '', cap: o.cap, model: MODELS.reading.label, ask_model: MODELS.ask.label, ...spendState(o) };
}
// Saves the key (when given; an empty string clears it) and the cap (when given).
export function setAiSettings({ key, cap } = {}) {
  const o = load();
  if (typeof key === 'string') o.key = key.trim();
  if (cap !== undefined && cap !== null && cap !== '') {
    const c = Number(cap);
    if (!Number.isFinite(c) || c < 0 || c > 1000) throw new AiError('The monthly cap must be a dollar amount from 0 to 1000.');
    o.cap = Math.round(c * 100) / 100;
  }
  save(o);
  return aiSettings();
}
export function hasKey() { return !!load().key; }

export function spendState(o = load()) {
  const m = month();
  const s = o.spend[m] || { usd: 0, calls: 0 };
  const usd = round(s.usd);
  const level = o.cap > 0 && usd >= o.cap ? 'over' : o.cap > 0 && usd >= o.cap * WARN_AT ? 'near' : 'ok';
  return { month: m, spent: usd, calls: s.calls, cap: o.cap, level, remaining: Math.max(0, round(o.cap - usd)) };
}
export function canSpend(estimateUsd = 0) {
  const o = load();
  if (!o.key) return { ok: false, reason: 'No AI key yet. Add it in Settings → AI Reading.' };
  const s = spendState(o);
  if (s.level === 'over') return { ok: false, reason: `The monthly cap of $${o.cap.toFixed(2)} is reached ($${s.spent.toFixed(2)} spent in ${s.month}). Raise the cap in Settings → AI Reading to continue.` };
  if (estimateUsd && s.spent + estimateUsd > o.cap) return { ok: false, reason: `This would go over the monthly cap of $${o.cap.toFixed(2)} ($${s.spent.toFixed(2)} spent, about $${estimateUsd.toFixed(2)} needed). Raise the cap in Settings → AI Reading to continue.` };
  return { ok: true, ...s };
}
// The owner wants to be told in the app when the spend nears the cap and when it reaches it: the screens
// ask here; a warning is handed out once per level per month, then `seen` is set.
export function pendingWarning() {
  const o = load();
  const s = spendState(o);
  if (s.level === 'ok') return null;
  const shown = o.warned[s.month];
  if (shown === s.level || (shown === 'over' && s.level === 'near')) return null;
  return { level: s.level, text: s.level === 'over' ? `AI spending reached the monthly cap of $${o.cap.toFixed(2)}. Readings and questions are paused until the cap is raised in Settings → AI Reading.` : `AI spending is at $${s.spent.toFixed(2)} of the $${o.cap.toFixed(2)} monthly cap.` };
}
export function markWarningSeen(level) {
  const o = load();
  if (level === 'near' || level === 'over') { o.warned[month()] = level; save(o); }
}

const round = (n) => Math.round((n || 0) * 10000) / 10000;
export function costOf(usage, model) {
  if (!usage) return 0;
  const m = model || MODELS.reading;
  const inTok = usage.input_tokens || 0, out = usage.output_tokens || 0, cr = usage.cache_read_input_tokens || 0, cw = usage.cache_creation_input_tokens || 0;
  return round((inTok * m.input + out * m.output + cr * m.cacheRead + cw * m.cacheWrite) / 1e6);
}
function addSpend(usd) {
  const o = load();
  const m = month();
  const s = o.spend[m] || { usd: 0, calls: 0 };
  s.usd = round(s.usd + usd); s.calls += 1;
  o.spend[m] = s;
  save(o);
  return spendState(o);
}

// --- the call log (last 20, per process) ---
const CALLS = [];
export function recentCalls(n = 20) { return CALLS.slice(-n).reverse(); }
function record(entry) { CALLS.push(entry); if (CALLS.length > 50) CALLS.splice(0, CALLS.length - 50); }

// Blank every secret from a string: the AI key and the app password (auth.js hands over what it knows).
export function redact(text) {
  let s = String(text ?? '');
  const o = load();
  const words = [o.key, ...redactionWords()].filter((w) => w && w.length >= 8);
  for (const w of words) s = s.split(w).join('[secret]');
  // An Anthropic key that is not the stored one (pasted in a question, say) still never goes out.
  return s.replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[secret]');
}

export class AiError extends Error {}

// Tests and the dev app hand in a fake client here; the live app makes the real one from the stored key.
let clientFactory = null;
export function useClientFactory(fn) { clientFactory = fn; }
async function client(key) {
  if (clientFactory) return clientFactory(key);
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: key, maxRetries: 1, timeout: 180_000 });
}

// One model call: checks the cap, times it, records it, adds the dollars. `params` is a Messages API
// request without the model. Returns { message, usd, seconds }. Throws AiError (a screen-ready sentence).
export async function callModel(kind, params, { estimateUsd = 0, what = '' } = {}) {
  const m = MODELS[kind] || MODELS.reading;
  const gate = canSpend(estimateUsd);
  if (!gate.ok) throw new AiError(gate.reason);
  const key = load().key;
  const t0 = Date.now();
  const entry = { at: new Date().toISOString(), model: m.id, what, ok: false, status: null, seconds: 0, usd: 0, tokens: null, error: '' };
  try {
    const c = await client(key);
    const message = await c.messages.create({ model: m.id, ...params });
    const usd = costOf(message.usage, m);
    entry.ok = true; entry.status = 200; entry.usd = usd; entry.seconds = round((Date.now() - t0) / 1000);
    entry.tokens = { input: message.usage?.input_tokens || 0, output: message.usage?.output_tokens || 0, cache_read: message.usage?.cache_read_input_tokens || 0, cache_write: message.usage?.cache_creation_input_tokens || 0 };
    entry.stop = message.stop_reason;
    record(entry);
    const state = addSpend(usd);
    return { message, usd, seconds: entry.seconds, state, model: m };
  } catch (err) {
    entry.seconds = round((Date.now() - t0) / 1000);
    entry.status = err && err.status ? err.status : null;
    entry.error = redact(err && err.message ? err.message : String(err)).slice(0, 500);
    record(entry);
    throw new AiError(screenMessage(err));
  }
}
function screenMessage(err) {
  const status = err && err.status;
  if (status === 401) return 'The AI key was refused. Check it in Settings → AI Reading.';
  if (status === 429) return 'The AI service is busy right now. Try again in a minute.';
  if (status === 400) return `The AI service refused the request: ${redact(err.message).slice(0, 200)}`;
  if (status >= 500) return 'The AI service had a problem on its side. Try again in a minute.';
  if (err && /timeout|ETIMEDOUT|ECONNRESET|fetch failed|ENOTFOUND/i.test(err.message || '')) return 'Could not reach the AI service. Try again in a minute.';
  return `The AI call failed: ${redact(err && err.message ? err.message : String(err)).slice(0, 200)}`;
}

// The text of a message (all text blocks joined).
export function textOf(message) {
  return (message && Array.isArray(message.content) ? message.content : []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

// Rough price before a call, from character counts (about 4 characters per token).
export function estimate(kind, { inputChars = 0, outputTokens = 1500, cachedChars = 0 } = {}) {
  const m = MODELS[kind] || MODELS.reading;
  return round(((inputChars / 4) * m.input + (cachedChars / 4) * m.cacheRead + outputTokens * m.output) / 1e6);
}

// For the snapshot: plain lines, never the key.
export function aiReport() {
  const s = aiSettings();
  const lines = [`AI: key ${s.key_set ? `set (…${s.key_hint})` : 'NOT SET'}   reading model ${MODELS.reading.id}   ask model ${MODELS.ask.id}`,
    `spend ${s.month}: $${s.spent.toFixed(4)} of cap $${s.cap.toFixed(2)} (${s.calls} calls, level ${s.level})`];
  const calls = recentCalls(20);
  lines.push(`LAST ${calls.length} AI CALLS`);
  for (const c of calls) lines.push(`  ${c.at} ${c.model} ${c.what} ${c.ok ? 'ok' : 'FAILED'} status ${c.status ?? '-'} ${c.seconds}s $${c.usd.toFixed(4)}${c.tokens ? ` in ${c.tokens.input} out ${c.tokens.output} cache ${c.tokens.cache_read}/${c.tokens.cache_write}` : ''}${c.error ? ` error: ${c.error}` : ''}`);
  if (!calls.length) lines.push('  none this process');
  return lines.map(redact);
}
