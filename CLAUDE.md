# Chart Vault – notes for Claude sessions

The user is not a programmer and works from a phone, often by voice-to-text.
Give them numbered steps in plain words and say what they will see. Never ask
them to read code or run a command. The reply style is injected on every
message from `.claude/response-style.txt` (hook in `.claude/settings.json`).
Who they are: `.brain/USER.md`. Why a rule exists: grep `.brain/HISTORY.md`.

## Deploy
- Production follows the `main` branch. Push with `git push origin <branch>:main`,
  then check with `git fetch origin main && git rev-parse origin/main`.
- The VPS pulls every minute via cron (`deploy/autodeploy.sh`, installed as
  /root/chart-vault-autodeploy.sh), runs `npm ci`, restarts `chart-vault.service`.
  Waits while `/api/health` says `busy` (10 min max) or does not answer (5 min).
  `test/autodeploy.test.js` drives every decision; change both together.
- Status screen and `GET /api/deploy-guard` say whether the installed copy is
  `current` / `stale` / `missing` and when it last ran.
- Live at https://charts.tiktok-automation.com (Cloudflare Tunnel → 127.0.0.1:8090).
  Down = Cloudflare 502. See SETUP.md. No GitHub Actions. Outside calls: the AI (server/ai.js), Wikidata (free) and Commons photos (server/photos.js, free).
- A reply that changed code ends with `Build: <short commit>`; the phone shows
  "Updated to build <commit>, tap to reload" within 15 s of the deploy.

## Numerology knowledge (the Hub: read it BEFORE any work about charts, positions, numbers or tags)
- The owner's Google Drive folder "Hub" is the whole system: the five charts, every
  position's name and formula, every number's meaning. The owner calls it the golden
  grail. Start with `.brain/numerology/README.md` (index, Drive ids, how to open the
  Hub from a cloud session). Never guess a position name, a formula or a meaning the
  Hub defines; never ask the owner for one before reading it. A chat that built or
  labelled anything about charts without reading the Hub got it wrong (HISTORY 2026-10-15).
