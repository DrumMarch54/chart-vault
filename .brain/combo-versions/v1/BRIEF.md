# Writing combination cards (for a Claude session)

The number screen's "With Its Neighbors" rows open a CARD for two numbers that sit together (server/neighbors.js says
which pairs count). The owner does not pay for cards in the app: Claude sessions write them here, ahead of time.

## Before writing a single line
1. Read `.brain/numerology/combinations.md` in full: the five-step read, position grammar, modifier rules, and EVERY
   correction under "The owner's corrections". They are rules, not suggestions.
2. Read `.brain/numerology/combination-cards-graded.md`: the cards the owner passed. Match their density and tone.
3. Read the live snapshot's COMBINATION CARDS section (`node tools/report.mjs full`): write the pairs tapped while
   missing FIRST, and fix every "This Is Off" note (fix the card in its batch file; add the rule to combinations.md,
   dated, in the owner's words).

## What a card is
A JSON object in `tools/combo-cards/batches/batch-NN.json` ({ "about": "...", "cards": [ ... ] }):
- `a`, `b`: `{ "spot": "name.heart", "sum": 16 }`: the two spots (chart.position as in server/positions.js) and the
  two numbers as the chart holds them (16 for 16/7). `a` is the PRIMARY one (the more dominant position: day over
  aura, main vibration over sub vibration, the name over the aura it makes).
- `phrases`: three short phrases, Title Case, the best first ("Nervous Celebrity").
- `position`: By Position, one or two sentences: what each spot is for the person, with its number.
- `share` (optional): `{ "title": "What They Share" | "What Sets Them Apart", "text": "..." }`.
- `course` (optional, only a real quote or the owner's note): `{ "about": "who or where the quote is about", "text": "\"...\"" }`.
- `reasoning`: separate points (a list), each says ONE plain thing, past the course but built on it.
- `best`, `worst`: one line each, a plain thing a person does, each half with its number.
- `made` (optional): one line when the two make a third number ("Made together: public aura 14/5, ...").
- Never `graded` (only the owner grades); `written`: the date.

## The rules that were broken before (combinations.md has the stories)
- Every claim carries its number in brackets: "his care (24/6) gets misread (12/3)". A claim that cannot carry a
  number is cut.
- "They", never "he". The day is the personality, never "the core" (the core is the life path).
- A sub vibration only tints the main one. Read what is IN the center; never say "from the middle name".
- Never the word "circle": a center's two numbers are "in the center" (owner 2026-11-27).
- No part repeats another in other words. Two numbers a card, never three.
- A course quote must make sense alone: say whose chart or which place it is about first.
- Full text, never shortened to fit the phone: the screen folds it.

## Then
`node tools/combo-cards/merge.mjs` (stops on any card that breaks the shape), `npm run verify`, push. The app shows the
new cards on every chart with that pair, marked "New · For You to Grade" until the owner grades them.
