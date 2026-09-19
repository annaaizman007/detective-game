// Buildings.
//
// Every location on the map is a drawn facade, at night, in the rain: a dark
// body, a grid of windows with some lit, a door with light spilling out, and
// whatever says what the place is -- a neon sign, a steeple, a crane, a
// marquee. Parametric, so thirty cities' worth come from one file, and the
// seed keeps each building looking like itself.

import { hash32 } from '../utils/math-utils';
import type { LocationType } from '../types/game-types';

const INK = '#1a1410';
const WALL: [string, string][] = [
  ['#4a3c31', '#2b221b'], ['#5b4a3a', '#33281f'], ['#3e3a3c', '#221f21'], ['#6b5340', '#3d2e22'],
  ['#4f4a42', '#2c2925'], ['#5c4436', '#33251d'], ['#3b3f47', '#20232a'],
];
const LIT = '#f0c46a';
const LIT2 = '#d99a3a';
const NEON: Record<string, string> = { bar: '#ff5f6d', club: '#4fd0c4', hotel: '#ffb347', theatre: '#ff8c69', cafe: '#ffd166', shop: '#7bdff2', pharmacy: '#7bdff2', florist: '#f28bb5' };

interface Rng { f: () => number; i: (n: number) => number; b: (p?: number) => boolean }
const rngOf = (seed: string): Rng => {
  let h = hash32(seed);
  const f = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0; return (h >>> 8) / 16777216; };
  return { f, i: (n) => Math.floor(f() * n), b: (p = 0.5) => f() < p };
};

const W = 200; const H = 170; const GROUND = 150;

function windows(r: Rng, x: number, y: number, w: number, h: number, cols: number, rows: number, litP = 0.45, arch = false): string {
  const cw = w / cols; const ch = h / rows;
  let out = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = x + i * cw + cw * 0.22; const wy = y + j * ch + ch * 0.18; const ww = cw * 0.56; const wh = ch * 0.62;
    const lit = r.b(litP);
    const fill = lit ? (r.b(0.3) ? LIT2 : LIT) : '#151a24';
    out += arch
      ? `<path d="M${wx} ${wy + wh}v-${wh * 0.6}a${ww / 2} ${ww / 2} 0 0 1 ${ww} 0v${wh * 0.6}z" fill="${fill}"/>`
      : `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${fill}"/>`;
    if (lit) out += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${LIT}" opacity=".35" filter="url(#bl)"/>`;
    out += `<path d="M${wx + ww / 2} ${wy}v${wh}M${wx} ${wy + wh / 2}h${ww}" stroke="${INK}" stroke-opacity=".6" stroke-width="1"/>`;
  }
  return out;
}

const door = (x: number, y: number, w = 16, h = 26, lit = true) =>
  `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${lit ? LIT2 : '#0e0c0b'}"/>${lit ? `<path d="M${x - 8} ${y + 8}l${w + 16} 0-${w / 2 + 6} -${h - 2}h-${w - 4}z" fill="${LIT}" opacity=".18" filter="url(#bl)"/>` : ''}`;

const sign = (text: string, x: number, y: number, w: number, neon?: string, vertical = false) => {
  const color = neon ?? '#e8dcc0';
  const glow = neon ? `<text x="${x}" y="${y}" font-family="'Oswald', Arial Narrow, sans-serif" font-size="15" font-weight="600" letter-spacing="2" fill="${neon}" text-anchor="middle" opacity=".7" filter="url(#glow)" ${vertical ? `transform="rotate(-90 ${x} ${y})"` : ''}>${text}</text>` : '';
  return `<rect x="${x - w / 2}" y="${y - 13}" width="${w}" height="18" fill="#0d0b0a" stroke="${INK}" ${vertical ? `transform="rotate(-90 ${x} ${y})"` : ''}/>${glow}<text x="${x}" y="${y}" font-family="'Oswald', Arial Narrow, sans-serif" font-size="13" font-weight="600" letter-spacing="2" fill="${color}" text-anchor="middle" ${vertical ? `transform="rotate(-90 ${x} ${y})"` : ''}>${text}</text>`;
};

const awning = (x: number, y: number, w: number, color = '#8b2f3d') =>
  `<path d="M${x} ${y}h${w}l6 12H${x - 6}z" fill="${color}"/>${Array.from({ length: Math.floor(w / 14) }, (_, i) => `<path d="M${x + i * 14 + 7} ${y}l3 12" stroke="#f2ecdf" stroke-opacity=".6" stroke-width="3"/>`).join('')}`;

