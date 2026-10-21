// The course PDFs behind the knowledge files that carry page marks (knowledge/books.json, written with the marks
// by the page alignment of 2026-10-21; knowledge/README "Page numbers"). bookOf(slug) -> { book, pdf, drive } or
// null, so a passage can say "Name Numeroscopes book · p. 140" on the screen. pagesText(page, pageEnd) -> "p. 12" /
// "pp. 12–14" / "" for the screen and the snapshot.
import fs from 'node:fs';

let books = null;
function load() {
  if (books) return books;
  try { books = JSON.parse(fs.readFileSync(new URL('../knowledge/books.json', import.meta.url), 'utf8')).books || {}; } catch { books = {}; }
  return books;
}
export const bookOf = (slug) => load()[String(slug).replace(/\.md$/, '')] || null;
export const pagesText = (page, pageEnd) => (!page ? '' : pageEnd && pageEnd !== page ? `pp. ${page}–${pageEnd}` : `p. ${page}`);
// The page marks inside a raw file: a line "<!-- page 12 -->" before the first paragraph of page 12.
export const PAGE_MARK = /^<!--\s*page\s+(\d+)\s*-->\s*$/;
