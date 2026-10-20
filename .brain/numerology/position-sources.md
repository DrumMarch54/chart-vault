# Where the course describes a NUMBER IN A POSITION (the position-by-position source map)

The owner asked NotebookLM (which holds the whole course) for a position-by-position map of
which document, which section and which numbers describe a number sitting in a specific spot
of each of the five charts, leaving out the general number descriptions (the 1-9, 10-45,
46-99 books, the website's 1-99 text, the business 1-99 book). The owner handed the answer to
a chat on 2026-10-20; it had never been in the repo before. This file is that map, checked
against the knowledge store (`knowledge/raw/`) and against what the meaning page
(`server/meaning.js`, `GET /api/meaning`) finds today.

How to read the tables: **Source** is the document as NotebookLM names it; **In the store** is
the `knowledge/raw/` file that holds it; **Found** says whether the section's own words come out
of the meaning engine for a sample number (probe of 2026-10-20, one number per position).

What the check showed (the gaps to chip away at, in order of value):

1. **Six Google Docs are in the store with their headings flattened to plain lines**, so the
   index cannot tell "Month Vibration 12" or "Dharma Number 10/1" apart from the paragraph
   before it: `higher-self-month-positions`, `higher-self-website-positions`,
   `position-meanings-website`, `higher-self-dharma-fusion`, `psyche-twenties-aura`,
   `psyche-childhood-aura` (its headings came through mangled:
   `**BIG PSYCHE LIFE EXPRESSION: 12THE NUMBER 5 IN CHILDHOOD`). The words are all there; the
   fix is in `tools/build-knowledge.mjs` (or a re-export): treat the per-number lines
   ("Month Vibration 12: Expansion", "Dharma Number 10/1", "THE NUMBER 7 IN THE TWENTIES",
   "BIRTH DAY VIBRATION") as headings. Until then the essence month, year, dharma, day
   (website text) and the psyche childhood / twenties auras come back empty or borrow the
   NAME chart's aura text (childhood 7 showed "Number 7 as the love life aura").
2. **The Superdates appendix is indexed but never shown**: its "Day Vibration N", "Life Path N",
   "DVLP N" sections (`biz-superdates-int`, headings at lines 201+, 415+, 699+) carry the
   `biz-` prefix, which `server/meaning.js` ranks as business words and never shows as a spot's
   own words. The map says these are THE position texts for the nexus (DVLP), the target
   number, the dharma line and the day. Decide per section, never by file.
3. **The sub-chart book's per-number sections are only half used**: "Number N > Heart Diamond
   (Vocation)" comes out, "Number N > Solar Plexus Diamond (Vocation)" does not (vocation
   emotional diamond 29 came back empty though `## Number 29 > ### Solar Plexus Diamond
   (Vocation)` is at line 1055 of `subnumeroscope-interpretation-book.md`).
4. **Name-chart list docs whose number is only in the body**: `name-chart-problem-areas` (Name
   Line, Life Expression, Spine, Pillar sections: numbers inside bullets), `name-chart-pillars`
   (headings "13/4", "20/2" ... fine, but 29/2 is not in it; the problem-areas doc has it),
   `name-chart-spines` (16/7 is not a heading; the key line lists 3-5-6-7-8-10-11-12-15-18).
   So name line 11/2, life expression 12/3, spine 16/7, pillar 29/2 all came back empty.
5. **Psyche book sections without the number in the heading**: "STEP 2 The Psychic Life
   Expression", "STEP 5 The Psychic Spine Number", "STEP 6 The Psychic Pillar", "Comparing the
   Challenge Numbers" (`psyche-book.md` lines 81-155, 473): the numbers (12/3, 16/7, 11/2 ...)
   are in the text. Psyche life expression, pillar and challenge number came back empty.
