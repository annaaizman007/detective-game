#!/usr/bin/env node
// Write one prompt per character for tools/render-portraits.py.
//
// The look table in src/ui/portraits.ts (hair, hat, glasses, beard, age,
// smoke) is turned into words, so the painted portrait and the drawn one
// describe the same person. Roles come from the case files.

import { writeFile, mkdir } from 'node:fs/promises';

const { CASES } = await import(new URL('../src/game/cases/index.ts', import.meta.url));
const { CHARACTERS } = await import(new URL('../src/game/characters.ts', import.meta.url));
const { lookFor } = await import(new URL('../src/ui/portraits.ts', import.meta.url));

const HAIR = ['slicked-back hair', 'side-parted hair', 'short cropped hair', 'bobbed hair', 'hair in an updo', 'long wavy hair', 'receding hairline, balding', 'curly hair'];
const HAT = ['', 'a fedora', 'a cloche hat', 'a flat cap', 'a peaked uniform cap', 'a nun\'s wimple', 'a bowler hat'];
const BEARD = ['clean-shaven', 'a moustache', 'a full beard', 'a goatee'];
const AGE = ['in their twenties', 'in their forties', 'elderly, lined face'];
const MOOD = ['calm expression', 'wry half-smile', 'stern, hard stare', 'worried, tired eyes'];
// Smoke is left out on purpose: the model paints cigarettes floating in mid-air.
const COAT = ['dark trench coat', 'brown wool coat', 'navy overcoat', 'burgundy coat', 'olive jacket', 'cream jacket', 'grey suit', 'tan overcoat'];

const people = [];
for (const c of CHARACTERS) people.push({ id: c.id, name: c.name, role: c.role.toLowerCase() + ', a detective', kind: 'detective' });
for (const c of CASES) {
  for (const s of c.suspects) people.push({ id: s.id, name: s.name, role: s.role.toLowerCase(), kind: 'suspect' });
  for (const w of c.witnesses) people.push({ id: w.id, name: w.name, role: w.role.toLowerCase(), kind: 'witness' });
}

