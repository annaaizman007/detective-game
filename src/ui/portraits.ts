// Character models.
//
// Everyone in Ashgrave -- detectives, suspects, witnesses -- is drawn from the
// same layered figure: shoulders and coat, neck, head, features, hair, hat,
// glasses, and whatever the case has taught you about them. It is a police
// sketch, not a photograph: inked, flat, a little cruel.
//
// Suspects are the point of it. What you know about a suspect is drawn and
// what you do not know is left as ink. Hair is black ink until a witness says
// "copper red, badly hidden under the brim"; a scar appears the moment
// somebody mentions it; the shoulders widen when the build comes in. So the
// dossier literally fills in as the table works.

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
  accent: string;
}

export type Known = Partial<Record<TraitId, boolean | string | null>>;

const SKIN = ['#e8c9a6', '#d9b48c', '#c49a6c', '#a97b55', '#7d5a3c', '#f0d9c0'];
const COAT = ['#2b2e36', '#4a3728', '#1f2a3d', '#4d2430', '#3a4030', '#c9b99a', '#5b5f6a', '#2d3b2d'];
const HAIR: Record<string, string> = { ink: '#151515', dark: '#241a14', fair: '#d8b678', red: '#a8482a', grey: '#a9a6a0' };

/**
 * Hand-set looks for the people the cases are about. Anything not set here
 * falls to the hash, which is stable per id, so a face is always its own.
 */
