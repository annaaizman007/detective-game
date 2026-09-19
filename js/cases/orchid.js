export default {
  id: 'orchid',
  title: 'The Ash and the Orchid',
  subtitle: 'Ashgrave Bay · November 1947',
  tagline: 'A singer dies in the best suite in the city, and nobody heard a thing.',
  victim: 'Lillian Voss',
  scene: 'gilded',
  difficultyHint: 'A good first case.',
  publicTraits: ['build', 'hair'],
  traitPool: ['hand', 'mark', 'vice', 'scent', 'shoe'],

  briefing: `Nine minutes past two, the house detective at the Gilded Hotel opens suite
    eleven-hundred and finds Lillian Voss face down in six hundred dollars of Chinese silk.
    No gunshot. No scream. The orchid on her dressing table has been snapped clean off at the
    stem, and somebody took the time to set it back in the vase.
    Eleven floors, forty-one guests, one night clerk, and not one of them heard a thing.
    You have until this story goes cold, detectives. In this city that is not very long.`,

  radio: [
    'Dispatch to all cars. The Gilded Hotel. Coroner is already inside.',
    'The Voss family has lawyers awake at four in the morning. Consider that a warning.',
    'Herald has a man in the lobby. He was there before we were. Ask yourself how.',
  ],

  locations: [
    { id: 'gilded', name: 'The Gilded Hotel', type: 'hotel', x: 250, y: 150, desc: 'Brass, marble, and eleven floors of people paying not to be noticed.' },
    { id: 'herald', name: 'The Ashgrave Herald', type: 'press', x: 470, y: 108, desc: 'Presses running all night. Ink, sweat, and everybody’s business.' },
    { id: 'cathedral', name: 'St. Ordell’s', type: 'church', x: 722, y: 142, desc: 'Cold stone and colder charity.' },
    { id: 'mercy', name: 'Mercy Hospital', type: 'hospital', x: 886, y: 258, desc: 'Ether and disinfectant. They keep bad records here, and keep them well.' },
    { id: 'parrot', name: 'The Blue Parrot', type: 'bar', x: 156, y: 330, desc: 'A jazz club with a back room and a worse reputation.' },
    { id: 'precinct', name: 'Ashgrave Precinct', type: 'police', x: 494, y: 330, desc: 'Home. Bad coffee, worse paperwork, one working telephone.' },
    { id: 'market', name: 'Lantern Market', type: 'market', x: 634, y: 330, desc: 'Open till dawn. Everything for sale, receipts optional.' },
    { id: 'pawn', name: 'Cobb’s Pawnshop', type: 'shop', x: 330, y: 476, desc: 'Where the city leaves the things it cannot look at anymore.' },
    { id: 'tenement', name: 'Tenement Row', type: 'home', x: 172, y: 560, desc: 'Nine families to a landing. Everyone sees, nobody says.' },
    { id: 'docks', name: 'Rainer Docks', type: 'docks', x: 630, y: 556, desc: 'Oil on black water. The cranes never stop.' },
    { id: 'cannery', name: 'The Old Cannery', type: 'factory', x: 846, y: 460, desc: 'Shut since ’41 and still somehow lit at night.' },
    { id: 'manor', name: 'Voss Manor', type: 'manor', x: 900, y: 618, desc: 'Fourteen rooms on the bluff, and one daughter fewer.' },
  ],
  edges: [
    ['gilded', 'herald'], ['gilded', 'parrot'], ['gilded', 'precinct'],
    ['herald', 'cathedral'], ['herald', 'precinct'],
    ['cathedral', 'mercy'], ['cathedral', 'market'],
    ['mercy', 'cannery'], ['mercy', 'market'],
    ['market', 'precinct'], ['market', 'docks'], ['market', 'cannery'], ['market', 'pawn'],
    ['cannery', 'docks'], ['cannery', 'manor'],
    ['docks', 'manor'], ['docks', 'pawn'],
    ['precinct', 'parrot'], ['precinct', 'pawn'],
    ['parrot', 'tenement'], ['tenement', 'pawn'],
  ],
  start: 'precinct',

  suspects: [
    { id: 'vera', name: 'Vera Lang', role: 'Torch singer, The Blue Parrot',
      blurb: 'Had the eleven o’clock spot and Lillian’s old billing.',
      motive: 'because the top of the bill only fits one name.' },
    { id: 'strand', name: 'Emil Strand', role: 'Night manager, The Gilded',
      blurb: 'The only man with a key to every door in that building.',
      motive: 'because she knew which rooms he rented by the hour, and to whom.' },
    { id: 'pike', name: 'Dr. Aurelio Pike', role: 'Society physician',
      blurb: 'Writes the prescriptions that keep this city upright.',
      motive: 'because she was going to name his pharmacy in open court.' },
    { id: 'mireaux', name: 'Cass Mireaux', role: 'Importer of rare flowers',
      blurb: 'Brings orchids in through the docks. And other things, under them.',
      motive: 'because the orchids were never the cargo, and she had worked that out.' },
    { id: 'tovar', name: 'Deacon Iris Tovar', role: 'St. Ordell’s',
      blurb: 'Runs the soup line and the collection plate. One of them balances.',
      motive: 'because the parish accounts only balanced while she stayed quiet.' },
    { id: 'roland', name: 'Roland Voss', role: 'The victim’s brother',
      blurb: 'Inherits everything and cried in the wrong order.',
      motive: 'because the estate passes whole to the surviving child.' },
    { id: 'brandt', name: 'Nikolai Brandt', role: 'Dock union enforcer',
      blurb: 'Settles arguments the cheap way. Alibi supplied by four men who owe him.',
      motive: 'because somebody paid, and he has never once asked why.' },
    { id: 'shaw', name: 'Perpetua Shaw', role: 'Columnist, The Herald',
      blurb: 'Was in the lobby before the police were. Has never explained that.',
      motive: 'because the column had run dry, and a dead heiress runs for a month.' },
  ],

  epilogue: {
    win: `The cuffs go on in the lobby of the Gilded, under the chandelier, with the morning
      edition already screaming it. Somebody sets the orchid back in the vase on the way out.
      Ashgrave will forget by Thursday. You will not.`,
    loss: `The Herald moves it to page nine, then page nineteen, then nowhere. The suite is
      let again by Christmas. Lillian Voss becomes a thing people almost remember, and the
      rain keeps on doing what rain does.`,
  },
};
