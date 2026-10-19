# Screen rules (public/)

- Phone first: 390×844 is the screen. No sideways scroll anywhere. A laptop must look right too
  (owner 2026-10-16): reading screens (`.qscreen`, `.tscreen`) stay a 760 px column, grids of charts
  (`.wide`, the browse grid, the home tools) use the width. Check both sizes when a layout changes.
- If you changed what it looks like, open it and look at it before saying it
  is done: run `node tools/dev-app.mjs`, screenshot it (report.mjs `screens`
  or the chrome-devtools MCP), and read the PNG as a picture. A DOM check alone
  is not looking.
- Every feature is a button. A feature only reachable by typing a command or
  an address does not exist.
- Call a thing what it is, the same word everywhere. American spelling. No
  internal words on screen (no file paths, vendor names, jargon).
- Every refusal or failure says why, in full, on the screen. Something only in
  a server log did not happen as far as the owner is concerned.
- Destructive taps are hold-to-confirm, never a second dialog. The result is
  the confirmation; no "I understood that you want…" messages.
- Never reload the page by itself; show "Updated to build <commit>, tap to
  reload" and let the owner tap. The service worker caches the app shell only,
  never an API answer or an image.
- Use `fill(el, ...)` instead of `el.replaceChildren(...)`: it skips null, so a
  conditional part never shows up as the word "null".
- A card is laid out, never a blob of text (owner 2026-10-19, Similar Charts): the picture first and big
  enough to read, then the name as a title, a muted secondary line, then facts as pills or a short list,
  the least important number last and small. Position names in Title Case, course words (lingo.md).
- Every grid of charts has the − / + size control (`sizeControl` in app.js; owner 2026-10-19, like Coming
  Days): the list and search results and Recently Opened share one setting (`gridCols`), Similar Charts
  (`simCols`) and Possible Duplicates (`dupCols`) have their own; remembered per device. A new grid of
  charts gets one too, in the page's top row.
