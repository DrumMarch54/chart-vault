# Where the course describes a NUMBER IN A POSITION (the position-by-position source map)

The owner asked NotebookLM (which holds the whole course) for a position-by-position map of
which document, which section and which numbers describe a number sitting in a specific spot
of each of the five charts, leaving out the general number descriptions (the 1-9, 10-45,
46-99 books, the website's 1-99 text, the business 1-99 book). The owner handed the answer to
a chat on 2026-10-20; it had never been in the repo before. This file is that map, checked
against the knowledge store (`knowledge/raw/`) and against what the meaning page
(`server/meaning.js`, `GET /api/meaning`) finds.

How to read the tables: **Source** is the document as NotebookLM names it; **Section** and
**Numbers** are its claims; **In the store** is the `knowledge/raw/` file that holds it; **Found**
says whether the section's own words come out of the meaning engine for a sample number
(probe of 2026-10-20, one number per position: "no" = the first check, "fixed" = after the
fixes the same day, "yes" = worked from the start).

What the first check showed, and what was done the same day (HISTORY 2026-10-20, "The position
map: every spot finds its words"):

1. **Six Google Docs were in the store with their headings flattened to plain lines**, so the
   index could not tell "Month Vibration 12" or "Dharma Number 10/1" apart from the paragraph
   before it: `higher-self-month-positions`, `higher-self-website-positions`,
   `position-meanings-website`, `higher-self-dharma-fusion`, `psyche-twenties-aura`,
   `psyche-childhood-aura` (its headings came through mangled). FIXED: the headings were put
   back in the raw files (knowledge/README "Repaired exports"); a number followed by a colon
   ("Month Vibration 12: Expansion") now counts in `tools/build-knowledge.mjs`.
2. **The Superdates appendix was indexed but never shown** (`biz-` prefix = business book).
   FIXED: `HOME` in `server/meaning.js` lets its "Day Vibration N", "Life Path N" and "DVLP N"
   sections through as the day's, the life path's and the nexus's own words. Its "Outer Diamond"
   and "Target Number" entries are two digits side by side (day 1, month 2 = "12"), not a sum,
   so they stay out; the target number has no per-number text in the store.
3. **The sub-chart book's "Solar Plexus Diamond (Vocation)" sections came back empty**: the OCR
   had put each one's paragraph under the next heading. FIXED in `server/subchart-words.js`
   (an empty section takes back the paragraph that opens on its own position words); 29, 33,
   22 and the rest now show. Only 57 (vocation) and 59 (personality) have no words in the book.
4. **List docs whose number is only in the entry, not in a heading** (`name-chart-problem-areas`,
   the vocation and personality problem-areas docs, the psyche book's pillar lists, the sub-chart
   guide's aura scoring). FIXED: `server/listed-words.js` reads them per position and number;
   their entries come last on the page. `name-chart-spines` has no 13/4, 14/5, 16/7 or 17/8 and
   `name-chart-pillars` none of 10/1-18/9, 29/2, 34/7, 37/1, 52/7: the map's lists for those two
   docs are wider than the docs.
5. **Psyche book sections without the number in the heading** ("STEP 2 The Psychic Life
   Expression", "STEP 5 The Psychic Spine Number", "Comparing the Challenge Numbers"): case
   prose about Katrine's numbers, not per-number entries. The pillar lists are read (4), and so
   are Katrine's two challenge numbers; the worked example "15/6 and 5 Challenge Numbers" has
   its two headings back; the month doc serves the inner challenge number (it IS the month
   vibration). The psyche spine reads the spine doc (a bug hid "5/5", "6/6", "7/7", "8/8"
   headings from the index: fixed). The psyche life expression still has no per-number text.
   The psyche centers and upper auras show the NAME chart's words for the same spot (the course
   builds the psyche chart like the name chart).
6. **Not in the store**: `NU-Templates-INT-v1_ocred.pdf` (17 MB). FIXED in part: its rules chapter
   (pages 15-23: pure and avoided name-line values, center, aura, spine, life expression and
   pillar rules) is `knowledge/raw/name-templates-rules.md`; the templates themselves (pages 35+,
   lists of clean name charts with one-line aura notes) stay out. `NP-Statistics-INT-v1` is the
   same book as `humanity-archetyping-book` (checked page for page: same title and chapters).
7. **A version question**: the map says `Numbers 1-9 Chart Full Descriptions (Formatted)` has
   "Day Vibration", "Month Vibration", "Year Vibration" and "Life Path" sub-entries. The Drive
   doc was re-read on 2026-10-20: identical to the store's copy, and it has none. The map is
   wrong about that document; the essence YEAR has no per-number text in the course material
   in the store (the forecasting book's year-row example is what shows).

## 1. Higher Self (Essence) chart

| Position (engine key) | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Day vibration (`essence.day`) | The Higher Self-Website (Position Meanings) / Essence, Psyche and Name Chart Position Meanings-Website | "BIRTH DAY VIBRATION", a subheading per number | 1-31 | `higher-self-website-positions.md`, `position-meanings-website.md` (headings restored; the text describes the position, not numbers 1-31) | no per-number text |
| | Numbers 1-9 Chart Full Descriptions (Formatted) | "Day Vibration" under each number | 1-9 | `numbers-1-9-chart-full-descriptions.md` (no such sub-entries, see 7) | no such text |
| | NU-Superdates-INT-v1 | Appendix "Day Vibration", one heading per compound number | 1, 5, 6, 8, 10/1, 14/5, 15/6, 17/8, 19/1, 23/5, 24/6, 27/9 ... | `biz-superdates-int.md` lines 201-410 ("### Day Vibration N") | fixed (first) |
| | NP-Statistics-INT-v1 | "Day Vibrations and Statistics", ranked lists per career | 1-31 (not 2, 7, 21, 27, 31) | `humanity-archetyping-book.md` line 453+ ("### Day Vibration N"); `statistics-module-7.md` | yes (this is the only thing shown today) |
| Month (`essence.month`) | Higher Self Chart - Month Positions | "Specific Interpretations for Each Number Archetype", one heading per month | 1-12 (no 1 or 4 examples in the doc) | `higher-self-month-positions.md` (headings restored) | fixed |
| | Numbers 1-9 Chart Full Descriptions | "Month Vibration" under each number | 1-9 | see 7 | no |
| Year (`essence.year`) | Numbers 1-9 Chart Full Descriptions | "Year Vibration" under each number | 1-9 | see 7: no such text | no such text (the forecasting book's year-row example shows) |
| Outer diamond (`essence.outerDiamond`) | Essence-APPENDIX-ver1 | Appendix 1 "Outer Diamond Descriptions for the Essence Chart" | 10/1-99/9 | `essence-codes-part-1.md` ("Appendix 1: Outer Diamonds > Outer Diamond N") | yes |
| | EssenceInterpretation-ver1 | "STEP 6 The Higher Self Outer Diamond", cases | 15/6, 19/1, 25/7, 27/9, 88/7 | `essence-book.md` line 329+ | partly |
| Inner diamond (`essence.innerDiamond`) | Essence-APPENDIX-ver1 | Appendix 2 "Inner Diamond Descriptions" | 10/1-99/9 | `essence-codes-part-2.md` ("Appendix 2: Inner Diamonds > Inner Diamond N") | yes |
| | EssenceInterpretation-ver1 | "The Inner Diamond", cases | 14/5, 19/1, 22/4, 39/3 | `essence-book.md` line 139 | partly |
| Dharma line / dharma diamond (`essence.topAura`, `essence.dharmaDiamond`) | Higher Self - Dharma fusion (Upper aura) | "Compilation of Specific Dharma Fusion Numbers": tables (Dharma Number, Composition, Fusion Key) | 10/1, 12/3, 13/4, 14/5, 15/6, 18/9, 19/1, 24/6, 30/3, 54/9, 59/5, 72/9, 84/3, 92/2 | `higher-self-dharma-fusion.md` (headings restored) | fixed |
| | EssenceInterpretation-ver1 | "DHARMA LINE: THE KEY TO SUCCESS WITH YOUR LIFE MISSION", bullets by month/year fusion | same list | `essence-book.md` line 143 | no |
| | NU-Superdates-INT-v1 | Appendix "Day x Month (Aura of the Day)" and "Dharma Line / Top Aura": Alignment Vector, Fastest Bridge | 12/3, 13/4, 14/5, 15/6, 57/3, 69/6, 71/8, 87/6, 88/7 | `biz-superdates-int.md` | no (biz- prefix) |
| Nexus, DVLP (`essence.nexus`) | NU-Superdates-INT-v1 | Appendix "DVLP", a heading per number | 16/7, 22/4, 26/8, 45/9, 61/7, 62/8, 87/6, 88/7 | `biz-superdates-int.md` line 699+ ("### DVLP N", 11-99) | fixed |
| | EssenceInterpretation-ver1 | "DV-LP DIAMOND: YOUR NATURAL TALENT", cases | 16/7, 22/4, 26/8 | `essence-book.md` line 147 | no |
| Target number (`essence.target`) | NU-Superdates-INT-v1 | Appendix "Target Number", action prose and Fastest Bridge | 12/3, 15/6, 24/6, 29/2 | `biz-superdates-int.md` line 2347+: entries "11 — Day 1 Dharma 1", two digits side by side, not a sum | not this app's number; nothing shown |
| Life path (`essence.littleLp`, `essence.bigLp`) | Numbers 1-9 Chart Full Descriptions | "Life Path" under each number | 1-9 | see 7 | no |
| | The Higher Self-Website / EssenceInterpretation-ver1 | "The Life Path Numbers", compound examples | 11/2, 12/3, 15/6, 20/2, 29/2, 38/2, 39/3, 42/6 | `essence-book.md` line 201+ ("LIFE PATH NUMBERS > 11/2: The Master Harmonizer") | yes |
| | NU-Superdates-INT-v1 (not in the map, found on the way) | "Life Path N" | 3-99 | `biz-superdates-int.md` line 415+ | fixed (first, the essence book second) |

## 2. Psyche charts (outer = `outer.*`, inner = `inner.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Childhood aura, bottom right (`*.lowerRight`) | Psyche Chart - Childhood Aura's (Bottom Right Aura) | "BIG PSYCHE LIFE EXPRESSION: X" then "THE NUMBER X IN CHILDHOOD" | 5, 6, 7, 8, 10/1, 12/3, 13/4, 14/5 under LEs 12, 23, 24, 35, 51, 58, 64, 74, 97 | `psyche-childhood-aura.md` (headings restored) | fixed (first; the name chart's love aura second) |
| Twenties aura, bottom left (`*.lowerLeft`) | Psyche Chart - Twenties Aura (Bottom Left Aura) | "THE NUMBER X IN THE TWENTIES" and "BIG PSYCHE LIFE EXPRESSION: X" | 4, 7, 8, 9, 10/1, 11/2, 12/3, 14/5, 16/7, 17/8 under LEs 12/3 ... 97/7 | `psyche-twenties-aura.md` (headings restored) | fixed (first) |
| Teenage (upper right) and adult (upper left) auras | Psyche-INT-v1 / Psyche chart-Website | "The Journey Through the Psychic Self" / "The Auras" | 5, 7, 8, 9, 11/2, 12/3, 14/5, 15/6, 16/7, 18/9, 94/4, 95/5 | `psyche-book.md` line 89+ (STEP 3), 219+; `psyche-chart-website-positions.md` | no (showed the name chart's brand aura and module 7 slides) |
| Heart center and heart diamond (`*.heart`, `*.mindDiamond`) | Psyche-INT-v1 | "QUICK OVERVIEW The Heart Diamond" / "STEP 4 The Psychic Centers", cases | 14/5, 15/6, 52/7, 95/5 | `psyche-book.md` lines 115-119, 191 | no (shows the NAME chart's mind center words) |
| Solar plexus center and diamond (`*.solar`, `*.emotionDiamond`) | Psyche-INT-v1 | "SOLAR PLEXUS CENTER (AND SOLAR PLEXUS DIAMOND)" | 9/9, 12/3, 14/5, 15/6 | `psyche-book.md` line 123 | no (name chart's emotion center words) |
| Psychic life expression and its diamond (`*.le`, `*.big`, `*.leDiamond`) | Psyche-INT-v1 | "STEP 2 The Psychic Life Expression" / "THE LIFE EXPRESSION DIAMOND" | 12/3, 23/5, 24/6, 34/7, 35/8, 58/4, 64/1, 72/9, 74/2, 84/4, 97/7 | `psyche-book.md` lines 81, 131, 437 | no |
| Psychic pillar (`*.pillar`) | Psyche-INT-v1 | "STEP 6 The Psychic Pillar", "Comparing Pillars" | 11/2, 12/3, 14/5, 16/7, 18/9 | `psyche-book.md` lines 507-533 (the pillar lists) | fixed (listed-words) |
| Psychic spine (`*.spine`) | Psyche-INT-v1 | "STEP 5 The Psychic Spine Number" | 11/2, 12/3, 16/7 | `psyche-book.md` line 147 (the formula only); the spine doc `name-chart-spines.md` (= Drive "Spines (formatted)") holds the per-number words, 3, 5, 6, 7, 8, 10/1, 11/2, 12/3, 15/6, 18/9, and serves the psyche spine too | fixed: 5/5-8/8 were hidden by a reading bug ("5/5" named no number); 16/7 is not in the doc |
| Challenge number (`*.first`) | Psyche-INT-v1 | "Comparing the Challenge Numbers" | 12/3, 15/6, 16/7, 18/9 | `psyche-book.md` line 473: Katrine's 8 (inner) and 18/9 (outer) only, read by listed-words; `nlm-psyche-example-15-6-and-5-challenge.md`: 15/6 as an outer and 5 as an inner challenge (HOME); `nlm-outer-psyche-challenge-number.md`: the mechanics, no per-number text; the INNER challenge number is the month vibration, so the month doc serves it (HOME) | fixed for 5, 8, 15, 18 and every month 2-12; no list number by number exists in the store (checked Drive 2026-10-20: no other doc) |

## 3. Name chart (`name.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Name line (`name.first/middle/last`) | Name chart problem areas | "Name Line", bullets per number | 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 99 | fixed (listed-words) |
| | NU-Templates-INT-v1 | STEP 1 "Rules for pure name charts" > "Other rules for the name line": pure vs avoided | pure 10/1, 14/5, 15/6, 19/1, 20/2, 21/3, 23/5, 24/6, 25/7, 27/9, 32/5, 33/6, 37/1; avoided 11/2, 12/3, 16/7, 18/9, 29/2 | `name-templates-rules.md` (the rules chapter, added 2026-10-20); `lecture-rules-for-pure-name-charts.md` is the lecture on the same step | rules, not per-number prose |
| Mind center main and extra (`name.heart`, `name.heartExtra`) | Name Chart - Mind Centers / Name Chart - Mind and Emotion centers | "MIND CENTER MAIN VIBRATION", "MIND CENTER SUB-VIBRATIONS" | main 3-17, sub 2, 4, 7, 8, 9, 11, 12, 13, 14, 16 | `name-chart-mind-and-emotion-centers.md` ("N - MIND CENTER MAIN VIBRATION > N MV / N SV") | yes |
| | Name chart problem areas | "Mind Center Vibrations" / "MC Sub Vibration X" | 4, 8, 9, 11, 12, 13/4, 16, 17, 18 | `name-chart-problem-areas.md` line 21 | fixed (listed-words, after the centers doc) |
| | Name Numeroscope Guide V2 | "Heart Center" under each compound number, Balanced / Unbalanced | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` (COMBO_SOURCE in meaning.js: all positions in one passage, so held back) | no |
| Emotion center main and extra (`name.solar`, `name.solarExtra`) | Name Chart - Emotional Centers / Mind and Emotion centers | "EMOTION CENTER MAIN VIBRATIONS", "EMOTION CENTER SUB-VIBRATIONS" | main 4-17, sub 3, 5-13 | `name-chart-mind-and-emotion-centers.md` | yes |
| | Name chart problem areas | "Emotional Center" | 4, 8, 9, 11/2, 12, 13, 15/6, 16 | `name-chart-problem-areas.md` line 55 | fixed (listed-words) |
| | Name Numeroscope Guide V2 | "Solar Plexus" under each compound number | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` | no (held back) |
| Auras: public/brand (upper left), friends (upper right), associates (lower left), love (lower right) | Name Chart Life Areas (Auras) | sections 3 Love Life, 4 Friends, 5 Associates, 6 Brand, balanced/unbalanced per number | 1-10, 12/3-18/9 in all four | `name-chart-auras.md` ("Brand Aura: > 12/3 as Brand Aura") | yes |
| | Name Numeroscope Guide V2 | "Aura" under each compound number | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` | no (held back) |
| | NU-Templates-INT-v1 | Templates 1A-9C, each aura and aura diamond | auras 2-10/1; aura diamonds 15/6, 16/7, 17/8, 25/7, 33/6, 51/6, 52/7, 55/1, 61/7, 77/5, 95/5 | NOT in the store | no |
| Life expression (`name.le`, `name.big`) | Name chart problem areas | "Life Expression" | 4, 8, 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 121 | fixed (listed-words) |
| | NU-Templates-INT-v1 | "Spine and Life Expression" / Templates 1A-9C | 5, 6, 7, 8, 10/1, 14/5, 15/6, 19/1, 23/5, 24/6, 27/9, 32/5, 37/1 | NOT in the store | no |
| Spine (`name.spine`) | Name Chart - Spines | a heading per spine number | 3, 5, 6, 7, 8, 10/1, 11/2, 12/3, 15/6, 18/9 (the map also lists 13/4, 14/5, 16/7, 17/8; not in the doc) | `name-chart-spines.md` ("12/3 AS SPINE NUMBER") | yes for 12/3; 16/7 is not in the doc |
| | Name chart problem areas | "Spine" | 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 165 (12/3 and 11/2 only) | fixed (listed-words) |
| Pillar (`name.pillar`) | Name Chart - Pillars | a heading per pillar number | 13/4, 20/2, 21/3, 24/6, 30/3, 32/5, 36/9, 41/5, 42/6, 48/3, 50/5, 54/9, 58/4, 60/6, 63/9, 64/1, 69/6, 70/7, 79 (the map's list 10/1-18/9, 29/2, 34/7, 37/1, 52/7 is NOT what the doc holds) | `name-chart-pillars.md` | not probed with a number the doc has |
| | Personality Chart Problem Areas / Name chart problem areas | "Pillar Numbers" | 11/2, 12/3, 16/7, 18/9, 29/2, 48/3 | `personality-chart-problem-areas.md`, `name-chart-problem-areas.md` | no (29/2 empty) |

## 4. Vocation chart (`vocation.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Little and big heart's desire (`vocation.le`, `vocation.big`) | Vocation Chart Problem Areas | "Little Heart's Desire", "Big Heart's Desire" | 12/3, 16/7; 18/9, 28/1 | `vocation-chart-problem-areas.md` | fixed (listed-words) |
| | NPE-SubNumeroscopeInterpretation-ver1 | "Heart's Desire Numbers": Superpower / Major Sin | 10/1, 14/5, 15/6, 16/7, 23/5, 27/9, 33/6, 37/1 | `subnumeroscope-interpretation-book.md` ("Number N > Heart's Desire") | yes |
| | NP-Undernumeroscopes power point | "PT AND HD DESIRE NUMBERS" / "WHAT THE NUMBERS SAY" | 1-9 | `powerpoint-undernumeroscopes.md`; `subvibrations-book.md` ("Personality or Hearts desire number N") | yes (subvibrations) |
| Heart diamond (`vocation.mindDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Heart Diamond (Vocation)" per compound number | 33, 37, 39, 47/2, 54/9, 74, 86, 87, 94, 95 | `subnumeroscope-interpretation-book.md` ("Number N > Heart Diamond (Vocation)") | yes |
| | Vocation Chart Problem Areas | "MC Main vibration" / "MC Sub vibration" | 11, 12/3, 18/9 | `vocation-chart-problem-areas.md` | fixed (listed-words) |
| Solar plexus diamond (`vocation.emotionDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Solar Plexus Diamond (Vocation)" per compound number | 29, 33, 41, 49, 54, 63, 64, 79, 87 | `subnumeroscope-interpretation-book.md` ("Number N > Solar Plexus Diamond (Vocation)") | fixed (gap 3) |
| | Vocation Chart Problem Areas | "Emotion Center" | 8, 9, 15/6, 8 + 15/6, 4-8 (13/4) | `vocation-chart-problem-areas.md` | fixed (listed-words) |
| Auras and middle-name (sub) diamonds | Subnumeroscopes-guide-INT-ver1a | "Vocation chart secondary vibrations", "4-8 between aura and secondary vibrations" | 4, 8, 12/3, 13/4, 15/6, 18/9 | `subvibrations-book.md` ("Aura Scoring – Vocation Chart" line 615: 11/2 has words, 12, 16, 18 only scores; "4–8 Tension" is a pair) | fixed for 11/2 (listed-words) |
| Pillar (`vocation.pillar`) | Subnumeroscopes-guide-INT-ver1a | "Vocation Chart Pillar", stability scoring | 10/1, 11/2, 12/3, 13/4, 14/5, 16/7, 18/9, 29/2, 48/3 | `subvibrations-book.md` ("Vocation Chart Pillar") | yes |
| Heart / emotion center (`vocation.heart`, `vocation.solar`) (not in the map; the guide has it) | Subnumeroscopes-guide-INT-ver1a | "Vocation Chart Heart Center" scored list | 1-18 | `subvibrations-book.md` line 295 (parsed by `server/subchart-words.js`) | yes |

## 5. Personality chart (`personality.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Little and big personality (`personality.le`, `personality.big`) | Personality Chart Problem Areas | "Little Personality" | 11/2, 12/3, 16/7, 18/9 | `personality-chart-problem-areas.md` | fixed (listed-words) |
| | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Numbers", charisma and career archetype | 9, 20, 74, 78 | `subnumeroscope-interpretation-book.md` ("Number N > Personality Numbers") | yes |
| | NP-Undernumeroscopes power point | "WHAT THE NUMBERS SAY" (consonants) | 1-9 | `powerpoint-undernumeroscopes.md`; `subvibrations-book.md` | yes |
| Heart diamond, mental charisma (`personality.mindDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Heart Diamond" | 52/7, 57, 74, 87 | `subnumeroscope-interpretation-book.md` ("Number N > Personality Heart Diamond") | yes |
| | Personality Chart Problem Areas | "MC hard sub vibrations" | 8, 16 | `personality-chart-problem-areas.md` | fixed (listed-words) |
| Solar plexus diamond, emotional charisma (`personality.emotionDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Solar Plexus Diamond" | 18, 34, 57 | `subnumeroscope-interpretation-book.md` | yes |
| Auras and center sub-vibrations | Subnumeroscopes-guide-INT-ver1a | "Aura Scoring - Personality Chart", "Personality chart 4-8 aura reverberation" | 4, 8, 11/2, 12/3, 16/7, 18/9 | `subvibrations-book.md` line 637 (11/2 has words; 4 and 8 are the 4-8 pair) | fixed for 11/2; 8 alone has no text |
| Pillar (`personality.pillar`) | Personality Chart Problem Areas | "Pillar Numbers" | 29/2, 48/3 | `personality-chart-problem-areas.md`; `subvibrations-book.md` ("Personality Chart – Pillar Number Scoring") | yes (scoring list) |

## 6. Combinations across positions and charts

| What | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Nexus, extra vibrations, pairs | Main Combo Guide / Combos (number notes) | a heading per pair | 4-8, 8-13/4, 9-11/2, 15/6-9, 15/6-8, 12-7, 3-5-8, 5-13/4-8 | `main-combo-guide.md`, `combos-number-notes.md` (COMBO_SOURCE: pair pages only) | pair pages |
| Vocation vs personality centers | Subnumeroscopes-guide-INT-ver1a | "Vocation-Personality Cross-Chart Conflicts" | vocation 4 + personality 8 and the reverse | `subvibrations-book.md` line 735 | no page for it yet |

## Positions the course has NO standalone number text for (NotebookLM's own list)

- Extra vibrations of the Higher Self chart (secondary aura modifiers) beyond the outer, inner,
  dharma, DVLP and target diamonds.
- The letter-by-letter positions of the name line ("3rd letter of the surname"): compound
  values of a whole name are mapped, single letters are not.
