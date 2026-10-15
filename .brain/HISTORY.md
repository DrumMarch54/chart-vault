# Chart Vault history

Dated stories behind the rules in CLAUDE.md. Never loaded by default; grep it.

## 2026-10-14 Version 1 and deployment
Built in one day: tag import from `UserTag.backup` (merge-only, removed tags
stay removed), uploads from the phone's Files picker, browse/search, chart
view, status, daily backup and zip download. Deployed to the same VPS as the
first app: own folder, port 8090, own service, own cron line, following `main`.

## 2026-10-14 Caching
The phone kept old code after deploys. Fix: the HTML is never cached and the
code files carry the commit in their address (`?v=<commit>`), so every deploy
is a new address no browser or Cloudflare cache can hold on to.

## 2026-10-14 Upload picker
The photo picker on Samsung could not select by filename and recompressed
images; switched to the Files picker. The upload page lists what is still
missing, one code per month, in picker-sized chunks.

## 2026-10-14 Playbook setup
Brought the app in line with the new-app playbook from the first app:
- Fail closed: no WEB_TOKEN → 503 everywhere, never open. Sign-in link `/?t=`.
- `/api/health` says `authenticated`; error answers carry no-store headers.
- Numbered migrations (PRAGMA user_version); imports and uploads record the
  build that made them, so "ran on old code" can be told from "still broken".
- `/api/deploy-guard` + Status line: is the installed auto-deploy current, and
  did it run in the last 10 minutes.
- autodeploy waits up to 5 min when health is unreadable (10 if the last
  readable answer was busy) instead of deploying at once; every decision is
  tested in `test/autodeploy.test.js` with faked commands.
- `tools/dev-app.mjs`, `npm run verify`, `.claude/` hooks (session setup,
  reply style), `.mcp.json` browser, this folder.
- Found while looking at screenshots: the Status page showed the word "null"
  under the counts (and the Tags page under "Past imports") because
  `replaceChildren(null)` renders "null". All calls now go through `fill()`.

## 2026-10-14 Albums and archetype pics
- Gallery albums carry meaning the tag file does not: "9 Mind Center" means
  9mc on every picture inside, often untagged. Folder import maps
  "N Mind Center" -> Nmc; any other album keeps its exact name as the tag.
- "15 pics"-style albums are NOT charts: pictures that visually represent a
  number. They are `images.kind = 'archetype'` (migration 3), tagged with every
  number in the album name ("69 and 96 pics" -> 69, 96). Browse has a
  Charts | Archetype pics switch; a bare number tag means different things on
  each side (strong example of N vs. picture of N) and never mixes.
- The owner's "Charts" album is fully tagged already; ignore it.
- A page reload kills a running upload. The update prompt stays hidden while
  one runs; progress survives switching tabs. Never deploy mid-upload unless
  the owner says so.