// Casting notes the look table cannot carry: who the person is, what they
// wear for their job, and the hair colour the notebook will pin them to.
// Anything here is prepended, so it wins over the generic look.
const CASTING = {
  // detectives
  crane: { extra: 'a newspaper reporter in a rumpled grey suit, press card in the hat band', hair: 'dark' },
  kell: { extra: 'a Catholic priest in a black cassock with a white clerical collar', hair: 'grey', smoke: false, neg: 'hat, cigarette' },
  // the Orchid
  vera: { extra: 'a nightclub singer with vivid copper red hair, in a buttoned dark velvet coat with a fur collar, gloved hands', hair: 'red', neg: 'cleavage, bare shoulders, dress, lingerie, black hair, dark hair', seed: 4401 },
  strand: { hair: 'dark' }, pike: { hair: 'grey' }, mireaux: { hair: 'dark' }, tovar: { hair: 'dark' },
  roland: { hair: 'dark' }, brandt: { hair: 'dark' }, shaw: { hair: 'dark' },
  ruby: { extra: 'a Nigerian woman, dark skin, elegant, a fixer who knows every door in the city, in a dark tailored coat', hair: 'dark' },
  // Salt and Silence
  hollis: { hair: 'dark' }, wren: { hair: 'dark' },
  okafor: { extra: 'a Nigerian man of fifty-eight, dark skin, shopkeeper, chandler', hair: 'grey' },
  salvi: { hair: 'dark' },
  tilda: { extra: 'a widow of fifty in black', hair: 'grey' },
  keeper: { hair: 'grey' },
  fenn: { extra: 'a doctor, white coat under the overcoat, stethoscope', hair: 'fair' },
  ledoux: { extra: 'a trawler skipper in a plain dark oilskin coat, no markings, no text', hair: 'dark', neg: 'text, lettering, letters, logo, poster, title', seed: 9102 },
  hendriks: { extra: 'a broad Dutch sailor of thirty-five in a thick jersey and oilskin, unshaven, weather-beaten', hair: 'fair' },
  harris: { extra: 'a thin schoolboy of fifteen in a grey school uniform with a striped tie, frightened', hair: 'fair', age: 0, neg: 'adult, beard, moustache' },
  // The Lamplighter
  penhale: { extra: 'a gaunt man of fifty in a once-good dark overcoat gone shabby, hollow eyes, a former gas company inspector', hair: 'grey' },
  vane: { extra: 'a red-faced old lamplighter in a flat cap and a worn moleskin jacket, unshaven', hair: 'grey' },
  rowe: { extra: 'a hospital doctor in a white coat over a dark suit, tired', hair: 'dark' },
  leo: { extra: 'a music hall manager in a loud checked suit with a carnation, a cane', hair: 'dark' },
  dunne: { extra: 'a nun of fifty-five in a black habit and white wimple, kind stern face', hair: 'grey', neg: 'hat, cigarette' },
  pask: { extra: 'a tram driver in a dark uniform coat and peaked cap, grief in the face', hair: 'red' },
  klein: { extra: 'a printer in an ink-stained apron over a waistcoat, sleeves rolled, wire glasses', hair: 'fair' },
  crowe: { extra: 'a stout landlady of sixty in a dark dress with a cameo brooch and a shawl', hair: 'grey' },
  boyle: { extra: 'a young police constable of twenty-four in a dark tunic and helmet, anxious', hair: 'fair' },
  kilbride: { extra: 'a woman police sergeant in a dark uniform tunic, sergeant stripes, steady gaze', hair: 'dark' },
  dwyer: { extra: 'a young factory machinist in a plain blouse and cardigan', hair: 'dark' },
  amos: { extra: 'an old former docker in a rough jersey and apron, gentle', hair: 'grey' },
  gurney: { extra: 'a pub landlord in shirtsleeves and waistcoat behind a bar, moustache', hair: 'dark' },
  nunn: { extra: 'a chemist in a white coat with wire spectacles, precise', hair: 'dark' },
  aldridge: { extra: 'a cafe owner in an apron with her sleeves rolled, warm face', hair: 'grey' },
  tench: { extra: 'an archive clerk in a grey cardigan with spectacles on a chain, sharp', hair: 'grey' },
  halloway: { extra: 'a big gasworks stoker in a sooty jersey and cap, beard', hair: 'dark' },
  wright: { extra: 'a weathered canal lock keeper in an oilskin and cap, pipe-less', hair: 'grey' },
  benedetti: { extra: 'an Italian market stallholder in a headscarf and shawl, warm smile', hair: 'dark' },
  ziegler: { extra: 'an elderly pawnbroker with an eyeglass and a velvet waistcoat', hair: 'grey' },
  brace: { extra: 'a tram depot dispatcher in a uniform jacket and cap, clipboard', hair: 'dark' },
  lark: { extra: 'a stage doorman in a braided uniform coat and cap', hair: 'dark' },
  cobbett: { extra: 'an elderly hospital night porter in a brown uniform coat', hair: 'grey' },
  rusk: { extra: 'a seventeen-year-old printer’s apprentice with ink on his fingers, curly hair, cap', hair: 'dark', age: 0 },
  frye: { extra: 'a mortuary attendant in a rubber apron over a white coat, calm', hair: 'dark' },
  marlow: { extra: 'a librarian in a high-collared blouse with spectacles, severe', hair: 'grey' },
  roper: { extra: 'a young schoolteacher in a plain dress with a white collar, kind', hair: 'dark' },
  hobden: { extra: 'a coal merchant in a leather cap and coal-dusted waistcoat', hair: 'dark' },
  kane: { extra: 'a worn Irish woman of fifty in a black shawl, grief in the eyes', hair: 'grey' },
  sayer: { extra: 'an elderly coroner’s clerk in a wing collar and pince-nez', hair: 'grey' },
  bird: { extra: 'an old cemetery sexton in a battered hat and coat, spade handle', hair: 'grey' },
  cotter: { extra: 'an old fisherman in a woollen jersey and oilskin, weathered face', hair: 'grey' },
  oyelaran: { extra: 'a Nigerian man, dark skin, retired customs officer, night watchman in a peaked cap', hair: 'grey' },
  // The Ninth Bell
  verger: { hair: 'grey' },
  canon: { extra: 'an Anglican canon in a black cassock with a white clerical collar', hair: 'grey', smoke: false, neg: 'hat, cigarette, cigar' },
  matron: { extra: 'an asylum matron in a starched grey nurse’s uniform with a white nurse’s cap and a watch pinned to the chest', hair: 'grey', smoke: false, neg: 'nun, habit, wimple, veil, rosary' },
  tutor: { hair: 'fair' }, astro: { hair: 'dark' }, gardener: { hair: 'dark' },
  driver: { extra: 'a tram driver in a dark uniform coat and peaked cap', hair: 'red' },
  sister: { extra: 'a thin woman in a plain grey house dress and a cardigan, hair loose, a patient of an asylum', hair: 'dark', age: 1, smoke: false, neg: 'nun, habit, wimple, veil, rosary, cross, uniform' },
};

const STYLE = 'solo, one person alone, 1950s pulp crime paperback cover art, oil painting, chiaroscuro light, muted colours, dark smoky background, bust portrait, looking at viewer';
const NEGATIVE = 'two people, couple, multiple people, crowd, second face, cigarette, cigar, pipe, smoke, smoking, photograph, modern clothes, text, letters, lettering, writing, words, logo, typography, caption, watermark, signature, blurry, deformed, disfigured, extra fingers, bad anatomy, cartoon, anime, low quality, frame, border';

const out = people.map((p) => {
  const l = lookFor(p.id);
  const cast = CASTING[p.id] ?? {};
  const who = l.fem ? 'woman' : 'man';
  const hairWords = cast.hair ? `${cast.hair === 'fair' ? 'blond' : cast.hair === 'grey' ? 'grey' : cast.hair} ${HAIR[l.hair]}` : HAIR[l.hair];
  const bits = [
    `portrait of one ${who} ${AGE[cast.age ?? l.age]}, ${cast.extra ?? p.role.split(',')[0]}`,
    hairWords, cast.extra ? '' : HAT[l.hat], l.fem ? '' : BEARD[l.beard], l.glasses ? 'round wire glasses' : '',
    cast.extra ? '' : COAT[l.coat], MOOD[l.mood],
  ].filter(Boolean).join(', ');
  return { id: p.id, name: p.name, prompt: `${bits}, ${STYLE}`, negative: cast.neg ? `${cast.neg}, ${NEGATIVE}` : NEGATIVE, seed: cast.seed ?? [...p.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) };
});

await mkdir('public/assets/images/people', { recursive: true });
await writeFile('public/assets/images/people/prompts.json', JSON.stringify(out, null, 1));
console.log(`${out.length} prompts -> public/assets/images/people/prompts.json`);
