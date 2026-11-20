// Who each person is (owner's ask 2026-11-20): what the person behind a chart does and is known for,
// so numbers can be compared with kinds of people ("the musicians", "everyone who went to prison").
//
// Researched once by Claude sessions (tools/people/BRIEF.md: facts only, sourced, private people skipped)
// and kept in the repo as server/chart-people.json, one entry per person with the filenames of their
// charts. Loaded at startup into:
//   people         one row per person: `key` (the chart name, lower case), `record` (the entry as JSON)
//   person_marks   what a person can be searched by: field | flag | kind | death  (the lists below)
//   person_charts  a VIEW: a chart belongs to the person whose name it carries (images.title, any case). A
//                  renamed chart follows its new name; a chart saved later under a known name joins by itself.
// The seed only adds and refreshes its own rows. Nothing here is guessed by the app, and no paid call is made.
import fs from 'node:fs';
import crypto from 'node:crypto';

// The words on screen for each field a person can work in. Order = the order on the screen.
export const FIELDS = {
  music: 'Musicians', rapper: 'Rappers', acting: 'Actors', film_tv: 'Film and TV', comedy: 'Comedians',
  sports: 'Athletes', combat_sports: 'Fighters', politics: 'Politicians', activism: 'Activists',
  commentary: 'Commentators', journalism: 'Journalists', podcast: 'Podcasters', youtube: 'YouTubers',
  streaming: 'Streamers', influencer: 'Influencers', business: 'Business People', tech: 'Tech People',
  finance: 'Finance People', religion: 'Religious Figures', spirituality: 'Spiritual Teachers', occult: 'Occultists',
  science: 'Scientists', medicine: 'Doctors', writing: 'Writers', art: 'Artists', fashion: 'Fashion People',
  military: 'Military People', law_enforcement: 'Law Enforcement', royalty: 'Royalty', education: 'Teachers',
  crime: 'Criminals', mass_violence: 'Mass Killers', cult: 'Cult Figures', conspiracy: 'Conspiracy Figures', other: 'Other',
};
// Things that happened in a life. Every one is a sourced fact in the person's record.
export const FLAGS = {
  convicted_crime: 'Convicted of a Crime', charged_crime: 'Charged With a Crime', violent_crime: 'Violent Crime',
  killed_someone: 'Killed Someone', prison: 'Went to Prison', died_young: 'Died Before 40', suicide: 'Died by Suicide',
  overdose: 'Died of an Overdose', murdered: 'Was Murdered', addiction_public: 'Public Addiction',
  billionaire: 'Billionaires', self_made_wealth: 'Self-Made Wealth', bankruptcy: 'Went Bankrupt',
  major_scandal: 'Major Scandal', cancelled_or_banned: 'Cancelled or Banned', elected_office: 'Held Elected Office',
  head_of_state: 'Heads of State', founder: 'Founders', cult_leader: 'Cult Leaders', child_star: 'Child Stars',
  military_service: 'Served in the Military', religious_leader: 'Religious Leaders', major_award: 'Won a Major Award',
};
export const KINDS = { person: 'People', group: 'Groups', company: 'Companies', place: 'Places', event: 'Events', fictional: 'Fictional' };
export const DEATHS = { natural: 'Natural Causes', illness: 'Illness', accident: 'Accident', overdose: 'Overdose', suicide: 'Suicide', homicide: 'Homicide', executed: 'Executed', killed_by_police: 'Killed by Police', unknown: 'Cause Unknown' };
const LISTS = { field: FIELDS, flag: FLAGS, kind: KINDS, death: DEATHS };
export const markLabel = (type, value) => (LISTS[type] && LISTS[type][value]) || value;

// Lower case the way SQLite's lower() does it (A-Z only), so the view's join and this key always agree.
export const keyOf = (title) => String(title || '').replace(/\s+/g, ' ').trim().replace(/[A-Z]/g, (c) => c.toLowerCase());

export function loadPeopleSeed() {
  try { return JSON.parse(fs.readFileSync(new URL('./chart-people.json', import.meta.url), 'utf8')); } catch { return []; }
}

// One seed entry -> the record kept and shown. Only known words are kept in the lists; anything else is dropped,
// so a typo in the seed can never become a button on a screen.
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const date = (v) => (typeof v === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v) ? v : null);
export function cleanRecord(e) {
  const pick = (list, allowed) => [...new Set((Array.isArray(list) ? list : []).filter((v) => typeof v === 'string' && allowed[v]))];
  const kind = KINDS[e.kind] ? e.kind : 'unknown';
  if (kind === 'unknown') return null;
  return {
    title: text(e.title, 120), kind,
    known_as: text(e.known_as, 120), summary: text(e.summary, 300),
    fields: pick(e.fields, FIELDS).slice(0, 4), roles: (Array.isArray(e.roles) ? e.roles : []).map((r) => text(r, 40)).filter(Boolean).slice(0, 5),
    country: /^[A-Z]{2}$/.test(e.country || '') ? e.country : null,
    born: date(e.born), date_matches: typeof e.date_matches === 'boolean' ? e.date_matches : null,
    died: date(e.died), death_cause: e.died && DEATHS[e.death_cause] ? e.death_cause : null,
    age_at_death: Number.isInteger(e.age_at_death) ? e.age_at_death : null,
    events: (Array.isArray(e.events) ? e.events : []).map((x) => ({ year: Number.isInteger(x && x.year) ? x.year : null, what: text(x && x.what, 200) })).filter((x) => x.what).slice(0, 10),
    flags: pick(e.flags, FLAGS),
    fame: [1, 2, 3, 4, 5].includes(e.fame) ? e.fame : null,
    checked: e.checked === true,
    sources: (Array.isArray(e.sources) ? e.sources : []).filter((u) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u)).slice(0, 4),
    note: text(e.note, 400),
  };
}
const marksOf = (r) => [['kind', r.kind], ...r.fields.map((f) => ['field', f]), ...r.flags.map((f) => ['flag', f]), ...(r.death_cause ? [['death', r.death_cause]] : [])];

