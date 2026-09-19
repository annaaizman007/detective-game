import type { CaseDef } from '../../types/game-types';

const def: CaseDef = {
  id: 'salt',
  title: 'Salt and Silence',
  subtitle: 'The Harbour District · February 1948',
  tagline: 'They pulled the union boss out of the bay with his pockets sewn shut and full of salt.',
  victim: 'Aurel Bask',
  scene: 'pier9',
  difficultyHint: 'Tight streets, fast tongues.',
  publicTraits: ['build', 'hair'],
  traitPool: ['hand', 'mark', 'vice', 'scent', 'shoe'],

  briefing: `Low tide at Pier Nine gives up Aurel Bask, twenty years head of the longshoremen
    and thirty hours dead. Somebody sewed his coat pockets shut and filled them with rock salt,
    which is not how you sink a man -- it is how you tell three thousand dockers what happens
    to a man who talks. The wound is under the ribs and it went up.
    Half this harbour wanted him gone and the other half worked for him. Nobody here talks to
    police, so do not ask like police. Move before the tide turns twice.`,

  radio: [
    'Dispatch. Harbour Station. Do not go down to Pier Nine alone and do not go in uniform.',
    'The union votes on a new boss Thursday. Every candidate is on your list.',
    'Customs has been sitting on a manifest for six weeks. Lean on them.',
  ],

  terrain: {
    sea: true, seaName: 'THE NARROWS', river: false, parks: 1,
    districts: [
      { text: 'CUSTOMS ROW', x: 620, y: 110, rot: -3 },
      { text: 'THE SALT YARDS', x: 250, y: 620, rot: 2 },
      { text: 'GRIEVE POINT', x: 960, y: 250, rot: 5 },
    ],
  },
  locations: [
    { id: 'station', name: 'Harbour Station', type: 'police', x: 480, y: 318, desc: 'Two desks, one cell, and a radiator that screams.' },
    { id: 'pier9', name: 'Pier Nine', type: 'docks', x: 250, y: 168, desc: 'Where they found him. Still taped off, still stinking.' },
    { id: 'customs', name: 'The Customs House', type: 'bank', x: 470, y: 118, desc: 'Every crate in this harbour is a line in a ledger here. Most lines are lies.' },
    { id: 'hall', name: 'Longshoremen’s Hall', type: 'station', x: 712, y: 150, desc: 'Folding chairs, a dead man’s photograph, and an election on Thursday.' },
    { id: 'light', name: 'Grieve Point Light', type: 'light', x: 900, y: 240, desc: 'One keeper, one lamp, and the best view of who comes in at night.' },
    { id: 'brine', name: 'The Brine & Bell', type: 'bar', x: 168, y: 340, desc: 'Sawdust, rum, and forty men who saw nothing.' },
    { id: 'chandler', name: 'Vetch & Son, Chandlers', type: 'shop', x: 650, y: 330, desc: 'Rope, oil, and every kind of hook a man could need.' },
    { id: 'icehouse', name: 'The Ice House', type: 'warehouse', x: 862, y: 452, desc: 'Cold enough to keep a body honest.' },
    { id: 'drydock', name: 'Number Four Drydock', type: 'factory', x: 330, y: 486, desc: 'A hull the size of a church, propped up on stilts.' },
    { id: 'baths', name: 'Harbour Baths', type: 'bathhouse', x: 168, y: 578, desc: 'Steam, tile, and the only place in the district nobody wears a coat.' },
    { id: 'trawler', name: 'The Trawler Berths', type: 'docks', x: 620, y: 566, desc: 'Nets, gulls, and boats that go out empty and come back heavy.' },
    { id: 'morgue', name: 'Harbour Morgue', type: 'morgue', x: 896, y: 622, desc: 'Bask is on the third slab, and the salt is still in a bag beside him.' },
  ],
  edges: [
    ['station', 'customs'], ['station', 'brine'], ['station', 'chandler'], ['station', 'drydock'],
    ['pier9', 'customs'], ['pier9', 'brine'],
    ['customs', 'hall'],
    ['hall', 'light'], ['hall', 'chandler'],
    ['light', 'icehouse'],
    ['chandler', 'icehouse'], ['chandler', 'trawler'],
    ['icehouse', 'morgue'],
    ['trawler', 'morgue'], ['trawler', 'drydock'],
    ['drydock', 'baths'], ['brine', 'baths'], ['baths', 'trawler'],
  ],
  start: 'station',

  suspects: [
    { id: 'hollis', name: 'Dov Hollis', role: 'Union vice-chair',
      blurb: 'Second chair for eleven years. First chair as of Thursday.',
      motive: 'because second chair for eleven years is its own kind of sentence.' },
    { id: 'wren', name: 'Etta Wren', role: 'Customs inspector',
      blurb: 'Signed off on six weeks of crates she never opened.',
      motive: 'because the manifest he was carrying had her signature on every page.' },
    { id: 'okafor', name: 'Bernard Okafor', role: 'Chandler, Vetch & Son',
      blurb: 'Sells the rope. Keeps a list of who buys it.',
      motive: 'because the debt was called in, and he had nothing left to pay it with.' },
    { id: 'salvi', name: 'Nunzio Salvi', role: 'Shipping agent',
      blurb: 'Three companies, one office, no employees.',
      motive: 'because a strike would have cost him a season he could not afford to lose.' },
    { id: 'tilda', name: 'Tilda Rask', role: 'Widow of the last boss',
      blurb: 'Her husband went into the bay in ’41. Nobody was ever charged.',
      motive: 'because seven years is a long time to hold a thing, and no time at all.' },
    { id: 'keeper', name: 'Mr. Garrow', role: 'Lighthouse keeper',
      blurb: 'Sees everything from Grieve Point and reports none of it.',
      motive: 'because he saw the boat, and then he was in it.' },
    { id: 'fenn', name: 'Dr. Ilse Fenn', role: 'Harbour surgeon',
      blurb: 'Wrote the death certificate before the body was cold. Wrote it wrong.',
      motive: 'because the wound went up, and only she knew what that meant.' },
    { id: 'ledoux', name: 'Marcel Ledoux', role: 'Trawler skipper',
      blurb: 'Goes out with an empty hold twice a week and comes back low in the water.',
      motive: 'because Bask had started counting the boats, and the counting was nearly done.' },
  ],

  witnesses: [
    { id: 'teague', at: 'brine', name: 'Mags Teague', role: 'landlady, the Brine & Bell',
      intro: 'Mags. Forty men in here every night and I know what every one of them drinks and owes.',
      knows: ['hollis', 'ledoux', 'tilda'],
      aboutLine: 'Drinks in my house. I could draw them from memory.',
      leadLine: 'Somebody settled a tab tonight that has been open since March. In coin. They came in from',
      spentLine: 'Last orders was an hour ago, detective. That goes for questions.' },
    { id: 'aldous', at: 'customs', name: 'Percy Aldous', role: 'night clerk, the Customs House',
      intro: 'Aldous. I copy the manifests. Every crate in this harbour crosses my desk twice, once as it is and once as it is declared.',
      knows: ['wren', 'salvi'],
      aboutLine: 'Signs my book. You notice the hand that signs.',
      leadLine: 'A manifest was altered tonight and the ink is still wet. The crate it describes is at',
      spentLine: 'I am a clerk. Clerks do not know things. Please close the door.' },
    { id: 'vetch', at: 'chandler', name: 'Young Vetch', role: 'apprentice, Vetch & Son',
      intro: 'Tom Vetch. The son on the sign. Everyone who works this harbour buys rope from us and I cut it for them.',
      knows: ['okafor', 'salvi', 'fenn'],
      aboutLine: 'Customer. I measure their rope; I have measured them.',
      leadLine: 'Somebody bought forty feet of line tonight and paid double to have it cut quiet. They took it down to',
      spentLine: 'Dad says not to talk to police. I have talked enough.' },
    { id: 'kite', at: 'morgue', name: 'Amos Kite', role: 'attendant, Harbour Morgue',
      intro: 'Kite. I sit with the dead. They are better company than you would think and worse than you would hope.',
      knows: ['fenn', 'tilda'],
      aboutLine: 'Has been down to see Bask. People give themselves away over a slab.',
      leadLine: 'A visitor left something in the coat room and did not come back for it. It was sent on to',
      spentLine: 'I have three to wash before morning. You can find your own way out.' },
    { id: 'pell', at: 'trawler', name: 'Iggy Pell', role: 'deckhand',
      intro: 'Pell. I mend nets and I keep my head down. Tonight I looked up once, which is once too often.',
      knows: ['ledoux', 'hollis', 'keeper'],
      aboutLine: 'Works the berths. You get to know a person by their walk on wet boards.',
      leadLine: 'Something was thrown from a boat and did not sink. It fetched up by',
      spentLine: 'I said I keep my head down. I am putting it back down now.' },
    { id: 'harrow', at: 'baths', name: 'Nell Harrow', role: 'attendant, Harbour Baths',
      intro: 'Nell Harrow. Towels and tickets. Nobody has any pockets in here, which is why they talk.',
      knows: ['wren', 'tilda', 'keeper'],
      aboutLine: 'Bathes here. You cannot hide much in a towel.',
      leadLine: 'A coat was left in the changing room with something heavy in the lining. The owner ran toward',
      spentLine: 'We close at two. That is all I have for you.' },
  ],

  items: [],

  epilogue: {
    win: `You make the arrest at the Hall, an hour before the vote, in front of three hundred
      longshoremen who go very quiet all at once. Somebody at the back starts clapping and
      thinks better of it. The tide comes in. It always does.`,
    loss: `Thursday comes. They elect a new boss, and the new boss says all the right things
      about Aurel Bask. The salt goes into an evidence locker, and the file goes into a drawer,
      and the harbour goes back to being a place where nobody saw anything.`,
  },
};

export default def;
