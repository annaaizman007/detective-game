// Character models.
//
// A painted bust for everyone in Ashgrave: pulp-cover noir, one hard key
// light from the upper left, cel shading in three tones, a rim of light on
// the far cheek, and grain over the lot. Everything is SVG built from a few
// shapes and a lot of clipped, blurred shading -- the blur is what makes it
// read as paint rather than paper.
//
// Suspects are the point of it. What you know about a suspect is drawn and
// what you do not know is left as ink. Hair is black until a witness says
// "copper red"; a scar appears the moment somebody mentions it; the shoulders
// widen when the build comes in.

import type { TraitId } from '../types/game-types';
import { hash32 } from '../utils/math-utils';

export interface Look {
  fem: boolean;
  age: 0 | 1 | 2;
  skin: number;
  hair: number;
  hat: number;
  glasses: boolean;
  beard: number;
  coat: number;
  collar: number;
  mood: number;
  /** Something in the hand or mouth: 0 none, 1 cigarette, 2 cigar, 3 pipe. */
  smoke: number;
  accent: string;
}

export type Known = Partial<Record<TraitId, boolean | string | null>>;

// Skin as [base, shadow, light].
const SKIN: [string, string, string][] = [
  ['#e2b891', '#a8724c', '#f6dcc0'],
  ['#d3a276', '#95613a', '#efcaa6'],
  ['#b9865a', '#7a4f2c', '#dcae86'],
  ['#946040', '#5b361b', '#bf8a66'],
  ['#6e4530', '#3d2314', '#96694f'],
  ['#efcfae', '#b98a66', '#fbe8d4'],
];
const COAT: [string, string][] = [
  ['#2a2c33', '#101116'], ['#4b3826', '#2a1d11'], ['#243349', '#121a28'], ['#4e2530', '#2b1219'],
  ['#3d4432', '#22271a'], ['#b8a684', '#7d6e52'], ['#5d616b', '#33363d'], ['#6b5a2e', '#3f3418'],
];
const HAIR: Record<string, [string, string]> = {
  ink: ['#17171a', '#000'], dark: ['#2b1d15', '#120b07'], fair: ['#cfae6e', '#8e7040'],
  red: ['#a3462a', '#5e2412'], grey: ['#a9a6a0', '#66635e'],
};

