# Number Fun redesign: build plan (designed on Fable 2026-11-26, build on Opus high)

Owner 2026-11-26: "fix the Number Fun section ... functional and intuitive. And also aesthetic."
Mockups: https://claude.ai/artifact/1FzWK1d9dkw2Mw8iUmFPu6
**Owner picked B (Tabs) on 2026-11-26 and approved counting All Numbers up from 1. Built the same day.**
Mock source, real data, the app's own drawing code: `/home/claude/work/mock/` in the design session
(`screens.js` = the screens, `mock.css` = the styles, `out/*.png` = pictures at 390 px). Copy shapes from there.
This plan was written for A; B (what was built) is the section near the end.

## What was wrong (measured on the dev app, 390x844)
- Four controls for one job, picking a number: a box top right that reads as a label, a lone "All Numbers"
  chip, a sideways strip of 99 buttons, the grid. 170 px gone before the number's name. No previous / next.
- The name is said three times; "Ruler Mercury" squeezed at the right edge over the backdrop's dial.
- The small diamonds are 5 px text on a phone and there is no readable version anywhere.
- The meaning card has no label and does not look tappable; "Where 14/5 Appears" is bare chips (no name, no where).
- A paragraph of instructions at the bottom, and it is wrong (a tap opens the words sheet, not the number).
- All Numbers: two across, 50 rows, starts at 90, no caption on a cell (the name inside is 3 px), no way to jump.

## Never touch
- `tri`, `levelSvg`, `bigDiamondEl`, `BANDS`, `cellSvg` in public/tools.js: the paid tool's drawing, measured on
  the owner's screenshot (HISTORY 2026-10-19, three passes). The redesign is the frame around it only.
- The words in `numberSheet` and where they come from. The math in numbertools.js.
- Stored keys `numberFun`, `numberFunGrid`, `numberFunCols` keep working.

## Screen, top to bottom (option A)
1. Top bar: Back, "Number Fun". Nothing on the right (the `.numin` box goes).
2. Two-way switch, equal halves: **One Number | All Numbers** (same shape as `.vtabs`; replaces the chip).
3. Header card (solid panel, never bare text on the backdrop):
   - row of three: `‹` with the previous number under it ("13/4"), the number big (40 px, a round ▾ beside it,
     the whole middle is one button = Pick a Number), `›` with the next number. 1 has no previous, 99 no next
     (disabled, not hidden: the row keeps its shape).
   - the name, gold, centered, own line.
   - pills, centered, wrap: "Ruler Mercury"; the code kind in Title Case (`T.codeKind` -> Strong Success Code /
     Soft Success Code / Strength Code / Special Code green or plain, Use With Care amber, Number to Avoid red,
     "Strength Code, Not in a Strong Position" amber); the business color word from bizwords
     (`BIZ_COLOR_WORD` + " in Business": Excellent green, Good plain, Can Be Okay amber, Avoid red). No pill when
     the books have nothing.
4. `.slabel` THE BIG DIAMOND, right side "Tap a Diamond". Under it a four-way switch, equal buttons:
   **All Three | Physical | Emotional | Spiritual**, remembered per device (`numberFunLevel`).
   - All Three = `bigDiamondEl(B, jump)` exactly as today, edge to edge.
   - One level = that level's five diamonds big enough to read: the level's own diamond on one wide card
     (`tri` at w 150), then a 2 x 2 of the outer, inner, outer imbalanced, inner imbalanced (`tri` at w 84), each
     card on its band's tint (mock `TINT`), a small-capitals caption above (course name, Title Case, red for the
     imbalanced; reserve two lines so the four triangles line up), "51/6 The Socialite" under it in real text
     (`name: ''` inside the triangle so it is not said twice). A tap = the same sheet as on the big page.
     The box holds a drawn chart: add it to `KEEP` in tools/make-look-colors.mjs.
5. `.slabel` WHAT 14/5 MEANS: one card with the passage shown today, then a full-width row
   "Read Everything About 14/5 ›" = `numberSheet(v, n < 10 ? 'dv' : 'about')`. No second title in the card.
