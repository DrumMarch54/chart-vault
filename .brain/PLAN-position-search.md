# Plan: search charts by position (handed from the planning chat, 2026-10-15)

Goal: the owner picks a position (plain words, e.g. "mind center of the name
chart", "vocation mental diamond", "day"), a number (12/3, 57/3, 13/4) and
sees every chart in the vault that has it, as thumbnails, tap to open.

## What already exists (do not rebuild)
- `public/numeroscope.js`: computes all five charts from name + date. Proven
  on Dahmer (#698) and Epstein (#133): every number on the screenshot matches,
  middle-name extras, pillars, psyche charts and diamonds included.
- `tools/color-study/vault-inputs.json`: 436 charts with id, day, month, year,
  name as read off the picture by OCR. Paid-tool screenshots only.
- `.brain/numerology/tag-codes.md`: the owner's tag codes decoded, each one
  checked against the recomputed charts. These tags are the quality gate.
- `tools/color-study/README.md`: how the OCR reading was done (rapidocr, free).

## Steps
1. Read name + date off the ~252 charts not in vault-inputs.json (mostly the
   old blue numpromember.com style and the purple/orange app style). Cheapest
   reliable way: crop the top of the picture (the typed day/month/year boxes
   and the name box) and read that crop; a helper model can do the reading,
   the main chat checks. Some charts have no date (name chart only): record
   the name, leave the date empty; those get name-chart positions only.
2. Check all read inputs, old and new. Known failure: #458 "Andrew tate" was
   read as "Andrewtate" (one word → no centers). Gate: recompute every chart
   and compare with the owner's position tags; a tag that disagrees means a
   misread name/date (or a wrong tag) → look at the picture. Also compare the
   read name with the chart's name tag.
3. Store: one table `chart_values(image_id, chart, position, sum, ds)` filled
   by a server-side run of the same engine (numeroscope.js runs in node; see
   test/numeroscope.test.js for how it is loaded), plus `chart_inputs(image_id,
   day, month, year, name, source, build)`. Numbered migration in server/db.js.
   Record the build. Recompute on demand (button on Status), never by hand.
4. Search screen (phone, 390×844): position picker in plain words (grouped by
   chart), number box, results grid like the home grid; include diamonds
   (two digit sums side by side) since the owner searches those too. Each
   chart's page shows its computed numbers with a "wrong?" tap that lets the
   owner fix the name/date and recomputes.
5. Report script: the snapshot lists how many charts have inputs, how many
   are unread, and the tag-agreement count, so a chat can see the state.

## Tokens
No reading of whole pictures: the engine does the math. Reading 252 small
crops with a cheaper helper model, in batches of 20, saving each batch to a
file in the scratchpad and then into the database, costs little and survives
a stopped chat. Run `npm run verify` before every push.
