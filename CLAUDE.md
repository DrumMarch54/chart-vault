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

## Numerology knowledge
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
- A layout complaint comes with a paid-tool screenshot: run
  `tools/color-study/layout/` (compare.py) against it and change only what it
  measures as off. The numbers it prints beat anyone's eye.

## Rules that must hold
- Never lose or mix up a chart or a tag. Filename = identity. Tags are kept
  exactly as written, never renamed or "fixed".
- Re-importing a tag file must only add. Tags removed in the app stay removed
  (`removed_tags`). Tags added in the app survive imports.
- No paid AI or API calls. No user accounts; one shared password (WEB_TOKEN).
  No WEB_TOKEN = nobody gets in (503), never everyone. Sign-in link: `/?t=<password>`.
- Runtime files (data/, backups/, .env, the real UserTag.backup) stay out of git.
  `test/repo.test.js` fails if a file is both ignored and tracked.
- Schema changes: add a numbered entry at the end of `MIGRATIONS` in server/db.js.
  Never edit a shipped one. Imports and uploads record the build that made them.
- Error answers (status ≥ 400) are never cached; the app shell is versioned by commit.

## Dev
- `npm run verify` before saying done: syntax of every file + all tests. Spends nothing.
- `npm test` runs test/*.test.js (node:test). Put the real UserTag.backup at
  data/UserTag.backup to also run the real-file test; it is git-ignored.
- Quick chart math: `public/numeroscope.js`, rules in `.brain/numerology/`.
  A one-word name is the first name alone. Tap a name on the line for its own
  charts and pyramid (`singleName`); every formula there is screenshot-proven.
- `node tools/dev-app.mjs [port]` runs a THROWAWAY copy with fake charts on
  127.0.0.1:3399 (password `dev`, refuses the live port). Look at it with
  `CHART_VAULT_URL=http://127.0.0.1:3399 LIVE_APP_TOKEN=dev node tools/report.mjs screens <dir>`
  or the chrome-devtools MCP (`.mcp.json`). Screen rules: `public/CLAUDE.md`.
- No build step: public/ is served as is. Bump `version` in package.json for
  user-visible releases.

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

## Working rules
- Diagnose before patching: read the live report first. The VPS's running
  build is the truth over the repo.
- Two failed tries at the same problem: stop and ask, never a third guess.
- Grep before building: tell the owner what already exists. Grep for the name
  of anything you add or delete, in tools/ and test/ too (report.mjs waited
  for a removed tab bar and called a good login refused).
- Can't verify against the live system? Say so plainly.
- Big change: brainstorm and get the design approved first.
- A durable lesson = one short rule here + the full story in `.brain/HISTORY.md`.
