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
const STYLE = '1950s Chicago street at night in the rain, painted illustration, pulp paperback cover art, oil painting, neon reflections on wet street, film noir, dramatic light, no people';
const NEGATIVE = 'text, letters, words, signage text, watermark, blurry, deformed, people, faces, cartoon, anime, photograph, modern cars, daytime, low quality, frame';

// Places the generic type does not describe well enough to be recognised.
// Keyed `case-location`; the text replaces the type description.
const LANDMARKS = {
  'salt-brine': 'a low dockside pub with sawdust on the floor, a hanging brass bell over a plain wooden door, small yellow windows, no neon',
  'salt-customs': 'a stone customs house with a clock tower, a flagpole, a colonnade and a lit brass-lamped doorway on the quay',
  'salt-harbourmaster': 'a harbourmaster\'s office on the end of a quay, a signal mast with flags, a wide lit window over the water and a slipway',
  'salt-cannery': 'a corrugated iron cannery on the water with FISH painted out, a conveyor, tin cans stacked and a chimney, boats alongside',
  'salt-coastguard': 'a square stone coastguard watch tower with a glass observation room, a radio mast and a searchlight, no lighthouse',
  'salt-light': 'a tall white lighthouse on a rocky point with the beam sweeping over black water',
  'salt-trawler': 'trawler berths with three fishing boats tied up, nets hung to dry, gulls and a fish market shed',
  'salt-pier9': 'a long wooden pier at night with one gas lamp at the end, storm boards, police tape and a ladder down to black water',
  'salt-icehouse': 'a windowless stone ice house on the water with a wide door, steps down to the harbour and a boat unloading',
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
