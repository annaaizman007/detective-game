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
const SMOKE = ['', 'cigarette in mouth', 'cigar in mouth', 'smoking a pipe'];
const COAT = ['dark trench coat', 'brown wool coat', 'navy overcoat', 'burgundy coat', 'olive jacket', 'cream jacket', 'grey suit', 'tan overcoat'];

const people = [];
for (const c of CHARACTERS) people.push({ id: c.id, name: c.name, role: c.role.toLowerCase() + ', a detective', kind: 'detective' });
for (const c of CASES) {
  for (const s of c.suspects) people.push({ id: s.id, name: s.name, role: s.role.toLowerCase(), kind: 'suspect' });
  for (const w of c.witnesses) people.push({ id: w.id, name: w.name, role: w.role.toLowerCase(), kind: 'witness' });
}

const STYLE = '1950s pulp crime paperback cover art, oil painting, chiaroscuro light from the left, muted colours, dark smoky background, bust portrait, looking at viewer, 1940s clothing';
const NEGATIVE = 'photograph, photorealistic, modern clothes, text, letters, watermark, signature, blurry, deformed, disfigured, extra fingers, bad anatomy, cartoon, anime, low quality, frame, border';

const out = people.map((p) => {
  const l = lookFor(p.id);
  const who = l.fem ? 'woman' : 'man';
  const bits = [
    `portrait of a ${who} ${AGE[l.age]}, ${p.role}`,
    HAIR[l.hair], HAT[l.hat], l.fem ? '' : BEARD[l.beard], l.glasses ? 'round wire glasses' : '',
    COAT[l.coat], MOOD[l.mood], SMOKE[l.smoke],
  ].filter(Boolean).join(', ');
  return { id: p.id, name: p.name, prompt: `${bits}, ${STYLE}`, negative: NEGATIVE, seed: [...p.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) };
});

await mkdir('public/assets/images/people', { recursive: true });
await writeFile('public/assets/images/people/prompts.json', JSON.stringify(out, null, 1));
console.log(`${out.length} prompts -> public/assets/images/people/prompts.json`);
