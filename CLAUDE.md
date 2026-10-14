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