const LOOKS: Record<string, Partial<Look>> = {
  // detectives
  hale: { fem: false, age: 2, hair: 6, hat: 1, beard: 1, coat: 0, collar: 0, mood: 2, glasses: false },
  vale: { fem: true, age: 1, hair: 4, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  crane: { fem: false, age: 1, hair: 1, hat: 1, beard: 0, coat: 4, collar: 0, mood: 1 },
  ruby: { fem: true, age: 1, hair: 3, hat: 6, coat: 3, collar: 2, mood: 1 },
  kell: { fem: false, age: 2, hair: 2, hat: 0, beard: 0, coat: 0, collar: 3, mood: 0 },
  quist: { fem: true, age: 0, hair: 2, hat: 4, coat: 2, collar: 0, mood: 2 },
  // orchid
  vera: { fem: true, age: 0, hair: 5, hat: 0, coat: 3, collar: 4, mood: 1 },
  strand: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 0, collar: 3, mood: 2 },
  pike: { fem: false, age: 2, hair: 6, hat: 6, beard: 3, coat: 5, collar: 3, glasses: true, mood: 0 },
  mireaux: { fem: true, age: 1, hair: 4, hat: 2, coat: 7, collar: 2, mood: 0 },
  tovar: { fem: true, age: 2, hair: 4, hat: 5, coat: 0, collar: 1, mood: 2 },
  roland: { fem: false, age: 0, hair: 1, hat: 0, beard: 0, coat: 5, collar: 3, mood: 3 },
  brandt: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 1, collar: 2, mood: 2 },
  shaw: { fem: true, age: 1, hair: 3, hat: 2, coat: 6, collar: 1, glasses: true, mood: 1 },
  // salt
  hollis: { fem: false, age: 1, hair: 2, hat: 3, beard: 1, coat: 1, collar: 2, mood: 2 },
  wren: { fem: true, age: 1, hair: 4, hat: 4, coat: 2, collar: 0, glasses: true, mood: 0 },
  okafor: { fem: false, age: 2, hair: 6, hat: 0, beard: 2, coat: 1, collar: 1, mood: 0 },
  salvi: { fem: false, age: 1, hair: 0, hat: 6, beard: 1, coat: 5, collar: 3, mood: 1 },
  tilda: { fem: true, age: 2, hair: 4, hat: 2, coat: 3, collar: 4, mood: 2 },
  keeper: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0 },
  fenn: { fem: true, age: 1, hair: 3, hat: 0, coat: 6, collar: 1, glasses: true, mood: 0 },
  ledoux: { fem: false, age: 1, hair: 7, hat: 3, beard: 3, coat: 2, collar: 2, mood: 1 },
  // bell
  verger: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 0, collar: 3, mood: 2 },
  canon: { fem: false, age: 2, hair: 2, hat: 0, beard: 0, coat: 0, collar: 3, glasses: true, mood: 0 },
  matron: { fem: true, age: 2, hair: 4, hat: 5, coat: 6, collar: 1, mood: 2 },
  tutor: { fem: false, age: 1, hair: 1, hat: 0, beard: 0, coat: 1, collar: 3, glasses: true, mood: 3 },
  astro: { fem: true, age: 1, hair: 4, hat: 0, coat: 2, collar: 2, glasses: true, mood: 0 },
  gardener: { fem: false, age: 0, hair: 7, hat: 3, beard: 0, coat: 7, collar: 2, mood: 1 },
  driver: { fem: true, age: 0, hair: 2, hat: 4, coat: 2, collar: 0, mood: 1 },
  sister: { fem: true, age: 0, hair: 3, hat: 5, coat: 0, collar: 1, mood: 2 },
  // witnesses: the ones a hash would get badly wrong
  pruett: { fem: true, age: 1, hair: 4, hat: 0, coat: 5, collar: 1, glasses: true, mood: 0 },
  marlowe: { fem: false, age: 1, hair: 0, hat: 0, beard: 1, coat: 6, collar: 3, mood: 1 },
  flett: { fem: true, age: 1, hair: 4, hat: 5, coat: 6, collar: 1, mood: 2 },
  rainer: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 7, collar: 2, mood: 0 },
  wyn: { fem: false, age: 2, hair: 6, hat: 0, beard: 3, coat: 0, collar: 2, mood: 0 },
  cobb: { fem: false, age: 2, hair: 6, hat: 0, beard: 0, coat: 1, collar: 3, glasses: true, mood: 2 },
  teague: { fem: true, age: 2, hair: 4, hat: 0, coat: 3, collar: 1, mood: 1 },
  aldous: { fem: false, age: 0, hair: 1, hat: 0, beard: 0, coat: 6, collar: 3, glasses: true, mood: 3 },
  vetch: { fem: false, age: 0, hair: 7, hat: 3, beard: 0, coat: 7, collar: 2, mood: 1 },
  kite: { fem: false, age: 1, hair: 2, hat: 0, beard: 0, coat: 6, collar: 1, mood: 0 },
  pell: { fem: false, age: 0, hair: 2, hat: 3, beard: 0, coat: 2, collar: 2, mood: 3 },
  harrow: { fem: true, age: 1, hair: 3, hat: 0, coat: 5, collar: 1, mood: 1 },
  tull: { fem: true, age: 2, hair: 4, hat: 0, coat: 0, collar: 1, mood: 2 },
  wick: { fem: false, age: 2, hair: 6, hat: 4, beard: 1, coat: 0, collar: 0, mood: 2 },
  greer: { fem: true, age: 2, hair: 4, hat: 2, coat: 1, collar: 2, mood: 0 },
  marley: { fem: false, age: 1, hair: 0, hat: 4, beard: 0, coat: 2, collar: 0, mood: 0 },
  lister: { fem: false, age: 1, hair: 2, hat: 3, beard: 2, coat: 7, collar: 2, mood: 1 },
  grimm: { fem: false, age: 2, hair: 6, hat: 3, beard: 2, coat: 1, collar: 2, mood: 2 },
};

export function lookFor(id: string, accent = '#c8963e'): Look {
  const h = hash32(id);
  // Unsigned shifts: a plain >> on a hash above 2^31 goes negative and
  // indexes off the front of every palette.
  const pick = (shift: number, n: number) => ((h >>> shift) % n);
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
    accent,
  };
  const set = LOOKS[id] || {};
  const look = { ...base, ...set, accent };
  if (look.fem) look.beard = 0;
  return look;
}

