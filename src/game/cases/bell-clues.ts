// Cathedral Hill's own paperwork for The Ninth Bell.
//
// Sister Constance Ayre was struck from behind at the top of two hundred and
// eleven steps, the bell rope was cut on the ringing floor, and whoever did it
// came down the iron rungs on the outside of the tower. Every sheet here is
// written for that tower, that rope and that hill: the police surgeon at Hill
// Division, the chemist at the Dispensary, plates from the Division camera.
//
// One document per trait value. Each states what was seen and stops; the
// `reading` is the conclusion, shown only once the table has marked its own.

import type { ExhibitDef } from '../../types/game-types';
import { clue } from '../clue';

const SCENE = 'HILL DIVISION · SCENE EXAMINATION';
const SURGEON = 'HILL DIVISION · POLICE SURGEON';
const CHEMIST = 'HILL DISPENSARY · ANALYSIS FOR THE POLICE';
const PLATES = 'HILL DIVISION · PHOTOGRAPHIC PLATES';

export const BELL_CLUES: ExhibitDef[] = [
  // ---------------------------------------------------------------- build
  clue('build', 'slight', {
    kind: 'report', label: 'Scene notes — the parapet gap', source: SCENE,
    title: 'Parapet, ringing floor, {scene}',
    fields: [['Way out', 'the iron rungs, outside the north wall'], ['Reached through', 'a gap in the parapet stone, ten inches'], ['Stone', 'undisturbed, lichen rubbed at the edges']],
    body: [
      'The rungs on the outside of the tower can only be reached through a gap in the parapet where a stone fell out in 1911. It is ten inches wide. The lichen is rubbed off both edges tonight and there is a thread of dark wool on the iron below it.',
      'The stones either side have not moved in thirty years and did not move tonight. Whoever went out to the rungs went through the gap as it stands.',
    ],
    figure: 'sill', stamp: 'EVIDENCE',
    spoken: 'The only way to the rungs is a ten-inch gap in the parapet, and somebody went through it as it stands.',
    reading: 'Nobody broad or tall goes through ten inches of stone. The killer is slight. Mark Build: Slight.',
  }),
  clue('build', 'broad', {
    kind: 'report', label: 'Scene notes — the trapdoor', source: SCENE,
    title: 'Trapdoor to the ringing floor, {scene}',
    fields: [['Trap', 'oak, bolted from above'], ['Frame', 'split at the bolt, shoulder height on the stair'], ['Bolt', 'held; the wood did not']],
    body: [
      'The trapdoor to the ringing floor was bolted from above. The frame is split fresh along the bolt side at fifty-eight inches from the stair tread below it: a shoulder driven up against oak from the stairs until the wood gave around the bolt.',
      'The bolt is still shot. It is the frame that broke. It takes weight to do that to a beam.',
    ],
    figure: 'doorframe', stamp: 'EVIDENCE',
    spoken: 'The trapdoor frame is split at shoulder height, and it took weight to do it.',
    reading: 'It takes a heavy shoulder to split an oak frame around its bolt. The killer is broad. Mark Build: Broad.',
  }),
  clue('build', 'tall', {
    kind: 'report', label: 'Scene notes — the cut rope', source: SCENE,
    title: 'The bell rope, ringing floor, {scene}',
    fields: [['Cut', 'one stroke, clean, level'], ['Height of cut', 'seventy-eight inches above the boards'], ['Sally', 'hangs at sixty inches; the deceased rang from there']],
    body: [
      'The rope was cut with one level stroke, seventy-eight inches above the ringing floor. A rope is cut where the hand naturally is. The sally, where the deceased took hold every night for twenty years, hangs at sixty.',
      'Nobody stands on anything to cut a rope in the dark. The hand that did this was eighteen inches above hers at rest.',
    ],
    figure: 'spatter', stamp: 'EVIDENCE',
    spoken: 'The rope was cut level at seventy-eight inches, where the hand naturally is.',
    reading: 'A hand at rest at seventy-eight inches belongs to somebody over six foot three. The killer is tall. Mark Build: Tall.',
  }),
  // ----------------------------------------------------------------- hair
  clue('hair', 'dark', {
    kind: 'lab', label: 'Analysis — hair in the cut end', source: CHEMIST,
    title: 'Examination, the cut end of the rope',
    fields: [['Item', 'one hair, pulled into the cut fibres'], ['Length', 'two inches'], ['Colour', 'dark brown to black, natural'], ['Root', 'present']],
    body: ['Drawn into the fibres of the cut end when the rope was pulled after cutting, so it was on the hand that rang the nine. The deceased’s hair is grey and cropped under the veil. This has never been grey and never been near a bottle.'],
    figure: 'hair-dark', stamp: 'EVIDENCE',
    spoken: 'One dark hair pulled into the cut end of the rope, and it is not hers.',
    reading: 'The hand that rang the nine had dark hair on it. The killer has dark hair. Mark Hair: Dark.',
  }),
  clue('hair', 'fair', {
    kind: 'lab', label: 'Analysis — hair in the cut end', source: CHEMIST,
    title: 'Examination, the cut end of the rope',
    fields: [['Item', 'one hair, in the cut fibres'], ['Length', 'three inches'], ['Colour', 'pale blond, natural'], ['Root', 'present']],
    body: ['Caught in the fibres of the cut end, so it was on the hand that rang after the cut. The deceased’s hair is grey and cropped. Nobody in the choir or the chapter is fair.'],
    figure: 'hair-fair', stamp: 'EVIDENCE',
    spoken: 'A pale hair in the cut end of the rope, fair as winter straw.',
    reading: 'The killer has fair hair. Mark Hair: Fair.',
  }),
  clue('hair', 'red', {
    kind: 'lab', label: 'Analysis — hair on the rungs', source: CHEMIST,
    title: 'Examination, rust scraping, fourth rung',
    fields: [['Item', 'one hair, on the fourth rung from the top'], ['Colour', 'copper red, natural'], ['Dye', 'none']],
    body: ['Stuck in the rust on the fourth rung down, where a head would pass close to the iron on the way over the parapet. Copper, and not out of a bottle. There is not a head like it on the hill.'],
    figure: 'hair-red', stamp: 'EVIDENCE',
    spoken: 'One red hair in the rust on the fourth rung. Copper, and not out of a bottle.',
    reading: 'The killer has red hair. Mark Hair: Red.',
  }),
  clue('hair', 'grey', {
    kind: 'lab', label: 'Analysis — hairs in the cut end', source: CHEMIST,
    title: 'Examination, the cut end of the rope',
    fields: [['Items', 'five hairs, in the cut fibres'], ['Colour', 'iron grey, natural'], ['Compared with', 'the deceased’s: hers are shorter and whiter']],
    body: ['Five grey hairs in the fibres of the cut end. Set against the deceased’s own under the glass: hers are cropped short and nearly white; these are longer, darker grey, and they are not hers.'],
    figure: 'hair-grey', stamp: 'EVIDENCE',
    spoken: 'Five grey hairs in the cut end of the rope, and none of them is hers.',
    reading: 'The killer has grey hair. Mark Hair: Grey.',
  }),
  // ----------------------------------------------------------------- hand
  clue('hand', 'left', {
    kind: 'lab', label: 'Analysis — the cut fibres', source: CHEMIST,
    title: 'Examination, direction of the cut',
    fields: [['Cut', 'one stroke, drawn'], ['Fibres', 'laid over from the deceased’s right to her left'], ['Blade', 'drawn toward the cutter’s own body']],
    body: [
      'A drawn cut lays the fibres over in the direction the blade travelled. These are laid from right to left as you face the rope from the stairs, with the last strands torn on the left.',
      'Standing where the cutter stood, a blade drawn across the body from right to left is a blade in the left hand.',
    ],
    figure: 'wound-left', stamp: 'CONFIDENTIAL',
    spoken: 'The rope fibres are laid over right to left, from a blade drawn in the left hand.',
    reading: 'The killer is left-handed. Mark Handedness: Left-handed.',
  }),
  clue('hand', 'right', {
    kind: 'report', label: 'Post-mortem — the blow', source: SURGEON,
    title: 'Post-mortem, {victim}',
    fields: [['Injury', 'single blow, back of the head, left side'], ['Instrument', 'heavy, rounded, the clapper bolt'], ['Position of assailant', 'behind, on the step above']],
    body: [
      'One blow to the back of the head, landing on the left side of the skull, from behind and above. The assailant stood on the step above her as she came up, and swung.',
      'From behind, a blow that lands on the left side of the head is swung from the right hand.',
    ],
    figure: 'glove', stamp: 'CONFIDENTIAL',
    spoken: 'One blow from behind, landing on the left side of her head, swung from the right hand.',
    reading: 'The killer is right-handed. Mark Handedness: Right-handed.',
  }),
  // ----------------------------------------------------------------- mark
  clue('mark', 'scar', {
    kind: 'lab', label: 'Post-mortem — under the nails', source: SURGEON,
    title: 'Scrapings, both hands, {victim}',
    fields: [['Right hand', 'skin, blood, a fleck of old scar tissue'], ['Left hand', 'rope fibre, chalk'], ['Conclusion', 'she turned and caught hold']],
    body: ['She turned on the step and got a hand on whoever was above her. Under the nails of the right hand: skin, blood, and a hard white fleck that is old scar tissue, the kind that comes away from a badly healed wound when it is clawed.'],
    stamp: 'CONFIDENTIAL',
    spoken: 'Under her nails, skin and blood and a fleck of old scar tissue.',
    reading: 'She clawed a scar. The killer carries one. Mark Distinguishing mark: A scar.',
  }),
  clue('mark', 'tattoo', {
    kind: 'statement', label: 'Witness statement — a third-form boy', source: 'HILL DIVISION · STATEMENT FORM 9',
    title: 'Statement of a boy of the Academy, aged fifteen',
    fields: [['Where', 'the reservoir path, under the tower'], ['When', 'a little after midnight'], ['Saw', 'a hand on the rungs, sleeve pushed up']],
    body: ['“Somebody was coming down the outside of the tower. I was under the wall. A hand came down onto the rung level with the lamp and the sleeve went up and there was blue on the wrist. Ink, like a sailor’s. I didn’t see the face. I ran.”'],
    figure: 'tattoo', stamp: 'COPY',
    spoken: 'A boy under the tower saw a hand on the rungs with blue ink on the wrist.',
    reading: 'The killer has a tattoo. Mark Distinguishing mark: A tattoo.',
  }),
  clue('mark', 'missing', {
    kind: 'photo', label: 'Photograph — print in the chalk', source: PLATES,
    title: 'Plate 6: the rail, ringing floor, developed',
    fields: [['Surface', 'iron rail, rope chalk on it'], ['Print', 'left hand, gripping'], ['Fingers', 'four']],
    body: ['The ringers chalk their hands, and the rail by the rope carries a full hand print in chalk where somebody took hold to steady the swing. Thumb, first, second and little finger. Where the third finger should press there is nothing at all.'],
    figure: 'four-fingers', stamp: 'EVIDENCE',
    spoken: 'A hand print in chalk on the ringing-floor rail, and it has four fingers. Only four.',
    reading: 'The hand that rang the nine is short a finger. Mark Distinguishing mark: A missing finger.',
  }),
  clue('mark', 'clean', {
    kind: 'statement', label: 'Witness statement — a third-form boy', source: 'HILL DIVISION · STATEMENT FORM 9',
    title: 'Statement of a boy of the Academy, aged fifteen',
    fields: [['Where', 'the reservoir path, under the tower'], ['When', 'a little after midnight'], ['Saw', 'a face, in the lamp, for a second']],
    body: ['“They came off the bottom rung and turned into the lamp for a second before they saw me. I’d know it again. There was nothing on it. No scar, no mark, nothing. An ordinary face. That’s what I remember: there was nothing to remember.”'],
    stamp: 'COPY',
    spoken: 'The boy saw the face in the lamp for a second, and there was nothing on it.',
    reading: 'No scar, no ink, nothing missing. The killer is unmarked. Mark Distinguishing mark: Unmarked.',
  }),
  // ----------------------------------------------------------------- vice
  clue('vice', 'cards', {
    kind: 'card', label: 'Marker — the Lamplighter’s back room', source: 'FOUND ON THE RINGING FLOOR',
    title: 'I.O.U. — three pounds — the Lamplighter’s, Friday',
    fields: [['Amount', 'three pounds'], ['Game', 'Friday, the back room'], ['Signed', 'a scrawl, not the deceased’s hand']],
    body: ['Lying in the rope chalk by the trapdoor. A marker from the Lamplighter’s Friday game, creased from a pocket. The deceased had not been inside a public house in twenty years and would have said so.'],
    figure: 'marker', stamp: 'EVIDENCE',
    spoken: 'A marker from the Lamplighter’s back room, lying in the chalk by the trapdoor.',
    reading: 'Somebody on that floor plays cards for money. Mark Vice: Cards.',
  }),
  clue('vice', 'drink', {
    kind: 'photo', label: 'Photograph — the flask on the stair', source: PLATES,
    title: 'Plate 2: the stair, step one hundred and ninety',
    fields: [['Item', 'hip flask, pewter, a third gone'], ['Where', 'on the step, against the wall'], ['Contents', 'brandy'], ['Deceased', 'took nothing but communion wine']],
    body: ['A pewter hip flask on step one hundred and ninety, set against the wall as if put down to free a hand. Brandy, a third gone. The verger swears the stair was swept at six that evening. The deceased did not drink.'],
    figure: 'glasses', stamp: 'EVIDENCE',
    spoken: 'A hip flask of brandy on the stair, a third gone, and she did not drink.',
    reading: 'Somebody needed a drink on the way up, or down. Mark Vice: Drink.',
  }),
  clue('vice', 'opium', {
    kind: 'lab', label: 'Analysis — the ringing-floor curtain', source: CHEMIST,
    title: 'Residue examination, the draught curtain',
    fields: [['Item', 'the curtain across the ringing-floor door'], ['Residue', 'sweet resinous smoke, recent'], ['Identified', 'opium']],
    body: ['The curtain across the ringing-floor door smells of sweet smoke, and a warm knife against the cloth brings it up strong. Somebody stood behind that curtain long enough to smoke a pipe. The nearest place on the hill that sells it is a chemist’s back room.'],
    figure: 'pipe', stamp: 'EVIDENCE',
    spoken: 'The curtain on the ringing floor reeks of sweet smoke. Somebody waited behind it with a pipe.',
    reading: 'Whoever waited on that floor chases the dragon. Mark Vice: The pipe.',
  }),
  clue('vice', 'clean', {
    kind: 'report', label: 'Inventory — the ringing floor', source: SCENE,
    title: 'Contents of the ringing floor, {scene}',
    fields: [['Bottles, flasks', 'none'], ['Cigarette ends, ash', 'none'], ['Markers, cards, dice', 'none'], ['Found', 'the cut rope, chalk, the clapper bolt']],
    body: ['Turned out to the boards. The cut rope, the chalk box, the clapper bolt, dust. Not a bottle, not a butt, not a card. Somebody waited up there in the cold for an hour and left nothing to warm the hands.'],
    stamp: 'EVIDENCE',
    spoken: 'An hour waiting on the ringing floor in February, and not a bottle, not a butt, not a card.',
    reading: 'No drink, no smoke, no cards. The killer keeps clean. Mark Vice: No vice.',
  }),
  // ---------------------------------------------------------------- scent
  clue('scent', 'tobacco', {
    kind: 'lab', label: 'Analysis — the rope', source: CHEMIST,
    title: 'Fabric examination, the bell rope, sally and tail',
    fields: [['Item', 'the rope below the cut'], ['Smell', 'cheap shag tobacco, deep in the wool of the sally'], ['Deceased', 'did not smoke; the verger smokes a pipe of Navy Cut']],
    body: ['The sally, the woollen grip of the rope, has taken the smell of the hands that rang the nine: cheap shag, the kind sold loose by the ounce at the tram depot. Neither the deceased nor the verger has ever had shag on their hands.'],
    stamp: 'EVIDENCE',
    spoken: 'The sally of the rope stinks of cheap shag tobacco, and she never smoked.',
    reading: 'The killer reeks of cheap tobacco. Mark Scent: Cheap tobacco.',
  }),
  clue('scent', 'perfume', {
    kind: 'lab', label: 'Analysis — the veil', source: CHEMIST,
    title: 'Fabric examination, the deceased’s veil and collar',
    fields: [['Item', 'veil and collar, left side'], ['Smell', 'orchid, strong'], ['Source', 'not the deceased; the convent allows no scent']],
    body: ['The left side of her veil and the collar beneath it smell of orchid perfume, laid on thick. The convent allows no scent and she wore none. Somebody with that perfume on them held her by the collar, or was held.'],
    stamp: 'EVIDENCE',
    spoken: 'Orchid perfume on her veil and collar, and the convent allows no scent.',
    reading: 'The killer wears orchid perfume. Mark Scent: Orchid perfume.',
  }),
  clue('scent', 'oil', {
    kind: 'photo', label: 'Photograph — the rung', source: PLATES,
    title: 'Plate 4: the top rung, developed',
    fields: [['Surface', 'iron, rusted'], ['Print', 'thumb, in machine oil'], ['Deceased', 'never touched the rungs']],
    body: ['One clear thumb print on the top rung, developed with powder, and it stands out because it is in machine oil: the thick black kind from a pump or an engine, worked into the skin so it never washes out. The deceased had chalk on her hands, and nothing else.'],
    figure: 'thumbprint', stamp: 'EVIDENCE',
    spoken: 'A thumb print on the top rung, and it is in machine oil.',
    reading: 'The killer has engine oil in the skin. Mark Scent: Machine oil.',
  }),
  clue('scent', 'ether', {
    kind: 'lab', label: 'Analysis — the cut end', source: CHEMIST,
    title: 'Residue examination, the cut end of the rope',
    fields: [['Item', 'the cut end, six inches'], ['Smell', 'ether, sweet and sharp, still strong'], ['Source', 'the hand that held the rope to cut it']],
    body: ['The six inches of rope above the cut smell of ether, and hemp holds a smell. It came from the hand that gripped the rope to steady it for the blade: whoever cut it had ether on their fingers, the sweet sharp smell of a dispensary shelf or an asylum corridor.'],
    stamp: 'EVIDENCE',
    spoken: 'The cut end of the rope smells of ether. It came from the hand that held it.',
    reading: 'The killer smells of ether. Mark Scent: Ether.',
  }),
  // ----------------------------------------------------------------- shoe
  clue('shoe', 'small', {
    kind: 'cast', label: 'Plaster cast — the mud under the rungs', source: 'HILL DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: the drop from the bottom rung, {scene}',
    fields: [['Print', 'both feet, landing'], ['Length', 'ten and one-half inches'], ['Size', 'eight'], ['Deceased', 'size five, convent shoes']],
    body: ['The bottom rung is six feet above the path, and whoever came down dropped the last of it into the mud. Two prints side by side, heels deep: a neat size eight, hobnailed. The deceased wore a five and never left the stair.'],
    figure: 'footprint-small', stamp: 'EVIDENCE',
    spoken: 'A neat size eight, both feet, where they dropped from the bottom rung into the mud.',
    reading: 'The killer wears a size eight. Mark Footprint: Size 8.',
  }),
  clue('shoe', 'mid', {
    kind: 'cast', label: 'Plaster cast — the mud under the rungs', source: 'HILL DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: the drop from the bottom rung, {scene}',
    fields: [['Print', 'both feet, landing'], ['Length', 'eleven and one-quarter inches'], ['Size', 'ten'], ['Wear', 'outer heel, hard']],
    body: ['Whoever came down the rungs dropped the last six feet into the mud of the path. Two prints, heels deep: a size ten, worn down hard on the outside of the heel. The deceased wore a five and never left the stair.'],
    figure: 'footprint-mid', stamp: 'EVIDENCE',
    spoken: 'A size ten in the mud under the rungs, worn hard on the outer heel.',
    reading: 'The killer wears a size ten. Mark Footprint: Size 10.',
  }),
  clue('shoe', 'large', {
    kind: 'cast', label: 'Plaster cast — the mud under the rungs', source: 'HILL DIVISION · CASTS AND IMPRESSIONS',
    title: 'Cast 1: the drop from the bottom rung, {scene}',
    fields: [['Print', 'both feet, landing'], ['Length', 'twelve and three-quarter inches'], ['Size', 'twelve'], ['Deceased', 'size five, convent shoes']],
    body: ['Whoever came down the rungs dropped the last six feet into the mud of the path. Two prints, heels deep: a size twelve, a boat of a boot, toes turned toward the reservoir. The deceased wore a five and never left the stair.'],
    figure: 'footprint-large', stamp: 'EVIDENCE',
    spoken: 'A size twelve in the mud under the rungs, toes toward the reservoir.',
    reading: 'The killer wears a size twelve. Mark Footprint: Size 12.',
  }),
];
