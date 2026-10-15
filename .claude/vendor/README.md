# Vendored plugin content — why this exists

**Marketplace plugins in `.claude/settings.json` do NOT load in cloud/web sessions.**
The user works from a phone, so cloud sessions are the only sessions. A plugin installed
there is a plugin they never get. `.claude/skills/`, `.claude/agents/` and `.claude/commands/`
DO load, everywhere — laptop and phone alike.

So anything wanted on the phone is copied into this repo. `enabledPlugins` stays as it is:
on the laptop it is what loads, and the two paths do not conflict.

## What is vendored, and from where

| Source plugin | Copied to | License |
| --- | --- | --- |
| `superpowers` (github.com/obra/superpowers @ b36e082) | 15 skills in `.claude/skills/`, hook in `.claude/vendor/superpowers-session-start` | MIT — `LICENSE-superpowers.txt` |
| `frontend-design` | `.claude/skills/frontend-design/` | Apache-2.0 — bundled |
| `playground` | `.claude/skills/playground/` | Apache-2.0 — bundled |
| `claude-md-management` | `.claude/skills/claude-md-improver/`, `.claude/commands/revise-claude-md.md` | Apache-2.0 — `LICENSE-claude-md-management.txt` |
| `pr-review-toolkit` | 6 agents in `.claude/agents/`, `.claude/commands/review-pr.md` | Apache-2.0 — `LICENSE-pr-review-toolkit.txt` |

## NOT vendored, and why

`playwright`, `context7`, `hostinger` (MCP servers) and `pyright-lsp` (language server) are
running processes, not text. They cannot be copied into a repo.

But the *plugin wrapper* was the only part that could not travel, not the capability. As of
2026-09-06 two of them are reached directly instead, through `.mcp.json` at the repo root --
committed, and read on the laptop and in a cloud session alike:

| Was | Now |
| --- | --- |
| `context7` plugin | `.mcp.json` -> `https://mcp.context7.com/mcp` (HTTP, no key) |
| `playwright` plugin | `.mcp.json` -> `chrome-devtools` via `tools/chrome_mcp.sh` |
| `pyright-lsp` plugin | `tools/check_types.py` (pyright as a gate, not a language server) |

Still laptop-only: `hostinger` (needs a machine-local install and the VPS credentials).

`enabledPlugins` in `.claude/settings.json` is left alone. On the laptop the plugin and the
`.mcp.json` entry are the same upstream server, so the two paths do not conflict -- if a
duplicate tool list ever becomes annoying there, drop `context7`/`playwright` from
`enabledPlugins`, not from `.mcp.json`, because only `.mcp.json` reaches the phone.

## Local edits — do not lose these on an update

- `playground/SKILL.md` step 4: upstream runs `open <file>.html`, which does nothing in a cloud
  session and silently writes a file nobody sees. Rewritten to deliver the file to the phone.
- `superpowers-session-start` is upstream's hook, UNMODIFIED. It resolves its plugin root as
  `$(dirname $0)/..`, which from `.claude/vendor/` lands on `.claude/` — so it finds
  `.claude/skills/using-superpowers/SKILL.md` with no patch. Moving this file breaks that.

## Updating

Re-copy from upstream, then re-apply the local edits above.
