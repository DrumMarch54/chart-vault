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
