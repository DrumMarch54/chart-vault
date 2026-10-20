# Writing the short points for the number meaning pages

You are turning course text (Chaldean numerology, Numerologist PRO) into SHORT POINTS for a phone screen. The owner
approved the style below. Follow it exactly. Nothing is added that the text does not say; nothing is interpreted.

## Input
One JSON file, a list of "sets". Each set: `id`, `labels` (what the page is, e.g. "7 in the Name chart's Mind center";
all labels of a set show the SAME passages, write once), `passages` (the course text: `source`, `title`, `heading`,
`text`).

## Output
Write ONE JSON file at the output path given to you:
```
{ "<set id>": { "groups": [ { "title": "In balance", "points": ["...", "..."] }, { "title": "Out of balance", "points": [...] } ] }, ... }
```
- Every set id from the input appears in the output, with at least one group with at least one point.
- Group titles: "In balance" and "Out of balance" when the text separates them (also when it says "balanced /
  unbalanced", "harmonious / disharmonious", "positive / negative", "+ / −"). When the text does not separate
  them, ONE group with title "" (empty string). A pair page ("7 with 13/4 in ...") is one group with title "".
  Never any other titles.
- Points: 2 to 6 per group. 3 to 14 words each. Fragments, not sentences. Course words, only shortened.
- `**double stars**` around the words that should stand out (the key traits), 1 to 2 runs per point, never a whole point.
- Valid JSON, UTF-8, straight quotes inside strings escaped as \".

## Leave OUT
- Sentences about the POSITION itself, not the number ("the heart center is your brand", "the love aura represents
  loved ones", "the lower right aura protects the lower body").
- Referrals ("seek out a numerologist", "we recommend new names"), course housekeeping, point scores ("→ +8 pts").
- Tarot card descriptions and planet or mythology facts, unless the trait itself depends on them.
- Other numbers' pairs ("6 and 7 is the Hollywood combination", "12/3 with 7 ...") on a single-number page.
  On a PAIR page keep only what is about that pair.
- Case examples about named people. Statistics lists of professions (keep a one-line summary if the text makes a
  claim, e.g. "most common day vibration among Forbes billionaires").
- Repeats: two passages often say the same thing (a book and its scrape). Say it once.

## Approved examples (match this density and tone)

7 in the Name chart's Mind center
- In balance: "**Popular, inspiring, unconditionally loving**, healing radiance; seen as **wise**." / "**Universal love**:
  sees everything in a reflective light; philosophical, idealistic, nonmaterial." / "Speaks from **inner wisdom**; people
  feel accepted and **open up**." / "**Clairvoyance, strong intuition**: right place, right time."
- Out of balance: "**No grounding, fantasy world**, escapism." / "Seems **psychologically unstable**: depression, mental
  disorders, obvious to all." / "**Manipulative, lies**: talks of wants as if already owned." / "Doesn't act on plans;
  **untrustworthy**."

12/3 in the Name chart's Mind center (one group, title "")
"Expansive personality, **go-getter spirit**." / "Easily **a victim of other people's agendas**, or seen as one." /
"**Held hostage** to others' agendas, often without realizing." / "**Thinks too much**: twists and turns things
endlessly." / "Others **can't read you**; you don't read others well."

9 in the Name chart's Emotion center
- In balance: "**Drive, action, focus, will, strength**; an air of **inner authority and calm**." / "Strong will and a lot of power."
- Out of balance: "**Harsh inner critic**: never good enough; self-worth tied to achievement and status." / "**Explosive,
  short-lived anger**, especially at those closest; or an **emotional lid**, can't feel." / "Hard to **love yourself**, so
  hard to love others: trouble in love and family life." / "**Blocks energy in the lower body**: fertility problems, sexual
  dysfunction, lower-body illness." / "May be homosexual or bisexual, or often approached by the same sex." /
  "**Not a good number here**."

12/3 in the Name chart's Love aura (one group)
"**Not a good number in an aura.**" / "**Misreads situations**: sees the opposite of what is happening; feels a victim
of circumstances." / "**Taken advantage of or held hostage by partner, children or parents**; angry inside,
disempowered." / "Lower-body health: what you think is healthy isn't; **too much sugar or fat, alcohol**." / "With
**masculine numbers** around it (1, 3, 8, 9, 10, 14, 18, 19): **acts before thinking**, loud, boastful." / "With
**feminine numbers** around it (2, 6, 7, 11, 15, 20): **quietly feels abused and unvalued**."

7 in the Vocation chart's Mind center (one group)
"**Excellent.** Deep **spirituality, intuition, inner guidance**." / "Heart-centered insight; **alignment with higher values**."

7 with 13/4 in the Name chart's Mind center (pair page, one group)
"**Intuitive and original** thinking; **strange interests**, drawn to odd worldviews and theories." / "May **repel people**
who find the thinking too strange." / "**Aloof, quietly snobbish**: silently judges others' lack of subtlety." /
"**Hard to connect**: watches from the outside, never fully joins in."

## How to work
Read the input file with the Read tool (it is JSON; if it is long, read it in parts with offset/limit). Write the output
with the Write tool. Do not run the app, do not read other files, do not change anything in the repository. When done,
reply with one line: the number of sets written.
