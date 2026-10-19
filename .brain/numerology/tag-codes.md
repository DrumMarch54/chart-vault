# Tag codes on the owner's charts (decoded 2026-10-15)

A position tag is `<number><code>`, e.g. `19fn` = 19/1 on the first name.
Owner's answers plus a check against the charts themselves: for every vault
chart with a known date and name (tools/color-study/vault-inputs.json), the
chart was recomputed and the tagged number looked up in every position.
"N of M" = in N of the M tagged charts the number sits in that position.

| Code | Meaning | Proof |
| --- | --- | --- |
| day | day vibration | 105 of 106 |
| month | month | 9 of 9 |
| lp | life path (little or big, tags do not say which) | little 71, big 66 of 135 |
| llp / hlp | little / higher (big) life path | 3 of 3 / 2 of 2 |
| nr… (nrday, nrlp, nrmc, nrec) | number reduction: the digit sum (life path 16/7 → 7nrlp). rnday = typo | owner |
| od | outer diamond (day beside month) | 39 of 39 |
| dharma | dharma diamond (month beside year) | 47 of 47 |
| dvlp | day vibration + life path diamond (nexus) | 54 of 55 |
| fn / mn | first name / middle name | 33 of 35 / 1 of 1 |
| name | ANY of the person's names equals the number | owner; first 12, middle 15, last 15 |
| le | life expression (little or big) | big 30, little 28 of 66 |
| mc / MC | mind center (heart center) main vibration | 87 of 98 |
| ec | emotion center (solar plexus) | 11 of 12 |
| pa | public aura (upper left aura of the name chart) | 28 of 30 |
| aa | associates aura (lower left) | 1 chart, looked at |
| pd | public diamond = day beside first name | 28 of 31 |
| md | mental diamond = upper auras side by side | 30 of 36 |
| ed | emotional diamond = lower auras side by side | 4 of 4 |
| sd | spine diamond = day beside LE | 24 of 27 |
| plr | pillar | 1 of 1 |
| nldiamond | name line diamond = first beside last; only exists for a first + last name, a middle name means no diamond (owner 2026-10-16) | 4 of 4 |
| psn | personality number (consonants LE, little or big) | 33 of 33 |
| hd | heart's desire (vowels LE, little or big) | 11 of 11 |
| vmd / ved | vocation mental / emotional diamond | owner, 1 of 1 |
| pmd | personality mental diamond | by analogy |
| opms / ipms | outer / inner psyche mental strategies diamond (psyche upper auras) | 7 of 7 / 3 of 3 |
| oms | outer (psyche) mental strategies | 2 of 2 |
| opled, ople, pled, osle | outer psyche life expression diamond (month-side beside year) | 9 of 9, 2 of 2, 3 of 3, 2 of 2 |
| personalitychart | a personality chart diamond | 1 of 2 each |
| NcomboM[pos] | N and M together (in that position when one is named) | owner |
| plain number (42, 69) | a good example of that number in a person | owner |

Owner's answers (2026-10-15): `sp` = solar plexus (88sp on Jack Colin
Doherty was a typo for 88sd); `cd` = challenge diamond = higher-self outer
aura digit sum beside the month (also the two psyche challenge numbers side
by side); `mentalflow` = outer psyche mind center beside inner psyche mind
center, confirmed; `ia` dropped. `1900rugrat` is a handle, not a position.
The screen spells every code out (`public/tag-codes.js`, "19fn" reads
"19/1 First name"); the stored tag never changes; a search typed either way
finds it.

Learned from the position search gate (2026-10-15, `server/positions.js`
`TAG_POSITIONS`): "mc"/"ec" also mean the center's diamond (66mc = mind
diamond 66); "osle" = outer psyche LE diamond; a one-digit tag is a digit sum
(9lp = 18/9); "NcomboM<pos>" names the two parts of a center or diamond
(4combo9ec = 13/4 and 9 in the emotion center's circle, main and extra vibration; checked
2026-10-19: 37 of 38 combo tags name the circle, none only the auras; 8combo15publicdiamond = day 8 beside first
name 15/6); a diamond may be tagged with its digits the other way round
(68pd for 86). With these, 1230 of the 1267 position tags on charts with
known inputs agree with the computed charts.
