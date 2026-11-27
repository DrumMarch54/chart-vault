import fs from 'node:fs';
const out = [];
for (const f of ['m1', 'm2', 'm3', 'm4']) {
  const txt = fs.readFileSync(f + '.txt', 'utf8');
  const reports = txt.split(/\n(?=[^\n]*TABLE OF CONTENTS)/).slice(1);
  reports.forEach((r, ri) => {
    const lines = r.split('\n').map((l) => l.replace(/\f/g, '')).filter((l) => !/^\s*\d{1,3}\s*$/.test(l)); // page numbers
    const body = lines.join('\n');
    const start = body.search(/\n\s*2D\. CHILDHOOD\s*\n\s*the deepest/i);
    const end = body.search(/\n\s*THE VOCATION CHART/);
    const psy = body.slice(body.search(/\n\s*2B\. MENTAL STRATEGIES\s*\n\s+\d/), end);
    const grab = (re, stop) => { const m = re.exec(psy); if (!m) return null; const rest = psy.slice(m.index + m[0].length); const e = rest.search(stop); return { n: m[1], text: (e < 0 ? rest : rest.slice(0, e)) }; };
    const para = (t) => t.split(/\n\s*\n|\n(?=[A-Z][^\n]{0,60}\n)/).map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const rec = { file: f, report: ri + 1,
      mental: grab(/MENTAL STRATEGIES\s*\n\s*NUMBER:\s*(\d+)/, /2C\. EMOTIONAL/),
      emotional: grab(/EMOTIONAL STRATEGIES\s*\n\s*NUMBER:\s*(\d+)/, /2D\. CHILDHOOD/),
      childhood: grab(/THE NUMBER (\d+) IN CHILDHOOD\s*\n/i, /HOW THIS ENERGY/),
      teenage: grab(/The number (\d+) in the teenage years\s*\n/i, /HOW THIS ENERGY/),
      twenties: grab(/The number (\d+) in the twenties\s*\n/i, /HOW THIS ENERGY/),
      challenge: grab(/\n\s*(\d+)(?:\/\d)? as psyche challenge number\s*\n/i, /THE ADULT POTENTIAL\s*\n\s*NUMBER/),
      pillarDigit: grab(/About the (\d+) pillar\s*\n/i, /Generally about/i),
      pillar: grab(/How the psyche rests with (\d+)(?:\/\d)?\s*\n/i, /2I\. THE PSYCHE LIFE/),
      le: grab(/THE BIG PSYCHE LIFE EXPRESSION\s*\n\s*NUMBER:\s*(\d+)/, /\n\s*THE VOCATION CHART|$/),
    };
    out.push(rec);
  });
}
fs.writeFileSync('psy.json', JSON.stringify(out, null, 1));
for (const r of out) console.log(r.file, r.report, ['mental', 'emotional', 'childhood', 'teenage', 'twenties', 'challenge', 'pillarDigit', 'pillar', 'le'].map((k) => `${k}:${r[k] ? r[k].n : '-'}`).join(' '));
