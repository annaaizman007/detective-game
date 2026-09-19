// What a detective says to a witness, and the stock answers a witness gives
// when there is nothing more to give. The in-character lines live with each
// witness in the case files; these are the shared halves.

export const WITNESS_ASKS = {
  about: [
    'You know them. Tell me one thing about them I could not read in a newspaper.',
    'I am not asking what they did. I am asking what they are like. Anything.',
    'Describe them to me the way you would to somebody who had to pick them out of a crowd.',
  ],
  lead: [
    'Something happened here tonight. Where should I be looking?',
    'You see everything that comes through this door. What came through it tonight?',
    'I do not need a name. I need a place.',
  ],
  nothing: 'I could tell you nothing about them you have not already written down.',
  noLead: 'Nothing that walked out of here tonight is still worth walking after.',
};

export function allWitnessLines(): string[] {
  return [...WITNESS_ASKS.about, ...WITNESS_ASKS.lead, WITNESS_ASKS.nothing, WITNESS_ASKS.noLead];
}
