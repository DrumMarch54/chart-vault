#!/usr/bin/env bash
# Launches the Chrome DevTools MCP server so `.mcp.json` can start it on BOTH
# the laptop and a cloud session, which need different browsers and flags.
#
# WHY A SCRIPT AND NOT A COMMAND IN .mcp.json: that file is committed, so one
# fixed command has to be right everywhere. It is not -- a cloud container has
# Playwright's Chromium at a fixed path and runs as root (so Chrome's sandbox
# has to be off), while the laptop has a real Chrome the server finds by itself
# and a screen to show it on.
#
# WHAT IT IS FOR: driving the phone app in `public/` (run tools/dev-app.mjs) -- open a page, tap
# things, read the console, screenshot. That is the product, and until now the
# only way to see it move was a written Playwright test.
#
# WHAT IT CANNOT DO IN A CLOUD SESSION: reach the public internet. Outbound
# HTTPS there goes through the agent proxy, whose relay drops Chrome's TLS
# tunnels mid-handshake (`ws_closed_mid_exchange`), so an external page times
# out. 127.0.0.1 is exempt from the proxy and works, which is the case that
# matters. On the laptop both work.
set -u

VERSION="${CHROME_MCP_VERSION:-1.8.0}"

if command -v chrome-devtools-mcp >/dev/null 2>&1; then
  set -- chrome-devtools-mcp
else
  set -- npx -y "chrome-devtools-mcp@${VERSION}"
fi

# Screenshots are what actually get looked at, and a full-size PNG of a phone
# viewport is a large slice of the context window for one glance.
set -- "$@" --screenshotFormat jpeg --screenshotQuality 75 --screenshotMaxWidth 900

# --no-page-id-routing: with routing ON (the default) every page-scoped tool
# demands a pageId and answers "Required at pageId" without one, which is a
# whole class of failed call for a session driving one page at a time.
set -- "$@" --no-page-id-routing

if [ -n "${CLAUDE_CODE_REMOTE:-}" ]; then
  # The cloud image ships Playwright's Chromium and nothing else; PLAYWRIGHT_BROWSERS_PATH
  # is where it lives. No display, and root, so no sandbox.
  CHROME="${CHROME_MCP_EXECUTABLE:-${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium}"
  [ -x "$CHROME" ] || CHROME=""
  [ -n "$CHROME" ] && set -- "$@" --executablePath "$CHROME"
  set -- "$@" --headless true --isolated true \
    --chrome-arg=--no-sandbox \
    --chrome-arg=--disable-setuid-sandbox \
    --chrome-arg=--disable-dev-shm-usage
else
  # On the laptop leave the browser visible -- watching it move is most of the
  # value -- and let the server find the installed Chrome itself.
  [ -n "${CHROME_MCP_EXECUTABLE:-}" ] && set -- "$@" --executablePath "$CHROME_MCP_EXECUTABLE"
  set -- "$@" --isolated true
fi

exec "$@"
