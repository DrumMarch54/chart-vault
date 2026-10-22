# The paid tool's features, and what the app has of each (2026-10-15)

Numerologist PRO's own list (website software page + "TOOL:" boxes in the course books). Built = in
Chart Vault. The books that describe each one are in the owner's Drive; page numbers are the books' own.

| Feature | Built | Where the rules came from |
| --- | --- | --- |
| Profiles / 5 charts / Chartview | Quick chart, the vault, Search by position | chart-construction.md |
| Destiny Rhythms, Year Rows, Day Rows | Quick chart ⋮ "Year rows and day vibrations" | yearly-rows.md (Forecasting Numerology). Tap a number: its words, then "N in Real Year Rows" (2026-10-22): the Year Row Cases book (`knowledge/raw/year-row-cases-book.md`, 91 pp.: Carlsen–Anand 2013, Wimbledon 2015 and 2017, JFK 1961-63, Nixon 1972-74, Clinton 1998) as hand-written points per number cited by page (`hand/rows/<n>` in bits.json, 53 numbers: the cell numbers 1-18 and the subtle numbers the book names, 19/1 to 98/8) with the book's passages about that number folded (`GET /api/book?slug=year-row-cases-book&num=`); a sum's vertical reading gets its own section |
| Energy of the day / Coming Days ("Day Forecast") | **Today**, **Coming days** (`public/tools.js`) | Forecasting Numerology pp. 20-23 (24.12.1999 case, the software screenshot on p. 23); Success Codes & Superdates pp. 19-31 (positions), 198-200 (target number), 22-32 (success codes), 113-200 (how to act / use your mind / what to do now, the adjustment word); Superdates Cosmic Calendar pp. 51-108 (ruler of the day), 144, 43 + 288 (what a gold / green / red day is for); Business Manual pp. 12-18 (a company started that day). See "The day's words" below. |
| Super dates / Superdate calendar | Coming Days: Super / Good / Beware tag with the reasons, "Super Dates Only" | Success Codes & Superdates pp. 22-32 (codes), p. 31 (numbers to avoid); Superdates Cosmic Calendar pp. 43, 171-172, 282 (gold / green / red, "qualitative, not a score"); the course video (Drive "superdates intro/outro" transcripts: a super date must be good in the main chart AND the psyche chart); NotebookLM's summary 2026-10-15 (below). |
| Number Fun (big diamond 1-99) | **Number fun** | The Diamond Method pp. 7-28, confirmed on its worked example 14/5 (test/numbertools.test.js) |
| Relationship tool | **Relationship** (two day vibrations) | Relations book pp. 12-16 + the software screenshot (dr p. 569); the website's John 25/7 + Eve 21/3 example matches |
| Karmic relationships (Karmatool) | **Karmic connections** | Forecasting Numerology pp. 63-77: shared destiny rhythms = same birth-year digit sum. The words (2026-10-22): the Karmic Connections book (`knowledge/raw/karmic-connections-book.md`, 23 pp., the book written for the tool): under each person the book's sentence for that verdict cited by page (`hand/karmic/connected`, `same`, `free` in bits.json), the whole book as short points with the course words folded (`hand/karmic/book`; `GET /api/book?slug=karmic-connections-book`), then the Forecasting book's karmic chapter (the index keeps one copy of a reprinted paragraph) |
| Price tool | **Price tool** | Marketing Numerology pp. 37-55 (clean prices, digit-sum prices, no-go prices, the $100-$900 prices, the example prices, the tool's two steps); The Numbers 10-99 in Business (words + color of every number); Module 12 pp. 4, 10 (which numbers suit which customers / purposes). See "Prices" below. |
| My chart (the owner's own numbers) | **My chart** (Settings), `server/mychart.js` | app's own |
| House number tool | not built | Marketing Numerology pp. 27-35 |
| Business words / name lists by vibration | **Business Words** (`#/words`, tools.js `wordsView`, server/words.js, public/placewords.js) | Marketing Numerology pp. 55-58 (built 2026-10-20) |
| Domain & email tool, phone number tool, house number | **Phone and Domain** (`#/phone`), **House Number** (`#/house`) | Business education theme 3 (transcripts), Marketing Numerology house guide (built 2026-10-20) |
| Super Date finder (pick an event, get dates) | **Find a Date** (`#/finddate`, `NumberTools.findDates`): purpose → the book's day numbers, Super and Good days only, the company fit table | Superdates Cosmic Calendar ch. 8: the "strategic resonance map" table (knowledge/raw/biz-superdates-cosmic-calendar.md line 5649) and step 3 "Superdates and Company Resonance" (built 2026-10-20) |
| Plan with your Year Rows (search good combos) | **Plan With Year Rows** (`#/planrows`, `NumberTools.rowHits`): the good and difficult lists as chips, hits named and ringed in the same table as the Year Rows popup (app.js `rowsTable`) | Forecasting book "TOOL: Plan with your Year Rows" (knowledge/raw/forecasting-book.md line 1609: GOOD 10/1 13/4 14/5 15/6 17/8 5-3-8 5-5-10/1 5-8-13/4; DIFFICULT 11/2 12/3 16/7 18/9 44/8; built 2026-10-20) |
| Celebrities / Statistics | **Famous People** (`#/famous`, public/celebrities.js from the Humanity Archetyping results book): by birthday and by career, the vault's charts born that day | knowledge/raw/humanity-archetyping-book.md (built 2026-10-20) |
| Walkthrough, Astrology, Tree of Life, Quiz, Templates | not built | not needed for now |

## Where the day positions come from (Today / Coming days)
Forecasting p. 20-21, 24.12.1999: day vibration 24/6 bottom, month 12/3 top-left, year 28/1 top-right.
Little life path = digit sums added = 10/1; big life path = every digit = 37/1. Outer aura 9/9 = day + month,
outer diamond 63/9 (the two digit sums side by side); inner aura 7/7 = day + year, inner diamond 61/7;
dharma line 4/4 = month + year, dharma diamond 31/4. Target = day ds then dharma ds (Superdates p. 199);
DVLP (natural talent) = day ds then life path ds (p. 30). Readings per position: `public/readings.js`,
generated from the Superdates book by `tools/make-readings.mjs` (never hand-edited).

## Rating a date (Super / Good / Beware), 2026-10-15
The paid tool's calendar has three colors: gold Super, green Good, red Aware/Beware (Cosmic Calendar p. 43). The
book never gives a formula ("qualitative categories, not algorithmic scores", p. 172), so the app's rule is the
course's wording, checked with NotebookLM (owner pasted its answer 2026-10-15):
- Positions read: day vibration, essence (little life path), big essence, outer diamond, inner diamond,
  natural talent (DVLP), dharma line, target number, and the heart, solar plexus, life expression and pillar of
  both psyche charts. The auras repeat the diamonds' digit sums and are not read twice.
- Codes: category 1 strong 58, 85, 35, 53 (the 3-5-8 money triad), 10, 19, 37, 46, 55, 64, 73, 91; category 1
  soft 5, 14, 23, 32, 41, 50, 68, 77, 86, 95, 45, 54, 17, 15, 24, 33, 42, 51, 60, 69, 78, 87, 96; category 2
  strength 9, 27, 36, 63, 72, 90, 21, 30 (+ 28, 82, "not in the strongest positions"); category 3 special 13,
  49, 94, 56, 65, 67, 76, 25, 34, 52, 70, 71, 89, 98.
- Beware: 16, 61, 79, 88, 97, 29, 92 anywhere; 12, 57, 75, 39, 48, 84, 11 as the day or the essence; 18, 81,
  99 as the day, the essence or the target; 4 and 8 meeting (day, month, year) in a diamond (4-12/3-8 clash).
- Super: nothing of that; a primary code as the day, the essence or the big essence; a strong AND a soft code
  somewhere in the day chart; no use-with-care number in a psyche center, pillar or life expression.
- Good: everything else. Over 2026 this gives about 30 Super, 100 Good, 235 Beware days (2026 is a 10/1 year,
  so essences of 11/2 and 12/3 are common). The reasons are listed on the Today screen and the full-screen day.
2026-10-16, owner: 31 Oct 2026 (31/4 day, essence 6, big essence 15/6, 46/1 natural talent, 41/5 diamonds) is
"definitely not" a Super Date. The rule had counted a primary code as the BIG essence as the dominant position; the
book's strongest positions are the day vibration and the essence ("GV or ST", p. 31), and the big essence only repeats
the essence's digit sum. Now a Super Date needs the primary code as the day or the essence itself. 2026: 22 Super,
106 Good, 237 Beware. Still open if the owner disagrees with another date: the Superdates intro/outro transcripts
(knowledge/raw/biz-transcript-superdates-*.md) give the codes and the numbers to avoid but no count or threshold.
Still unread: the "Module 4" lesson the Cosmic Calendar refers to (how the tool itself computes the colors);
if the owner finds the paid tool disagreeing with the app on a date, that is where to look.

## The big diamond (Number Fun, Relationship)
A top-left (outer), B top-right (inner), under 10 a 0 sits top-left. LE = A+B at the bottom, outer aura =
A+LE, inner aura = B+LE, center = the two auras added. Outer diamond = [LE, A], inner = [LE, B], the
unbalanced ones reversed. Essence diamond = [outer aura ds, inner aura ds]; integration diamond = the
essence diamond's two auras; it always lands on a 9. Relationship: A and B are the two day vibrations;
"how A feels it" = the outer diamond (A + LE), "how B feels it" = the inner one; the essence of the
relationship = their sum (Relations book pp. 13-15).

## Reading the course PDFs as pictures (how this was found)
`.brain/numerology/README.md` "Reading PDFs" has the steps. Short: text-search first (pdftotext), render
only the pages a hit points at (pdftoppm -r 70 … -f N -l N), look at the PNG; never print a whole book.
Files over 10 MB come by direct link (they are shared "anyone with the link").

## The day's planet pictures (public/planets/)
NASA photographs, public domain, cropped to the disk and saved small (560 px, Saturn 720 px, webp): Sun
GSFC_20171208_Archive_e002069 (SDO AIA 304), Moon GSFC_20171208_Archive_e001861, Mercury PIA15162
(MESSENGER globe), Venus PIA23791 (Mariner 10, left frame), Mars PIA04591 (Hubble 2003), Jupiter PIA02873
(Cassini globe), Saturn PIA11141 (Cassini), Uranus PIA18182 (Voyager 2), Neptune PIA01492 (Voyager 2).
Found and fetched through https://images-api.nasa.gov (search, then /asset/<id> for the file sizes). The
scene draws them with a screen blend so the black background vanishes into the sky.

## Prices (Business PDF's, 2026-10-16)
Rules in `priceCheck` / `priceFind` (`public/numbertools.js`), every one proven in `test/numbertools.test.js` on the
book's own examples (all 67 example prices of pp. 46-53 pass; every no-go price of p. 48 is caught). Three verdicts:
- **Avoid**: 12/3 or 16/7 as the digit sum or standing in the price ($120, $1600) (p. 48); 4 and 8 together (p. 48; $1344
  sits in that list as a 12/3 price, it has no 8); an 8 digit sum other than 8 and 17/8 (p. 40 "Only 8 and 17/8 (not the
  other 8 numbers such as 26/8 and 35/8)"; p. 43 "Prices should never end in 8, except for 17/8 … The other 8 digit sum
  numbers should not be used").
- **Only With Care**: 18/9 "except as a strong offer" (pp. 40, 53); 18 reinforced by zeros, "a little too hard" ($1800,
  p. 51); a digit sum the book does not use: p. 40 "The digit sum must land on 5, 9 or 1", p. 53 a 6 or 20/2 for a softer
  price, p. 46 597 = 21/3.
- **Good Price**: everything else. Notes: last digit 5, 7 or 9 (p. 40, "can be", not "must"); a clean price (pp. 38-39,
  47 19.000 = 19/1, 53 2.000 = 20/2); a magnetic number standing in the row, 19, 23, 27, 32, 36, 37 (p. 40); the first two
  digits are read too (p. 51 "36 is included as the first two digits", p. 53 "the millionaire number 73").
Corrected 2026-10-16: the app warned on any price whose LAST DIGIT is 8; the book's "never end in 8" is the digit sum
(the 8 section, p. 43), so $298 = 19/1 is a good price. 18/9 and $1800 were "Avoid", now "Only With Care". Find a Price
now also offers the clean prices it promised ($210, $2100 for 21/3). 54/9 left out of the choices (only $999,999 adds to 54).
On the screen, from `public/bizwords.js` (GENERATED by `tools/make-bizwords.mjs`, never hand-edited): the book's page for
the price's vibration (pp. 38-44), "A N price" ($100-$900, p. 54), the business words + color of the digit sum, the clean
number and the first two digits (The Numbers 10-99 in Business; 1-9: the family summaries), "Suits" (Module 12 p. 10
number codes by purpose, p. 4 customers by digit), the book's own example prices in the chosen range, "in the book" on found
prices that the book itself lists. The chip words are the summary's (pp. 52-53).
2026-10-19: the books' words are one card per number in the price (Digit Sum / Clean Number / First Two Digits / In the
Price), each passage under its own head: As a Price (pp. 38-44), Any N Price (p. 54), In Business (10-99 in Business),
Suits (Module 12). The pyramid card has a switch, Number Pyramid / Price Chart: the chart is the course's mini-numeroscope
for a number sequence (Six Themes book, "Numeroscopes on number sequences … can be used on a phone number, a price or a
year"; the chart videos: "we could also put a number sequence here" on the central line). `Numeroscope.sequence`: every
digit is a name on the central line (as every letter is in `singleName`), a 0 is drawn gray and adds nothing, the digit
sum at the bottom is the price's own; an optional day on top (the launch day or the business's day) gives the upper half.
Color code (The Numbers 10-99 in Business p. 1): green Excellent, black Good, orange Can Be Okay, red Avoid. Read from the
colored list lines with `pdftohtml -xml`. 13, 49, 52, 67, 70, 76, 90 are printed in the heading blue, which the key does
not name: shown without a color word (question for the owner). 93-99 are in no list line: no color.

## The day's words (Business PDF's, 2026-10-16)
From `public/readings.js` (GENERATED by `tools/make-readings.mjs <Superdates.pdf> <CosmicCalendar.pdf>`):
- Today, "How to Use the Day": the outer diamond's "How to Act Today", the inner diamond's "Inner Success Codes (How to Use
  Your Mind Today)", the target's "Fastest Bridge (What to Do Now)" (Superdates pp. 113-200) and "Your Adjustment" = the
  target's digit sum as p. 199 names it (1 focus · 2 soften · 3 clarify · 4 organize · 5 lighten · 6 harmonize · 7 discern
  · 8 commit · 9 complete). The full-screen day shows the same, one sentence each.