export function seedPeople(db, seed, { build = null } = {}) {
  const find = db.prepare('SELECT id, hash FROM people WHERE key = ?');
  const add = db.prepare('INSERT INTO people (key, record, hash, build) VALUES (?, ?, ?, ?)');
  const upd = db.prepare("UPDATE people SET record = ?, hash = ?, build = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
  const clearMarks = db.prepare('DELETE FROM person_marks WHERE person_id = ?');
  const mark = db.prepare('INSERT OR IGNORE INTO person_marks (person_id, type, value) VALUES (?, ?, ?)');
  let added = 0, updated = 0, same = 0;
  db.transaction(() => {
    for (const e of Array.isArray(seed) ? seed : []) {
      const rec = e && cleanRecord(e), key = keyOf(e && e.title);
      if (!rec || !key) continue;
      const json = JSON.stringify(rec), hash = crypto.createHash('sha1').update(json).digest('hex');
      const row = find.get(key);
      if (row && row.hash === hash) { same++; continue; }
      let id;
      if (!row) { id = add.run(key, json, hash, build).lastInsertRowid; added++; }
      else { id = row.id; upd.run(json, hash, build, id); clearMarks.run(id); updated++; }
      for (const [type, value] of marksOf(rec)) mark.run(id, type, value);
    }
  })();
  return { added, updated, same };
}

export function personFor(db, imageId) {
  const row = db.prepare('SELECT p.id, p.record, p.build, p.updated_at FROM person_charts c JOIN people p ON p.id = c.person_id WHERE c.image_id = ?').get(imageId);
  if (!row) return null;
  const r = JSON.parse(row.record);
  return {
    ...r, id: row.id,
    field_names: r.fields.map((f) => ({ value: f, label: FIELDS[f] })), flag_names: r.flags.map((f) => ({ value: f, label: FLAGS[f] })),
    death_name: r.death_cause ? DEATHS[r.death_cause] : null,
    charts: db.prepare('SELECT count(*) c FROM person_charts WHERE person_id = ?').get(row.id).c,
  };
}

// ?who=field:music (may repeat: every one must hold). Unknown words are dropped, never an error.
export function parseWho(list) {
  return (list || []).map((s) => { const i = String(s).indexOf(':'); const type = String(s).slice(0, i), value = String(s).slice(i + 1); return LISTS[type] && LISTS[type][value] ? { type, value, label: LISTS[type][value] } : null; }).filter(Boolean);
}
export function whoSql(who, params) {
  return (who || []).map((w) => { params.push(w.type, w.value); return ' AND i.id IN (SELECT c.image_id FROM person_charts c JOIN person_marks m ON m.person_id = c.person_id WHERE m.type = ? AND m.value = ?)'; }).join('');
}

// Every kind of person in the vault with how many people and charts it has, biggest first inside each list.
export function peopleKinds(db) {
  const rows = db.prepare(`SELECT m.type, m.value, count(DISTINCT m.person_id) people, count(DISTINCT c.image_id) charts
    FROM person_marks m JOIN person_charts c ON c.person_id = m.person_id GROUP BY m.type, m.value`).all();
  const list = (type) => rows.filter((r) => r.type === type && r.charts).map((r) => ({ who: `${type}:${r.value}`, label: markLabel(type, r.value), people: r.people, charts: r.charts })).sort((a, b) => b.people - a.people || a.label.localeCompare(b.label));
  return { ...peopleStats(db), fields: list('field'), flags: list('flag'), kinds: list('kind'), deaths: list('death') };
}

export function peopleStats(db) {
  const g = (sql) => db.prepare(sql).get().c;
  return {
    people: g('SELECT count(*) c FROM people'),
    with_charts: g('SELECT count(DISTINCT person_id) c FROM person_charts'),
    charts_known: g('SELECT count(*) c FROM person_charts'),
    charts_unknown: g("SELECT count(*) c FROM images WHERE kind = 'chart' AND id NOT IN (SELECT image_id FROM person_charts)"),
  };
}

export function peopleReport(db) {
  const s = peopleStats(db), k = peopleKinds(db);
  const noted = db.prepare("SELECT count(*) c FROM people WHERE json_extract(record, '$.note') IS NOT NULL").get().c;
  const unchecked = db.prepare("SELECT count(*) c FROM people WHERE json_extract(record, '$.checked') = 0").get().c;
  return [
    'WHO EACH PERSON IS (server/people.js; researched facts from server/chart-people.json, no paid call)',
    `people ${s.people} (${s.with_charts} with a chart here)   charts with a known person ${s.charts_known}   charts without ${s.charts_unknown}   with a note to check ${noted}   from memory, not searched ${unchecked}`,
    `fields: ${k.fields.map((f) => `${f.label} ${f.people}`).join(', ') || 'none'}`,
    `life events: ${k.flags.map((f) => `${f.label} ${f.people}`).join(', ') || 'none'}`,
  ];
}