/** Hand-set looks. Anything not here falls to the hash, stable per id. */
const LOOKS: Record<string, Partial<Look>> = {
  hale: { fem: false, age: 2, hair: 6, hat: 1, beard: 1, coat: 0, collar: 0, mood: 2, smoke: 2 },
  vale: { fem: true, age: 1, hair: 4, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  crane: { fem: false, age: 1, hair: 1, hat: 1, beard: 0, coat: 4, collar: 3, mood: 1, smoke: 1 },
  ruby: { fem: true, age: 1, hair: 3, hat: 6, coat: 3, collar: 2, mood: 1 },
  kell: { fem: false, age: 2, hair: 2, hat: 0, beard: 0, coat: 0, collar: 5, mood: 0 },
  quist: { fem: true, age: 0, hair: 2, hat: 4, coat: 2, collar: 0, mood: 2 },
  vera: { fem: true, age: 0, hair: 5, hat: 0, coat: 3, collar: 4, mood: 1, smoke: 1 },
  strand: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 0, collar: 3, mood: 2 },
  pike: { fem: false, age: 2, hair: 6, hat: 6, beard: 3, coat: 5, collar: 3, glasses: true, mood: 0 },
  mireaux: { fem: true, age: 1, hair: 4, hat: 2, coat: 7, collar: 2, mood: 0 },
  tovar: { fem: true, age: 2, hair: 4, hat: 5, coat: 0, collar: 1, mood: 2 },
  roland: { fem: false, age: 0, hair: 1, hat: 0, beard: 0, coat: 5, collar: 3, mood: 3, smoke: 1 },
  brandt: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 1, collar: 2, mood: 2, smoke: 2 },
  shaw: { fem: true, age: 1, hair: 3, hat: 2, coat: 6, collar: 1, glasses: true, mood: 1 },
  hollis: { fem: false, age: 1, hair: 2, hat: 3, beard: 1, coat: 1, collar: 2, mood: 2, smoke: 2 },
  wren: { fem: true, age: 1, hair: 4, hat: 4, coat: 2, collar: 0, glasses: true, mood: 0 },
  okafor: { fem: false, age: 2, hair: 6, hat: 0, beard: 2, coat: 1, collar: 1, mood: 0, smoke: 3 },
  salvi: { fem: false, age: 1, hair: 0, hat: 6, beard: 1, coat: 5, collar: 3, mood: 1, smoke: 2 },
  tilda: { fem: true, age: 2, hair: 4, hat: 2, coat: 3, collar: 4, mood: 2 },
  keeper: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0, smoke: 3 },
  fenn: { fem: true, age: 1, hair: 3, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  ledoux: { fem: false, age: 1, hair: 7, hat: 3, beard: 3, coat: 2, collar: 2, mood: 1, smoke: 1 },
  verger: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 0, collar: 5, mood: 2 },
  canon: { fem: false, age: 2, hair: 2, hat: 0, beard: 0, coat: 0, collar: 5, glasses: true, mood: 0 },
  matron: { fem: true, age: 2, hair: 4, hat: 5, coat: 6, collar: 1, mood: 2 },
  tutor: { fem: false, age: 1, hair: 1, hat: 0, beard: 0, coat: 1, collar: 3, glasses: true, mood: 3, smoke: 3 },
  astro: { fem: true, age: 1, hair: 4, hat: 0, coat: 2, collar: 2, glasses: true, mood: 0 },
  gardener: { fem: false, age: 0, hair: 7, hat: 3, beard: 0, coat: 7, collar: 2, mood: 1 },
  driver: { fem: true, age: 0, hair: 2, hat: 4, coat: 2, collar: 0, mood: 1, smoke: 1 },
  sister: { fem: true, age: 0, hair: 3, hat: 5, coat: 0, collar: 1, mood: 2 },
  pruett: { fem: true, age: 1, hair: 4, hat: 0, coat: 5, collar: 1, glasses: true, mood: 0 },
  marlowe: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 6, collar: 3, mood: 1 },
  flett: { fem: true, age: 1, hair: 4, hat: 5, coat: 6, collar: 1, mood: 2 },
  rainer: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0, smoke: 3 },
  wyn: { fem: false, age: 2, hair: 6, hat: 0, beard: 3, coat: 0, collar: 2, mood: 0 },
  cobb: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 1, collar: 3, glasses: true, mood: 2 },
  teague: { fem: true, age: 2, hair: 4, hat: 0, coat: 3, collar: 1, mood: 1 },
  aldous: { fem: false, age: 0, hair: 1, hat: 0, beard: 0, coat: 6, collar: 3, glasses: true, mood: 3 },
  vetch: { fem: false, age: 0, hair: 7, hat: 3, beard: 0, coat: 7, collar: 2, mood: 1 },
  kite: { fem: false, age: 1, hair: 2, hat: 0, beard: 0, coat: 6, collar: 1, mood: 0 },
  pell: { fem: false, age: 0, hair: 2, hat: 3, beard: 0, coat: 2, collar: 2, mood: 3, smoke: 1 },
  harrow: { fem: true, age: 1, hair: 3, hat: 0, coat: 5, collar: 1, mood: 1 },
  tull: { fem: true, age: 2, hair: 4, hat: 0, coat: 0, collar: 1, mood: 2 },
  wick: { fem: false, age: 2, hair: 6, hat: 4, beard: 1, coat: 0, collar: 0, mood: 2, smoke: 3 },
  greer: { fem: true, age: 2, hair: 4, hat: 2, coat: 1, collar: 2, mood: 0 },
  marley: { fem: false, age: 1, hair: 0, hat: 4, beard: 0, coat: 2, collar: 0, mood: 0, smoke: 1 },
  lister: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 7, collar: 2, mood: 1 },
  grimm: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 1, collar: 2, mood: 2, smoke: 3 },
  // the rest of the witnesses: the hash got their sex wrong for half of them
  bell: { fem: true, age: 0, hair: 3, hat: 4, coat: 3, collar: 1, mood: 1 },
  pardo: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 6, collar: 3, mood: 0 },
  amory: { fem: false, age: 1, hair: 1, hat: 3, beard: 0, coat: 4, collar: 2, mood: 3, smoke: 1 },
  vine: { fem: true, age: 1, hair: 4, hat: 0, coat: 6, collar: 1, glasses: true, mood: 2 },
  quill: { fem: true, age: 0, hair: 3, hat: 0, coat: 2, collar: 1, mood: 0 },
  marsh: { fem: false, age: 2, hair: 6, hat: 4, beard: 1, coat: 2, collar: 0, mood: 1 },
  grey: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 6, collar: 3, glasses: true, mood: 3 },
  roe: { fem: true, age: 1, hair: 4, hat: 0, coat: 6, collar: 1, mood: 0 },
  dunn: { fem: false, age: 1, hair: 1, hat: 0, beard: 0, coat: 5, collar: 3, glasses: true, mood: 2 },
  fane: { fem: true, age: 1, hair: 5, hat: 0, coat: 3, collar: 4, mood: 1, smoke: 1 },
  vasko: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 7, collar: 2, mood: 1 },
  latimer: { fem: false, age: 1, hair: 1, hat: 6, beard: 0, coat: 0, collar: 3, glasses: true, mood: 3 },
  denk: { fem: false, age: 2, hair: 2, hat: 4, beard: 2, coat: 2, collar: 2, mood: 0, smoke: 3 },
  sorrel: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0 },
  gault: { fem: true, age: 1, hair: 4, hat: 0, coat: 2, collar: 1, glasses: true, mood: 2 },
  sparks: { fem: false, age: 0, hair: 2, hat: 0, beard: 0, coat: 2, collar: 3, mood: 1, smoke: 1 },
  brack: { fem: true, age: 2, hair: 4, hat: 2, coat: 0, collar: 1, mood: 2 },
  delacroix: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 6, collar: 3, glasses: true, mood: 0 },
  oyelaran: { fem: false, age: 1, hair: 2, hat: 4, beard: 0, coat: 2, collar: 0, mood: 2 },
  mott: { fem: true, age: 2, hair: 4, hat: 0, coat: 5, collar: 1, mood: 1 },
  penrose: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 0, collar: 5, mood: 0 },
  sable: { fem: true, age: 1, hair: 2, hat: 4, coat: 2, collar: 0, mood: 2 },
  ives: { fem: true, age: 1, hair: 4, hat: 5, coat: 6, collar: 1, mood: 2 },
  cully: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0 },
  lundy: { fem: true, age: 2, hair: 4, hat: 0, coat: 1, collar: 2, glasses: true, mood: 1 },
  rook: { fem: true, age: 1, hair: 2, hat: 4, coat: 2, collar: 0, mood: 1 },
  orme: { fem: false, age: 1, hair: 2, hat: 3, beard: 0, coat: 7, collar: 2, mood: 0 },
  fry: { fem: false, age: 2, hair: 6, hat: 0, beard: 2, coat: 0, collar: 5, mood: 0 },
  ansell: { fem: false, age: 2, hair: 6, hat: 3, beard: 1, coat: 7, collar: 2, mood: 0 },
  pym: { fem: true, age: 2, hair: 4, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  oakes: { fem: false, age: 1, hair: 1, hat: 0, beard: 0, coat: 6, collar: 3, glasses: true, mood: 3 },
  brannock: { fem: true, age: 2, hair: 4, hat: 0, coat: 0, collar: 1, mood: 2 },
  lamb: { fem: true, age: 1, hair: 4, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  quaile: { fem: false, age: 0, hair: 2, hat: 0, beard: 0, coat: 6, collar: 1, mood: 1 },
  hobb: { fem: false, age: 2, hair: 6, hat: 0, beard: 3, coat: 1, collar: 3, glasses: true, mood: 2 },
  amsel: { fem: false, age: 2, hair: 6, hat: 0, beard: 2, coat: 1, collar: 3, glasses: true, mood: 0 },
  petty: { fem: true, age: 2, hair: 4, hat: 0, coat: 3, collar: 4, mood: 1 },
  rudge: { fem: false, age: 1, hair: 2, hat: 0, beard: 1, coat: 1, collar: 2, mood: 1 },
  shale: { fem: false, age: 1, hair: 2, hat: 3, beard: 0, coat: 7, collar: 2, mood: 0 },
  ferris: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0, smoke: 3 },
  agnes: { fem: true, age: 1, hair: 4, hat: 5, coat: 6, collar: 1, mood: 0 },
  coyle: { fem: true, age: 1, hair: 3, hat: 0, coat: 2, collar: 1, glasses: true, mood: 2 },
};

