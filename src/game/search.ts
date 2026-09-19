// What a search looks like from the inside.
//
// The reducer decides *what* turns up. This decides how the narrator tells it:
// where the detective looked in that kind of building, and the one thing that
// looked wrong and made them look closer. Every sentence here is fixed text, so
// the corpus can enumerate it and the voice pack can carry it.

import type { LocationType } from '../types/game-types';

interface SearchStyle {
  /** Where you look in this kind of place, one sentence each. */
  looked: string[];
  /** What was off, one sentence each. */
  off: string[];
}

const GENERIC: SearchStyle = {
  looked: [
    'You go through the drawers, the shelves and the wastepaper basket, and you run a hand along the top of every door frame.',
    'You start at the door and work the room in a circle: floor, furniture, walls, and anything with a lid.',
    'You look where people hide things when they are in a hurry: under the mat, behind the picture, inside the coat on the hook.',
  ],
  off: [
    'A drawer has been forced and pushed back in, not quite shut.',
    'The dust on one shelf has a clean stripe across it. Something sat there until recently.',
    'One floorboard by the wall gives a little more than the others.',
    'A picture hangs an inch off straight. Behind it the paper is a different colour.',
  ],
};

const STYLES: Partial<Record<LocationType, SearchStyle>> = {
  hotel: {
    looked: ['You go through the room the way a maid would not: the mattress seams, the wardrobe floor, the back of the bathroom cabinet, the pockets of the coat on the door.', 'You check the front desk register, the pigeonholes, and the ashtrays in the lounge.'],
    off: ['The bed has been made by somebody who did not make it every day. The corners are wrong.', 'One key is missing from the rack behind the desk and the hook has been polished.'],
  },
  police: {
    looked: ['You go through the evidence cupboard, the day book and the drawer of the desk nobody sits at.', 'You read the charge sheets and the property book, and you empty the lost-property box on the floor.'],
    off: ['A page has been torn out of the day book. The one before it is dented with the pen.', 'The property book has been signed for by somebody who did not sign for anything else.'],
  },
  bar: {
    looked: ['You look behind the bar, under the till, along the coat hooks and in the glass-washer.', 'You go through the back room: the crates, the coats, the ledger the landlord keeps under the counter.'],
    off: ['A stool at the end of the bar is turned to face the door. Every other stool faces the bar.', 'There is a glass in the sink with lipstick on the rim and the bar has been closed for hours.'],
  },
  shop: {
    looked: ['You go through the counter drawers, the sales book, the shelves behind the counter and the box of unclaimed tickets.', 'You turn out the stock room and read every label on every parcel.'],
    off: ['The sales book has an entry in a different ink, squeezed in between two others.', 'A parcel on the shelf has been re-tied by somebody who did not know the shop’s knot.'],
  },
  docks: {
    looked: ['You walk the quay from end to end, looking at the mooring rings, the bollards, and the water between the boats.', 'You go through the cargo shed, the dock log, and the pockets of every oilskin on the hooks.'],
    off: ['One mooring line is wet above the waterline. It was moved tonight.', 'A crate has been opened and the lid put back with the nails in the wrong holes.'],
  },
  pier: {
    looked: ['You walk the boards and look between them, then under the pier at what the tide has left on the stones.', 'You go through the tackle box, the bait store and the bench at the end of the pier.'],
    off: ['The boards at the end are scored, as if something heavy was dragged.', 'A rope hangs down into the water with nothing on the end of it.'],
  },
  factory: {
    looked: ['You go through the time cards, the foreman’s office, and the lockers with no padlocks.', 'You walk the floor between the machines and look in the places a man would drop something and not go back for it.'],
    off: ['One machine has been run tonight. It is still warm and nothing else is.', 'A time card has been punched at an hour when the gates were locked.'],
  },
  warehouse: {
    looked: ['You go through the bays one at a time, reading the labels and checking the seals.', 'You climb to the office at the top of the stairs and turn out the desk.'],
    off: ['One seal has been broken and pressed back with a thumb.', 'The dust on the floor shows where something was dragged to the door.'],
  },
  church: {
    looked: ['You go through the vestry, the hymn books, the collection box and the tower stairs.', 'You look under the pews, behind the altar cloth, and in the drawer of the lectern.'],
    off: ['A candle has been lit and put out again with wet fingers.', 'The visitors’ book has a name in it, written and then scratched through.'],
  },
  hospital: {
    looked: ['You go through the admissions book, the dispensary shelves and the drawer of the ward desk.', 'You read the night charts and check the linen cupboard.'],
    off: ['A dose has been signed out to a patient who is not on the ward.', 'One bed has been slept in by somebody who was not admitted.'],
  },
  morgue: {
    looked: ['You go through the drawers, the register and the tray of personal effects.', 'You read the labels on every drawer and open the one that does not match its label.'],
    off: ['A tag has been rewritten. The first name is still faintly there under the second.', 'One of the effects trays has been emptied and the card not updated.'],
  },
  press: {
    looked: ['You go through the spike, the wastepaper baskets and the morgue files.', 'You read the galley proofs on the stone and the notes pinned above the sub’s desk.'],
    off: ['A story has been set in type and then pulled. The metal is still in the frame.', 'A photograph has been cut from the file. The scissors are still on the desk.'],
  },
  home: {
    looked: ['You go through the bedroom, the kitchen drawers, the writing desk, and the pockets of every coat in the hall.', 'You look under the mattress, behind the mirror, in the biscuit tin and up the chimney.'],
    off: ['The bed has been slept on, not in.', 'A cup on the table has a second cup beside it, and the house has one person in it.'],
  },
  market: {
    looked: ['You go stall by stall, under the trestles and through the crates behind the canvas.', 'You look in the places a trader keeps what is not for sale.'],
    off: ['One stall has been packed away by somebody in a hurry. The canvas is folded wrong.', 'There is fresh straw on the ground where nothing has been unloaded.'],
  },
  manor: {
    looked: ['You go through the study, the library, the drinks cabinet and the drawer that is locked.', 'You look in the places a rich house forgets: the boot room, the servants’ stair, the back of the wine rack.'],
    off: ['The fire has been lit and something burned in it that was not coal.', 'One chair in the study faces the window. The others face the desk.'],
  },
  light: {
    looked: ['You climb to the lamp and back, checking the log, the oil store and the shelf where the keeper keeps what he does not want seen.', 'You look at what the lamp looks at: the water, the rocks, the path.'],
    off: ['The log has an entry crossed out, and the crossing-out is neater than the writing.', 'The stairs are wet in a line from the door to the lamp room.'],
  },
  station: {
    looked: ['You go through the left-luggage office, the lost-property book and the waiting room.', 'You read the timetable, the ticket stubs in the bin, and the porter’s notes.'],
    off: ['A ticket has been bought for a train that did not run.', 'One left-luggage ticket has been torn from the book and not filled in.'],
  },
  bank: {
    looked: ['You go through the ledgers, the deposit slips and the box in the strongroom that is not on the list.', 'You read the signatures on every withdrawal for the last month.'],
    off: ['A slip has been signed in green ink, and nobody at this bank uses green ink.', 'One box in the strongroom has a fresh scratch across the lock.'],
  },
  school: {
    looked: ['You go through the porter’s lodge, the register, the lost-property box and the desks in the empty classroom.', 'You look in the places boys hide things: behind the radiator, in the cistern, under the loose board by the door.'],
    off: ['A name in the register has been ticked as present by somebody who was not there.', 'One desk lid has been forced.'],
  },
  bridge: {
    looked: ['You walk the span looking at the railings, the lamps and the water below.', 'You check the toll-house, the bench and the steps down to the bank.'],
    off: ['There is a scrape on the rail at one place, and paint on the ground under it.', 'Somebody has stood at the rail long enough to leave two cigarette ends.'],
  },
  bathhouse: {
    looked: ['You go through the lockers, the towel store and the attendant’s book.', 'You look in the steam room, under the benches, and in the drain.'],
    off: ['One locker is locked and its key is not on the board.', 'There are wet footprints going out and none coming in.'],
  },
  theatre: {
    looked: ['You go through the dressing rooms, the props table and the stage-door book.', 'You look in the wings, under the stage and in the pockets of the costumes on the rail.'],
    off: ['A prop is missing from the table and the outline is still there in the chalk.', 'The stage-door book has a visitor at an hour when the theatre was dark.'],
  },
  cafe: {
    looked: ['You go through the till roll, the coat rack and the newspaper rack.', 'You look under the tables and in the booth at the back that nobody sits in.'],
    off: ['A table has two cups and one chair pushed back hard enough to mark the wall.', 'A newspaper has been left folded to a page that is not the news.'],
  },
  park: {
    looked: ['You walk the paths and look under the benches, in the bins, and in the flower beds.', 'You go through the shelter and the bandstand and the shed the gardener keeps locked.'],
    off: ['The grass is flattened in one place, off the path.', 'A bench has been moved. The legs have left their marks in the gravel.'],
  },
  office: {
    looked: ['You go through the filing cabinets, the in-tray, the wastepaper basket and the desk drawer that sticks.', 'You read the appointments book and the blotter.'],
    off: ['A file is out of order. The one it should be next to has been handled tonight.', 'The blotter has the mirror image of a signature that is not the tenant’s.'],
  },
  garage: {
    looked: ['You go through the job cards, the key board and the pockets of the overalls.', 'You look under the cars and in the pit.'],
    off: ['One car has been washed tonight. Nothing else has.', 'A key is on the board for a car that is not here.'],
  },
  club: {
    looked: ['You go through the cloakroom, the members’ book and the private room upstairs.', 'You look behind the bar, in the card table drawer and in the cigar box.'],
    off: ['A member has signed in and not signed out.', 'The card table has been cleared but one chip is on the floor under it.'],
  },
  library: {
    looked: ['You go through the reading room, the returns trolley and the index cards.', 'You look on the shelf where a book is not where its card says it is.'],
    off: ['A book has been borrowed and its card is missing.', 'A page has been cut from a bound volume with a razor.'],
  },
  florist: {
    looked: ['You go through the order book, the cold room and the bin of cut stems.', 'You look on the cards that go with the flowers.'],
    off: ['An order has been paid for in cash and the card left blank.', 'A single stem is missing from a bunch that was counted.'],
  },
  tower: {
    looked: ['You climb the stairs looking at every step, and you look out from the top at what can be seen from here and nowhere else.', 'You go through the room at the top and the cupboard under the stairs.'],
    off: ['One step is wet and the rest are dry.', 'The door at the top has been left on the latch.'],
  },
  cemetery: {
    looked: ['You walk the rows reading the names, and you look at the earth on the newest graves.', 'You go through the sexton’s hut and the tool store.'],
    off: ['One grave has been disturbed and put back by somebody who does not dig for a living.', 'There are cart tracks that stop at a plot and do not go on.'],
  },
  tram: {
    looked: ['You go through the depot log, the drivers’ lockers and the lost-property shelf.', 'You look in the cars: under the seats, in the driver’s box, on the floor at the back.'],
    off: ['One car has gone out and come back and nobody has signed for it.', 'A seat is wet and the windows were shut.'],
  },
  radio: {
    looked: ['You go through the message book, the wastepaper basket and the shelf of carbons.', 'You read every message in and out for the last two days.'],
    off: ['A message has been sent and the carbon torn from the book.', 'One entry in the log is in a different hand from the operator’s.'],
  },
};

