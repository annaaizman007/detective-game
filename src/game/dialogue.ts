// What people say when you knock on their door.
//
// Questioning used to resolve into a single line of observation. It now plays
// as a conversation: you choose how to come at them, they answer in character,
// and what you get out of it depends on the approach. The approach is a real
// decision, not flavour -- see APPROACHES below.

import type { ApproachDef, ApproachId } from "../types/game-types";

export const APPROACHES: ApproachDef[] = [
  {
    id: 'straight',
    label: 'Level with them',
    hint: 'One thing learned. They stay willing to talk.',
    reveals: 1,
    clams: 0,
    ask: [
      'I am not here to make trouble. Walk me through your evening.',
      'You can talk to me here, or downtown with a stenographer. Here is nicer.',
      'Nobody is accusing anybody. I just need the hours accounted for.',
    ],
  },
  {
    id: 'press',
    label: 'Press hard',
    hint: 'Two things learned. They shut down afterwards.',
    reveals: 2,
    clams: 2,
    ask: [
      'Sit down. You have been lying since the word hello, and we both know it.',
      'I have three people putting you six streets from where you say you were.',
      'Last chance to tell it your way before I write it mine.',
    ],
  },
  {
    id: 'sideways',
    label: 'Ask about somebody else',
    hint: 'One thing learned — about a different suspect.',
    reveals: 1,
    clams: 0,
    aboutOther: true,
    ask: [
      'Forget yourself for a minute. Tell me who else was around.',
      'You people all know each other. So tell me about the others.',
      'I am not interested in you. I am interested in who you drink with.',
    ],
  },
];

export const approachById = (id: ApproachId): ApproachDef => APPROACHES.find((a) => a.id === id) || APPROACHES[0];

// Replies are picked by approach and by how cornered the suspect is. Nobody in
// this city answers a question the first time it is asked.
const REPLIES: Record<ApproachId | "spent", string[]> = {
  straight: [
    'A long look at the floor, and then: "Fine. But you did not hear it from me."',
    '"You want the truth or you want it tidy? They are not the same evening."',
    '"I have told this to two of you already. It does not get better with telling."',
    '"Sit, then. I will give you what I have, which is less than you want."',
  ],
  press: [
    'The jaw goes tight. "You have got nothing, or you would not be shouting."',
    '"All right. ALL RIGHT." The hands come up. "Ask it again, slower."',
    '"Say that in front of a lawyer and see how far you get." But they sit down.',
    'Silence, for a good ten seconds. Then, flatly: "What do you want to know."',
  ],
  sideways: [
    'That gets a smile. People love to be asked about somebody else.',
    '"Now that," they say, settling in, "is a better question."',
    '"You are asking the wrong person about the wrong person. But go on."',
    'The relief is almost funny. "Oh, THEM. Where would you like me to start."',
  ],
  spent: [
    '"I have said everything I am going to say to you."',
    'The door does not open the second time.',
    '"We are done. Go and be clever somewhere else."',
  ],
};

export function replyFor(approachId: ApproachId, index: number): string {
  const pool = REPLIES[approachId] || REPLIES.straight;
  return pool[index % pool.length];
}

export const spentReply = (index: number): string => REPLIES.spent[index % REPLIES.spent.length];

/** Every line either side of a conversation can say, for the voice renderer. */
export function allDialogueLines(): string[] {
  return [
    ...APPROACHES.flatMap((a) => a.ask),
    ...Object.values(REPLIES).flat(),
  ];
}
