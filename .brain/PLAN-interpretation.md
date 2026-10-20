# Plan: interpretation, AI readings, ask the vault (approved by the owner 2026-10-16)

Owner's words: recognize patterns and the big picture in a chart and put words on it; stats useful for
interpretation; patterns across the database; AI that reads a chart, discusses a dynamic between two
numbers, points out a pain point; AI search ("five worst charts", "five people most influenced by 8").
Approved: paid calls allowed. Claude Opus 5.5 writes readings, Claude Haiku 5.5 answers vault questions.
Key pasted in Settings. Monthly cap $8; the app must warn the owner in the app when close to it and at it.
Sources: every Hub document that helps; the chat decides which (Number Notes, class PDFs 1-9 / 10-45 /
46-99, scraped chart descriptions, combo guides, Name Numeroscope PDF, Sub-chart PDF are the big ones).

## Pieces
1. `knowledge/` — the Hub as text in the repo, indexed per number (1-99) and per topic (position family),
   built by `tools/build-knowledge.mjs` into `knowledge/index.json`. `server/knowledge.js`:
   `coreText()` (how to read a chart: hierarchy, weaving, balance lists, the owner's SYSTEM PROMPT) and
   `contextFor(values, { budgetChars })` (the passages for the numbers in this chart's positions, most
   important positions first, within the budget). Never a secret, never a chart of a real person.
2. `server/facts.js` — rules from the Hub, no AI, instant, free: `factsFor(db, imageId)` (nexus, repeated
   numbers, unbalanced / karmic numbers in core positions, center balance count, 4-8 tension, rarity of each
   number in its position across the vault, archetype names, weaving pairs), `chartScores(db)` (imbalance
   score and per-number influence per chart, from the hierarchy: stand-alone first-link vibrations weigh
   most, then centers, auras, diamonds), `rankCharts(db, { by: 'imbalance'|'influence', number, order, limit })`.
3. `server/ai.js` — Anthropic SDK; key + cap + spend in `data/ai.json` (one store; key never leaves the
   server: the API says set / not set and the last 4 characters only); every call recorded (model, tokens,
   cost, ok/FAILED, error verbatim, last 20) and shown in the snapshot; monthly spend; `canSpend()` blocks at
   the cap, `warn` at 80%. Prices: Opus 5.5 $4 / $20 per M tokens (cache read $0.20, cache write $5),
   Haiku 5.5 $0.10 / $0.50. Readings are stored (migration 7: `readings`) so a chart is paid for once.
4. Endpoints: GET/PUT `/api/ai/settings`, GET `/api/ai/spend`, GET/POST `/api/images/:id/reading`,
   POST `/api/images/:id/ask` {question}, POST `/api/ask` {question} → { answer, ids } (Haiku with tools:
   find by position, rank charts, chart numbers, names).
5. Screens: viewer sheet gets a "Reading" section (facts first, "Write Reading" with the price, the stored
   reading, "Ask About This Chart"); home search accepts a question ("Ask the Vault"); Settings → "AI Reading"
   (key box, cap, spent this month, last calls); banner on home at 80% and at the cap.
6. Tests: the key never appears in any API answer or the snapshot; cap logic; facts on known charts; ask
   tools dispatch with a fake model; `npm run verify` green.

## Rules
- Course words beat guesses: every meaning the AI is given comes from the Hub text, cited by source.
- A reading names the build and the model that made it and what it cost.
- Spending is shown on a screen before and after: no silent dollar.
