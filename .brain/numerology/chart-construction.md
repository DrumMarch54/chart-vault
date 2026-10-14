# How the 5 charts are built

Sources: Name-Numeroscope TEXT (class manual, `sources/`), Higher-Self
Framework, Psyche powerpoint (Module 7), Undernumeroscopes powerpoint (Module
10), website position articles. CONFIRMED = checked against screenshots of the
paid Quick Numeroscope tool ("Test test", day 1). Anything else is from the
course text and still waits for a screenshot with a full date and a middle name.

## Basics
- Chaldean letters, 9 is never a letter: 1 A I J Q Y (Å) · 2 B K R · 3 C G L S ·
  4 D M T · 5 E H N X · 6 U V W (Æ) · 7 O Z (Ø) · 8 F P.
- Vowels for the vocation chart: A E I O U Y Å Æ Ø. Consonants: the rest.
- Digit sum (ds): add digits until one digit. 19 → 1, 22 → 4, 88 → 16 → 7.
- Every value is written `sum/ds`: 16/7, 19/1, 22/4. 88 is written 88/7 (or
  88.16.7 in transcripts). A single digit is written 5/5.
- Numerological addition adds the digit sums, never the raw sums:
  20/2 + 18/9 + 21/3 = 2+9+3 = 14/5.
- "Diamond" = two digit sums written side by side, strongest first:
  day 1 and month 8 → 18/9. A diamond is the structure, the aura is its sum.
- A single-digit position (e.g. month 5) stays 5/5. No "augmentation" is
  applied anywhere EXCEPT the outer psyche month (see psyche). The NotebookLM
  summary that says name-line values under 10 get the day added is a
  conflation of that psyche rule; the class manual never does it for names,
  and the paid tool shows "e 5/5" on the vowel chart with day 1 typed.

## The rhombus (numeroscope) — name, vocation, personality, psyche charts
Shape: top = consciousness (A = day vibration), central line = the energies
being studied (names, or month/year), two circles (heart center above, solar
plexus below), four auras outside the rhombus, life expression (LE) under the
bottom tip, pillar in the small triangle under that, spine in a small square
beside the heart circle above the surname. Left = outer (first name, month),
right = inner (surname, year).

CONFIRMED for the name chart, consonant chart and vowel chart:
1. Name line: each name's letter sum, `sum/ds`. First name left, surname
   right. Middle names sit on the line between them (placement in the drawing
   not yet seen).
2. LE (little) = sum of the names' ds, written `sum/ds` (7+7 = 14/5).
   Big LE = sum of the raw name sums (16+16 = 32/5), shown in the faded
   circle beside the LE. In the sub-charts these are the little/big
   personality number (consonants) and little/big heart's desire (vowels).
3. Upper left aura = first ds + day ds. Upper right aura = surname ds + day ds.
   (8/8 = 7+1.)
4. Heart center main vibration = upper left ds + upper right ds (16/7 = 8+8).
5. Lower left aura = first ds + LE ds. Lower right aura = surname ds + LE ds
   (12/3 = 7+5).
6. Solar plexus main vibration = lower left ds + lower right ds (6/6 = 3+3;
   12/3 = 6+6 on the consonant chart).
7. Spine = day ds + LE ds, shown as the spine NUMBER (6/6); the spine DIAMOND
   is day ds beside LE ds (15/6). Owner confirmed the name.
8. Pillar = day ds + heart main ds + solar main ds + LE ds (19/1 = 1+7+6+5),
   shown in the triangle under the chart. Each sub-chart has its own pillar.
9. Letter count of all names (8 for "Test test") in the small blue circle to
   the right of the name chart.
Nothing above the name line is computed without a day.

From the class manual (Katrine Ditte Pilmark, born 19 August 1984), middle
names:
- Heart center extra vibration, one per middle name = heart main ds + middle
  name ds. Katrine: main 7/7 (3+4), extra 7+9 = 16/7.
- Solar plexus extra vibration, one per middle name = solar main ds + middle
  ds. Katrine: main 15/6 (7+8), extra 6+9 = 15/6.
- Pillar = day ds + heart main ds + heart extra ds(s) + middle ds(s) + solar
  main ds + solar extra ds(s) + LE ds. Katrine: 1+7+7+9+6+6+5 = 41/5.
- With no middle name there are no extra vibrations and the pillar is rule 8.
- Big personality number (powerpoint): all consonants in the full name added
  raw (Albert Einstein 28/1); little personality = sum of the per-name
  consonant ds (11/2 + 17/8 = 10/1). Same for vowels → big/little heart's
  desire (18/9 and 6/6 + 12/3 = 9/9).