6. `.slabel` 14/5 INSIDE OTHER NUMBERS (count on the right), only when there are any: one row per number:
   number bold, name, and under it where: "14/5 Is Its Outer Diamond". A tap opens that number (`numberfun.tap_other`).
   Needs where: add `NumberTools.whereIn(x, n)` (or make `numbersContaining` return `{ n, level, part }`), tested in
   test/numbertools.test.js: 14 sits in 13 (main, outer imbalanced), 31 (main, inner imbalanced), 46 (main, outer),
   64 (main, inner). Names: Main / Outer / Inner / Outer Imbalanced / Inner Imbalanced + "" / "Essence" /
   "Integration" + "Diamond" (mock `ROLE`).
7. Nothing else. The instruction paragraph goes.

## Pick a Number (sheet, `A.sheet` + `trackOverlay`)
- `.slabel` PICK A NUMBER / "1 to 99". Ten across, a row per ten, 1 to 9 on top with the first cell empty so the
  ones line up under each other (the paid tool's table read downward). The open number is marked. One tap picks
  and closes. Close button. No keyboard anywhere. Count `numberfun.pick` (retire `numberfun.type`, change its
  `USAGE_LABELS` line in the same commit); arrows count `numberfun.step`; the level switch `numberfun.level`.

## Tap a Diamond (the sheet that exists, better top)
- `.slabel` says what was tapped: "Outer Diamond of 14/5". Then that diamond drawn big (`tri` w 150 on its band
  tint), then "51/6 The Socialite", the same pills as the header, "Open 51/6 in Number Fun" (primary), then the
  books' words as today, Close. `numberSheet` gets the drawing through its `extra` argument; Relationship and the
  other callers stay as they are.

## All Numbers
- Same top bar and switch. Then one row: label JUMP TO on the left, `−  Size  +` on the right (the rule: a grid's
  size control sits in the page's top row). Then ten equal buttons in one row, no sideways scroll:
  1 10 20 30 40 50 60 70 80 90; a tap scrolls that ten into view (`numberfun.jump`).
- Cells grouped by ten under small-capitals headings ("10 to 19"). Each cell is a card: the number bold, the name
  under it on its own line (ellipsis only when it must), then the miniature three-level page exactly as today
  (`cellSvg`, the owner's pick B). The open number has a gold outline. Tap = open it.
- Order: ascending, 1 first, whenever fewer than ten across. At ten across keep the paid tool's page (nineties on
  top, no headings, no captions): that is its table exactly. Owner approved ascending.

## Styles
- Every color a variable; no hex in a rule except inside a drawn chart's box. Solid `--sheet` behind sheets.
- New classes get their own prefix (`nf-`); do not restyle `.reading`, `.bignum`, `.chip` for other tools
  (Relationship uses `bigDiamondEl` and `.bignum`: check it still looks the same).
- Laptop: one number stays the 760 px column; the grid uses the width.
- Delete what nothing uses afterwards: `.numrow`, `.numin`, `.togglerow` only if no other tool uses them (grep).

## Done means
- `npm run verify` green; the new test for where a number sits.
- `node tools/dev-app.mjs`, screenshots at 390x844 of: one number (All Three, one level), Pick a Number, Tap a
  Diamond, All Numbers, in ALL FIVE looks; read the PNGs; put them beside the mock; fix what differs. Then 1280 wide.
- `node tools/make-look-colors.mjs` re-run; test/looks.test.js green.
- CLAUDE.md "Number tools" lines about Number Fun rewritten to this design; HISTORY entry; software-tools.md row.
- Reply ends with how to check and `Build: <commit>`.

## If the owner picks B (Tabs, like the chart sheet)
Header = number tile + name + pills (left-aligned); four equal tools (`.vtool` shape): previous, Pick, All Numbers,
next; tabs Diamond / Levels / Meaning / Found In, remembered. Diamond = the big page; Levels = step 4's cards with a
three-way level switch; Meaning = the sheet's passages laid out under small-capitals labels; Found In = step 6's rows.
No One Number | All Numbers switch (All Numbers is a tool; its screen gets a Back to the number).

## If the owner picks C (Simple)
A without the level switch and without the where-rows: header card, the big page, the meaning card, the numbers it
sits in as chips, "See All Numbers ›" as the last row. Reading a small diamond = tap it (the sheet draws it big).
