// The evidence locker.
//
// Finding something used to be a sentence: "Our killer is left-handed." Now it
// is a document -- a coroner's preliminary, a laboratory sheet, a plaster cast
// card, a photograph -- that you open, read and interpret yourself. The wound
// track runs down and to the left of a skull the assailant was facing; what
// that says about their hands is for the table to argue about.
//
// Every exhibit states an observation and stops. `reading` is the conclusion,
// and the game only shows it after you have committed to a mark in the
// notebook (or straight away, in the assisted notebook).

import type { BoonId, CaseItemDef, TraitId } from '../types/game-types';
import { TRAITS, traitLabel } from './traits';
import { CASES } from './cases/index';

export type ExhibitKind =
  | 'report' | 'lab' | 'photo' | 'statement' | 'telegram' | 'note' | 'ledger' | 'receipt' | 'cast' | 'card'
  | 'letter' | 'clipping' | 'ticket';

export interface ExhibitDef {
  id: string;
  kind: ExhibitKind;
  /** Short label for lists and the journal. */
  label: string;
  /** Letterhead. */
  source: string;
  /** Typed heading on the document itself. */
  title: string;
  /** Form fields, rendered as a table on the paper. */
  fields?: [string, string][];
  /** Paragraphs. `{victim}`, `{scene}` and any instance data are substituted. */
  body: string[];
  /** A line diagram drawn by ui/figures.ts. */
  figure?: string;
  stamp?: 'EVIDENCE' | 'CONFIDENTIAL' | 'RECEIVED' | 'COPY' | 'PERSONAL';
  /** The one sentence the narrator reads when it is filed. */
  spoken: string;
  /** What a careful reader should take from it. */
  reading: string;
  trait?: TraitId;
  value?: string;
  boon?: BoonId;
}

const clue = (
  trait: TraitId,
  value: string,
  def: Omit<ExhibitDef, 'id' | 'trait' | 'value'>,
): ExhibitDef => ({ id: `clue:${trait}:${value}`, trait, value, ...def });