const lamp = (x: number, y: number) =>
  `<path d="M${x} ${y}v-46" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y - 50}" r="5" fill="${LIT}"/><circle cx="${x}" cy="${y - 50}" r="14" fill="${LIT}" opacity=".18" filter="url(#bl)"/>`;

const columns = (x: number, y: number, w: number, h: number, n: number) =>
  Array.from({ length: n }, (_, i) => { const cx = x + (w / (n - 1)) * i; return `<rect x="${cx - 4}" y="${y - h}" width="8" height="${h}" fill="#7d6e5a"/><rect x="${cx - 6}" y="${y - h - 4}" width="12" height="4" fill="#9c8c76"/>`; }).join('');

const chimney = (x: number, y: number) =>
  `<rect x="${x}" y="${y - 30}" width="10" height="30" fill="#2b221b"/><path d="M${x + 5} ${y - 34}c-6-10 4-16 0-26s8-12 2-22" stroke="#d8d2c4" stroke-opacity=".3" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#bl)"/>`;

const fireEscape = (x: number, y: number, floors: number) =>
  Array.from({ length: floors }, (_, i) => { const fy = y - 24 - i * 24; return `<path d="M${x} ${fy}h34M${x} ${fy}v-8M${x + 34} ${fy}v-8M${x + 34} ${fy}l-34-16" stroke="#2a2a30" stroke-width="2" fill="none"/>`; }).join('');

const crane = (x: number, y: number) =>
  `<path d="M${x} ${y}v-90h60M${x} ${y - 60}l40-30M${x + 60} ${y - 90}v18" stroke="#2a2a30" stroke-width="4" fill="none"/><path d="M${x + 52} ${y - 72}v40" stroke="#2a2a30" stroke-width="1.5"/><rect x="${x + 44}" y="${y - 34}" width="16" height="12" fill="#5b4a3a"/>`;

