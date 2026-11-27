// "What this spot is": one line under the number screen's band (owner 2026-11-27). The words are the course's, as
// summarized in .brain/numerology/positions.md (website position articles and the course manual); a spot that file
// does not describe gets no line, never a guess. Keyed "chart.position", then "*.position" for every numeroscope.
const NAME = {
  first: 'The outer, radiant side: the first impression, how they deal with the world.',
  middle: 'Inner processing; a big effect on the life expression, both centers and the bottom auras.',
  last: 'The inner, receptive side: family karma, inner life, the closest ones.',
  le: 'All the names added: what they attract; focus, dreams, goals.',
  upperLeft: 'How strangers and the media see them; it protects the mind center.',
  upperRight: 'What they project to close friends.',
  lowerLeft: 'Colleagues and acquaintances; it protects the emotion center.',
  lowerRight: 'Family, partner, children.',
  heart: 'Communication, values, thought forms, upper body health, cash flow, the brand.',
  heartExtra: "A middle name's influence on the mind center.",
  solar: 'Inner emotional life, self-esteem, sex and love life, lower body health, the gut.',
  solarExtra: "A middle name's influence on the emotion center.",
  spine: 'Inner strength: how their archetype deals with what life brings.',
  pillar: 'The ground they stand on; a strong pillar makes up for weak numbers.',
};
const PSYCHE = {
  mindDiamond: 'What they think about and how their thoughts are structured.',
  emotionDiamond: 'Deepest needs in love and emotion; how emotions from others are processed.',
  lowerRight: 'Childhood (0 to 9).', upperRight: 'The teenage years (9 to 18): the ego structure.',
  lowerLeft: 'The twenties: social intelligence.', upperLeft: 'Adult potential, from 28 on.',
  pillar: 'How the psyche finds stability.', le: 'The development path they follow to feel happy.',
};
const WHAT = {
  'essence.day': 'The base archetype of the personality, 30 to 50% of visible traits; the karmic lesson chosen.',
  'essence.month': "The relationship with the outer world, the conscious mind, the early years: the soul's first name.",
  'essence.year': "The inner world, the subconscious, emotions; shared by a generation: the soul's surname.",
  'essence.outerAura': 'Action code, social strategy: how they meet new people and how they first see them.',
  'essence.outerDiamond': 'Action code, social strategy: how they meet new people and how they first see them.',
  'essence.innerAura': 'Inner emotional life, private coping strategy, the closest friends and loved ones.',
  'essence.innerDiamond': 'Inner emotional life, private coping strategy, the closest friends and loved ones.',
  'essence.topAura': 'Talk between the conscious and the subconscious: the code for living the life purpose.',
  'essence.dharmaDiamond': 'Talk between the conscious and the subconscious: the code for living the life purpose.',
  'essence.littleLp': 'The core of the soul, karma from former lives; felt at home and at night.',
  'essence.bigLp': 'The greatest potential; it awakens after 30, the guiding star.',
  'essence.nexus': "The ego in conversation with the soul: natural talent, the filter used to process one's fate.",
  'essence.target': 'The sweet spot: aiming at it is the fastest spiritual leap.',
  ...Object.fromEntries(Object.entries(NAME).map(([k, v]) => [`name.${k}`, v])),
  ...Object.fromEntries(Object.entries(PSYCHE).flatMap(([k, v]) => [[`outer.${k}`, v], [`inner.${k}`, v]])),
  'outer.first': 'The psyche challenge (psychic month): the turn at 27 to 28.',
  'outer.leDiamond': 'The inner story.', 'inner.leDiamond': 'The inner story.',
  'vocation.mindDiamond': "The heart's intention, the faintest whisper.",
  'vocation.emotionDiamond': 'Desires and longings.',
  'vocation.le': "Heart's desire: will power, day to day.",
  'vocation.big': "Big heart's desire: will power, long term.",
  'personality.le': 'Charisma seen from a distance: who they project day to day.',
  'personality.big': "Who they aspire to become in others' eyes.",
  'personality.mindDiamond': 'How others experience their mind.',
  'personality.emotionDiamond': 'What is felt within 2 meters: body language.',
};
export const spotWhat = (chart, position) => WHAT[`${chart}.${position}`] || null;