// ------------------------------------------------------------------ parts

const hairStyle = (n: number, c: string, fem: boolean): string => {
  const back = `<path d="M54 92c-4-30 14-52 46-52s50 22 46 52c-6-18-22-30-46-30s-40 12-46 30z" fill="${c}"/>`;
  switch (n) {
    case 0: // slicked back
      return `<path d="M56 86c0-28 16-46 44-46s44 18 44 46c-4-12-16-24-44-24s-40 12-44 24z" fill="${c}"/><path d="M62 66c10-6 22-9 38-9" stroke="#000" stroke-opacity=".3" stroke-width="1.5" fill="none"/>`;
    case 1: // side part
      return `${back}<path d="M58 78c8-14 20-22 38-24 20-2 30 6 46 22-6-8-14-14-30-14-8 0-14 4-22 10-10-2-20 0-32 6z" fill="${c}"/><path d="M84 60c4-4 10-6 16-6" stroke="#000" stroke-opacity=".25" stroke-width="1.4" fill="none"/>`;
    case 2: // cropped
      return `<path d="M56 84c0-26 16-42 44-42s44 16 44 42c-6-14-18-22-44-22s-38 8-44 22z" fill="${c}"/>`;
    case 3: // bob
      return `${back}<path d="M50 96c-2-40 16-60 50-60s52 20 50 60l-4 40c-4 6-10 8-16 6l2-40c-2-14-14-24-32-24s-30 10-32 24l2 40c-6 2-12 0-16-6z" fill="${c}"/>`;
    case 4: // bun / updo
      return `${back}<circle cx="100" cy="46" r="17" fill="${c}"/><path d="M60 86c2-22 18-38 40-38s38 16 40 38c-8-14-22-22-40-22s-32 8-40 22z" fill="${c}"/>`;
    case 5: // long waves
      return `${back}<path d="M48 100c-4-36 18-64 52-64s56 28 52 64c2 22-2 46-10 66-6 2-10 0-12-4 4-20 4-40 0-58-4-14-14-24-30-24s-26 10-30 24c-4 18-4 38 0 58-2 4-6 6-12 4-8-20-12-44-10-66z" fill="${c}"/>`;
    case 6: // receding / bald sides
      return `<path d="M56 96c-2-14 2-26 10-34 2 12 2 24 0 36zM144 96c2-14-2-26-10-34-2 12-2 24 0 36z" fill="${c}"/>`;
    default: // curls
      return `${back}<g fill="${c}">${[60, 74, 88, 102, 116, 130, 140].map((x, i) => `<circle cx="${x}" cy="${58 + Math.abs(i - 3) * 5}" r="11"/>`).join('')}</g>`;
  }
  void fem;
};

const hatShape = (n: number, coat: string, fem: boolean): string => {
  const band = '#0d0d0d';
  switch (n) {
    case 1: // fedora
      return `<path d="M40 76c20-8 100-8 120 0 4 2 2 6-2 6H42c-4 0-6-4-2-6z" fill="${band}"/><path d="M60 74c2-22 14-38 40-38s38 16 40 38c-14-4-28-6-40-6s-26 2-40 6z" fill="#181818"/><path d="M62 70h76" stroke="#3a3a3a" stroke-width="5" fill="none"/>`;
    case 2: // cloche
      return `<path d="M52 92c-2-36 18-56 48-56s50 20 48 56c-4 6-8 8-14 8H66c-6 0-10-2-14-8z" fill="#241c18"/><path d="M60 82c16 4 64 4 80 0" stroke="${fem ? '#8b2f3d' : '#3a3a3a'}" stroke-width="4" fill="none"/>`;
    case 3: // flat cap
      return `<path d="M54 74c4-22 18-36 46-36s42 14 46 36c-14-6-30-8-46-8s-32 2-46 8z" fill="#2c2620"/><path d="M96 76c14-2 34 0 52 4-16 2-38 2-52-4z" fill="#1c1814"/>`;
    case 4: // peaked cap
      return `<path d="M58 72c2-20 16-32 42-32s40 12 42 32c-14-4-28-6-42-6s-28 2-42 6z" fill="#1b2130"/><path d="M52 76h96c4 0 4 4 0 6H52c-4-2-4-6 0-6z" fill="#0b0d12"/><circle cx="100" cy="62" r="5" fill="#c8963e"/>`;
    case 5: // wimple / nurse cap
      return `<path d="M56 96c-2-40 16-58 44-58s46 18 44 58c-8-10-22-16-44-16s-36 6-44 16z" fill="#efe9dc"/><path d="M62 96c8-8 20-12 38-12s30 4 38 12" stroke="#c9c1b0" stroke-width="2" fill="none"/>`;
    case 6: // bowler
      return `<path d="M46 78c16-6 92-6 108 0 4 2 2 6-2 6H48c-4 0-6-4-2-6z" fill="${band}"/><path d="M62 76c0-24 16-38 38-38s38 14 38 38c-12-4-26-6-38-6s-26 2-38 6z" fill="#161616"/>`;
    default:
      return '';
  }
  void coat;
};

