// Line diagrams for the exhibits: what the scene examiner or the coroner
// sketched in the margin. Ink on the paper the document is printed on.

const INK = '#2a2118';
const wrap = (w: number, h: number, body: string) =>
  `<svg class="fig" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const label = (x: number, y: number, t: string, size = 11, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="'Special Elite', monospace" font-size="${size}" fill="${INK}" stroke="none" text-anchor="${anchor}">${t}</text>`;
const dim = (x1: number, y1: number, x2: number, y2: number, t: string) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-dasharray="3 3"/><path d="M${x1 - 4} ${y1}h8M${x2 - 4} ${y2}h8"/>${label((x1 + x2) / 2 + 8, (y1 + y2) / 2 + 4, t)}`;

const strand = (color: string) => wrap(320, 150, `
  <rect x="20" y="20" width="280" height="110" rx="3" stroke-dasharray="4 3"/>
  ${label(30, 40, 'ITEM 1 · MOUNTED', 10)}
  <path d="M60 100c30-40 60-40 90 0s60 40 90 0" stroke="${color}" stroke-width="3.2"/>
  <path d="M60 100c30-40 60-40 90 0s60 40 90 0" stroke="${INK}" stroke-width=".6" stroke-dasharray="1 3"/>
  ${label(220, 120, `colour: ${color === '#151515' ? 'dark' : ''}`, 9)}
`);

const footprint = (inches: string, size: string) => wrap(320, 190, `
  <path d="M110 30c26-10 52 8 50 46-2 20-12 34-8 60 2 18-4 32-20 34-18 2-30-12-32-34-2-22 6-38 2-62-4-26-4-38 8-44z"/>
  <path d="M116 44c10-4 22 0 26 12M104 150c10 6 24 6 32 0" stroke-opacity=".5"/>
  ${dim(70, 30, 70, 170, '')}
  ${label(24, 100, inches, 11, 'start')}
  <rect x="190" y="40" width="112" height="110" rx="3" stroke-dasharray="3 3"/>
  ${label(200, 58, 'HEEL TO TOE / SIZE', 9)}
  ${label(200, 78, '10½ in ....... 8', 10)}
  ${label(200, 96, '11¼ in ....... 10', 10)}
  ${label(200, 114, '12  in ....... 12', 10)}
  ${label(200, 138, `cast: ${size}`, 9)}
