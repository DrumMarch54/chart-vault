# Chart Vault – notes for Claude sessions

The user is not a programmer and works from a phone. Give them numbered steps
in plain words and say what they will see. Never ask them to read code.

## Deploy
- Production follows the `main` branch. Push with `git push origin <branch>:main`.
- The VPS pulls every minute via cron (`deploy/autodeploy.sh`), runs `npm ci`,
  restarts `chart-vault.service`. Waits while `/api/health` says `busy`.
- Live at https://charts.tiktok-automation.com (Cloudflare Tunnel → 127.0.0.1:PORT).
- See SETUP.md for the full picture. No GitHub Actions, no outside services.

## Rules that must hold
- Never lose or mix up a chart or a tag. Filename = identity. Tags are kept
  exactly as written, never renamed or "fixed".
- Re-importing a tag file must only add. Tags removed in the app stay removed
  (`removed_tags`). Tags added in the app survive imports.
- No paid AI or API calls. No user accounts; one shared password (WEB_TOKEN).
- Runtime files (data/, backups/, .env, the real UserTag.backup) stay out of git.

## Dev
- `npm test` runs everything (node:test). Put the real UserTag.backup at
  data/UserTag.backup to also run the real-file test; it is git-ignored.
- No build step: public/ is served as is. Bump `version` in package.json for
  user-visible releases.

## Seeing the live app (do this instead of asking the owner)
Read the live report yourself with the script whenever you need to know what
the app did or is doing; never ask the owner to copy or paste a report or a
screen.
- `node tools/report.mjs short` – counts, last import/backup, last 20 log lines
- `node tools/report.mjs full` – plus missing files, history, top tags, folders
- `node tools/report.mjs <id or filename>` – one chart in detail
- `node tools/report.mjs screens <dir>` – logs in with Playwright at phone size,
  screenshots every tab into <dir>; then look at the PNGs
- Needs LIVE_APP_TOKEN (the app password) in the cloud environment; it is the
  same value the first app uses. Optional CHART_VAULT_URL overrides the address.
  Exit 2 = no token, 3 = refused, 4 = unreachable.
- The data behind it is `GET /api/debug/snapshot` (`?scope=short`, `?id=`),
  password-protected like everything else, plain text, never includes secrets.