export function lookFor(id: string, accent = '#c8963e'): Look {
  const h = hash32(id);
  const pick = (shift: number, n: number) => (h >>> shift) % n;
  const base: Look = {
    fem: !!(h & 1),
    age: pick(1, 3) as 0 | 1 | 2,
    skin: pick(3, SKIN.length),
    hair: pick(6, 8),
    hat: pick(9, 4) === 0 ? 0 : 1 + pick(11, 3),
    glasses: pick(14, 5) === 0,
    beard: pick(16, 4),
    coat: pick(18, COAT.length),
    collar: pick(21, 5),
    mood: pick(24, 4),
    smoke: pick(26, 9) === 0 ? 1 + pick(28, 3) : 0,
    accent,
  };
  const look = { ...base, ...(LOOKS[id] || {}), accent };
  if (look.fem) look.beard = 0;
  return look;
}

// The head is an egg centred at (150,150), rx 62, ry 76, jaw at y 226. Men
// get a squarer jaw and a heavier brow line.
const HEAD_F = 'M88 140c0-48 26-78 62-78s62 30 62 78c0 34-10 58-26 74-10 10-22 16-36 16s-26-6-36-16c-16-16-26-40-26-74z';
const HEAD_M = 'M86 138c0-46 26-76 64-76s64 30 64 76c0 30-6 52-18 68-8 12-22 24-46 24s-38-12-46-24c-12-16-18-38-18-68z';

