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
