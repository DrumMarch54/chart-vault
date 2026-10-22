// A course book's own passages for a screen that is not a meaning page: the Karmic Connections tool shows the
// Karmic Connections book, the Year Rows number sheet shows the Year Row Cases book's words about a number.
// Passages come from knowledge/index.json in the book's own order, each with its page (knowledge/books.json).
import { knowledgeIndex } from './knowledge.js';
import { card, setsFor } from './meaning.js';
import { bookOf } from './books.js';

// Only these books answer here; every other slug is a 400 (the meaning pages have their own ranking).
export const SCREEN_BOOKS = { 'karmic-connections-book': 'hand/karmic/', 'year-row-cases-book': 'hand/rows/' };

export function bookFor(slug, { num = null, sets = [] } = {}) {
  const b = SCREEN_BOOKS[slug] ? bookOf(slug) : null;
  if (!b) return null;
  const k = knowledgeIndex();
  const n = num ? Number(num) : null;
  const about = (c) => !n || c.numbers.includes(n) || (c.mentions || []).includes(n);
  const shown = (c) => !/^(Introduction|Coming Up\?|TOOL: )/.test(String(c.heading).split(' > ').pop());
  const chunks = k.missing ? [] : k.chunks;
  // The Karmic Connections book reprints the Forecasting book's karmic chapter; the index keeps one copy of an
  // identical paragraph (the Forecasting book's), so that chapter's passages follow the book's own, each
  // labeled with its own book and page.
  const more = slug === 'karmic-connections-book' ? chunks.filter((c) => c.source === 'forecasting-book' && /KARMIC CONNECTIONS/.test(c.heading)) : [];
  const passages = [...chunks.filter((c) => c.source === slug), ...more].filter(about).filter(shown).map(card);
  const bits = setsFor(n ? `${SCREEN_BOOKS[slug]}${n}` : `${SCREEN_BOOKS[slug]}book`);
  // named point sets a screen asks for beside the book ("connected", "same", "free" on the Karmic tool)
  const named = {};
  for (const name of sets) if (/^[a-z]+$/.test(name)) { const x = setsFor(`${SCREEN_BOOKS[slug]}${name}`); if (x) named[name] = x; }
  return { slug, book: b.book, num: n, passages, bits, sets: named };
}
