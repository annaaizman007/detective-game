// The Harbour District's own paperwork for Salt and Silence.
//
// Aurel Bask went into the water off Pier Nine at twenty to midnight, stabbed
// from below, his pockets sewn shut and filled with rock salt. Every sheet here
// is written for that body, that pier and that harbour: the morgue is Kite's,
// the post-mortem is Dr. Fenn's, the casts were taken in spilled salt.
//
// One document per trait value. Each states what was seen and stops; the
// `reading` is the conclusion, shown only once the table has marked its own.

import type { ExhibitDef } from '../../types/game-types';
import { clue } from '../clue';

const MORGUE = 'HARBOUR MORGUE · J. KITE, ATTENDANT';
const SURGEON = 'SEAMEN’S INFIRMARY · POST-MORTEM · DR. R. FENN';
const HARBOUR = 'ASHGRAVE BAY POLICE · HARBOUR DIVISION';

export const SALT_CLUES: ExhibitDef[] = [
  // ---------------------------------------------------------------- build
  clue('build', 'slight', {
    kind: 'report', label: 'Scene notes — the storm boards', source: HARBOUR,
    title: 'Storm boards, {scene}',
    fields: [['Boards', 'nailed across the ladder head, winter fixing'], ['Gap', 'ten inches, between the third and fourth'], ['Nails', 'undisturbed']],
    body: [
      'The pier ladder is boarded over for the winter. The only way down to the water is a ten-inch gap between the third and fourth boards, and somebody went through it tonight: the edges are rubbed clean of weed, and a thread of dark wool is caught on a nail head.',
      'Not one nail is lifted. The boards were not moved. Whoever went down to the boat went through the gap as it stood.',
    ],
    figure: 'sill', stamp: 'EVIDENCE',
    spoken: 'The storm boards were not moved. Somebody went through a ten-inch gap as it stood.',
    reading: 'Nobody broad or tall goes through ten inches of gap. The killer is slight. Mark Build: Slight.',
  }),
  clue('build', 'broad', {
    kind: 'report', label: 'Scene notes — the salt lane gate', source: HARBOUR,
    title: 'Gate, the lane from the salt works to {scene}',
    fields: [['Gate', 'thirty inches wide'], ['Marks', 'salt rubbed on both posts, shoulder height'], ['Load', 'one hundredweight sack, carried']],
    body: [
      'A sack of rock salt, one hundred and twelve pounds, was carried down the lane on a shoulder and no cart. Both gate posts are rubbed white with salt at fifty-six inches: the sack scraped one side and the man scraped the other.',
      'A man has to be as wide as the gate to touch both posts at once.',
    ],
    figure: 'doorframe', stamp: 'EVIDENCE',
    spoken: 'A hundredweight of salt came down the lane on one shoulder, and the man scraped both gate posts.',
    reading: 'A man who fills a thirty-inch gate with a sack on his shoulder is broad. Mark Build: Broad.',
  }),
  clue('build', 'tall', {
    kind: 'report', label: 'Scene notes — the pier lamp', source: HARBOUR,
    title: 'Lamp bracket, {scene}',
    fields: [['Bracket', 'iron, seventy-six inches from the boards'], ['Mark', 'blood, smeared, underside'], ['Boards beneath', 'salt spilled, one clear boot']],
    body: [
      'The underside of the lamp bracket at the ladder head carries a smear of blood at seventy-six inches. Somebody stood up under it with a wet hand and caught the iron with the top of the head or the hood.',
      'The deceased stood five foot nine. The smear is above where he could have reached standing, and he was not standing.',
    ],
    figure: 'spatter', stamp: 'EVIDENCE',
    spoken: 'Blood on the underside of the lamp bracket, seventy-six inches up, where a head caught it.',
    reading: 'Seventy-six inches is over six foot three. The killer is tall. Mark Build: Tall.',
  }),
  // ----------------------------------------------------------------- hair
  clue('hair', 'dark', {
    kind: 'lab', label: 'Morgue sheet — hair in the seam', source: MORGUE,
    title: 'Effects examination, item 3',
    fields: [['Item', 'one hair, sewn into the left pocket seam'], ['Length', 'two inches'], ['Colour', 'dark brown to black, natural'], ['Root', 'present']],
    body: ['Sewn right through by the needle, so it was on the sewing hand when the pocket was closed. The deceased is grey. This hair has never been grey and never seen a bottle.'],
    figure: 'hair-dark', stamp: 'EVIDENCE',
    spoken: 'One dark hair, sewn right through the pocket seam, and it is not his.',
    reading: 'The hair on the sewing hand was dark. The killer has dark hair. Mark Hair: Dark.',
  }),
  clue('hair', 'fair', {
    kind: 'lab', label: 'Morgue sheet — hair in the seam', source: MORGUE,
    title: 'Effects examination, item 3',
    fields: [['Item', 'one hair, caught in the sailcloth thread'], ['Length', 'three inches'], ['Colour', 'pale blond, natural'], ['Root', 'present']],
    body: ['Twisted into the thread itself, which means it was on the hand that pulled the stitches tight. The deceased is grey and nobody on his boat crew is fair.'],
    figure: 'hair-fair', stamp: 'EVIDENCE',
    spoken: 'A pale hair twisted into the sailcloth thread, fair as winter straw.',
    reading: 'The killer has fair hair. Mark Hair: Fair.',
  }),
  clue('hair', 'red', {
    kind: 'lab', label: 'Morgue sheet — hair in the seam', source: MORGUE,
    title: 'Effects examination, item 3',
    fields: [['Item', 'one hair, inside the right pocket, on the salt'], ['Colour', 'copper red, natural'], ['Dye', 'none']],
    body: ['Lying on top of the salt inside the pocket, so it went in with the salt. Copper, and not out of a bottle. There is not a head like it on the deceased’s side of the harbour.'],
    figure: 'hair-red', stamp: 'EVIDENCE',
    spoken: 'One red hair on the salt inside the pocket. Copper, and not out of a bottle.',
    reading: 'The killer has red hair. Mark Hair: Red.',
  }),
  clue('hair', 'grey', {
    kind: 'lab', label: 'Morgue sheet — hairs in the seam', source: MORGUE,
    title: 'Effects examination, items 3–8',
    fields: [['Items', 'six hairs, sewn into both pocket seams'], ['Colour', 'iron grey, natural'], ['Compared with', 'the deceased’s: coarser and whiter than these']],
    body: ['Six grey hairs sewn through the seams, from the sewing hand. Compared under the glass with the deceased’s own: his are coarse and nearly white; these are finer and darker grey, and they are not his.'],
    figure: 'hair-grey', stamp: 'EVIDENCE',
    spoken: 'Six grey hairs sewn into the seams, and none of them is his.',
    reading: 'The killer has grey hair. Mark Hair: Grey.',
  }),
  // ----------------------------------------------------------------- hand
  clue('hand', 'left', {
    kind: 'report', label: 'Post-mortem — the wound track', source: SURGEON,
    title: 'Post-mortem, {victim}',
    fields: [['Wound', 'single, under the right ribs'], ['Track', 'upward and to the deceased’s left'], ['Position of assailant', 'below and facing']],
    body: [
      'A single wound under the right ribs. The track runs upward and across to the deceased’s left, toward the heart. The assailant was below him, facing him, on the ladder or in a boat.',
      'A knife driven upward from below and across to that side is a knife in the left hand.',
    ],
    figure: 'wound-left', stamp: 'CONFIDENTIAL',
    spoken: 'The wound runs upward and across to his left, from a knife held below him.',
    reading: 'From below and facing, a track to the victim’s left comes from the assailant’s left hand. Mark Handedness: Left-handed.',
  }),
  clue('hand', 'right', {
    kind: 'lab', label: 'Morgue sheet — the stitching', source: MORGUE,
    title: 'Effects examination, the pockets',
    fields: [['Thread', 'sailcloth, waxed'], ['Stitch', 'over-and-over, right to left'], ['Knot', 'finished on the right side of each pocket']],
    body: [
      'Both pockets sewn shut with the same over-and-over stitch, worked from right to left with the knot finished on the right. That is how a right-handed man sews sailcloth: needle in the right hand, cloth held in the left, the work moving toward the left.',
      'A left-handed man sews the other way, and finishes on the other side.',
    ],
    figure: 'glove', stamp: 'EVIDENCE',
    spoken: 'The pockets were sewn right to left, the way a right-handed man sews sailcloth.',
    reading: 'The killer is right-handed. Mark Handedness: Right-handed.',
  }),
  // ----------------------------------------------------------------- mark
  clue('mark', 'scar', {
    kind: 'lab', label: 'Post-mortem — under the nails', source: SURGEON,
    title: 'Scrapings, both hands, {victim}',
    fields: [['Right hand', 'skin, blood, a fleck of old scar tissue'], ['Left hand', 'salt, rope fibre'], ['Conclusion', 'he caught hold of the assailant']],
    body: ['The deceased got a hand on whoever was below him. Under the nails of the right hand: skin, blood, and a hard white fleck that is old scar tissue, the kind that comes away from a badly healed wound when it is clawed.'],
    stamp: 'CONFIDENTIAL',
    spoken: 'Under his nails, skin and blood and a fleck of old scar tissue.',
    reading: 'He clawed a scar. The killer carries one. Mark Distinguishing mark: A scar.',
  }),
  clue('mark', 'tattoo', {
    kind: 'statement', label: 'Witness statement — the ferry boy', source: 'ASHGRAVE BAY POLICE · STATEMENT FORM 9',
    title: 'Statement of a ferry hand, aged fourteen',
    fields: [['Where', 'the Ferry Slip, tying up'], ['When', 'twenty to midnight, by the slip clock'], ['Saw', 'a hand on the pier ladder rail, sleeve pushed up']],
    body: ['“There was a boat under Pier Nine with no light. A hand came up and took hold of the ladder rail, and the sleeve went back, and there was blue on the wrist. Ink. Like the navy men have. I didn’t see a face. I saw the wrist.”'],
    figure: 'tattoo', stamp: 'COPY',
    spoken: 'The ferry boy saw a hand on the pier ladder with blue ink on the wrist.',
    reading: 'The killer has a tattoo. Mark Distinguishing mark: A tattoo.',
  }),
  clue('mark', 'missing', {
    kind: 'photo', label: 'Photograph — print on the sack', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 4: the salt sack, stencil side',
    fields: [['Surface', 'jute, damp, salt-dusted'], ['Print', 'left hand, gripping'], ['Fingers', 'four']],
    body: ['A hand print in salt dust across the works’ stencil where the sack was gripped and swung. Thumb, first, second and little finger. Where the third finger should press there is nothing at all.'],
    figure: 'four-fingers', stamp: 'EVIDENCE',
    spoken: 'A hand print on the salt sack, and it has four fingers. Only four.',
    reading: 'The hand that carried the salt is short a finger. Mark Distinguishing mark: A missing finger.',
  }),
  clue('mark', 'clean', {
    kind: 'statement', label: 'Witness statement — the ferry boy', source: 'ASHGRAVE BAY POLICE · STATEMENT FORM 9',
    title: 'Statement of a ferry hand, aged fourteen',
    fields: [['Where', 'the Ferry Slip, tying up'], ['When', 'twenty to midnight, by the slip clock'], ['Saw', 'a face, under the pier lamp, for a second']],
    body: ['“The hood came back when the boat rocked and the lamp was on the face for a second. I’d know it again. There was nothing on it. No scar, no mark, nothing. A plain face, like anybody’s. That’s what I remember: there was nothing to remember.”'],
    stamp: 'COPY',
    spoken: 'The ferry boy saw the face under the lamp for a second, and there was nothing on it.',
    reading: 'No scar, no ink, nothing missing. The killer is unmarked. Mark Distinguishing mark: Unmarked.',
  }),
  // ----------------------------------------------------------------- vice
  clue('vice', 'cards', {
    kind: 'card', label: 'Marker — the Brine’s back room', source: 'FOUND IN THE BOAT UNDER THE PIER',
    title: 'I.O.U. — forty dollars — back room, the Brine',
    fields: [['Amount', 'forty dollars'], ['Game', 'Thursday, the back room'], ['Signed', 'a scrawl, not the deceased’s hand']],
    body: ['Wedged under the thwart of the boat found drifting under the pier. A marker from Teague’s Thursday game, damp and creased from a pocket. The deceased did not play; he said so loudly and often.'],
    figure: 'marker', stamp: 'EVIDENCE',
    spoken: 'A marker from the Brine’s back room, wedged under the seat of the boat.',
    reading: 'Somebody in that boat plays cards for money. Mark Vice: Cards.',
  }),
  clue('vice', 'drink', {
    kind: 'photo', label: 'Photograph — the bottle in the boards', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 2: {scene}, the ladder head',
    fields: [['Item', 'half bottle, rum, one third gone'], ['Where', 'wedged between the boards at the ladder head'], ['Deceased', 'drank stout only, twenty years on the record']],
    body: ['A half bottle of dark rum pushed down between the boards at the ladder head, cork out, a third gone. It was not there at the evening tide; the pier man swears to it. The deceased drank stout at the Brine every night of his life and nothing else.'],
    figure: 'glasses', stamp: 'EVIDENCE',
    spoken: 'A half bottle of rum wedged in the boards at the ladder head, a third gone, and he never touched rum.',
    reading: 'Somebody needed a drink before, or after. Mark Vice: Drink.',
  }),
  clue('vice', 'opium', {
    kind: 'lab', label: 'Laboratory sheet — the boat canvas', source: 'SEAMEN’S INFIRMARY · LABORATORY',
    title: 'Residue examination, boat cover',
    fields: [['Item', 'canvas boat cover, found in the boat under the pier'], ['Residue', 'sweet resinous smoke, recent'], ['Identified', 'opium']],
    body: ['The canvas cover from the boat reeks of sweet smoke, and a warm knife against it brings the smell up strong. Somebody sat under that canvas and smoked a pipe before they rowed. The harbour has two places that sell it and both are shut by ten.'],
    figure: 'pipe', stamp: 'EVIDENCE',
    spoken: 'The boat cover reeks of sweet smoke. Somebody sat under it with a pipe.',
    reading: 'Whoever was in that boat chases the dragon. Mark Vice: The pipe.',
  }),
  clue('vice', 'clean', {
    kind: 'report', label: 'Inventory — the boat', source: HARBOUR,
    title: 'Contents of the boat found under {scene}',
    fields: [['Bottles', 'none'], ['Cigarette ends', 'none'], ['Markers, cards, dice', 'none'], ['Found', 'one needle, one spool, salt, blood']],
    body: ['Turned out to the boards. A sailmaker’s needle, an empty spool of waxed thread, a spilled pound of rock salt and the blood. Not a bottle, not a butt, not a card. Two hours in a boat on a February night and nothing to warm the hands.'],
    stamp: 'EVIDENCE',
    spoken: 'Two hours in a boat in February, and not a bottle, not a butt, not a card.',
    reading: 'No drink, no smoke, no cards. The killer keeps clean. Mark Vice: No vice.',
  }),
  // ---------------------------------------------------------------- scent
  clue('scent', 'tobacco', {
    kind: 'lab', label: 'Laboratory sheet — the sack', source: 'SEAMEN’S INFIRMARY · LABORATORY',
    title: 'Fabric examination, salt sack',
    fields: [['Item', 'jute sack, salt works stencil'], ['Smell', 'cheap shag tobacco, deep in the weave'], ['Deceased', 'a pipe man, Navy Cut only']],
    body: ['The sack was carried against a coat for half a mile and it has taken the smell of that coat: cheap shag, the kind sold loose by the pound at the mission. The deceased smoked Navy Cut in a pipe and would not have had shag in the house.'],
    stamp: 'EVIDENCE',
    spoken: 'The salt sack stinks of cheap shag tobacco, and he never smoked it.',
    reading: 'The killer reeks of cheap tobacco. Mark Scent: Cheap tobacco.',
  }),
  clue('scent', 'perfume', {
    kind: 'lab', label: 'Laboratory sheet — the collar', source: 'SEAMEN’S INFIRMARY · LABORATORY',
    title: 'Fabric examination, oilskin collar',
    fields: [['Item', 'the deceased’s oilskin, collar and left shoulder'], ['Smell', 'orchid, strong, under the salt water'], ['Source', 'not the deceased']],
    body: ['Even after the harbour, the collar and left shoulder of his oilskin smell of orchid perfume. It is laid on thick and it was laid on close: somebody with that scent on them held him by the collar and shoulder, or was held.'],
    stamp: 'EVIDENCE',
    spoken: 'Orchid perfume on his collar, strong enough to come through the sea water.',
    reading: 'The killer wears orchid perfume. Mark Scent: Orchid perfume.',
  }),
  clue('scent', 'oil', {
    kind: 'photo', label: 'Photograph — the ladder rail', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 3: {scene}, ladder rail, developed',
    fields: [['Surface', 'iron rail, wet'], ['Print', 'thumb, in machine oil'], ['Deceased', 'a clerk’s hands, no oil']],
    body: ['One clear thumb print on the ladder rail, developed with powder, and it stands out because it is in machine oil: the thick black kind from a winch or an engine, worked into the skin so it never washes out. The deceased had not touched an engine in twenty years.'],
    figure: 'thumbprint', stamp: 'EVIDENCE',
    spoken: 'A thumb print on the ladder rail, and it is in machine oil.',
    reading: 'The killer has engine oil in the skin. Mark Scent: Machine oil.',
  }),
  clue('scent', 'ether', {
    kind: 'lab', label: 'Laboratory sheet — the thread', source: 'SEAMEN’S INFIRMARY · LABORATORY',
    title: 'Residue examination, sailcloth thread',
    fields: [['Item', 'the thread from both pockets'], ['Smell', 'ether, sweet and sharp, still strong'], ['Source', 'the hands that waxed and pulled it']],
    body: ['The waxed thread from the pockets smells of ether, and wax holds a smell. It came from the hands: whoever pulled those stitches tight had ether on their fingers, the sweet sharp smell of a hospital corridor or a dispensary shelf.'],
    stamp: 'EVIDENCE',
    spoken: 'The thread from the pockets smells of ether. It came from the hands that pulled it.',
    reading: 'The killer smells of ether. Mark Scent: Ether.',
  }),
  // ----------------------------------------------------------------- shoe
  clue('shoe', 'small', {
    kind: 'cast', label: 'Plaster cast — the spilled salt', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the salt, ladder head, {scene}',
    fields: [['Print', 'left boot, complete'], ['Length', 'ten and one-half inches'], ['Size', 'eight'], ['Deceased', 'size eleven']],
    body: ['The sack split at the ladder head and a pound of salt went across the boards. One boot went through it and left a print the frost has kept: a neat size eight, sea boot, heel and toe sharp. The deceased wore elevens.'],
    figure: 'footprint-small', stamp: 'EVIDENCE',
    spoken: 'A neat size eight sea boot, pressed into the spilled salt at the ladder head.',
    reading: 'The killer wears a size eight. Mark Footprint: Size 8.',
  }),
  clue('shoe', 'mid', {
    kind: 'cast', label: 'Plaster cast — the spilled salt', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the salt, ladder head, {scene}',
    fields: [['Print', 'right boot, complete'], ['Length', 'eleven and one-quarter inches'], ['Size', 'ten'], ['Wear', 'outer heel, hard']],
    body: ['Where the sack split at the ladder head, one boot went through the salt and the frost kept it. A size ten sea boot, worn down hard on the outside of the heel. The deceased wore elevens, and his heels were worn on the inside.'],
    figure: 'footprint-mid', stamp: 'EVIDENCE',
    spoken: 'A size ten sea boot in the salt, worn hard on the outer heel.',
    reading: 'The killer wears a size ten. Mark Footprint: Size 10.',
  }),
  clue('shoe', 'large', {
    kind: 'cast', label: 'Plaster cast — the spilled salt', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast 1: boot in the salt, ladder head, {scene}',
    fields: [['Print', 'right boot, complete'], ['Length', 'twelve and three-quarter inches'], ['Size', 'twelve'], ['Deceased', 'size eleven']],
    body: ['One boot went through the spilled salt at the ladder head and the frost kept it. A size twelve sea boot, a boat of a thing, the toe turned toward the ladder. The deceased wore elevens and never stood at that ladder alive.'],
    figure: 'footprint-large', stamp: 'EVIDENCE',
    spoken: 'A size twelve sea boot in the salt at the ladder head, toe to the water.',
    reading: 'The killer wears a size twelve. Mark Footprint: Size 12.',
  }),
];