- Mind diamond (heart diamond, "communication diamond" / "brand diamond" in the
  name chart) = upper left ds beside upper right ds. Emotion diamond (solar
  plexus diamond) = lower left ds beside lower right ds.

Open questions for the drawing (ask for a paid-tool screenshot): where the
middle name sits on the line, where heart/solar extra vibrations are written
(class text: inside the circles under the main vibration), a one-word name.

## Essence chart (Higher Self) — the purple shape at the top
Triangle (drawn as a hexagon) with a circle in the middle. Day at the BOTTOM
point, month top-left corner, year top-right corner.
- Day vibration DV = `day/ds` (19/1). Month MV = `month/ds` (12/3, 8/8).
  Year YV = digit sum of the year's digits, then its ds: 1984 → 22/4,
  1949 → 23/5. Always written secondary/final.
- Little (small) life path = DV ds + MV ds + YV ds, written `sum/ds`, top of
  the circle. Katrine 1+8+4 = 13/4.
- Big (higher) life path = every digit of the full date added, bottom of the
  circle. 1+9+8+1+9+8+4 = 40/4. Same ds as the little LP, always.
- Outer aura (left side) = DV ds + MV ds (9/9). Outer diamond = DV ds beside
  MV ds (18/9). "Code for action in the outer world."
- Inner aura (right side) = DV ds + YV ds (5/5). Inner diamond = DV beside YV
  (14/5). "Keys to inner harmony."
- Top aura (dharma line) = MV ds + YV ds (12/3), written on the top side of the
  triangle. Dharma diamond = MV beside YV (84/3). 81 possible diamonds.
- DV-LP diamond (Nexus, soul archetype, natural talent) = DV ds beside little
  LP ds (14/5).
- Target number = DV ds beside top-aura ds (13/4); its ds always equals the LP
  ds.
- Planets: 1 Sun, 2 Moon, 3 Jupiter, 4 Uranus, 5 Mercury, 6 Venus, 7 Neptune,
  8 Saturn, 9 Mars.
Placement inside the paid tool's purple hexagon (big circle + small circle) is
not confirmed; the course layout above is the best guess.

## Psyche charts — the two pale blue rhombi
Same rhombus rules with month and year on the central line instead of names.
Top = day. (Which blue diamond is inner and which outer is not confirmed; by
the chart's own left=outer, right=inner law the outer psyche should be on the
left.)
- Inner psyche (IPS): line left = MV, right = YV, both as they are
  (month 5 stays 5/5). LE = MV ds + YV ds (= the essence top aura). Auras:
  upper left = day+month, upper right = day+year, lower left = month+LE,
  lower right = year+LE. Centers, spine, pillar as in the rhombus (no middle
  names, so no extras). The IPS LE diamond (MV beside YV, "69-15/6") is the
  "psychic journey"; its bottom = psyche life expression.
- Outer psyche (OPS): line left = outer aura ds (= DV ds + MV ds), and if that
  is under 10 add 9 to lift it into the "teenage" range 10-18. This number is
  the psyche challenge number / psychic month. Right = YV. Top = day. LE =
  left ds + YV ds; its ds always equals the life path ds. Everything else as
  the rhombus.
- Ages: lower right aura childhood (0-9), upper right teenage (9-18), lower
  left twenties (19-27), upper left adult (28+); the psychic month is the
  adult transition (Saturn return, ages 27-28); 12, 13, 16, 18 there are the
  hard transitions.

## Destiny rhythm (from the year ds) and yearly rows — NOT built yet
- Doubling rhythm 1-2-4-8-7-5 for year ds 1,2,4,5,7,8, period lengths in years,
  starting at the ds, 27-year cycle. Polar 3-6 for 3 and 6. 9-9-9 for 9.
- Yearly rows: 7 periods (Jan 1-Feb 21, Feb 22-Apr 14, Apr 15-Jun 5, Jun 6-Jul
  27, Jul 28-Sep 17, Sep 18-Nov 8, Nov 9-Dec 31) and formulas F0-F4 depending
  on the position in the destiny period. Still only from the NotebookLM
  summary; read `Yearly Rows_ocred.pdf`, `NCE-yearrows_ocred.pdf`,
  `ForecastingNumerology-INT-ver1_ocred.pdf` and the owner's `USA Yearly Rows`
  before building.
