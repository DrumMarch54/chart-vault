# The paid tool's features, and what the app has of each (2026-10-15)

Numerologist PRO's own list (website software page + "TOOL:" boxes in the course books). Built = in
Chart Vault. The books that describe each one are in the owner's Drive; page numbers are the books' own.

| Feature | Built | Where the rules came from |
| --- | --- | --- |
| Profiles / 5 charts / Chartview | Quick chart, the vault, Search by position | chart-construction.md |
| Destiny Rhythms, Year Rows, Day Rows | Quick chart ⋮ "Year rows and day vibrations" | yearly-rows.md (Forecasting Numerology) |
| Energy of the day / Coming Days ("Day Forecast") | **Today**, **Coming days** (`public/tools.js`) | Forecasting Numerology pp. 20-23 (24.12.1999 case, the software screenshot on p. 23); Success Codes & Superdates pp. 19-31 (positions), 198-200 (target number), 22-32 (success codes) |
| Super dates / Superdate calendar | Coming Days: Super / Good / Beware tag with the reasons, "Super Dates Only" | Success Codes & Superdates pp. 22-32 (codes), p. 31 (numbers to avoid); Superdates Cosmic Calendar pp. 43, 171-172, 282 (gold / green / red, "qualitative, not a score"); the course video (Drive "superdates intro/outro" transcripts: a super date must be good in the main chart AND the psyche chart); NotebookLM's summary 2026-10-15 (below). |
| Number Fun (big diamond 1-99) | **Number fun** | The Diamond Method pp. 7-28, confirmed on its worked example 14/5 (test/numbertools.test.js) |
| Relationship tool | **Relationship** (two day vibrations) | Relations book pp. 12-16 + the software screenshot (dr p. 569); the website's John 25/7 + Eve 21/3 example matches |
| Karmic relationships (Karmatool) | **Karmic connections** | Forecasting Numerology pp. 63-77: shared destiny rhythms = same birth-year digit sum |
| Price tool | **Price tool** | Marketing Numerology pp. 36-55 (clean prices, digit-sum prices, no-go prices, the tool's two steps) |
| My chart (the owner's own numbers) | **My chart** (Settings), `server/mychart.js` | app's own |
| House number tool | not built | Marketing Numerology pp. 27-35 |
| Business words / name lists by vibration | not built | Marketing Numerology pp. 55-58 |
| Domain & email tool, phone number tool | not built | Business education theme 3 (transcripts) |
| Super Date finder (pick an event, get dates) | not built (Coming days + Super only covers part) | Superdates Cosmic Calendar (12 MB, pp. ?) |
| Plan with your Year Rows (search good combos) | not built | Forecasting book p. 392-393 (dr p. 1068) |
| Walkthrough, Celebrities, Astrology, Tree of Life, Statistics, Quiz, Templates | not built | not needed for now |

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
