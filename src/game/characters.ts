// Playable detectives. Each has a passive that quietly bends the rules and one
// ability per case that bends them loudly.

import type { CharacterDef, CharacterId } from "../types/game-types";

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'hale', name: 'Chief Insp. Aldous Hale', short: 'Hale', role: 'The Veteran',
    color: '#d9a441',
    blurb: 'Thirty-one years on the force and a limp to show for it. Slower than the rest of you, but he sees three moves out.',
    passive: 'Works a third action every turn.',
    passiveNote: '3 action points instead of 2.',
    ability: 'VERDICT', abilityName: 'Verdict',
    abilityText: 'Name a suspect. Learn, for certain, whether they are your killer.',
  },
  {
    id: 'vale', name: 'Dr. Imogen Vale', short: 'Vale', role: 'The Coroner',
    color: '#5fb8b0',
    blurb: 'Talks to the dead more easily than the living, and gets straighter answers.',
    passive: 'A search turns up two pieces of evidence, not one.',
    passiveNote: 'SEARCH yields 2 finds where the location has them.',
    ability: 'AUTOPSY', abilityName: 'Second Autopsy',
    abilityText: 'Go back to the body. Uncover one fact about the killer outright.',
  },
  {
    id: 'crane', name: 'Silas Crane', short: 'Crane', role: 'The Reporter',
    color: '#c95d4f',
    blurb: 'Not police. Not welcome. Somehow always already inside.',
    passive: 'People tell him twice as much as they mean to.',
    passiveNote: 'INTERROGATE reveals 2 traits instead of 1.',
    ability: 'HEADLINE', abilityName: 'Front Page',
    abilityText: 'Put the city on the story. The trail goes warm again.',
  },
  {
    id: 'ruby', name: '"Ruby" Okonkwo', short: 'Ruby', role: 'The Fixer',
    color: '#b07fd4',
    blurb: 'Reformed, allegedly. Still carries the picks.',
    passive: 'The first street she walks each turn costs her nothing.',
    passiveNote: 'First MOVE each turn is free.',
    ability: 'BREAKIN', abilityName: 'Break In',
    abilityText: 'Search any location in the city without setting foot in it.',
  },
  {
    id: 'kell', name: 'Fr. Ambrose Kell', short: 'Kell', role: 'The Confessor',
    color: '#8fae6b',
    blurb: 'He has heard worse than whatever you did. That is exactly why they talk.',
    passive: 'Nobody ever clams up on him.',
    passiveNote: 'Suspects never refuse his questions.',
    ability: 'CONFESSION', abilityName: 'Confession',
    abilityText: 'A suspect at your location tells you everything they are hiding.',
  },
  {
    id: 'quist', name: 'Det. Mara Quist', short: 'Quist', role: 'The Beat Cop',
    color: '#6f9bd1',
    blurb: 'Knows every alley, every night clerk, every bad habit in the precinct.',
    passive: 'Covers two blocks in the time it takes you to cross one.',
    passiveNote: 'MOVE may cross 2 locations for 1 action.',
    ability: 'APB', abilityName: 'All-Points Bulletin',
    abilityText: 'Have any suspect in the city hauled in to wherever you are standing.',
  },
];

export const characterById = (id: CharacterId): CharacterDef => CHARACTERS.find((c) => c.id === id) as CharacterDef;
