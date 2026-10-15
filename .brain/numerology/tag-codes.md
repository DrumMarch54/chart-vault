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
| nldiamond | name line diamond = first beside last | 4 of 4 |
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

Still open (asked the owner): `sp` (18sp on Elvis Presley = solar plexus
18/9; 88sp on Jack Colin Doherty = spine diamond 88), `ia` (16ia on
Livingston George Allen: both right-side auras of the name chart are 16/7),
`cd` (56cd on Tony Hinchcliffe: only outer aura 14/5 beside month 6 fits),
`mentalflow` (both charts fit outer psyche heart beside inner psyche heart).
`1900rugrat` is a handle, not a position.
Recompute: scratch scripts decode.mjs / decode2.mjs in the session that
made this; the method is in this file's header.
