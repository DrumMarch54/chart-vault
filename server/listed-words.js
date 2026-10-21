// The course's LIST documents, read per position and number: the owner's "problem areas" docs (one entry per
// number under a position heading: "Mind center 12/3. ...", "12/3 on the name line ...", "#### MC main vibration 8:"),
// the psyche book's pillar lists ("- Psyche Pillar 16/7: ...") and the sub-chart guide's aura scoring. The knowledge
// index cannot tell these apart (the number sits inside the entry, not in a heading), so they are read here,
// straight from knowledge/raw, like server/subchart-words.js reads the sub-chart books.
//
//   listedWordsFor(chart, position, number) -> [{ source, title, heading, text, id }] in the documents' order.
//
// One RULE per section: the file, the section heading(s) it applies to, the positions the entries belong to, and
// how an entry starts. An entry is the paragraph (or "#### heading") that opens on a number, plus the paragraphs
// after it up to the next entry or heading. Entries about a pair ("EC combo 9-11/2", "8 and 15/6") are skipped:
// they belong under the pair, not under one number.
import fs from 'node:fs';
import { PAGE_MARK } from './books.js';

const RAW = new URL('../knowledge/raw/', import.meta.url);
const read = (f) => { try { return fs.readFileSync(new URL(f, RAW), 'utf8').replace(/\r\n/g, '\n'); } catch { return ''; } };
const titleOf = (t) => (/^# (.+)$/m.exec(t) || [, ''])[1].trim();
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

const NUM = '(\\d{1,2})(?:\\/\\d)?';
const NAME_LINE = ['first', 'middle', 'last'];
const AURAS = { upperLeft: /top left|upper left/i, upperRight: /top right|upper right/i, lowerLeft: /bottom left|lower left/i, lowerRight: /bottom right|lower right/i };
const auraKey = (text) => Object.keys(AURAS).find((k) => AURAS[k].test(text)) || null;

// [file, section heading regex (the "#"/"##" line, or null for the whole file), rules...]
// rule: { start: RegExp with the number as group 1 (tested on the entry's first line, "#### " stripped),
//         keys: positions ("name.heart") or a function(entry first line) -> keys, digitSum: true when the entry
//         describes a digit sum (1-9) that a compound number also gets }
const DOCS = [
  ['name-chart-problem-areas.md', 'name', [
    [/^Mind Center Vibrations$/i, [{ start: new RegExp(`^Mind center ${NUM}[.: ]`, 'i'), keys: ['name.heart'] }, { start: new RegExp(`^MC Sub Vibration ${NUM}[.: ]`, 'i'), keys: ['name.heartExtra'] }]],
    [/^Emotional Center$/i, [{ start: new RegExp(`^Emotion center ${NUM}[.: ]`, 'i'), keys: ['name.solar'] }]],
    [/^Name Line$/i, [{ start: new RegExp(`^${NUM} on the name line`, 'i'), keys: NAME_LINE.map((k) => `name.${k}`) }]],
    [/^Life Expression Numbers$/i, [{ start: new RegExp(`^Life expression ${NUM}[.: ]`, 'i'), keys: ['name.le', 'name.big'] }]],
    [/^Unbalanced Auras$/i, [{ start: new RegExp(`^${NUM} aura[.: ]`, 'i'), keys: Object.keys(AURAS).map((k) => `name.${k}`) }, { start: new RegExp(`^(?:Top|Bottom|Upper|Lower) (?:left|right) aura ${NUM}\\s*$`, 'i'), keys: (line) => [`name.${auraKey(line)}`] }]],
    [/^Spine$/i, [{ start: new RegExp(`^Spine ${NUM}\\b`, 'i'), keys: ['name.spine'] }]],
  ]],
  ['vocation-chart-problem-areas.md', 'vocation', [
    [/^Little Heart's Desire$/i, [{ start: new RegExp(`^${NUM}\\s*[–-]`), keys: ['vocation.le'] }]],
    [/^Big Heart's Desire$/i, [{ start: new RegExp(`^${NUM}\\s*[–-]`), keys: ['vocation.big'] }]],
    [/^Mind Center$/i, [{ start: new RegExp(`^MC Main vibration ${NUM}:?`, 'i'), keys: ['vocation.heart'] }]],
    [/^Sub Vibrations$/i, [{ start: new RegExp(`^MC sub vibration ${NUM}:?`, 'i'), keys: ['vocation.heartExtra'] }, { start: new RegExp(`^EC sub vibration ${NUM}:?`, 'i'), keys: ['vocation.solarExtra'] }]],
    [/^Emotion Center$/i, [{ start: new RegExp(`^EC main vibration ${NUM}:?`, 'i'), keys: ['vocation.solar'] }]],
    [/^Name Line$/i, [{ start: new RegExp(`^${NUM}:`), keys: NAME_LINE.map((k) => `vocation.${k}`) }]],
    [/^Pillars$/i, [{ start: new RegExp(`^${NUM}:`), keys: ['vocation.pillar'] }]],
    [/^Auras$/i, [{ start: new RegExp(`^(?:Vocation chart )?(?:Top|Bottom|Upper|Lower) (?:Left|Right) Aura ${NUM}\\b`, 'i'), keys: (line) => [`vocation.${auraKey(line)}`] }]],
  ]],
  ['personality-chart-problem-areas.md', 'personality', [
    [/^Little Personality$/i, [{ start: new RegExp(`^${NUM}\\s*[–-]`), keys: ['personality.le'] }]],
    [/^Big Personality$/i, [{ start: new RegExp(`^${NUM}\\s*[–-]`), keys: ['personality.big'] }]],
    [/^Mind Center$/i, [{ start: new RegExp(`^MC main vibration ${NUM}:?`, 'i'), keys: ['personality.heart'] }]],
    [/^Sub Vibrations$/i, [{ start: new RegExp(`^MC sub vibration ${NUM}:?`, 'i'), keys: ['personality.heartExtra'] }, { start: new RegExp(`^EC sub vibration ${NUM}:?`, 'i'), keys: ['personality.solarExtra'] }]],
    [/^Emotion Center$/i, [{ start: new RegExp(`^EC main vibration ${NUM}:?`, 'i'), keys: ['personality.solar'] }]],
    [/^Name Line$/i, [{ start: new RegExp(`^${NUM}:`), keys: NAME_LINE.map((k) => `personality.${k}`) }]],
    [/^Pillar Numbers$/i, [{ start: new RegExp(`^${NUM}:`), keys: ['personality.pillar'] }]],
    [/^Auras$/i, [{ start: new RegExp(`^(?:Top|Bottom|Upper|Lower) (?:Left|Right)(?: Aura)? ${NUM}\\b`, 'i'), keys: (line) => [`personality.${auraKey(line)}`] }]],
  ]],
  ['psyche-book.md', 'psyche', [
    [/^3\) Comparing the Challenge Numbers$/i, [{ start: new RegExp(`^The Number ${NUM} \\(Inner Psyche\\):`, 'i'), keys: ['inner.first'] }, { start: new RegExp(`^The Number ${NUM} \\(Outer Psyche\\):`, 'i'), keys: ['outer.first'] }]],
    [/^The Pillar Digit Sums$/i, [{ start: new RegExp(`^- Psyche Pillar Digit Sum (\\d):`, 'i'), keys: ['outer.pillar', 'inner.pillar'], digitSum: true }]],
    [/^Beyond the Digit Sums: Nuanced Pillar Numbers$/i, [{ start: new RegExp(`^- Psyche Pillar ${NUM}:`, 'i'), keys: ['outer.pillar', 'inner.pillar'] }]],
  ]],
  ['subvibrations-book.md', 'sub-charts', [
    [/^Aura Scoring – Vocation Chart$/i, [{ start: new RegExp(`^Aura ${NUM} \\(feeling unprotected\\)`, 'i'), keys: Object.keys(AURAS).map((k) => `vocation.${k}`) }]],
    [/^Aura Scoring – Personality Chart$/i, [{ start: new RegExp(`^Aura ${NUM} \\(feeling unprotected\\)`, 'i'), keys: Object.keys(AURAS).map((k) => `personality.${k}`) }]],
  ]],
];

const PAIR = /(?<![\d/.:])\d{1,2}(?:\/\d)?\s*(?:and|-|&|\+)\s*\d{1,2}(?:\/\d)?(?![\d/])|combo|tension|both/i;
const strip = (l) => l.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
// "Aura 11/2 (feeling unprotected)" lines are followed by "- Formed by 9 and 2 → -5 pts The 11/2 aura ..." lines:
// the scores are a tool, the words after them stay.
const tidy = (t) => t.replace(/^-\s*Formed by [^→]*→\s*[-+–]?\s*\d+\s*pts\s*/gim, '').replace(/^-\s*Aura \d+ → [-+–]?\s*\d+ pts\s*$/gim, '').replace(/\n{3,}/g, '\n\n').replace(/([a-z])- ([a-z])/g, '$1$2').trim();

let table = null;
function add(key, n, entry) { if (!table.has(key)) table.set(key, new Map()); const m = table.get(key); if (!m.has(n)) m.set(n, []); m.get(n).push(entry); }

function build() {
  table = new Map();
  for (const [file, , rules] of DOCS) {
    const text = read(file);
    if (!text) continue;
    const title = titleOf(text);
    const lines = text.split('\n').slice(3);
    let section = null, rule = null, entry = null, page = 0;
    const flush = () => {
      if (!entry) return;
      const body = tidy(entry.lines.join('\n'));
      if (body.length > 20 && !PAIR.test(entry.label.replace(/\d{1,2}(?:\/\d)?/, ''))) for (const key of entry.keys) if (key && !/\.null$/.test(key)) add(key, entry.n, { source: file.replace(/\.md$/, ''), title, heading: `${section} > ${entry.label}`, text: body, digitSum: !!entry.digitSum, ...(entry.page ? { page: entry.page, pageEnd: entry.page } : {}) });
      entry = null;
    };
    for (const line of lines) {
      const pm = PAGE_MARK.exec(line);
      if (pm) { page = Number(pm[1]); continue; }
      const h = /^(#{1,6})\s+(.+)$/.exec(line);
      if (h) {
        const t = strip(h[2]);
        const found = rules.find(([re]) => re.test(t));
        if (found) { flush(); section = t; rule = found[1]; continue; }
        if (h[1].length <= 3) { flush(); section = null; rule = null; continue; } // a new part of the document
        // a deeper heading inside a section: an entry when it opens on a number, else a label to skip
      }
      if (!rule) continue;
      const first = strip(line);
      const r = first ? rule.find((x) => x.start.test(first)) : null;
      if (r) {
        flush();
        const m = r.start.exec(first);
        const n = Number(m[1]);
        if (n < 1 || n > 99) continue;
        const keys = typeof r.keys === 'function' ? r.keys(first) : r.keys;
        const label = m[0].replace(/^-\s*/, '').replace(/[\s.:–-]+$/, '');
        const rest = first.slice(m[0].length).replace(/^\s*[.:–-]\s*/, '').trim();
        entry = { n, label, keys, digitSum: r.digitSum, bullet: /^-\s/.test(first), lines: rest ? [rest] : [], page };
        continue;
      }
      if (h) { flush(); continue; }
      if (!entry) continue;
      // a bullet entry ("- Psyche Pillar 24/6: ... in") goes on only while its sentence is unfinished
      if (entry.bullet && line.trim() && !/^-\s/.test(line) && /[.!?)]\s*$/.test(entry.lines[entry.lines.length - 1] || '')) { flush(); continue; }
      if (entry.bullet && /^-\s/.test(line)) { flush(); continue; }
      entry.lines.push(line);
    }
    flush();
  }
  for (const [key, m] of table) for (const [num, list] of m) list.forEach((e, i) => { e.id = `listed:${key}#${num}#${i}`; });
}

export function listedWordsFor(chart, position, number) {
  if (!table) build();
  const m = table.get(`${chart}.${position}`);
  if (!m) return [];
  const n = Number(number);
  const own = (m.get(n) || []).filter((e) => !e.digitSum || n < 10);
  const ds = n > 9 ? (m.get(reduce(n)) || []).filter((e) => e.digitSum).map((e) => ({ ...e, heading: `${e.heading} (the digit sum of ${n})` })) : [];
  return [...own, ...ds].map((e) => ({ ...e }));
}
export const listedPositions = () => { if (!table) build(); return [...table.keys()].sort(); };
export const listedCount = () => { if (!table) build(); let n = 0; for (const m of table.values()) for (const l of m.values()) n += l.length; return n; };
