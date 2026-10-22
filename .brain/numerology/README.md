# Numerology knowledge (Numerologist PRO, Chaldean 5-chart numeroscope)

The owner's course material lives in Google Drive, folder **Hub** (id
`1tqljXvHy1Df082ORj0To1DW5-I9ZXy2t`). A cloud session can read it directly with
the Google Drive connector (`search_files` with `parentId = '<folder id>'`,
`read_file_content` with a file id). Nothing needs attaching or pasting.

This folder is the distilled, app-relevant part. Read these before touching
`public/numeroscope.js` or the Quick chart screen:

| File | What it holds |
| --- | --- |
| `chart-construction.md` | Every formula for the 5 charts, what is confirmed against the paid tool's screenshots, what is not. |
| `positions.md` | What each position means (essence, psyche, name, vocation, personality) in a few lines each. |
| `position-sources.md` | NotebookLM's position-by-position map (2026-10-20): which course document and section describes a number in each spot of the five charts, checked against `knowledge/raw/` and against what the meaning page finds; the seven gaps to fix. |
| `number-balance.md` | Balanced / semi-balanced / unbalanced numbers per position, and the per-number good/bad notes for heart center, solar plexus and auras. This is the basis for coloring numbers. |
| `number-colors.md` | The paid tool's number colors and exact positions, read off 436 vault screenshots; how to redo it. |
| `number-names.md` | The archetype name of every compound number 10 to 99 and the one-line "energy type" of each. |
| `psyche.md` | Inner and outer psyche charts, the "teenage" numbers 10 to 18, the ages each aura covers. |
| `interpretation.md` | How the owner reads a chart: hierarchy of positions, narrative weaving, terminology and number notation. |
| `lingo.md` | The many names for one position (heart center = mind center = HC = MC, ...), and look-alikes that are NOT the same. |
| `yearly-rows.md` | Destiny rhythms and the year row formulas F0-F4, combinations to read in them. |
| `software-tools.md` | Every feature of the paid tool, which the app has, and where each rule was read (Today, Coming days, Number fun, Price tool, Relationship, Karmic). |
| `sources/` | Verbatim copies of the long documents: the class manual on the name chart, aura and center descriptions per number, the 1-9 / 10-45 / 46-99 guides, the main combo guide, number notes, the website's 1-99 descriptions, Facebook questions, all chart videos. Grep these for a specific number in a specific position. |

Drive map (Hub), with ids, for reading more:

