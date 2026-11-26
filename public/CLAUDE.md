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
  Days): the list and search results share one setting (`gridCols`), which Recently Opened on home follows without buttons of its own, Similar Charts
  (`simCols`) and Possible Duplicates (`dupCols`) have their own; remembered per device. A new grid of
  charts gets one too, in the page's top row.

## Designing a change you can see (owner 2026-11-26: "you just slopped it in there")
1. Mockup FIRST: any change to how a screen looks or is laid out gets a picture (two or three options, drawn at
   390 px with the real data) and the owner picks before a line is built. Design on Fable, build on Opus.
2. After building: screenshot the real screen at 390x844 in EVERY look (Glass, Blueprint, Light, Classic Dark,
   Classic Light), read the PNGs, compare with the picked mockup, fix what differs, then say done.
3. Checklist for every screen: nothing squeezed beside buttons (text gets its own line); buttons in one row are the
   same size; one idea per line; every block has a small-capitals label (`.slabel`); long parts go behind a tab or a
   row, never a wall; nothing see-through over text (menus, sticky bars: solid `--sheet`); Title Case labels.
- The chart sheet (owner's design 1, 2026-11-26): header (photo, name, dates · country, roles), four tools
  (Pyramid, Year Rows, Similar, More), tabs Overview / Archetypes / Reading / Ask AI. A new chart feature goes in a
  tab or in More, never as another button row under the name.