function hairShape(n: number, fem: boolean): string {
  switch (n) {
    case 0: return 'M86 132c0-46 24-70 64-70s64 24 64 70c-8-22-30-38-64-38s-56 16-64 38z';                           // slicked
    case 1: return 'M84 136c4-42 26-72 66-72 28 0 48 10 62 32-10-4-20-4-30 4-12-6-22-8-36-6-22 2-40 14-62 42z';       // side part, swept
    case 2: return 'M88 128c0-40 24-66 62-66s62 26 62 66c-8-18-30-30-62-30s-54 12-62 30z';                            // cropped
    case 3: return 'M76 146c-2-52 24-84 74-84s76 32 74 84l-4 66c-6 8-16 8-22 4l2-56c-2-24-20-42-50-42s-48 18-50 42l2 56c-6 4-16 4-22-4z'; // bob
    case 4: return 'M84 134c2-38 28-66 66-66s64 28 66 66c-12-22-34-34-66-34s-54 12-66 34zM128 62c0-14 10-22 22-22s22 8 22 22-10 20-22 20-22-6-22-20z'; // updo
    case 5: return 'M70 150c-4-56 26-92 80-92s84 36 80 92c4 40 0 80-12 116-8 4-14 2-18-4 8-34 8-64 0-96-6-24-22-40-50-40s-44 16-50 40c-8 32-8 62 0 96-4 6-10 8-18 4-12-36-16-76-12-116z'; // long waves
    case 6: return 'M90 150c-4-20 0-40 12-56 4 20 4 40 0 60zM210 150c4-20 0-40-12-56-4 20-4 40 0 60z';               // receding
    default: return 'M84 140c-6-46 24-80 66-80s72 34 66 80c-6-14-14-22-22-22-4-12-14-20-24-20-12 0-20 8-24 20-8 0-16 8-22 22-4-10-10-14-16-14-4 6-4 10 0 14 4 2 4 6 0 8-6-4-10-6-14-8z'; // curls
  }
  void fem;
}