export function buildingSvg(type: LocationType, seed: string, opts: { size?: number; cls?: string } = {}): string {
  const r = rngOf(seed);
  const [wall, wall2] = WALL[r.i(WALL.length)];
  let body = '';
  const neon = NEON[type];

  const block = (x: number, w: number, h: number, cols: number, rows: number, litP = 0.45, arch = false) =>
    `<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}" fill="${wall}"/>` +
    `<rect x="${x + w * 0.55}" y="${GROUND - h}" width="${w * 0.45}" height="${h}" fill="${wall2}" opacity=".9"/>` +
    `<rect x="${x - 3}" y="${GROUND - h - 6}" width="${w + 6}" height="7" fill="${wall2}"/>` +
    windows(r, x + 6, GROUND - h + 10, w - 12, h - 44, cols, rows, litP, arch);

  switch (type) {
    case 'hotel': case 'office':
      body = block(60, 80, 130, 4, 5, 0.5) + block(20, 44, 78, 2, 3) + block(136, 44, 92, 2, 3)
        + door(92, GROUND, 16, 24) + (type === 'hotel' ? sign('HOTEL', 52, 60, 62, neon, true) + awning(76, GROUND - 30, 48, '#3d2e22') : sign('OFFICE', 100, 34, 56)) + lamp(30, GROUND) + lamp(170, GROUND);
      break;
    case 'police': case 'station':
      body = block(40, 120, 76, 5, 2, 0.6) + `<rect x="34" y="${GROUND - 82}" width="132" height="8" fill="#6b5f52"/>` + door(92, GROUND, 18, 28)
        + `<path d="M84 ${GROUND}h34l4 6H80z" fill="#6b5f52"/>` + lamp(56, GROUND) + lamp(144, GROUND) + sign(type === 'police' ? 'POLICE' : 'STATION', 100, GROUND - 90, 70, '#7bdff2');
      break;
    case 'bar': case 'club':
      body = block(46, 108, 96, 3, 2, 0.35) + door(80, GROUND, 18, 26) + `<rect x="106" y="${GROUND - 36}" width="30" height="20" fill="#2a1a1a"/>`
        + sign(type === 'bar' ? 'BAR' : 'CLUB', 100, GROUND - 60, 56, neon) + (type === 'club' ? `<path d="M46 ${GROUND - 44}h108l4 10H42z" fill="#0d0b0a"/>` : '') + lamp(36, GROUND);
      break;
    case 'shop': case 'florist': case 'market':
      body = block(40, 120, 84, 4, 1, 0.3) + `<rect x="46" y="${GROUND - 40}" width="66" height="34" fill="${LIT}" opacity=".85"/>`
        + `<rect x="46" y="${GROUND - 40}" width="66" height="34" fill="${LIT}" opacity=".3" filter="url(#bl)"/>` + door(122, GROUND, 18, 34)
        + awning(42, GROUND - 46, 116, type === 'florist' ? '#b8567a' : type === 'market' ? '#3d5a3d' : '#8b2f3d')
        + (type === 'florist' ? `<circle cx="60" cy="${GROUND - 22}" r="5" fill="#f28bb5"/><circle cx="76" cy="${GROUND - 26}" r="5" fill="#f2ecdf"/><circle cx="92" cy="${GROUND - 20}" r="5" fill="#c95d4f"/>` : '')
        + sign(type === 'florist' ? 'FLOWERS' : type === 'market' ? 'MARKET' : 'SHOP', 100, GROUND - 62, 70, neon);
      if (type === 'market') body += `<path d="M20 ${GROUND}h30v-18H20zM150 ${GROUND}h30v-18h-30z" fill="#5b4a3a"/><path d="M18 ${GROUND - 18}h34l-3-10H21zM148 ${GROUND - 18}h34l-3-10h-28z" fill="#8b2f3d"/>`;
      break;
    case 'docks': case 'pier':
      body = `<rect x="0" y="${GROUND - 6}" width="200" height="30" fill="#6f8c8a"/><path d="M0 ${GROUND + 6}q20-6 40 0t40 0 40 0 40 0 40 0" stroke="#b9c7c4" stroke-opacity=".5" stroke-width="2" fill="none"/>`
        + `<rect x="10" y="${GROUND - 14}" width="150" height="10" fill="#4a3c31"/>` + Array.from({ length: 7 }, (_, i) => `<rect x="${18 + i * 22}" y="${GROUND - 4}" width="4" height="16" fill="#2b221b"/>`).join('')
        + (type === 'docks' ? crane(120, GROUND - 14) + block(20, 60, 50, 2, 1, 0.5) : `<rect x="20" y="${GROUND - 44}" width="50" height="30" fill="${wall}"/>` + windows(r, 24, GROUND - 40, 42, 20, 2, 1, 0.6) + lamp(140, GROUND - 14))
        + `<circle cx="14" cy="${GROUND - 16}" r="4" fill="#2a2a30"/>`;
      break;
    case 'factory': case 'warehouse':
      body = `<rect x="30" y="${GROUND - 70}" width="140" height="70" fill="${wall}"/><rect x="100" y="${GROUND - 70}" width="70" height="70" fill="${wall2}"/>`
        + (type === 'factory' ? `<path d="M30 ${GROUND - 70}l24-22v22zM76 ${GROUND - 70}l24-22v22zM122 ${GROUND - 70}l24-22v22z" fill="${wall2}"/><path d="M54 ${GROUND - 92}v22M100 ${GROUND - 92}v22M146 ${GROUND - 92}v22" stroke="${LIT}" stroke-opacity=".5" stroke-width="3"/>` + chimney(150, GROUND - 70) : `<rect x="30" y="${GROUND - 78}" width="140" height="8" fill="${wall2}"/>`)
        + windows(r, 36, GROUND - 60, 80, 24, 4, 1, 0.25) + `<rect x="126" y="${GROUND - 40}" width="34" height="40" fill="#0e0c0b"/><path d="M126 ${GROUND - 40}h34M126 ${GROUND - 28}h34M126 ${GROUND - 16}h34" stroke="#3a3a3a"/>`
        + sign(type === 'factory' ? 'CANNERY' : 'BONDED', 76, GROUND - 76, 66) + lamp(20, GROUND);
      break;
    case 'church': case 'cemetery':
      body = type === 'church'
        ? `<rect x="60" y="${GROUND - 80}" width="80" height="80" fill="${wall}"/><path d="M52 ${GROUND - 80}l48-26 48 26z" fill="${wall2}"/>`
          + `<rect x="120" y="${GROUND - 140}" width="26" height="140" fill="${wall2}"/><path d="M118 ${GROUND - 140}l15-30 15 30z" fill="#2b221b"/><path d="M133 ${GROUND - 176}v10M128 ${GROUND - 170}h10" stroke="#d8d2c4" stroke-width="2"/>`
          + `<circle cx="90" cy="${GROUND - 56}" r="10" fill="${LIT2}"/><circle cx="90" cy="${GROUND - 56}" r="16" fill="${LIT}" opacity=".2" filter="url(#bl)"/>` + windows(r, 124, GROUND - 120, 18, 60, 1, 3, 0.4, true)
          + `<path d="M80 ${GROUND}v-22a10 10 0 0 1 20 0v22z" fill="${LIT2}"/>`
        : `<path d="M20 ${GROUND}h160" stroke="#2a2a30" stroke-width="3"/><path d="M70 ${GROUND}v-50a30 30 0 0 1 60 0v50" fill="none" stroke="#4a3c31" stroke-width="8"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${24 + i * 20} ${GROUND}v-24" stroke="#2a2a30" stroke-width="2"/>`).join('')
          + `<rect x="40" y="${GROUND - 14}" width="10" height="14" fill="#8a8a80"/><rect x="150" y="${GROUND - 18}" width="12" height="18" fill="#8a8a80"/><path d="M100 ${GROUND - 60}v-14M94 ${GROUND - 68}h12" stroke="#8a8a80" stroke-width="3"/>` + lamp(30, GROUND);
      break;
    case 'hospital': case 'morgue':
      body = block(30, 140, 70, 6, 2, 0.55) + door(92, GROUND, 18, 26) + (type === 'hospital'
        ? `<rect x="88" y="${GROUND - 100}" width="24" height="24" fill="#f2ecdf"/><path d="M100 ${GROUND - 96}v16M92 ${GROUND - 88}h16" stroke="#b3252d" stroke-width="5"/>`
        : sign('MORGUE', 100, GROUND - 80, 70)) + lamp(24, GROUND) + lamp(176, GROUND);
      break;
    case 'press': case 'radio':
      body = block(40, 120, 100, 4, 3, 0.7) + door(92, GROUND, 18, 26) + (type === 'press' ? sign('HERALD', 100, GROUND - 108, 78, '#e8dcc0') + `<rect x="46" y="${GROUND - 20}" width="30" height="20" fill="#0e0c0b"/>` : `<path d="M100 ${GROUND - 100}v-60M92 ${GROUND - 150}h16M94 ${GROUND - 140}h12M96 ${GROUND - 130}h8" stroke="#3a3a3a" stroke-width="2"/><circle cx="100" cy="${GROUND - 162}" r="3" fill="#ff5f6d"/><circle cx="100" cy="${GROUND - 162}" r="9" fill="#ff5f6d" opacity=".3" filter="url(#bl)"/>` + sign('RADIO', 100, GROUND - 108, 60));
      break;
    case 'home':
      body = block(50, 100, 118, 3, 4, 0.4) + door(70, GROUND, 14, 22) + fireEscape(118, GROUND, 4) + `<path d="M46 ${GROUND - 124}h108" stroke="${wall2}" stroke-width="4"/>` + lamp(34, GROUND);
      break;
    case 'manor': case 'school': case 'library': case 'bank':
      body = block(30, 140, 74, 5, 2, 0.35) + `<path d="M22 ${GROUND - 74}l78-28 78 28z" fill="${wall2}"/>` + columns(56, GROUND, 88, 44, type === 'manor' ? 3 : 5)
        + `<rect x="40" y="${GROUND - 4}" width="120" height="4" fill="#6b5f52"/>` + door(92, GROUND, 16, 30, type !== 'bank')
        + (type === 'bank' ? sign('TRUST', 100, GROUND - 82, 60) : type === 'library' ? sign('LIBRARY', 100, GROUND - 82, 70) : type === 'school' ? sign('ACADEMY', 100, GROUND - 82, 74) : `<path d="M40 ${GROUND}h-30M160 ${GROUND}h30" stroke="#2a2a30" stroke-width="3"/>` + lamp(16, GROUND) + lamp(184, GROUND));
      break;
    case 'light': case 'tower':
      body = `<path d="M84 ${GROUND}l6-120h20l6 120z" fill="${wall}"/><path d="M100 ${GROUND}l6-120h10l6 120z" fill="${wall2}"/><path d="M80 ${GROUND - 46}h40M82 ${GROUND - 80}h36" stroke="#e8dcc0" stroke-width="5"/>`
        + `<rect x="86" y="${GROUND - 136}" width="28" height="16" fill="#2a2a30"/><rect x="90" y="${GROUND - 134}" width="20" height="12" fill="${LIT}"/><path d="M100 ${GROUND - 128}l-90-40v80zM100 ${GROUND - 128}l90-40v80z" fill="${LIT}" opacity=".12"/>`
        + (type === 'light' ? `<rect x="0" y="${GROUND - 4}" width="200" height="30" fill="#6f8c8a"/>` : '') + `<rect x="60" y="${GROUND - 30}" width="40" height="30" fill="${wall}"/>` + windows(r, 64, GROUND - 26, 32, 18, 2, 1, 0.6);
      break;
    case 'tram': case 'bridge':
      body = type === 'tram'
        ? `<path d="M20 ${GROUND - 40}h160v6H20z" fill="${wall2}"/><path d="M30 ${GROUND - 34}v34M170 ${GROUND - 34}v34M100 ${GROUND - 34}v34" stroke="#2a2a30" stroke-width="4"/><path d="M0 ${GROUND + 4}h200M0 ${GROUND + 12}h200" stroke="#2a2a30" stroke-width="2"/>`
          + `<rect x="46" y="${GROUND - 30}" width="80" height="30" fill="#3d2e22"/><rect x="46" y="${GROUND - 30}" width="80" height="16" fill="${LIT}" opacity=".9"/>` + windows(r, 48, GROUND - 28, 76, 12, 4, 1, 0.9) + sign('TRAMS', 100, GROUND - 48, 60, '#ffd166') + lamp(14, GROUND)
        : `<rect x="0" y="${GROUND - 6}" width="200" height="30" fill="#6f8c8a"/><path d="M0 ${GROUND - 20}h200" stroke="#4a3c31" stroke-width="12"/><path d="M0 ${GROUND - 26}q100-90 200 0" stroke="#2a2a30" stroke-width="5" fill="none"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${20 + i * 20} ${GROUND - 26}v-14" stroke="#2a2a30" stroke-width="2"/>`).join('') + lamp(40, GROUND - 26) + lamp(160, GROUND - 26);
      break;
    case 'bathhouse':
      body = block(40, 120, 60, 4, 1, 0.5) + `<path d="M60 ${GROUND - 60}a40 40 0 0 1 80 0z" fill="${wall2}"/><circle cx="100" cy="${GROUND - 100}" r="5" fill="#e8dcc0"/>` + door(92, GROUND, 18, 30) + `<path d="M70 ${GROUND - 24}c4-10-2-16 2-26M130 ${GROUND - 24}c4-10-2-16 2-26" stroke="#d8d2c4" stroke-opacity=".35" stroke-width="5" fill="none" filter="url(#bl)"/>` + sign('BATHS', 100, GROUND - 70, 60);
      break;
    case 'theatre':
      body = block(30, 140, 110, 4, 2, 0.3) + `<rect x="24" y="${GROUND - 54}" width="152" height="18" fill="#1a1010"/>` + Array.from({ length: 12 }, (_, i) => `<circle cx="${32 + i * 13}" cy="${GROUND - 54}" r="2.6" fill="${LIT}"/><circle cx="${32 + i * 13}" cy="${GROUND - 36}" r="2.6" fill="${LIT}"/>`).join('')
        + sign('LYCEUM', 100, GROUND - 40, 90, '#ff8c69') + door(66, GROUND, 18, 30) + door(116, GROUND, 18, 30) + `<rect x="24" y="${GROUND - 54}" width="152" height="18" fill="${LIT}" opacity=".18" filter="url(#bl)"/>`;
      break;
    case 'cafe':
      body = block(46, 108, 70, 3, 1, 0.5) + `<rect x="52" y="${GROUND - 36}" width="60" height="30" fill="${LIT}" opacity=".8"/>` + door(122, GROUND, 18, 30) + awning(44, GROUND - 42, 112, '#3d5a3d') + sign('CAFÉ', 100, GROUND - 58, 50, '#ffd166')
        + `<circle cx="30" cy="${GROUND - 12}" r="9" fill="#2a2a30"/><path d="M30 ${GROUND - 12}v12" stroke="#2a2a30" stroke-width="3"/><circle cx="170" cy="${GROUND - 12}" r="9" fill="#2a2a30"/><path d="M170 ${GROUND - 12}v12" stroke="#2a2a30" stroke-width="3"/>`;
      break;
    case 'park':
      body = `<path d="M10 ${GROUND}h180" stroke="#3d5a3d" stroke-width="6"/>` + [40, 80, 150].map((x) => `<path d="M${x} ${GROUND}v-30" stroke="#2b221b" stroke-width="4"/><circle cx="${x}" cy="${GROUND - 44}" r="22" fill="#2f4a2f"/><circle cx="${x - 8}" cy="${GROUND - 52}" r="12" fill="#3d5a3d"/>`).join('')
        + `<path d="M96 ${GROUND}h30v-26h-30zM90 ${GROUND - 26}h42l-6-10H96z" fill="#4a3c31"/><path d="M100 ${GROUND - 26}v-10M122 ${GROUND - 26}v-10" stroke="#2a2a30" stroke-width="2"/>` + lamp(120, GROUND) + `<path d="M0 ${GROUND - 2}h200" stroke="#2a2a30" stroke-width="2" stroke-dasharray="6 10"/>`;
      break;
    case 'garage':
      body = block(30, 140, 60, 4, 1, 0.3) + `<rect x="50" y="${GROUND - 44}" width="60" height="44" fill="#0e0c0b"/><path d="M50 ${GROUND - 44}h60M50 ${GROUND - 30}h60M50 ${GROUND - 16}h60" stroke="#3a3a3a"/>`
        + `<rect x="150" y="${GROUND - 30}" width="14" height="30" fill="#8b2f3d"/><rect x="152" y="${GROUND - 26}" width="10" height="8" fill="#f2ecdf"/>` + sign('GARAGE', 100, GROUND - 66, 70, '#7bdff2') + lamp(20, GROUND);
      break;
    default:
      body = block(50, 100, 80, 3, 2) + door(92, GROUND, 16, 26) + lamp(30, GROUND);
  }

  const u = `b${hash32(seed).toString(36)}`;
  return `<svg class="building ${opts.cls ?? ''}" viewBox="0 0 ${W} ${H}" width="${opts.size ?? W}" height="${Math.round((opts.size ?? W) * H / W)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="bl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
      <linearGradient id="${u}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0e15"/><stop offset="1" stop-color="#1b1a24"/></linearGradient>
      <linearGradient id="${u}-wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#101014"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${u}-sky)"/>
    <ellipse cx="100" cy="${GROUND}" rx="120" ry="30" fill="${LIT}" opacity=".07" filter="url(#bl)"/>
    <rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#${u}-wet)"/>
    ${body}
    <rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="${LIT}" opacity=".08"/>
    ${Array.from({ length: 26 }, () => `<path d="M${r.i(W)} ${r.i(H)}l-2 9" stroke="#adc4d6" stroke-opacity=".35" stroke-width="1"/>`).join('')}
  </svg>`;
}