const CLUES: ExhibitDef[] = [
  // ---------------------------------------------------------------- build
  clue('build', 'slight', {
    kind: 'report', label: 'Scene examiner’s notes — the window', source: 'ASHGRAVE BAY POLICE · SCENE EXAMINATION',
    title: 'Rear window, {scene}',
    fields: [['Sash', 'raised, jammed on its cord'], ['Gap', 'nine and one-quarter inches'], ['Frame', 'undamaged']],
    body: [
      'Rear sash found raised nine and one-quarter inches and jammed there on a frayed cord. Paint scuffed along the inside edge of the sill and a thread of dark wool caught on the catch.',
      'No damage to the frame and no tool marks: the sash was not forced any further than it stood. Whoever came through it came through it as it was.',
    ],
    figure: 'sill', stamp: 'EVIDENCE',
    spoken: 'The rear sash was jammed nine inches open, and somebody came through it as it stood.',
    reading: 'Nobody broad or tall fits through a nine-inch gap. The killer is slight. Mark Build: Slight.',
  }),
  clue('build', 'broad', {
    kind: 'report', label: 'Scene examiner’s notes — the doorway', source: 'ASHGRAVE BAY POLICE · SCENE EXAMINATION',
    title: 'Corridor door, {scene}',
    fields: [['Jamb', 'split, strike side'], ['Height of split', 'fifty-eight inches'], ['Lock', 'held']],
    body: [
      'Door frame split along the jamb at fifty-eight inches from the floor on the strike side. The split is fresh and runs outward, consistent with a shoulder driven against the frame from the corridor.',
      'No tool marks. The lock held; the wood did not. It takes weight to do this to oak.',
    ],
    figure: 'doorframe', stamp: 'EVIDENCE',
    spoken: 'The door jamb is split at shoulder height, and it took weight to do it.',
    reading: 'It takes a heavy shoulder to split an oak door frame. The killer is broad. Mark Build: Broad.',
  }),
  clue('build', 'tall', {
    kind: 'report', label: 'Coroner’s preliminary — spatter', source: 'MERCY HOSPITAL · OFFICE OF THE CORONER',
    title: 'Preliminary findings, {victim}',
    fields: [['Deceased, height', 'five feet four inches'], ['Point of origin', 'no lower than seventy-four inches'], ['Blow', 'from above, facing']],
    body: [
      'Arterial spatter on the north wall arcs from a point of origin no lower than seventy-four inches from the floor. The deceased stood five foot four in stockings.',
      'The assailant faced her and stood over her, and the blow was delivered downward from well above her head.',
    ],
    figure: 'spatter', stamp: 'CONFIDENTIAL',
    spoken: 'The spatter starts seventy-four inches up the wall, and the blow came down from above her.',
    reading: 'Seventy-four inches is over six feet. The killer is tall. Mark Build: Tall.',
  }),
  // ----------------------------------------------------------------- hair
  clue('hair', 'dark', {
    kind: 'lab', label: 'Laboratory sheet — hair, one', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 1',
    fields: [['Item', 'single hair, recovered from the ring setting'], ['Length', 'two and one-quarter inches'], ['Colour', 'dark brown to black, natural'], ['Root', 'present']],
    body: ['Not the deceased’s: hers is dyed auburn and shows it at the roots. This one has never seen a bottle. Caught in the setting when the ring hand was raised.'],
    figure: 'hair-dark', stamp: 'EVIDENCE',
    spoken: 'One hair caught in her ring, dark and natural, and it is not hers.',
    reading: 'The hair is dark, and it isn’t hers. The killer has dark hair. Mark Hair: Dark.',
  }),
  clue('hair', 'fair', {
    kind: 'lab', label: 'Laboratory sheet — hair, one', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 1',
    fields: [['Item', 'single hair, from the collar'], ['Length', 'three inches'], ['Colour', 'pale blond, “winter straw”, natural'], ['Root', 'present']],
    body: ['Lifted from the inside of the collar, which means a head was close over hers. The deceased’s hair is dark; nobody on the hotel staff is fair.'],
    figure: 'hair-fair', stamp: 'EVIDENCE',
    spoken: 'A pale hair on the inside of her collar, fair as winter straw.',
    reading: 'The killer has fair hair. Mark Hair: Fair.',
  }),
  clue('hair', 'red', {
    kind: 'lab', label: 'Laboratory sheet — hair, one', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 1',
    fields: [['Item', 'single hair, from the pillow'], ['Colour', 'copper red, natural'], ['Dye', 'none']],
    body: ['One red hair on the pillow, and nobody else in the building with a head like that. Copper, unmistakable, and not out of a bottle.'],
    figure: 'hair-red', stamp: 'EVIDENCE',
    spoken: 'One red hair on the pillow. Copper, and not out of a bottle.',
    reading: 'The killer has red hair. Mark Hair: Red.',
  }),
  clue('hair', 'grey', {
    kind: 'lab', label: 'Laboratory sheet — hair, seven', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, items 1–7',
    fields: [['Items', 'seven hairs, rug beside the body'], ['Colour', 'iron grey, coarse'], ['Roots', 'present on five']],
    body: ['Pulled out in the struggle, by the roots. The deceased was twenty-six and had not a grey hair on her. These came off the other head in the room.'],
    figure: 'hair-grey', stamp: 'EVIDENCE',
    spoken: 'Seven grey hairs on the rug, pulled out by the roots, and she was twenty-six.',
    reading: 'The killer has grey hair. Mark Hair: Grey.',
  }),
  // ----------------------------------------------------------------- hand
  clue('hand', 'left', {
    kind: 'report', label: 'Coroner’s preliminary — wound track', source: 'MERCY HOSPITAL · OFFICE OF THE CORONER',
    title: 'Preliminary findings, {victim}',
    fields: [['Injury', 'single blow, right temple'], ['Track', 'downward, toward the left of the skull'], ['Defensive bruising', 'left forearm'], ['Position', 'assailant facing the deceased']],
    body: [
      'A single blow to the right temple. The track runs downward and toward the left side of the skull, entering at some thirty degrees from the front.',
      'Bruising on her left forearm where she raised it. The assailant stood square in front of her when the blow was struck.',
    ],
    figure: 'wound-left', stamp: 'CONFIDENTIAL',
    spoken: 'One blow to her right temple, from someone standing square in front of her.',
    reading: 'Somebody facing her who hits her right temple is using their left hand. The killer is left-handed. Mark Handedness: Left-handed.',
  }),
  clue('hand', 'right', {
    kind: 'lab', label: 'Laboratory sheet — the glove', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 3',
    fields: [['Item', 'one leather glove, right hand, from the stairwell'], ['Residue', 'powder, outer index finger and web of the thumb'], ['Companion', 'no left glove found']],
    body: ['Powder residue on the outer index finger and the web of the thumb, consistent with a small-calibre discharge. The interior is worn through at the fingertips: an old glove, and the working one.'],
    figure: 'glove', stamp: 'EVIDENCE',
    spoken: 'A right-hand glove on the stairs, with powder in the web of the thumb.',
    reading: 'The trigger finger was in the right-hand glove. The killer is right-handed. Mark Handedness: Right-handed.',
  }),
  // ----------------------------------------------------------------- mark
  clue('mark', 'scar', {
    kind: 'lab', label: 'Laboratory sheet — nail scrapings', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 5',
    fields: [['Item', 'scrapings, deceased’s right hand'], ['Content', 'skin, trace of blood'], ['Also', 'a fleck of old, fibrous scar tissue']],
    body: ['She marked whoever she fought. Among the fresh tissue under her nails is a fleck of old scar: fibrous, pale, years healed. She scratched somebody who had already been cut once.'],
    stamp: 'EVIDENCE',
    spoken: 'Under her nails, fresh skin and a fleck of old scar tissue.',
    reading: 'She scratched somebody who already had an old scar. Mark Distinguishing mark: A scar.',
  }),
  clue('mark', 'tattoo', {
    kind: 'statement', label: 'Witness statement — lift attendant', source: 'ASHGRAVE BAY POLICE · STATEMENT FORM 9',
    title: 'Statement of the night lift attendant',
    body: [
      '“The hand came down on her shoulder and the cuff rode up. There was ink on the wrist. Blue. A picture, not letters — something with a curl to it.”',
      '“I did not see a face. I see hands all night; I could not tell you a face if you paid me.”',
    ],
    figure: 'tattoo', stamp: 'COPY',
    spoken: 'The lift attendant saw blue ink on the wrist as the hand came down.',
    reading: 'The killer has a tattoo. Mark Distinguishing mark: A tattoo.',
  }),
  clue('mark', 'missing', {
    kind: 'photo', label: 'Photograph — print in the dust', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 4: tumbler, sideboard',
    body: ['Print lifted from the dust on the sideboard where the tumbler was set down. Palm and four fingers, clear. Not a partial: the surface is clean where a fifth finger should have rested.'],
    figure: 'four-fingers', stamp: 'EVIDENCE',
    spoken: 'A palm print in the dust, with four fingers and a clean space where the fifth should be.',
    reading: 'Four fingers, not five. The killer is missing a finger. Mark Distinguishing mark: A missing finger.',
  }),
  clue('mark', 'clean', {
    kind: 'statement', label: 'Witness statement — the night clerk', source: 'ASHGRAVE BAY POLICE · STATEMENT FORM 9',
    title: 'Statement of the night clerk',
    body: [
      '“Ordinary. That is what I keep telling you. Nothing on the face, nothing on the hands, no mark I could point to. You could not pick them out of a line of ten.”',
      '“I would know them again. I could not tell you why.”',
    ],
    stamp: 'COPY',
    spoken: 'The night clerk swears the face was clean, with not a mark to point to.',
    reading: 'The killer has no scar, tattoo or missing finger. Mark Distinguishing mark: Unmarked.',
  }),
  // ----------------------------------------------------------------- vice
  clue('vice', 'cards', {
    kind: 'card', label: 'Marker — a back-room game', source: 'FOUND UNDER THE CHAIR',
    title: 'Pencilled chit',
    body: ['“I.O.U. $40 — Wed. — Rosie’s.” Creased in half, stepped on, and dropped in the struggle. Nobody who does not play carries a marker from Rosie’s.'],
    figure: 'marker', stamp: 'EVIDENCE',
    spoken: 'A crumpled marker from a back-room card game, dropped in the struggle.',
    reading: 'The killer plays cards. Mark Vice: Cards.',
  }),
  clue('vice', 'drink', {
    kind: 'photo', label: 'Photograph — the second glass', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 2: two glasses, the table',
    body: ['Two glasses. Hers has the lipstick. The other has a ring of rye still in it and a thumbprint we cannot match. The deceased kept no rye in the suite; somebody brought their own.'],
    figure: 'glasses', stamp: 'EVIDENCE',
    spoken: 'Rye on the rim of the second glass. The one that got away.',
    reading: 'The killer drinks. Mark Vice: Drink.',
  }),
  clue('vice', 'opium', {
    kind: 'lab', label: 'Laboratory sheet — curtain residue', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 8',
    fields: [['Item', 'drapery, west window'], ['Residue', 'sweet resinous smoke, lamp soot at the sill'], ['Deceased', 'no history of use; physician confirms']],
    body: ['Somebody in that room smoked a pipe that was not tobacco, and recently. The soot at the sill is from a small lamp. The deceased did not use; her doctor is emphatic.'],
    figure: 'pipe', stamp: 'EVIDENCE',
    spoken: 'Sweet smoke soaked into the curtains, and lamp soot on the sill.',
    reading: 'The killer smokes opium. Mark Vice: The pipe.',
  }),
  clue('vice', 'clean', {
    kind: 'report', label: 'Inventory — the room', source: 'ASHGRAVE BAY POLICE · SCENE EXAMINATION',
    title: 'Inventory, {scene}',
    fields: [['Bottles', 'none'], ['Markers, chits', 'none'], ['Ash, pipe, matchbook', 'none'], ['Ashtray', 'polished, unused']],
    body: ['Whoever spent the evening here left nothing of a habit behind, because they have none. In this city that is rarer than a fingerprint.'],
    stamp: 'EVIDENCE',
    spoken: 'No bottle, no markers, no smoke. Whoever did this keeps a clean house.',
    reading: 'The killer has no vice at all. Mark Vice: No vice.',
  }),
  // ---------------------------------------------------------------- scent
  clue('scent', 'tobacco', {
    kind: 'lab', label: 'Laboratory sheet — air and fabrics', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 6',
    fields: [['Fabrics', 'curtains, her lapel'], ['Odour', 'cheap pipe shag, the kind sold by the pound'], ['Hotel stock', 'Turkish cigarettes only']],
    body: ['The curtains and her lapel are saturated with it. The deceased did not smoke, and the hotel sells Turkish. Somebody stood close to her for a long time with the cheap stuff on their coat.'],
    stamp: 'EVIDENCE',
    spoken: 'The room stinks of cheap tobacco, and the victim never smoked.',
    reading: 'The killer smells of cheap tobacco. Mark Scent: Cheap tobacco.',
  }),
  clue('scent', 'perfume', {
    kind: 'lab', label: 'Laboratory sheet — the lapel', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 6',
    fields: [['Fabric', 'her lapel'], ['Odour', 'orchid absolute, heavy, transferred by contact'], ['Deceased’s scent', 'jasmine']],
    body: ['Orchid, laid on thick and transferred by contact. Not hers: she wore jasmine and nothing else. Somebody stood very close.'],
    stamp: 'EVIDENCE',
    spoken: 'Orchid perfume on her lapel, and she wore jasmine.',
    reading: 'The killer smells of orchid perfume. Mark Scent: Orchid perfume.',
  }),
  clue('scent', 'oil', {
    kind: 'photo', label: 'Photograph — the door plate', source: 'ASHGRAVE BAY POLICE · PHOTOGRAPHIC UNIT',
    title: 'Plate 6: brass push-plate, corridor door',
    body: ['A thumbprint in machine oil on the brass. Somebody who works with machines and never quite gets it off, whatever they scrub with.'],
    figure: 'thumbprint', stamp: 'EVIDENCE',
    spoken: 'A thumbprint in machine oil on the door plate.',
    reading: 'The killer smells of machine oil. Mark Scent: Machine oil.',
  }),
  clue('scent', 'ether', {
    kind: 'lab', label: 'Laboratory sheet — the pillow', source: 'MERCY HOSPITAL · LABORATORY',
    title: 'Trace examination, item 7',
    fields: [['Fabric', 'pillowslip'], ['Odour', 'ether, faint, hospital grade'], ['Retail', 'not sold over a counter in this city']],
    body: ['Faint, sickly, hanging over the pillow. Hospital ether, which nobody buys in a shop.'],
    stamp: 'EVIDENCE',
    spoken: 'Ether. Faint, sickly, and hanging over everything.',
    reading: 'The killer smells of ether. Mark Scent: Ether.',
  }),
  // ----------------------------------------------------------------- shoe
  clue('shoe', 'small', {
    kind: 'cast', label: 'Plaster cast — the flowerbed', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast no. 1, flowerbed below the window',
    fields: [['Heel to toe', 'ten and one-half inches'], ['Heel', 'narrow, neat'], ['Depth', 'shallow']],
    body: ['A neat impression pressed into the flowerbed, the heel narrow. Shallow, too: not a heavy tread.'],
    figure: 'footprint-small', stamp: 'EVIDENCE',
    spoken: 'A neat footprint pressed into the flowerbed, ten and a half inches heel to toe.',
    reading: 'Ten and a half inches is a size eight shoe. Mark Footprint: Size 8.',
  }),
  clue('shoe', 'mid', {
    kind: 'cast', label: 'Plaster cast — the yard', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast no. 1, the yard',
    fields: [['Heel to toe', 'eleven and one-quarter inches'], ['Wear', 'outer heel worn hard'], ['Sole', 'plain']],
    body: ['A plain sole, worn down hard on the outer heel: somebody who walks a great deal and walks badly.'],
    figure: 'footprint-mid', stamp: 'EVIDENCE',
    spoken: 'Eleven and a quarter inches, worn down hard on the outer heel.',
    reading: 'Eleven and a quarter inches is a size ten shoe. Mark Footprint: Size 10.',
  }),
  clue('shoe', 'large', {
    kind: 'cast', label: 'Plaster cast — the back stair', source: 'ASHGRAVE BAY POLICE · CASTS AND IMPRESSIONS',
    title: 'Cast no. 1, wet ash by the back stair',
    fields: [['Heel to toe', 'twelve inches even'], ['Heel', 'broad'], ['Depth', 'deep']],
    body: ['Pressed deep into the wet ash by the back stair. Twelve inches even, and a heel like a brick.'],
    figure: 'footprint-large', stamp: 'EVIDENCE',
    spoken: 'A footprint in the wet ash by the back stair, twelve inches even.',
    reading: 'Twelve inches is a size twelve shoe. Mark Footprint: Size 12.',
  }),
];

