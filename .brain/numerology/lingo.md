# Lingo: the many names for one thing (owner's ask 2026-10-19: "remember the lingo")

The course, the scraped docs, the owner's tags and the app use different words for the same position. Read this
before matching course text to a position (server/meaning.js `W`, server/subchart-words.js) or naming anything.

| Position | Also called |
| --- | --- |
| Mind center | heart center, HC, MC, heart, the upper circle; in the vocation chart "Choice", in the personality chart "mental charisma" |
| Emotion center | solar plexus, SP, EC, emotional center, the lower circle; vocation "Desire", personality "emotional charisma" |
| Main vibration (of a center) | MV, the big number in the circle |
| Extra vibration | sub vibration, SV, secondary vibration, sub-vibration, the small number(s) in the circle (one per middle name) |
| A center's "combination" | the circle's numbers together: main + extra ("7 and 13 in the mind center", tag 7combo13mc). NOT the auras |
| Mental diamond | heart diamond, mind diamond (the two upper auras joined: 6 and 1 = 61/7) |
| Emotional diamond | solar plexus diamond (the two lower auras joined) |
| Public aura (name chart, upper left) | brand aura, top left aura |
| Friends aura (upper right) | top right aura |
| Associates aura (lower left) | bottom left aura |
| Love aura (lower right) | love life aura, bottom right aura |
| Vocation chart | vowel chart, Heart's Desire chart, green chart; "Choice / Desire / Will" |
| Heart's desire | HD, vocation life expression; little HD (daily), big HD (long term, "Will") |
| Personality chart | consonant chart, red chart; "mental / emotional / overall charisma" |
| Personality number | personality life expression; little (daily) and big personality number |
| Essence chart | Higher Self chart, purple hexagon |
| Psyche charts | psychic self, inner psyche (IPS) and outer psyche (OPS), blue diamonds |
| Day vibration | DV, day number, "the eye/I" |
| Life path | LP; little LP, big / higher LP (HLP) |
| Nexus | DV-LP diamond, DVLP, day + life path diamond. ON SCREEN the owner wants "DVLP" (2026-10-19) |
| Dharma line | top aura of the essence, "dharma number" (month + year) |
| Outer / inner aura (essence) | day + month / day + year (a SUM); the outer / inner DIAMOND is the two digit sums joined (OD / ID) |
| Name line diamond | life expression diamond (first + last name only) |
| Challenge number | psychic month (outer psyche, first name position) |

Not the same thing, though the words look alike:
- "The diamond of the number 7" (Diamond Method book, "Big Diamond", "small diamond") is the number's own symbol,
  never a chart's diamond. Never shown as a meaning (owner 2026-10-19).
- The sub-chart guide's "→ +8 pts" scores are for picking names; its words after the score ARE the position's meaning.
- A number's general description (the 1-9 / 10-45 / 46-99 books) is a separate layer the owner will add on purpose;
  the meaning page shows only what the course says about the number in that spot.

## On a screen (owner 2026-10-19, Similar Charts chips)
Name the chart in the name whenever a position exists in several charts: "Name Mind Center", "Vocation Mental
Diamond", "Outer Psyche Spine", never a bare "Spine" or "Mind Center". Positions only one chart has stay bare
(Public Aura, Life Expression, Name Line Diamond, DVLP, Outer Diamond). Abbreviate the owner's way to save
room (DVLP), Title Case. `positionName` in server/similar.js is the one place that spells these.