const collarShape = (n: number, coat: string, fem: boolean): string => {
  switch (n) {
    case 0: // trench lapels
      return `<path d="M76 160l24 30 24-30-10-4-14 22-14-22z" fill="#0f1116"/><path d="M84 158l16 22 16-22" stroke="${coat}" stroke-width="3" fill="none"/>`;
    case 1: // round blouse / shirt collar
      return `<path d="M82 160c6 10 30 10 36 0v-6c-6 8-30 8-36 0z" fill="#e6dfd0"/>`;
    case 2: // scarf / high collar
      return `<path d="M72 168c10-14 46-14 56 0-4 10-12 12-28 12s-24-2-28-12z" fill="${fem ? '#8b2f3d' : '#3a3f4a'}"/>`;
    case 3: // shirt and tie
      return `<path d="M84 158l16 16 16-16-6-3-10 10-10-10z" fill="#e6dfd0"/><path d="M96 170h8l-2 22-2 4-2-4z" fill="#5a1f28"/>`;
    default: // pearls
      return `<g fill="#f2ecdf" stroke="#b7ad9a" stroke-width=".6">${[-18, -12, -6, 0, 6, 12, 18].map((x, i) => `<circle cx="${100 + x}" cy="${168 + Math.abs(i - 3) * -2 + 6}" r="3.2"/>`).join('')}</g>`;
  }
};

const beardShape = (n: number, c: string): string => {
  switch (n) {
    case 1: return `<path d="M82 128c6-4 30-4 36 0-4 6-32 6-36 0z" fill="${c}"/>`;
    case 2: return `<path d="M60 112c6 30 20 44 40 44s34-14 40-44c-8 16-22 24-40 24s-32-8-40-24z" fill="${c}"/><path d="M82 128c6-4 30-4 36 0-4 6-32 6-36 0z" fill="${c}"/>`;
    case 3: return `<path d="M88 138c4 10 20 10 24 0-2 12-22 12-24 0z" fill="${c}"/><path d="M84 128c6-4 26-4 32 0-4 5-28 5-32 0z" fill="${c}"/>`;
    default: return '';
  }
};

