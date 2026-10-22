# Short points for the meaning page (`knowledge/bits.json`)

The page a tapped number opens shows SHORT POINTS first and the full course words
under "Course Words". The points are the course's words shortened, nothing added,
written by Claude sessions following `BRIEF.md`. Regenerate only when the knowledge
store or `server/meaning.js` changes which passages a page shows.

1. `BITS_DIR=<dir> node tools/bits/make-jobs.mjs` – every page (chart.position:number,
   and :n+p pairs) grouped into distinct passage sets, written as `<dir>/bits-jobs/batch-NN.json`.
2. A Claude session (subagents, ~25 sets each) reads a batch and `BRIEF.md`, writes
   `<dir>/bits-out/batch-NN.json` as `{ "<setId>": { "groups": [{ "title", "points" }] } }`.
3. `BITS_DIR=<dir> node tools/bits/check-out.mjs` – every set answered, lengths and `**bold**` runs valid.
4. `BITS_DIR=<dir> node tools/bits/merge-bits.mjs` – writes `knowledge/bits.json` as
   `{ about, sets: { id: { sources, groups } }, pages: { key: id } }`; filler points
   ("lists examples only") are dropped; entries under `hand/` are kept as written.
5. `npm run verify`.

Never call a paid model from these scripts; the writing is done by the chat itself.

## Only the pages that need it (after the store or the ranking changed)
1. `BITS_DIR=<dir> node tools/bits/make-jobs-missing.mjs` – pages with no points, or whose passages now come from
   other sources than their points were written from, as `<dir>/bits-jobs/add-NN.json`.
2. Writers as above into `<dir>/bits-out/add-NN.json`; `check-out.mjs`.
3. `BITS_DIR=<dir> BITS_ADD=1 node tools/bits/merge-bits.mjs` – keeps every existing set and page, adds the new
   ones (a rewritten page points at its new set). Batch files must not reuse an id already in bits.json.

## Hand-written second sets (`more`, 2026-10-21)
`bits.json` also has `more`: page key → a set shown AFTER the page's own points (the Diamond Method's "Path to
Integration" on the 31 day pages, the Name Change 5 Steps booklet's "When Choosing a Name" rules on the sub-chart
pages). Their points carry `cites` (one { book, page } per point, the book from knowledge/books.json, or
{ book, at: "mm:ss" } for a lecture named in its "lectures"). merge-bits keeps them; make-jobs never rewrites them.
Allowed group titles: "In balance", "Out of balance", "", "Path to Integration", "When Choosing a Name", "Name
Cleanse" (test/meaning.test.js). `more[key]` may be a LIST of set ids (2026-10-22): the sub-chart pages hold the
booklet's rule, the Sub-chart Rules lecture's general rules for the position (`hand/lect/...`), its number-specific
reasons, and last the Name Cleanse lecture's group (`hand/cleanse/11..18`, on every page where 11, 12, 13, 16 or 18
sits). `bitsFor` folds sets with the same heading into one card. The sets are edited in bits.json itself (they were
written by hand from the transcripts, one point per minute line); no tool regenerates them.
