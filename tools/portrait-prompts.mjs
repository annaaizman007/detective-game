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
const HAT = ['', 'a fedora', 'a cloche hat', 'a flat cap', '', 'a nun\'s wimple', 'a bowler hat'];
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
  vera: { extra: 'a nightclub singer of thirty with copper red hair pinned up, unsmiling, tired eyes, dark red lipstick, in a buttoned black velvet coat with a dark fur collar', hair: 'red', glam: true, neg: 'smile, smiling, teeth, cartoon, anime, doll, big eyes, red coat, red clothing, cleavage, bare shoulders, dress, lingerie, black hair, dark hair', seed: 4402 },
  strand: { hair: 'dark' }, pike: { hair: 'grey' }, mireaux: { hair: 'dark' }, tovar: { hair: 'dark' },
  roland: { hair: 'dark' }, brandt: { hair: 'dark' }, shaw: { hair: 'dark' },
  ruby: { extra: 'a Nigerian woman, dark skin, in a plain dark 1940s coat with a small hat, shrewd, head and shoulders', hair: 'dark', neg: 'blazer, modern, glamour, cleavage' },
  // Salt and Silence
  hollis: { hair: 'dark' }, wren: { hair: 'dark' },
  okafor: { extra: 'a Nigerian man of fifty-eight, dark skin, a ship’s chandler in a brown shopkeeper’s apron over a collarless shirt and waistcoat', hair: 'grey', neg: 'kimono, robe, sash' },
  salvi: { extra: 'a shipping agent in a cream suit with a dark shirt, oiled hair, holding an unlit thin cigar', hair: 'dark' },
  tilda: { extra: 'a widow of fifty in a high-collared black mourning dress buttoned to the throat, hair fully grey in a tight bun, worn face', hair: 'grey', neg: 'cleavage, bare shoulders, gown, black hair, dark hair, young' },
  keeper: { extra: 'an old lighthouse keeper in a dark pea coat and a knitted cap, white beard, weathered', hair: 'grey', neg: 'sticks, poles, props' },
  fenn: { extra: 'a doctor, white coat under the overcoat, stethoscope', hair: 'fair' },
  ledoux: { extra: 'a trawler skipper in a plain dark oilskin coat and a dark knitted cap, head and shoulders', hair: 'dark', neg: 'lantern, props, full body, text, lettering', seed: 9102 },
  hendriks: { extra: 'a broad Dutch sailor of thirty-five, unshaven, weather-beaten, sunburnt, in a thick cable-knit jersey and a knitted cap', hair: 'fair', neg: 'leather jacket, clean-shaven, model, handsome' },
  harris: { extra: 'a thin frightened schoolboy of fifteen in a grey school blazer and a striped school tie, short 1940s side-parted hair, tearful', hair: 'fair', age: 0, neg: 'adult, beard, moustache, modern haircut, sulky, photograph' },
  // The Lamplighter
  penhale: { extra: 'a gaunt hollow-eyed man of fifty, unshaven, grey stubble, in a once-good dark overcoat gone shabby and stained, a dismissed gas inspector who lives rough', hair: 'grey', neg: 'handsome, executive, new coat, well-groomed, smiling' },
  vane: { extra: 'a red-faced old lamplighter in a flat cap and a worn moleskin jacket, unshaven, holding an unlit clay pipe', hair: 'grey' },
  rowe: { extra: 'a hospital doctor in a white coat over a dark suit, tired', hair: 'dark' },
  leo: { extra: 'a music hall manager in a loud checked suit with a carnation, brilliantined hair, a heavy face', hair: 'dark', neg: 'stick, rod, cane in mouth' },
  dunne: { extra: 'a nun of fifty-five in a black habit and white wimple, kind stern face', hair: 'grey', neg: 'hat, cigarette' },
  pask: { extra: 'a tram driver of thirty-eight with ginger hair and a ginger moustache in a dark navy uniform coat with a soft dark cap, grief-worn face', hair: 'red', neg: 'red coat, red uniform, dark hair, black hair, brown hair, cartoon, pixar, anime, police cap, badge', seed: 8183 },
  klein: { extra: 'a jobbing printer of forty-nine in an ink-stained apron over a waistcoat and a collarless shirt, sleeves rolled, ink on his hands', hair: 'fair', neg: 'inkjet, computer, office, modern shirt, desk', glasses: true },
  crowe: { extra: 'a stout landlady of sixty in a dark dress with a cameo brooch and a shawl', hair: 'grey' },
  boyle: { extra: 'a bare-headed young 1940s British police constable of twenty with short blond hair, in a navy blue wool tunic buttoned to the neck with a row of silver buttons and a stiff high collar, anxious face, no hat', hair: 'fair', neg: 'white shirt, tie, necktie, epaulettes, grey hair, silver hair, helmet, cap, hat, medals, medieval, knight, armour, anime, glossy', seed: 4249 },
  kilbride: { extra: 'a woman police sergeant of forty in a dark 1940s police tunic with sergeant’s stripes on the sleeve, hair pinned under a small dark police cap, steady gaze', hair: 'dark', neg: 'airline, pilot, globe, glamour, lipstick' },
  dwyer: { extra: 'a young factory machinist in a plain buttoned blouse and cardigan, hair pinned up under a headscarf, no makeup', hair: 'dark', neg: 'cleavage, fringe, modern bob, glamour, lipstick' },
  amos: { extra: 'an old former docker in a rough jersey and apron, gentle', hair: 'grey' },
  gurney: { extra: 'a pub landlord in shirtsleeves and a waistcoat, moustache, head and shoulders', hair: 'dark' },
  nunn: { extra: 'a chemist in a white coat with wire spectacles, precise', hair: 'dark', glasses: true },
  aldridge: { extra: 'a cafe owner in an apron, sleeves rolled, warm face, head and shoulders', hair: 'grey' },
  tench: { extra: 'an archive clerk in a grey cardigan with spectacles on a chain, sharp', hair: 'grey', glasses: true },
  halloway: { extra: 'a big gasworks stoker in a sooty collarless shirt and a flat cap, thick beard, soot on his face and neck', hair: 'dark', neg: 'hoodie, modern, jacket' },
  wright: { extra: 'a weathered canal lock keeper in an oilskin and cap, pipe-less', hair: 'grey' },
  benedetti: { extra: 'an Italian market stallholder in a headscarf and shawl, warm smile', hair: 'dark' },
  ziegler: { extra: 'an elderly pawnbroker with an eyeglass and a velvet waistcoat', hair: 'grey', glasses: true },
  brace: { extra: 'a tram depot dispatcher, a woman of forty in a dark 1940s uniform jacket with a soft cap, plain, tired', hair: 'dark', neg: 'clipboard, fluorescent, modern, office' },
  lark: { extra: 'a stage doorman in a braided maroon uniform coat and a flat cap, full colour', hair: 'dark', neg: 'greyscale, black and white, monochrome' },
  cobbett: { extra: 'an elderly hospital night porter in a brown uniform coat', hair: 'grey' },
  rusk: { extra: 'a seventeen-year-old printer’s apprentice in an ink-stained apron over a shirt buttoned to the neck, ink on his fingers, curly hair', hair: 'dark', age: 0, neg: 'open shirt, bare chest, modern' },
  frye: { extra: 'a mortuary attendant in a rubber apron over a white coat, calm', hair: 'dark' },
  marlow: { extra: 'a librarian in a high-collared blouse with spectacles, severe', hair: 'grey', glasses: true },
  roper: { extra: 'a young schoolteacher in a plain dark 1940s dress with a white Peter Pan collar, hair pinned up, kind', hair: 'dark', neg: 't-shirt, modern, stock photo, glamour' },
  hobden: { extra: 'a coal merchant in a leather cap and coal-dusted waistcoat', hair: 'dark' },
  kane: { extra: 'a worn Irish woman of fifty in a black shawl over a plain dark dress buttoned to the throat, grief in the eyes, no makeup', hair: 'grey', neg: 'evening dress, off-shoulder, cleavage, glamour, lipstick' },
  sayer: { extra: 'an elderly coroner’s clerk in a wing collar and pince-nez', hair: 'grey', glasses: true },
  bird: { extra: 'an old cemetery sexton in a battered hat and coat, spade handle', hair: 'grey' },
  quist: { extra: 'a bare-headed young beat constable of twenty-two with short dark hair, in a plain dark wool police tunic with a high collar and silver buttons, earnest, no hat', hair: 'dark', neg: 'helmet, cap, hat, peaked cap, medieval, knight, armor, armour, epaulettes, anime, glamour, glossy', seed: 556 },
  pell: { extra: 'a young deckhand of twenty-two in a knitted wool cap and a rough jersey, wind-burnt', hair: 'dark', neg: 'peaked cap, officer cap, uniform' },
  fry: { extra: 'a mission warden, an old former sailor in a plain dark cassock-like coat with a small cross, kindly, weathered', hair: 'grey', neg: 'suit, tie, gangster' },
  lundy: { extra: 'an elderly pawnbroker woman in a black dress and shawl with a magnifying eyeglass on a chain, sharp-eyed', hair: 'grey', neg: 'lipstick, glamour, young' },
  sable: { extra: 'a coastguard petty officer, a woman of forty in a plain dark naval jersey and a knitted cap, tired eyes', hair: 'dark', neg: 'lipstick, glamour, cleavage' },
  ansell: { extra: 'a bell founder in a scorched leather apron over a collarless shirt, sleeves rolled, soot on the forearms and face', hair: 'grey', neg: 'cravat, dandy, suit, tie' },
  pym: { extra: 'an elderly woman archivist in a grey cardigan and a high-collared blouse, no hat, spectacles on a chain', hair: 'grey', glasses: true, neg: 'cap, hat, uniform, military' },
  gardener: { extra: 'a young glasshouse gardener in a collarless shirt, waistcoat and a canvas apron, sleeves rolled, earth on his hands, a sprig in the buttonhole', hair: 'dark', neg: 'suit, tie, overcoat' },
  greer: { extra: 'an old almshouse resident, a poor woman in a shabby shawl and a plain bonnet, no makeup, lined face', hair: 'grey', neg: 'lipstick, glamour, smart hat, young' },
  agnes: { extra: 'a laundry nun, Sister Agnes, in a grey working habit with a white wimple and rolled sleeves, steam-reddened hands', hair: 'grey', neg: 'trench coat, cloche hat, lipstick' },
  coyle: { extra: 'a plain water-board clerk, a woman of thirty in a grey cardigan and a blouse buttoned to the neck, ink on her fingers', hair: 'dark', neg: 'lipstick, glamour, femme fatale, hat' },
  petty: { extra: 'a tea-room proprietress in a dark dress with a lace collar, head and shoulders', hair: 'grey' },
  cotter: { extra: 'an old fisherman in a woollen jersey and oilskin, weathered face', hair: 'grey' },
  oyelaran: { extra: 'a Nigerian man, dark skin, retired customs officer, night watchman in a peaked cap', hair: 'grey' },
  // The Ninth Bell
  verger: { hair: 'grey' },
  canon: { extra: 'an Anglican canon in a black cassock with a white clerical collar', hair: 'grey', smoke: false, neg: 'hat, cigarette, cigar' },
  matron: { extra: 'an asylum matron in a starched grey nurse’s uniform, a small white nurse’s cap pinned flat to grey hair, a watch pinned to the chest', hair: 'grey', smoke: false, neg: 'nun, habit, wimple, veil, rosary, chef, toque, tall hat' },
  tutor: { hair: 'fair' }, astro: { hair: 'dark' }, gardener: { hair: 'dark' },
  driver: { extra: 'a tram driver in a dark uniform coat and peaked cap', hair: 'red' },
  sister: { extra: 'a thin woman of forty in a plain grey 1940s house dress with a shawl, hair loose and unkempt, a patient of an asylum, haunted', hair: 'dark', age: 1, smoke: false, neg: 'nun, habit, wimple, veil, rosary, cross, uniform, modern, cardigan' },
};

