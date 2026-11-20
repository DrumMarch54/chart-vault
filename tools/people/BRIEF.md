# Who each person is: research brief

The vault holds numerology charts of people (and a few groups, companies, places). The owner wants to know
WHO each one is, so numbers can later be compared with kinds of people. You get one batch file
(`tools/people/in/batch-NN.json`): a list of `{ title, ids, names, dates, tags }`.
`title` = how the app names the chart, `names` = the birth name(s) typed in, `dates` = birth date(s)
(YYYY-MM-DD; for a company, the founding date), `tags` = the owner's own tags (hints: "youtube", "rapper",
a run-together stage name, ...).

Write ONE file, `tools/people/out/batch-NN.json`: a JSON array, one object per input entry, same order,
every entry present. Touch no other file. Do not commit.

## Rules
- Facts only, each one checkable. Never guess. An unsure field is `null` / left out, never invented.
- Use what you know, and CHECK with web search whenever you are not certain who this is, for anyone
  obscure (small YouTubers, streamers, local news figures), and for anything recent (2025-2026: deaths,
  arrests, convictions, new jobs). Well-known people (a president, a famous rapper) need no search unless
  something recent may have changed.
- The birth date is the identity check: the person you describe must match the name AND the date in
  the batch (a day or a year off = say so in `note`; the owner may have typed it wrong, do not "fix" it).
- Not clearly a public figure after one or two searches = `"kind": "unknown"`, nothing else filled in.
  Never dig for information on a private person; never record an address, family member, employer or
  anything else about someone who is not publicly known.
- Never record sexual orientation, gender identity, health or religion as a fact about a person unless
  it is what they are publicly known FOR in their work (a pastor's religion is their job). Ignore the
  owner's tags of that kind.
- Crimes: only charges, convictions or findings a reliable source reports. Say "charged", "convicted",
  "accused", "acquitted" exactly as it stands.
- `sources`: 1-3 URLs you actually opened or that the search returned for this person (Wikipedia is
  fine). No URL you did not see. Empty list if you relied on what you already know; then `"checked": false`.

## The object
```json
{
  "title": "exactly as given",
  "ids": [629],
  "kind": "person | group | company | place | event | fictional | unknown",
  "known_as": "Andrew Tate",
  "summary": "One plain sentence, max 25 words: what they are known for.",
  "fields": ["influencer", "athlete"],
  "roles": ["kickboxer", "online personality"],
  "country": "US",
  "born": "1986-12-01",
  "date_matches": true,
  "died": null,
  "death_cause": null,
  "age_at_death": null,
  "events": [ { "year": 2022, "what": "Arrested in Romania on human trafficking charges" } ],
  "flags": ["charged_crime"],
  "fame": 4,
  "checked": true,
  "sources": ["https://en.wikipedia.org/wiki/Andrew_Tate"],
  "note": ""
}
```
- `fields`: one to three from THIS list only, most important first:
  `music, rapper, acting, comedy, sports, combat_sports, politics, activism, commentary, journalism,
  youtube, streaming, influencer, podcast, business, tech, finance, religion, spirituality, occult,
  science, medicine, writing, art, fashion, film_tv, military, law_enforcement, royalty, crime,
  mass_violence, cult, conspiracy, education, other`
  (`crime` / `mass_violence` only when that is what the person is known for.)
- `roles`: one to four free words, lower case, the specific job ("rapper", "senator", "twitch streamer").
- `country`: two-letter code of the country they are mainly associated with.
- `born`: the real birth date from your source, or null. `date_matches`: does it equal a date in the batch
  (null when either is missing).
- `death_cause`: one of `natural, illness, accident, overdose, suicide, homicide, executed, killed_by_police,
  unknown`, or null if alive.
- `events`: up to six turning points with a year: rise to fame, biggest success, arrest, conviction,
  prison, scandal, bankruptcy, election, the act they are known for, death. Short, factual.
- `flags`: any that are TRUE and sourced, from this list only:
  `convicted_crime, charged_crime, violent_crime, killed_someone, prison, died_young (before 40),
  suicide, overdose, murdered, addiction_public, billionaire, self_made_wealth, bankruptcy,
  major_scandal, cancelled_or_banned, elected_office, head_of_state, founder, cult_leader,
  child_star, military_service, religious_leader, major_award`
- `fame`: 1 = barely known online, 2 = niche following, 3 = well known in their field,
  4 = widely known in their country, 5 = known worldwide.
- `note`: anything the owner should check (date differs, two people fit, could not confirm). Else "".

For `group` / `company` / `place`: `born` is the founding date, `summary`, `fields`, `events`, `sources`
as above; skip what does not apply.

When done, reply with only: the batch number, how many of each `kind`, and the titles you marked
`unknown` or left a `note` on. Make sure the file parses as JSON (`node -e "JSON.parse(require('fs').readFileSync(...))"`).

## Second pass: checking (batches 21 and up)
Each entry also carries `first_pass`: what an earlier session wrote, often from memory (`checked: false`) or `unknown`
because it could not search. Your job is to CHECK it with web search, not to rewrite it from memory again.
- Hard cap: 40 WebSearch calls for your whole batch (the allowance is shared with other sessions). Count them.
  Spend them in the order given (the list is sorted most-needed first). One search per entry is usually enough.
- Confirm or correct: who they are, the birth date (and `date_matches`), anything from 2025-2026 (arrests, verdicts,
  deaths, elections), and every flag. Drop a flag no source supports. Set `checked: true` and fill `sources` only for
  entries you actually searched.
- An entry you did not get to: copy `first_pass` unchanged. Never mark something unknown just because you ran out.
- An entry first marked `person` that turns out to be the wrong person or nobody public: `kind: "unknown"` (this
  REMOVES the earlier record, so be sure).
- Output: same object shape as above, without `first_pass`.