function hatShape(n: number, fem: boolean, tone: string, tone2: string): string {
  switch (n) {
    case 1: // fedora
      return `<path d="M56 118c30-14 158-14 188 0 6 3 4 10-3 10H59c-7 0-9-7-3-10z" fill="${tone2}"/>
              <path d="M84 116c2-38 22-64 66-64s64 26 66 64c-20-8-42-12-66-12s-46 4-66 12z" fill="${tone}"/>
              <path d="M104 76c14-6 30-8 46-8 18 0 32 2 44 8-4 14-6 24-4 36-14-4-26-6-40-6s-28 2-42 6c2-12 0-22-4-36z" fill="${tone2}" opacity=".55"/>
              <path d="M86 112c20-8 108-8 128 0" stroke="#0b0b0d" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    case 2: // cloche
      return `<path d="M76 146c-4-58 26-92 74-92s78 34 74 92c-6 10-14 14-24 14H100c-10 0-18-4-24-14z" fill="${tone}"/>
              <path d="M84 130c22 6 110 6 132 0" stroke="${fem ? '#8b2f3d' : tone2}" stroke-width="7" fill="none"/>`;
    case 3: // flat cap
      return `<path d="M82 118c6-36 28-58 68-58s62 22 68 58c-20-8-44-12-68-12s-48 4-68 12z" fill="${tone}"/>
              <path d="M150 120c22-2 52 0 76 6-24 3-56 3-76-6z" fill="${tone2}"/>`;
    case 4: // peaked cap
      return `<path d="M86 114c4-32 26-52 64-52s60 20 64 52c-20-6-42-10-64-10s-44 4-64 10z" fill="#1b2130"/>
              <path d="M78 118h144c6 0 6 8 0 10H78c-6-2-6-10 0-10z" fill="#0b0d12"/>
              <circle cx="150" cy="98" r="8" fill="#c8963e"/>`;
    case 5: // wimple
      return `<path d="M82 152c-2-62 24-92 68-92s70 30 68 92c-12-16-34-24-68-24s-56 8-68 24z" fill="#efe9dc"/>
              <path d="M90 152c12-12 30-18 60-18s48 6 60 18" stroke="#c9c1b0" stroke-width="3" fill="none"/>`;
    case 6: // bowler
      return `<path d="M66 122c24-10 144-10 168 0 6 3 4 9-3 9H69c-7 0-9-6-3-9z" fill="${tone2}"/>
              <path d="M86 118c0-36 24-58 64-58s64 22 64 58c-18-6-40-10-64-10s-46 4-64 10z" fill="${tone}"/>`;
    default: return '';
  }
}

function collarShape(n: number, coat: string, coat2: string, fem: boolean): string {
  switch (n) {
    case 0: // trench, wide lapels
      return `<path d="M100 236l50 66 50-66-16-8-34 50-34-50z" fill="#0e1014"/>
              <path d="M112 232l38 54 38-54" stroke="${coat2}" stroke-width="6" fill="none"/>`;
    case 1: // blouse / shirt collar
      return `<path d="M112 238c10 18 66 18 76 0v-10c-10 14-66 14-76 0z" fill="#e8e1d2"/>`;
    case 2: // scarf
      return `<path d="M96 250c14-24 94-24 108 0-8 16-22 20-54 20s-46-4-54-20z" fill="${fem ? '#8b2f3d' : '#3a3f4a'}"/>
              <path d="M104 256c12-10 80-10 92 0" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none"/>`;
    case 3: // shirt and tie
      return `<path d="M112 236l38 32 38-32-10-6-28 24-28-24z" fill="#e8e1d2"/>
              <path d="M142 262h16l-4 46-4 8-4-8z" fill="#5a1f28"/><path d="M142 262h16l-8 10z" fill="#3c1219"/>`;
    case 4: // pearls
      return `<g fill="#f2ecdf" stroke="#b7ad9a" stroke-width="1">${[-32, -22, -11, 0, 11, 22, 32].map((x, i) => `<circle cx="${150 + x}" cy="${268 - Math.abs(i - 3) * 4}" r="5"/>`).join('')}</g>`;
    default: // clerical collar
      return `<path d="M118 240c10 12 54 12 64 0v10c-10 10-54 10-64 0z" fill="#f2efe8"/><path d="M142 244h16v10h-16z" fill="#0e1014"/>`;
  }
  void coat;
}

function beardShape(n: number, c: string, c2: string): string {
  switch (n) {
    case 1: return `<path d="M120 190c8-6 52-6 60 0-6 10-54 10-60 0z" fill="${c}"/>`;
    case 2: return `<path d="M90 160c8 46 30 70 60 70s52-24 60-70c-12 26-34 40-60 40s-48-14-60-40z" fill="${c}"/><path d="M120 190c8-6 52-6 60 0-6 10-54 10-60 0z" fill="${c2}"/>`;
    case 3: return `<path d="M128 206c6 16 38 16 44 0-4 20-40 20-44 0z" fill="${c}"/><path d="M122 190c8-6 48-6 56 0-6 8-50 8-56 0z" fill="${c}"/>`;
    default: return '';
  }
}