- The code chips name the code's group (Superdates pp. 24-27: World conqueror code, Money & manifestation, Leadership &
  agency, Communication & networking, Charisma & attraction, Completion & Results, Quality & Stability, Innovation &
  structure, Popularity, Innovation & Aesthetics, Vision & spirituality, Visibility & spotlight); the sheet gives its words.
- The rating box says what a day of that color is for (Cosmic Calendar p. 288: gold "Ideal for launches, announcements,
  high-visibility actions … go with momentum", green "Suitable for routine tasks, content creation, light marketing …
  proceed with awareness", red "Best for review, maintenance, or rest—not new beginnings … pause and reflect").
- "Ruler of the Day" card: the planet's chapter (Cosmic Calendar pp. 51-108; its numbers match the app's 1 Sun, 2 Moon,
  3 Jupiter, 4 Uranus, 5 Mercury, 6 Venus, 7 Neptune, 8 Saturn, 9 Mars): title, keywords, business themes; the sheet has
  the archetypal essence and the "dates vibrating with …" paragraph (which days of the month the course uses or avoids).
  Pluto's undertone on days of 9, 18, 27 or with a 0 (p. 104, and p. 56 for 20). The flow / tension parts of each chapter
  need the sky's aspects and are left out. The full-screen day shows the planet's business role (p. 144).
