#!/usr/bin/env node
// Builds server/number-guide.json: the owner's own number guides (Drive "1-9 Guide", "10-45 Guide", "46-99 Guide")
// and "Number Notes", one entry per number 1-99, AS WRITTEN. This is the general layer: what a number is wherever
// it sits (owner 2026-11-23: "descriptions for those diamond numbers wherever throughout the charts"). The meaning
// page shows it under the spot's own words, folded to the title and the opening lines.
// Read from the knowledge store's text (knowledge/raw/guide-*.md, number-notes.md). No AI, nothing reworded:
// headings lose their emoji, the rest is copied. Run after a change here or in a source:
//   node tools/make-number-guide.mjs
// Never hand-edit the output.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(root, 'knowledge', 'raw', f), 'utf8');
const fail = (m) => { console.error(m); process.exit(1); };

// "ð¡✨" is an emoji exported as Latin-1; a heading keeps letters, digits and ordinary punctuation only.
const clean = (t) => String(t).replace(/[^\x20-\x7E’‘“”–—éèáóúíñöüä]/g, '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
const titleCase = (t) => t.toLowerCase().replace(/(^|[\s(“"-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
// The guides' own section headings; any other bold label ("**Egoistic Power:** …") is a point of the section it sits in.
const SECTION = /^(?:(?:Balanced|Unbalanced|Imbalanced) Manifestation|Little Diamond|The Big Diamond|Statistics|Statistical Insights|Potential Psyche Disorders|Psyche Disorder Association)\b/;
const NUM = /^(\d{1,2})(?:\/(\d))?$/;

// One guide: "# **35/8 THE CHIEFTAIN |** ***Here And No Further!*** **emoji**" (or "# -----**55/1 MASTER … | The Media King emoji**"),
// an opening paragraph, then "**Balanced Manifestation:**" style headings over "  - " bullets or a "**Little Diamond:** text" line.
function guide(file, book) {
  const out = new Map();
  let cur = null, grp = null;
  for (const raw of read(file).split('\n')) {
    const line = raw.replace(/\s+$/, '');
    // three 46-99 numbers (50, 57, 66) have a bold line, not a heading, for their title
    const hm = /^# (?!\d+-\d+ Guide)(.*)$/.exec(line) || /^\*\*(\d{1,2}\/\d [A-Z][^|]*\|.*)$/.exec(line);
    if (hm) {
      const [left, alt = ''] = clean(hm[1].replace(/^-+/, '')).split('|').map((s) => s.trim());
      const m = /^(\d{1,2}(?:\/\d)?)\s+(.*)$/.exec(left);
      if (!m) { cur = null; continue; }
      const n = Number(m[1].split('/')[0]);
      cur = { n, text: m[1], name: titleCase(m[2]), alt, intro: '', groups: [], book };
      out.set(n, cur); grp = null;
      continue;
    }
    if (!cur || /^-{3,}$/.test(line) || /^source:|^topic:/.test(line) || !line.trim()) continue;
    const head = /^\*\*([^*]+?):?\*\*:?\s*(.*)$/.exec(line);
    if (head && SECTION.test(head[1])) {
      grp = { title: head[1].replace(/:$/, '').replace(/\s+\d$/, '').replace(/^Imbalanced/, 'Unbalanced').trim(), points: [] };
      cur.groups.push(grp);
      if (head[2].trim()) grp.points.push(head[2].trim());
      continue;
    }
    const b = /^\s*[-*]\s+(.*)$/.exec(line);
    if (b && grp) { grp.points.push(b[1].trim()); continue; }
    if (head && grp) { grp.points.push(line.trim()); continue; }
    if (!grp) { cur.intro = (cur.intro ? cur.intro + ' ' : '') + line.trim(); continue; }
    grp.points.push(line.trim());
  }
  return out;
}

// Number Notes: "### **19/1**" or "**37/1 and 73/1**" or "### **35/8, 62/8 or 26/8**", then "  - " lines. A heading
// naming several numbers is the owner's note on them together: each of them gets it, titled with the heading.
function notes() {
  const out = new Map();
  let cur = null;
  for (const raw of read('number-notes.md').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const hm = /^(?:#{1,4}\s*)?\*\*([^*]+)\*\*\s*$/.exec(line) || /^#{1,4}\s+(.*)$/.exec(line);
    if (hm) {
      const label = clean(hm[1]);
      const parts = label.split(/\s*(?:,|\band\b|\bor\b)\s*/).filter(Boolean);
      const nums = parts.every((p) => NUM.test(p)) ? parts.map((p) => Number(p.split('/')[0])) : null;
      cur = nums && nums.length ? { nums, title: nums.length > 1 ? label : '', points: [] } : null;
      if (cur) for (const n of nums) { if (!out.has(n)) out.set(n, []); out.get(n).push(cur); }
      continue;
    }
    if (!cur || !line.trim()) continue;
    const b = /^\s*[-*]\s+(.*)$/.exec(line);
    const t = (b ? b[1] : line).trim();
    if (t) cur.points.push(t);
  }
  return out;
}

function dedupe(list) {
  const seen = new Set();
  return list.map((x) => ({ title: x.title, points: x.points.filter((t) => { const k = t.toLowerCase().replace(/[^a-z0-9]/g, ''); if (seen.has(k)) return false; seen.add(k); return true; }) })).filter((x) => x.points.length);
}
const guides = new Map([...guide('guide-1-9.md', '1-9 Guide'), ...guide('guide-10-45.md', '10-45 Guide'), ...guide('guide-46-99.md', '46-99 Guide')]);
const noteMap = notes();
const numbers = {};
for (let n = 1; n <= 99; n++) {
  const g = guides.get(n);
  const own = (noteMap.get(n) || []).filter((x) => x.points.length);
  if (!g && !own.length) continue;
  numbers[n] = {
    ...(g ? { name: g.name, alt: g.alt, intro: g.intro, groups: g.groups.filter((x) => x.points.length), book: g.book } : {}),
    // a point the owner wrote twice (under "26/8 and 35/8" and again under 35/8) shows once, in the first place
    ...(own.length ? { notes: dedupe(own) } : {}),
  };
}
const missing = [];
for (let n = 1; n <= 99; n++) if (!guides.has(n)) missing.push(n);
// The guides hold every number but 10-45's 0-endings it skips; fail loudly if a heading format changed.
if (guides.size < 90) fail(`only ${guides.size} numbers found in the guides; a heading format changed?`);
for (const [n, g] of guides) if (!g.groups.length || !g.intro) fail(`${n}: no ${g.intro ? 'sections' : 'opening lines'} in the ${g.book}`);
const file = path.join(root, 'server', 'number-guide.json');
fs.writeFileSync(file, JSON.stringify({ note: 'GENERATED by tools/make-number-guide.mjs from the owner\'s guides and Number Notes. Never hand-edit.', numbers }, null, 1) + '\n');
console.log(`${Object.keys(numbers).length} numbers (${guides.size} with a guide, ${noteMap.size} with notes). No guide: ${missing.join(', ') || 'none'}.`);