function mouthShape(n: number, fem: boolean, skin2: string): string {
  const lip = fem ? '#8b2f3d' : skin2;
  const w = fem ? 3.6 : 3;
  switch (n) {
    case 1: return `<path d="M128 200q22 12 44 0" stroke="${lip}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    case 2: return `<path d="M128 204q22-10 44 0" stroke="${lip}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    case 3: return `<path d="M128 200q22 4 44 0q-22 12-44 0z" fill="${lip}"/>`;
    default: return `<path d="M129 202h42" stroke="${lip}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
}

function smokeShape(n: number): string {
  if (!n) return '';
  const smoke = `<path d="M196 178c4-14-4-22 2-34s-2-18 4-30" stroke="#d8d2c4" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#SOFT)"/>`;
  switch (n) {
    case 1: return `<path d="M166 200l30 8" stroke="#f1eadc" stroke-width="4" stroke-linecap="round"/><circle cx="197" cy="208.5" r="2.6" fill="#e0632a"/>${smoke}`;
    case 2: return `<path d="M166 202l34 10" stroke="#4a2c1a" stroke-width="7" stroke-linecap="round"/><circle cx="201" cy="212" r="3.6" fill="#c8472a"/>${smoke}`;
    default: return `<path d="M166 202l38 12" stroke="#3a2a1a" stroke-width="5" stroke-linecap="round"/><ellipse cx="206" cy="216" rx="8" ry="6" fill="#3a2a1a"/>${smoke.replace('196 178', '206 196')}`;
  }
}

// ------------------------------------------------------------ painted

/**
 * Painted portraits, rendered by tools/render-portraits.py, live under
 * public/assets/images/people/<id>.png with people.json listing who has one.
 * When a person has a painting it is used everywhere; the drawing is the
 * fallback, and the only version that can change with what the table knows.
 */
export const PAINTED = new Set<string>();
export const PEOPLE_BASE = 'assets/images/people/';

export async function loadPainted(): Promise<Set<string>> {
  try {
    const res = await fetch(`${PEOPLE_BASE}people.json`, { cache: 'no-cache' });
    if (res.ok) {
      const j = (await res.json()) as { people?: string[] };
      for (const id of j.people ?? []) PAINTED.add(id);
    }
  } catch { /* no paintings; draw everyone */ }
  return PAINTED;
}

export const isPainted = (id: string): boolean => PAINTED.has(id);
export const paintedUrl = (id: string): string => `${PEOPLE_BASE}${id}.png`;

export interface PortraitOptions {
  size?: number;
  known?: Known;
  traits?: Partial<Record<TraitId, string>>;
  accent?: string;
  muted?: boolean;
  frame?: 'bust' | 'face';
  reveal?: boolean;
  cls?: string;
}

export function portraitSvg(id: string, opts: PortraitOptions = {}): string {
  const { size = 96, known = {}, traits = {}, muted = false, frame = 'bust', reveal = false } = opts;
  if (PAINTED.has(id)) {
    // The painting is 512x640. A face crop shows the top of it, round.
    const h = frame === 'face' ? size : Math.round(size * 1.25);
    return `<img class="portrait portrait--painted portrait--${frame} ${muted ? 'is-muted' : ''} ${opts.cls ?? ''}" src="${paintedUrl(id)}" width="${size}" height="${h}" alt="" draggable="false">`;
  }
  const look = lookFor(id, opts.accent);
  const u = `p${hash32(id + frame).toString(36)}`;
  const seen = (t: TraitId): string | null => (reveal || known[t] ? traits[t] ?? null : null);

  const hairKnown = seen('hair');
  const [hair, hair2] = muted ? ['#3a3d44', '#24262b'] : HAIR[hairKnown ?? 'ink'];
  const [skin, skin2, skin3] = muted ? ['#7a7f88', '#4e525a', '#9aa0a8'] : SKIN[look.skin];
  const [coat, coat2] = muted ? ['#3b3e45', '#24262b'] : COAT[look.coat];
  const build = seen('build');
  const mark = seen('mark');
  const vice = seen('vice');
  const scent = seen('scent');
  const accent = muted ? '#5b6472' : look.accent;
  const sx = build === 'broad' ? 1.2 : build === 'slight' ? 0.86 : 1;
  const lift = build === 'tall' ? -12 : 0;
  const smoke = vice === 'opium' ? 3 : scent === 'tobacco' ? 1 : look.smoke;

  const brows = [
    'M114 138q18-9 36 0M150 138q18-9 36 0',
    'M114 134q18-3 36 6M150 140q18-9 36-2',
    'M114 144q18-15 36-6M150 138q18-9 36 6',
    'M114 130q18 3 36 10M150 140q18-6 36-10',
  ][look.mood];
  const browColor = hairKnown === 'fair' ? '#8a6a3a' : hairKnown === 'grey' ? '#6e6b66' : '#1d1a18';

  const ageLines = look.age === 2
    ? `<g stroke="${skin2}" stroke-opacity=".9" stroke-width="2" fill="none" stroke-linecap="round"><path d="M110 176q4 12 12 18M190 176q-4 12-12 18M118 128q-8 2-14 8M182 128q8 2 14 8M104 150q-6 8-4 18M196 150q6 8 4 18"/></g>`
    : look.age === 1 ? `<g stroke="${skin2}" stroke-opacity=".7" stroke-width="1.8" fill="none" stroke-linecap="round"><path d="M112 178q4 10 10 14M188 178q-4 10-10 14"/></g>` : '';
  const stubble = !look.fem && look.beard === 0 && look.age > 0
    ? `<path d="M100 178c10 40 30 58 50 58s40-18 50-58c-10 26-28 40-50 40s-40-14-50-40z" fill="url(#${u}-stub)"/>` : '';

  const eyes = `
    <path d="M118 156q16-12 32 0q-16 8-32 0z" fill="#f2ede4"/><path d="M150 156q16-12 32 0q-16 8-32 0z" fill="#f2ede4"/>
    <circle cx="135" cy="155" r="5.4" fill="#2b2420"/><circle cx="165" cy="155" r="5.4" fill="#2b2420"/>
    <circle cx="135" cy="155" r="2.6" fill="#000"/><circle cx="165" cy="155" r="2.6" fill="#000"/>
    <circle cx="137" cy="153" r="1.3" fill="#fff"/><circle cx="167" cy="153" r="1.3" fill="#fff"/>
    <path d="M118 156q16-12 32 0M150 156q16-12 32 0" stroke="#1d1a18" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M118 150q16-14 32-2M150 148q16-12 32 2" stroke="#000" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#${u}-soft)"/>
    <path d="${brows}" stroke="${browColor}" stroke-width="5" fill="none" stroke-linecap="round"/>`;

  const nose = `
    <path d="M150 150v30q-8 8 3 10" stroke="${skin2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M150 158v24q-6 6 0 8" stroke="#000" stroke-opacity=".28" stroke-width="7" fill="none" stroke-linecap="round" filter="url(#${u}-soft)"/>`;

  const glasses = look.glasses
    ? `<g fill="none" stroke="#2a2724" stroke-width="2.4"><circle cx="134" cy="156" r="16"/><circle cx="166" cy="156" r="16"/><path d="M150 156h0M118 154l-12-6M182 154l12-6"/></g>
       <circle cx="128" cy="150" r="5" fill="#fff" fill-opacity=".25"/><circle cx="160" cy="150" r="5" fill="#fff" fill-opacity=".25"/>` : '';

  const marks = mark === 'scar'
    ? `<path d="M186 150l8 40" stroke="#8b3a3a" stroke-width="3" stroke-linecap="round"/><path d="M184 162l10-3M186 176l10-3" stroke="#8b3a3a" stroke-width="1.6"/>`
    : mark === 'tattoo' ? `<path d="M176 228c6 3 9 9 6 15-4 6-13 3-13-3" stroke="#2a4d8a" stroke-width="3" fill="none"/><circle cx="180" cy="225" r="2.4" fill="#2a4d8a"/>` : '';

  const props = vice === 'cards'
    ? `<g transform="translate(88 266) rotate(-14)"><rect width="20" height="28" rx="2" fill="#f2ecdf" stroke="#3a3a3a"/><path d="M4 6h6M4 22h6" stroke="#b3252d" stroke-width="2.4"/></g>`
    : scent === 'perfume' ? `<circle cx="104" cy="268" r="9" fill="#b8567a"/><circle cx="104" cy="268" r="3.5" fill="#f2ecdf"/>`
      : vice === 'drink' ? `<path d="M198 262l6 30h14l6-30z" fill="#f2ecdf" fill-opacity=".85" stroke="#3a3a3a"/><rect x="206" y="278" width="10" height="12" fill="#b8791f"/>` : '';

  const hat = hatShape(look.hat, look.fem, coat, coat2);
  const hairPath = hairShape(look.hair, look.fem);
  const HEAD = look.fem ? HEAD_F : HEAD_M;

  const head = `
    <g transform="translate(0 ${lift})">
      <path d="${HEAD}" fill="${skin}"/>
      <g clip-path="url(#${u}-head)">
        <ellipse cx="184" cy="150" rx="60" ry="96" fill="${skin2}" fill-opacity=".85" filter="url(#${u}-blur)"/>
        <ellipse cx="120" cy="118" rx="42" ry="46" fill="${skin3}" fill-opacity=".8" filter="url(#${u}-blur)"/>
        <ellipse cx="150" cy="236" rx="60" ry="26" fill="${skin2}" fill-opacity=".7" filter="url(#${u}-blur)"/>
        <ellipse cx="128" cy="150" rx="22" ry="14" fill="#000" fill-opacity=".22" filter="url(#${u}-blur)"/>
        <ellipse cx="172" cy="150" rx="22" ry="14" fill="#000" fill-opacity=".28" filter="url(#${u}-blur)"/>
        <path d="M212 120c6 30 4 70-10 100" stroke="${skin3}" stroke-opacity=".9" stroke-width="5" fill="none" filter="url(#${u}-soft)"/>
        ${stubble}
      </g>
      <path d="M88 150c-8-2-14 6-12 16 2 8 8 12 14 10M212 150c8-2 14 6 12 16-2 8-8 12-14 10" fill="${skin}" stroke="${skin2}" stroke-width="2"/>
      ${ageLines}${eyes}${nose}${mouthShape(look.mood, look.fem, skin2)}${beardShape(look.beard, hair, hair2)}
      <path d="${hairPath}" fill="${hair}"/>
      <g clip-path="url(#${u}-hair)"><ellipse cx="190" cy="130" rx="60" ry="80" fill="${hair2}" fill-opacity=".9" filter="url(#${u}-blur)"/><ellipse cx="118" cy="80" rx="30" ry="24" fill="#fff" fill-opacity=".14" filter="url(#${u}-blur)"/></g>
      ${marks}${glasses}${hat}
      <g clip-path="url(#${u}-head)"><ellipse cx="150" cy="120" rx="80" ry="30" fill="#000" fill-opacity="${look.hat ? 0.35 : 0}" filter="url(#${u}-blur)"/></g>
    </g>`;

  const body = `
    <g transform="translate(150 0) scale(${sx} 1) translate(-150 0)">
      <path d="M40 360c0-66 40-100 110-118 70 18 110 52 110 118z" fill="${coat}"/>
      <g clip-path="url(#${u}-body)">
        <ellipse cx="230" cy="300" rx="110" ry="110" fill="${coat2}" fill-opacity=".95" filter="url(#${u}-blur)"/>
        <ellipse cx="150" cy="250" rx="80" ry="24" fill="#000" fill-opacity=".45" filter="url(#${u}-blur)"/>
        <ellipse cx="80" cy="300" rx="34" ry="80" fill="#fff" fill-opacity=".1" filter="url(#${u}-blur)"/>
        <rect x="150" y="230" width="150" height="140" fill="url(#${u}-hatch)"/>
      </g>
      ${collarShape(look.collar, coat, coat2, look.fem)}
    </g>
    <path d="M128 226q22 30 44 0v-22h-44z" fill="${skin}"/>
    <path d="M128 226q22 30 44 0v-6q-22 14-44 0z" fill="${skin2}" fill-opacity=".9"/>
    <path d="M128 232q22 20 44 0" fill="#000" fill-opacity=".3" filter="url(#${u}-blur)"/>`;

  const vb = frame === 'face' ? '62 40 176 200' : '0 0 300 360';
  const bg = frame === 'face'
    ? `<circle cx="150" cy="140" r="100" fill="url(#${u}-bg)"/>`
    : `<rect width="300" height="360" fill="url(#${u}-bg)"/><ellipse cx="110" cy="80" rx="170" ry="150" fill="url(#${u}-key)"/>`;

  return `<svg class="portrait ${opts.cls ?? ''}" viewBox="${vb}" width="${size}" height="${frame === 'face' ? size : Math.round(size * 1.2)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${u}-bg" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${accent}" stop-opacity=".5"/><stop offset=".6" stop-color="#0d0f14" stop-opacity=".9"/><stop offset="1" stop-color="#05060a"/></radialGradient>
      <radialGradient id="${u}-key"><stop offset="0" stop-color="#fff3d6" stop-opacity=".22"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}-stub" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="${hair2}" stop-opacity=".45"/><stop offset="1" stop-color="${hair2}" stop-opacity="0"/></radialGradient>
      <pattern id="${u}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0v7" stroke="#000" stroke-opacity=".2" stroke-width="1.4"/></pattern>
      <clipPath id="${u}-head"><path d="${HEAD}"/></clipPath>
      <clipPath id="${u}-body"><path d="M40 360c0-66 40-100 110-118 70 18 110 52 110 118z"/></clipPath>
      <clipPath id="${u}-hair"><path d="${hairPath}"/></clipPath>
      <filter id="${u}-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="${u}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="SOFT" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
      <filter id="${u}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".18"/></feComponentTransfer><feBlend in2="SourceGraphic" mode="multiply"/></filter>
    </defs>
    ${bg}
    <g filter="url(#${u}-grain)">${body}${head}${smokeShape(smoke)}${props}</g>
  </svg>`;
}

/** Initials for the smallest chips, where a face would be a smudge. */
export function initialsOf(name: string): string {
  return name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
}
