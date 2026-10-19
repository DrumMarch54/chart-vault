# Color and position study of the paid Quick Numeroscope tool

**Colors since 2026-10-19 come from `paid/` (the tool's own tables, read off its live page); the
screenshot study below is kept for POSITIONS and for the method.**

One-off research tools, never run by `npm run verify`. They read the vault's own
screenshots and work out, for every chart position and number, which color the
paid tool uses and where exactly it puts each number. Output:
`public/number-colors.js` (the color table) and the calibrated `LAYOUT` in
`public/numeroscope.js`. Findings: `.brain/numerology/number-colors.md`.

Needs: python3 with `rapidocr-onnxruntime`, `pillow`, `numpy` (all free, run
locally, no paid service); node; the app password as `LIVE_APP_TOKEN` to
download the screenshots. Work in a scratch directory, not in the repo:

1. Download the chart screenshots: `GET /api/images?kind=chart&limit=200&offset=N`
   (pages of 200) then `GET /img/<id>` into `refs/<id>.jpg`.
2. `python3 -I ocr_all.py` reads every screenshot once into `ocr/<id>.json`
   (about 2 s per picture).
3. `python3 -I inputs.py` finds the orange diamond (`geo.py`), the typed year
   and name, and reads the day and month off the chart itself → `inputs.json`.
   Only paid-tool screenshots pass; other chart styles are skipped.
4. `node calc.mjs inputs.json slots.json` computes every chart with the app's
   own engine and lists where each number should be (`LAYOUT`).
5. `python3 -I colors.py` matches every expected number to a read box at that
   spot (text must agree), samples its ink color → `samples.json`, and prints
   per position how far the paid tool's numbers sit from ours (dx, dy in
   drawing units, split by text length to spot left/right anchoring).
   To calibrate positions, render the same inputs with our app
   (`node shoot_many.mjs inputs.json ours 12`, dev app on 3399), OCR those
   (same as step 2 into `ocr_ours/`), run colors.py on them, and compare the
   two dx/dy tables: the difference is the correction to apply.
6. `python3 -I build_table.py` → `table.json` (median color per position,
   number, and whether the name has exactly one middle name), then
   `python3 -I gen_colors.py <repo>/public/number-colors.js`.

`vault-inputs.json` is the list of charts the study could read (id, day, month,
year, name as typed into the paid tool): the seed for a future "find every
chart with number N in position P" feature.
