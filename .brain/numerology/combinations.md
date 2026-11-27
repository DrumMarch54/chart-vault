# Interpreting a combination of numbers (the playbook)

Started 2026-11-26 (owner: "I wanted to train you a little better on how to interpret charts and
combinations ... whenever I click on a position, it pops up combination interpretations of the
surrounding numbers"). A chat does not remember the last chat: THIS FILE is the training. Read it
before writing any words about two numbers together, and add every correction the owner gives to
"The owner's corrections" at the end, dated, in their words.

Status: v1, a Claude session's reading of the sources below. Sections marked OPEN wait for the owner.

## Sources read for this (all in `knowledge/raw/` unless noted)
- `sources/main-combo-guide.md` (Main Combo Guide): every pair the course states, by family
  ("1 + 4 (and 10/1 + 4, 19/1 + 13/4)"), by place (mind center, emotion center, each aura, general).
- `combos-number-notes.md` (the owner's own lines), `nlm-charts-only-combos.md`.
- `chart-notes.md`, `article-auras.md`, `article-numeroscope-dynamics.md`, `nlm-numeroscope-flow.md`,
  `nlm-what-is-a-diamond.md`, `nlm-day-month-aura.md`: what each position IS and how energy moves.
- `nlm-narrative-weaving.md`, `nlm-interpret-dv-combo-le.md`, `nlm-psyche-example-*.md`: worked weaves.
- `system-prompt-new.md`, `interpretation-guide.md` (the course's recipe), `diamond-method.md` p. 13
  (which number goes first; 50 / 30 / 20 weights), `lecture-relationship-between-numbers.md`
  (how 1-9 treat each other), `sources/name-chart-mind-and-emotion-centers.md` (centers, pair by pair).
- Drive docs "File explaination Notebook LM" (1zf-ycTDwSKMDYoU5yk64e-n1_ECt6KBaLwsLx5lhhFo) and
  "File explaination" (12iEA-QT49fF6vjFQnnXLx-f3pzyK-z0_ly1YyLhSxDU): what each course file is good for.
  The owner's rule there: every description may be used as training whatever its context ("I don't care
  so much about context but rather just utilizing the insights"); the Relations book is about people
  but teaches how two digits treat each other; the Psyche Disorders book names what a pair can become.

## What counts as a combination
Two numbers CLOSE TOGETHER or two PRIMARY positions, never two far apart (owner 2026-11-23). The one
list is `diamondsOf` in `server/insight.js`: a diamond's two parts, a center's main + sub vibration,
a center and each aura beside it, an aura and the name at its side, names next to each other, little
personality number + little heart's desire, a psyche chart's mental strategies + its life expression
diamond, the two psyche charts' twins, and any two of day, life path, life expression, names.

## The read, in five steps
1. **The two positions and how they are related.** This decides the SENTENCE; the numbers only fill it.
   See "Position grammar". A number means something different on the left (shown) and the right
   (hidden), above the name line (conscious) and below it (the ego cannot see it).
2. **Each number in its own position.** The course's words for that number in that spot first
   (`server/meaning.js` already finds them), then the number in general (the 1-9 / 10-45 / 46-99 guides).
3. **How the two treat each other.** Look the pair up in the Main Combo Guide by FAMILY first; a
   compound sharpens it (12/3 + 7 is not 3 + 7). Then the modifier rules below. If the course states
   the pair in this very place, that is the answer and it is quoted; elsewhere it is evidence.
4. **The compound they make.** Put the two digit sums side by side and read that number in the guides
   (11/2 with 16/7 = 27/9). The dominant number is the OUTER (first) digit. Diamond Method p. 13: the
   digit sum carries about 50 %, the outer digit 30 %, the inner 20 %; "the outer digit is expressing or
   defending the inner digit" (boss inside, associate outside). OPEN: how to pick the dominant one when
   the chart does not already write the diamond (see Open questions).
5. **Say it.** One woven line, then in balance, then out of balance, then the dichotomy if there is one
   ("on one hand ... on the other"). Reasoning beyond the course is allowed and must be marked as such
   (system prompt: "you can think beyond it with your reasoning, just make it clear").

## Position grammar (the words that tie two spots together)
- First link vs created: day, month, year, names, life expression are innate "first links" (60-70 % of
  the weight). An AURA is created by addition: the behavior, strategy, field of activity (principle of 3).
  A DIAMOND is the structure holding both parents and their aura: WHY they act so (principle of 4).
  A CENTER is where it settles: the conclusion. "Day is who you are, the aura is what you do."
- Parent and its aura (first name 17/8, public aura 16/7): "what you present" becomes "the conclusion
  the world draws about you" once the day animates it. Read parent → aura, cause → effect.
- Two parents of one diamond (day + month, day + first name): the tension and negotiation between them.
- Center, main + sub vibration: the main vibration is the conclusion; the sub vibration is a middle
  name coloring it. Mind center = how thoughts, communication and brand come out; emotion center =
  what is felt inside, self-talk, love and sex life, gut.
- Center and the aura beside it: the aura protects and feeds the center (a 6 aura hides a hard heart
  center; a 7 aura leaves it exposed).
- Top and bottom, left and right: day conscious / life expression unconscious (Shiva / Shakti); first
  name extrovert, "invites the world in" / surname introvert, family karma; left faces the public,
  right the intimate world.
- Ready sentence frames: day "His personality is ..., day to day he is ..., consciously ..." (NEVER "at his core": the core is the life path, owner 2026-11-26); little life expression "... daily life
  keeps attracting ..."; big life expression "... ultimately evolving into ..."; pillar "... anchored
  by ..."; life path "the boss" and day "the employee it hires"; DVLP "the conversation between ego
  and soul"; month "worldview, outer field"; year "the rucksack, the subconscious"; outer aura "social
  strategy"; inner aura "private coping"; dharma diamond "the prevailing wind, the life mission";
  psyche mental strategies "the architecture of thought"; psyche life expression diamond "the
  emotional engine, the inner story"; inner psyche → outer psyche "the inner one fuels or distorts
  the outer one".

## Modifier rules (what one number does to its neighbor)
From the Main Combo Guide unless marked; each is a family rule, the compound makes it sharper.
- **10/1 multiplies.** It turns up whatever stands next to it: good numbers better, unbalanced worse.
- **11/2 weakens and turns up emotion.** Neighbors lose their edge (4 → strange AND weak; 3 → comparing,
  inferior); 15/6 beside it goes hysterical; 7 or 16/7 beside it → oversensitive, anxiety, "voices";
  9 or 18/9 beside it → pleasing, then anger, burnout ("stress"); 17/8 → feels hunted; 8 → over-manages
  out of weakness, power vs powerlessness.
- **12/3 makes one a victim of the neighbor's theme.** With 5: victim of one's own communication, used
  in someone else's message. With 24/6: victim of family and relationships. With 7: ideals misunderstood,
  reality and fiction mixed. With 4: black sheep. With 8: doubts every action, advises and is not
  respected. With 15/6: paranoia, drama, addiction. Masculine neighbors (1, 3, 8, 9, 10, 14, 18, 19) wake
  its loud, boastful side; feminine ones (2, 6, 7, 11, 15, 20) its silent, abused side.
- **6 softens, 5 articulates.** 6 beside 4 turns "odd" into "original"; 5 beside 13/4 gets the strange
  ideas out in a way people can take.
- **Hard numbers (8, 9, 18/9) harden.** 15/6 → manipulative, "the player" (with 9), cold exploiting
  (with 8; in balance: psychological insight, 6 + 8 = 14/5 clear, therapeutic communication); 13/4 →
  rebellious, dangerous contrarian; 5 → harsh selling; 12/3 → clumsy, overbearing; 4 → harsher inner critic.
- **4 and 8 fight.** Accelerator and brake, "on the one hand, on the other", doubt after every start.
  Exception: 13/4 with 17/8 can be genius and refined beauty.
- **15/6 takes the color of its company.** Lifted by 7 (hypnotic, spiritual); darkened by hard and
  unbalanced numbers; with 16/7 open to low energies and nameless anxiety; with 10/1 mood swings,
  narcissistic charisma (owner's notes).
- **16/7 is fear looking for an object.** With 8: fear of consequences, guilt, stinginess (88/7). With
  17/8: visibility allergy, private things made public. With 13/4: fear of death. With 11/2 or 12/3:
  anxiety attacks. With 19/1: loss of greatness, up then down. With 9: the anxiety gets a purpose,
  at the price of overwork and a shut-down body.
- **17/8 needs balanced company.** Masculine numbers around it → wants the spotlight; 11/2 or 12/3 →
  negative spotlight, fear of being seen; 9 → anger that cannot be hidden.
- **9 with 1 (10, 19, 91)** → megalomania, radiates and cannot receive. **9 with 2** = "stress".
  **3 with 9** → harsh and bossy, in balance leadership and knowledge.
- **Named sets:** 6 + 7 "Hollywood combination"; 3 + 5 + 8 "money triad" (12/3 as the 3 = money or
  self-worth trouble); 4 + 5 + 8 "world conqueror"; 3 + 7 intelligence with intuition; 1 + 3 strategy
  and leadership; 5 + 6 popularity; 5 + 7 the urge to travel and discover (57/3).
- **Twice the same number doubles it** (5 with 14/5: reckless, shallow; 12/3 twice: deeply misunderstood).
- **How the single digits feel about each other** (relations lecture; often one-sided): 5 adores 1, 1 is
  neutral; 2 adores 5, 5 runs from 2 (inside 25/7: forever appeasing its own inner 5); 8 uses 5 to do
  its marketing; 9 makes 8 nervous (acts without the plan); 7 loves the pure 1 and leaves at the ego;
  3 thinks 5 talks too much and 6 is too fond of luxury; 4 and 6 are material allies, 6 likes 8
  (wealth); 1 and 4 distrust each other; 4 and 8 do not go together; 2 and 9 strain each other.
- **The same pair reads by place:** mind center = seen and heard by others, how it is said; emotion
  center = felt inside, love life, body; an aura = in that area of life (public, friends, associates,
  love life); psyche = an age and a way of thinking.

## The owner's own lines (the style to match)
From Chart Notes and Combos (number notes); short, concrete, the number in brackets after its word.
- Day 19/1 + month 5 → outer diamond 15/6: "enthusiastic (19/1) magnetism (15/6)"; simpler:
  "enthusiastic (19/1), communication (5)".
- Day 20/2 + month 6 → 26/8: "passionate (20/2), group mother (26/8)".
- Dharma diamond 59/5 + life path 15/6: "a magnetic charm (15/6) to their words (59/5)".
- Life expression 15/6 + pillar 36/9: "CEO (36/9) of the occult (15/6)" or "a very charismatic (15/6)
  group leader (36/9)".
- Communication diamond 75/3 + solar plexus diamond 31/4: "wants to be alone (31/4) with their majestic
  thoughts (75/3)".
- Inner mental strategies 61/7 + inner life expression diamond 59/5: "principled truth teller";
  outer 71/8 + 69/6: "charismatic magician"; 61/7 with 71/8: "principled magician"; 75/3 with 35/8:
  "philosophical chieftain".
- Day 1 + life path 6 (16/7): "finding your identity through (the karma of) relationships".
- 7 + 12/3: "the paranoid conspiracy theorist": the 7's need to look beneath the surface hijacked by
  the 12/3's tendency to feel victimized and turn reality upside down.
- Dharma diamond 24/6 with a plain 4 year: the black-sheep feeling is part of the larger theme, the
  challenge to face in order to become a solid pillar and healer for the family (24/6).
- First name 24/6 + mind center 12/3: "wholesome expander"; in the shadow, the victim (12/3) of the family (24/6).
- Day, little LE, big LE: "At their core an analytical overthinker (12/3), constantly attracting
  high-profile spotlight situations (17/8), ultimately building a legacy of executive power (80/8)."

## A first test reading (Claude, 2026-11-26; NOT yet graded by the owner)
First name 17/8 with public aura 16/7 (the owner's example).
- The math says more than two numbers: the public aura is the first name's digit sum plus the day's,
  so the day is an 8 (8, 17/8 or 26/8) and the public diamond is 88/7.
- Positions: the first name is what is presented and how the world is let in; the public aura is the
  conclusion strangers and the public draw once the day animates that name.
- Numbers: 17/8 the star, wants to be noticed, can dim its own light, "burned at the stake"; 16/7 fear
  of loss, withdrawal, the one number to avoid in an aura ("anxiety, loss").
- The course on the pair: 16/7 with 17/8 "can create a strong visibility allergy and fear of the world.
  Sensitive private matters become public, creating great fear and anxiety." 88/7: "holding onto money
  and resources (8) because of fear (16/7)"; "feeling of walking a tightrope".
- Woven: "A name built to be seen (17/8), met by a public that feels unsafe (16/7): the star who
  flinches from the spotlight." In balance: mystique, a rare and careful public presence, weighing the
  consequence of every appearance. Out of balance: stage fright, hiding, dread that private things
  will come out.

## Open questions for the owner
1. "File explaination Notebook LM" ends "In closing I have a few important number combination
   interpretation principles for you to keep in mind.." and then stops. What are they?
2. Which number is the dominant (outer) one when two numbers are put side by side and the chart does
   not already write the diamond? In the example 11/2 + 16/7 = 27/9 the 11/2 came first.
3. What a pop-up should hold, and how long.

## The owner's corrections
2026-11-26, after the first test reading ("it seems pretty good ... I want you to do more"):
- Say what the POSITION is for the person, in plain words. "A name built to be seen" was off: "what does
  the first name actually represent for the person? It's like how you greet the world."
- Every reading shows WHY: "be clear in the reading why you come to that conclusion".
- Which number is primary: "the primary energy is always ... the more dominant position. If it's between
  the day vibration and the public aura, the day vibration is a lot more influential", the aura secondary.
- The joined number (the diamond the two make) is a SECOND LEVEL on top of piecing the two together. The
  owner has not decided whether readings carry it: write it as its own labeled line so it can be judged.
- The `nlm-*` documents (narrative weaving and the like) are NotebookLM's answers the owner only skimmed:
  "might be really useful, but there also might be things that are outdated or misinterpreted ... have
  some healthy skepticism". The course books and the owner's own notes outrank them.
- Open question 1 is dropped: "you could establish your own principles based on the material".
- Order of work: this playbook first, then the redesign of the number meaning screen (another chat).
2026-11-26, second round ("you're doing pretty good with level one ... it can be improved"):
- NO joined number (level two) for now: "let's just not even bother with the level two ... if I want to
  implement that in the future, I will."
- There are several MODES of saying one combination, and the app should carry more than one:
  1. a short phrase on the pair with the positions pulled back: "direct communication" (5 with 9: talkative
     and good at it, with a number that is masculine, bold and outright), "nervous celebrity" (first name
     17/8, public aura 16/7);
  2. each number in its position, then held together: "his personality is light and almost zippity (5), but
     he has this inner strength and life themes of perseverance he has to learn over time (9)";
  3. the dynamic between the two, cut and dry (liked: "Guarded inside (8), magnetic with a partner (15/6):
     reads them well, lets little in");
  4. the psychological traits each number can carry (OCD, self-doubt, low self-confidence, drama) woven together.
- One analogy is one way, never the only way: the boss and the worker for life path and day "was cool, but
  there's also other ways to explain it".
- The explaining is wanted ("you could also sort of nicely explain things out like you did").
2026-11-26, third round:
- A center's main + sub vibration is read as WHAT IS IN THE CIRCLE. Do not say "from the middle name": "the
  middle name is kind of not a part of this combination interpretation ... it kind of sounds a bit confusing.
  You could just discuss what's right there in the center." (Model: "inside he wants to tear up what exists
  and create new things, but then there's this opposite energy he feels as well.")
- No part of a card may repeat another in different words ("you're kind of repeating the same thing in
  different ways"). Each part must add something.
- Go PAST the material: the course's stated combinations are wanted, and so is Claude's own reasoning built
  on them and on each number alone ("there's much more you could have discussed beyond what was already
  mentioned in the material ... I'm handing the wheel over to you to create the best stuff").
2026-11-26, fourth round:
- Liked as written ("I love that interpretation"): "Inside, he wants to tear up what exists and build new
  (13/4), and feels an opposite pull ... that says hold the line (8)."
- But never "just as strong" for a sub vibration: "the sub vibration is less influential than the main
  vibration ... it's coloring the main vibration." Primary and secondary hold everywhere; still, part of the
  read is simply what each number is and the dynamic between them ("I don't want that to overly confuse you").
- EVERY WORD MUST TRACE TO ONE OF THE TWO NUMBERS, and the number stands in brackets after it. Understood at
  once: "his care (24/6) gets misread (12/3)". Not understood: "misread as control or neediness" and an "at its
  best" line whose words pointed at no number. (Claude's rule from this: a claim that cannot carry a number
  in brackets is cut.)
2026-11-26, fifth round: the brackets after every claim are approved ("yes"); the card has the parts The Phrase,
By Position, What the Course Says, My Reasoning (labeled as Claude's), At Its Best. A batch of ten was written
for grading in the chat that day: day 10/1 + life path 15/6; first name 9 + public aura 11/2; mind center 3
with 7; emotion center 6 with 11/2; emotion center 9 with 10/1; day 7 + first name 15/6; personality number 8
+ heart's desire 15/6; day 9 + surname 16/7; emotion center 7 + love life aura 15/6; first name 13/4 +
surname 17/8. The graded ones belong below as model cards, word for word.
2026-11-26, sixth round, on the batch of ten ("this is undoubtedly the best we've made it so far. Everything is
fantastic"); the cards stand except:
- THE DAY IS NOT "THE CORE": "When I hear core, I think of something more like the life path." The day is the
  personality (Chart Notes: "Day = Main Personality", "LP = Internal Core"). The "At their core" frame came from
  a NotebookLM doc (`nlm-interpret-dv-combo-le`), not from the owner.
- When the math gives away a third number (first name 9 + public aura 11/2 means the day is a 2), read ALL THREE
  in one line, in order: day, name, the aura they make. A bullet that named the day and left the aura out
  "is missing something ... I'm sure there's a way to do it where you're interpreting all three".
- OVERLAP: say what the two numbers have in common, when they do: "six and eleven have a lot of similar themes
  ... a lot of love in general or emotionality". A shared theme is doubled.
- A course quote must be understood ALONE: say whose chart or which place it is about before quoting ("she did
  not show it and kept her guard up" meant nothing without that).
- A reasoning line says one plain thing. "6 is the main one, so love basically works (6). The cost is what he
  gives up to keep it (11/2)" was not understood.
2026-11-26, a second batch of six with every rule applied, sent for grading: mind center 4 with 6; emotion
center 5 with 8; day 8 + first name 15/6 making public aura 14/5; first name 7 + life expression 5 making
associates aura 12/3; day 3 + life path 9; day 1 + first name 7 making public aura 8. Card parts now: The
Phrase, By Position, What They Share (or What Sets Them Apart), What the Course Says, My Reasoning, At Its Best.
Still to do: the psyche charts, then life expression + pillar.
2026-11-27, seventh round (second batch: "everything looks pretty good ... we're good to move on"):
- Not every chart is a "he": "sometimes the chart we'll be looking at will be a she". (Claude's choice until the
  owner says otherwise: cards are written with "they", since the vault stores no gender.)
- Not understood: "Freedom for himself (5), rules for those close to him (8)" for an emotion center 5 colored
  by 8. A line that leans on a course statement must say so in the line, and a sub vibration only tints.
- Open: "we're going to have to get clear on when you interpret three things at a time and when two."
  Claude's proposal: THREE when the numbers form a triangle the chart draws (two parents and the aura they
  make: day + first name + public aura; first name + life expression + associates aura; day + month + outer
  aura); TWO everywhere else (inside one circle, a center and the aura beside it, day + life path, names side
  by side, the same spot in two charts).

## Psyche charts: how their pairs are read (Claude, 2026-11-27, from the Psyche book pp. 43-53; not yet graded)
- The book's own method is to COMPARE THE SAME SPOT IN THE TWO CHARTS, in this order: life expression diamonds
  (how each supports the other, where they conflict), mental diamonds, challenge numbers, pillars; then zoom out.
- Inner psyche = the psyche by nature, "pure", the month and year seen with neutral eyes; the owner's words:
  "the foundational psychological architecture of your soul". Outer psyche = the same psyche once the day (the
  ego, the personality) takes up space; "how the ego influences and interprets this core structure". Sentence
  frame: "By nature ... (inner). Once the personality steps in ... (outer)."
- What each spot is: mental diamond (the owner's "mental strategies") = how thoughts are processed and what drives
  the way of speaking; life expression diamond = how emotions are organized, how one feels deep inside, the inner
  story; emotion center = the emotional response that results (a 9 there, in any chart: "a highly charged inner
  self-critical voice fueled by anger", p. 45); challenge number = the step into full adulthood, sharpest at 27;
  pillar = how the psyche RESTS (digit sum table p. 50-51, nuances for 12, 13, 15, 16, 17, 18, 24, 26).
- A teen number is the pure number with the ego in it (p. 36-37): 12/3 overthinks and feels a victim, 13/4 the
  outsider, 14/5 adds business, 15/6 makes drama, 16/7 fear, 17/8 hesitates in the spotlight, 18/9 overreacts.
- The numbers in these spots are often compounds 46-99: say what the two DIGITS share too (59/5 and 69/6 both
  have 9 as the inner digit, "the boss inside").
- The book itself joins twins into one number (95/5 with 15/6 = 65/2; 8 with 18/9 = 98/8 "The Legacy Builder").
  Left out of the cards while the owner has level two switched off.
- First psyche batch, on the owner's own chart (19 May 1998), sent for grading: mental strategies 61/7 and 71/8;
  life expression diamonds 59/5 and 69/6; inner mental strategies 61/7 on inner life expression diamond 59/5;
  challenge numbers 5 and 15/6; pillars 19/1 and 24/6; emotion centers 6 and 9.
2026-11-27, eighth round, on the first psyche batch ("pretty good ... that's definitely a way of interpreting
psyche charts"):
- Not understood: "Feels a thing plainly (59/5), delivers it with charm (69/6)". "What does 'feels a thing
  plainly' mean?" A line names a concrete thing a person does; no loose verbs.
- SEVERAL PHRASES per combination, not one: "it would be nice if you added some more ... there's multiple ways
  to put phrases on these combinations ... those are really useful."
- The psyche charts get the SAME cluster readings as the name chart, on top of comparing the two charts:
  "we should be able to interpret the combinations of stuff clustered together in a psyche chart": the outer
  psyche challenge number with the aura above it (the owner says "public aura" for the upper left one in a
  psyche chart too); "the outer associates diamond in the psyche chart, flanked by the solar plexus diamond".
- A NEW KIND OF COMBINATION, in every numeroscope: an aura's diamond with the center's diamond beside it
  ("that's another combination interpretation with any numeroscope chart"). To be added to `diamondsOf` in
  server/insight.js when the cards are built (CLAUDE.md: a new example from the owner goes there).
- "I hope you're learning from all these things I'm pointing out throughout this entire chat, so that you can
  improve the way you do this when we finally implement it": this section IS that; the build must read it.
2026-11-27, ninth round ("everything's good"): three numbers in one card is too much: "whenever you try to
interpret three of them, it just becomes kind of like too much or something. I mean it's good, but I don't
know." (Claude's answer: every card is TWO numbers; when the two make an aura, one closing line names it.)
The owner then asked how this gets built; the design talk follows in the chat, nothing decided yet.

## How it gets built (the owner's decisions, 2026-11-27; mockup https://claude.ai/artifact/NpKJYm5nJWbMsE2e7ANTX1)
- BOTH: "both sounds good. If one is missing that wasn't already written here, then I should be able to tap it
  in the app and it writes it there." A card depends only on the kind of pair and the two numbers, never on the
  person: written once (by a Claude session ahead of time, or by the app's AI on the first tap, through
  server/ai.js, the cost shown on the row before the tap), stored, then free on every chart with that pair.
- Tapping a number lists its neighbors as rows, each with the pair's phrase; a row opens the card.
- Layout A (folds), "I kind of like A a little more": the pair, the phrases (one big, the others under it),
  By Position, then folds: The Reasoning, In Balance and Out of Balance (green / red), What They Share, What the
  Course Says; "Made together with ..." for the third number; This Is Off (the owner types what is wrong, the
  card is rewritten, the note is kept as a rule).
- THE CARD IS NEVER SHORTENED TO FIT: the first mockup dropped the reasoning lines and the owner noticed at once
  ("did you shrink the little interpretive bits to fit them in the app or something?"). Folding is how it fits.
- 2026-11-27, THE MOCKUP WENT WRONG TWICE, and the owner was angry ("we just got done going through multiple
  rounds ... the shit you were giving me here in the chat was good. I thought that's what we were gonna put in
  the app ... you just plopped all this text together"). What Claude did: wrote NEW, ungraded lines for the
  mockup instead of a graded card, renamed and replaced the parts (an In Balance / Out of Balance split in place
  of At Its Best), and set the reasoning as run-together paragraphs. One new line made no sense to the owner:
  "Hides from chances that would have suited them (16/7)".
  RULES: (1) the card in the app has EXACTLY the parts graded in the chat, by the same names, in the same order:
  The Phrases, By Position, What They Share, What the Course Says, My Reasoning, At Its Best. No In Balance /
  Out of Balance split. (2) My Reasoning is a list of separate points, a dot and a line between them, never
  paragraphs. (3) A mockup, a test or an example uses a card the owner graded, word for word; never text made
  up for the occasion. (4) The corrected layout A above is superseded by this.
- 2026-11-27: the owner wants the hard side too ("I like the idea of having the unbalanced or out of balance
  thing as well"): ONE part "At Its Worst" right under "At Its Best", the same size. Nothing else changes.
  But the first two lines were poor: "with staying power? That just doesn't really make sense". Best and worst
  lines say a plain thing a person does, each half with its number, like every other line.
- ONE SCREEN, ONE JOB (owner 2026-11-27): the other chat ("Fix the number meaning screen", session
  session_012fMnaA3usFXnoYaXapSkoZ, branch claude/fable-position-screen-2ug5gr, nothing built) is redesigning
  what opens when a number is tapped; the cards belong on that screen. Its findings, measured on Elvis: every
  aura gets the mind center's sub diamond (public aura 17/8 shown with 77/5, not connected); the real ones are
  missing (public diamond 89/8, mental diamond 88/7; the day lacks spine diamond 87/6, public diamond, outer,
  inner, target; life expression, month, year, pillar show no diamonds); empty parts get the general number
  text as filler; the title three times, Quick Gist repeats the points; 3 to 5 screens long; psyche spots show
  name-change advice. The owner's asks there, all still wanted: the course's own words for the number IN THAT
  POSITION; only the diamonds really connected to the tapped number, all of them; the general guide text as a
  pop-out; an explanation "in the correct context" where the course has none (88/7 as the name chart's mental
  diamond); the sub-chart books' words for diamonds and centers; no repeats; layout and colors reassessed.
- 2026-11-27, THE OWNER DOES NOT WANT TO PAY FOR CARDS: "obviously going to want to try and write all these
  descriptions for the combinations here in Claude. I'm not going to want to pay the money to do them in the
  app." So: Claude sessions write the cards (helpers following this playbook, the way knowledge/bits.json was
  made); the app's paid writing is at most an optional button, never the plan. Measured the same day on the 665
  seeded charts: about 9,200 different cards for the essence, name and psyche charts alone when each exact pair
  in each spot gets its own card (name chart 3,326; half of all pair slots are covered by about 1,700 cards;
  about 3,000 pairs occur once). Vocation and personality come on top. Too many to write or grade in one go:
  write in order of use, and let the app note which missing cards were tapped so the next session writes those.
- 2026-11-27, the screen's first part stays AS IT IS TODAY: "I like the way the screen kind of currently is in
  some way ... it's already written out, and if I actually want to see the full course words, then there's a
  button for that." So: the short points first, the Course Words button for the full text; not the raw course
  text up front. Best and worst lines approved in this plain form ("that's much better"): "changes things for
  real (13/4) and sees them through to the end (8)" / "wants out (13/4) but won't let themselves go (8), so
  they stay and resent it".
- The owner did not follow the talk of counts and costs ("I have no clue what you're even talking about"):
  say it in three plain lines, no numbers of cards, no tables.
- Whole-screen mockup (Elvis, public aura 17/8): https://claude.ai/artifact/ (see the chat of 2026-11-27);
  order: the number in this spot (short points + Course Words), With Its Neighbors (rows that open the
  cards), Connected Diamonds (only real ones, what makes it / what it helps make), About the Number in General
  (folded), Ask About This. One new card on it awaits grading: public aura 17/8 with mind center 16/7.
- 2026-11-27, in the card-writing chat, after the first five cards by the brief (batch-02): "Yes, keep writing
  batches." and "I don't need to stop and check the shit every time. Just keep going." So: batches are written,
  merged and published without a check-in between them; the owner grades in the app. Psyche aura cards (batch-04
  on) take their words from the Hub's Childhood Aura and Twenties Aura documents and the personal reports; the
  frame is "As a child ... / In their twenties ..." for the outer psyche chart and "By nature ..." for the inner.
