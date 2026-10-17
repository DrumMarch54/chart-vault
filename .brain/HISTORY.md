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

## 2026-10-15 Augmentation with no day, and a switch for it
Owner typed "Sj" in the quick chart with no date and saw 4/4; expected 13/4.
The engine only augmented when a day was typed ("no day: nothing to add"),
a guess the course never states. The course rule (video "The augmentation
rule"): under 10 → add the day digit sum; still under 10 → add 9. With no
day the first step adds nothing and the second still applies. Fixed, and the
⋮ menu on the quick chart now has "Augmentation on / off" (remembered per
phone) because the owner wants to see the raw values sometimes. The psyche
month keeps the course rule regardless; the sub-charts never augment.

## 2026-10-15 Home layout, tag names with spaces, swipe-down viewer
The owner: name tags should read with spaces and capitals in the search box;
two-tag search is annoying, remove it; nothing but the search box and the
quick chart matter on the home screen; a chart should close like the Samsung
gallery (drag down, the picture comes loose, let go and you are back on the
grid); nothing over the picture until it is tapped.
- Tag names: the stored tag never changes (rule). `server/tagnames.js` decides
  how it reads, with a 60,000-word frequency list and a 9,000-first-name list
  vendored as .gz. Tried a plain wordninja-style split first: it minced
  surnames into scraps ("Steven Crow Der", "Greta Thun Berg"). What works is
  three tries in order (whole word · all common words · first name + the rest),
  with short pieces nearly forbidden, and leaving a name whole when unsure.
  Tuned against all 796 live name tags (read with the password, never
  committed). The list lives server-side only; the phone gets `display` on
  every tag row and the map from `/api/tags/names`. A search typed with spaces
  matches the run-together form.
- Viewer as an overlay: before, the viewer replaced the list and Back redrew
  it from the top. Now the list stays under it and Back lands on the same
  scroll position; this is also what lets the screen show through while the
  picture is dragged. Fresh loads of a chart address draw the list first.
- Dev app people are now run-together names, so the splitter is visible there.

## 2026-10-15 Search by chart position
Built from `.brain/PLAN-position-search.md` (now deleted; this entry is the record).
- The 275 charts the color study could not read (its OCR gate only passed the
  paid tool's white page) were read by vision: the top 60% of each picture at
  720 px wide, 21 per helper agent, results as JSON in the scratchpad, then
  merged. Three styles: the white page with three date boxes and a name box,
  the dark navy page (same boxes), and the pale blue hexagon page with no
  boxes, where the DAY is the bold number under the hexagon, the MONTH the
  hexagon's top-left corner and the YEAR the small gray number. The first
  instruction said the "⊙ 28/1" at the top of the blue page was the day; it is
  the target number. The agents that worked out the right rule from the
  chart's own sums were right; trust a worked check over a written rule.
  8 pictures are not charts (year-row tables, a paper chart, a domain tool).
- Gate: recompute every chart and compare with the owner's position tags.
  The 436 OCR inputs first scored 836 of 913; the misses taught the tag
  habits now in `TAG_POSITIONS`: "66mc" is the mind diamond, "61osle" the
  outer psyche LE diamond, "9lp" a digit sum, "4combo9ec" the two lower
  auras, "8combo15publicdiamond" day beside first name, "68pd" the diamond's
  digits the other way round. The rest were OCR garbage ("ion sar Daniel",
  "Andrewtate", "Ill" for III, "lhan" for Ilhan): 19 names fixed by looking.
  Whole seed: 1230 of 1267 tags agree; the 20 left are mostly charts drawn
  with no date (the tag names the day the card does not show) and three
  tags that match nothing on their chart.
- The paid tool counts José as J O S E (é = e, 16/7) and Rubeš with š = s, but
  Doğan as D O A N (17/8): ğ is a letter with no value. The engine now folds
  accents to the plain letter and keeps Ğ silent; the letter count includes it.
- Screen: "Search by position" on the home screen, in the search box's
  dropdown and in Settings; type a number, see a count per position per
  chart, tap one; the result is the browse grid with `?pos=&num=` (viewer
  swipes follow it, recent searches remember it). The chart page shows the
  read name and date, every computed number as a tappable chip, and "Wrong?
  Fix" / "Type them". Status: counts, tag agreement, "Recompute every chart".
- The permission classifier refused 5 of 12 helper-agent launches and 3 of the
  5 retries ("PII Data Handling", the pictures carry people's names and birth
  dates); the last 63 pictures were read in the main chat. Reading a batch of
  21 costs about 80k tokens of a cheaper model.

## 2026-10-15 Number tools: the paid tool's other features, and reading the books as pictures
The owner asked for the rest of Numerologist PRO's features (price tool, day forecast, coming days, number
fun, relationship, karmic). First attempt took the website's images as the software and asked the owner for
screenshots; the owner pointed out those were marketing art and that the source files should show the real
thing. They did: the course books carry "TOOL: … in Numerologist PRO Software" boxes with real screenshots
(Forecasting Numerology p. 23 is the Today screen; Diamond Method p. 35 is Number fun; the Relations book
p. 569 is the relationship tool). The Drive connector gives PDFs as text only and refuses files over 10 MB,
but a download result lands on disk as base64 and the big books are shared by link, so curl fetches them;
pdftotext finds the page, pdftoppm renders only that page, and the PNG is read as a picture. Lesson, now a
CLAUDE.md rule: read the books as pictures, page by page, never print a whole one, never ask for what a book
shows. Six mockups built from the app's own styles and engine were approved before any code. What shipped:
Today / Coming days (the day chart with the essence and psyche charts, every position's reading from the
Superdates book, a Super / Good / Hard tag that is the app's own reading of the success codes), Number fun
(the big diamond, confirmed on the book's 14/5), Price tool (Marketing Numerology's rules), Relationship (two
day vibrations unpacked like Number fun; matches the website's John + Eve example), Karmic connections
(shared destiny rhythms = same birth-year number), My chart (the owner's numbers on the server). pdftotext's
default reading order interleaves entries at page edges; `-raw` keeps them whole (tools/make-readings.mjs).
## 2026-10-15 Who a chart is: a name under every thumbnail, separate from the tags
- Complaint: scrolling the 15/6 life-path results, charts were labelled
  "Celebrity", "Music", "Peter" or a bare first name. Cause: the label was the
  alphabetically first name-kind tag, capitals first, so "Celebrity" beat
  "charliesheen" and "Dad" beat "Peter". Live count: 165 of 711 charts showed
  a category word, 382 a single word. The owner had tagged first names only
  early on, so every John looked the same.
- Design (approved): every chart gets a Name (images.title), never a tag. Tags
  stay exactly as written and are for searching; the name is for reading at a
  glance. Rules the owner set: first and last name only, no middle names; the
  stage name when that is how the person is known ("Charlie Sheen", not
  "Carlos Irwin Estévez"); "Name · Group" when the group is what they are
  known for ("Kyle Forgeard · NELK"); their own charts "Me", their father
  "Dad", "Mom". Short but complete enough to leave no doubt.
- Seed: `server/chart-titles.json`, one entry per filename, decided once by
  hand from the owner's tags, the full name typed into the paid tool
  (`chart_inputs`, 680 charts had one) and what the chat knew of the person.
  Loaded at startup for charts with no name (`seedTitles`, merge-only, never
  over an owner edit). 41 entries are flagged `check` (a first name nobody can
  complete, a garbled typed name, a guess) and sit in Settings → "Names to
  check" with the picture, the name in a box, the tags and the typed name as
  hints, "Looks right" / "Save". The viewer sheet opens with "Who is this?"
  (Fix / Yes for a guess).
- Search: typing a word in the search box now offers "Everyone named <word>"
  and each matching name above the tags (`/api/names`, word-start match on the
  name, any case); the result is `#/?name=` with its own summary, viewer swipes
  and recent-search memory. A tag search is unchanged, so "John" the tag still
  finds every chart tagged John.
- Snapshot: a `chart names:` line (named / by owner / unnamed / to check) and a
  `name:` line per chart. Test: `test/titles.test.js` (merge-only seed, check
  list, name search, API, seed file sanity).
Same day, after the owner looked: the Coming days grid became the default (charts in a grid, tap for a full
screen day with ‹ › through the days), Number fun was redrawn as the book's wide bands (Diamond Method p. 35,
read at 230 dpi: outer life left, inner life right, names inside the triangles, unbalanced ones small above),
and each day got a drawn planet scene for its ruler. Lesson: a mockup "approved" from a phone still gets
corrected on the live screen; look at the book's own page at full size before drawing anything.

## 2026-10-15 Night look, the Super / Good / Beware rule from the course, Title Case, inline readings
The owner's list after a day with the number tools: no day under the essence chart in Coming Days (the day is
drawn with the hidden name chart; a copy now sits under the cube's point), the super-date logic "way off" (the
app called Oct 15 2026 Good with 61/7 twice; the book says avoid completely), readings that only described the
positions (now the number's keywords and the book's first sentences, tap for the page), a Relationship tool
that would not take a date (day / month / year boxes per person now), lowercase titles (Title Case everywhere,
the owner's rule), aura numbers over the triangle edges in Number Fun (measured at the top of the text), and
"make the forecast page a vibe". Four mockups were published as an artifact (real sky, whole page dark with
two planets, horizon, the paid tool's layout); the owner chose B with the real charts on a not-pure-white card
and the psyche toggle moved out of the chip row. The rule: the Superdates book gives the codes and the
numbers to avoid but no formula ("qualitative, not a score", Cosmic Calendar p. 172); the course video says a
super date must be good in both the main and the psyche chart; the owner asked NotebookLM and pasted the
answer, which named the positions and the disqualifiers. Lesson: a rule the book states in prose still needs
the owner's NotebookLM pass before it is code, and the app must show its reasons on the screen, or "why is
this a Beware day" is a guess again. The first draft rated 317 of 365 days Beware because every psyche
number and every aura was read as a key position; auras repeat the diamonds, and a use-with-care number in
a psyche center now only blocks Super. Settled at about 30 / 100 / 235 for 2026.

## 2026-10-16 Interpretation: facts, AI readings, Ask the Vault
The owner asked for interpretation: patterns and the big picture of a chart in words, stats useful for
reading, patterns across the vault, an AI that reads a chart and answers questions, an AI search ("five
worst charts", "five people most influenced by 8"). Approved (owner's words): paid calls allowed, Claude
Opus 5.5 for readings and Claude Haiku 5.5 for vault questions, the key pasted in Settings, a monthly cap of
$8 with a warning in the app when close and when reached, every Hub document that helps (the chat decides).
- The "no paid AI" rule became "one door": `server/ai.js` is the only place a paid call happens. Key, cap and
  spend in one store, every call recorded and in the snapshot, refused at the cap, the key redacted from any
  text going out and never returned by the API (set / not set + last 4). A test proves it.
- Two layers: rules first (`server/facts.js`, free, instant, from the Hub's balance lists and hierarchy), AI
  on top (course passages for the chart's numbers, cited by source). Readings are stored: paid once per chart.
- The Hub lives in the repo as text (`knowledge/`) with an index per number and topic, so a reading sends
  only the passages about that chart's numbers (about 30k tokens) rather than the whole course.
- The dev app runs a FAKE model so screens can be looked at for free; the fake answers after a second.
- Same day: the owner added the Drive folder "Business PDF's" as a standing source. The Price Tool's rules were
  checked against Marketing Numerology and three were wrong (8 sums, 18/9, the 5-9-1 digit-sum rule); Today and
  Coming Days gained the Superdates books' day words. Open questions for the owner (NotebookLM): what dark blue
  means in The Numbers 10-99 in Business; whether a business Super Date must contain 23/5 (Business Manual p. 19);
  whether a digit sum other than 5, 9 or 1 is "Only With Care" or "Avoid" (Marketing pp. 40, 46, 54).
  Owner's answers: blue = "use your common sense" (taken as the book's heading color, no rating shown); a business
  Super Date need not contain 23/5 (no change); other digit sums are not avoided, "just be smart" (now a tip, the
  verdict stays Good).

## 2026-10-16 The owner's list after a day on the phone: eleven fixes
The owner wrote a list and sent it in one message. What changed and why:
- Search by Position takes two numbers: "4" and "9" find every chart with 4 and 9 meeting in a center or a
  diamond, either way round (`comboSql` over `PARTS`, the same two-part table the combo tags use). One digit
  means the digit sum (the owner's tags: 4combo9ec), two digits the exact number. `num=4+9` in the address so
  the browse screen, the summary and the recent searches needed nothing new.
- Quick Chart: what was typed is kept on the device (`quickDraft` in localStorage) and comes back on the next
  visit. "My Chart" fills the boxes and overwrites the draft.
- The name line diamond (first beside last) only exists for a first + last name. With a middle name the engine
  had still recorded one; now `rhombus` returns null and the position search stores nothing. The live values
  need "Recompute every chart" once after the deploy (done from the chat with the token).
- Super Dates: 31 Oct 2026 was Super because a soft code (15/6) stood as the BIG essence. The book's strongest
  positions are the day and the essence; the big essence only repeats the essence's digit sum. Dominant positions
  are now the day vibration and the essence. 2026: 22 Super / 106 Good / 237 Beware (was 30 / 100 / 235).
  Lesson: a position list in code must match the book's words position by position; "big essence" was never
  named in the rule and crept in as "close enough".
- Price Tool: two modes (Check a Price / Find a Price) and two pickers instead of 22 chips. The owner's word:
  "a total mess". A picker with words beats chips when there are more than six choices.
- Coming Days: the list of numbers is gone; − / + set how many charts across (2-5 on a phone, up to 8 on a
  laptop); at three or more across the cards drop the name and the essence line. The owner: two across still
  too big, one across never used.
- Home: the three stacked big buttons (Quick Chart gold and huge, Search by Position, Ask the Vault) became
  three small tiles in one row under the search bar. Tools become a two- or three-column grid on a laptop.
- Desktop: reading screens stay a 760 px column; grids use the width. Before, every screen stretched to
  1100 px and the Today scene filled half a laptop screen.
- Today: no row of code chips under the chart (pointless, the owner said; the Why box has the reasons). The
  day charts are drawn in light lines straight on the night sky; the pale card had made them hard to see.

## 2026-10-16 Today and Coming Days: the night look goes, the chart is the paid tool's chart
After the eleven fixes the owner looked at Today and Coming Days and said no: the charts must look exactly as
the source material draws them (scale, placement, colors), and the dark sky with recolored light-line charts
"looks bad". Three mockups (A sky on top / white below, B night page with a white chart card, C light page with
a small planet banner) went up as a design artifact; the owner chose C. Now `day()` puts Today, Coming Days and
the full-screen day on a soft light page (#f3f4f8), the planet scene is a 150 px banner with only the ruler's
name, the day's number, name and rating sit in one row under it, and every chart is `numeroscopeSvg` on a white
card with none of the night recoloring. `html.night` and its 40 rules are gone. Lesson, twice now: the chart is
the product; a mood for the page must never touch the chart's colors, size or place. The mockups of the day
chart in the artifact were drawn by hand; the app draws the real one.

## 2026-10-17 Every chart drawn by the app: uniform grid, screenshot one tap away
The owner: the vault's screenshots are not uniform ("some scaled way back, some more fittingly");
draw every chart with our own tool so they all look the same, tap a name for its pyramid and
own charts, and handle the leftovers afterwards (remind them).
- Design: no stored pictures. The list and the chart API carry the read name and date (`inputs`),
  the phone draws the numeroscope itself (`drawnChart` = `numeroscopeSvg(Numeroscope.numeroscope)`),
  so a fix to the engine or to a chart's inputs shows at once and nothing can go stale. Stored PNGs
  were rejected for that reason (the engine was corrected a dozen times in three days).
- Where: grid cells (white tile, the drawing at full width, `content-visibility: auto` so 700 inline
  drawings scroll fine), the viewer (white page, pinch/swipe/drag as before, a tap on a name on the
  line opens `openWord`, "Screenshot" / "Drawn" in the top bar), Compare (each pane drawn when it can
  be), Recently Opened. Charts without inputs keep the screenshot everywhere. `inputsById` remembers
  what the list showed so the viewer draws before its own request answers.
- The zoom helper now passes the element under the finger to `on.tap`, so a tap on the invisible
  name target is told apart from a tap on the page.
- Leftovers for the owner: `?drawn=0` (Settings -> Charts Still Showing the Screenshot) lists the
  charts with no name and date read; the snapshot's DRAWN CHARTS line counts them and says to remind
  the owner. Live at the time: 680 of 711 drawn, 31 still the screenshot, 20 position tags that
  disagree with the computed chart (those draw from possibly wrong inputs; "Wrong? Fix" corrects
  them and the drawing follows at once).
- Looked at in the dev app at 390x844 and 1100 wide: grid, viewer, name popup, Screenshot toggle,
  sheet, Compare, Settings, the undrawn list. No sideways scroll, no console errors.

## 2026-10-17 Year rows and destiny rhythms on every vault chart
The owner, right after the drawn charts: "give me the ability to see the person's destiny rhythms
and yearly rows for every chart in the database". The popup already existed on the Quick Chart
(`openForecast`: destiny periods, one year's rows, day vibrations); the viewer now opens it from the
chart's own stored name and date. A ⋮ menu in the viewer's top bar (the Quick Chart's menu, the owner
knows it) holds "Year Rows and Day Vibrations" and "Screenshot" / "Drawn"; Compare stays a pill
because it is a two-step flow. Three pills did not fit beside the name at 390 px. A chart with no
full birth date says so and points at "Wrong? Fix". The first menu wrapped its long item onto two
centered lines: `.cmenu-item` needed `white-space: nowrap` and a wider menu.