6. **Not in the store at all**: `NU-Templates-INT-v1_ocred.pdf` (Drive
   1WZ346PA2iu2bsBK4Ce1uLvlbPtjZO3e0, 17 MB; skipped on 2026-10-16 as "construction only",
   but the map says STEP 1 "Other rules for the name line" lists the pure name-line values
   10/1, 14/5, 15/6, 19/1, 20/2, 21/3, 23/5, 24/6, 25/7, 27/9, 32/5, 33/6, 37/1 and the avoided
   11/2, 12/3, 16/7, 18/9, 29/2, and Templates 1A-9C break down each aura and aura diamond).
   `NP-Statistics-INT-v1_ocred.pdf` (Drive 1YGaZOz9B8oUpjSlr6Ag2LFqAkMcmAmg4): the store's
   `humanity-archetyping-book` has the same "DAY VIBRATIONS AND STATISTICS > Day Vibration N"
   sections and is what the day position shows today; not compared page for page.
7. **A version question**: the map says `Numbers 1-9 Chart Full Descriptions (Formatted)` has
   "Day Vibration", "Month Vibration", "Year Vibration" and "Life Path" sub-entries under each
   number 1-9. The store's copy (`numbers-1-9-chart-full-descriptions.md`, 899 lines, exported
   from Drive 1oJPZAxOQMcmO-lQdN-RWYhwoWI0AiAwpudam4F3QdH4) has none of those words. Either
   NotebookLM holds a newer version of the doc or the export dropped them: re-read the Drive
   doc before building on it.

## 1. Higher Self (Essence) chart

