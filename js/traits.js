// The deduction alphabet.
//
// Every case picks a handful of these categories. Each suspect is dealt one
// value per category. Physical evidence found on the map tells you what the
// CULPRIT's value is; interrogation tells you what a SUSPECT's value is.
// Cross-reference the two and the innocent cross themselves off.

export const TRAITS = {
  build: {
    id: 'build', label: 'Build', icon: 'body', public: true,
    values: [
      { id: 'slight', label: 'Slight',
        clue: 'The sill was scuffed where someone slim slipped through a nine-inch gap. Our killer is slight.',
        tell: 'slips sideways through the doorway without turning -- slight enough to.' },
      { id: 'broad', label: 'Broad',
        clue: 'The door frame is split at the shoulder height of a heavy man. Our killer is broad.',
        tell: 'fills the whole doorway, shoulders squared. Broad as a barn.' },
      { id: 'tall', label: 'Tall',
        clue: 'The blood spatter arcs down from well above six feet. Our killer is tall.',
        tell: 'has to duck the lamp fixture. Tall.' },
    ],
  },
  hair: {
    id: 'hair', label: 'Hair', icon: 'hair', public: true,
    values: [
      { id: 'dark', label: 'Dark', clue: 'A single dark hair, caught in the victim’s ring.', tell: 'dark, oiled flat under the hat.' },
      { id: 'fair', label: 'Fair', clue: 'A pale hair on the collar, fair as winter straw.', tell: 'fair, going white at the temples.' },
      { id: 'red', label: 'Red', clue: 'One red hair on the pillow. Copper, unmistakable.', tell: 'copper red, badly hidden under the brim.' },
      { id: 'grey', label: 'Grey', clue: 'Grey hairs in the struggle -- too many to be the victim’s.', tell: 'iron grey, cropped close.' },
    ],
  },
  hand: {
    id: 'hand', label: 'Handedness', icon: 'hand',
    values: [
      { id: 'left', label: 'Left-handed', clue: 'The blow came across from the left. Our killer is left-handed.', tell: 'strikes the match left-handed without thinking about it.' },
      { id: 'right', label: 'Right-handed', clue: 'Powder burns on the right glove. Our killer is right-handed.', tell: 'signs the statement with the right hand, slow and careful.' },
    ],
  },
  mark: {
    id: 'mark', label: 'Distinguishing mark', icon: 'mark',
    values: [
      { id: 'scar', label: 'A scar', clue: 'Skin under the fingernails, and with it a fleck of old scar tissue.', tell: 'a white scar running from ear to jaw, badly healed.' },
      { id: 'tattoo', label: 'A tattoo', clue: 'A witness saw ink on the wrist as the hand came down.', tell: 'blue navy ink crawling out of the cuff.' },
      { id: 'missing', label: 'A missing finger', clue: 'The glove print on the glass shows four fingers. Only four.', tell: 'the left hand is short a finger, and hides it.' },
      { id: 'clean', label: 'Unmarked', clue: 'Not a mark, not a blemish -- the witness swears the face was clean.', tell: 'unmarked. Nothing to describe, which is its own kind of description.' },
    ],
  },
  vice: {
    id: 'vice', label: 'Vice', icon: 'vice',
    values: [
      { id: 'cards', label: 'Cards', clue: 'A crumpled marker from a back-room game, dropped in the struggle.', tell: 'shuffles a deck through the whole conversation. Cards.' },
      { id: 'drink', label: 'Drink', clue: 'Rye on the glass rim -- the second glass, the one that got away.', tell: 'hands shake until the second drink. Then they stop.' },
      { id: 'opium', label: 'The pipe', clue: 'Sweet smoke in the curtains. Somebody here chases the dragon.', tell: 'pupils like pinheads, and that too-slow smile.' },
      { id: 'clean', label: 'No vice', clue: 'No liquor, no markers, no smoke. Whoever did this keeps a clean house.', tell: 'no drink, no smoke, no cards. Unnervingly clean.' },
    ],
  },
  scent: {
    id: 'scent', label: 'Scent', icon: 'scent',
    values: [
      { id: 'tobacco', label: 'Cheap tobacco', clue: 'The room stinks of cheap tobacco, and the victim never smoked.', tell: 'reeks of cheap tobacco, the kind sold by the pound.' },
      { id: 'perfume', label: 'Orchid perfume', clue: 'Orchid perfume on the victim’s lapel. Somebody stood very close.', tell: 'orchid perfume, laid on thick.' },
      { id: 'oil', label: 'Machine oil', clue: 'A thumbprint in machine oil on the door plate.', tell: 'machine oil worked into the knuckles. It never washes out.' },
      { id: 'ether', label: 'Ether', clue: 'Ether. Faint, sickly, and hanging over everything.', tell: 'the sweet ether smell of a hospital corridor.' },
    ],
  },
  shoe: {
    id: 'shoe', label: 'Footprint', icon: 'shoe',
    values: [
      { id: 'small', label: 'Size 8', clue: 'A neat size eight pressed into the flowerbed.', tell: 'small feet for the frame -- an eight at most.' },
      { id: 'mid', label: 'Size 10', clue: 'Size ten, worn down hard on the outer heel.', tell: 'a plain size ten, heels worn to the nail.' },
      { id: 'large', label: 'Size 12', clue: 'A size twelve in the wet ash by the back stair.', tell: 'boats for feet. Twelves, easy.' },
    ],
  },
};

export const TRAIT_IDS = Object.keys(TRAITS);

export const traitValue = (traitId, valueId) =>
  TRAITS[traitId].values.find((v) => v.id === valueId);

export const traitLabel = (traitId, valueId) => {
  const v = traitValue(traitId, valueId);
  return v ? v.label : '—';
};
