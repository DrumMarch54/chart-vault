# Knowledge store: the Hub as text, for AI readings

The owner's course material (Google Drive folder "Hub", plus the "Business PDF's" folder) as plain text,
so a reading can quote the course's own words about each number in each position. Nothing here is a
secret, and nothing is a chart of a private person.

- `raw/*.md`: one file per document (big books are split by chapter into `-part-N` files). Every file
  starts with a 3-line header: `# <Drive title>`, `source: drive <id>` (or `source: .brain/numerology/sources/<file>`),
  `topic: <numbers | positions | combos | psyche | essence | name-chart | sub-charts | method | owner-notes | business>`.
  The text is the course's words: only page numbers, running headers and side labels, contents pages,
  copyright pages, bullet glyphs, line-break hyphens and transcript timestamps were removed.
- `index.json`: built from `raw/` by `node tools/build-knowledge.mjs` (deterministic: same files, same bytes).
  The text cut into passages of 300-2500 characters at headings and paragraphs; each passage has the
  numbers 1-99 it is about (`numbers`), the ones it only mentions (`mentions`), and topics (position
  families: dayVibration, month, year, lifePath, nexus, essenceDiamonds, firstName, middleName, lastName,
  lifeExpression, mindCenter, emotionCenter, auras, loveAura, pillar, spine, psyche, vocation, personality,
  combos, business, general). `htopics` are the topics named in the passage's headings.
- `server/knowledge.js` reads it: `coreText()` (how to read a chart, sent with every reading),
  `contextFor(values, { budgetChars, focus })` (the passages for one chart's numbers, most important
  positions first), `chunksFor(number, topic, limit)`, `knowledgeInfo()`.

## Rebuild

1. Add or replace a file in `raw/` (keep the 3-line header).
2. `node tools/build-knowledge.mjs` (prints passages per source and any number 1-99 with fewer than 3
   passages; `--check` prints without writing).
3. `node --test test/knowledge.test.js`, commit `raw/` and `index.json` together.

How the files were made (2026-10-16): Google Docs exported as Markdown
(`https://docs.google.com/document/d/<id>/export?format=md`), transcripts as text; PDFs fetched with
`https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t` (the files are shared by link)
and turned into text with `pdftotext -raw`; chapter headings were placed from each book's own table of
contents. The scripts and the PDFs stayed in the session's scratchpad, not in the repo.

## Left out, and why

- Pages 1205-1414 of "Essence, Psyche Name and Sub-Charts" (1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK): the
  owner's own personal numerology report (a real person's chart). Pages 1415-1471: the certified
  numerologist's guide (sessions, pricing, marketing for numerologists).
- Separate PDFs that are page-for-page copies of a part already in: Essence interpretation
  1n3zBVvc4nFuUo1W1qFW0w3cLlW4PNinI, Psyche INT 18nSHwG5WP0w73XD_O5aYugmku0XNXfEM, Psyche cases
  1tPqOa38lcEYvB7Y4owhkUmG1R419iuS0, Psyche disorders 1lNgcVPT61fCOmLrLBLJF76bqZi3hSjSP, Subnumeroscopes guide
  1aB7oUwcLW80WY318P2aEUS9U4-T9ouoK, Subnumeroscope interpretation 1gswBh71qSECHymhX_TQz7ER_EDhbKFHt,
  Interpretation guide 1ML44LaRAPdlaSJLzPO1piRM6nHJ2kSAH, Powerpoint psyche 17Nn4yjXyRS_OecOC5lkzUCPXvJjpxobL and
  Powerpoint 2026 psyche interpretation 1nIgSByjv4eB7XxD_CRNij3hawHEhP08W (= Module 7 slides), Number quadrant
  1l7OmvxSF8ORT-rvxNDJvLzh6_RcU4KWm (= the Numberquadrant chapter of the 10-45 book).
- From "Diamonds, Relations, Stats, Aura Type, Templates and Book" (1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT):
  its Diamond Method part (pages 1-107, the same book as `diamond-method.md`), the name templates (pages
  439-607: lists of clean name charts, construction only) and Part 4 Business of the 6-themes book
  (85% the same as the business books already in).
- Inside the books: software how-to sections (Number Fun Tool, Using the Subnumeroscope Tool, "TOOL:" boxes),
  exercises, source lists, the retrograde date table (Superdates Cosmic Calendar appendix D).
- Business PDF's folder: "List of video titles" and BusinessNumerologyCertificationTest.docx (by rule). The
  7 transcripts in "Transcripts (from Johaness)" (NBE-M6 Intro, Numbers, Q&A, Superdates Intro / Outro /
  Exploring the Day / Astrology Overlay) are other transcriptions of the same lectures as the "Transcripts .MD"
  files, which are in. Of "Transcripts .MD", 11 files were second exports of the same lecture; one copy is in.