const BOON_EXHIBITS: ExhibitDef[] = [
  {
    id: 'boon:tip', boon: 'tip', kind: 'note', label: 'A folded note', source: 'FOUND IN THE LINING OF A COAT',
    title: 'In a dead man’s handwriting',
    body: ['Folded four times and soft at the creases. “If anything happens to me — {fact}”', 'The rest is water.'],
    stamp: 'EVIDENCE',
    spoken: 'A note in a dead man’s handwriting, folded four times.',
    reading: 'The note gives you one fact about the killer. It is already in the Notebook.',
  },
  {
    id: 'boon:spur', boon: 'spur', kind: 'telegram', label: 'A telegram', source: 'WESTERN UNION · ASHGRAVE BAY OFFICE',
    title: 'Night letter',
    body: ['NAME IS KNOWN STOP ADDRESS FOLLOWS BY HAND STOP DO NOT WAIT FOR MORNING STOP'],
    stamp: 'RECEIVED',
    spoken: 'A name, an address, and a reason to hurry.',
    reading: 'A fresh lead. Two hours back on the clock.',
  },
  {
    id: 'boon:coffee', boon: 'coffee', kind: 'receipt', label: 'An automat receipt', source: 'THE ALL-NIGHT AUTOMAT · SALT STREET',
    title: 'Check no. 1181',
    fields: [['Coffee, black', '2'], ['Cigarettes', '1 pkt'], ['Paid', '“a friend”']],
    body: ['Somebody put it on their tab and did not leave a name.'],
    spoken: 'Black coffee and a cigarette on somebody else’s tab.',
    reading: 'A second wind. One extra action this turn, free.',
  },
  {
    id: 'boon:ledger', boon: 'ledger', kind: 'ledger', label: 'A private ledger', source: 'PRIVATE ACCOUNT BOOK',
    title: 'Page 41',
    body: ['Amounts, initials, dates. And in the margin, in a different hand: “{who} — {phrase}.”', 'Somebody wrote down what they should have burned.'],
    stamp: 'EVIDENCE',
    spoken: 'Somebody wrote down what they should have burned.',
    reading: 'The ledger tells you something about one suspect. Check the Notebook.',
  },
];