- "A Company Started This Day" (Business Manual pp. 12-18, "1 Business" … "9 Business"): from `bizwords.js`.
- Coming Days, list rows (and the big cards): the day vibration's keywords, one line.
- Every number's sheet adds its success-code group, its business words and color, and its general meaning (Numbers
  Overview 1-99).
The generator also mends keywords that ran over two lines in the book ("Decisive-" / "ness"): 45 day vibration, essence and
natural-talent entries had a cut keyword line and a reading starting mid-word before 2026-10-16.
Not used (and why): the Cosmic Calendar's aspects, retrogrades, moon phases and ingresses (astrology the app does not
compute); its company-number table (p. 284) and intent table (p. 283, it lists 12, 16 and 18 as good date numbers,
against the Superdates book's numbers to avoid); the Business Manual's business super-date rule (p. 19, see questions).

## Open questions for the owner (to put to NotebookLM)
1. The Numbers 10-99 in Business prints 13, 49, 52, 67, 70, 76 and 90 in dark blue, but its color key only names green,
   black, orange and red. What does blue mean for those numbers (good for business like black, or something else)?
2. The Business Manual p. 19 defines a business Super Date differently from the Superdates book: "Always aim for one of the
   numbers to be 23/5 … excellent as DV or Life Path: 19/1, 37/1, 23/5, 15/6, 27/9, 36/9; good as Life Path: 17/8, 15/6,
   24/6". Should the app's Super / Good / Beware also require one of these as the day or the essence (it does not today)?
3. Marketing Numerology p. 40 says the digit sum "must land on 5, 9 or 1", yet p. 54 describes every $100-$900 price and
   p. 46 uses 597 = 21/3. The app calls other digit sums "Only With Care" rather than "Avoid". Is that right?