- Second source folder (owner's rule 2026-10-16): Drive folder "Business PDF's"
  (id 1icGqT828pD6Rxkk5j8jbSiBBDjr6vQaW): business numerology, product numeroscopes, Your Business
  and Brand, Marketing Numerology, the two Superdates books (Success Codes & Superdates, Superdates
  Cosmic Calendar: the day-by-day interpretations), the numbers 1-99 for business, transcripts.
  Anything in the app about prices, business, brands, day forecasts or coming days must take its
  words from there; the index is `.brain/numerology/README.md` "Business PDF's".
- Start of every session: `git fetch origin main` and merge it into the branch
  before planning. A stale checkout hid all of this from one chat for an hour.
- The course rules for the charts live in `.brain/numerology/` (start with its
  README). Read `chart-construction.md` before touching `public/numeroscope.js`
  or the Quick chart screen. The owner's Google Drive folder "Hub" is readable
  from a cloud session with the Drive connector; ids are in that README.
- Words about two numbers together (owner 2026-11-26, "train you ... to interpret combinations"): read
  `.brain/numerology/combinations.md` first; every correction the owner gives goes into it, dated, in their words.
- Tag codes ("19fn") are decoded in `.brain/numerology/tag-codes.md` and
  spelled out on screen by `public/tag-codes.js`; the stored tag never changes.
- Number colors are the paid tool's OWN tables, read off its live page script
  (`tools/color-study/paid/`: fetch.mjs signs in with `NUMPRO_USER` / `NUMPRO_PASSWORD`
  from the environment, never the repo or the chat; the members' form is
  numpromember.com/login/, not wp-login; gen.mjs writes `public/number-colors.js`).
  The rules switch tables by the number of words in the name; `lookup(slot, text, words)`.
  Never hand-edit the table or guess a color: re-run fetch + gen. Exact positions still
  come from the screenshot study (`.brain/numerology/number-colors.md`, `tools/color-study/`).
- The course books can be READ AS PICTURES: find the page by text search, render only that page
  (`.brain/numerology/README.md` "Reading PDFs"). The paid tool's real screens are the "TOOL:" boxes
  in the books; the website's images are marketing art. Never print a whole book; never ask the owner
  for a screenshot of something a book shows. Each feature of the paid tool, built or not, and where
  its rules were read: `.brain/numerology/software-tools.md`. Keep it current when adding a tool.
- A layout complaint comes with a paid-tool screenshot: run
  `tools/color-study/layout/` (compare.py) against it and change only what it
  measures as off. The numbers it prints beat anyone's eye.

## Rules that must hold
- Drawn charts (owner's ask 2026-10-17): a chart whose name and date are known is drawn by the app
  (`drawnChart`, the Quick Chart drawing) on the grid, in the viewer and in Compare; the screenshot
  stays one tap away ("Screenshot" in the viewer's top bar) and is never deleted. Charts without a
  name and date still show the screenshot: Settings -> "Charts Still Showing the Screenshot"
  (`#/?drawn=0`). Emptied 2026-11-27 (owner deleted all 24; restorable in Deleted Charts). Remind only if it fills again.
- **Open item (owner 2026-11-23): remind the owner to fix how the charts look in the new looks** (the white ground
  "glaring" on Glass on Color; see-through grounds shown in https://claude.ai/artifact/8jxLVKyac8MUnCkfP1bt2w).
  Owner 2026-11-23: leave the charts WHITE until then (a dark chart ground was wrong); the fix will be see-through.
- A name typed as ONE word + a number ("Asmondgold 11", "6ix9ine 17", "N3on 0", "Google 13") is ON PURPOSE (owner 2026-11-25):
  the owner's way of studying one name with a birth date; 0 is another way. Never flag it as a typo or "fix" it.
- Birth name vs known name (owner 2026-11-25, Freud: born Sigismund Schlomo): the birth-name chart stays; the known
  name gets its own chart with the same name under the picture and the same name tags. A ONE-word known name gets
  two: "MrBeast 16" (the day's digit sum + 9: the 7th -> 16) and "MrBeast 0". The sheet's Overview lists them all as
  "Charts of This Person" (`GET /api/images/:id/charts`, same `images.title`), each labeled Birth Name / Known As /
  One Name With the Day / One Name With 0 (`chartKind` in app.js).
  A family word under the picture (Mom, Dad, Me) is a LABEL, never a known name: no chart is ever made from it
  (owner 2026-11-27: "Mom 18" made by the 2026-11-26 batch). Known-name charts only for a public stage or pen name.
- The chart sheet is TABBED (owner's design 1, 2026-11-26): header, Pyramid / Year Rows / Similar / More, then
  Overview / Archetypes / Reading / Ask AI. More = Quick Chart, Google, Share, Screenshot, Edit Name and Date (the
  one edit form: name under the picture + typed name + date). Design rules: `public/CLAUDE.md` "Designing".
- Never lose or mix up a chart or a tag. Filename = identity. Tags are kept
  exactly as written, never renamed or "fixed". How a tag READS is separate:
  `server/tagnames.js` splits run-together names ("alexjones" → "Alex Jones");
  every tag row the API sends carries `display`, `/api/tags/names` lists them
  all, and the screen goes through `pretty()`. A wrong split reads worse than
  none, so the splitter prefers leaving a name whole; fix a bad one in FIXED.
- Who a chart is = `images.title` (server/titles.js), the label under the thumbnail
  and the viewer's title; never a tag. First + last, or the stage name, or
  "Name · Group"; no middle names. Seed `server/chart-titles.json` fills blanks at
  startup, never over an owner edit; guesses carry `check` and show in Settings →
  "Names to check". Search box: "Everyone named X" = word-start match on the name.
- Re-importing a tag file must only add. Tags removed in the app stay removed
  (`removed_tags`). Tags added in the app survive imports. A chart deleted in the app
  (`server/trash.js`, viewer ⋮ → Delete This Chart, hold to confirm) keeps its picture in
  `data/trash/` and its whole record in `deleted_images`; imports skip its filename; Settings →
  Deleted Charts puts it back. Possible Duplicates (same picture or same name and date) are only
  listed, never deleted by the app; "Keep Them All" hides a group (`duplicates_kept`).
- Paid AI calls go through ONE door, `server/ai.js` (`callModel`): key, monthly cap and spend in
  `data/ai.json`, every call recorded and in the snapshot, `canSpend` refuses at the cap. No other
  outside or paid call anywhere. No user accounts; one shared password (WEB_TOKEN).
  No WEB_TOKEN = nobody gets in (503), never everyone. Sign-in link: `/?t=<password>`.
- Runtime files (data/, backups/, .env, the real UserTag.backup) stay out of git.
  `test/repo.test.js` fails if a file is both ignored and tracked.
- A course book's passage says its book and page (`<!-- page N -->` marks in knowledge/raw,
  `knowledge/books.json`). Keep the marks when editing a raw file; a re-export is re-aligned,
  never retyped (knowledge/README "Page numbers"). A hand-written point from a lecture is cited
  by the minute it was said (`cites: { book, at }`, the lecture named in books.json `lectures`).
- Schema changes: add a numbered entry at the end of `MIGRATIONS` in server/db.js.
  Never edit a shipped one. Imports and uploads record the build that made them.
- Error answers (status ≥ 400) are never cached; the app shell is versioned by commit.

## Search by position (built 2026-10-15)
- A chart's typed name and date live in `chart_inputs`; every number of every
  position the engine computes from them lives in `chart_values`
  (`server/positions.js`, the one list of positions and of what each tag code
  means). `server/chart-inputs.json` is the seed, by filename: loaded at startup
  for charts that have none, never over an owner fix. Add new reads there.
- The owner's position tags are the quality gate: `tagCheck` (snapshot and
  Status) says how many agree. A disagreeing tag = a misread name or date;
  look at the picture, fix on the chart page ("Wrong? Fix") or in the seed.
- Changing the engine: tap "Recompute every chart" on Status (or POST
  /api/positions/recompute). Values are never edited by hand.
- Two numbers ("4 meets 9", `num=4+9`) search a combination: the two parts of a center or a diamond
  (`PARTS` in positions.js, `comboSql`), either way round; a one-digit part is the digit sum. The name line
  diamond exists only for a first + last name (no middle name); the engine stores nothing for it otherwise.
- What made a number (owner 2026-11-16, "35/8 where the 3 comes from 12/3", "a pure 3"): with two numbers the picker shows
  "Plain 3 Only" (`!3`, a 3 that is no 12/3) and "Making 35/8 / 53/8" (`12+5@35`: the diamond itself is 35, so 53 never
  counts). Only diamonds make a number (`MADE_BESIDE`, digit sums side by side); a center's circle never does.
  `parseNumber` also reads "35 from 12" and "36/9 from 12/3 and 15/6" (a one-digit part there is plain).
- Several positions at once (owner 2026-10-17, "day 8 AND first name 15"): a search is a list of conditions,
  pairwise in the address (`?pos=essence.day&num=8&pos=name.first&num=15`, `conditionsSql`); the grid shows one
  chip per condition (tap = change it, × = drop it) and "+ Another number", which reopens the picker with the
  conditions kept and every count narrowed to them (`/api/positions/counts?num=&fixed=pos:num,…`).
- Higher Self Diamond (owner 2026-11-07, the owner's own name): the day's digit sum = the dharma diamond's digit sum
  (dharma 78 = 15/6, day 6/15/24), so the higher self chart reads like one number's diamond. Search by Position's
  "Higher Self Diamond" row → `#/?pattern=hsd`; whole-chart shapes live in `PATTERNS` (server/queries.js).
- Search by Position SCREEN (owner 2026-11-25, "almost unusable" before): `public/positionmap.js`, one screen (`#/position`,
  `#/combo` is the same route). A BLANK numeroscope (the app's own drawing, numbers off): tap a small chart to zoom, tap a
  spot, a sheet asks the number (Exactly 12/3 or Any 3; Any 4 or A Plain 4 Only). A picked number sits on its spot at the
  chart's own size and ink on a gold mark. A spot already searched opens to change it (Change It / Remove), never twice.
  A CENTER with sub vibrations is ONE sheet whichever number is tapped: Main Vibration + Sub Vibration, one or both;
  both = Exactly Like This (two conditions) or Either Way Round (the combination). Any one of several subs counts.
  "Pick From a List": six chart buttons, spots grouped two to a row, Diamonds last with what makes them, Higher Self
  Diamond under Essence. Settings -> Search by Position Chart: Names on the Spots (default) or Clean Chart.
- Position RESULTS (owner 2026-11-25: the search was said three times): "‹ N Charts", one row per spot (tap = change on
  the search screen, × = drop), "+ Add Another Spot"; no search box, no size buttons, two across on a phone. Numbers read
  "Any 4", "Plain 4", never "digit sum". Back: results -> search screen (spots kept) -> where it was opened from
  (`showPositionResults` pushes, `editPositionSearch` steps back, `fromPos` in history.state).
- A number searched ANYWHERE (`*.*` or `chart.*`, one condition, no combo) lists the charts holding it the most first,
  the count (`hits`) on each thumbnail, counted like the Reading's repeats (`NOT_A_REPEAT` in positions.js, one list
  with facts.js); `hitsOf` in queries.js orders the list and the viewer's prev/next alike.
- The position search in the phone's Back history (owner 2026-10-21, 2026-11-25): search screen, then results one step
  further; every other move inside uses `swap`; `inFlow`/`flowFromApp`/`leaveFlow` in route().
- Similar Charts (owner 2026-10-19): viewer ⋮ → "Similar Charts" (`#/similar/<id>?by=`), `server/similar.js`
  scores every other chart by positions holding the same number (same position, repeat and sum; hidden helper
  positions excluded), per chart; chips rank by every chart or one; a row opens Compare. No AI, no guesswork.
  Each row's line NAMES what is alike in the course's words (`gistOf`, `positionName`, `lingo.md`): the biggest
  matching structure only ("Outer Psyche Life Expression Diamond", never "half the outer psyche"), Title Case.
  Owner's rule 2026-10-19: anything on a screen about a position uses the position's course name.
- Whole Name Pyramid (owner 2026-10-17): every name run together with no spaces as one word, pyramid only
  (`openWord(..., { wholeName: true })`); "Pyramid" beside the name in the viewer's sheet, in the viewer's ⋮ menu
  and in the Quick Chart's ⋮ menu.
- The Quick Chart keeps what was typed on the device (`quickDraft`) and brings it back on the next visit;
  "My Chart" overwrites it.
- Open in Quick Chart (owner 2026-11-25): chart sheet "Quick Chart" button and viewer ⋮ hand the chart's name and date
  over through `quickDraft` (as Look Up and Research do); the vault's chart is never changed.

## Home and What This Group Shares (2026-11-20)
- Home order (owner 2026-11-27): no app name on top (search box + gear), two top tiles Quick Chart and Look Up, then Tools
  as small tiles (By Position and Ask the Vault first, the rarely opened behind "More Tools", `homeButtons` in tools.js), then
  Recently Opened (two rows, "Show All", no size buttons). Move a tile only on the counts or the owner's word.
- Back after a while (owner 2026-11-20, "backing out a million times"): every Back-history step carries its depth
  (`history.state.d`); away over 15 min (`AWAY_MS`, `lastSeen`), `backToStart` rewinds to the first step and opens
  home. A new `pushState` must carry `d: depth + 1`; a `replaceState` keeps `history.state`.
- What This Group Shares (`server/group.js`, `GET /api/group?tag=`, `#/group?tag=`, the button on a tag's results):
  a tag's people against the rest of the vault, per position and number. One person counts once; copies of a
  position (`NOT_A_REPEAT`) never count. The label on a card (Strong / Worth a Look / Could Be Chance) comes from 300
  random groups of the same size, never from the raw chance: with thousands of pairs tried, the raw chance called
  luck "Strong". Counting only: no meanings, no AI. Weak finds stay folded.

## Number tools (built 2026-10-15): Today, Coming days, Number fun, Price tool, Relationship, Karmic connections, My chart
- Screens in `public/tools.js` (app.js hands over its plumbing through `Tools.install`), math in
  `public/numbertools.js` (node-tested in `test/numbertools.test.js` against the books' own examples:
  14/5 big diamond, 24.12.1999, John 25/7 + Eve 21/3, the price verdicts). The book's words per
  position in `public/readings.js`: GENERATED by `tools/make-readings.mjs` from the Superdates PDF,
  never hand-edited. Rules and sources: `.brain/numerology/software-tools.md`. The business books' words per
  number (Price Tool verdicts, Today's business cards) are in `public/bizwords.js`, GENERATED by
  `tools/make-bizwords.mjs` from the Business PDF's books; `make-readings.mjs` also reads the Cosmic Calendar.
- Super / Good / Beware on a date (`rateDate` in numbertools.js) follows the course as NotebookLM
  summarized it on 2026-10-15 (`.brain/numerology/software-tools.md` "Rating a date"): a number to avoid
  anywhere in the day chart or a psyche center = Beware; a primary code as the day or the essence ITSELF
  (never the big essence: 31 Oct 2026, owner 2026-10-16) plus a strong and a soft code, psyche clean = Super.
  The reasons are on the screen ("Why …"); never change the lists without the book page. Screen titles,
  buttons and chips are Title Case everywhere (owner's rule).
- Coming Days is a grid of day charts only (the list of numbers is gone, owner 2026-10-16); − / + set how many
  across (2 to 5 on a phone, more on a laptop), remembered per device. Number Fun (owner's design B, 2026-11-26,
  `.brain/PLAN-number-fun.md`): header (number tile, name, pills: ruler, code kind, business color), four tools
  (previous, Pick = a 1-99 sheet, All Numbers, next), tabs Diamond / Levels (one level's five diamonds drawn big) /
  Meaning (`numberSections`, the same words as the pop-up) / Found In (`placesIn`: "14/5 Is Its Outer Diamond").
  A tapped diamond pops up drawn big with its place's name. No keyboard box. All Numbers is `#/numberfun/all`
  (a Back step): grouped by ten from 1, a card per number, Jump To, − / +; ten across = the paid tool's page.
  `tri` / `levelSvg` / `bigDiamondEl` are the paid tool's measured drawing: redesigns change the frame only. The Price Tool has two modes, Check a
  Price and Find a Price (two pickers: the vibration, the range), never a wall of chips. Today has no row of
  code chips under the chart.
- Today, Coming Days and the full-screen day use the day look (`day()` in tools.js, `html.day` in app.css,
  the owner's pick C on 2026-10-16): a soft light page, the planets in a small banner, and the charts drawn
  by `numeroscopeSvg` on white EXACTLY as the Quick Chart draws them: never recolor, rescale or move a chart
  for a screen's mood. The other tools stay on the white page.
- Four more tools (owner approved the designs 2026-10-20): **Find a Date** (`#/finddate`, `NumberTools.findDates`: the Cosmic
  Calendar's purpose → day-of-month table, Super and Good days only, the company fit by the business's start day);
  **Plan With Year Rows** (`#/planrows`, `NumberTools.rowHits`: the Forecasting book's good and difficult combinations found
  in a year's rows; the table is app.js `rowsTable`, the SAME one the Year Rows popup draws, hits ringed gold; a triad like
  5-3-8 is two source rows and their sum down the number or shadow column); **Famous People** (`#/famous`,
  `public/celebrities.js` GENERATED by `tools/make-celebrities.mjs` from the results book: by birthday, by career, the
  vault's charts born that day); **Share Picture** (viewer ⋮ and Quick Chart ⋮: the drawn chart as a PNG through `chartPng`,
  the phone's share sheet or a download; a screenshot-only chart shares the screenshot; NO name or date under the
  picture, owner 2026-10-21: the name line already says who; the name is the share title and file name only).
  House Number, Phone and Domain, Business Words (`#/house`, `#/phone`, `#/words`; words in `public/placewords.js`,
  GENERATED by `tools/make-placewords.mjs`; English words by value in `server/words.js`) came the same day.
- My chart (`server/mychart.js`, `data/mychart.json`, GET/PUT `/api/mychart`): the owner's own name
  and birth date; the home "My chart" button opens the quick chart with them (`#/quick?me=1`).

## Reading a chart (built 2026-10-16): facts, AI reading, Ask the Vault
- `server/facts.js`: the rules from the Hub, free and instant (nexus, repeated numbers, unbalanced and
  karmic numbers by position, center balance, 4-8 tension, rarity, weaving pairs; `BALANCE` is the one
  list; `chartScores` / `rankCharts` give "worst charts" and "most influenced by N"). No AI in it.
- `knowledge/`: the Hub as text (`knowledge/raw/`, one file per Drive doc), indexed per number and
  topic by `tools/build-knowledge.mjs` into `knowledge/index.json` (rebuild after adding a document).
  `server/knowledge.js`: `coreText()` (how to read) and `contextFor(values)` (the course on this chart's
  numbers). The AI gets course words only, cited by source; never a guessed meaning.
- `server/reading.js`: Claude Opus 5.5 writes a reading from the numbers, the facts and the course passages;
  stored in `readings` (migration 7) with the owner's choices: Length (Short = straight to the point /
  Normal / In Depth), Focus (Everything, Nexus, Mind and Emotion, Pain Points, Strengths, Name Chart, Psyche,
  Career and Money, Love, Business) and a free note. Same choices again = the stored one, free; "Write
  Again" pays for a new one; every reading is kept. The request is cache-friendly: system (style + core)
  and the chart block are byte-stable and marked for reuse; the choices and the question come last. Questions about
  a chart are stored under it. `server/ask.js`: Claude Haiku 5.5 answers "Ask the Vault" with tools that run
  the app's own searches and ranks (`find_charts`, `rank_charts`, `chart_numbers`, `find_people`,
  `show_charts`); the answer carries the ids to show. Both go through `server/ai.js`.
- Screens: `public/reading.js` (viewer sheet "Reading", `#/ask`, Settings → `#/ai` for the key and cap,
  the cap banner on home). Owner's cap: $8 a month; warn in the app at 80 % and at the cap. The key is
  shown as "ends in …xxxx" only. The dev app has a FAKE model (`tools/dev-app.mjs`); `test/ai.test.js`
  proves the key never leaks and the cap blocks. Measured 2026-10-16: a reading about 25-40 cents (about 50k tokens in,
  mostly course passages); a question about a chart about 3 cents while cached; a vault question about a cent. Never call the model from a test or a tool.

## Look Up Someone (built 2026-11-01)
- Home "Look Up" tile, or press and hold the app icon (manifest shortcut, `#/lookup`): type a name or describe someone.
  No microphone button anywhere (owner 2026-11-23: the keyboard's own speech-to-text does it); the box takes the cursor at once. `server/lookup.js`: the vault first, free
  (`vaultMatches`); then Claude Haiku 5.5 with the web search tool finds the birth name and date (`give_answer`, up to
  three people). Searches cost $0.01 each on top of tokens (`WEB_SEARCH_USD` in ai.js). A source is shown only if the
  search returned it; no source = "unsure". Nothing is saved until Save to Vault (`/api/quick/save` with `title` = the
  public name). Lookups are in the snapshot (LOOK UP SOMEONE). Screen: `public/lookup.js`.
- Businesses and organizations too (owner 2026-11-14): `kind: business` = the REGISTERED name (register first) and the DATE OF
  INCORPORATION (Module 12: the company's birth date; LLC/Inc./Corp. not counted, `chartName`). Every other name and date the
  sources give is laid out as tap-to-pick buttons (`names`/`dates`), never decided for the owner: a name with a legal ending
  both ways (`ending`, `with`), the founding AND registration dates, a year-only date listed (`partial`), where it is recorded
  (`register`). "Not right? Tell it more" re-searches.
- Same name, other person (owner 2026-11-22, "James Holmes shooter" ≠ a football player): every result carries `match`
  (fits / maybe / same_name) + `match_why` against every detail said; only `fits` can be sure; same_name results sit folded
  under "Others With This Name", never mixed with the ones that fit.
- Digging (owner 2026-11-22, "be clever"): up to 8 searches; past encyclopedias to social birthday posts ("bday",
  "happy birthday"), Find a Grave, obituaries, genealogy and court records. Every name and date lists where it was
  found (`from`, only a page the search returned); a person's lists always show, even with one choice.
- Past Searches (owner 2026-11-16): every web search's whole answer is kept in `lookups` (migration 9, `storeLookup`);
  the Look Up screen lists them under the box, a tap opens one free (`#/lookup?past=<id>`, vault matches redone), hold to remove.

## Research a Group (built 2026-11-23)
- Home Tools "Research a Group" (`#/research`): the owner says a category ("computer coders", "trans people", "coffee chains").
  `server/research.js`: a JOB on the server (`startResearch`, the phone only watches it): Claude Haiku 5.5 + web search in
  ROUNDS of 30 (`give_group`, each round told who is already found) until a round brings fewer than 5 new ones. It never
  passes $2 (`LIMIT_USD`, owner 2026-11-25; was $1) by itself: status `paused`, "Keep Going" allows another $2 (owner 2026-11-23: "the more data
  the better ... prevent it from racking up a huge bill"). A restart mid-search = `interrupted`, what was found is kept.
  Kept in `research` (migration 11, Past Research, opens free). Screens (`public/research.js`, one route): ask, Who It
  Found (ticks, `?view=who`), results (`?id=`), one person (`&p=`).
- THEMES (owner 2026-11-23, "so many nines in the solar plexus centers ... isn't it obvious?"; the first build missed it):
  group.js counts a number FAMILY (9, 18/9, 27/9: "Any 9", the plain number included) beside each exact number, and
  several finds of one family in one part of a numeroscope (`AREA`: a center = main and sub vibration, sub diamond, its
  diamond) are ONE theme, "Nines in the Name Chart's Emotion Center (Solar Plexus)", shown first whatever its label and
  measured against random groups like every find. The same on a tag's What This Group Shares. Never read finds one by one.
- Nothing is saved to the vault until Save to Vault / Save All. People found online are counted IN the group only
  (`sharesOf` in group.js, `extra`), never among "the others": strangers never shift the yardstick. The vault's own people
  of the same kind join (`vault_kinds` = FIELDS / FLAGS); someone the vault already has is that vault chart.
- Public figures only. A PERSONAL category (gender identity, sexual orientation, health, religion ...; the model's flag OR
  the `PERSONAL` words) lists only people who said it themselves, each with a page the search returned; the rest are
  dropped and counted. A date with no such page stays but is marked Not Checked Online. Never loosen either.
- Growing a group (owner 2026-11-23: "we need a much bigger database ... tie up all the loose ends"): What Next? always
  offers Search Everything (`auto`: the plain search, then angle after angle by itself, until 3 ways in a row find
  nobody new; asks at every $2), One More Plain Search, one angle and Check the Dates (no adding by hand: owner
  2026-11-23, "I'm not going to use that"). A category typed again OPENS the research that holds it (`findResearch`), never a twin. Up to 1,500
  people. An old research (no angles stored) gets every option too: test a new option on research #1's shape.
- What Next? (owner 2026-11-23: "give me a pop-up ... and just give me the options"): when a search stops, a card says
  why and offers every choice with its cost: Search From Another Angle (three the AI suggests each round, or the
  owner's own; `ANGLE:` in the round, `tried` kept), Check the Dates (`checkDates`: every date with no page from the
  search is looked up on one; a corrected one keeps the old in `was`; no page = stays marked), Done. Screen words:
  "Date Not Confirmed" = the AI wrote it from what it already knew, without opening a web page this time.
- A changed name (owner 2026-11-23): the chart and every count use the BIRTH name; `name_now` is a second chart behind the
  "Name Now" chip on the person's page.
- THE RESULTS (owner's interview 2026-11-23): sections "Big Picture", "Combinations", "Specific Spots"; never the words
  expand/collapse on screen. BIG PICTURE = INFLUENCE: each chart's score per number and per family = the weights of
  the positions holding it (`weightOf`: day, month, year, names, life expression 3; life paths, centers, pillar 2;
  the rest 1), quantity adding up ("a mix: the hierarchy, sheer quantity, centers over auras"). Strongly influenced =
  above 7 charts in 10. Said at the most accurate level: "A Strong 4 Influence", or "Specifically 13/4" when one form
  carries it. No digit cards ("numbers with a 1 in them": "way too anal"). Cards are ordered by SIZE (how many more
  charts than usual), solid first. The count is kept per research (`COUNTED`): going back is instant.
- WHERE PEOPLE COME FROM (owner 2026-11-24: "is there a better way to find the date of birth and names?"): a research
  starts with a PLAN (`makePlan`, Haiku, about a cent: category, WHAT COUNTS, a question only when the words could mean
  two groups, and how Wikidata ties people to it), then WIKIDATA (`server/wikidata.js`, free, no key, the only outside
  call besides server/ai.js; measured: 4,473 YouTubers with a birth date in 12 s), then the paid web rounds only when
  the database gave fewer than 40. A personal category never uses Wikidata (self-stated only). Names from Wikidata say
  where they came from (`name_from`); "Middle Names Not Confirmed" when it held no birth name. What Counts goes into
  every paid round, and Check Who Fits unticks (never deletes) whoever does not fit. A name with no date counts for what
  a name alone makes. Big groups page their lists (150 rows, 60 charts) and use 120 random groups.
- The yardstick matches the group's share of middle names (`baselineFor`): measured on 4,470 YouTubers, a yardstick with
  more middle names than the group made four false Solid name chart cards.
- THE YARDSTICK IS ORDINARY PEOPLE, never the vault (owner 2026-11-24: "the vault's not that big ... and biased, a lot
  of them are bad people"). `server/baseline.js`: 4,000 made-up charts (`BASELINE_SIZE`), birth dates even over
  1940-2005, names from `names.txt.gz`, seeded; plain math, no AI, built once per process (under a second). A group's
  vault charts and people found online are the group; nobody else from the vault counts. Why a yardstick at all
  (measured 2026-11-24): with none, the top numbers were the same for YouTubers, mass shooters and tech people
  (12/3, 9, 15/6), common in everyone by construction. Each card says "N× as common as in ordinary people", and
  inside a level the list is ordered by that.
- SOLID OR LEAN (owner 2026-11-23: "I want the insights to be solid"): every card is measured against 200 RANDOM
  groups of the same size put through the same search (`luck`), and cut in two (`halves`). Solid = see below, AND both
  halves; Strong Lean = under 20 in 100; Lean = under 50, or rarer than 1 in 20 on its own and in both halves,
  labeled "Could Be Chance". Only Solid is grounded; random groups get a Solid card about 1 time in 40. The first
  build called a card clear by its own rarity: 38 of 40 random groups got one. `test/insight.test.js` holds this.
- What the owner SEES must come out of the search (owner 2026-11-23, 141 mass shooters: "13/4 ... some sort of 4
  combined with 9 ... 16/7 ... you didn't even mention any of that ... fix it so that it actually gathers real
  insights"). Measured: all three were in the charts and the search hid them. Fixes that hold: a combination is read
  WHEREVER it sits (per-spot reading tried twenty times more things and its luck buried the real pairs); a number in a
  center (`center`: name chart centers, any chart's centers); up to four cards a part. No "Test a Hunch" box: built
  unasked and removed the same hour ("I did not ask you to build this"). Fix the thing asked; do not add a tool.
- The blind search also reads a number ANYWHERE in the chart and MANY TIMES in one chart, two numbers BOTH in a chart
  ("13/4 & 16/7"), and each combination at three depths: exact (13/4 + 18/9), one side a family (13/4 + Any 9), both
  families (Any 4 + Any 9). Five kinds of search: Solid = fewer than 1 in 100 random groups (`SOLID` 0.01).
- WHAT A COMBINATION IS (the owner's rule and examples, 2026-11-23): two numbers CLOSE TOGETHER or two PRIMARY
  positions, never two far apart. Close: a diamond's two parts, a center's main + sub vibration, a center and each
  aura beside it (public aura 12/3 beside mind center 4), an aura and the name at its side (associates aura and first
  name), names next to each other, little personality number + little heart's desire, a psyche chart's mental
  strategies + the life expression diamond under it, the two psyche charts' mind centers / emotion centers / mental
  strategies. Primary: any two of day, life path, life expression, names. `diamondsOf` in insight.js is the one list;
  a new example from the owner goes there.
- COMBINATIONS (owner 2026-11-23): the two numbers of every diamond and center (`PARTS`), every chart; 1 to 18 stay
  as they are, above counts as its digit (26/8 -> 8), either way round: "8 + 15/6". In one spot ("As Day + First
  Name") or anywhere; the pair in a spot and anywhere is ONE test against luck, never two.
  Never loosen a limit to fill an empty screen. The birth year is a position like any other: never corrected away
  (owner: "maybe a certain type of people were born in a certain year").
- The screen (owner 2026-11-23): ONE list of findings, Solid first, then Strong Lean, then Lean, by size; no section
  headings. Each card says it plainly: "76 of the 128 Mass Shooters have this (59%). In everyone else in your vault:
  45%." and explains itself FOR THE GROUP (`writeSummary`, Claude Opus 5.5 with `coreText()`, tool `give_reading`:
  one note per card, what the number means there and what that says about this group; `v: 4`). No separate Reading
  (it only repeated the cards). The search's housekeeping (What Next?, Change Who Is In, cost) sits at the bottom,
  under "This Search"; only a search in progress shows at the top. Never call a card class `ins-<level>`: `.ins-lean`
  is the badge, and a lean card took its style.
- Researched facts about the person behind a chart: one sentence, fields (what they do), flags (what happened in their
  life), turning points by year, sources. `server/chart-people.json` is GENERATED by `node tools/people/merge.mjs` from
  `tools/people/out/batch-NN.json`, written by Claude sessions following `tools/people/BRIEF.md` (facts only, sourced,
  private people = `unknown` and never dug into; never sexual orientation, gender identity, health). Never hand-edit the seed;
  fix the batch file (or add a later batch: a later one replaces an earlier one) and re-run merge. The app makes no paid call for it.
- Photos (owner 2026-11-25): the person's picture sits beside the name at the top of the chart sheet; tap = the whole
  picture with its credit (also in the About card). `server/chart-photos.json` is GENERATED by `node tools/people/photos.mjs`
  (Wikidata P18; kept only when exactly ONE Wikidata human with the name was born on the record's or the chart's date: a wrong
  face is worse than none). `server/photos.js` fetches each from Commons once, 480 px JPEG in data/photos/. Re-run after merge.mjs.
- `server/people.js`: `FIELDS` / `FLAGS` are the ONE list of kinds and their screen words (a word not on them is dropped);
  `people` + `person_marks` (migration 10); `person_charts` is a VIEW joined by the chart's name (`images.title`, any case),
  so a renamed chart follows its name and a new chart of a known person joins by itself. Friends and family have no record.
- A re-check only ADDS (owner 2026-11-20): merge.mjs joins old and new, never removes a flag, date, death or person. A flag
  is what the person did, not how a trial ended (Pazuzu keeps Violent Crime though he died before trial). The chart's
  birth date is the owner's find; "not confirmed online" never blanks or changes anything.
- Screens (`public/people.js`): the chart sheet's "About" card (pills open that kind's charts), Kinds of People (`#/people`,
  home Tools, Settings), the list narrowed to a kind (`#/?who=field:music`, `whoSql`), and "What This Group Shares" takes a
  kind as the group (`/api/group?who=`). `checked: false` = from memory, shown as "not looked up online yet"; a web search
  session has about 200 searches per turn shared by every agent, so re-check in small batches. Snapshot: WHO EACH PERSON IS.

## Archetype lines (built 2026-10-21): words on a combination of numbers
- The owner's ask: "wholesome (24/6) expander (12/3)". `server/archetype-words.js` is the word bank: every number 1-99
  with its course title and alt title, bright adjectives and nouns, shadow adjectives and nouns, drafted by a Claude
  session from the guides' Balanced/Unbalanced headings; THE OWNER CORRECTS WORDS THERE (one line per number, `|`-separated).
  `server/archetypes.js`: the first number gives the adjective, the second the noun, a third is the crown (the dharma
  diamond over the higher self); `LINES` names the pairs drawn on every chart (Higher Self, Core and Reality, Name
  Chart, Mind and Emotion, Life Expression and Pillar, Outer Psyche, Inner Psyche); bright and shadow wordings rotate
  through the word lists. `GET /api/images/:id/archetypes`, `GET /api/archetypes/phrase?num=&pos=`.
- Screens (`public/archetypes.js`): "Archetypes" cards at the top of the chart sheet (tap = the tool with those
  numbers); the Archetype Words tool (`#/archetype`, home Tools) with two or three number rows, an optional position
  per row for its label, Swap the Order, and each number's words. No AI; the course's titles only.

## What a number means where it sits (built 2026-10-19)
- Tap a number on a drawn chart (viewer, Quick Chart; not Today): an outline goes round it; tap it again and its
  page opens (owner's ask: never straight to the page). The page: the course's passages for that number IN THAT
  POSITION, the balance verdict, "N charts with 12/3 here ›", the number with the others in its circle ("7 with 13/4
  in the Mind Center"), and its connected diamonds (diamonds are not drawn).
- The number screen (owner's design 2026-11-27, `.brain/PLAN-number-screen.md`, step 1 built): the band once, "What this spot
  is" (`server/spot-what.js`, positions.md words only, no line rather than a guess), the spot's points, About N in General
  (one folded row), Connected Diamonds = ONLY what makes the number and what it helps make (`server/connections.js`: PARTS +
  `MADE_BY`, proven on every chart shape in test/connections.test.js; the drawing carries its inputs as `data-inputs`), Ask.
  No Quick Gist, no jump chips, no Name Cleanse words anywhere (owner 2026-11-27: "just remove all of it"; `CLEANSE` in meaning.js).
  A diamond with no course words for its spot opens STRAIGHT to its number's general guide (owner 2026-11-27: the course
  rarely writes about a diamond in a spot; use the same source as About N in General), never "no words yet".
- PSYCHE spots read the paid tool's PERSONAL REPORTS first (owner 2026-11-27: "prefer direct information ... about the
  spots"): `knowledge/raw/psyche-report-*.md` (teenage aura, challenge number, psychic pillar, psychic heart centre, more
  childhood and twenties numbers), made by `tools/psyche-reports/` from the four "Merged Charts" PDFs (Drive Class PDF >
  Charts: 23 full reports, fetch by link). Keep ONLY text about the number in the spot; the report's general number
  text ("NUMBER: 71 ARCHETYPE", "GENERALLY ABOUT") and the parts about that person's other numbers stay out. The report's
  psyche chart = the app's OUTER psyche chart. The reports also hold per-spot text for every other chart: not read yet.
- WITH ITS NEIGHBORS + COMBINATION CARDS (step 3 built 2026-11-27): rows for every number the tapped one makes a
  combination with (`server/neighbors.js` PAIRS; `test/neighbors.test.js` holds it to `diamondsOf` in insight.js), each
  opening its card: `knowledge/combo-cards.json`, GENERATED by `node tools/combo-cards/merge.mjs` from
  `tools/combo-cards/batches/*.json`, keyed by the two spots and numbers, never by person. Claude sessions write cards by
  `tools/combo-cards/BRIEF.md` (the owner pays for none). The card's parts never change: Phrases, By Position, What They
  Share, What the Course Says, My Reasoning, At Its Best, At Its Worst, made line, This Is Off. A missing card = "Not
  Written Yet", free, noted; This Is Off notes too (`server/combo-notes.js`, snapshot COMBINATION CARDS: write those first).
- A center's COMBINATION is the two numbers in its circle, main + extra vibration, in the course, in the owner's
  combo tags (37 of 38) and in the position search (`PARTS` heart/solar). The auras around it make the DIAMOND.
- SUB DIAMOND (owner 2026-10-20): a center's main vibration digit sum beside a middle name's digit sum, one per
  middle name, both centers, every chart with a middle name (Elvis's personality chart: 8 beside rn 7 = 87, the
  extra vibration 15/6 is their sum). `heartSubDiamond` / `solarSubDiamond` in the engine and the position
  search; the meaning page shows it behind an extra vibration. Rule: `chart-construction.md`.
- Order on the page: the course's words for THIS spot first. Sub-charts: the sub-chart guide's per-position
  entries ("Vocation Chart Heart Center: 7 → +8 pts Also excellent ..."; scores cut, words kept) and the sub-chart
  book's "Number N > Heart Diamond (Vocation)" etc., parsed by `server/subchart-words.js`; then, for a sub-chart
  CENTER only, the name chart's words for the same center. Each section shows its SHORT POINTS first
  (`knowledge/bits.json`, GENERATED 2026-10-19 for every page with course words by Claude sessions following
  `tools/bits/BRIEF.md`; pipeline and how to redo it in `tools/bits/README.md`; the course's words shortened, nothing added, sources listed;
  `**words**` = bold, for what should stand out, owner's ask)
  and the full course words under "Course Words"; a long heading is one card. The general layer (owner 2026-11-23): "About 35/8"
  under the spot's words AND under each diamond behind it, folded to the guide's title and opening lines, "Show More" = every
  section of the owner's 1-9 / 10-45 / 46-99 Guide as written + Number Notes word for word (`server/number-guide.json`, GENERATED
  by `node tools/make-number-guide.mjs`, no AI). Never mixed into a spot's own words. The many names for one position: `.brain/numerology/lingo.md`; read it before matching text.
- `server/meaning.js` ranks per position and keeps context: a passage about another chart (vocation heart diamond on
  the name chart, a name chart aura on the essence), about a pair that is not this circle, about a NUMBER'S OWN
  diamond (Diamond Method, "small diamond of the number 7"), or a point-scoring table is never shown. Business
  books are never shown as the spot's words, except the Superdates appendix sections "Day Vibration N", "Life Path N"
  and "DVLP N" (the course's own per-number texts for the day, life path and nexus; `HOME` in meaning.js).
  `GET /api/meaning?pair=&rel=`; screen `public/meaning.js`; numbers carry `data-pos/num/pair/rel` from `numeroscopeSvg`.
- The page's look (owner 2026-11-20, round two after "one massive blob"): each part has ITS OWN color (`c-spot/name/pair/dia/sub/ask`):
  band, outline, jump-chip dot and bullets match. Every point has ONE shape (`point`: dot + the course's words, bold words bold, a line
  between points); In Balance / Out of Balance are solid green / red strips; Quick Gist chips green / red / plain, side topics left out;
  jump chips one sideways row with short names; a part with no words is one short row. Title Case labels. Nothing reworded.
- A circle's pair points (owner 2026-11-07): the course writes a family ("3 + 6 (and 12/3 + 6, 3 + 15/6)"); a point naming
  a compound this chart does not have goes under "Only With 12/3, 15/6 …" with a note (`pairSplit` in meaning.js), never mixed in.
- Ask About This (owner 2026-11-07): a question box at the foot of every meaning page; Claude Opus 5.5 answers from the
  page's own course words + 6 more passages on the number (`server/spot-ask.js`, POST /api/meaning/ask, ~10k chars,
  about 2-3 cents). Not stored; every call is in the snapshot's AI calls.
- "Open the Document" (owner 2026-11-07): every Course Words card has the button; it opens the course file itself
  (`knowledge/raw/<source>.md`, `server/doc.js`, `GET /api/knowledge/doc`) at the card's words, marked yellow, with
  Show Earlier / Show More. The passage is found by its own words (test: every meaning-page passage is found).
- WHERE each position's words live (owner's NotebookLM map, 2026-10-20): `.brain/numerology/position-sources.md`, checked
  per position against the store and the engine. A position's HOME documents (`HOME` in meaning.js) rank first. The
  list docs (problem areas, psyche pillars, aura scoring: the number inside the entry, not in a heading) are read by
  `server/listed-words.js` and come last on the page. The celebrity statistics PDF IS in the store (`humanity-archetyping-book`).
  A Google Doc exported flat (no headings) hides its numbers from the index: restore the headings in `knowledge/raw/`
  (knowledge/README "Repaired exports") before blaming the ranking.

## Dev
- `npm run verify` before saying done: syntax of every file + all tests. Spends nothing.
- `npm test` runs test/*.test.js (node:test). Put the real UserTag.backup at
  data/UserTag.backup to also run the real-file test; it is git-ignored.
- Quick chart math: `public/numeroscope.js`, rules in `.brain/numerology/`.
  Year rows and day vibrations too (`yearly-rows.md`): every formula is proven
  on the course's JFK 1963 and Nixon 1972 cases; keep those tests green.
  Year Rows popup "On a Date" (owner 2026-11-07): any date moves the destiny period, the year row it falls in
  (marked) and the day rows; one summary line (JFK Nov 22 1963: 6/6, aura 11/2, shadow 5/5, vertical 51/6).
  Tap a number in the rows (owner 2026-11-08, `rowSheet`): Read Down (the two rows above a sum + the sum, 5-1-6 = 51/6)
  and Read Across (number, aura, shadow: main ds beside shadow ds, 8-5-6 = 86/5), each with its number-book name, the
  Forecasting book's words (`Numeroscope.ROW_COMBOS`) and Open buttons (`?number=` / Forecasting chapter). No new words.
  Destiny periods (owner 2026-11-09): the period today is in says "Now"; tap the gold one (or On a Date's period) for the
  Forecasting Book's Balanced / Unbalanced / Lessons of its planet (`public/destiny-words.js`, GENERATED by
  `tools/make-destiny-words.mjs`). The year row we are in is a gold band marked "Now" (Arizona's date).
  A one-word name is the first name alone. Tap a name on the line for its own
  charts and pyramid (`singleName`); every formula there is screenshot-proven.
- `node tools/dev-app.mjs [port]` runs a THROWAWAY copy with fake charts on
  127.0.0.1:3399 (password `dev`, refuses the live port). Look at it with
  `CHART_VAULT_URL=http://127.0.0.1:3399 LIVE_APP_TOKEN=dev node tools/report.mjs screens <dir>`
  or the chrome-devtools MCP (`.mcp.json`). Screen rules: `public/CLAUDE.md`.
- No build step: public/ is served as is. Bump `version` in package.json for
  user-visible releases.
- One tag per search, never two: picking a tag replaces the search. The search
  box shows the tag's screen name; × goes home. A number typed in the box lists the
  position search first (`positionSpots`) and drops that number's position-code tags.
- Every overlay (sheet, popup, meaning page) goes through `trackOverlay`/`untrackOverlay`: one
  step in the phone's Back history each, so Back closes one thing (owner 2026-10-19). A screen
  change right after an overlay's own Close must go through `go`/`swap` (they wait for the step).
- Destructive taps: `holdButton` / `confirmSheet`, never a second dialog.
- Looks (owner 2026-10-19 light/dark; 2026-11-23 styles to match the icon): Settings -> Look picks Follows the Phone
  (Blueprint Night dark / Light light), Glass on Color, Blueprint Night, Light, Classic Dark, Classic Light (`look` on the
  device; `applyTheme` and index.html set `data-style` + `data-theme`). Each style is a block of `:root` variables at the
  end of app.css plus a `body::before` backdrop; a new color is a variable, never a hex in a rule. Button symbols get a
  line drawing from `LINE_ICONS` (keyed by the symbol, added in `render`); a new symbol needs an entry. Charts stay on
  white in every look. Check a changed screen in every look. Fixed colors in app.css (a #fff card, #303030 text) get
  their dark-look color from a GENERATED section at its end: re-run `node tools/make-look-colors.mjs` after editing
  app.css (`test/looks.test.js` fails otherwise); a box holding a drawn chart goes in its `KEEP` list.
- Short screens (owner 2026-10-19): a Coming Days card is date, rating, chart. The chart sheet shows no list of
  position numbers (the drawing does that); position/number tags and file details fold; repeats are
  "Most Often" pills, top five, no positions (reading.js); a tap rings every spot with that number on the drawn chart
  (`highlightNumber`, `.n-hl`, the `.vhl` bar with Clear; the viewer hands `showNumber` to `readingUi.section`). The home search never lists position-code tags. Settings has a
  search box: a new Settings row goes in `SETTINGS` with the words a search may use for it.
- The viewer is an overlay over the screen it was opened from, which stays
  drawn under it (`underHash`): closing it never redraws the list, so the list
  keeps its place. It opens bare (tap shows the top bar); drag down and the
  picture comes loose, let go and it flies back into its cell (`zoomable`
  `drag`/`dragEnd`). Keep both when touching the viewer.

## Seeing the live app (do this instead of asking the owner)
Read the live report yourself with the script whenever you need to know what
the app did or is doing; never ask the owner to copy or paste a report or a
screen. Measure, don't guess: screenshot and look, never ask what something
looks like. A diagnostic that is computed and not on a screen does not exist.
- `node tools/report.mjs short` – build, auto-update state, counts, last 20 log lines
- `node tools/report.mjs full` – plus missing files, history, top tags, folders
- `node tools/report.mjs <id or filename>` – one chart in detail
- `node tools/report.mjs screens <dir>` – logs in with Playwright at phone size,
  screenshots every tab into <dir>; then look at the PNGs
- Needs LIVE_APP_TOKEN (the app password) in the cloud environment ("Main").
  Optional CHART_VAULT_URL overrides the address.
  Exit 2 = no token, 3 = refused, 4 = unreachable, 5 = server has no password,
  7 = no browser.
- The data behind it is `GET /api/debug/snapshot` (`?scope=short`, `?id=`),
  password-protected like everything else, plain text, never includes secrets.

## Sibling repos: one shared setup, read them when it helps (owner's rule 2026-10-15)
The owner's other apps are `DrumMarch54/tiktok-shop-pipeline` (the video app;
the playbook `.brain/NEW-APP-PLAYBOOK.md` lives there) and
`DrumMarch54/TikTok-Ebay-Drafter` (the eBay app). All three share one setup:
deploy, login, live report, verify, plugins, reply style, tap counting. For
anything about THAT shared setup, or when the owner points at another app,
read the sibling and copy its shape without being asked. For this app's own
features think for this app: the siblings are other stacks and a copied
feature rarely fits. Never scan them on every change. Read-only: never push
to a sibling from here, never copy secrets. Not in the session: `add_repo`
(owner `DrumMarch54`, repo `<name>`, access `read`), shallow-clone to
`/home/user/<name>`, then `register_repo_root`. The owner never needs to act.

## Tap counting ("What you use most")
Screens count themselves in `route()` (`screen.<name>`); a button that matters
calls `count('<area>.<name>')`. Names and counts only, never what was typed,
never a chart, a tag or a filename; a count never throws and never waits.
Shown on Status, in the snapshot, `GET /api/usage`. A renamed or removed
button changes its name and its `USAGE_LABELS` entry in the same commit.

## Plugins
`superpowers`, `caveman`, `frontend-design`, `playground`, `claude-md-management`
and `pr-review-toolkit` are copied into `.claude/skills|agents|commands`
(why: `.claude/vendor/README.md`), the same set as the other two apps, so they
load in a cloud session whether or not the marketplace does.

## Working rules
- Diagnose before patching: read the live report first. The VPS's running
  build is the truth over the repo.
- Two failed tries at the same problem: stop and ask, never a third guess.
- Grep before building: tell the owner what already exists. Grep for the name
  of anything you add or delete, in tools/ and test/ too (report.mjs waited
  for a removed tab bar and called a good login refused).
- Can't verify against the live system? Say so plainly.
- Course rule you cannot read (a Drive file too big, a page you cannot see,
  a rule that stays ambiguous): STOP before building on a guess and give the
  owner a ready-to-paste question for NotebookLM, which has the whole course.
  The charts must follow the course exactly; a guess costs more than a question.
- Big change: brainstorm and get the design approved first.
- A durable lesson = one short rule here + the full story in `.brain/HISTORY.md`.
