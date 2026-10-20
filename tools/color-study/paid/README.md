# The paid tool's colors, read off the tool itself (2026-10-19)

The Quick Numeroscope on numpromember.com is a fold-out panel on every member page (`#slideOut`,
fields `#df #mf #yf #ni`). Its page script holds the whole color rule: ten tables (`colorNameArray`,
`colorAuraArray`, `colorAuraArrayUS`, `colorCenterArray`, `colorCenterArrayUS`,
`colorLifeexpressionArray`, `colorSpineArray`, `colorPillarArray`, `colorUndervibArray`,
`colorUndervibArrayUS`), index = the number 1..99, and one code block per number of words in
the name (1 to 5) that says which table colors which element (`heart`, `hara`, `topleftaura`,
`USKpillar`, `USVstorpersonlighed`, ...; `USK` = consonants = personality chart, `USV` = vowels =
vocation chart, `hara` = emotion center, `storpersonlighed` = the sub-chart's big number).

- `fetch.mjs` signs in (members' form at /login/, NOT wp-login; `NUMPRO_USER` and
  `NUMPRO_PASSWORD` from the environment, never printed) and saves `tables.json` + `rules.json`.
  `node fetch.mjs <saved-script.js>` reads a saved copy instead.
- `gen.mjs` writes `public/number-colors.js` from them. Run both, then `npm run verify`:
  `test/numeroscope.test.js` holds 25 colors read off the live page for Jon Eugene Minadeo II.
- `positions.json`: every number's box, color and font off the DOM for that chart, for a future
  position study (the LAYOUT in numeroscope.js was measured from screenshots).

Never run by verify. Spends nothing. The owner's login is theirs: never sign out, never change
anything on the account, read the one page and leave.
