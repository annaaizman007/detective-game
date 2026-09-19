#!/usr/bin/env node
// One prompt per location, for tools/render-portraits.py --dir buildings.
// Every building is painted at night in the rain, in the same pulp style as
// the faces, and described by what it is and which quarter it stands in.

import { writeFile, mkdir } from 'node:fs/promises';
const { CASES } = await import(new URL('../src/game/cases/index.ts', import.meta.url));

const WHAT = {
  hotel: 'a grand art deco hotel with a lit entrance canopy and a doorman', police: 'a stone police station with two globe lamps at the door',
  bar: 'a small jazz bar with a neon sign and a lit doorway', shop: 'a corner shop with a striped awning and a lit window',
  docks: 'a harbour dock with a crane, wet planks and a moored boat', factory: 'a brick factory with a chimney and a sawtooth roof',
  church: 'a stone gothic church with a tall steeple', hospital: 'a hospital with a red cross sign and lit ward windows',
  press: 'a newspaper building with tall lit windows and delivery trucks', home: 'a brick tenement with fire escapes',
  market: 'a covered market with stalls and hanging lanterns', manor: 'a large mansion on a hill behind iron gates',
  warehouse: 'a bonded warehouse with big loading doors', light: 'a lighthouse on a point with the beam on',
  morgue: 'a low stone morgue building with barred windows', station: 'a small railway station with a platform lamp',
  bank: 'a granite bank with tall columns', school: 'a boarding school with a gatehouse and a clock',
  bridge: 'an iron bridge over dark water', bathhouse: 'a tiled public bathhouse with a domed roof and steam',
  theatre: 'a theatre with a lit marquee and rows of bulbs', cafe: 'an all-night cafe with a green awning and steamed windows',
  park: 'a city park gate with iron railings, trees and a bandstand', office: 'a narrow office building with rows of lit windows',
  garage: 'a garage with a big open door, a car on a lift and a petrol pump', club: 'a nightclub with a neon sign and a doorman',
  library: 'a library with stone steps and columns', pier: 'a ferry pier with a ticket booth and a boat',
  florist: 'a flower shop with orchids in a lit window', tower: 'a tall brick water tower', cemetery: 'a cemetery gate with an iron arch and gravestones',
  tram: 'a tram stop with a shelter and a tram waiting', radio: 'a wireless station with a tall mast and a red light',
};
const STYLE = 'exterior view from across the street, a small 1940s English industrial city at night in the rain, low brick and stone buildings no more than four storeys, gas lamps and sodium light, wet cobbles, in full colour, deep night, black sky, only the windows and the gas lamps lit, painted illustration, pulp paperback cover art, oil painting, film noir, dramatic light, no people, no signs';
const NEGATIVE = 'sunset, dusk, orange sky, bright sky, black and white, monochrome, greyscale, desaturated, interior, indoors, corridor, hallway, room, text, letters, words, signage, shop sign, lettering, neon, neon sign, skyscraper, skyline, tall tower, modern, glass tower, cyberpunk, watermark, blurry, deformed, people, faces, crowd, figures, cartoon, anime, photograph, modern cars, daytime, snow, full moon, low quality, frame, border, lantern festival, asian';

