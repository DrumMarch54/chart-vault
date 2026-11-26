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
- Ready sentence frames: day "At their core, consciously ..."; little life expression "... daily life
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
