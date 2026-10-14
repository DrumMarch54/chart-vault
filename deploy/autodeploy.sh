#!/usr/bin/env bash
# Chart Vault auto-deploy. Cron runs this every minute on the VPS.
# Source copy lives in the repo at deploy/autodeploy.sh; install with:
#   cp /root/chart-vault/deploy/autodeploy.sh /root/chart-vault-autodeploy.sh && chmod +x /root/chart-vault-autodeploy.sh
#
# What it does: fetch origin/main; if the server is behind, wait while the app
# is busy (an upload or backup in progress, up to 10 minutes), then
# git reset --hard, npm ci, and restart the service. Every decision is logged.
set -u
APP_DIR="${APP_DIR:-/root/chart-vault}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-chart-vault}"
LOG="${LOG:-/root/chart-vault-autodeploy.log}"
STATE="${STATE:-/root/chart-vault-autodeploy.state}"   # remembers since when we have been waiting
DEPLOYED="${DEPLOYED:-/root/chart-vault-autodeploy.deployed}"   # commit of the last successful deploy
MAX_WAIT=600

touch "$LOG"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

cd "$APP_DIR" || { log "ERROR: $APP_DIR missing"; exit 1; }
if ! git fetch -q origin "$BRANCH" 2>>"$LOG"; then log "fetch failed"; exit 1; fi
# Compare with the last SUCCESSFUL deploy, so a failed npm install is retried next minute.
LOCAL=$(cat "$DEPLOYED" 2>/dev/null || git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
[ "$LOCAL" = "$REMOTE" ] && { rm -f "$STATE"; exit 0; }

# Read PORT from .env (default 3300) and ask the app whether it is busy.
PORT=$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'"' " )
PORT=${PORT:-3300}
if systemctl is-active --quiet "$SERVICE"; then
  HEALTH=$(curl -s -m 5 "http://127.0.0.1:${PORT}/api/health" || true)
  if echo "$HEALTH" | grep -q '"busy":true'; then
    NOW=$(date +%s); SINCE=$(cat "$STATE" 2>/dev/null || echo "$NOW"); echo "$SINCE" > "$STATE"
    if [ $((NOW - SINCE)) -lt $MAX_WAIT ]; then log "new version $REMOTE waiting: app busy ($((NOW - SINCE))s)"; exit 0; fi
    log "app still busy after ${MAX_WAIT}s, deploying anyway"
  fi
fi
rm -f "$STATE"

log "deploying ${LOCAL:0:7} -> ${REMOTE:0:7}"
if ! git reset -q --hard "origin/$BRANCH" 2>>"$LOG"; then log "ERROR: git reset failed"; exit 1; fi
if ! npm ci --omit=dev --no-audit --no-fund >>"$LOG" 2>&1; then echo "install-failed" > "$DEPLOYED"; log "ERROR: npm ci failed, service not restarted; will retry next minute"; exit 1; fi
if systemctl restart "$SERVICE"; then echo "$REMOTE" > "$DEPLOYED"; log "restarted $SERVICE at $(git rev-parse --short HEAD)"; else log "ERROR: restart failed"; fi
# keep the installed copy of this script current
if ! cmp -s "$APP_DIR/deploy/autodeploy.sh" "$0"; then cp "$APP_DIR/deploy/autodeploy.sh" "$0" && chmod +x "$0" && log "updated $0 from repo"; fi