/** Typed up from a witness, so testimony ends up in the locker like anything else. */
const STATEMENT: ExhibitDef = {
  id: 'statement', kind: 'statement', label: 'Witness statement', source: 'ASHGRAVE BAY POLICE · STATEMENT FORM 9',
  title: 'Statement of {witness}, {role}',
  body: ['Taken at {where} by {by}.', '“{text}”'],
  stamp: 'COPY',
  spoken: '',
  reading: '{reading}',
};

/** A case's own documents are exhibits too; only the placement is theirs. */
const fromItem = (item: CaseItemDef): ExhibitDef => ({
  id: item.id, kind: item.kind, label: item.label, source: item.source, title: item.title,
  fields: item.fields, body: item.body, figure: item.figure, stamp: item.stamp,
  spoken: item.spoken, reading: item.reading,
});

export const EXHIBITS: Record<string, ExhibitDef> = Object.fromEntries(
  [...CLUES, ...BOON_EXHIBITS, STATEMENT, ...CASES.flatMap((c) => c.items.map(fromItem))].map((e) => [e.id, e]),
);

export const itemById = (id: string): CaseItemDef | undefined =>
  CASES.flatMap((c) => c.items).find((i) => i.id === id);

export const exhibitById = (id: string): ExhibitDef => EXHIBITS[id] ?? STATEMENT;
export const clueExhibitId = (trait: TraitId, value: string): string => `clue:${trait}:${value}`;
export const boonExhibitId = (boon: BoonId): string => `boon:${boon}`;

/** Every clue exhibit exists for every trait value, or the locker has holes. */
export function missingExhibits(): string[] {
  const out: string[] = [];
  for (const t of Object.values(TRAITS)) {
    for (const v of t.values) if (!EXHIBITS[clueExhibitId(t.id, v.id)]) out.push(clueExhibitId(t.id, v.id));
  }
  return out;
}

/** Substitute `{name}` placeholders; anything unknown is left visible so it gets fixed. */
export function fill(text: string, data: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in data ? data[k] : m));
}

/** The plain-language conclusion for a clue exhibit, e.g. "Handedness: Left-handed." */
export const conclusionOf = (def: ExhibitDef): string =>
  def.trait && def.value ? `${TRAITS[def.trait].label}: ${traitLabel(def.trait, def.value)}.` : def.reading;
