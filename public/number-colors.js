/* Number colors exactly as the paid Quick Numeroscope tool colors them, read off the tool's own page script
   (tools/color-study/paid: fetch.mjs reads the live tool, gen.mjs writes this file; do not edit by hand).
   TABLES: one table per kind of position, index = the number (1..99), value = a color class. RULES: per number
   of words in the name, which table each position uses (the tool switches tables with the word count).
   PALETTE: the tool's colors; gray = neutral, gNN = NN % toward green, rNN = NN % toward red. The big life
   expression is drawn at a third of its strength (n-big). Fixed: day numbers and the essence chart dark,
   psyche charts blue, letter count blue. Numbers of 100 and more have no table entry and draw dark. */
(function (root) {
  'use strict';
  const PALETTE = {"gray":"rgb(127, 127, 127)","g20":"rgb(102, 153, 102)","r40":"rgb(178, 77, 77)","r20":"rgb(153, 102, 102)","g40":"rgb(77, 178, 77)","r60":"rgb(204, 51, 51)","g60":"rgb(51, 204, 51)","g50":"rgb(64, 191, 64)","g80":"rgb(26, 229, 26)","g100":"rgb(1, 254, 1)","r80":"rgb(229, 26, 26)","r100":"rgb(254, 1, 1)","r10":"rgb(140, 115, 115)","r30":"rgb(165, 90, 90)","g30":"rgb(90, 165, 90)"};
  const TABLES = {
    "Name": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g20","r40","r40","g20","gray","r20","r40","g40","r60","g60","g60","g50","r60","g80","g80","g40","r20","g60","r20","r40","gray","r40","g60","g60","g40","r40","g60","g100","r40","r40","r40","g20","g40","r40","r80","g20","g60","gray","r80","r40","g60","r40","g20","gray","g20","gray","gray","r20","gray","gray","g20","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "Aura": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g20","r80","r60","gray","g60","g20","r60","g20","r80","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "AuraUS": ["gray","g40","g40","gray","g40","g40","g40","gray","gray","g40","gray","gray","g20","g60","g60","gray","g20","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","r100","r100","r100","r100","r100","gray","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100"],
    "Center": ["gray","gray","gray","r20","gray","g60","gray","r80","r60","g60","r40","r60","r20","g60","g20","r80","r20","r80","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "CenterUS": ["gray","g40","g40","gray","g40","g60","g40","r10","gray","g60","gray","gray","gray","g60","g60","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","r100","r100","r100","r100","r100","gray","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100"],
    "Lifeexpression": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g60","r40","r40","gray","g80","gray","r60","g20","r60","g80","g80","g80","r40","g100","g80","g20","r40","g60","r20","r40","gray","r40","g60","g50","g40","r30","g60","g100","r40","r40","r40","g20","g40","r40","r80","g40","g60","gray","r80","r40","g60","r40","g20","gray","g20","g40","gray","r20","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "Spine": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g20","r20","r20","gray","g40","gray","r40","g40","r20","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","r100","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "Pillar": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g60","r40","r40","gray","g60","gray","r60","g60","r40","g60","g60","g80","r40","g100","g80","g40","r40","g80","r20","r40","gray","r40","g80","g80","g60","g20","g80","g100","r40","gray","r40","g60","g60","gray","r40","g80","g80","gray","r40","r20","g80","r20","g20","gray","g60","g40","gray","gray","gray","gray","g20","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "Undervib": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray","gray"],
    "UndervibUS": ["gray","gray","gray","gray","gray","gray","gray","gray","gray","g20","gray","gray","g20","g20","g20","gray","g40","gray","g60","g60","g50","r10","g80","g80","g40","r20","g60","gray","gray","gray","r40","g60","g60","g40","r10","g60","g100","r40","r40","r40","g20","g40","r40","r80","g40","g60","gray","r80","r40","g60","gray","g20","gray","g20","g40","gray","gray","g20","gray","g30","gray","gray","gray","g20","gray","gray","gray","gray","gray","gray","g20","g40","g60","r20","gray","gray","gray","g40","r20","gray","gray","gray","r30","r80","g20","gray","g20","r40","g40","gray","gray","r20","r20","r20","gray","gray","r20","gray","r20"],
  };
  const RULES = {
    "1": {
      "first": "Name",
      "last": "Name",
      "spine": "Spine",
      "pillar": "Pillar",
      "c.first": "Name",
      "c.pillar": "Pillar",
      "v.first": "Name",
      "v.last": "Name",
      "v.pillar": "Pillar"
    },
    "2": {
      "first": "Name",
      "last": "Name",
      "le": "Lifeexpression",
      "big": "Lifeexpression",
      "ul": "Aura",
      "ur": "Aura",
      "heart": "CenterUS",
      "ll": "Aura",
      "lr": "Aura",
      "solar": "CenterUS",
      "spine": "Spine",
      "pillar": "Pillar",
      "c.first": "Name",
      "c.last": "Name",
      "c.le": "UndervibUS",
      "c.big": "UndervibUS",
      "c.ul": "AuraUS",
      "c.ur": "AuraUS",
      "c.heart": "CenterUS",
      "c.ll": "AuraUS",
      "c.lr": "AuraUS",
      "c.solar": "CenterUS",
      "c.spine": "Spine",
      "c.pillar": "Pillar",
      "v.first": "Name",
      "v.last": "Name",
      "v.big": "UndervibUS",
      "v.ul": "AuraUS",
      "v.ur": "AuraUS",
      "v.heart": "Center",
      "v.ll": "AuraUS",
      "v.lr": "AuraUS",
      "v.solar": "CenterUS",
      "v.spine": "Spine",
      "v.pillar": "Pillar"
    },
    "3": {
      "first": "Name",
      "middle": "Name",
      "last": "Name",
      "le": "Lifeexpression",
      "big": "Lifeexpression",
      "ul": "Aura",
      "ur": "Aura",
      "heart": "Center",
      "heartExtra": "Center",
      "ll": "Aura",
      "lr": "Aura",
      "solar": "Center",
      "solarExtra": "Center",
      "spine": "Spine",
      "pillar": "Pillar",
      "c.first": "Name",
      "c.middle": "Name",
      "c.last": "Name",
      "c.le": "UndervibUS",
      "c.big": "UndervibUS",
      "c.ul": "AuraUS",
      "c.ur": "AuraUS",
      "c.heart": "CenterUS",
      "c.heartExtra": "CenterUS",
      "c.ll": "Aura",
      "c.lr": "Aura",
      "c.solar": "CenterUS",
      "c.solarExtra": "CenterUS",
      "c.spine": "Spine",
      "c.pillar": "Pillar",
      "v.first": "Name",
      "v.middle": "Name",
      "v.last": "Name",
      "v.le": "UndervibUS",
      "v.big": "UndervibUS",
      "v.ul": "AuraUS",
      "v.ur": "AuraUS",
      "v.heart": "CenterUS",
      "v.heartExtra": "CenterUS",
      "v.ll": "AuraUS",
      "v.lr": "AuraUS",
      "v.solar": "CenterUS",
      "v.solarExtra": "CenterUS",
      "v.spine": "Spine",
      "v.pillar": "Pillar"
    },
    "4": {
      "first": "Name",
      "middle": "Name",
      "last": "Name",
      "le": "Lifeexpression",
      "big": "Lifeexpression",
      "ul": "Aura",
      "ur": "Aura",
      "heart": "CenterUS",
      "heartExtra": "CenterUS",
      "ll": "Aura",
      "lr": "Aura",
      "solar": "CenterUS",
      "solarExtra": "CenterUS",
      "spine": "Spine",
      "pillar": "Pillar",
      "c.first": "Name",
      "c.middle": "Name",
      "c.last": "Name",
      "c.big": "UndervibUS",
      "c.ul": "AuraUS",
      "c.ur": "AuraUS",
      "c.heart": "CenterUS",
      "c.heartExtra": "CenterUS",
      "c.ll": "AuraUS",
      "c.lr": "AuraUS",
      "c.solar": "Center",
      "c.solarExtra": "Center",
      "c.spine": "Spine",
      "c.pillar": "Pillar",
      "v.first": "Name",
      "v.middle": "Name",
      "v.last": "Name",
      "v.big": "UndervibUS",
      "v.ul": "AuraUS",
      "v.ur": "AuraUS",
      "v.heart": "CenterUS",
      "v.heartExtra": "CenterUS",
      "v.ll": "AuraUS",
      "v.lr": "AuraUS",
      "v.solar": "CenterUS",
      "v.solarExtra": "CenterUS",
      "v.spine": "Spine",
      "v.pillar": "Pillar"
    },
    "5": {
      "first": "Name",
      "middle": "Name",
      "last": "Name",
      "le": "Lifeexpression",
      "big": "Lifeexpression",
      "ul": "Aura",
      "ur": "Aura",
      "heart": "Center",
      "heartExtra": "Center",
      "ll": "Aura",
      "lr": "Aura",
      "solar": "Center",
      "solarExtra": "Center",
      "spine": "Spine",
      "pillar": "Pillar",
      "c.first": "Name",
      "c.middle": "Name",
      "c.last": "Name",
      "c.ul": "AuraUS",
      "c.ur": "AuraUS",
      "c.heart": "CenterUS",
      "c.heartExtra": "CenterUS",
      "c.ll": "AuraUS",
      "c.lr": "AuraUS",
      "c.solar": "CenterUS",
      "c.solarExtra": "CenterUS",
      "c.spine": "Spine",
      "c.pillar": "Pillar",
      "v.first": "Name",
      "v.middle": "Name",
      "v.last": "Name",
      "v.ul": "AuraUS",
      "v.ur": "AuraUS",
      "v.heart": "CenterUS",
      "v.heartExtra": "CenterUS",
      "v.ll": "AuraUS",
      "v.lr": "AuraUS",
      "v.solar": "CenterUS",
      "v.solarExtra": "CenterUS",
      "v.spine": "Spine",
      "v.pillar": "Pillar"
    }
  };
  const FIXED = { day: 'dark', 'c.day': 'dark', 'v.day': 'dark', letters: 'blue', 'pi.pillar': 'dark' };
  const extraOf = { heartExtra: 'heart', solarExtra: 'solar' };
  // words = how many words the typed name has (the tool's rules change with it); 1 falls back to 2 where its own
  // block sets nothing, more than 5 uses the 5-word rules.
  function tableFor(slot, words) {
    const w = Math.min(Math.max(Number(words) || 2, 1), 5);
    const bare = slot.replace(/^(c|v)\./, ''), pre = slot.slice(0, slot.length - bare.length);
    const pick = (ww) => RULES[ww][slot] || (extraOf[bare] ? RULES[ww][pre + extraOf[bare]] : null);
    return pick(w) || (w === 1 ? pick(2) : null);
  }
  function lookup(slot, text, words) {
    if (slot in FIXED) return FIXED[slot];
    if (slot.startsWith('e.')) return 'dark';
    if (slot.startsWith('pi.') || slot.startsWith('po.')) return 'blue';
    const n = parseInt(String(text), 10);
    const table = tableFor(slot, words);
    const cls = !table || !(n >= 1) ? 'gray' : n >= TABLES[table].length + 1 ? 'dark' : TABLES[table][n - 1];
    return slot === 'big' ? cls + ' n-big' : cls;
  }
  const css = Object.entries(PALETTE).map(([k, v]) => `.nscope .n-${k} { fill: ${v}; } .pyr .n-${k} { color: ${v}; }`).join('\n') + '\n.nscope .n-big, .pyr .n-big { opacity: .33; }';
  if (typeof document !== 'undefined' && document.head) { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }
  root.NumberColors = { PALETTE, TABLES, RULES, lookup, tableFor, css };
})(typeof globalThis !== 'undefined' ? globalThis : this);