`);

export const FIGURES: Record<string, string> = {
  sill: wrap(320, 170, `
    <rect x="60" y="30" width="180" height="120"/>
    <rect x="70" y="40" width="160" height="42" fill="${INK}" fill-opacity=".08"/>
    <path d="M70 82h160M60 96h180" stroke-width="2.4"/>
    <path d="M78 88l6-3M96 88l6-3M114 88l6-3" stroke-opacity=".6"/>
    ${dim(262, 82, 262, 96, '')}
    ${label(272, 92, '9¼ in', 11)}
    ${label(60, 166, 'sash, jammed on cord — thread of dark wool at catch', 9)}
  `),
  doorframe: wrap(320, 170, `
    <path d="M90 20v140M230 20v140M90 20h140" stroke-width="3"/>
    <rect x="100" y="24" width="122" height="136" fill="${INK}" fill-opacity=".05"/>
    <path d="M226 74l-4 6 5 4-6 6 4 5" stroke="#8b2f2f" stroke-width="2.2"/>
    ${dim(258, 160, 258, 84, '')}
    ${label(266, 124, '58 in', 11)}
    ${label(60, 166, 'split runs outward — strike side', 9)}
  `),
  spatter: wrap(320, 190, `
    <rect x="30" y="20" width="200" height="150" stroke-dasharray="4 3"/>
    <path d="M132 44q40 20 66 84" stroke-width="2"/>
    ${[[136, 48], [150, 56], [164, 70], [178, 90], [190, 112], [198, 130]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${2 + i}" ry="${1.2 + i * .6}" fill="${INK}" fill-opacity=".6" stroke="none"/>`).join('')}
    <path d="M74 170v-84M62 86h24M74 86c0-8 4-12 4-12" stroke-opacity=".5"/>
    ${label(40, 80, '5 ft 4', 9)}
    ${dim(250, 170, 250, 44, '')}
    ${label(258, 110, '74 in', 11)}
    ${label(30, 186, 'origin of arc, north wall', 9)}
  `),
  'hair-dark': strand('#151515'),
  'hair-fair': strand('#c9a45c'),
  'hair-red': strand('#a8482a'),
  'hair-grey': strand('#8d8a84'),
  'wound-left': wrap(320, 190, `
    <ellipse cx="160" cy="90" rx="56" ry="66"/>
    <path d="M160 24v10M104 90h10M206 90h10" stroke-opacity=".5"/>
    ${label(160, 16, 'front', 9, 'middle')}
    ${label(160, 176, 'back', 9, 'middle')}
    ${label(222, 94, 'R', 10)}
    ${label(92, 94, 'L', 10)}
    <path d="M212 76l-52 34" stroke="#8b2f2f" stroke-width="3"/>
    <path d="M160 110l8-2-4-6z" fill="#8b2f2f" stroke="none"/>
    <circle cx="212" cy="76" r="5" fill="#8b2f2f" stroke="none"/>
    ${label(230, 70, 'entry, R temple', 9)}
    <circle cx="160" cy="6" r="0"/>
    <path d="M150 190" />
    <g transform="translate(160 12)"><circle r="4" fill="${INK}" stroke="none"/></g>
    ${label(172, 10, 'assailant, facing', 9)}
  `),
  glove: wrap(320, 170, `
    <path d="M110 150v-60c0-30 20-34 30-30v-30c0-8 12-8 12 0v34h8v-42c0-8 12-8 12 0v42h8v-36c0-8 12-8 12 0v40h8v-22c0-8 12-8 12 0v44c0 34-20 60-52 60z"/>
    ${[[150, 60], [154, 70], [146, 74], [160, 80], [138, 84], [166, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${INK}" stroke="none"/>`).join('')}
    ${label(210, 70, 'powder residue,', 9)}${label(210, 84, 'index and web', 9)}
    ${label(110, 164, 'RIGHT HAND — no companion found', 9)}
  `),
  tattoo: wrap(320, 150, `
    <path d="M40 60h120v50H40z" stroke-opacity=".6"/>
    <path d="M160 60c40-6 80 10 100 30-20 20-60 30-100 20z"/>
    <path d="M200 84c8-8 22-8 26 0s-4 18-14 12-6-16 4-20" stroke="#2a4d8a" stroke-width="2.4"/>
    ${label(40, 130, 'cuff rode up — blue ink, a curl to it', 9)}
  `),
  'four-fingers': wrap(320, 190, `
    <path d="M110 170v-60c0-30 20-40 30-36v-40c0-8 12-8 12 0v40h8v-52c0-8 12-8 12 0v52h8v-44c0-8 12-8 12 0v48c0 40-20 66-52 66z" stroke-dasharray="2 2"/>
    <path d="M182 80h8v-22c0-8 12-8 12 0v26" stroke="#8b2f2f" stroke-dasharray="4 3"/>
    ${label(210, 60, 'clean', 10)}
    ${label(110, 184, 'palm and four fingers, in dust', 9)}
  `),
  marker: wrap(320, 150, `
    <g transform="rotate(-6 160 75)"><rect x="70" y="40" width="180" height="70" fill="#f2ead8"/>
    <path d="M70 75h180" stroke-opacity=".3"/>
    ${label(84, 66, 'I.O.U.  $40', 16)}${label(84, 96, 'Wed. — Rosie’s', 12)}</g>
    <path d="M120 40l40 70" stroke-opacity=".25"/>
  `),
  glasses: wrap(320, 160, `
    <path d="M60 50l8 80h44l8-80z"/><path d="M62 60h56" stroke="#8b2f3d" stroke-width="3"/>
    <path d="M190 50l8 80h44l8-80z"/><path d="M198 100h40" stroke="#b8791f" stroke-width="4"/>
    <ellipse cx="222" cy="70" rx="8" ry="10" stroke-opacity=".6"/>
    ${label(50, 148, 'hers: lipstick', 9)}${label(190, 148, 'the second: rye, thumbprint', 9)}
  `),
  pipe: wrap(320, 150, `
    <path d="M40 90c60-10 120-20 200-40" stroke-width="5"/><ellipse cx="240" cy="50" rx="14" ry="9" fill="${INK}" stroke="none"/>
    <path d="M60 120h30v-14l-15-12-15 12z"/><path d="M75 94v-10" stroke-opacity=".5"/>
    ${label(120, 130, 'lamp soot at sill', 9)}
  `),
  thumbprint: wrap(320, 150, `
    <rect x="60" y="30" width="200" height="90" rx="6"/>
    ${[26, 22, 18, 14, 10, 6].map((r) => `<ellipse cx="160" cy="75" rx="${r}" ry="${r * 1.3}" stroke-opacity=".8"/>`).join('')}
    <path d="M150 62c6 4 10 10 10 18" stroke-opacity=".8"/>
    ${label(60, 138, 'brass push-plate — machine oil', 9)}
  `),
  'footprint-small': footprint('10½ in', 'no. 1'),
  'footprint-mid': footprint('11¼ in', 'no. 1'),
  'footprint-large': footprint('12 in', 'no. 1'),
};

export const figure = (id: string | undefined): string => (id && FIGURES[id]) || '';
