import type { CaseDef } from '../../types/game-types';

const def: CaseDef = {
  id: 'bell',
  title: 'The Ninth Bell',
  subtitle: 'Cathedral Hill · April 1948',
  tagline: 'The bell rang nine at midnight. By morning the ringer was dead at the foot of her own tower.',
  victim: 'Sister Constance Ayre',
  scene: 'tower',
  difficultyHint: 'Everyone on this hill is lying about something.',
  publicTraits: ['build', 'hair'],
  traitPool: ['hand', 'mark', 'vice', 'scent', 'shoe'],

  briefing: `At midnight the bell of St. Ordell’s rang nine times. It has rung twelve at
    midnight for a hundred and four years. At six in the morning the verger finds Sister
    Constance Ayre at the foot of the tower stair with her keys still in her hand and the back
    of her skull opened up.
    She did not fall. The stair turns the wrong way for that. And somebody climbed two hundred
    and eleven steps in the dark to ring a number that means something to exactly one person
    on this hill. Find out who counts to nine.`,

  radio: [
    'Dispatch to Hill Division. The diocese has asked for discretion. Note the request and ignore it.',
    'The asylum logged an open gate at eleven-forty. They logged it closed again at one.',
    'The bell rope is cut clean. Whoever went up did not come down the stair.',
  ],

  terrain: {
    sea: false, river: true, riverSource: 0.18, riverMouth: 0.5,
    lakeAt: 'reservoir', lakeName: 'THE RESERVOIR', parks: 3,
    districts: [
      { text: 'CATHEDRAL HILL', x: 330, y: 110, rot: -4 },
      { text: 'THE TERRACES', x: 900, y: 330, rot: 3 },
      { text: 'LOWER ORDELL', x: 280, y: 680, rot: -2 },
    ],
  },
  locations: [
    { id: 'tower', name: 'The Bell Tower', type: 'church', x: 470, y: 112, desc: 'Two hundred and eleven steps and a rope cut clean through.' },
    { id: 'rectory', name: 'The Rectory', type: 'manor', x: 226, y: 158, desc: 'Sherry, silence, and a fire that is always already lit.' },
    { id: 'academy', name: 'Ordell Academy', type: 'school', x: 716, y: 140, desc: 'Boys in grey, out of bed, and nobody counting them.' },
    { id: 'observ', name: 'The Observatory', type: 'light', x: 898, y: 252, desc: 'One telescope pointed at heaven, one window pointed at the hill.' },
    { id: 'division', name: 'Hill Division', type: 'police', x: 478, y: 322, desc: 'Three constables and a kettle. Yours, for now.' },
    { id: 'almshouse', name: 'The Almshouse', type: 'home', x: 170, y: 336, desc: 'Forty beds, thirty-nine occupied, no register worth the paper.' },
    { id: 'glasshouse', name: 'The Glasshouse', type: 'market', x: 656, y: 328, desc: 'Orchids and orange trees under forty tons of condensation.' },
    { id: 'asylum', name: 'Marrow House', type: 'hospital', x: 872, y: 448, desc: 'The gate was logged open at eleven-forty. That is all they will tell you.' },
    { id: 'cemetery', name: 'Ordell Cemetery', type: 'morgue', x: 322, y: 484, desc: 'Fresh earth on plot forty-four, and nobody buried there this month.' },
    { id: 'depot', name: 'The Tram Depot', type: 'station', x: 164, y: 580, desc: 'Last car up the hill leaves at eleven. Somebody signed it out at midnight.' },
    { id: 'reservoir', name: 'The Reservoir', type: 'bridge', x: 614, y: 566, desc: 'Black water behind a wall, and a walkway nobody is supposed to use.' },
    { id: 'crypt', name: 'The Crypt', type: 'bank', x: 888, y: 624, desc: 'Four hundred years of the diocese’s dead, and its ledgers.' },
  ],
  edges: [
    ['tower', 'rectory'], ['tower', 'academy'], ['tower', 'division'], ['tower', 'glasshouse'],
    ['rectory', 'almshouse'],
    ['academy', 'observ'], ['academy', 'glasshouse'],
    ['observ', 'asylum'],
    ['division', 'almshouse'], ['division', 'glasshouse'], ['division', 'cemetery'],
    ['glasshouse', 'asylum'], ['glasshouse', 'reservoir'],
    ['asylum', 'crypt'],
    ['cemetery', 'depot'], ['cemetery', 'reservoir'],
    ['depot', 'almshouse'],
    ['reservoir', 'crypt'],
  ],
  start: 'division',

  suspects: [
    { id: 'verger', name: 'Cormac Ill', role: 'The verger',
      blurb: 'Found the body. Had already washed the stair when we arrived.',
      motive: 'because she had begun to ask what he does with the keys at night.' },
    { id: 'canon', name: 'Canon Aldritch', role: 'Canon of St. Ordell’s',
      blurb: 'Says he slept through it. His window faces the tower.',
      motive: 'because the crypt ledgers do not survive an honest reading.' },
    { id: 'matron', name: 'Matron Sybil Crake', role: 'Marrow House',
      blurb: 'Logged the gate open at eleven-forty and will not say who went through it.',
      motive: 'because one of her patients is not a patient, and Constance had worked it out.' },
    { id: 'tutor', name: 'Mr. Ewan Blake', role: 'Master at Ordell Academy',
      blurb: 'Boys out of bed. A master who cannot say where he was.',
      motive: 'because she wrote a letter to the diocese and never posted it.' },
    { id: 'astro', name: 'Dr. Halla Quint', role: 'Astronomer',
      blurb: 'Was awake. Was looking. Refuses to say at what.',
      motive: 'because through that telescope she had watched something she could not unsee.' },
    { id: 'gardener', name: 'Peter Nane', role: 'Glasshouse gardener',
      blurb: 'Dug plot forty-four. Nobody is buried in plot forty-four.',
      motive: 'because the grave was dug on Tuesday and the death was on Friday.' },
    { id: 'driver', name: 'Rosalind Fay', role: 'Tram driver',
      blurb: 'Signed a car out of the depot at midnight and brought it back wet.',
      motive: 'because the last car up the hill carried a passenger she was paid to forget.' },
    { id: 'sister', name: 'Sister Beatrix Ayre', role: 'The victim’s sister',
      blurb: 'Arrived on the hill three days ago. Has not explained why.',
      motive: 'because nine is how many years Constance let her rot in Marrow House.' },
  ],

  witnesses: [
    { id: 'tull', at: 'rectory', name: 'Ivy Tull', role: 'housekeeper, the Rectory',
      intro: 'Mrs. Tull. I keep the Canon’s house, and I know who comes to his door and what they want from him.',
      knows: ['canon', 'verger', 'sister'],
      aboutLine: 'Takes tea in this house. I have poured it, and I have watched.',
      leadLine: 'Somebody came down the hill in the dark and left by the garden. There were footprints toward',
      spentLine: 'The Canon would not want me talking. Neither do I.' },
    { id: 'wick', at: 'academy', name: 'Josiah Wick', role: 'porter, Ordell Academy',
      intro: 'Wick. I lock the gates at ten. Tonight somebody had a key that was not mine.',
      knows: ['tutor', 'astro'],
      aboutLine: 'On the staff, or near enough. I see them every morning across the quad.',
      leadLine: 'A boy found something on the playing fields at dawn and was too frightened to say. It went to',
      spentLine: 'The gate is shut and I have a bell to ring in three hours.' },
    { id: 'greer', at: 'almshouse', name: 'Mother Greer', role: 'resident, the Almshouse',
      intro: 'They call me Mother Greer. Seventy-one years in this parish. I have buried two of the people you are looking for and will bury a third.',
      knows: ['matron', 'gardener', 'driver'],
      aboutLine: 'I have known that one since they were small. Small people become large people; they do not become different ones.',
      leadLine: 'I do not sleep. I heard the side door and saw somebody carry a bundle toward',
      spentLine: 'I am tired, child. Come back when it is light and bring biscuits.' },
    { id: 'marley', at: 'depot', name: 'Fen Marley', role: 'night dispatcher, the Tram Depot',
      intro: 'Marley. I sign the cars out and in. Last car is eleven. Tonight one went out at midnight and I did not sign it.',
      knows: ['driver', 'tutor', 'sister'],
      aboutLine: 'Rides the last car. You learn a person by which seat they take.',
      leadLine: 'A parcel came off the midnight car and was left on the bench. It was taken up to',
      spentLine: 'The schedule is the schedule and I have said what I know.' },
    { id: 'lister', at: 'glasshouse', name: 'Bo Lister', role: 'stoker, the Glasshouse',
      intro: 'Lister. I keep the boilers so the orchids do not freeze. It is warmer in here than anywhere in the parish, so people come.',
      knows: ['gardener', 'astro', 'matron'],
      aboutLine: 'Comes in to get warm. You see a person plainly in this light.',
      leadLine: 'Somebody burned something in my firebox tonight and did not burn all of it. What was left went up the hill to',
      spentLine: 'The boilers need me. The police do not.' },
    { id: 'grimm', at: 'cemetery', name: 'Silas Grimm', role: 'gravedigger',
      intro: 'Grimm. I dig. Tonight I found a hole I had not dug, and I want to know who did.',
      knows: ['verger', 'canon'],
      aboutLine: 'Stands over graves I dig. You see what a person is at a funeral.',
      leadLine: 'Fresh earth was moved and something was taken out of it, not put in. The cart tracks run to',
      spentLine: 'I have a hole to fill and I have already said too much.' },
  ],

  items: [],

  epilogue: {
    win: `They ring twelve at midnight again, and the hill pretends that settles it. You stand
      in the wet grass under two hundred and eleven steps of cold stone and you count to nine,
      once, for Constance Ayre, and then you go home.`,
    loss: `The diocese gets its discretion. Accidental fall, says the certificate, on a stair
      that turns the wrong way. The bell rings twelve. Somebody on this hill hears nine every
      night for the rest of their life, and it is not you.`,
  },
};

export default def;