## 2026-10-14 Full-screen viewer
- Tapping a thumbnail opens the picture full screen (the main use: pull up a
  person's chart fast). Swipe left/right moves through the current search in
  the same order as the grid (`/api/images/:id/context`); the chart link
  carries the browse query so the viewer knows the list. Swipe up or the
  "N tags" pill opens a sheet with tags, add tag, details. Swipe down closes
  the sheet, then the viewer. Zoom = pinch / double tap; swipes only fire
  when not zoomed. Arrow keys and side arrows on a laptop.
- 2026-10-14 later: the owner only uses Browse day to day. Bottom tab bar
  removed; a gear button next to the search opens Settings (Upload, Import
  tags, Status and backup, Archetype pics). Archetype pics have no switch:
  typing a number shows a labelled "N archetype pics" suggestion; picking it
  browses that side with an "Archetype pics ×" chip. Viewer: no tags pill,
  swipe up opens the sheet, a tap hides/shows the top bar, the picture never
  slides under a finger unless zoomed in.

## 2026-10-14 Quick chart: colors and positions from the vault
- The owner could not get the paid tool's color rules, so they were measured:
  all 711 vault screenshots were read with free local OCR (no tokens, no paid
  service), 436 paid-tool charts recognised, each number matched by position
  and value to what our engine computes, ink color sampled, most common color
  per (position, number) taken. Result: colors are deterministic; the center
  colors depend on whether there is exactly one middle name. Details in
  `.brain/numerology/number-colors.md`, tools in `tools/color-study/`.
- The same matching gave the position of every number relative to ours, which
  fixed 1-5 unit offsets and found that the sub-charts are not mirror images
  (auras left-anchored on the consonant chart, right-anchored on the vowel
  chart). Lesson: a few hundred screenshots beat one reference picture; do
  the measurement once, keep the tool.
- Bug found on the way: the psyche charts' line values (month, year) had no
  x position (NaN) and never drew. A layout key that is defined but never
  read is a smell; the calc script in the study mirrors app.js so a mismatch
  shows up as a "found 0" row.
- The owner was alarmed that OCR of 700 pictures might burn tokens. It does
  not (it runs inside the session's computer), but say what a long background
  job is and that it is free BEFORE starting it.
- Four-name charts in the vault showed the rule for suffixes: "Jr" on the
  main chart is not 3/3 but 14/5 or 17/8 depending on the day. Thirteen charts
  fit one rule: a one-digit name value + day digit sum, + 9 if still under 10
  (augmentation). The earlier note calling that a NotebookLM conflation was
  wrong: it only never happens on the sub-charts. A word with letters but
  none that count (Jr on the vowel chart) stays as 0/0 and is still the last
  name. Two middle names sit at measured spots, two extras side by side.
- `tools/color-study/vault-inputs.json` (id, date, name of 436 charts) is the
  seed for the owner's wanted feature: find every chart with number N in
  position P, tagged or not. Not built yet; needs a design first.

## 2026-10-15 Quick chart: one name's own charts, pyramid weight, full screen
- "Kim" typed once showed "Kim Kim": the rhombus made a single word both the
  first and the last name. Now one word is the first name alone and the
  surname side stays empty until a second word is typed. What the paid tool
  draws for a one-word name is still unseen.
- Tapping a name on the name line (or its chip) opens that word's own charts,
  the paid tool's hover popup: the numeroscope with every LETTER as a name
  (first letter = first name, last letter = surname, the rest middle names
  with one extra vibration each), the word's vowel (vocation) and consonant
  (personality) charts, the number pyramid and the tension weight. All three
  of the owner's screenshots (Peter, Joshua, Shicora, day 19) match to the
  last number, including the pyramid weights.
- The weight formula was not in the slides, only "exponential, ending in n
  on row n" with two example tables. Fitting those: ratio(row k of n) =
  1 + (n-1)·2^(k-n). Tension points: 11/2 = 0.5, 12/3, 16/7, 18/9 = 1; the six
  boosting pairs 1 each; a tension number on top adds its points × n once
  more (the "2.5 penalty karma points" line). Total ratio = total / n(n+1)/2,
  under 0.3 approved. Source: Module 12 (NP-SingleNameChartsNumberPyramids,
  Drive) and the "6. WEIGHTING THE PYRAMID" transcript.
- The psyche pillar triangle was a 14-unit stub with a bold number straddling
  it. Measured on the owner's paid-tool screenshot: apex 489.5, base 540,
  half-width 24, number regular weight inside it. The psyche diamonds
  themselves match the paid tool within 2 units (owner suspected they were
  squashed; measured, they are not).
- Full screen button on the Quick chart: the chart alone, white, edge to
  edge, X to leave. The chart element moves into the overlay and back so what
  was typed stays.
- Follow-up the same day: one word shows only its line value (paid tool,
  "Muslim"); the popup is pyramid first with weight/ratio under it (table
  behind "Details"), then the name chart, then vocation and personality;
  the single-name diamond has the main chart's proportions (it was square,
  "squashed"). Chips and hint under the name box, the "Quick chart" title
  and the browser's full-screen mode (its "drag from the top to exit" toast
  annoyed the owner) are gone; Save and full-screen buttons sit inside the
  chart card. "Save" draws the chart to a PNG in the browser (app styles and
  the font inlined) and PUTs it to /api/quick/save, which files it as a chart
  tagged with the typed name and opens it with its tag sheet.

