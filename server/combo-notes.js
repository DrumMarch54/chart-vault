// What the owner does with combination cards on the number screen (owner 2026-11-27), kept for the next writing chat:
//   wanted: a pair tapped while it had no card ("Not Written Yet"): key -> { label, n, last }. Names and numbers only.
//   off:    "This Is Off" notes, what the owner says is wrong with a card: [{ key, label, note, at, build }].
// One small JSON file beside the database (data/combo-notes.json), read and written only here. Shown in the snapshot
// (COMBINATION CARDS) so a writing chat does the tapped pairs first and follows every note.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { COMMIT } from './build.js';
import { loadCards } from './neighbors.js';

const file = () => path.join(config.dataDir, 'combo-notes.json');
const KEY = /^[a-z]+\.[A-Za-z]+=\d{1,2}\|[a-z]+\.[A-Za-z]+=\d{1,2}$/;
export const validKey = (k) => typeof k === 'string' && KEY.test(k);
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

function read() {
  try { const o = JSON.parse(fs.readFileSync(file(), 'utf8')); return { wanted: o.wanted || {}, off: Array.isArray(o.off) ? o.off : [] }; } catch { return { wanted: {}, off: [] }; }
}
function write(o) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(o, null, 1));
  fs.renameSync(tmp, file());
}

export function noteWanted(key, label) {
  if (!validKey(key)) return null;
  const o = read();
  const w = o.wanted[key] || { label: clean(label, 160), n: 0 };
  w.n += 1; w.last = new Date().toISOString();
  if (label) w.label = clean(label, 160);
  o.wanted[key] = w; write(o);
  return w;
}

export function noteOff(key, label, note) {
  const text = clean(note, 1000);
  if (!validKey(key) || !text) return null;
  const o = read();
  const row = { key, label: clean(label, 160), note: text, at: new Date().toISOString(), build: COMMIT };
  o.off.push(row); write(o);
  return row;
}

export const offNotesFor = (key) => read().off.filter((x) => x.key === key);

export function comboReport() {
  const o = read();
  const written = Object.keys(loadCards()).length;
  const wanted = Object.entries(o.wanted).filter(([k]) => !loadCards()[k]).sort((a, b) => b[1].n - a[1].n || String(b[1].last).localeCompare(String(a[1].last)));
  const lines = [`COMBINATION CARDS (server/neighbors.js, knowledge/combo-cards.json; written by Claude sessions, tools/combo-cards/BRIEF.md): ${written} written · ${wanted.length} pairs tapped while missing · ${o.off.length} "This Is Off" notes`];
  if (wanted.length) lines.push('  write these first (tapped while missing, most taps first):', ...wanted.slice(0, 40).map(([k, w]) => `    ${w.n}x ${k}  ${w.label || ''}  last ${String(w.last || '').slice(0, 10)}`));
  if (o.off.length) lines.push('  "This Is Off" (the owner\'s words; fix the card in its batch file, add the rule to combinations.md):', ...o.off.slice(-40).reverse().map((x) => `    ${x.at.slice(0, 10)} ${x.key}  ${x.label || ''}: "${x.note}"`));
  return lines;
}