// A few people smoke. Said this way (held in the fingers) the model paints
// the hand and the cigarette together instead of a cigarette floating in air.
const SMOKES = {
  hale: 'holding an unlit cigar between two fingers at chest height',
  crane: 'an unlit cigarette held between two fingers near the chin',
  leo: 'holding an unlit fat cigar between two fingers',
  keeper: 'holding an unlit briar pipe in one hand',
};

const STYLE = 'visible brushwork, muted earthy palette, chiaroscuro, plain dark backdrop, 1940s pulp cover illustration';
const NEGATIVE = 'two people, couple, multiple people, crowd, second face, cigarette, cigar, pipe, smoke, smoking, glossy, 3d render, cgi, airbrushed, photorealistic, photograph, lipstick, heavy makeup, glamour, cleavage, bare shoulders, off-shoulder, evening gown, full body, props, interior, furniture, modern clothes, text, letters, lettering, writing, words, logo, typography, caption, watermark, signature, blurry, deformed, disfigured, extra fingers, bad anatomy, cartoon, anime, low quality, frame, border';

const out = people.map((p) => {
  const l = lookFor(p.id);
  const cast = CASTING[p.id] ?? {};
  const who = l.fem ? 'woman' : 'man';
  const hairWords = cast.hair ? `${cast.hair === 'fair' ? 'blond' : cast.hair === 'grey' ? 'grey' : cast.hair} ${HAIR[l.hair]}` : HAIR[l.hair];
  const smoke = SMOKES[p.id] ?? '';
  const bits = [
    `${who} ${AGE[cast.age ?? l.age]}, ${cast.extra ?? p.role.split(',')[0]}`,
    smoke,
    hairWords, cast.extra ? '' : HAT[l.hat], l.fem ? '' : BEARD[l.beard], cast.glasses ? 'round wire spectacles' : '',
    cast.extra ? '' : COAT[l.coat], MOOD[l.mood],
  ].filter(Boolean).join(', ');
  let negative = smoke ? NEGATIVE.replace('cigarette, cigar, pipe, smoke, smoking, ', 'floating cigarette, disembodied cigarette, extra cigarette, ') : NEGATIVE;
  if (cast.glam) negative = negative.replace('lipstick, heavy makeup, glamour, ', '');
  return { id: p.id, name: p.name, prompt: `portrait painting, oil on canvas, head and shoulders, one person alone, ${bits}, ${STYLE}`, negative: cast.neg ? `${cast.neg}, ${negative}` : negative, seed: cast.seed ?? [...p.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) };
});

await mkdir('public/assets/images/people', { recursive: true });
await writeFile('public/assets/images/people/prompts.json', JSON.stringify(out, null, 1));
console.log(`${out.length} prompts -> public/assets/images/people/prompts.json`);