## 2026-10-15 Tag codes spelled out, recently opened row
- The owner's tags are codes ("19fn", "12mc", "4combo9ec"). Decoded them
  against the charts: recompute each tagged chart from its date and name
  (vault-inputs.json) and look the number up in every position; the owner
  confirmed the rest. Table: `.brain/numerology/tag-codes.md`.
- `public/tag-codes.js` turns a code into words for the screen and a typed
  "12/3 mind center" into the stored forms for search (server loads the same
  file through vm). Stored names never change: filename = identity, tag =
  identity. Unknown codes read as written, so nothing is hidden.
- Recently opened: the last 12 charts opened on this phone, a row above the
  grid on the plain list. Browser storage, wrapped in try/catch; a cleared
  browser just empties the row.

## 2026-10-15 Home screen is recent searches; Back returns to the screen before the viewer
- Owner: the newest-first grid on the home screen was never used ("I'm just
  searching a person's name"). Home now shows this phone's recent searches
  (tap one to run it again; a search that grows by a tag replaces the
  narrower one it came from) and the recently opened row. The grid still
  shows for a search and for Archetype pics. Browser storage, like the
  recently opened row.
- The phone's Back button went back one chart at a time: every swipe in the
  viewer pushed a history step. Chart-to-chart moves now use
  `location.replace` (no step), and the viewer's own ‹ uses `history.back()`
  when the viewer was opened from inside the app, so Back lands on the
  search or screen the owner came from. Opened from a link, ‹ goes to the
  chart's list instead.
- A "missing picture" icon flashed when a chart opened or on each swipe: the
  `<img>` had alt text and no file yet. alt is now empty and the thumbnail
  (already on the phone from the list) shows at once, sized to the stage from
  its own proportions; the full picture replaces it once loaded, same size.
- Two × in the search box: the browser's own clear button on `type=search`
  plus the app's. The browser's is hidden with CSS.
- Quick chart: the ⋮ sits beside the name field (Full screen, Save to
  vault); nothing sits on the chart any more.
- `tools/report.mjs screens` said "Login was refused" with the right
  password: it waited for `#nav`, removed with the tab bar two builds ago.
  Lesson: when a screen element goes, grep tools/ and test/ for it too.
- Same day: the owner wanted the recently opened charts as the old scrolling
  grid, not a side-scroller (now 48, grid like a search result). Quick chart
  screen: the black band under the white card felt "claustrophobic"; the
  screen is white end to end (`html.light`, set on the root, undone through
  viewerCleanup when another screen takes over), fields 40px, chart edge to
  edge. The white on body alone left the band: html has its own background.

## 2026-10-15 Quick chart layout re-measured against the paid tool
- The owner sent the paid tool's chart and ours for the same name and date
  (Peter Joshua Shicora, 21 10 1985) and called the psyche and sub-chart
  numbers "wonky", the pillar number too big, the pillar triangles and
  psyche diamonds wrong, the whole set too big. Measured (tools in
  `tools/color-study/layout/`): numbers were within 1-3 units already, but
  the psyche diamonds were 8% too narrow (hw 92.5 → 101), the psyche pillar
  triangle 50 tall instead of 33, the sub-chart pillar triangles too narrow
  (hw 29 → 34), the center lines 2-3x too thick (12/6/5 → 5/3/2), the pillar
  font 34 → 26, the psyche aura font 23 → 19, the essence circle smaller and
  lower, and the paid tool's circles are ellipses (rx 110, ry 106.5). Every
  text size and baseline was re-derived from box heights; sub-charts sit
  2-4 units higher. The drawing is 960 units wide on screen (was 806), so
  the set takes about four fifths of the width like the website.
- First scare: the main diamond looked 10% wider in the new screenshot than
  in the vault (aspect 0.80 vs 0.72). It was the diamond finder picking up
  a wrong right edge; the shape detector gave 0.725. Measure twice before
  rebuilding a layout.
- Same day, later: 960 units across was "too small" on the phone; 850 now
  (numbers at the edges keep about 19 px of white). Lesson: match the
  phone, not the website's zoom; the owner judges size on their own screen.
- Show and hide parts (⋮ → "Show and hide parts"): a sheet of chips for the
  five charts and for kinds of numbers (day, auras, centers, names, line
  values, spine, life expressions, pillars, letter count, colored shapes),
  with presets Everything / Centers only / Names only / Life expressions
  only. Every element of the drawing carries data-chart and a k-<kind>
  class; hiding is CSS on the svg root, so the saved PNG shows exactly what
  the screen shows. The view box trims to what is left. Browser storage,
  per phone.

## 2026-10-15 Year rows, All tags screen, recent searches in the search box, no pull-to-refresh
- Owner: "I shouldn't be able to pull up and refresh the page". `overscroll-behavior-y: none`
  was on body only; Chrome reads it from html for the viewport. Now on html and body, plus
  a touchmove guard in app.js: a finger dragged down while the page is at the top is
  cancelled unless something under it can still scroll up (sheet, list, popup).
- Owner wants destiny rhythms, yearly rows and the daily forecast. Read Module 17
  (NCE-yearrows_ocred.pdf), the "Yearly Rows" powerpoint cases and the owner's
  USA Yearly Rows. The numbers in those cases pinned down what the slides leave
  implicit (verticals, auras, shadow column, row spans): `.brain/numerology/yearly-rows.md`.
  Built in numeroscope.js with tests on JFK 1963 and Nixon 1972; the Nixon case also
  confirmed the pillar formula with a middle name (34/7). Shown from the quick chart's ⋮
  menu: destiny periods (tap one to jump), one year's rows with ‹ ›, the current row
  highlighted, ↕ verticals under sum rows, tap a number for the course's one-line
  meaning and known combinations; day vibrations for any date with a date box.
- Owner: "something that helps me see all the different categories of tags".
  New All tags screen (home button, Settings, and inside the search dropdown):
  Words (used the most, then A-Z), By position (codes grouped by what the code means),
  By number (every number with its archetype name and every position it is tagged in).
  `/api/tags/all` now counts charts and archetype pics apart. Groups open on tap.
- Owner: "I don't like that thing below the search bar. The recent searches should pop up
  whenever I actually click the search bar." Recent searches moved into the search box's
  dropdown (shown while nothing is typed, with an All tags row); the home screen keeps the
  All tags button and the recently opened grid.
- Lesson: course slides state formulas, course CASES state the conventions. When a
  rule's wording is ambiguous, find a worked example with numbers and match it exactly.
- Same day, later: owner wanted the psyche rows and the hours on the day rows, Arizona time.
  Psyche rows = outer psyche chart (proved on JFK 1961/1963 in the case book). The hours: the
  book page is in a PDF the Drive connector refuses (over 10 MB); the rows are split evenly
  (2 h 40 min) like the year's rows, said so on screen. Fulfillment number added. Ñ = N.
  The clock is America/Phoenix in the code, not the phone's zone. Lesson: `pkill -f` with a
  string that is also in the shell's own command line kills the shell (exit 144); match on
  "node tools/dev-app" and run it in its own call.
- Same day, later: the owner photographed the book's year-row and day-row tables (p.89, p.136).
  Day rows run 00:00-02:40 ... 21:20-23:59 (the even split was right); the day shadow column
  changes ONLY the date row (the year's shadow was wrong, fixed). Both selves sit in ONE table:
  period · formula · human self (num, aura, shadow) · psychic self (num, aura, shadow); sums
  and auras always n/ds, source rows a plain digit. The Name/Psyche switch is gone.
- New standing rule (owner): a course rule that cannot be read from Drive gets a ready-to-paste
  NotebookLM question, never a guess. In CLAUDE.md and USER.md.

## 2026-10-15 The Hub must be read first; merge main first
A chat planning "search charts by position" worked on a branch two days behind
main. It never saw `.brain/numerology/`, `public/numeroscope.js` or the 436
extracted chart inputs, so it guessed position names from the pictures and
proposed building the calculator again. The owner: "that's crazy, the Hub is
the golden grail, use it, across all chats". Two rules: read the Hub (via the
numerology README) before any chart-content work, never guess what it defines;
and merge origin/main into the branch at the start of every session before
planning, so what the other chats built is in view. Grep before building was
already a rule; it does not help when the checkout is stale.