- Guides (Google Docs, top level of Hub): `1-9 Guide` 1Vx3kGUb0e8VBl0pnClqTRKbtsGX_7uIrPQv0IPwr3Qc, `10-45 Guide` 1uyxjRczKjO5ZcE0dTgMv2ny2WbLRWHjTjDhLIeMeeAw, `46-99 Guide` 1uUrw-SAHKWzl_iAmQ2laJVcdBEmnM_OdcC8ygXwCIq0, `Main Combo Guide` 11Sl9SGoMfLJaFzTJD2QgwAeVgBCxhNjPYlno65ATPtg, `Combos (number notes)` 1FNANKWK5OyszNn_DLEuRL4EzJwiyCDeGOVBO7K_gAJ8, `Number Notes` 1MTFRjremGdp-cNhrQvswVO3oJTK3POs2pdYCknhrhCQ, `Chart Notes` 1hjFeqm_uBaKSOw2OpJer9JE1FInJ3s0HA-JE1zH5j5o, `SYSTEM PROMPT (New)` 1cRkxTodCCZsnMYWqcgf99TNmCAeRr5B7pajoEYtM4lM, `Name Numeroscope Guide V2` 1yaWaryavxxwOXap8urxvy5aMAo6GgdxYd6xLktHqCvM, `Peoples Numbers` 15HDJm5laIa6kNikR8do-h2ILnpCIv6wdzyuNI_KN7ls.
- `Other Guides` folder 1mWN8aWnHUBpNdYWv-TBGW6oiiq3h9vnl: Guide 1-4, `1-99 Energy Type` 1NRH2QvT-gBDcriRgR9Ye-refuPEpIc3SwtKqeYqDb5k.
- `Scraped Chart Descriptions` 19pfxqb3mKjrwa5e1iZEkkvDju7TEB9_G: subfolders Name Chart (Pillars, Spines, Auras, Problem Areas, Mind and Emotion centers), Numbers, Higher-Self Chart, Psyche Chart, Sub-Charts.
- `Class PDF` 1-iG7iByB1695OAWUNfnU4ciXQjdn3XXI: OCR'd course PDFs. Essence (OCR), Charts, Powerpoints (OCR), Split Number Files, Name Change (OCR); plus the big number PDFs 1-9, 10-45, 46-99.
- `Class Transcripts` 1Suu6EoGgVYYUew__EutPBlZIszh5pxwP: 2026 Essence course, 2025 Essence, Name Change 2025, 1-6, transcripts tarot.
- `Other` 15bFqNkWan-tmMZissRVJ8qlMEAXw1sPy: Written Articles (owner's own notes, incl. `USA Yearly Rows`, `Auras`, `Decades of Life`), Notebook LM (Chart Dynamics, Number, Standard Frameworks, Prompts), Chart meanings, `Website, FaceBook and Course transcripts` (the website position-meaning articles, `Numbers 1-99 Full descriptions (From Website)` 1B4ioZ1-7yI6xGJ85LkRyFywuieu_gXg5C6Znt45qlcI, `Facebook Questions`, `All Chart Videos`), `What is a Name/DOB/Numbers?`.

Owner's own numbers are in `Peoples Numbers` and in test/numeroscope.test.js (Peter, 19 May 1998).

Read 2026-10-21 (the owner's ask "read the course books no chat has read yet"), page by page from the OCR
PDFs, with what each holds for a NUMBER IN A POSITION:
- **The Essence** (EssenceInterpretation-ver1, 66 pp.): what every essence position IS (pp. 19-56: day,
  month, year, life path, outer and inner diamond, dharma line, DV-LP, target), the little life path numbers
  3-27/9 one paragraph each (pp. 27-32), nine dharma lines for January/October births (p. 47). The Essence
  APPENDIX (338 pp.) is the outer diamonds 11-99 (pp. 12-172) and inner diamonds 11-99 (pp. 176-336). Both
  were already in the store (essence-book, essence-codes); they now carry page numbers.
- **The Diamond Method** (108 pp.): a number's OWN diamond (little diamond, big diamond, essence diamond,
  integration diamond), the three emotional codes 3/6/9 (pp. 45-47), the nine integration codes 18/9-99/9
  (pp. 49-66), the numbers 1-9 unpacked (pp. 70-105). The book says the paths are "the different day
  vibrations' paths to integration" (pp. 42-43: 1 → 12/3 → 45/9, ..., 31/4 → 75/3 → 18/9) and may be used for
  life path, month and year too. Nothing about a number in a CHART position; the owner's rule of 2026-10-19
  (a number's own diamond is not a chart's diamond) keeps it off the meaning pages. Open question for the
  owner: show the day vibration's path (p. 43) and its integration code on the day page?
- **The Name Numeroscopes** (178 pp.): the name chart built step by step (pp. 45-61), the sub-charts and what
  their parts mean (pp. 73-90), the interpretation recipe (pp. 93-103, with the balanced/unbalanced lists for
  the name line, centers and auras pp. 102-103), APPENDIX 1 "The numbers in aura and centers" 1-18/9: each
  number as aura, in the heart center and in the solar plexus, balanced and unbalanced (pp. 105-155), APPENDIX 2
  special combinations, money, celebrity, sexuality, dependency, psychic disorders and disease numbers
  (pp. 157-176). Already in the store; now paged. This is THE per-position book for the name chart.
- **Forecasting Numerology** (168 pp.): vortex rhythms, destiny periods per number (pp. 38-46), karmic
  connections, year rows and their formulas F0-F4, the known combinations (pp. 105-115), day rows (pp. 135-137),
  karmic release (pp. 139-141), "when should the customer change name" (pp. 143-147), the name-change year-row
  formulas. No chart-position text; the Plan With Year Rows tool already uses its lists.
- **Name Change**: there is no single book. Name Change (OCR) holds NameChangeMethod5Steps (12 pp.: the five
  steps; p. 4 the sub-chart rules: personality and heart's desire numbers weigh most, 4 8 9 11 13 15 17 are
  acceptable as secondary center vibrations, 12/3 sometimes in auras or as a center main vibration especially
  with day 4, 16/7 and 18/9 avoided), NPE-NameDesign (22 pp.: how to invent a surname or double name, no
  number meanings), NP-NameDesignNameLaw (module 15 slides: name design, pendulums and egregores, the hermetic
  back), NPE-NameLaw (138 pp.: legal name change by country), NPE-NameCleanse (128 pp.: meditation and
  manifestation techniques after a name change; p. 18 "themes you can experience with the different
  vibrations"). None of them describes a number in a chart position. The Class Transcripts folder "Name Change
  2025" holds the Jyotish, year-row cases, name law and rules-for-pure-name-charts lecture notes.
- **Sub-chart Rules lecture** (SUBNUMEROSCOPE RULES - NUMBERS & POSITIONS, read 2026-10-22, `lecture-subnumeroscope-rules`):
  the WHY behind the booklet's rules, position by position: personality number and heart's desire first (balanced
  only), name line second (1-10 and 14 balanced; 13, 15, 17 semi; 11, 12, 16, 18 not, unless it makes a clean center),
  the vocation solar plexus is the first center (10, 2, 3, 5, 14, 6, 7 very good; a 7 wants balanced secondaries),
  the vocation heart second (semi-balanced allowed, 15/6 avoided: "a player"), the personality centers third (4 8 9 13
  15 17 allowed, 11/12 sometimes, 16 never, 18 depending on the person), what makes an 11/2 or 12/3 matters (65 vs
  29/38/47; 66/57 vs 39/48), secondaries lenient (12/3 fine under a balanced main, 16 and 18 not), auras last (all
  but 16; 14, 15, 18 compromises), the pillar any number when the two top positions are balanced, 89 vs 98, sister
  numbers (12 wants 21, 16 → 61, 36/63), and the counterbalance table for an essence heavy in 1s to 5s. Now on the
  sub-chart meaning pages as "When Choosing a Name" points cited by the minute.
- **Name Cleanse lecture** (Name Cleanse Purification 11/2 12/3 13/4 16/7 18/9, read 2026-10-22,
  `lecture-name-cleanse-purification`): the five hardest numbers to cleanse, what each feels like while it cleanses
  and what it becomes (11 boundaries → master teacher; 12 victimization → Jupiter expansion; 13 dissatisfaction →
  innovation; 16 fear of loss → bliss of the 7; 18 control → the spiritual warrior burning karma); all five battle
  the ego. On every meaning page where one of them sits, as the "Name Cleanse" group.
Also paged the same day (separate PDFs exist): the psyche book, psyche cases, psychic disorders, the
interpretation guide, the two sub-chart books, statistics, the templates rules, single name charts, relations.

Read so far (2026-10-14): everything in `Website, FaceBook and Course
transcripts` except the 1-99 descriptions, Facebook Questions and All Chart
Videos; all of Chart Dynamics and Standard Frameworks; Name Chart scrape docs;
the psyche, chakras and undernumeroscope powerpoints; Name-Numeroscope TEXT
(construction steps only); 1-99 Energy Type; All Occult Numbers. Copied into sources/ but not read in full: the number guides, combos, the
website 1-99 descriptions. Not yet read: Jung date correspondence, Class Transcripts (the five course books
above were read 2026-10-21).

## Business PDF's (second Drive folder, owner's rule 2026-10-16)
Folder id 1icGqT828pD6Rxkk5j8jbSiBBDjr6vQaW. The owner: "other good info about business numerology and
related things; the price tool should use it; the two super date PDFs have actual interpretations for the day
forecast and coming days." Files (ids): NPE-YourBusinessAndBrand-v1 1ddm4trQIf4Y2Lb0611ubB-SeHo-HTE8g ·
NPE-SuperdatesCosmicCalendar-v1 1JUZt2sypoJc6ylkDOBD1z5ZkLr2hu00D (12.7 MB) · NU-Superdates-INT-v1
1kwdLhHkLABzh7SS4Cj3AWa1dKR4Wz72S (= Success Codes & Superdates) · NPB-MarketingNumerology-v1
1j6_OMBMKDlIFtdujMkY2nqwcGiV0b2Ws (10.5 MB) · module 12 biz num 15NgqVliiLnx1_0MaJu1Kyed13hz4wAZl ·
NPB-BusinessManual-INT-ver1 1kijLz9JKwg6Mw-obMJqA4i6cgU7fFEoe · NPB-Module8-ProductNumeroscopes
1YdUeMh4WgTao0ryVxqI2hC21mvN_8-6o · NP-ProductNumeroscopes-INT-v1 1UEnRBA7EeyeezvdmWeojfM5k4ektD44G ·
NP-NumbersOverview1-99 1aQqdr6C_dtbQvDYg7lTu7Xn27gcOhCbi · NBE-TheNumbers1-99Business-v1
1nQfokg0P2wlYGm3tzEznlsfA9MuJhrJE · NBE-Module6-Powerpoint 1F3nQWs2C0APJsAWtxSmEfrwXqqpM0T7i ·
NBE-Theme3-NumerologyMarketing-INT 1749fTcJ-w0OAqDoIpfixazz9ZSoQQZkr · folders "Transcripts .MD"
1GfOChrM7LKyRB1di4pybFhQ6d4F5Xtya, "Transcripts (from Johaness)" 1tvkGrr7RvH4qlTPH3uley-erB4aOl-44,
"List of video titles" 14QrTYLvr0P6U8F5_EHUZQWgxAmC-Db2S · BusinessNumerologyCertificationTest.docx.
Text copies live in `knowledge/raw/` (topic `business`).

## Reading PDFs as pictures (2026-10-15)
The Drive connector returns a PDF as text only, and refuses files over 10 MB. Both limits are easy to get past:
1. Find the file: `search_files` (title or fullText). Its id is in the result.
2. Under 10 MB: `download_file_content` → the tool result is saved to a file on disk (base64 JSON); decode it
   with a 5-line script (json → base64 → .pdf). Over 10 MB: the big course books are shared "anyone with the
   link", so `curl -L "https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t"`
   fetches the bytes directly (check `get_file_permissions` first; the owner can share a file by link).
3. `pdftotext -raw book.pdf book.txt`, then grep the text for the word or number wanted. Split on form
   feeds to get page numbers.
4. Render ONLY the pages the hits point at: `pdftoppm -r 70 -png -f N -l N book.pdf out` and Read the PNG.
   A contact sheet (tools in the chat's scratchpad, 28 dpi, 8 per row) is the way to find a software
   screenshot or a chart layout in an unknown book; never render a whole book at reading size.
Big books so far (ids): Forecasting Numerology 1FBZDrmkXyTIPemXx7u_E5YMCGKksDU0c (167 pp.), "Diamonds,
Relations, Stats, Aura Type, Templates and Book" 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT (1361 pp.: Diamond
Method, Relations, the all-in-one course book with the TOOL: boxes), "Essence, Psyche Name and Sub-Charts"
1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK (1471 pp.), Success Codes & Superdates 1kwdLhHkLABzh7SS4Cj3AWa1dKR4Wz72S,
Marketing Numerology 1j6_OMBMKDlIFtdujMkY2nqwcGiV0b2Ws, Diamond Method (also separate) 1a1eWDBqDuKypo8PskSwTWkNzhdm5fJ8J.
The real screens of the paid tool are the "TOOL: … in Numerologist PRO Software" boxes in these books;
the website's pictures are marketing art, not the software.