// Places the generic type does not describe well enough to be recognised.
// Keyed `case-location`; the text replaces the type description.
const LANDMARKS = {
  'lamp-chemist': 'a Victorian chemist’s shop at night with big glass carboys glowing in the window, no lettering',
  'lamp-garage': 'a 1940s motor garage at night with a wide open door, a car on a lift inside, one petrol pump, a blank brick wall above the door',
  'lamp-library': 'a small Victorian public reading room exterior at night, stone steps, lit arched windows, a lamp by the door',
  'lamp-hospital': 'a Victorian brick infirmary at night with lit ward windows, a porter’s lodge and an arched gate, a gas lamp, no neon',
  'lamp-exchange': 'a Victorian brick telephone exchange at night with tall windows lit, a lattice of telephone wires on the roof, no neon',
  'bell-dispensary': 'a small chemist’s shop on the hill at night with big glass carboys glowing red and green in the window, no lettering',
  'bell-pawn': 'a hill pawnshop exterior at night, three brass balls over the door, a cluttered lit window, no people',
  'bell-mission': 'a humble brick chapel of the poor parish at night, a small bell in a bracket over the door, a lit doorway, no cathedral',
  'bell-tearooms': 'a small terrace tea room exterior at night with a bow window glowing warm, lace curtains, a hanging basket, no people',
  'bell-asylum': 'Marrow House asylum at night: a grim stone Victorian institution with a high wall, an iron gate with a lamp, barred windows',
  'bell-waterboard': 'a small Victorian stone water board office at night with a brass plate, tall windows lit, iron railings, no neon',
  'bell-boathouse': 'a wooden boathouse on a reservoir at night with two rowing boats pulled up on the slip, a lamp on the wall, black water',
  'bell-foundry': 'a bell foundry at night: a brick workshop with a wide open door, a furnace glow inside, a great bronze bell on a cradle in the yard',
  'bell-glasshouse': 'a large Victorian glasshouse at night, a greenhouse of iron and glass glowing green from inside, orange trees behind the panes, a coal stove chimney',
  'salt-seamen': 'a seamen’s mission at night, a plain brick hall with a lit doorway and a small cross over it, cots visible through a window',
  'salt-morgue': 'a low stone harbour mortuary building at night with barred windows and one lamp over a plain door',
  'salt-pawnshop': 'a harbour pawnshop exterior at night, three brass balls over the door, a cluttered lit window, wet cobbles, no people',
  'salt-printers': 'a small brick print shop exterior at night in a low harbour street, a lit ground-floor window with a press visible, no tall buildings',
  'salt-bondstore': 'a bonded warehouse exterior at night: a long brick shed with big wooden loading doors, a customs lamp over the door, barrels',
  'salt-excise': 'a small dockside cafe exterior at night, steamed-up windows glowing yellow, a low brick building on the quay, no people',
  'salt-slip': 'a stone ferry slip at night with a small wooden ticket hut, a lamp, a steam ferry tied up, wet cobbles running into black water',
  'salt-marconi': 'a small stone wireless station on the harbour at night with a tall wooden radio mast and guy wires, one red warning light, a lit window',
  'salt-chandler': 'a ship chandler’s shop at night: coils of rope, oilskins and lanterns hanging in the lit window, a low brick harbour street',
  'salt-drydock': 'a dry dock at night with the black hull of a big ship propped on timber stilts, scaffolding, one work lamp, rain',
  'salt-raskhouse': 'a lonely grey-shingled clapboard house on a windswept headland at night, one lamp burning in an upstairs window, a low stone wall, the sea behind',
  'bell-chapterhouse': 'a low medieval stone chapter house with a slate roof and arched windows beside a cathedral close at night, rain',
  'bell-crypt': 'the crypt entrance at the foot of a cathedral wall: a low stone doorway with iron gates, steps going down, one lamp',
  'bell-sanatorium': 'a small brick Victorian school infirmary building at the back of a school, barred windows, one lit, a locked door',
  'bell-cottage': 'a stone verger’s cottage beside a cathedral close with a lit window and a garden gate',
  'bell-observ': 'a small Victorian observatory with a copper dome on a hill at night, the dome slit open',
  'bell-watertower': 'a tall Victorian brick water tower with a crenellated top on a hill at night, alone against the sky, no other towers',
  'bell-deanery': 'a Georgian stone diocesan office building with a brass plate and a lamp over the door',
  'bell-inn': 'a small stone hill pub with a hanging painted sign with no words, warm windows, no neon',
  'lamp-bathhouse': 'a Victorian brick public bathhouse exterior with a domed roof and an arched lit entrance',
  'lamp-gasoffice': 'a Victorian gas company office building exterior at night, a brass plate, tall lit windows, iron railings, a gasholder behind, no skyscrapers',
  'lamp-mission': 'a poor brick mission hall exterior at night with a lit doorway and empty soup bowls stacked outside, no people',
  'lamp-pub': 'a small Victorian corner pub exterior at night with etched glass windows glowing and a hanging gas lamp, no neon, no lettering',
  'lamp-crowe': 'a tall narrow brick boarding house at night with nine windows, one lit, a fanlight over the door',
  'orchid-baths': 'a tiled public bathhouse exterior with a domed roof, steam from the vents, a lit entrance',
  'salt-bank': 'a small granite harbour bank exterior at night with two columns and a lit doorway, no lettering',
  'salt-baths': 'a brick harbour bathhouse exterior with a domed roof and a lit arched door',
  'salt-hall': 'a longshoremen’s union hall exterior, a brick hall with a lit doorway and a notice board',
  'salt-hospital': 'a seamen’s infirmary exterior, a brick hospital with lit ward windows and an ambulance at the door',
  'salt-shipping': 'a small brick shipping agent’s office on the quay at night, one window lit all night, a brass plate by the door, mooring bollards',
  'salt-brine': 'a low dockside pub with sawdust on the floor, a hanging brass bell over a plain wooden door, small yellow windows, no neon',
  'salt-customs': 'a stone customs house on the quay at night with a small clock tower, a flagpole and a colonnade, a low harbour town behind',
  'salt-harbourmaster': 'a harbourmaster\'s office on the end of a quay, a signal mast with flags, a wide lit window over the water and a slipway',
  'salt-cannery': 'a corrugated iron cannery on the water with FISH painted out, a conveyor, tin cans stacked and a chimney, boats alongside',
  'salt-coastguard': 'a squat square stone coastguard watch tower on a cliff at night with a glass observation room, a radio mast and a searchlight, no lighthouse',
  'salt-light': 'a tall white lighthouse on a rocky point with the beam sweeping over black water',
  'salt-trawler': 'trawler berths with three fishing boats tied up, nets hung to dry, gulls and a fish market shed',
  'salt-pier9': 'a long wooden fishing pier at night with one gas lamp at the far end, storm boards nailed over the ladder head, police rope across the entrance, black water below, no houses',
  'salt-icehouse': 'a windowless stone ice house on the water with a wide door, steps down to the harbour and a boat unloading',
  'lamp-lamp41': 'a lone Victorian gas street lamp on a corner between soot-black tenements and a high brick gasworks wall at night, the lamp unlit, chalk marks on the wet pavement',
  'lamp-gasworks': 'a Victorian gasworks at night with two huge iron gasholders and a row of brick retort houses, smoke, one lit window',
  'lamp-retort': 'a derelict bricked-up Victorian retort house behind a gasholder on an overcast rainy night, a faint glow from a stove through a crack, weeds, low cloud',
  'lamp-gasoffice': 'a Victorian gas company office with a brass plate, tall windows full of card index drawers, one lamp lit',
  'lamp-canal': 'a canal lock at night with a lock keeper’s cottage, black water, a towpath with no lamps',
  'lamp-bridge': 'an iron canal bridge at night with a single gas lamp at its foot, unlit, black water below',
  'lamp-tenement': 'a four-storey Victorian brick tenement at night with a fire-blackened top floor, washing lines, one lit window',
  'lamp-coal': 'a coal merchant’s yard at night: heaps of coal and coke behind a wooden fence, a cart, sacks under a lamp, a weighing scale',
  'lamp-courthouse': 'a small Victorian coroner’s court with stone steps and a lamp over the door at night',
  'lamp-music': 'a Victorian music hall at night with a lit marquee, bills for a dancer, a stage door down an alley',
  'lamp-market': 'a night market under canvas awnings with hanging lanterns, stalls of buttons and chalk and thread, wet cobbles',
  'lamp-mission': 'a poor mission hall at night with a lit doorway, a queue of men with bowls, a nun at the door',
  'lamp-printworks': 'a jobbing printer’s shop at night with a lit window full of broadsheets and a press inside',
  'salt-saltstairs': 'old stone steps cut into a sea cliff under a lighthouse at night, a rowing boat pulled up, a bundle of blankets in a cave mouth, no lights',
  'bell-sanatorium': 'a locked Victorian school infirmary ward at night, iron beds, one lamp, a barred window, a heavy door with a small glass panel',
  'salt-saltworks': 'a salt works with white salt heaps, brick kilns and sacks stacked under a lamp',
};

// A second try for the ones the first seed drew in black and white or with signs.
const RESEED = { 'salt-marconi': 7, 'salt-bank': 13, 'salt-morgue': 13, 'bell-asylum': 13, 'lamp-exchange': 7, 'lamp-gasoffice': 7, 'lamp-garage': 7, 'lamp-retort': 13 };
const out = [];
for (const c of CASES) {
  for (const l of c.locations) {
    const what = LANDMARKS[`${c.id}-${l.id}`] ?? WHAT[l.type] ?? 'a city building';
    out.push({ id: `${c.id}-${l.id}`, name: l.name, prompt: `${what}, in ${l.district ?? 'the city'}, ${STYLE}`, negative: NEGATIVE,
      seed: [...`${c.id}:${l.id}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 11) + (RESEED[`${c.id}-${l.id}`] ?? 0) });
  }
}
await mkdir('public/assets/images/buildings', { recursive: true });
await writeFile('public/assets/images/buildings/prompts.json', JSON.stringify(out, null, 1));
console.log(`${out.length} prompts -> public/assets/images/buildings/prompts.json`);