const hash = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};

export interface SearchNarrative {
  looked: string;
  /** Present when something turned up; null on an empty search. */
  off: string | null;
}

/** Stable for a given place and visit, so replaying a save tells the same story. */
export function searchNarrative(locId: string, type: LocationType, visit: number, found: boolean): SearchNarrative {
  const style = STYLES[type] ?? GENERIC;
  const h = hash(`${locId}:${visit}`);
  const looked = style.looked[h % style.looked.length];
  const offs = [...style.off, ...GENERIC.off];
  const off = found ? offs[(h >>> 8) % offs.length] : null;
  return { looked, off };
}

export const SEARCH_EMPTY_LINES = [
  'Nothing. Whatever was here is not here now.',
  'Nothing that matters. You put it all back the way you found it.',
];

export const searchEmptyLine = (locId: string, visit: number): string =>
  SEARCH_EMPTY_LINES[hash(`${locId}:${visit}:e`) % SEARCH_EMPTY_LINES.length];

/** Every fixed sentence above, for the voice corpus. */
export function allSearchLines(): string[] {
  const out: string[] = [...GENERIC.looked, ...GENERIC.off, ...SEARCH_EMPTY_LINES];
  for (const st of Object.values(STYLES)) out.push(...st.looked, ...st.off);
  return out;
}
