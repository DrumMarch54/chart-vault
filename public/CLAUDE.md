# Screen rules (public/)

- Phone first: 390×844 is the screen. No sideways scroll anywhere.
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
