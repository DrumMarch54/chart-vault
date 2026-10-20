/* The owner's tag codes, spelled out for the screen. Tags are STORED exactly as written ("19fn");
   this only changes how they read ("19/1 First name") and lets a search match either form.
   Decoded against the charts themselves: .brain/numerology/tag-codes.md. Runs in the browser
   (window.TagCodes) and in node (vm) for the server's search. */
(function (root) {
  'use strict';
  const CODES = {
    day: 'Day', month: 'Month', year: 'Year',
    lp: 'Life path', llp: 'Little life path', hlp: 'Higher life path',
    od: 'Outer diamond', dharma: 'Dharma diamond', dvlp: 'Day + life path diamond', cd: 'Challenge diamond',
    fn: 'First name', mn: 'Middle name', ln: 'Last name', name: 'Name', le: 'Life expression',
    mc: 'Mind center', ec: 'Emotion center', sp: 'Solar plexus', pa: 'Public aura', aa: 'Associates aura',
    pd: 'Public diamond', md: 'Mental diamond', ed: 'Emotional diamond', sd: 'Spine diamond', plr: 'Pillar',
    nldiamond: 'Name line diamond', publicdiamond: 'Public diamond',
    psn: 'Personality number', hd: "Heart's desire", vmd: 'Vocation mental diamond', ved: 'Vocation emotional diamond',
    pmd: 'Personality mental diamond', ped: 'Personality emotional diamond', personalitychart: 'Personality chart',
    opms: 'Outer psyche mental strategies', ipms: 'Inner psyche mental strategies', oms: 'Outer psyche mental strategies',
    opled: 'Outer psyche life expression diamond', ople: 'Outer psyche life expression diamond', pled: 'Outer psyche life expression diamond',
    osle: 'Outer psyche life expression', ipled: 'Inner psyche life expression diamond', mentalflow: 'Mental flow', emotionalflow: 'Emotional flow',
  };
  const digitSum = (n) => { n = Math.abs(Math.trunc(n)); while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
  const num = (n) => (n < 10 ? String(n) : `${n}/${digitSum(n)}`);
  const label = (code) => {
    const c = code.toLowerCase();
    if (CODES[c]) return CODES[c];
    if (c.startsWith('nr') && CODES[c.slice(2)]) return CODES[c.slice(2)] + ', reduced';
    return null;
  };
  // "19fn" -> { numbers: [19], code: 'fn', label: 'First name' }; "8combo15" / "13and31lp" -> two numbers; null if not a code tag.
  function parse(name) {
    const m = /^(\d+)(?:(?:combo|and)(\d+))?([A-Za-z]*)$/.exec(String(name));
    if (!m) return null;
    const numbers = [Number(m[1])]; if (m[2]) numbers.push(Number(m[2]));
    if (!m[3]) return { numbers, code: '', label: '' };
    const l = label(m[3]);
    return l === null ? null : { numbers, code: m[3], label: l };
  }
  // What the screen shows for a tag name. Plain names come back unchanged.
  function pretty(name) {
    const p = parse(name);
    if (!p) return String(name);
    if (p.code.toLowerCase().startsWith('nr')) return `${p.numbers[0]} ${p.label}`;
    return `${p.numbers.map(num).join(' + ')}${p.label ? ' ' + p.label : ''}`;
  }
  // A typed search like "19/1 first" or "19 first name" -> the stored forms it could mean ("19fn", "19first").
  function expandQuery(q) {
    const m = /^\s*(\d+)(?:\/\d)?\s*(?:\+\s*(\d+)(?:\/\d)?\s*)?([A-Za-z][A-Za-z ']*)?\s*$/.exec(String(q));
    if (!m) return [];
    const words = (m[3] || '').trim().toLowerCase();
    const out = [];
    for (const [code, l] of Object.entries(CODES)) {
      if (!words || l.toLowerCase().startsWith(words) || (words.endsWith(' reduced') && l.toLowerCase().startsWith(words.slice(0, -8)))) {
        const c = words.endsWith(' reduced') ? 'nr' + code : code;
        out.push(m[2] ? `${m[1]}combo${m[2]}${c}` : `${m[1]}${c}`);
        if (m[2]) out.push(`${m[1]}and${m[2]}${c}`);
      }
    }
    return [...new Set(out)];
  }
  // The archetype name of every compound number (.brain/numerology/number-names.md).
  const NAMES = {
    10: 'The Cosmic Fortunemaker', 19: 'The Heavenly Prince', 28: 'The Ambitious Lion', 37: 'The Royal Star of Taurus', 46: 'The Perfect Prodigy', 55: 'Master Communicator', 64: 'The Idealistic Perfectionist', 73: 'The Secret Millionaire', 82: 'The Religious Leader', 91: 'The Golden Titan',
    11: 'Master Harmonizer', 20: 'The Cosmic Torchbearer', 29: 'The Empowerment Coach', 38: 'The Powerful Peacemaker', 47: 'The Intuitive Innovator', 56: 'The Charismatic Orator', 65: 'The Beloved Caretaker', 74: 'The Selfless Saviour', 83: 'The Empathetic Enforcer', 92: 'The Community Sentinel',
    12: 'The Expansive Dynamo', 21: 'The Ambitious Alchemist', 30: 'The Cosmic Thinker', 39: 'The Tenacious Boss', 48: 'The Revolutionary Politician', 57: 'The Adventurer', 66: 'Master Matriarch', 75: 'The Majestic Philosopher', 84: 'The Pioneer', 93: 'The Polymath',
    13: 'The Reformer', 22: 'Master Builder', 31: 'The Unorthodox Genius', 40: 'The Cosmic Hermit', 49: 'The Chaos Organizer', 58: 'The World Conqueror', 67: 'The Mysterious Beauty', 76: 'The Dreamweaver', 85: 'The Strategic World Conqueror', 94: 'The Systems Architect',
    14: 'The Mediator', 23: 'The Royal Star of the Lion', 32: 'The Influencer', 41: 'The Merchant', 50: 'The Cosmic Communicator', 59: 'The Truth Herald', 68: 'The Heartfelt Organizer', 77: 'Master Seeker', 86: 'The Social Architect', 95: 'The Assertive Orator',
    15: 'The Enchanter', 24: 'The Queen', 33: 'Master Teacher', 42: 'The World Healer', 51: 'The Socialite', 60: 'The Cosmic Nurturer', 69: 'The Alchemical Lover', 78: 'The Occultist', 87: 'The Wizard', 96: 'The Magnetic Maestro',
    16: 'The Awakening Soul', 25: 'The Spiritual Voyager', 34: 'The Spiritual King', 43: 'The Revolutionary', 52: 'The Philosophical Adventurer', 61: 'The Ethical Purist', 70: 'The Cosmic Seeker', 79: 'The Analytical Sage', 88: 'Master of Karma', 97: 'The Transcendentalist',
    17: 'The Star', 26: 'The Conductor', 35: 'The Chieftain', 44: 'The Master of Structure', 53: 'The Empowerment Advocate', 62: 'The Family Protector', 71: 'The Radiant Magician', 80: 'The Cosmic Powerhouse', 89: 'The Archetypal Visionary', 98: 'The Legacy Builder',
    18: 'The Warrior', 27: 'The Good Shepherd', 36: 'The Triad Manifestor', 45: 'The Innovative Leader', 54: 'The Communication Leader', 63: 'The Veiled Strategist', 72: 'The Unifying Leader', 81: 'The Master of the Bow', 90: 'The Cosmic Warrior', 99: 'Master Finalizer',
  };
  root.TagCodes = { CODES, NAMES, parse, pretty, expandQuery, digitSum };
})(typeof globalThis !== 'undefined' ? globalThis : this);
