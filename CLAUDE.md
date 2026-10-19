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
  Down = Cloudflare 502. See SETUP.md. No GitHub Actions, no outside services.
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
- Tag codes ("19fn") are decoded in `.brain/numerology/tag-codes.md` and
  spelled out on screen by `public/tag-codes.js`; the stored tag never changes.
- Number colors and exact positions come from the vault's own screenshots
  (`.brain/numerology/number-colors.md`, `tools/color-study/`): measure
  against them, never guess a color or a position. `public/number-colors.js`
  is generated; regenerate it, do not hand-edit.
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
  (`#/?drawn=0`). **Open item: the owner asked to be reminded to go through those** (count in the
  snapshot's DRAWN CHARTS line); remind them at the start of a session until that list is empty.
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
  (`removed_tags`). Tags added in the app survive imports.
- Paid AI calls go through ONE door, `server/ai.js` (`callModel`): key, monthly cap and spend in
  `data/ai.json`, every call recorded and in the snapshot, `canSpend` refuses at the cap. No other
  outside or paid call anywhere. No user accounts; one shared password (WEB_TOKEN).
  No WEB_TOKEN = nobody gets in (503), never everyone. Sign-in link: `/?t=<password>`.
- Runtime files (data/, backups/, .env, the real UserTag.backup) stay out of git.
  `test/repo.test.js` fails if a file is both ignored and tracked.
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
- Several positions at once (owner 2026-10-17, "day 8 AND first name 15"): a search is a list of conditions,
  pairwise in the address (`?pos=essence.day&num=8&pos=name.first&num=15`, `conditionsSql`); the grid shows one
  chip per condition (tap = change it, × = drop it) and "+ Another number", which reopens the picker with the
  conditions kept and every count narrowed to them (`/api/positions/counts?num=&fixed=pos:num,…`).
- Whole Name Pyramid (owner 2026-10-17): every name run together with no spaces as one word, pyramid only
  (`openWord(..., { wholeName: true })`); "Pyramid" beside the name in the viewer's sheet, in the viewer's ⋮ menu
  and in the Quick Chart's ⋮ menu.
- The Quick Chart keeps what was typed on the device (`quickDraft`) and brings it back on the next visit;
  "My Chart" overwrites it.

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
  across (2 to 5 on a phone, more on a laptop), remembered per device. The Price Tool has two modes, Check a
  Price and Find a Price (two pickers: the vibration, the range), never a wall of chips. Today has no row of
  code chips under the chart.
- Today, Coming Days and the full-screen day use the day look (`day()` in tools.js, `html.day` in app.css,
  the owner's pick C on 2026-10-16): a soft light page, the planets in a small banner, and the charts drawn
  by `numeroscopeSvg` on white EXACTLY as the Quick Chart draws them: never recolor, rescale or move a chart
  for a screen's mood. The other tools stay on the white page.
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

## What a number means where it sits (built 2026-10-19)
- Tap a number on a drawn chart (viewer, Quick Chart; not Today): an outline goes round it; tap it again and its
  page opens (owner's ask: never straight to the page). The page: the course's passages for that number IN THAT
  POSITION, the balance verdict, "N charts with 12/3 here ›", the number with the others in its circle ("7 with 13/4
  in the Mind Center"), and the diamond(s) behind it (diamonds are not drawn: mental diamond behind a mind center
  and its upper auras, outer diamond behind the outer aura, nexus behind day and life path, ...).
- A center's COMBINATION is the two numbers in its circle, main + extra vibration, in the course, in the owner's
  combo tags (37 of 38) and in the position search (`PARTS` heart/solar). The auras around it make the DIAMOND.
- Order on the page: the course's words for THIS spot first. Sub-charts: the sub-chart guide's per-position
  entries ("Vocation Chart Heart Center: 7 → +8 pts Also excellent ..."; scores cut, words kept) and the sub-chart
  book's "Number N > Heart Diamond (Vocation)" etc., parsed by `server/subchart-words.js`; then, for a sub-chart
  CENTER only, the name chart's words for the same center. Each section shows its SHORT POINTS first
  (`knowledge/bits.json`, written by a Claude session: the course's words shortened, nothing added, sources listed;
  `**words**` = bold, for what should stand out, owner's ask)
  and the full course words under "Course Words"; a long heading is one card. NO general number descriptions (owner: a separate
  layer, later). The many names for one position: `.brain/numerology/lingo.md`; read it before matching text.
- `server/meaning.js` ranks per position and keeps context: a passage about another chart (vocation heart diamond on
  the name chart, a name chart aura on the essence), about a pair that is not this circle, about a NUMBER'S OWN
  diamond (Diamond Method, "small diamond of the number 7"), or a point-scoring table is never shown. Business
  books are never shown as the spot's words. `GET /api/meaning?pair=&rel=`; screen `public/meaning.js`; numbers carry
  `data-pos/num/pair/rel` from `numeroscopeSvg`. The celebrity statistics PDF is NOT in the knowledge store yet.

## Dev
- `npm run verify` before saying done: syntax of every file + all tests. Spends nothing.
- `npm test` runs test/*.test.js (node:test). Put the real UserTag.backup at
  data/UserTag.backup to also run the real-file test; it is git-ignored.
- Quick chart math: `public/numeroscope.js`, rules in `.brain/numerology/`.
  Year rows and day vibrations too (`yearly-rows.md`): every formula is proven
  on the course's JFK 1963 and Nixon 1972 cases; keep those tests green.
  A one-word name is the first name alone. Tap a name on the line for its own
  charts and pyramid (`singleName`); every formula there is screenshot-proven.
- `node tools/dev-app.mjs [port]` runs a THROWAWAY copy with fake charts on
  127.0.0.1:3399 (password `dev`, refuses the live port). Look at it with
  `CHART_VAULT_URL=http://127.0.0.1:3399 LIVE_APP_TOKEN=dev node tools/report.mjs screens <dir>`
  or the chrome-devtools MCP (`.mcp.json`). Screen rules: `public/CLAUDE.md`.
- No build step: public/ is served as is. Bump `version` in package.json for
  user-visible releases.
- One tag per search, never two: picking a tag replaces the search. The search
  box shows the tag's screen name; × goes home.
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
