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
const STYLE = 'exterior view of the building from across the street, 1950s Chicago street at night in the rain, painted illustration, pulp paperback cover art, oil painting, neon reflections on wet street, film noir, dramatic light, no people';
const NEGATIVE = 'interior, indoors, corridor, hallway, room, text, letters, words, signage text, watermark, blurry, deformed, people, faces, cartoon, anime, photograph, modern cars, daytime, low quality, frame';

// Places the generic type does not describe well enough to be recognised.
// Keyed `case-location`; the text replaces the type description.
const LANDMARKS = {
  'bell-chapterhouse': 'a medieval stone chapter house with a slate roof and arched windows beside a cathedral, seen from the close',
  'bell-crypt': 'the crypt entrance at the foot of a cathedral wall: a low stone doorway with iron gates, steps going down, one lamp',
  'bell-sanatorium': 'a small brick Victorian school infirmary building at the back of a school, barred windows, one lit, a locked door',
  'bell-cottage': 'a stone verger’s cottage beside a cathedral close with a lit window and a garden gate',
  'bell-observ': 'a small Victorian observatory with a copper dome on a hill at night, the dome slit open',
  'bell-watertower': 'a tall Victorian brick water tower with a crenellated top on a hill at night',
  'bell-deanery': 'a Georgian stone diocesan office building with a brass plate and a lamp over the door',
  'bell-inn': 'a small stone hill pub with a hanging painted sign, warm windows, no neon',
  'lamp-bathhouse': 'a Victorian brick public bathhouse exterior with a domed roof and an arched lit entrance',
  'lamp-gasoffice': 'a Victorian gas company office building exterior with a brass plate, tall lit windows and iron railings',
  'lamp-mission': 'a poor brick mission hall exterior at night with a lit doorway and a queue of men with bowls outside',
  'lamp-pub': 'a small Victorian corner pub exterior with etched glass windows and a hanging gas lamp sign, no neon',
  'lamp-crowe': 'a tall narrow brick boarding house with nine windows, one lit, a fanlight over the door',
  'orchid-baths': 'a tiled public bathhouse exterior with a domed roof, steam from the vents, a lit entrance',
  'salt-bank': 'a granite harbour bank exterior with columns and a lit doorway on a wet street',
  'salt-baths': 'a brick harbour bathhouse exterior with a domed roof and a lit arched door',
  'salt-hall': 'a longshoremen’s union hall exterior, a brick hall with a lit doorway and a notice board',
  'salt-hospital': 'a seamen’s infirmary exterior, a brick hospital with lit ward windows and an ambulance at the door',
  'salt-shipping': 'a small shipping agent’s office on the quay with one window lit all night and a brass plate',
  'salt-brine': 'a low dockside pub with sawdust on the floor, a hanging brass bell over a plain wooden door, small yellow windows, no neon',
  'salt-customs': 'a stone customs house with a clock tower, a flagpole, a colonnade and a lit brass-lamped doorway on the quay',
  'salt-harbourmaster': 'a harbourmaster\'s office on the end of a quay, a signal mast with flags, a wide lit window over the water and a slipway',
  'salt-cannery': 'a corrugated iron cannery on the water with FISH painted out, a conveyor, tin cans stacked and a chimney, boats alongside',
  'salt-coastguard': 'a square stone coastguard watch tower with a glass observation room, a radio mast and a searchlight, no lighthouse',
  'salt-light': 'a tall white lighthouse on a rocky point with the beam sweeping over black water',
  'salt-trawler': 'trawler berths with three fishing boats tied up, nets hung to dry, gulls and a fish market shed',
  'salt-pier9': 'a long wooden pier at night with one gas lamp at the end, storm boards, police tape and a ladder down to black water',
  'salt-icehouse': 'a windowless stone ice house on the water with a wide door, steps down to the harbour and a boat unloading',
  'lamp-lamp41': 'a lone Victorian gas street lamp on a corner between soot-black tenements and a high brick gasworks wall at night, the lamp unlit, chalk marks on the wet pavement',
  'lamp-gasworks': 'a Victorian gasworks at night with two huge iron gasholders and a row of brick retort houses, smoke, one lit window',
  'lamp-retort': 'a derelict bricked-up Victorian retort house behind a gasholder at night, a faint glow from a stove through a crack, weeds, no lamps',
  'lamp-gasoffice': 'a Victorian gas company office with a brass plate, tall windows full of card index drawers, one lamp lit',
  'lamp-canal': 'a canal lock at night with a lock keeper’s cottage, black water, a towpath with no lamps',
  'lamp-bridge': 'an iron canal bridge at night with a single gas lamp at its foot, unlit, black water below',
  'lamp-tenement': 'a four-storey Victorian brick tenement at night with a fire-blackened top floor, washing lines, one lit window',
  'lamp-coal': 'a coal merchant’s yard at night with sacks of coke stacked under a lamp, a cart, a weighing scale',
  'lamp-courthouse': 'a small Victorian coroner’s court with stone steps and a lamp over the door at night',
  'lamp-music': 'a Victorian music hall at night with a lit marquee, bills for a dancer, a stage door down an alley',
  'lamp-market': 'a night market under canvas awnings with hanging lanterns, stalls of buttons and chalk and thread, wet cobbles',
  'lamp-mission': 'a poor mission hall at night with a lit doorway, a queue of men with bowls, a nun at the door',
  'lamp-printworks': 'a jobbing printer’s shop at night with a lit window full of broadsheets and a press inside',
  'salt-saltstairs': 'old stone steps cut into a sea cliff under a lighthouse at night, a rowing boat pulled up, a bundle of blankets in a cave mouth, no lights',
  'bell-sanatorium': 'a locked Victorian school infirmary ward at night, iron beds, one lamp, a barred window, a heavy door with a small glass panel',
  'salt-saltworks': 'a salt works with white salt heaps, brick kilns and sacks stacked under a lamp',
};

const out = [];
for (const c of CASES) {
  for (const l of c.locations) {
    const what = LANDMARKS[`${c.id}-${l.id}`] ?? WHAT[l.type] ?? 'a city building';
    out.push({ id: `${c.id}-${l.id}`, name: l.name, prompt: `${what}, called ${l.name}, in ${l.district ?? 'the city'}, ${STYLE}`, negative: NEGATIVE,
      seed: [...`${c.id}:${l.id}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 11) });
  }
}
await mkdir('public/assets/images/buildings', { recursive: true });
await writeFile('public/assets/images/buildings/prompts.json', JSON.stringify(out, null, 1));
console.log(`${out.length} prompts -> public/assets/images/buildings/prompts.json`);
