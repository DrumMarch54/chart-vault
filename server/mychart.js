// "My chart": the owner's own name and birth date, kept in one small JSON file beside the database so
// the tools that need a person (Relationship, Karmic connections, Year rows) can start from it without
// typing. Read and written only here; the Settings screen and the tools use the same store.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const file = () => path.join(config.dataDir, 'mychart.json');
const clean = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);

export function getMyChart() {
  try { const o = JSON.parse(fs.readFileSync(file(), 'utf8')); return normalize(o); } catch { return normalize({}); }
}

function normalize(o) {
  const day = Number(o.day) || 0, month = Number(o.month) || 0, year = Number(o.year) || 0;
  return { name: clean(o.name, 120), day: day >= 1 && day <= 31 ? day : 0, month: month >= 1 && month <= 12 ? month : 0, year: year >= 1000 && year <= 9999 ? year : 0 };
}

// Saves what was typed; an empty date is allowed (then nothing is set). Returns what is now stored.
export function setMyChart(body) {
  const o = normalize(body || {});
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(o, null, 2));
  fs.renameSync(tmp, file());
  return o;
}

export const myChartSet = (o = getMyChart()) => !!(o.day && o.month && o.year);