- "Peoples Numbers" (the owner's own numbers) is not included.
- Nothing failed to read: every Google Doc exported and every PDF had a text layer.

Business color codes: in `biz-the-numbers-1-99-business.md` each number carries the book's color code
(green, black, orange, red, read from the PDF's colors; the book's dark blue is its "black"). 93-99 have no
color in the book.

## Files

| File | Title | Source | Size | Topic |
| --- | --- | --- | --- | --- |
| `all-chart-videos.md` | All Chart Videos | .brain/numerology/sources/all-chart-videos.md | 111 KB | method |
| `article-archetypal-story-1-9.md` | Archetypal story 1-9 | drive 11ImTqUSFws-Z2IBDilhbBTsk_YdKxZPsfR3hWSccBh0 | 3 KB | numbers |
| `article-asset-vs-liability.md` | Asset vs Liability | drive 1wGmJ3kpdMrlGN-VgHwTZ_ZclFrmHSvWLGNitPcfbR3g | 1 KB | method |
| `article-auras.md` | Auras | drive 1zMVyT-cCTJPfAzn_aMMTIybEA-MIacAH-9vGJV0NmoA | 11 KB | method |
| `article-decades-of-life.md` | Decades of Life | drive 1G_yycm3imORKx8_kydbQg5WN6q4lZJSvXDGKXg-GxO4 | 9 KB | psyche |
| `article-dharma-lp-day.md` | Dharma, LP, Day | drive 1uuwwd-u3h75k7y6iS4wLF37kXljs7if27UY-GB855gM | 2 KB | essence |
| `article-numeroscope-dynamics.md` | Numeroscope Dynamics | drive 1Yhy_mwBMXeWgp8-PKAP4SntMYqEH2sHLsFoNyEy3Cgc | 1 KB | method |
| `article-occult-numbers.md` | Occult Numbers | drive 1uu7ie-XMF4prnkPeeDp2muDlSjuxLFnjcfXdWCFN-3Y | 2 KB | numbers |
| `article-psyche-le.md` | Psyche LE | drive 1DYIow5YNB8fay1a6Ku_GNYW8bvj9A-eh5l3eIa_gwd0 | 1 KB | psyche |
| `biz-business-manual.md` | NPB-BusinessManual-INT-ver1 (Business Manual) | drive 1kijLz9JKwg6Mw-obMJqA4i6cgU7fFEoe | 28 KB | business |
| `biz-marketing-numerology.md` | NPB-MarketingNumerology-v1 (Marketing Numerology) | drive 1j6_OMBMKDlIFtdujMkY2nqwcGiV0b2Ws | 54 KB | business |
| `biz-module-12.md` | module 12 biz num (Business Numerology module 12) | drive 15NgqVliiLnx1_0MaJu1Kyed13hz4wAZl | 10 KB | business |
| `biz-module-6-powerpoint.md` | NBE-Module6-Powerpoint | drive 1F3nQWs2C0APJsAWtxSmEfrwXqqpM0T7i | 6 KB | business |
| `biz-module-8-product-numeroscopes.md` | NPB-Module8-ProductNumeroscopes | drive 1YdUeMh4WgTao0ryVxqI2hC21mvN_8-6o | 1 KB | business |
| `biz-numbers-overview-1-99.md` | NP-NumbersOverview1-99 (Numbers Overview 1-99) | drive 1aQqdr6C_dtbQvDYg7lTu7Xn27gcOhCbi | 42 KB | business |
| `biz-product-numeroscopes-int.md` | NP-ProductNumeroscopes-INT-v1 (Product Numeroscopes) | drive 1UEnRBA7EeyeezvdmWeojfM5k4ektD44G | 23 KB | business |
| `biz-superdates-cosmic-calendar.md` | NPE-SuperdatesCosmicCalendar-v1 (Superdates Cosmic Calendar) | drive 1JUZt2sypoJc6ylkDOBD1z5ZkLr2hu00D | 340 KB | business |
| `biz-superdates-int.md` | NU-Superdates-INT-v1 (Success Codes & Superdates) | drive 1kwdLhHkLABzh7SS4Cj3AWa1dKR4Wz72S | 279 KB | business |
| `biz-the-numbers-1-99-business.md` | NBE-TheNumbers1-99Business-v1 (The Numbers 10-99 in Business) | drive 1nQfokg0P2wlYGm3tzEznlsfA9MuJhrJE | 32 KB | business |
| `biz-theme-3-numerology-marketing.md` | NBE-Theme3-NumerologyMarketing-INT (Theme 3: Numerology Marketing) | drive 1749fTcJ-w0OAqDoIpfixazz9ZSoQQZkr | 4 KB | business |
| `biz-transcript-business-numerology-numeroscopes.md` | Business numerology numeroscopes (Business course transcript) | drive 12yHFxdnKCRv3-EV23TW_3Ls2a8o3gboE9Dt5mIT3ZCw | 79 KB | business |
| `biz-transcript-case-barbora-finding-your-life-mission.md` | Case: Barbora, finding your life mission (Business course transcript) | drive 1Fk_8l8AQMITtd6HDrCnqZvKBpZshIwdXJF2UJsJJLXA | 40 KB | business |
| `biz-transcript-case-barbora.md` | Case: Barbora (Business course transcript) | drive 11FQhLAwexPOK17PPGYinBw5aBE9BOoC3tYd1emTpsbg | 23 KB | business |
| `biz-transcript-case-gabriella-1.md` | Case: Gabriella (1) (Business course transcript) | drive 1U8ZYkvenPUuN75tvHbyw-q6oKE3RwKRysNQf4soynnc | 15 KB | business |
| `biz-transcript-case-gabriella-2.md` | Case: Gabriella (2) (Business course transcript) | drive 15LdXx-_4I1pdFcnSNZKq2fzHaFtfE5X9mp8iU-1vGzo | 6 KB | business |
| `biz-transcript-case-maki.md` | Case: Maki (Business course transcript) | drive 1yVCFxuRTmSXyt9glPnaF0PjGElUsUlTE9dWsvqeJ7K8 | 28 KB | business |
| `biz-transcript-case-maria-1.md` | Case: Maria (1) (Business course transcript) | drive 1exM9O9agEpLj-3A1GKMyC3014Oo6HzRyE7iGzvKU7vU | 19 KB | business |
| `biz-transcript-case-maria-2.md` | Case: Maria (2) (Business course transcript) | drive 1J3QI5mKNXo-GARtE7YeDSCVKQdXJ-70xZcSZo9dpSbU | 20 KB | business |
| `biz-transcript-case-maria-address-brand-domain.md` | Case: Maria, address, brand, domain (Business course transcript) | drive 1QNgj5p6MxrBuf_sSjsExKXG_70Ckf7RrN2c_cKsk1Io | 17 KB | business |
| `biz-transcript-case-maria-soul-connection.md` | Case: Maria, soul connection (Business course transcript) | drive 1Aeh0q_6juKEslfuQLSfjEPhHVjWsFiJIob5mCDSchnI | 24 KB | business |
| `biz-transcript-case-niki.md` | Case: Niki (Business course transcript) | drive 1wTXPRRUrbnDBOFldoMPWQ3CacSFxzHLErGlffFxtLis | 27 KB | business |
| `biz-transcript-case-quantum-individuation.md` | Case: quantum individuation (Business course transcript) | drive 1CgLvh1en5znAI_lO7LZe_Dd-zqm0jCW7K13XwOxPaXk | 52 KB | business |
| `biz-transcript-case-zorayana-1.md` | Case: Zorayana (1) (Business course transcript) | drive 171FmU7ZwiW7wzg9bndqHA_e6SCpxZHGDMVMuGyKiYqM | 10 KB | business |
| `biz-transcript-case-zorayana-2.md` | Case: Zorayana (2) (Business course transcript) | drive 1J6nYEyTLC0O9Q3K3MMFk20w86bXJ_VuM3I-P1xAW08s | 7 KB | business |
| `biz-transcript-case-zorayana-living-soul-energetic.md` | Case: Zorayana, living soul energetic (Business course transcript) | drive 1NaobPyLZU46-QAKQVHZiIUQhd3b3M_oW09hBb-aPiHM | 8 KB | business |
| `biz-transcript-celebrity-brands.md` | Celebrity brands (Business course transcript) | drive 1vLthhPL4CFfCZqrAkQ8o4L0fIuk9cBz3xmAnMPQwd5Y | 37 KB | business |
| `biz-transcript-concluding-remarks.md` | Concluding remarks (Business course transcript) | drive 1GyWU3oTqV5XQUMN1QuabRGyotJB3AbCedHdzyUm_jSk | 9 KB | business |
| `biz-transcript-cosmology.md` | Cosmology (Business course transcript) | drive 1KlyFPzuFvh_lgkUPgRMHDHhWybrZl7yb1QbESqfOvI0 | 22 KB | business |
| `biz-transcript-domain-names.md` | Domain names (Business course transcript) | drive 10LBqu9hX8ji1d8Xl2BZit7MeBy5-W1g-qItO2nNFUug | 18 KB | business |
| `biz-transcript-exploring-the-days-energy-astrology-tool.md` | Exploring the day's energy: astrology, new astrology tool (Business course transcript) | drive 1nJEuq1P_Gfa-ta13VcgByFkKaXzChQFdnLbdjFKYJD4 | 8 KB | business |
| `biz-transcript-exploring-the-days-energy-day-tool.md` | Exploring the day's energy: new day bizz tool with AI (Business course transcript) | drive 1rvm2KY_HJTlkF7mSuvMxv_upAoW48_IE4OBmrzdpCRU | 27 KB | business |
| `biz-transcript-final-questions.md` | Final questions (Business course transcript) | drive 1YzyjuqJrD0lQ6rZq93JQoB2ZxhCRYPQhmdojf-Majyw | 9 KB | business |
| `biz-transcript-hierarchy.md` | Hierarchy (Business course transcript) | drive 1QSL7rlzgnN9_-OHjFsZTzPJALAS-z3_F5h7eJb50XrI | 6 KB | business |
| `biz-transcript-house-numbers.md` | House numbers (Business course transcript) | drive 1IYBdpBFwu9gem4-YHnGNDCNBgoRo1XiK8pYxpR5-kdo | 61 KB | business |
| `biz-transcript-intro-1.md` | Intro (1) (Business course transcript) | drive 1vreDZYbTdk0-htUdfiek1r1XCctIeqUAGeZe6VW7Yug | 8 KB | business |
| `biz-transcript-intro.md` | Intro (Business course transcript) | drive 1sfIQRHC6W3DTpw88ZBUYyfIHiMlN6-uRjM7t8y27oAo | 15 KB | business |
| `biz-transcript-numbers.md` | Numbers (Business course transcript) | drive 15czl5d4VLePca_NRnmWyFkppq67crAu5Zkv5ODm9vP4 | 68 KB | business |
| `biz-transcript-outro.md` | Outro (Business course transcript) | drive 1d2j08AZicG7sIRCynkT-bS8eIboPdUXUcuXwcvmDpwQ | 9 KB | business |
| `biz-transcript-prices.md` | Prices (Business course transcript) | drive 1lG2acQy-xySwwL8tv-mMBB7kUM1KEG1B1SjC_7vHwPg | 14 KB | business |
| `biz-transcript-product-names.md` | Product names (Business course transcript) | drive 1woMn-_oSCEAWAx4ig_Qtlgn70c5bodi2S06weBn1jFU | 13 KB | business |
| `biz-transcript-q-and-a.md` | Q and A (Business course transcript) | drive 1mLLWquCmy42YEice_BiCaCWsSEJKXLo1cFBUbwlRdPE | 27 KB | business |
| `biz-transcript-quantum-evolution-of-a-brand.md` | Quantum evolution of a brand (Business course transcript) | drive 1YjDtaHaLyfn9Hgl1PfKiIN_AveK9JDaiJm4E7s7eJ1k | 11 KB | business |
| `biz-transcript-step-1-primary-archetype.md` | Step 1 primary archetype (Business course transcript) | drive 1IiAFBmhoDlH7TV0T2xDhOvyVF5VEVj8WMtK0NccIpyg | 10 KB | business |
| `biz-transcript-step-2-soul-mission.md` | Step 2 soul mission (Business course transcript) | drive 1IDLzWRDN-wXCwj5cue4uWy6LpvzHISONMMNHgG1GShw | 4 KB | business |
| `biz-transcript-step-3-facet-to-brand-mapping.md` | Step 3 facet to brand mapping (Business course transcript) | drive 1hApACRG-BYMC9PFFmoJesZJQHaIWj-ZxORNzB3RzMhk | 6 KB | business |
| `biz-transcript-step-4-storyline.md` | Step 4 storyline (Business course transcript) | drive 11EzKhzXTyQ8xlsKnUsLgZXAUf5u0kgVdNMLRxFqz36E | 10 KB | business |
| `biz-transcript-superdates-intro.md` | Superdates intro (Business course transcript) | drive 13OMik1ND8MtFs4fTRNUVJxfWfPBbTcpPes7NjJqP4Lg | 19 KB | business |
| `biz-transcript-superdates-outro.md` | Superdates outro (Business course transcript) | drive 1zeKJuUh0qKif-rFGErxRfXy5-WZjJy2JqLopxXTATPA | 19 KB | business |
| `biz-transcript-telephone-numbers.md` | Telephone numbers (Business course transcript) | drive 11AGJd74r0xsnDYzXBqaZT6CjKB-O_NfF4Zcs78YIRoA | 24 KB | business |
| `biz-transcript-the-numeroscope.md` | The numeroscope (Business course transcript) | drive 1ljJqhIo4W_8qiMHeg4bEsHWez_FFLu8a65cIxeAl2yo | 30 KB | business |
| `biz-transcript-two-methods-of-naming-products.md` | Two methods of naming products (Business course transcript) | drive 1-2nHytN4Z0Zhp6hfYiXaZM3gkytQ5Kkn14jhTPnhrBU | 30 KB | business |
| `biz-your-business-and-brand.md` | NPE-YourBusinessAndBrand-v1 (Your Business and Brand) | drive 1ddm4trQIf4Y2Lb0611ubB-SeHo-HTE8g | 70 KB | business |
| `book-1-9.md` | Foundational Guide to Number Descriptions: The Numbers 1-9 (course book) | drive 1DRg_NCqN3FQF3a0YvAozJCQ97mM_8tzF | 298 KB | numbers |
| `book-10-45.md` | Foundational Guide to Number Descriptions: The Numbers 10-45 (course book) | drive 1Hk9apBmcJGgSwiZA7TNTSYrTTsXnIqf2 | 381 KB | numbers |
| `book-46-99-part-1.md` | Foundational Guide to Number Descriptions: The Numbers 46-99 (course book), part 1 of 3 | drive 1HbrNZXj1zgD8Kh2Uu7lLvAF6SPADJk9f, 1AaQVLd7L_ikIvGrp1UZfabrVIrSBbAmw | 374 KB | numbers |
| `book-46-99-part-2.md` | Foundational Guide to Number Descriptions: The Numbers 46-99 (course book), part 2 of 3 | drive 1HbrNZXj1zgD8Kh2Uu7lLvAF6SPADJk9f, 1AaQVLd7L_ikIvGrp1UZfabrVIrSBbAmw | 391 KB | numbers |
| `book-46-99-part-3.md` | Foundational Guide to Number Descriptions: The Numbers 46-99 (course book), part 3 of 3 | drive 1HbrNZXj1zgD8Kh2Uu7lLvAF6SPADJk9f, 1AaQVLd7L_ikIvGrp1UZfabrVIrSBbAmw | 352 KB | numbers |
| `chart-notes.md` | Chart Notes | drive 1hjFeqm_uBaKSOw2OpJer9JE1FInJ3s0HA-JE1zH5j5o | 43 KB | owner-notes |
| `combos-number-notes.md` | Combos (number notes) | drive 1FNANKWK5OyszNn_DLEuRL4EzJwiyCDeGOVBO7K_gAJ8 | 10 KB | combos |
| `cosmic-laws-of-chart.md` | Cosmic laws of chart (Numeroscope Structure) | drive 1J8o5FdXtg__o97-MgFSWvDiJYLO7su_yeWJVtRI385w | 3 KB | method |
| `diamond-method.md` | The Diamond Method (course book) | drive 1a1eWDBqDuKypo8PskSwTWkNzhdm5fJ8J | 106 KB | method |
| `energy-type-1-99.md` | 1-99 Energy Type | drive 1NRH2QvT-gBDcriRgR9Ye-refuPEpIc3SwtKqeYqDb5k | 15 KB | numbers |
| `essence-book.md` | The Essence: Guide to interpreting your birthdate (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 57 KB | essence |
| `essence-codes-part-1.md` | The Essence: The Codes for Interpreting the Numbers (course book; in "Essence, Psyche Name and Sub-Charts"), part 1 of 2 | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 313 KB | essence |
| `essence-codes-part-2.md` | The Essence: The Codes for Interpreting the Numbers (course book; in "Essence, Psyche Name and Sub-Charts"), part 2 of 2 | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 309 KB | essence |
| `facebook-questions.md` | Facebook Questions | .brain/numerology/sources/facebook-questions.md | 59 KB | method |
| `forecasting-book.md` | Forecasting Numerology (course book) | drive 1FBZDrmkXyTIPemXx7u_E5YMCGKksDU0c | 127 KB | method |
| `framework-1-0.md` | Framework (1.0) | drive 1XWckbWbgdoUiIIhwahF93Dx-HSSy0LnT7ONOAh_bPBQ | 14 KB | method |
| `framework-day.md` | Day (Standard Frameworks) | drive 1Z52ZPKVxGGoPtBi9obvGMpQhCafI8i0i6wuWG0Hm6X8 | 10 KB | essence |
| `framework-dharma-diamond.md` | Dharma Diamond (Standard Frameworks) | drive 1dmwQ-ofR8UYchenX-fDB9YiYQm77ETAltFMkHFdwgPg | 11 KB | essence |
| `framework-diamonds.md` | Diamonds Framework | drive 1T0ZWVpg6VnQCIJanYL17daAwLCXBau2leOixGqLh0hc | 19 KB | method |
| `framework-higher-self.md` | Higher-Self Framework | drive 1xMM34OHHo0aoJTcPVkxTTuhHhTSXw4KU207bZNfXLH8 | 17 KB | essence |
| `framework-life-path.md` | Life Path (Standard Frameworks) | drive 1RGkT8EZEKB75a-TnnA4AyQk4mGAXXnpRe5n1Ri9HlXM | 25 KB | essence |
| `framework-month.md` | Month (Standard Frameworks) | drive 1Gs5kvoynf4IEnRLm7JmF1ysvAb8ewnT8onNKcx9aigM | 10 KB | essence |
| `framework-name-chart.md` | Name Chart Framework | drive 1uNe2cgylBRfUSsmwli0jZAiH4F3wDvfqBD1JspwLO-I | 15 KB | name-chart |
| `framework-vocation-and-personality.md` | Vocation and Personality Charts (Standard Frameworks) | drive 1blKyf3JWlURHO3O_7FPB35ZQ-e9cRc9OKmeZHIbjtSY | 34 KB | sub-charts |
| `framework-year.md` | Year (Standard Frameworks) | drive 1ujrNWpGL1ryuFP58vTmZYzvnfdf0njpACW7v-ydw1YM | 13 KB | essence |
| `guide-1-9.md` | 1-9 Guide | .brain/numerology/sources/guide-1-9.md | 74 KB | numbers |
| `guide-10-45.md` | 10-45 Guide | .brain/numerology/sources/guide-10-45.md | 139 KB | numbers |
| `guide-46-99.md` | 46-99 Guide | .brain/numerology/sources/guide-46-99.md | 247 KB | numbers |
| `higher-self-dharma-fusion.md` | Higher Self - Dharma fusion (Upper aura) | drive 1n3r4mvcEmEmrcp_p8avQe6U81vIPScoTKVL_hMzaRnM | 6 KB | essence |
| `higher-self-month-positions.md` | Higher Self Chart - Month Positions | drive 1r_7XZcxda6B3ExiJMjkx_4Ozftj6IBKMDMluoPw8r6M | 11 KB | essence |
| `higher-self-website-positions.md` | The Higher Self-Website (Position Meanings) | drive 1VOrGyB8qFfWcATez4mVmJHLjtg6UQTKVgOjR79COdPM | 16 KB | positions |
| `humanity-archetyping-book.md` | The Humanity Archetyping System (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book") | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 114 KB | numbers |
| `important-notes-for-ai.md` | Important Notes For A.I. | drive 1TYg1oWTbxjFk7h1wnl5WvCDuT9NPUfZ3QLy0GjQ6fW0 | 2 KB | owner-notes |
| `interpretation-guide.md` | Interpretation Guide (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 8 KB | method |
| `jung-date-correspondence.md` | Jung Date correspondence | drive 11AdG68sZfmLPGCBlHTVc7UR5LwBQwJvmOOr3EgwftQ4 | 18 KB | method |
| `karmic-connections-book.md` | Karmic Connections: Life Lessons and Learning in Relationships (book) | drive 1K0Jneuu1f35aYcixYwWxW9KuIV-fhQSI | 30 KB | method |
| `lecture-2026-intro.md` | 2026 Essence course INTRO (lecture transcript) | drive 17SAZM_X_v6-3AXPgXHCTWJPp06LpFD90YOIUjBUTXPc | 46 KB | essence |
| `lecture-2026-part-1-theory.md` | 2026 Essence course PART 1 - THEORY (lecture transcript) | drive 188RJqUOX9C9ks3-xMESCgxaiNFp3QxoxYfORd2tDpw4 | 58 KB | essence |
| `lecture-2026-part-2-diamonds-and-pyramids.md` | 2026 Essence course PART 2 - YOUR DIAMONDS AND PYRAMIDS (lecture transcript) | drive 1ZikjDyr81X0Q3AnVIzuXcvaZZ0l2lm_FQEQ5Jx7R33o | 185 KB | essence |
| `lecture-cases-diana-kahlo-mandela.md` | CASES: Lady Diana, Frida Kahlo, Nelson Mandela (lecture transcript) | drive 1aIBN3MBxXUo9Kfbd5lUrTfRcFQASZ1i_jp4JSLTeLHA | 54 KB | method |
| `lecture-diamond-unpacked.md` | PART 1 - THE DIAMOND UNPACKED: Essence codes, Integration codes (lecture transcript) | drive 1V4m0GORdJroweN0eX8Mem3zvsn9XZ5jVCo7Kk6gdV3g | 51 KB | essence |
| `lecture-interpretations-of-your-psyche.md` | INTERPRETATIONS OF YOUR PSYCHE CHARTS (lecture transcript) | drive 1SvuUlZJR6RCkcZzNIN2FV_pW0l0IcbMyBlMM6Qvm_Bw | 192 KB | psyche |
| `lecture-journey-of-the-soul.md` | JOURNEY OF THE SOUL (lecture transcript) | drive 1UD0l50sBBpaLN9AjIqtYl6X0ARdBYPU2w1EI3S22PZ0 | 39 KB | essence |
| `lecture-life-path-diamonds.md` | PART 2 - YOUR LIFE PATH DIAMONDS (lecture transcript) | drive 1qMw4emJ9v-tSBOu_qAG2uCX_RIG4f94SIL_a0uy_4d0 | 129 KB | essence |
| `lecture-name-chart-interpretations-pt1.md` | NAME CHART INTERPRETATIONS CONTINUED (PT 1) (lecture transcript) | drive 1_GRlNU_BO2u1u67oIFIphXKPlD-BTK0NLS3vIp98Ph8 | 88 KB | name-chart |
| `lecture-name-cleanse-purification.md` | Name Cleanse Purification 11/2 12/3 13/4 16/7 18/9 (lecture transcript) | drive 1V2RYGmdBGjp4bguib0QB_w_z5VuF4qDrAaq8ylktZYU | 12 KB | method |
| `lecture-name-chart-interpretations-pt2.md` | NAME CHART INTERPRETATIONS CONTINUED (PT 2) (lecture transcript) | drive 1ErX8NaHbMyyUqhIm8OptgFyKib0bfg_9znkArLt0WzA | 103 KB | name-chart |
| `lecture-numbers-1-9-diamonds.md` | THE NUMBERS 1-9 DIAMONDS AND VIBRATIONS (lecture transcript) | drive 1O_ET5T1f8K2uy03z1EhclG2iZW64zhTnNPNxJgwOVcA | 72 KB | essence |
| `lecture-subnumeroscope-rules.md` | SUBNUMEROSCOPE RULES - NUMBERS & POSITIONS (lecture transcript) | drive 1dpPbMVg4kDBQHuCNvQIRCYPYciAxCCYy_T7gQtx9io4 | 38 KB | sub-charts |
| `lecture-positions-in-the-essence-chart.md` | POSITIONS IN THE ESSENCE CHART (lecture transcript) | drive 1SjDkr7ZoiRXTJLtxXoUso-pO8z-31u3tUAKosWYP-bs | 37 KB | essence |
| `lecture-psyche-interpretation.md` | PSYCHE INTERPRETATION (lecture transcript) | drive 1Rg8OBPNgUXJKlztcva5i19L79bEDFXfr0jJYZWtXfIU | 33 KB | psyche |
| `lecture-psyche-intro.md` | PSYCHE INTRO (lecture transcript) | drive 1hBcCgtGazppQhn9TtzAIzJ5ZiFtzI4SMEun24hU09ok | 55 KB | psyche |
| `lecture-psychic-disorders.md` | PSYCHIC DISORDERS (lecture transcript) | drive 1EyVDrdzGg47m6KAoBBxWZQn722ufhi94ZdLaSKoY6bQ | 64 KB | psyche |
| `lecture-relationship-between-numbers.md` | THE RELATIONSHIP BETWEEN NUMBERS (lecture transcript) | drive 1CI5TgYoZiTqltfJC7Mu1qR09W7-DeWOkW-kQO67DGD8 | 31 KB | combos |
| `lecture-rules-for-pure-name-charts.md` | STEP 1: RULES FOR PURE NAME CHARTS (lecture transcript) | drive 1wLcTjFLPRFjZMTM8kvFZH_NrdqxeOtytdZBUucNRyz8 | 101 KB | name-chart |
| `lecture-the-number-1.md` | THE NUMBER 1 (lecture transcript) | drive 1iRNodPNEVTQwBR9nZw0-04M4ZjJzpqdzDK_5s6x48JM | 33 KB | numbers |
| `lecture-the-number-2.md` | THE NUMBER 2 (lecture transcript) | drive 1u8ZAxTNPNppXNIdtg7wULq_2x4pI5lATbskt6I-hdEU | 28 KB | numbers |
| `lecture-the-number-3.md` | THE NUMBER 3 (lecture transcript) | drive 1_im6qE0o98LWJk8qiTiMR5OANWCrhX_NCl7Q3BoF9r0 | 29 KB | numbers |
| `lecture-the-number-4.md` | THE NUMBER 4 (lecture transcript) | drive 173EDbVYukcyQH0W0cda85Slay4-vjtCmt_aKjO988ZU | 31 KB | numbers |
| `lecture-the-number-5.md` | THE NUMBER 5 (lecture transcript) | drive 1Fjiiqqdk0fThn-ycvA05f666wkw--zYCHa2AA-427aM | 35 KB | numbers |
| `lecture-the-number-6.md` | THE NUMBER 6 (lecture transcript) | drive 1xMaXBu3CfP5SKzNlPMtQvfDWKwp_S9p82nWLuApp_iM | 26 KB | numbers |
| `lecture-vocation-chart-choice-desire-will.md` | THE VOCATION CHART - CHOICE - DESIRE - WILL (lecture transcript) | drive 1sRiO5zMHchGdAz6DfGyh6VvEiabK-Q7H6OtJqhF_18Q | 10 KB | sub-charts |
| `lecture-vowels.md` | VOWELS (lecture transcript) | drive 1x9W6GXp1iZJ6G5GwK3UcqDrSfj2mFuD8dnOR5v6Xgfc | 7 KB | sub-charts |
| `lecture-your-charts.md` | YOUR CHARTS (lecture transcript) | drive 1zoFiA1y62fd2DV4Mll2E3RnGZIeGmZIwO0K-cRWX4v4 | 96 KB | method |
| `main-combo-guide.md` | Main Combo Guide | .brain/numerology/sources/main-combo-guide.md | 77 KB | combos |
| `name-chart-auras.md` | Name Chart - Auras | .brain/numerology/sources/name-chart-auras.md | 89 KB | name-chart |
| `name-chart-mind-and-emotion-centers.md` | Name Chart - Mind and Emotion centers | .brain/numerology/sources/name-chart-mind-and-emotion-centers.md | 92 KB | name-chart |
| `name-chart-pillars.md` | Name Chart - Pillars | drive 1DekWtZ1mB9tcqGzClCId8KQXTW1SnFGN2xJMACM_k6M | 20 KB | name-chart |
| `name-chart-problem-areas.md` | Name Chart - Problem Areas | drive 1GDT0icNJqGXZbs-yJZEQCFGgb_Qj_rF9Cu-VR634cCQ | 12 KB | name-chart |
| `name-chart-spines.md` | Name Chart - Spines | drive 1ZgYI1bsD9x_641nJHWuANLVShzcX602EcUTdCK_wfvE | 8 KB | name-chart |
| `name-templates-rules.md` | Name Templates: STEP 1 Rules for pure name charts (from NU-Templates-INT-v1, pages 15-23) | drive 1WZ346PA2iu2bsBK4Ce1uLvlbPtjZO3e0 | 9 KB | name-chart |
| `name-chart-website-positions.md` | Name Chart-website (Position Meanings) | drive 17S6bfNmp2HP3CvIBJtMFPxYSV73sVtl-WOdK2ovCbm8 | 11 KB | positions |
| `name-numeroscope-guide-v2.md` | Name Numeroscope Guide V2 | drive 1yaWaryavxxwOXap8urxvy5aMAo6GgdxYd6xLktHqCvM | 5 KB | name-chart |
| `name-numeroscope-text.md` | Name-Numeroscope TEXT | .brain/numerology/sources/name-numeroscope-text.md | 163 KB | name-chart |
| `name-numeroscopes-book.md` | The Name Numeroscopes (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 159 KB | name-chart |
| `nlm-1-9-philosophical.md` | 1-9 Philosofical | drive 1J6QP1VdrI9Da5Iyb6GLWQiWKzrhMxfl05MvuOvgjMxQ | 9 KB | numbers |
| `nlm-15-6-vs-13-4.md` | 15/6 vs 13/4 Candy vs. Lime | drive 11SmrgVYk23mQAaGe51vqZlJ57GsTHD5NlY20Cr3-7pQ | 3 KB | numbers |
| `nlm-16-7-vs-13-4.md` | 16/7 vs 13/4 | drive 1Pr9FDKbZIOjGOlxluH3jw08SjF0biXdN0kZbx-kl1Dw | 4 KB | numbers |
| `nlm-25-26-higher-self-extraction.md` | (!) 25/26 higher self extraction | drive 11P_87jPjr27VqslXs1UXOVAmcTmUz8Uoucssrux0Iuc | 5 KB | essence |
| `nlm-25-26-psyche.md` | 25/26 psyche | drive 1JLAz6v-EJgpON57PcbZe44hsRlJomMqHNaTfZP6hQ8U | 5 KB | psyche |
| `nlm-4-in-solar-plexus.md` | 4 In the solar plexus center | drive 1xTNekXFf88mCHqt8XAYNTxTlu-6F17fmldkoLVmZKX0 | 5 KB | name-chart |
| `nlm-69-6-outer-psyche-le-diamond.md` | 69/6 Outer psyche Life expression diamond | drive 1_kzjEyW0gNCMEGmhZOZscx_EPAcuSGr9GAxxoa2GuBU | 5 KB | psyche |
| `nlm-71-8-outer-mental-strategies.md` | 71/8 Outer mental stratagies | drive 1ePgrwpQCkEDRaUkuoGYsLTuC1hyYuwCpswS74dWSfYI | 6 KB | psyche |
| `nlm-72-9-integration.md` | 72/9 Integration "Study Intensely" | drive 1zfBUDwUi7bn6oFH0TBX-YnOfIZ0zGaNG3PPRY2nLNQs | 3 KB | numbers |
| `nlm-9-and-15-6.md` | 9 and 15/6 | drive 1aNFt0eb3VA81fRL0E6j6lVUJ0HiBwVzXg9r0U8YbPrk | 8 KB | numbers |
| `nlm-alchemy-higher-self.md` | Alchemy Higher-Self | drive 1yef0yJizmzvRyStT0PzSUObDzV9uxai3Xmqe97bAOwY | 3 KB | essence |
| `nlm-all-occult-numbers.md` | All Occult Numbers | drive 1kEiaVAmntJUZpUSmZTuGcyMKsq4Q0wiFQVBAGQNEmSg | 5 KB | numbers |
| `nlm-charts-only-combos.md` | Charts only combos | drive 1tV8kex6TPlAEdZWi9FLSic1J1wJh44bBIP9NexVPU6M | 11 KB | combos |
| `nlm-day-month-aura.md` | day, month, aura | drive 1ui3heSn-6aXeLKU2xeiheN7gop1z9yVYNVFQm7zB5mM | 4 KB | essence |
| `nlm-dharma-vs-psyche-le.md` | Dharma Vs Psyche Life expressions (1) | drive 13BCMwJcZwjdCqxQcnvkbP9HyPEHvoG8LSjY6Or8iBFk | 8 KB | psyche |
| `nlm-dharma.md` | Dharma | drive 1fyqBq5AuVbgUuqBb2VzN11Fwc5tILzs2dTUKPrwn0Yw | 8 KB | essence |
| `nlm-dvlp.md` | DVLP | drive 1A10MnY6UFgqAPqRv-8j-w39I9Fqquoq9PqDKh0uksdg | 7 KB | essence |
| `nlm-excessive-preparation.md` | Ecsessive Preparation | drive 1Tx5aD8cCrgSTuOPaug_WCvNevb1nXT_QCONP7wfpPpg | 7 KB | numbers |
| `nlm-fear-of-death.md` | Fear of death | drive 1ZLm5T82Fs7aNX4DwaKQBdgpBY1yn7QTqvypKqrYpDeU | 6 KB | numbers |
| `nlm-fear-of-embarrassment.md` | Fear of embrassment | drive 1jtsEa6cizPRkQRDS-4Lj_Lissdjqv2MyBeAP6QbZW2o | 5 KB | numbers |
| `nlm-heal-the-world-type-numbers-2.md` | Heal The World Type Numbers | drive 135Lzp9Wp5EaJad5e7qXgiNEkXC_xNWpSNNhOUtOfHa0 | 6 KB | numbers |
| `nlm-heal-the-world-type-numbers.md` | "Heal the World" type numbers | drive 1RCRyWsTya4umrt1W729DWHrEx9uqd-lLN3KhRZhioUo | 20 KB | numbers |
| `nlm-heal-the-world.md` | Heal the world | drive 1EXt_Wzo6-WpyEMPl0wpCh754WDHKj5DOUgxL6wyQgf0 | 9 KB | numbers |
| `nlm-heavenly-mirror.md` | Heavenly mirror | drive 1kNVRp51c5h4dAP8QLmCgZk0RFdG9f_NcxG3ZjzOnH_A | 2 KB | method |
| `nlm-higher-self-breakdown.md` | Higher Self Breakdown | drive 1s2B-m1dJvqOf_MoVNDjrJ5buKJhGg-kJZ85vr6699dA | 4 KB | essence |
| `nlm-higher-self-inner-vs-outer-aura.md` | Higher-Self; Inner vs outer aura | drive 1mlBqfL-WF97igV11Elt0hQV0BUYn2XOqFeKsHC4Htls | 3 KB | essence |
| `nlm-impatient-numbers.md` | 1-9 impatient numbers | drive 1kzLkH_xHx5xHzSacdkFUQxiRodAnrnhLp3l2hqX2h3o | 9 KB | numbers |
| `nlm-imposing-rules-numbers.md` | Imposing rules Numbers | drive 1AXnSiQ67QS4DpdM54cckN8wqanQuEchMCoBhSV5GRnM | 8 KB | numbers |
| `nlm-inner-psyche-le-vs-day.md` | Inner Psyche Life expression meaning vs Day | drive 1RucwnIWMn6iZya_Spz3kXLjsiBKvlTLdyqDIhZRFnOU | 5 KB | psyche |
| `nlm-interpret-dv-combo-le.md` | interpret DV combo LE and big LE | drive 1hFtRFrwBwRf9FQYba_Vz8ihkulyfckhKmtzS7pw9Dv4 | 1 KB | method |
| `nlm-narrative-weaving.md` | narrative weaving | drive 1csdCVyUKfVo62KZP_MEZ4FAkRaFHJleJd30J_pFd4Qg | 4 KB | method |
| `nlm-new-system-prompt.md` | new system prompt | drive 1raY9TJzC90hKzAH_oD4RrkVKsm7iIRKMXv226F5zH2E | 5 KB | owner-notes |
| `nlm-number-bits.md` | Number Bits | drive 1Fe2W8mRMuzzgVke5fGEi9_MaUJ7WQyLIMlCP5opPXFQ | 6 KB | numbers |
| `nlm-number-insights.md` | Number Insights | drive 1j5hF3cfFgTi8IhpbIEyryzLTMIyNutRBm77xubfK0FU | 13 KB | numbers |
| `nlm-numeroscope-flow.md` | Numeroscope Flow | drive 1Si2yS7UOwuNFEnzKV7WgKvQmAr0FRu_a54l2n2uZzSs | 8 KB | method |
| `nlm-outer-psyche-challenge-number.md` | Outer Psyche Challenge Number | drive 1tTzPYQ7t6aHbrL_bHTgrBT2D0aKxpLcea2PORdTfoRA | 5 KB | psyche |
| `nlm-polarization-spinning-top.md` | polarization/spinning top numeroscope | drive 1Pyr2OT2nETl-mi4KZjhzuOVC5UGcy_BPeKCC2reMNJE | 3 KB | method |
| `nlm-principle-1-6.md` | Numeroscope; principle of 1,2,3,4,5,6 | drive 1brBXqLf5aTeNYg25kpcmZxQqgBemy6sQzQQiMeq_J94 | 4 KB | method |
| `nlm-psyche-example-15-6-and-5-challenge.md` | 15/6 and 5 Challenge Numbers (Psyche Example) | drive 17uq0w4AcHS8UAC8HMbWwkJuicrwsPla01Nqk9Wj9RN0 | 6 KB | psyche |
| `nlm-psyche-example-19-1-vs-24-6-pillar.md` | 19/1 vs 24/6 Pillar (Psyche Example) | drive 10OKmaWuFPI8ecavFNdiNlZEbWlUaTV7pp_f1GPMI25g | 5 KB | psyche |
| `nlm-psyche-example-59-5-vs-69-6.md` | 59/5 vs 69/6 Psyche LE (Psyche Example) | drive 18Q-WzesoZA6XKyLaLFQFvuR3sABXziPM2DF1u_w05zI | 5 KB | psyche |
| `nlm-psyche-example-61-7-vs-71-8.md` | 61/7 vs 71/8 mental strategies (Psyche Example) | drive 1lX49ox9V4eHiAjLydsMX0SX7isyH8FlGg1KtIcbE4NQ | 4 KB | psyche |
| `nlm-psyche-example-87-6-mental-flow.md` | 87/6 Mental flow (Psyche Example) | drive 1zA5FDSJhoxVvyoto58wTsX_-cPcccZn_vbA7H1f2FuM | 6 KB | psyche |
| `nlm-psyche-example-96-6-emotional-flow.md` | 96/6 Emotional Flow (Psyche Example) | drive 1cnTLQ-D0yvEcWu5VlJmNarLWXseV8MuHBLbKY1xOjIE | 6 KB | psyche |
| `nlm-quantum-numerology.md` | Quantum Numerology | drive 1pdzwMRK_6I4glMhZ7KDk0XC8MHoGwQQ76vEhYEvOWC8 | 2 KB | method |
| `nlm-random-chart-mechanics.md` | Radom chart mechanics | drive 1YE8Jwta5gPFEGzfE_yisf2QS3W-XPQx8hnFiptfrTNo | 9 KB | method |
| `nlm-social-and-emotional-intelligence.md` | Social and Emotional Intelligence | drive 19fDwgaj4wgm2Kmu4fKnZxhsJ9iPmS7lQc3gDcS8Dee8 | 4 KB | numbers |
| `nlm-soul-dharma-mind.md` | Soul - Water, DHarma - Spirit Mind - day | drive 13Ojw3LgQje8oudD2RCjmTVaEuta5YQjeAoOGJNiBk6A | 5 KB | essence |
| `nlm-thematic-grouping-1.md` | Thematic Grouping 1 | drive 1LVBAqPFqjrvDirf_sqoA85km9Ti-y6eRDG0Fl8z567A | 10 KB | numbers |
| `nlm-unsolicited-advice.md` | UNSOLICITED ADVICE | drive 1IF6OdGuzyuMTYbn9T8EjquzrGaBQ1HXKvRk4kUqCm6s | 5 KB | numbers |
| `nlm-what-is-a-diamond.md` | What is a "Diamond"? | drive 1HYikbbGTmj5sdyjL-nXcabwFuO3GR2QQrafi2PJX9Lw | 2 KB | method |
| `np-energetics-book.md` | NP Energetics: Healing the Body, Mind and Aura Through Numbers (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book") | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 43 KB | method |
| `number-notes.md` | Number Notes | .brain/numerology/sources/number-notes.md | 65 KB | numbers |
| `number-title-alt-title.md` | Number Title/Alt Title | drive 1Q3pGxbvIyq9eHkXOwcpPv_p_RhNYrsJf8WTAZTDvxKg | 4 KB | numbers |
| `numbers-0-9-video-and-website.md` | 0-9 video and website | drive 1x32va7YZ2k-UB4Jf9jmWK80TD7NVFjA_Z0mADZeK8_A | 317 KB | numbers |
| `numbers-1-9-chart-full-descriptions.md` | Numbers 1-9 Chart Full Descriptions (Formatted) | drive 1oJPZAxOQMcmO-lQdN-RWYhwoWI0AiAwpudam4F3QdH4 | 120 KB | numbers |
| `numbers-1-99-website.md` | Numbers 1-99 Full descriptions (From Website) | .brain/numerology/sources/numbers-1-99-website.md | 678 KB | numbers |
| `numbers-emotional-issue-to-liberation.md` | Numbers - Emotional issue to greatest liberation | drive 1XyFikKhW6d5bOrxxeJk577uWEK0iRuI4sIeU9zPae9o | 9 KB | numbers |
| `other-guide-1.md` | Guide 1 | drive 1hhWwhLCRHfF_RZpPE5K8DCUmlZD2_xL1k4tCr5EYF3E | 16 KB | numbers |
| `other-guide-2.md` | Guide 2 | drive 1bFnqnKcb2dwVGcjZli2hgd2gtPC9UpPnADCp5L1RKkI | 52 KB | numbers |
| `other-guide-3.md` | Guide 3 | drive 1yJwc4yNRwaqwumqD1kvSqWC0GtLh4liSrZDLsfAqDBk | 142 KB | numbers |
| `other-guide-4.md` | Guide 4 | drive 1tANOEVvunUsR5pHnQRBXNv3Ut6G2PftH9nTtB-T5D-8 | 449 KB | numbers |
| `personality-chart-problem-areas.md` | Personality Chart - Problem Areas | drive 1zCyYpCS7IUpI7yAsM7mXhB_-TbUnr9hBJZIVXPMQ9kE | 9 KB | sub-charts |
| `personality-chart-website-positions.md` | Personality Chart-Website (Position Meanings and Examples) | drive 1FiAqr6uJbjMgO5ixvOtyDH5E16xyqNwbRR7LOpMFvjc | 16 KB | positions |
| `position-meanings-website.md` | Essence, Psyche and Name Chart Position Meanings-Website | drive 11FPI3a59cEgNo2wUxzEVfkBNag6Z6TlSHmO388YFAhY | 21 KB | positions |
| `powerpoint-2026-spiritual-numbers.md` | Powerpoint 2026: Spiritual Numbers | drive 1TyVfyb1jqhdCzGBrL5bH2Q5jKo232jEX | 25 KB | numbers |
| `powerpoint-chakras.md` | Powerpoint: Chakras | drive 1v24bKBT-Tvw3yMKwyG_WqEW7jedtE8NP | 27 KB | method |
| `powerpoint-undernumeroscopes.md` | Powerpoint: Undernumeroscopes (sub-charts) | drive 1S9UwK0N9lXuEL5_nmUyDLlbbsHF3kHQQ | 43 KB | sub-charts |
| `psyche-book.md` | The Psyche: Guide to interpreting your birthdate (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 50 KB | psyche |
| `psyche-cases-book.md` | The Psyche: Cases (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 15 KB | psyche |
| `psyche-chart-framework.md` | Psyche Chart Framework (the psyche charts' positions, the challenge number among them; Drive root, outside the Hub folder) | drive 1GEhHruNIQWy4f04VhfOQqgQ8BWjtXalSYpIoZwidMjg | 9 KB | psyche |
| `psyche-chart-website-positions.md` | Psyche chart-Website (Position Meanings and Examples) | drive 1eYTnaO8-47IYPRfu6hc_tImtiwInAH_qiIYhMqcQ-Dg | 15 KB | positions |
| `psyche-childhood-aura.md` | Psyche Chart - Childhood Aura's (Bottom Right Aura) | drive 1F5Icf9CedPEeAsHogKHSagXkLYB92tup9N2Q2vLLEvo | 19 KB | psyche |
| `psyche-disorder.md` | Psyche Disorder | drive 1Md3FQs9urio8NT8i72hLIRsIKuSGAtYVNDrejKCO09E | 2 KB | psyche |
| `psyche-module-7-slides.md` | Module 7: The Psyche (slides; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 25 KB | psyche |
| `psyche-solar-plexus-codes.md` | Psyche Chart Solar Plexus Codes (3, 6, 9, 12/3, 15/6, 18/9 in the psyche solar plexus; Drive root, outside the Hub folder) | drive 1pRBrPnrdmXHylF9wjElXgeQqUyQEyUPuVY6-uwvhJTQ | 4 KB | psyche |
| `psyche-twenties-aura.md` | Psyche Chart - Twenties Aura (Bottom Left Aura) | drive 1VCDBHian9nGifAYZImD3Ib2yosS0_LMkWrzlOqT2YVc | 19 KB | psyche |
| `psychic-disorders-book.md` | Psychic Disorders (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 64 KB | psyche |
| `relations-book.md` | Relations seen through a numerological lens (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book") | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 201 KB | combos |
| `single-name-charts-book.md` | Single Name Charts: methods to look deeper into the individual name or word (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book") | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 57 KB | name-chart |
| `six-themes-book-part-1.md` | Numerology: A new and better life with the 6 main numerology themes (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book"), part 1 of 2 | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 298 KB | method |
| `six-themes-book-part-2.md` | Numerology: A new and better life with the 6 main numerology themes (course book; in "Diamonds, Relations, Stats, Aura Type, Templates and Book"), part 2 of 2 | drive 1QmJD4DmimtvzmvG7dTOEDHQ6TL3w1UiT | 290 KB | method |
| `sub-charts-overview-website.md` | PERSONALITY AND VOCATION CHARTS (SUB CHARTS) Overview-Website | drive 1N8IY80xNcFcmVRJv1FJ-GNbbmBi8IlYm-svJAANbwEE | 33 KB | sub-charts |
| `subnumeroscope-interpretation-book.md` | Subnumeroscope Interpretation (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 349 KB | sub-charts |
| `subvibrations-book.md` | Subvibrations & Subnumeroscopes (course book; in "Essence, Psyche Name and Sub-Charts") | drive 1YWBzzhNqcaJ5rmCPOOO2AZrE4nqvk2LK | 73 KB | sub-charts |
| `system-prompt-new.md` | SYSTEM PROMPT (New) | drive 1cRkxTodCCZsnMYWqcgf99TNmCAeRr5B7pajoEYtM4lM | 5 KB | owner-notes |
| `vocation-chart-problem-areas.md` | Vocation Chart - Problem Areas | drive 1LAheC9ouqm9qNLDUokjqmtv0CXQ6CMJwVnZxb_R_-9g | 11 KB | sub-charts |
| `vocation-chart-website-positions.md` | Vocation Chart-Website (position Meanings and examples) | drive 1YVrrPLFjh0L_DYqY8Xu7--XJrtzVELs5ZE0vb_t2CJ8 | 18 KB | positions |
| `what-are-numbers.md` | Copy of What are Numbers?-formatted | drive 1YD8uOXcRtwb1RUqj_sP70DcScgxYXfGQEzVqDmy9oHc | 8 KB | method |
| `what-is-a-name-1.md` | What a Name Actually Is a name (1) | drive 12dGhbtj2iPOfZJPI_MDYcaEoBXpxaOsB9FJOsRfWqdY | 7 KB | name-chart |
| `what-is-a-name-2.md` | What a name actually is a name (2) | drive 1U9UAwlQT17wueZ0_eq2xoSG50uVzo8BbybOwy9syePU | 9 KB | name-chart |
| `what-is-a-name-3.md` | What actually is a name? (3) | drive 1A_ihNfrM1Q-2ouU7ODRn1zPdWc-UIC58t3eEYConsjI | 6 KB | name-chart |
| `year-row-cases-book.md` | Year Row Cases: Real-Life Year Row Case Studies from Historic Moments (book) | drive 13y_YOV8ttrbbkXiuHQCvjfZhxbwGTple | 100 KB | method |

## Repaired exports (2026-10-20)
Six Google Docs came out of the Drive connector as one run of text with their headings flattened to plain lines,
so the index could not see "Month Vibration 12" or "THE NUMBER 7 IN CHILDHOOD" as headings and the meaning page
found nothing for those positions. The headings were put back by hand in `knowledge/raw/` (a re-export must do the
same): `higher-self-month-positions.md` ("### Month Vibration N: ..."), `higher-self-dharma-fusion.md` ("### Dharma
Number N"), `psyche-twenties-aura.md` ("## THE NUMBER N IN THE TWENTIES", the big psyche life expression as a bold
line inside), `psyche-childhood-aura.md` (the export had glued "BIG PSYCHE LIFE EXPRESSION: 12" and "THE NUMBER 5
IN CHILDHOOD" into one mangled heading: now "## THE NUMBER N IN CHILDHOOD" + the bold life expression line),
`position-meanings-website.md` (its all-caps lines) and `higher-self-website-positions.md` (its section titles).
`name-templates-rules.md` is pages 15-23 of the templates book (the rules chapter) typed up from `pdftotext`; the
templates themselves (pages 35+) stay out, as before. NP-Statistics-INT-v1 (1YGaZOz9B8oUpjSlr6Ag2LFqAkMcmAmg4) is
the same book as `humanity-archetyping-book.md` (checked 2026-10-20: same title, same "DAY VIBRATIONS AND STATISTICS"
chapter), so it is not added twice. The Drive copy of "Numbers 1-9 Chart Full Descriptions (Formatted)" was re-read
the same day: identical to the store's copy; it has no Day/Month/Year/Life Path sub-entries.

## Documents outside the Hub folder (found 2026-10-20)
The owner's My Drive ROOT holds numerology docs the Hub folder does not: "Psyche Chart Solar Plexus Codes" and
"Psyche Chart Framework" are in now. Seen but not added (the owner decides): "Psyche Chart Data Profile" (Katrine's
numbers as a table), "Psyche Chart Interpretation Examples" (two lines on 71/8), "THE NUMBER 8", "12/3's", "Number
Relations", "Higher self case 1" (two), "1-18 Number Notes", "Number Archetype Synthesis and Breakdown", "Chart Notes
(Higher Self)", "Higher Self interpretation examples:", "Life stages (1)", "Core Fundementals Numeroscope",
"Mind/Emotion Center descriptions. TEXT", "Psyche-INT TEXT" (= the psyche book), "1-99 High Level Overview",
"MANLY P HALL; THEORY OF 5". Search Drive by title before saying a document does not exist.

## Page numbers (2026-10-21)
Sixteen raw files are course PDFs that exist as separate books in the Hub (Class PDF > Essence (OCR) and
Name Change (OCR)). Each now carries `<!-- page N -->` lines: the page of that PDF on which the next paragraph
starts (the number printed on the page, so "p. 47" is page 47 of the book). `knowledge/books.json` names the
book behind each file (the short name shown on screen, the PDF's file name, its Drive id); `tools/build-knowledge.mjs`
reads the marks (`page` / `pageEnd` on every passage, `book` on the source), strips them from the text, and refuses
a file that is in books.json without marks or marked without an entry. `server/subchart-words.js` and
`server/listed-words.js` read the same marks for their entries. The meaning page shows the book and page on every
card ("Name Numeroscopes book · 7 in the Heart Center · p. 140") and under the short points ("From Name Numeroscopes
book p. 140 · ..."). A hand-written point in `bits.json` may carry its own `cites` entry ({ book, page }).

How the marks were placed: the PDF was fetched by its Drive link, `pdftotext -layout` split on form feeds, both
texts normalized to letters and digits, and every paragraph of the raw file (32 characters of it) looked up in the
PDF from the last match on; a heading too short to look up takes the page of the paragraph under it. Nothing but
the marks changed: the rebuilt index is byte-identical in every passage's text, heading, numbers and topics
(checked 2026-10-21). Script: the chat's scratchpad `align_pages.py`; the recipe is in `.brain/HISTORY.md`.
When a raw file is re-exported, the marks must be put back the same way (or the test `a passage from a course PDF
carries the book page` fails). Books: essence-book (EssenceInterpretation-ver1, 66 pp.), essence-codes-part-1/2
(Essence-APPENDIX-ver1, 338 pp.), name-numeroscopes-book (NameNumeroscopes-ver1, 178 pp.), diamond-method
(DiamondMethod-ver2, 108 pp.), forecasting-book (ForecastingNumerology-INT-ver1, 168 pp.), psyche-book,
psyche-cases-book, psychic-disorders-book, interpretation-guide, subnumeroscope-interpretation-book,
subvibrations-book, humanity-archetyping-book (= NP-Statistics), name-templates-rules, single-name-charts-book,
relations-book, name-change-5-steps (the booklet, added 2026-10-21). Not paged: the files made from Google Docs and transcripts (no pages exist), and the number guides.

Lectures cited by the minute (2026-10-22): a transcript has no pages, but its Otter lines ("Johannes 08:07") say
when each passage was said. `knowledge/books.json` "lectures" names the transcripts a hand-written point may cite
(`lecture-subnumeroscope-rules` = "Sub-chart Rules lecture", `lecture-name-cleanse-purification` = "Name Cleanse
lecture"); such a point's citation is `{ book, at: "mm:ss" }`, the speaker line its words sit under, shown as
"Sub-chart Rules lecture at 8:07". test/meaning.test.js checks every citation: a page from "books" or a minute from
"lectures", never both.

Two more books from their PDFs (2026-10-22): `karmic-connections-book.md` (NP-KarmicRelations-INT-v1, 23 pp.) and
`year-row-cases-book.md` (NU-YearRowCases-ver1, 91 pp.) were made straight from `pdftotext -layout` (form feeds =
pages, so every page mark is exact): the page number and running header dropped, hyphenated line ends joined,
the table of contents' titles and all-caps lines made headings, bullet glyphs made list items, a paragraph that
runs over a page break joined to its start. The Year Row Cases book's three Nixon year-row tables (pp. 62, 68, 74)
are pictures laid out as text and were left out; its "PLAYER 1 / PLAYER 2" picture captions too. The Karmic
Connections book reprints the Forecasting book's karmic chapter word for word; the index keeps the first copy
(the Forecasting book's), so `server/book.js` shows that chapter after the Karmic book's own passages. Neither
book is a meaning-page source: `server/book.js` serves them to the Karmic Connections tool and the Year Rows
number sheet only (`GET /api/book`).
