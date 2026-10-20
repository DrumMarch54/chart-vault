// The sub-chart books' own words per position and number, read straight from the course text in knowledge/raw:
//   subvibrations-book.md (the Subnumeroscopes guide): "Vocation Chart Heart Center: 7 → +8 pts Also excellent.
//     The 7 brings ...", the same for the vocation solar plexus and the personality chart's two centers, the
//     pillars' "- 16/7 → -16 pts: Highly destabilizing ...", and "Personality or Hearts desire number 1-9".
//   subnumeroscope-interpretation-book.md: "## Number 15 > ### Heart Diamond (Vocation) / Solar Plexus Diamond
//     (Vocation) / Heart's Desire Numbers / Personality Heart Diamond / Personality Solar Plexus Diamond /
//     Personality Numbers".
// The guide's point scores are a tool for picking names, not a reading: the "→ +8 pts" part is cut, the words kept.
// wordsFor(chart, position, number) -> [{ source, title, heading, text, id }] in the books' order. Built once.
import fs from 'node:fs';

const RAW = new URL('../knowledge/raw/', import.meta.url);
const read = (f) => { try { return fs.readFileSync(new URL(f, RAW), 'utf8').replace(/\r\n/g, '\n'); } catch { return ''; } };
const titleOf = (t) => (/^# (.+)$/m.exec(t) || [, ''])[1].trim();
const body = (t) => t.split('\n').slice(3).join('\n');
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

let table = null;
function add(key, n, entry) { if (!table.has(key)) table.set(key, new Map()); const m = table.get(key); if (!m.has(n)) m.set(n, []); m.get(n).push(entry); }

// One "### Heading" section of a book: the lines up to the next heading of the same or a higher level.
function sections(text) {
  const out = []; let cur = null;
  for (const line of text.split('\n')) {
    const m = /^(#{2,4})\s+(.*)$/.exec(line);
    if (m && m[1].length <= 4) { if (cur) out.push(cur); cur = { level: m[1].length, title: m[2].replace(/\*\*/g, '').trim(), lines: [] }; continue; }
    if (cur) cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out;
}

// "7 → +8 pts Also excellent. ..." entries inside one center section, each to the next entry.
// An entry starts a line or a sentence ("... setup. 7 → +8 pts"); "Auras 2 and 9 → -10 pts" inside an entry is
// part of it. The guide gives 11/2 no arrow of its own in the vocation solar plexus: its "Aura combinations
// affecting 11/2 ..." lines become the 11 entry.
const ENTRY = /(?<=^|\n|[.!?)”"]\s)(\d{1,2})(?:\/\d)?\s*→\s*(?:[+\-–]?\s*\d+\s*pts?\b|context-dependent)?\s*/g;
function entries(text) {
  const marks = [...text.matchAll(ENTRY)].map((m) => ({ n: Number(m[1]), start: m.index, after: m.index + m[0].length }));
  const out = [];
  marks.forEach((m, i) => {
    let t = text.slice(m.after, i + 1 < marks.length ? marks[i + 1].start : text.length).replace(/^[:–-]\s*/, '').trim();
    const cut = /(?:Special )?Aura combinations affecting 11\/2[^:]*:/i.exec(t);
    if (cut && m.n !== 11) { out.push({ n: 11, text: t.slice(cut.index).trim() }); t = t.slice(0, cut.index).trim(); }
    out.push({ n: m.n, text: t });
  });
  // one entry per number: two pieces for the same number (11/2 described, then its aura lines) are joined
  const by = new Map();
  for (const e of out) by.set(e.n, by.has(e.n) ? `${by.get(e.n)}\n\n${e.text}` : e.text);
  return [...by].map(([n, t]) => ({ n, text: t }));
}
const tidy = (t) => t.replace(/\n{3,}/g, '\n\n').replace(/([a-z])- ([a-z])/g, '$1$2').trim();

function build() {
  table = new Map();
  // --- the Subnumeroscopes guide (subvibrations-book) ---
  const g = read('subvibrations-book.md');
  const gTitle = titleOf(g) || 'Subvibrations & Subnumeroscopes';
  const CENTERS = [
    [/^Vocation Chart Heart Center$/i, 'vocation.heart'], [/^Vocation Chart Solar Plexus Values$/i, 'vocation.solar'],
    [/^Personality Chart Heart Main Vibrations$/i, 'personality.heart'], [/^Personality chart solar plexus main vibration$/i, 'personality.solar'],
  ];
  const PILLARS = [[/^Vocation Chart Pillar$/i, 'vocation.pillar'], [/^Personality Chart – Pillar Number Scoring$/i, 'personality.pillar']];
  for (const s of sections(body(g))) {
    const text = s.lines.join('\n');
    const c = CENTERS.find(([re]) => re.test(s.title));
    if (c) for (const e of entries(text)) if (e.text.length > 30) add(c[1], e.n, { source: 'subvibrations-book', title: gTitle, heading: s.title, text: tidy(e.text) });
    const p = PILLARS.find(([re]) => re.test(s.title));
    if (p) for (const m of text.matchAll(/^-\s*(\d{1,2})(?:\/\d)?\s*→\s*[–\-+]?\s*\d+\s*pts?:?\s*(.+)$/gm)) add(p[1], Number(m[1]), { source: 'subvibrations-book', title: gTitle, heading: s.title, text: tidy(m[2]) });
    const hd = /^Personality or Hearts desire numbers? (\d)$/i.exec(s.title);
    if (hd) {
      const n = Number(hd[1]);
      const words = tidy(s.lines.filter((l) => !/^\s*\d\s*$/.test(l)).join('\n'));
      for (const key of ['vocation.le', 'vocation.big', 'personality.le', 'personality.big']) add(key, n, { source: 'subvibrations-book', title: gTitle, heading: s.title, text: words, digitSum: true });
    }
  }
  // --- the Subnumeroscope Interpretation book: "## Number N" then its position sections ---
  const b = read('subnumeroscope-interpretation-book.md');
  const bTitle = titleOf(b) || 'Subnumeroscope Interpretation';
  const MAP = [
    [/^heart.?s desire( numbers)?$/i, ['vocation.le', 'vocation.big']], [/^personality numbers$/i, ['personality.le', 'personality.big']],
    [/^heart diamond \(vocation\)$/i, ['vocation.mindDiamond']], [/^solar plexus diamond \(vocation\)$/i, ['vocation.emotionDiamond']],
    [/^personality heart diamond$/i, ['personality.mindDiamond']], [/^personality solar plexus diamond$/i, ['personality.emotionDiamond']],
  ];
  let n = null;
  const from = body(b).indexOf('\n## Interpretations');
  const secs = sections(from >= 0 ? body(b).slice(from) : '');
  // The OCR sometimes put a section's paragraph under the NEXT heading ("Solar Plexus Diamond (Vocation)" empty,
  // its "In the Solar Plexus Diamond position, the number 29 ..." paragraph under "Heart's Desire Numbers").
  // An empty section takes back the paragraph of the next section that opens on its own position words.
  // ("In the Solar Plexus Diamond position, the number 29 ...", "When the number 33 occupies the Solar Plexus Diamond",
  // "In the Solar Plexus Diamond of the Vocation Chart, the number 22 ...": the position named in the first 70 characters.)
  const opens = (re, not) => (q) => re.test(q.slice(0, 70)) && !(not && not.test(q.slice(0, 70)));
  const OPENS = [[/solar plexus diamond \(vocation\)/i, opens(/solar plexus diamond/i, /personality/i)], [/heart diamond \(vocation\)/i, opens(/heart diamond/i, /personality/i)], [/personality solar plexus diamond/i, opens(/personality solar plexus diamond/i)], [/personality heart diamond/i, opens(/personality heart diamond/i)]];
  for (let i = 0; i + 1 < secs.length; i++) {
    const s = secs[i], next = secs[i + 1];
    if (s.lines.join('').trim() || next.level === 2) continue;
    const open = OPENS.find(([re]) => re.test(s.title));
    if (!open) continue;
    const paras = next.lines.join('\n').split(/\n{2,}/);
    const k = paras.findIndex((q) => open[1](q.trim()));
    if (k < 0) continue;
    s.lines = paras[k].split('\n');
    next.lines = paras.filter((_, j) => j !== k).join('\n\n').split('\n');
  }
  for (const s of secs) {
    const num = /^Number (\d{1,2})$/.exec(s.title);
    if (s.level === 2) { n = num ? Number(num[1]) : null; continue; }
    if (!n) continue;
    const m = MAP.find(([re]) => re.test(s.title));
    const text = tidy(s.lines.join('\n'));
    if (m && text.length > 30) for (const key of m[1]) add(key, n, { source: 'subnumeroscope-interpretation-book', title: bTitle, heading: `Number ${n} > ${s.title}`, text });
  }
  // stable ids for the screen's de-duplication
  for (const [key, m] of table) for (const [num, list] of m) list.forEach((e, i) => { e.id = `${key}#${num}#${i}`; });
}

// The words for one number in one position. A compound heart's desire or personality number also gets the guide's
// 1-9 description of its digit sum (the guide: "a general description of the numbers 1-9 as Personality Numbers and
// Hearts Desire numbers"), after the book's words on the number itself.
export function wordsFor(chart, position, number) {
  if (!table) build();
  const m = table.get(`${chart}.${position}`);
  if (!m) return [];
  const n = Number(number);
  const own = (m.get(n) || []).filter((e) => !e.digitSum || n < 10);
  const ds = n > 9 ? (m.get(reduce(n)) || []).filter((e) => e.digitSum).map((e) => ({ ...e, heading: `${e.heading} (the digit sum of ${n})` })) : [];
  return [...own, ...ds].map((e) => ({ ...e }));
}
export const subchartPositions = () => { if (!table) build(); return [...table.keys()]; };
