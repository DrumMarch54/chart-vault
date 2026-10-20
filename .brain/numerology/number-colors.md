# Number colors in the paid tool

## The truth since 2026-10-19: the tool's own tables, read off its live page
The paid tool (numpromember.com, the fold-out Quick Numeroscope on every member page) colors every number
from ten tables in its own page script, one table per kind of position (name line, aura, aura of a sub-chart,
center, center of a sub-chart, life expression, spine, pillar, sub-chart life expression and big number), index =
the number 1..99, each entry an exact rgba. Which table a position uses depends on how many WORDS the typed
name has (the script has one block per word count, 1 to 5): e.g. the main mind center uses the sub-chart
center table with 2 or 4 words and the main center table with 3 or 5; the vowel chart's mind center uses the
main center table with 2 words only. Extra vibrations use their center's table. The big life expression is the
life expression table's color at opacity 0.33 (that is the "faded" look). Day numbers and the essence chart are
#303030, the psyche charts and the letter count #517ca4. Numbers of 100 and more have no entry and inherit dark.
The colors are gray (127,127,127) mixed toward pure green or pure red by a share: 20 %, 30 %, 40 %, 50 %, 60 %,
80 %, 100 % (classes g20..g100, r10..r100 in public/number-colors.js).

Tools: `tools/color-study/paid/fetch.mjs` signs in (NUMPRO_USER / NUMPRO_PASSWORD from the environment) and
saves `tables.json` and `rules.json` from the page script; `gen.mjs` writes `public/number-colors.js`. Proven on
Jon Eugene Minadeo II 15.12.1982 (four words): all 25 colored numbers match the live page
(test/numeroscope.test.js). The owner said the tool's colors changed over time; re-run fetch + gen when a chart
looks off, never hand-edit the table.

The page's DOM also gives every number's exact box (x, y, font size) for the 1280-wide layout; a position
study against those boxes is still to do (the LAYOUT below was measured from screenshots).

## Before that: worked out from 436 vault screenshots (2026-10-14), kept for the method

The owner could not get the color rules, so they were read off 436 paid-tool
screenshots in the vault (26,820 numbers, each matched by position AND value
to the number our engine computes for that chart). Tools and steps:
`tools/color-study/README.md`. Table: `public/number-colors.js`.

## What the data says
- Color is a fixed function of (position, number). The name line (first,
  middle, last) is 100% consistent per number; auras, LE, pillar and spine
  nearly so (the only disagreements are between neighbouring shades, i.e.
  sampling noise).
- The center main vibrations (heart, solar plexus) and the consonant chart's
  lower auras flip between two tables depending on whether the name has
  EXACTLY ONE middle name. With one middle name the main chart's centers use
  the "secondary vibration" colors (12/3 red, 7/7 gray, 11/2 red); with two
  names or four they use the other table (12/3 gray, 7/7 green, 11/2 gray).
  Why the paid tool does this is unknown; the table carries both ("+" keys).
- Eight shades, from the pixel medians: gray #7f7f7f (neutral), green1
  #689868 → green4 #1be41a (good, brighter = better), red1 #926967 → red3
  #b43e3c (compromised, brighter = worse). Day numbers, the whole essence
  chart and the inner psyche pillar are dark #303030; everything in the psyche
  charts is blue (#5f7990, bold #597997); the big LE is faded #cecabf; the
  big numbers of the sub-charts are colored like any other number.
- Examples on the name line: 10/1 green1, 11/2 red2, 12/3 red2, 13/4 green1,
  14/5 gray, 15/6 red1, 16/7 red2, 17/8 green2, 18/9 red3, 19/1 green3, 20/2
  green3, 21/3 green3, 22/4 red3, 23/5 green4, 24/6 green4, 25/7 green2, 26/8
  red1, 27/9 green3, 28/1 red1, 29/2 red2, 30/3 gray, 31/4 red2. Auras: single
  digits gray, 10/1 green1, 11/2 red3, 12/3 red2, 13/4 gray, 14/5 green3,
  15/6 green1, 16/7 red2, 17/8 green1, 18/9 red3. Pillar: 19/1 green3, 24/6
  green4, 27/9 green4, 33/6 green4, 37/1 green4, 22/4 red2, 28/1 red2, 40/4
  red2, 30/3 gray, 43/7 gray.
- Numbers never seen in the vault fall back to gray. A new screenshot batch
  can extend the table by rerunning the study.

## Positions, calibrated the same way
Comparing where the paid tool's numbers sit against ours (same OCR on both,
so the box bias cancels) gave corrections of 1-5 drawing units, all applied
to `LAYOUT`: the vowel chart sits 5 units further left than the consonant
chart mirrors; the consonant chart's auras are anchored at their LEFT edge and
the vowel chart's at their RIGHT edge (a 3-character number shifts 6 units
against a 4-character one); the line values of the two sub-charts are not
mirror images (consonants -93.6/+109.8 from center, vowels -106.5/+97.2); the
inner psyche's auras and line values sit 4 units right of its center column,
the outer's 1 unit. Day numbers over the sub-charts and psyche charts are
regular weight, the main day bold.
