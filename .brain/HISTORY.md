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