| Position (engine key) | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Day vibration (`essence.day`) | The Higher Self-Website (Position Meanings) / Essence, Psyche and Name Chart Position Meanings-Website | "BIRTH DAY VIBRATION", a subheading per number | 1-31 | `higher-self-website-positions.md`, `position-meanings-website.md` (flat) | no |
| | Numbers 1-9 Chart Full Descriptions (Formatted) | "Day Vibration" under each number | 1-9 | `numbers-1-9-chart-full-descriptions.md` (sub-entries missing, see 7) | no |
| | NU-Superdates-INT-v1 | Appendix "Day Vibration", one heading per compound number | 1, 5, 6, 8, 10/1, 14/5, 15/6, 17/8, 19/1, 23/5, 24/6, 27/9 ... | `biz-superdates-int.md` lines 201-410 ("### Day Vibration N") | no (biz- prefix) |
| | NP-Statistics-INT-v1 | "Day Vibrations and Statistics", ranked lists per career | 1-31 (not 2, 7, 21, 27, 31) | `humanity-archetyping-book.md` line 453+ ("### Day Vibration N"); `statistics-module-7.md` | yes (this is the only thing shown today) |
| Month (`essence.month`) | Higher Self Chart - Month Positions | "Specific Interpretations for Each Number Archetype", one heading per month | 1-12 (no 1 or 4 examples in the doc) | `higher-self-month-positions.md` (flat; "Month Vibration 12: Expansion" at line 97) | no |
| | Numbers 1-9 Chart Full Descriptions | "Month Vibration" under each number | 1-9 | see 7 | no |
| Year (`essence.year`) | Numbers 1-9 Chart Full Descriptions | "Year Vibration" under each number | 1-9 | see 7 | no (shows the forecasting book's year-row example instead) |
| Outer diamond (`essence.outerDiamond`) | Essence-APPENDIX-ver1 | Appendix 1 "Outer Diamond Descriptions for the Essence Chart" | 10/1-99/9 | `essence-codes-part-1.md` ("Appendix 1: Outer Diamonds > Outer Diamond N") | yes |
| | EssenceInterpretation-ver1 | "STEP 6 The Higher Self Outer Diamond", cases | 15/6, 19/1, 25/7, 27/9, 88/7 | `essence-book.md` line 329+ | partly |
| Inner diamond (`essence.innerDiamond`) | Essence-APPENDIX-ver1 | Appendix 2 "Inner Diamond Descriptions" | 10/1-99/9 | `essence-codes-part-2.md` ("Appendix 2: Inner Diamonds > Inner Diamond N") | yes |
| | EssenceInterpretation-ver1 | "The Inner Diamond", cases | 14/5, 19/1, 22/4, 39/3 | `essence-book.md` line 139 | partly |
| Dharma line / dharma diamond (`essence.topAura`, `essence.dharmaDiamond`) | Higher Self - Dharma fusion (Upper aura) | "Compilation of Specific Dharma Fusion Numbers": tables (Dharma Number, Composition, Fusion Key) | 10/1, 12/3, 13/4, 14/5, 15/6, 18/9, 19/1, 24/6, 30/3, 54/9, 59/5, 72/9, 84/3, 92/2 | `higher-self-dharma-fusion.md` (flat; "Dharma Number 10/1" at line 103) | no |
| | EssenceInterpretation-ver1 | "DHARMA LINE: THE KEY TO SUCCESS WITH YOUR LIFE MISSION", bullets by month/year fusion | same list | `essence-book.md` line 143 | no |
| | NU-Superdates-INT-v1 | Appendix "Day x Month (Aura of the Day)" and "Dharma Line / Top Aura": Alignment Vector, Fastest Bridge | 12/3, 13/4, 14/5, 15/6, 57/3, 69/6, 71/8, 87/6, 88/7 | `biz-superdates-int.md` | no (biz- prefix) |
| Nexus, DVLP (`essence.nexus`) | NU-Superdates-INT-v1 | Appendix "DVLP", a heading per number | 16/7, 22/4, 26/8, 45/9, 61/7, 62/8, 87/6, 88/7 | `biz-superdates-int.md` line 699+ ("### DVLP N", 11-99) | no (biz- prefix) |
| | EssenceInterpretation-ver1 | "DV-LP DIAMOND: YOUR NATURAL TALENT", cases | 16/7, 22/4, 26/8 | `essence-book.md` line 147 | no |
| Target number (`essence.target`) | NU-Superdates-INT-v1 | Appendix "Target Number", action prose and Fastest Bridge | 12/3, 15/6, 24/6, 29/2 | `biz-superdates-int.md` | no (biz- prefix) |
| Life path (`essence.littleLp`, `essence.bigLp`) | Numbers 1-9 Chart Full Descriptions | "Life Path" under each number | 1-9 | see 7 | no |
| | The Higher Self-Website / EssenceInterpretation-ver1 | "The Life Path Numbers", compound examples | 11/2, 12/3, 15/6, 20/2, 29/2, 38/2, 39/3, 42/6 | `essence-book.md` line 201+ ("LIFE PATH NUMBERS > 11/2: The Master Harmonizer") | yes |
| | NU-Superdates-INT-v1 (not in the map, found on the way) | "Life Path N" | 3-99 | `biz-superdates-int.md` line 415+ | no (biz- prefix) |

## 2. Psyche charts (outer = `outer.*`, inner = `inner.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Childhood aura, bottom right (`*.lowerRight`) | Psyche Chart - Childhood Aura's (Bottom Right Aura) | "BIG PSYCHE LIFE EXPRESSION: X" then "THE NUMBER X IN CHILDHOOD" | 5, 6, 7, 8, 10/1, 12/3, 13/4, 14/5 under LEs 12, 23, 24, 35, 51, 58, 64, 74, 97 | `psyche-childhood-aura.md` (mangled headings) | no (showed the name chart's love aura) |
| Twenties aura, bottom left (`*.lowerLeft`) | Psyche Chart - Twenties Aura (Bottom Left Aura) | "THE NUMBER X IN THE TWENTIES" and "BIG PSYCHE LIFE EXPRESSION: X" | 4, 7, 8, 9, 10/1, 11/2, 12/3, 14/5, 16/7, 17/8 under LEs 12/3 ... 97/7 | `psyche-twenties-aura.md` (flat) | second, after the name chart's associates aura |
| Teenage (upper right) and adult (upper left) auras | Psyche-INT-v1 / Psyche chart-Website | "The Journey Through the Psychic Self" / "The Auras" | 5, 7, 8, 9, 11/2, 12/3, 14/5, 15/6, 16/7, 18/9, 94/4, 95/5 | `psyche-book.md` line 89+ (STEP 3), 219+; `psyche-chart-website-positions.md` | no (showed the name chart's brand aura and module 7 slides) |
| Heart center and heart diamond (`*.heart`, `*.mindDiamond`) | Psyche-INT-v1 | "QUICK OVERVIEW The Heart Diamond" / "STEP 4 The Psychic Centers", cases | 14/5, 15/6, 52/7, 95/5 | `psyche-book.md` lines 115-119, 191 | no (shows the NAME chart's mind center words) |
| Solar plexus center and diamond (`*.solar`, `*.emotionDiamond`) | Psyche-INT-v1 | "SOLAR PLEXUS CENTER (AND SOLAR PLEXUS DIAMOND)" | 9/9, 12/3, 14/5, 15/6 | `psyche-book.md` line 123 | no (name chart's emotion center words) |
| Psychic life expression and its diamond (`*.le`, `*.big`, `*.leDiamond`) | Psyche-INT-v1 | "STEP 2 The Psychic Life Expression" / "THE LIFE EXPRESSION DIAMOND" | 12/3, 23/5, 24/6, 34/7, 35/8, 58/4, 64/1, 72/9, 74/2, 84/4, 97/7 | `psyche-book.md` lines 81, 131, 437 | no |
| Psychic pillar (`*.pillar`) | Psyche-INT-v1 | "STEP 6 The Psychic Pillar", "Comparing Pillars" | 11/2, 12/3, 14/5, 16/7, 18/9 | `psyche-book.md` lines 155, 507-533 | no |
| Psychic spine (`*.spine`) | Psyche-INT-v1 | "STEP 5 The Psychic Spine Number" | 11/2, 12/3, 16/7 | `psyche-book.md` line 147 | no (shows the name chart's spine words) |
| Challenge number (`*.first`) | Psyche-INT-v1 | "Comparing the Challenge Numbers" | 12/3, 15/6, 16/7, 18/9 | `psyche-book.md` lines 473, 579; also `nlm-outer-psyche-challenge-number.md` (HOME rule in meaning.js) | no |

## 3. Name chart (`name.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Name line (`name.first/middle/last`) | Name chart problem areas | "Name Line", bullets per number | 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 99 (numbers in the bullets) | no |
| | NU-Templates-INT-v1 | STEP 1 "Rules for pure name charts" > "Other rules for the name line": pure vs avoided | pure 10/1, 14/5, 15/6, 19/1, 20/2, 21/3, 23/5, 24/6, 25/7, 27/9, 32/5, 33/6, 37/1; avoided 11/2, 12/3, 16/7, 18/9, 29/2 | NOT in the store (`lecture-rules-for-pure-name-charts.md` is the lecture on the same step) | no |
| Mind center main and extra (`name.heart`, `name.heartExtra`) | Name Chart - Mind Centers / Name Chart - Mind and Emotion centers | "MIND CENTER MAIN VIBRATION", "MIND CENTER SUB-VIBRATIONS" | main 3-17, sub 2, 4, 7, 8, 9, 11, 12, 13, 14, 16 | `name-chart-mind-and-emotion-centers.md` ("N - MIND CENTER MAIN VIBRATION > N MV / N SV") | yes |
| | Name chart problem areas | "Mind Center Vibrations" / "MC Sub Vibration X" | 4, 8, 9, 11, 12, 13/4, 16, 17, 18 | `name-chart-problem-areas.md` line 21 | not seen in the probe |
| | Name Numeroscope Guide V2 | "Heart Center" under each compound number, Balanced / Unbalanced | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` (COMBO_SOURCE in meaning.js: all positions in one passage, so held back) | no |
| Emotion center main and extra (`name.solar`, `name.solarExtra`) | Name Chart - Emotional Centers / Mind and Emotion centers | "EMOTION CENTER MAIN VIBRATIONS", "EMOTION CENTER SUB-VIBRATIONS" | main 4-17, sub 3, 5-13 | `name-chart-mind-and-emotion-centers.md` | yes |
| | Name chart problem areas | "Emotional Center" | 4, 8, 9, 11/2, 12, 13, 15/6, 16 | `name-chart-problem-areas.md` line 55 | not seen |
| | Name Numeroscope Guide V2 | "Solar Plexus" under each compound number | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` | no (held back) |
| Auras: public/brand (upper left), friends (upper right), associates (lower left), love (lower right) | Name Chart Life Areas (Auras) | sections 3 Love Life, 4 Friends, 5 Associates, 6 Brand, balanced/unbalanced per number | 1-10, 12/3-18/9 in all four | `name-chart-auras.md` ("Brand Aura: > 12/3 as Brand Aura") | yes |
| | Name Numeroscope Guide V2 | "Aura" under each compound number | 3, 4, 8, 9, 10/1, 12/3, 13/4, 16/7, 17/8, 18/9 | `name-numeroscope-guide-v2.md` | no (held back) |
| | NU-Templates-INT-v1 | Templates 1A-9C, each aura and aura diamond | auras 2-10/1; aura diamonds 15/6, 16/7, 17/8, 25/7, 33/6, 51/6, 52/7, 55/1, 61/7, 77/5, 95/5 | NOT in the store | no |
| Life expression (`name.le`, `name.big`) | Name chart problem areas | "Life Expression" | 4, 8, 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 121 | no |
| | NU-Templates-INT-v1 | "Spine and Life Expression" / Templates 1A-9C | 5, 6, 7, 8, 10/1, 14/5, 15/6, 19/1, 23/5, 24/6, 27/9, 32/5, 37/1 | NOT in the store | no |
| Spine (`name.spine`) | Name Chart - Spines | a heading per spine number | 3, 5, 6, 7, 8, 10/1, 11/2, 12/3, 15/6, 18/9 (the map also lists 13/4, 14/5, 16/7, 17/8; not in the doc) | `name-chart-spines.md` ("12/3 AS SPINE NUMBER") | yes for 12/3; 16/7 is not in the doc |
| | Name chart problem areas | "Spine" | 11/2, 12/3, 16/7, 18/9 | `name-chart-problem-areas.md` line 165 | no |
| Pillar (`name.pillar`) | Name Chart - Pillars | a heading per pillar number | 13/4, 20/2, 21/3, 24/6, 30/3, 32/5, 36/9, 41/5, 42/6, 48/3, 50/5, 54/9, 58/4, 60/6, 63/9, 64/1, 69/6, 70/7, 79 (the map's list 10/1-18/9, 29/2, 34/7, 37/1, 52/7 is NOT what the doc holds) | `name-chart-pillars.md` | not probed with a number the doc has |
| | Personality Chart Problem Areas / Name chart problem areas | "Pillar Numbers" | 11/2, 12/3, 16/7, 18/9, 29/2, 48/3 | `personality-chart-problem-areas.md`, `name-chart-problem-areas.md` | no (29/2 empty) |

## 4. Vocation chart (`vocation.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Little and big heart's desire (`vocation.le`, `vocation.big`) | Vocation Chart Problem Areas | "Little Heart's Desire", "Big Heart's Desire" | 12/3, 16/7; 18/9, 28/1 | `vocation-chart-problem-areas.md` | not seen in the probe |
| | NPE-SubNumeroscopeInterpretation-ver1 | "Heart's Desire Numbers": Superpower / Major Sin | 10/1, 14/5, 15/6, 16/7, 23/5, 27/9, 33/6, 37/1 | `subnumeroscope-interpretation-book.md` ("Number N > Heart's Desire") | yes |
| | NP-Undernumeroscopes power point | "PT AND HD DESIRE NUMBERS" / "WHAT THE NUMBERS SAY" | 1-9 | `powerpoint-undernumeroscopes.md`; `subvibrations-book.md` ("Personality or Hearts desire number N") | yes (subvibrations) |
| Heart diamond (`vocation.mindDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Heart Diamond (Vocation)" per compound number | 33, 37, 39, 47/2, 54/9, 74, 86, 87, 94, 95 | `subnumeroscope-interpretation-book.md` ("Number N > Heart Diamond (Vocation)") | yes |
| | Vocation Chart Problem Areas | "MC Main vibration" / "MC Sub vibration" | 11, 12/3, 18/9 | `vocation-chart-problem-areas.md` | not seen |
| Solar plexus diamond (`vocation.emotionDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Solar Plexus Diamond (Vocation)" per compound number | 29, 33, 41, 49, 54, 63, 64, 79, 87 | `subnumeroscope-interpretation-book.md` ("Number N > Solar Plexus Diamond (Vocation)") | no (29 empty; see gap 3) |
| | Vocation Chart Problem Areas | "Emotion Center" | 8, 9, 15/6, 8 + 15/6, 4-8 (13/4) | `vocation-chart-problem-areas.md` | not seen |
| Auras and middle-name (sub) diamonds | Subnumeroscopes-guide-INT-ver1a | "Vocation chart secondary vibrations", "4-8 between aura and secondary vibrations" | 4, 8, 12/3, 13/4, 15/6, 18/9 | `subvibrations-book.md` ("Aura Scoring – Vocation Chart" line 615, "4–8 Tension Across Centers" line 735) | not probed |
| Pillar (`vocation.pillar`) | Subnumeroscopes-guide-INT-ver1a | "Vocation Chart Pillar", stability scoring | 10/1, 11/2, 12/3, 13/4, 14/5, 16/7, 18/9, 29/2, 48/3 | `subvibrations-book.md` ("Vocation Chart Pillar") | yes |
| Heart / emotion center (`vocation.heart`, `vocation.solar`) (not in the map; the guide has it) | Subnumeroscopes-guide-INT-ver1a | "Vocation Chart Heart Center" scored list | 1-18 | `subvibrations-book.md` line 295 (parsed by `server/subchart-words.js`) | yes |

## 5. Personality chart (`personality.*`)

| Position | Source | Section | Numbers | In the store | Found |
| --- | --- | --- | --- | --- | --- |
| Little and big personality (`personality.le`, `personality.big`) | Personality Chart Problem Areas | "Little Personality" | 11/2, 12/3, 16/7, 18/9 | `personality-chart-problem-areas.md` | not seen |
| | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Numbers", charisma and career archetype | 9, 20, 74, 78 | `subnumeroscope-interpretation-book.md` ("Number N > Personality Numbers") | yes |
| | NP-Undernumeroscopes power point | "WHAT THE NUMBERS SAY" (consonants) | 1-9 | `powerpoint-undernumeroscopes.md`; `subvibrations-book.md` | yes |
| Heart diamond, mental charisma (`personality.mindDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Heart Diamond" | 52/7, 57, 74, 87 | `subnumeroscope-interpretation-book.md` ("Number N > Personality Heart Diamond") | yes |
| | Personality Chart Problem Areas | "MC hard sub vibrations" | 8, 16 | `personality-chart-problem-areas.md` | not seen |
| Solar plexus diamond, emotional charisma (`personality.emotionDiamond`) | NPE-SubNumeroscopeInterpretation-ver1 | "Personality Solar Plexus Diamond" | 18, 34, 57 | `subnumeroscope-interpretation-book.md` | yes |
| Auras and center sub-vibrations | Subnumeroscopes-guide-INT-ver1a | "Aura Scoring - Personality Chart", "Personality chart 4-8 aura reverberation" | 4, 8, 11/2, 12/3, 16/7, 18/9 | `subvibrations-book.md` line 637 | no (upper left 8 empty) |
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
