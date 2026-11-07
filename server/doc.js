// "Open the Document" (owner's ask 2026-11-07): from a course-words card on a number's page, the whole document the
// words came from, opened AT those words, so the owner can read what is written above and below them.
// Read from the course file itself (knowledge/raw/<source>.md), every line of it in its order, a window at a time:
// a phone never gets a 700 KB guide in one answer. No AI, no guessing: the passage is found by its own words.
import fs from 'node:fs';
import { bookOf } from './books.js';

const RAW = new URL('../knowledge/raw/', import.meta.url);
const SLUG = /^[a-z0-9][a-z0-9-]{0,100}$/;

// Letters and digits only, lower case: the card's text went through tidying (bold marks, line breaks, bullets), the
// file did not, so both are compared in this form.
const plain = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// The document as blocks: a heading line is a block of its own (level 1-4), the lines between blank lines are a
// paragraph. Page marks (<!-- page N -->) are not shown; each block carries the page it is on.
const cache = new Map();
function blocksOf(source) {
  if (!SLUG.test(source)) return null;
  if (cache.has(source)) return cache.get(source);
  let raw;
  try { raw = fs.readFileSync(new URL(`${source}.md`, RAW), 'utf8'); } catch { return null; }
  const blocks = [];
  let page = null, buf = [];
  const flush = () => { const t = buf.join('\n').trim(); if (t) blocks.push({ text: t, ...(page ? { page } : {}) }); buf = []; };
  for (const line of raw.split('\n')) {
    const pm = /^\s*<!--\s*page\s+(\d+)\s*-->\s*$/.exec(line);
    if (pm) { flush(); page = Number(pm[1]); continue; }
    if (/^\s*<!--.*-->\s*$/.test(line)) continue;
    const hm = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hm) { flush(); blocks.push({ heading: Math.min(hm[1].length, 4), text: hm[2].trim(), ...(page ? { page } : {}) }); continue; }
    if (!line.trim()) { flush(); continue; }
    buf.push(line);
  }
  flush();
  const title = (blocks.find((b) => b.heading === 1) || {}).text || source.replace(/-/g, ' ');
  const doc = { title, blocks, plains: blocks.map((b) => plain(b.text)) };
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  cache.set(source, doc);
  return doc;
}

// Where in the document the card's words are: the block holding the start of the card's text (tried at a few points
// of it, since a card may open on a line the file has as a heading), else the heading the card names.
export function findInDoc(source, { text = '', heading = '' } = {}) {
  const d = blocksOf(source);
  if (!d) return null;
  const body = plain(text);
  for (const at of [0, 40, 120, 300]) {
    const probe = body.slice(at, at + 50);
    if (probe.length < 20) break;
    const i = d.plains.findIndex((p) => p.includes(probe));
    if (i >= 0) return i;
    // a probe may run across two blocks (a heading line, then its paragraph)
    for (let j = 0; j + 1 < d.plains.length; j++) if ((d.plains[j] + d.plains[j + 1]).includes(probe)) return j;
  }
  const h = plain(String(heading).split(' > ').pop());
  if (h) { const i = d.blocks.findIndex((b, j) => b.heading && d.plains[j].startsWith(h)); if (i >= 0) return i; }
  return null;
}

// A window of the document: blocks [from, to) by their place in it (0 = the first).
export function docWindow(source, { from = 0, to = 60 } = {}) {
  const d = blocksOf(source);
  if (!d) return null;
  const total = d.blocks.length;
  const a = Math.max(0, Math.min(total, Math.floor(from))), b = Math.max(a, Math.min(total, Math.floor(to), a + 200));
  const bk = bookOf(source);
  return { source, title: d.title, ...(bk ? { book: bk.book } : {}), total, from: a, to: b, blocks: d.blocks.slice(a, b).map((x, i) => ({ n: a + i, ...x })) };
}