const mouthShape = (n: number, fem: boolean): string => {
  const lip = fem ? '#8b2f3d' : '#6b3a36';
  switch (n) {
    case 1: return `<path d="M88 136q12 8 24 0" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    case 2: return `<path d="M88 138q12-6 24 0" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    case 3: return `<path d="M88 136q12 3 24 0q-12 8-24 0z" fill="${lip}"/>`;
    default: return `<path d="M89 137h22" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
};

// ------------------------------------------------------------------ render

export interface PortraitOptions {
  size?: number;
  known?: Known;
  /** The traits the suspect actually has; only those in `known` are drawn. */
  traits?: Partial<Record<TraitId, string>>;
  accent?: string;
  muted?: boolean;
  /** 'bust' shows shoulders and coat; 'face' crops to the head for chips. */
  frame?: 'bust' | 'face';
  /** Draw every trait regardless: for witnesses, detectives, the epilogue. */
  reveal?: boolean;
  cls?: string;
}

/**
 * The figure, as an SVG string. Inline it in the DOM or hand it to
 * svgDataUri() for a Phaser texture.
 */
export function portraitSvg(id: string, opts: PortraitOptions = {}): string {
  const { size = 96, known = {}, traits = {}, muted = false, frame = 'bust', reveal = false } = opts;
  const look = lookFor(id, opts.accent);
  const uid = `p${hash32(id + frame).toString(36)}`;
  const seen = (t: TraitId): string | null => (reveal || known[t] ? traits[t] ?? null : null);

  const hairKnown = seen('hair');
  const hairColor = muted ? '#2a2d33' : HAIR[hairKnown ?? 'ink'];
  const skin = muted ? '#6b6f78' : SKIN[look.skin];
  const coat = muted ? '#33363d' : COAT[look.coat];
  const build = seen('build');
  const mark = seen('mark');
  const vice = seen('vice');
  const scent = seen('scent');
  const accent = muted ? '#5b6472' : look.accent;

  const sx = build === 'broad' ? 1.22 : build === 'slight' ? 0.86 : 1;
  const lift = build === 'tall' ? -10 : 0;
  const shade = '#000';

  const ageLines = look.age === 2
    ? `<g stroke="#000" stroke-opacity=".28" stroke-width="1.3" fill="none"><path d="M72 118q4 8 10 10M128 118q-4 8-10 10M78 92q-6 2-10 6M122 92q6 2 10 6"/></g>`
    : look.age === 1 ? `<g stroke="#000" stroke-opacity=".16" stroke-width="1.2" fill="none"><path d="M74 118q3 6 8 8M126 118q-3 6-8 8"/></g>` : '';

  const brows = [
    'M76 92q12-6 24 0M100 92q12-6 24 0',            // neutral
    'M76 90q12-2 24 4M100 94q12-6 24-2',             // wry
    'M76 96q12-10 24-4M100 92q12-6 24 4',            // stern
    'M76 88q12 2 24 6M100 94q12-4 24-6',             // worried
  ][look.mood];

  const eyes = `<g>
    <ellipse cx="86" cy="104" rx="7" ry="4.2" fill="#f4efe6"/><ellipse cx="114" cy="104" rx="7" ry="4.2" fill="#f4efe6"/>
    <circle cx="87" cy="104.4" r="3.1" fill="#1a1a1a"/><circle cx="115" cy="104.4" r="3.1" fill="#1a1a1a"/>
    <circle cx="88" cy="103.4" r=".9" fill="#fff"/><circle cx="116" cy="103.4" r=".9" fill="#fff"/>
    <path d="M78 102q8-6 16 0M106 102q8-6 16 0" stroke="#1a1a1a" stroke-width="1.6" fill="none"/>
    <path d="${brows}" stroke="${hairKnown === 'fair' ? '#8a6a3a' : '#1a1a1a'}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>`;

  const nose = `<path d="M100 104v14q-4 5 2 6" stroke="#000" stroke-opacity=".38" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const glasses = look.glasses
    ? `<g fill="none" stroke="#2a2a2a" stroke-width="1.6"><circle cx="86" cy="105" r="10"/><circle cx="114" cy="105" r="10"/><path d="M96 105h8M76 104l-8-4M124 104l8-4"/></g>`
    : '';

  const marks = mark === 'scar'
    ? `<path d="M126 100l6 28" stroke="#8b3a3a" stroke-width="2.2" stroke-linecap="round"/><path d="M124 110l8-2M125 118l8-2" stroke="#8b3a3a" stroke-width="1.2"/>`
    : mark === 'tattoo'
      ? `<path d="M118 152c4 2 6 6 4 10-3 4-9 2-9-2" stroke="#2a4d8a" stroke-width="2" fill="none"/><circle cx="121" cy="150" r="1.6" fill="#2a4d8a"/>`
      : '';

  const props = vice === 'opium'
    ? `<path d="M110 137l30 10" stroke="#3a2a1a" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="141" cy="148" rx="5" ry="3.5" fill="#3a2a1a"/>`
    : scent === 'tobacco'
      ? `<path d="M110 137l16 6" stroke="#f1eadc" stroke-width="3" stroke-linecap="round"/><circle cx="127" cy="143.5" r="1.8" fill="#e0632a"/>`
      : vice === 'cards'
        ? `<g transform="translate(58 176) rotate(-14)"><rect width="14" height="20" rx="1.5" fill="#f2ecdf" stroke="#3a3a3a"/><path d="M3 4h4M3 16h4" stroke="#b3252d" stroke-width="1.6"/></g>`
        : scent === 'perfume'
          ? `<circle cx="70" cy="178" r="6" fill="#b8567a"/><circle cx="70" cy="178" r="2.5" fill="#f2ecdf"/>`
          : vice === 'drink'
            ? `<path d="M132 176l4 20h10l4-20z" fill="#f2ecdf" fill-opacity=".8" stroke="#3a3a3a"/><rect x="137" y="186" width="8" height="8" fill="#b8791f"/>`
            : '';

  const head = `
    <g transform="translate(0 ${lift})">
      <ellipse cx="100" cy="106" rx="42" ry="50" fill="${skin}"/>
      <ellipse cx="100" cy="106" rx="42" ry="50" fill="url(#${uid}-sh)"/>
      <ellipse cx="58" cy="108" rx="7" ry="10" fill="${skin}"/><ellipse cx="142" cy="108" rx="7" ry="10" fill="${skin}"/>
      <path d="M78 148q22 18 44 0" fill="${shade}" fill-opacity=".12"/>
      ${ageLines}${eyes}${nose}${mouthShape(look.mood, look.fem)}${beardShape(look.beard, hairColor)}
      ${hairStyle(look.hair, hairColor, look.fem)}
      ${marks}${glasses}${hatShape(look.hat, coat, look.fem)}
    </g>`;

  const body = `
    <g transform="translate(100 0) scale(${sx} 1) translate(-100 0)">
      <path d="M40 240c0-46 22-70 60-78 38 8 60 32 60 78z" fill="${coat}"/>
      <path d="M100 162c38 8 60 32 60 78h-60z" fill="${shade}" fill-opacity=".18"/>
      <path d="M40 240c0-46 22-70 60-78 38 8 60 32 60 78" fill="url(#${uid}-hatch)"/>
      ${collarShape(look.collar, coat, look.fem)}
    </g>
    <path d="M86 150q14 20 28 0v-14h-28z" fill="${skin}"/>
    <path d="M86 150q14 20 28 0" fill="${shade}" fill-opacity=".22"/>`;

  const vb = frame === 'face' ? '40 30 120 130' : '0 0 200 240';
  const bgR = frame === 'face' ? 'cx="100" cy="95" r="70"' : 'cx="100" cy="120" r="120"';

  return `<svg class="portrait ${opts.cls ?? ''}" viewBox="${vb}" width="${size}" height="${frame === 'face' ? size : Math.round(size * 1.2)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${uid}-bg"><stop offset="0" stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${accent}" stop-opacity=".05"/></radialGradient>
      <linearGradient id="${uid}-sh" x1="0" x2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
      <pattern id="${uid}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v6" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/></pattern>
    </defs>
    <circle ${bgR} fill="url(#${uid}-bg)"/>
    ${body}${head}${props}
  </svg>`;
}

/** Initials for the smallest chips, where a face would be a smudge. */
export function initialsOf(name: string): string {
  return name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
}
