# The number screen and the combination cards: build plan (designed on Fable 2026-11-26/27, build on Opus high)

Two chats became one job. The owner: "we obviously need to figure this out and do it the right way."
READ FIRST, in this order: `.brain/numerology/combinations.md` (how a combination is read, every correction the
owner gave, the build decisions at its end), `.brain/numerology/combination-cards-graded.md` (the cards he passed,
word for word), `public/CLAUDE.md` "Designing". Mockups (the picked look, real data, open them in a browser):
`.brain/mockups/number-screen.html` = https://claude.ai/artifact/YUHErTqhW75LXiavZnoUVA (the whole screen, Elvis's
public aura), `.brain/mockups/combination-card.html` = https://claude.ai/artifact/NpKJYm5nJWbMsE2e7ANTX1 (one card).
The other chat ("Fix the number meaning screen", branch claude/fable-position-screen-2ug5gr) built nothing; its
findings are below. Status: the owner passed the card and the screen ("the mockup is pretty good"); the order
below is Claude's reading of his last note and waits for his yes.

## What is wrong today (measured on Elvis Aaron Presley, 8 Jan 1935, by the other chat)
- Every aura gets the mind center's sub diamond: public aura 17/8 shows 77/5, which is not connected to it.
- The diamonds that ARE connected are missing or mislabeled: public diamond 89/8 (day 8 beside Elvis 18/9 makes
  the 17), mental diamond 88/7. The day shows only the nexus: missing spine diamond 87/6, public diamond, outer
  81/9, inner 89/8, target. Life expression, month, year, pillar show no diamonds at all.
- Empty parts get filler: name chart diamonds have their own course words on 0-3 % of charts, so the page shows
  the general number text in their place. The title three times; Quick Gist = the first words of the points
  under it; 3 to 5 screens per number; psyche spots show name-change advice (a birth date cannot be changed).
- Vocation and personality centers and diamonds already have their own course words (98-100 %): keep.

## The screen, top to bottom (owner 2026-11-27)
0. Band: the number, the spot's course name, chart, the number's title ONCE. One line "What this spot is".
1. THE NUMBER IN THIS SPOT, as today ("I like the way the screen currently is"): the short points (In Balance /
   Out of Balance strips), then the Course Words button for the full text. Sources for the points, BOTH when both
   exist (owner: "that's the type of shit you should be pulling from", for any position, not only auras):
   the course's text for the number in THIS exact spot (e.g. `name-chart-auras` "Number 17 as the love life
   aura") AND its text for the number in this KIND of spot (Name Numeroscopes appendix "AURA 17/8", "in the
   heart center", ...), applied to the spot tapped. Measured 2026-11-27: the public, friends and associates aura
   of 17/8 show only the general aura text (right: the course has no specific one); the love life aura shows only
   the specific text and drops the general one (the gap to close). Check every position family for the same gap.
   The owner is "a bit skeptical about these specific number in specific position descriptions at the top of
   the screen and how they're being done", with reason. Audit of the name chart auras, numbers 2-18, run
   2026-11-27 (`meaningFor`): NOTHING shown for public aura 5 and 14, associates aura 5, love life aura 2, 3, 5,
   9, 18, though the book's "as an aura" text exists for them; the love life aura uses the specific text alone
   for 4, 6, 7, 8, 10, 13, 14, 15, 17 (general dropped). Drive doc "Name Chart - Auras" = `name-chart-auras`
   in the store; it does not cover every number in every aura (no 17 as a public aura). Step 2 = run the same
   audit for EVERY spot family in every chart, show the owner the table of holes, fill them from both sources,
   and print under the points which course texts they came from.
2. ABOUT THE NUMBER IN GENERAL: one folded row (the guide's title and opening lines, Show More = the whole guide
   entry and Number Notes, as today). Directly under part 1, never mixed into it.
3. CONNECTED DIAMONDS: only the diamonds the tapped number is PART OF or MAKES, all of them, each a row that
   opens (Elvis's public aura: public diamond 89/8 "what makes this 17", mental diamond 88/7 "what this 17 helps
   make"). One connection list for every spot of every chart: what makes it, what it helps make (the other
   chat's fix 1). A row opens to the course's words for that number as that diamond where they exist; where the
   course has none, an "In This Spot" explanation written by Claude sessions, marked as an interpretation.
4. WITH ITS NEIGHBORS: rows, one per neighbor from the list of what a combination is (`diamondsOf` in
   server/insight.js, plus the owner's new kind: an aura's diamond beside the center's diamond), each showing the
   pair's first phrase; a row opens the card. A pair with no card: "Not Written Yet", no charge; the tap is
   recorded (names and numbers only) and listed in the snapshot so the next writing chat does those first.
5. ASK ABOUT THIS, as today.
Gone: Quick Gist, the repeated titles, diamonds that are not connected, name-change advice on psyche spots.

## The card (never change its parts; combinations.md says why)
The pair as two chips · The Phrases (one big, two more under it) · By Position · What They Share (or What Sets
Them Apart) · What the Course Says (who or where the quote is about, then the quote) · My Reasoning (separate
points, a dot and a line between, labeled as past the course) · At Its Best · At Its Worst · "Made together
with ..." when the two make a third number · This Is Off (the owner types what is wrong; stored with the card's
key and shown in the snapshot for the next writing chat; no paid rewrite). Two numbers a card, never three.
Every claim carries its number in brackets. Full text, never shortened to fit.

## Where cards live and who writes them
- The owner will NOT pay per card: Claude sessions write them. One generated file (proposal:
  `knowledge/combo-cards.json`, made by a tool from per-batch files the way `knowledge/bits.json` is; never
  hand-edited), keyed by kind of pair + the two numbers, never by person. The graded cards go in first.
- Write in order of use: the pairs most charts hold, and the pairs the owner tapped while missing.
- A writing session follows combinations.md to the letter and adds every new correction to it.
- A paid "Write It" button is NOT part of this build.

## Build order (each step shippable)
1. The connection list + the screen's new order with parts 1, 2, 3, 5 (fixes what is wrong today; no cards yet).
2. The both-sources fix for part 1's points (regenerate the affected short points with tools/bits).
3. Part 4: rows, the card, the graded cards, Not Written Yet + the tapped-while-missing list, This Is Off.
4. Writing sessions fill cards and the "In This Spot" explanations.
After each: `npm run verify`, the dev app at 390x844 in every look, compare with the mockups, then say done.
