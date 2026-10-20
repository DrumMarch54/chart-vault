import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayName, displayMap } from '../server/tagnames.js';

// The stored tag never changes; this is only how it reads on screen.
test('run-together names get spaces and capitals', () => {
  const cases = {
    alexjones: 'Alex Jones', jakepaul: 'Jake Paul', andrewtate: 'Andrew Tate', kanyewest: 'Kanye West',
    ericandre: 'Eric Andre', ericakirk: 'Erica Kirk', joshprovencio: 'Josh Provencio', stevencrowder: 'Steven Crowder',
    gretathunberg: 'Greta Thunberg', mikelindell: 'Mike Lindell', lexfridman: 'Lex Fridman', georgesoros: 'George Soros',
    schoolshooter: 'School Shooter', billboardchris: 'Billboard Chris', chudthebuilder: 'Chud the Builder',
    dakotaofearth: 'Dakota of Earth', westborobaptistchurch: 'Westboro Baptist Church', morganandmorgan: 'Morgan and Morgan',
    whitefragility: 'White Fragility', decodeyourreality: 'Decode Your Reality',
  };
  for (const [stored, shown] of Object.entries(cases)) assert.equal(displayName(stored), shown, stored);
});

test('what the writer already split, stays split; plain words are just capitalized', () => {
  assert.equal(displayName('AlexJones'), 'Alex Jones');
  assert.equal(displayName('JimmyRowe'), 'Jimmy Rowe');
  assert.equal(displayName('DJacademics'), 'DJ Academics');
  assert.equal(displayName('rachelM'), 'Rachel M');
  assert.equal(displayName('politics'), 'Politics');
  assert.equal(displayName('Friend'), 'Friend');
  assert.equal(displayName('influencer'), 'Influencer');
  assert.equal(displayName('USA'), 'USA');
  assert.equal(displayName('youtube'), 'YouTube');
  assert.equal(displayName('cardiB'), 'Cardi B');
  // a surname prefix stays glued to the word after it
  assert.equal(displayName('Matthew David McConaughey'), 'Matthew David McConaughey');
  assert.equal(displayName('MacArthur'), 'MacArthur');
  assert.equal(displayName('Robert DeNiro'), 'Robert DeNiro');
});

test('no split beats a wrong split; numbers and codes are untouched', () => {
  assert.equal(displayName('Jeffs'), 'Jeffs'); // not "Jeff S"
  assert.equal(displayName('pazuzu'), 'Pazuzu'); // not "Pa Zuzu"
  assert.equal(displayName('comdey'), 'Comdey');
  assert.equal(displayName('adam22'), 'Adam 22');
  assert.equal(displayName('penguinz0'), 'Penguinz0');
  assert.equal(displayName('19fn'), '19/1 First name');
  assert.equal(displayName('12mc'), '12/3 Mind center');
  assert.equal(displayName('7'), '7');
});

test('displayMap lists only the tags that read differently', () => {
  assert.deepEqual(displayMap(['Friend', 'alexjones', '7']), { alexjones: 'Alex Jones' });
});