// ------------------------------------------------------------ painted

/** Painted facades from tools/render-portraits.py --dir buildings. */
export const PAINTED_BUILDINGS = new Set<string>();
export const BUILDINGS_BASE = 'assets/images/buildings/';

export async function loadPaintedBuildings(): Promise<Set<string>> {
  try {
    const res = await fetch(`${BUILDINGS_BASE}manifest.json`, { cache: 'no-cache' });
    if (res.ok) {
      const j = (await res.json()) as { ids?: string[] };
      for (const id of j.ids ?? []) PAINTED_BUILDINGS.add(id);
    }
  } catch { /* draw them */ }
  return PAINTED_BUILDINGS;
}

export const buildingKey = (caseId: string, locId: string): string => `${caseId}-${locId}`;
export const isPaintedBuilding = (caseId: string, locId: string): boolean => PAINTED_BUILDINGS.has(buildingKey(caseId, locId));
export const paintedBuildingUrl = (caseId: string, locId: string): string => `${BUILDINGS_BASE}${buildingKey(caseId, locId)}.jpg`;

/** The picture of a place: the painting if there is one, the drawing otherwise. */
export function buildingHtml(caseId: string, loc: { id: string; type: LocationType }, size = 200): string {
  if (isPaintedBuilding(caseId, loc.id)) {
    return `<img class="building building--painted" src="${paintedBuildingUrl(caseId, loc.id)}" width="${size}" height="${Math.round(size * 0.7)}" alt="" draggable="false">`;
  }
  return buildingSvg(loc.type, `${caseId}:${loc.id}`, { size });
}
