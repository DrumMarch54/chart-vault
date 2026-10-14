#!/usr/bin/env bash
# Makes a Claude Code CLOUD session able to run this repo straight away: the
# tests (npm test), the dev app (tools/dev-app.mjs), the live report and its
# screenshots (tools/report.mjs), and the browser MCP from .mcp.json.
# Wired to SessionStart in .claude/settings.json.
#
# ONLY RUNS IN A CLOUD SESSION ($CLAUDE_CODE_REMOTE). The VPS installs its own
# packages with npm ci in deploy/autodeploy.sh and must never get them from a hook.
set -u

[ -n "${CLAUDE_CODE_REMOTE:-}" ] || exit 0

MARKER="/tmp/.chart_vault_session_setup_done"
[ -f "$MARKER" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

{
  npm ci --no-audit --no-fund
  # The browser MCP server .mcp.json starts through tools/chrome_mcp.sh;
  # installed here so the first page opened does not stall on a download.
  command -v chrome-devtools-mcp >/dev/null 2>&1 || npm install -g chrome-devtools-mcp@1.8.0
} >/tmp/chart_vault_session_setup.log 2>&1

touch "$MARKER"
if [ -n "${LIVE_APP_TOKEN:-}" ]; then
  echo "Session setup done. The live app can be read: node tools/report.mjs short"
else
  echo "Session setup done. LIVE_APP_TOKEN is not set, so tools/report.mjs cannot read the live app."
fi
exit 0
