// The Wards' own paperwork for The Lamplighter.
//
// Miriam Weiss was strangled under a gas lamp that had been turned off first,
// on a pavement of soot and chalk, beside a gasworks wall. Every sheet here
// is written for that corner: the mortuary is Frye's, the post-mortem is Dr.
// Rowe's, the plates are the Ward Division camera's, and the soot under the
// lamp takes a boot print like plaster.
//
// One document per trait value. Each states what was seen and stops; the
// `reading` is the conclusion, shown only once the table has marked its own.

import type { ExhibitDef } from '../../types/game-types';
import { clue } from '../clue';

const SCENE = 'ASHGRAVE BAY POLICE · WARD DIVISION · SCENE EXAMINATION';
const SURGEON = 'WARD INFIRMARY · POST-MORTEM · DR. E. ROWE';
const MORGUE = 'WARD MORTUARY · L. FRYE, ATTENDANT';
const PLATES = 'WARD DIVISION · PHOTOGRAPHIC PLATES';

export const LAMP_CLUES: ExhibitDef[] = [
  // ---------------------------------------------------------------- build
  clue('build', 'slight', {
    kind: 'report', label: 'Scene notes — the railings', source: SCENE,
    title: 'Railings and lamp post, {scene}',
    fields: [['Gap', 'ten inches, between the post and the tenement railings'], ['Soot', 'rubbed off both sides at shoulder height'], ['Railings', 'undisturbed, rusted fast']],
    body: [
      'The only way behind the lamp post, out of the light, is a ten-inch gap between the post and the railings of the tenement steps. The soot is rubbed clean off both sides of it tonight, and a thread of dark wool is caught on the rust.',
      'The railings have not moved since they were set. Whoever waited behind the post got there through the gap as it stands.',
    ],
    figure: 'sill', stamp: 'EVIDENCE',
    spoken: 'Somebody waited behind the lamp post, and the only way there is a ten-inch gap.',
    reading: 'Nobody broad or tall goes through ten inches of iron. The killer is slight. Mark Build: Slight.',
  }),
  clue('build', 'broad', {
    kind: 'report', label: 'Scene notes — the gasworks gate', source: SCENE,
    title: 'Side gate, the gasworks wall, {scene}',
    fields: [['Gate', 'thirty inches wide, iron'], ['Marks', 'soot rubbed off both posts at fifty-six inches'], ['Chain', 'lifted off its hook, not cut']],
    body: [
      'The side gate in the gasworks wall behind the lamp was used tonight: the chain was lifted off and the soot on both gate posts is rubbed white at shoulder height. A man scraped both sides at once, going through.',
      'A man has to be as wide as the gate to touch both posts.',
    ],
    figure: 'doorframe', stamp: 'EVIDENCE',
    spoken: 'Whoever went through the gasworks gate scraped both posts at the shoulder.',
    reading: 'A man who fills a thirty-inch gate is broad. Mark Build: Broad.',
  }),
  clue('build', 'tall', {
    kind: 'report', label: 'Scene notes — the lamp glass', source: SCENE,
    title: 'Lamp 41, the lantern, {scene}',
    fields: [['Lantern', 'glass door, seventy-eight inches from the pavement'], ['Marks', 'a hand print in the soot on the glass, palm flat'], ['Ladder', 'none; the pole was not used']],
    body: [
      'The lantern glass carries a full hand print in soot at seventy-eight inches, palm flat, fingers up: somebody steadied himself against the lamp with a hand at the height of his own head, standing on the pavement.',
      'The lamplighter reaches the lantern with a pole. This man reached it with his hand.',
    ],
    figure: 'spatter', stamp: 'EVIDENCE',
    spoken: 'A hand print in the soot on the lantern glass, seventy-eight inches up, from a man standing on the pavement.',
    reading: 'A hand at rest at seventy-eight inches belongs to somebody over six foot three. The killer is tall. Mark Build: Tall.',
  }),
  // ----------------------------------------------------------------- hair
  clue('hair', 'dark', {
    kind: 'lab', label: 'Mortuary sheet — hair in the knot', source: MORGUE,
    title: 'Effects examination, item 2',
    fields: [['Item', 'one hair, pulled into the knot of the cord'], ['Length', 'two inches'], ['Colour', 'dark brown to black, natural'], ['Root', 'present']],
    body: ['Pulled into the hitch as it was drawn tight, so it was on the hands that tied it. The deceased is fair. This hair has never been fair and never seen a bottle.'],
    figure: 'hair-dark', stamp: 'EVIDENCE',
    spoken: 'One dark hair pulled into the knot of the cord, and it is not hers.',
    reading: 'The hands that tied the knot had dark hair on them. The killer has dark hair. Mark Hair: Dark.',
  }),
  clue('hair', 'fair', {
    kind: 'lab', label: 'Mortuary sheet — hair in the knot', source: MORGUE,
    title: 'Effects examination, item 2',
    fields: [['Item', 'one hair, in the wax of the cord'], ['Length', 'three inches'], ['Colour', 'pale blond, natural'], ['Compared with', 'the deceased’s: hers is darker, ash, and cut short']],
    body: ['Pressed into the wax of the cord where a hand gripped it. Fair as winter straw. The deceased wore her hair short and ash-coloured under a nurse’s cap; this is neither.'],
    figure: 'hair-fair', stamp: 'EVIDENCE',
    spoken: 'A pale hair pressed into the wax of the cord, fair as winter straw.',
    reading: 'The killer has fair hair. Mark Hair: Fair.',
  }),
  clue('hair', 'red', {
    kind: 'lab', label: 'Mortuary sheet — hair on the chalk', source: MORGUE,
    title: 'Effects examination, item 4',
    fields: [['Item', 'one hair, stuck to the chalk on her right fingers'], ['Colour', 'copper red, natural'], ['Dye', 'none']],
    body: ['He held her right hand to the pavement to write the number, and a hair of his came away on the chalk. Copper, and not out of a bottle. Nobody in her ward or her lodging has a head like it.'],
    figure: 'hair-red', stamp: 'EVIDENCE',
    spoken: 'One red hair stuck to the chalk on her fingers. Copper, and not out of a bottle.',
    reading: 'The killer has red hair. Mark Hair: Red.',
  }),
  clue('hair', 'grey', {
    kind: 'lab', label: 'Mortuary sheet — hairs in the knot', source: MORGUE,
    title: 'Effects examination, items 2–6',
    fields: [['Items', 'five hairs, in the knot and the wax of the cord'], ['Colour', 'iron grey, natural'], ['Compared with', 'the deceased’s: hers are ash blond, none grey']],
    body: ['Five grey hairs in the knot and along the waxed cord, from the hands that tied and pulled it. Set against the deceased’s under the glass: hers are ash blond with no grey in them at all. These are not hers.'],
    figure: 'hair-grey', stamp: 'EVIDENCE',
    spoken: 'Five grey hairs in the knot of the cord, and none of them is hers.',
    reading: 'The killer has grey hair. Mark Hair: Grey.',
  }),
  // ----------------------------------------------------------------- hand
  clue('hand', 'left', {
    kind: 'lab', label: 'Mortuary sheet — the hitch', source: MORGUE,
    title: 'Effects examination, the knot',
    fields: [['Knot', 'lamplighter’s ladder hitch'], ['Lay', 'working end crosses left over standing part'], ['Compared with', 'the Company’s manual: right over left']],
    body: [
      'The cord is tied with the hitch the Company teaches its lamplighters for the ladder, but mirrored: the working end crosses left over the standing part. A right-handed man ties it the other way without thinking, as the Company manual shows.',
      'A hitch tied mirror-fashion, three times on three women, is a left hand’s habit.',
    ],
    figure: 'wound-left', stamp: 'CONFIDENTIAL',
    spoken: 'The hitch is tied mirror-fashion, left over right, the way a left-handed man ties it.',
    reading: 'The killer is left-handed. Mark Handedness: Left-handed.',
  }),
  clue('hand', 'right', {
    kind: 'photo', label: 'Photograph — the chalk number', source: PLATES,
    title: 'Plate 1: the “41”, developed and enlarged',
    fields: [['Strokes', 'the 4 drawn top to bottom, the 1 with a leading serif'], ['Pressure', 'heavier on the down strokes, feathered to the right'], ['Smear', 'the heel of a hand dragged rightward across the 4']],
    body: ['The chalk lies heavier on the right side of every stroke and the heel of the hand that wrote it dragged rightward across the four as it moved on to the one. That is a right hand writing on stone, leaning on its own heel.'],
    figure: 'glove', stamp: 'EVIDENCE',
    spoken: 'The chalk number was written by a right hand, leaning on its heel and dragging to the right.',
    reading: 'The killer is right-handed. Mark Handedness: Right-handed.',
  }),
  // ----------------------------------------------------------------- mark
  clue('mark', 'scar', {
    kind: 'lab', label: 'Post-mortem — under the nails', source: SURGEON,
    title: 'Scrapings, both hands, {victim}',
    fields: [['Right hand', 'coke dust, skin, blood, a fleck of old scar tissue'], ['Left hand', 'coke dust, chalk'], ['Conclusion', 'she clawed at the hands on the cord']],
    body: ['She got her nails into the hands that held the cord. Under the right hand’s nails, with the coke dust: skin, blood, and a hard white fleck that is old scar tissue, the kind that comes away from a badly healed wound when it is clawed.'],
    stamp: 'CONFIDENTIAL',
    spoken: 'Under her nails, coke dust, skin, blood, and a fleck of old scar tissue.',
    reading: 'She clawed a scar. The killer carries one. Mark Distinguishing mark: A scar.',
  }),
  clue('mark', 'tattoo', {
    kind: 'statement', label: 'Witness statement — the market boy', source: 'WARD DIVISION · STATEMENT FORM 9',
    title: 'Statement of a market boy, aged eleven',
    fields: [['Where', 'Gasworks Lane, under Lamp 41'], ['When', 'about eleven, running the note'], ['Saw', 'the man’s wrist when he held out the sixpence']],
    body: ['“He held the sixpence out and his sleeve went up and there was blue on his wrist. Ink. Like the sailors at the canal have. I looked at it instead of his face because it was the only thing in the light. Then he said run, so I ran.”'],
    figure: 'tattoo', stamp: 'COPY',
    spoken: 'The market boy saw blue ink on the wrist that held out the sixpence.',
    reading: 'The killer has a tattoo. Mark Distinguishing mark: A tattoo.',
  }),
  clue('mark', 'missing', {
    kind: 'photo', label: 'Photograph — print on the post', source: PLATES,
    title: 'Plate 3: the lamp post, valve cover, developed',
    fields: [['Surface', 'iron, soot'], ['Print', 'left hand, gripping the post above the valve'], ['Fingers', 'four']],
    body: ['Whoever knelt to the valve steadied himself with his left hand on the post above it, and the soot took the whole hand. Thumb, first, second and little finger. Where the third finger should press there is nothing at all.'],
    figure: 'four-fingers', stamp: 'EVIDENCE',
    spoken: 'A hand print in the soot on the post, and it has four fingers. Only four.',
    reading: 'The hand that turned the lamp off is short a finger. Mark Distinguishing mark: A missing finger.',
  }),
  clue('mark', 'clean', {
    kind: 'statement', label: 'Witness statement — the market boy', source: 'WARD DIVISION · STATEMENT FORM 9',
    title: 'Statement of a market boy, aged eleven',
    fields: [['Where', 'Gasworks Lane, under Lamp 41'], ['When', 'about eleven, running the note'], ['Saw', 'his face in the lamplight, for a second']],
    body: ['“The lamp was still lit then and he stood under it to give me the sixpence, so I saw his face. There was nothing on it. No scar, no mark. An ordinary face, an old face. I would know it again. There was nothing to know it by, that is what I remember.”'],
    stamp: 'COPY',
    spoken: 'The market boy saw the face under the lamp, and there was nothing on it.',
    reading: 'No scar, no ink, nothing missing. The killer is unmarked. Mark Distinguishing mark: Unmarked.',
  }),
  // ----------------------------------------------------------------- vice
  clue('vice', 'cards', {
    kind: 'card', label: 'Marker — the Gas Lamp’s back room', source: 'FOUND IN THE GUTTER UNDER THE LAMP',
    title: 'I.O.U. — two pounds — back room, the Gas Lamp',
    fields: [['Amount', 'two pounds'], ['Game', 'Tuesday, the back room'], ['Signed', 'a scrawl, not the deceased’s hand']],
    body: ['In the gutter under the lamp, on top of the leaves, so it went down tonight. A marker from Gurney’s Tuesday game, creased from a pocket. The deceased did not play cards; she did not have the evenings.'],
    figure: 'marker', stamp: 'EVIDENCE',
    spoken: 'A marker from the Gas Lamp’s back room, in the gutter under the lamp, dropped tonight.',
    reading: 'Somebody under that lamp plays cards for money. Mark Vice: Cards.',
  }),
  clue('vice', 'drink', {
    kind: 'photo', label: 'Photograph — the bottle on the wall', source: PLATES,
    title: 'Plate 2: the gasworks wall, {scene}',
    fields: [['Item', 'half bottle, cheap rum, a third gone'], ['Where', 'on top of the wall behind the lamp, in the dark'], ['Deceased', 'did not drink; the Infirmary is strict']],
    body: ['A half bottle of cheap rum set on top of the gasworks wall behind the lamp, where a man waiting in the dark would put it down to free his hands. A third gone. The stoker swears it was not there at ten. The deceased did not drink.'],
    figure: 'glasses', stamp: 'EVIDENCE',
    spoken: 'A half bottle of rum on the wall behind the lamp, a third gone, and she did not drink.',
    reading: 'Somebody needed a drink while he waited. Mark Vice: Drink.',
  }),
  clue('vice', 'opium', {
    kind: 'lab', label: 'Laboratory sheet — her cape', source: 'WARD INFIRMARY · LABORATORY',
    title: 'Residue examination, nurse’s cape, collar',
    fields: [['Item', 'the deceased’s cape, collar and shoulders'], ['Residue', 'sweet resinous smoke, recent'], ['Identified', 'opium']],
    body: ['The collar of her cape, where his face was over her shoulder, reeks of sweet smoke, and a warm knife against the wool brings it up strong. He had smoked a pipe not long before. The ward has one place that sells it, behind a chemist’s counter.'],
    figure: 'pipe', stamp: 'EVIDENCE',
    spoken: 'The collar of her cape reeks of sweet smoke, where his face was.',
    reading: 'The killer chases the dragon. Mark Vice: The pipe.',
  }),
  clue('vice', 'clean', {
    kind: 'report', label: 'Inventory — the pavement', source: SCENE,
    title: 'Contents of the pavement and gutter, {scene}',
    fields: [['Bottles', 'none'], ['Cigarette ends', 'none, and none fresh in the gutter'], ['Markers, cards, dice', 'none'], ['Found', 'chalk, the cord, the key, soot']],
    body: ['Swept to the kerb. Chalk dust, the cord, the key, soot. Not a bottle, not a butt, not a card. A man waited behind that lamp post for an hour in December and left nothing behind him to warm the hands.'],
    stamp: 'EVIDENCE',
    spoken: 'An hour behind a lamp post in December, and not a bottle, not a butt, not a card.',
    reading: 'No drink, no smoke, no cards. The killer keeps clean. Mark Vice: No vice.',
  }),
  // ---------------------------------------------------------------- scent
  clue('scent', 'tobacco', {
    kind: 'lab', label: 'Laboratory sheet — the cord', source: 'WARD INFIRMARY · LABORATORY',
    title: 'Fabric examination, waxed cord',
    fields: [['Item', 'the cord, both ends'], ['Smell', 'cheap shag tobacco, deep in the wax'], ['Deceased', 'did not smoke']],
    body: ['Wax holds a smell, and the cord has taken the smell of the pocket it was carried in: cheap shag, the kind sold loose by the ounce at the market. The deceased did not smoke and the Infirmary does not allow it.'],
    stamp: 'EVIDENCE',
    spoken: 'The cord stinks of cheap shag tobacco from the pocket it was carried in.',
    reading: 'The killer reeks of cheap tobacco. Mark Scent: Cheap tobacco.',
  }),
  clue('scent', 'perfume', {
    kind: 'lab', label: 'Laboratory sheet — the cap', source: 'WARD INFIRMARY · LABORATORY',
    title: 'Fabric examination, nurse’s cap and collar',
    fields: [['Item', 'cap and left collar'], ['Smell', 'orchid, strong'], ['Source', 'not the deceased; nurses wear no scent on the ward']],
    body: ['Her cap and the left side of her collar smell of orchid perfume, laid on thick and laid on close. Nurses wear no scent on the ward and she never had. Somebody with that perfume on them held her by the collar.'],
    stamp: 'EVIDENCE',
    spoken: 'Orchid perfume on her cap and collar, and she never wore any.',
    reading: 'The killer wears orchid perfume. Mark Scent: Orchid perfume.',
  }),
  clue('scent', 'oil', {
    kind: 'photo', label: 'Photograph — the valve cover', source: PLATES,
    title: 'Plate 4: the base valve, developed',
    fields: [['Surface', 'iron cover, soot'], ['Print', 'thumb, in machine oil'], ['Deceased', 'a nurse’s hands, carbolic and nothing else']],
    body: ['One clear thumb print on the valve cover, developed with powder, and it stands out because it is in machine oil: the thick black kind from a pump or an engine, worked into the skin so it never washes out. Whoever knelt to that valve works with engines.'],
    figure: 'thumbprint', stamp: 'EVIDENCE',
    spoken: 'A thumb print on the valve cover, and it is in machine oil.',
    reading: 'The killer has engine oil in the skin. Mark Scent: Machine oil.',
  }),
  clue('scent', 'ether', {
    kind: 'lab', label: 'Laboratory sheet — the chalk', source: 'WARD INFIRMARY · LABORATORY',
    title: 'Residue examination, chalk dust from the pavement',
    fields: [['Item', 'chalk scraped from the “41”'], ['Smell', 'ether, sweet and sharp, still strong'], ['Source', 'the hand that held the chalk']],
    body: ['Chalk takes a smell the way wax does, and the chalk of the number smells of ether. It came from the fingers that held it: whoever wrote the number had ether on his hands, the sweet sharp smell of a dispensary shelf or a hospital corridor.'],
    stamp: 'EVIDENCE',
    spoken: 'The chalk of the number smells of ether. It came from the hand that held it.',
    reading: 'The killer smells of ether. Mark Scent: Ether.',
  }),
  // ----------------------------------------------------------------- shoe
  clue('shoe', 'small', {
    kind: 'cast', label: 'Plaster cast — the soot', source: 'WARD DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the soot behind the post, {scene}',
    fields: [['Print', 'left boot, complete'], ['Length', 'ten and one-half inches'], ['Size', 'eight'], ['Deceased', 'size five, nurse’s shoes']],
    body: ['The soot under the gasworks wall takes a print like plaster, and the frost has kept this one: a neat size eight boot, hobnailed, standing behind the post with the toe toward the pavement. The deceased wore a five and never stood there.'],
    figure: 'footprint-small', stamp: 'EVIDENCE',
    spoken: 'A neat size eight boot in the soot behind the post, toe toward the pavement.',
    reading: 'The killer wears a size eight. Mark Footprint: Size 8.',
  }),
  clue('shoe', 'mid', {
    kind: 'cast', label: 'Plaster cast — the soot', source: 'WARD DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the soot behind the post, {scene}',
    fields: [['Print', 'right boot, complete'], ['Length', 'eleven and one-quarter inches'], ['Size', 'ten'], ['Wear', 'outer heel, hard']],
    body: ['Where he stood behind the post in the soot, one boot is printed like plaster and the frost has kept it: a size ten, worn down hard on the outside of the heel. The deceased wore a five and never stood there.'],
    figure: 'footprint-mid', stamp: 'EVIDENCE',
    spoken: 'A size ten boot in the soot behind the post, worn hard on the outer heel.',
    reading: 'The killer wears a size ten. Mark Footprint: Size 10.',
  }),
  clue('shoe', 'large', {
    kind: 'cast', label: 'Plaster cast — the soot', source: 'WARD DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the soot behind the post, {scene}',
    fields: [['Print', 'right boot, complete'], ['Length', 'twelve and three-quarter inches'], ['Size', 'twelve'], ['Deceased', 'size five, nurse’s shoes']],
    body: ['Where he stood behind the post in the soot, one boot is printed like plaster and the frost has kept it: a size twelve, a boat of a boot, toe toward the pavement. The deceased wore a five and never stood there.'],
    figure: 'footprint-large', stamp: 'EVIDENCE',
    spoken: 'A size twelve boot in the soot behind the post, toe toward the pavement.',
    reading: 'The killer wears a size twelve. Mark Footprint: Size 12.',
  }),
];
