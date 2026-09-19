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

// ---- objects: the things you carry, sketched on an evidence tag.
const tag = (body: string, caption: string) => wrap(320, 190, `
  <path d="M40 40h200l30 55-30 55H40z" fill="#efe6d2" stroke="${INK}" stroke-width="1.4"/><circle cx="258" cy="95" r="5"/>
  <path d="M263 95q30-20 40 10" stroke-width="1.2" fill="none"/>
  ${body}${label(60, 140, caption, 9)}`);

export const OBJECTS: Record<string, string> = {
  key: tag(`<circle cx="90" cy="88" r="16"/><circle cx="90" cy="88" r="6"/><path d="M104 88h70M160 88v12M172 88v10M148 88v8" stroke-width="5" stroke-linecap="round"/>`, 'brass, stamped'),
  glove: tag(`<path d="M80 122v-30c0-14 10-16 16-14v-16c0-5 8-5 8 0v18h5v-22c0-5 8-5 8 0v22h5v-18c0-5 8-5 8 0v20h5v-10c0-5 8-5 8 0v26c0 18-12 30-30 30z" fill="#2b221b" fill-opacity=".15"/>`, 'leather, right hand'),
  matchbook: tag(`<rect x="70" y="60" width="60" height="70" rx="3" fill="#8b2f3d" fill-opacity=".8"/><rect x="70" y="112" width="60" height="18" fill="${INK}" fill-opacity=".8"/><path d="M80 90h40M80 100h28" stroke="#f2ecdf" stroke-width="2"/>${label(150, 100, 'ROSIE’S', 12)}`, 'half the matches gone'),
  ring: tag(`<ellipse cx="100" cy="95" rx="30" ry="24" stroke-width="7"/><path d="M92 68l8-10 8 10z" fill="#b8791f"/><path d="M100 58l-3 6h6z" fill="#f2ecdf"/>`, 'gold, setting bent'),
  stub: tag(`<path d="M60 70h120l-4 10 4 10-4 10 4 10-4 10 4 10-4 10 4 10H60z" fill="#efe4c8" stroke-dasharray="3 2"/>${label(70, 92, 'ADMIT ONE', 11)}${label(70, 112, 'BOX C', 10)}${label(70, 128, 'NOV 3 — EVE.', 8)}`, 'never torn'),
  photo: tag(`<rect x="60" y="56" width="110" height="80" fill="#1a1a1a" stroke="#f2ecdf" stroke-width="5"/><ellipse cx="115" cy="96" rx="22" ry="26" fill="#3a3a3a"/><ellipse cx="115" cy="86" rx="9" ry="10" fill="#6a6a6a"/>`, 'a face, half in shadow'),
  cufflink: tag(`<circle cx="90" cy="90" r="14" fill="#b8791f" fill-opacity=".8"/><circle cx="130" cy="90" r="14" fill="#b8791f" fill-opacity=".8"/>${label(90, 94, 'R', 12, 'middle')}${label(130, 94, 'V', 12, 'middle')}`, 'engraved, one of a pair'),
  locket: tag(`<circle cx="100" cy="98" r="22" fill="#b8791f" fill-opacity=".5"/><path d="M100 76v-10M92 62a8 8 0 0 1 16 0" stroke-width="2"/><path d="M100 78v40M86 98h28" stroke="#f2ecdf" stroke-width="1"/>`, 'a lock of hair inside'),
  rosary: tag(`<path d="M70 70q40-20 80 0t60 30" stroke-dasharray="1 7" stroke-width="7" stroke-linecap="round"/><path d="M170 100v30M160 118h20" stroke-width="4"/>`, 'beads wet, cross bent'),
  knife: tag(`<path d="M60 96h90l30-6-30-6H60z" fill="#d8d2c4" stroke-width="1.5"/><rect x="40" y="82" width="30" height="28" rx="4" fill="#e9dfc8"/><path d="M45 88h20M45 96h20M45 104h20" stroke-width="1"/>`, 'rigging knife, bone handle'),
  watch: tag(`<circle cx="100" cy="96" r="30" fill="#f2ecdf"/><circle cx="100" cy="96" r="26"/><path d="M100 96v-18M100 96l12 8" stroke-width="2.5"/><rect x="96" y="58" width="8" height="8"/>`, 'stopped at 1:52'),
  lighter: tag(`<rect x="80" y="60" width="40" height="70" rx="4" fill="#b8791f" fill-opacity=".6"/><rect x="80" y="60" width="40" height="18" rx="4" fill="#b8791f" fill-opacity=".9"/><path d="M100 60c-6-10 4-14 0-22 6 8 10 14 0 22z" fill="#e0632a"/>${label(84, 118, 'E.S.', 9)}`, 'initials on the base'),
  flask: tag(`<path d="M84 128v-44c0-8 6-12 10-12h12c4 0 10 4 10 12v44z" fill="#8a8a80" fill-opacity=".5"/><rect x="94" y="60" width="12" height="12" rx="2"/>${label(88, 108, 'RYE', 9)}`, 'half full, dented'),
  scarf: tag(`<path d="M70 70c30 10 60-10 90 0s40 30 20 50-50 0-70 10-40-10-40-60z" fill="#8b2f3d" fill-opacity=".7"/>`, 'silk, orchid scent'),
  card: tag(`<rect x="70" y="66" width="80" height="50" rx="3" fill="#f2ecdf"/>${label(80, 84, 'MARROW HOUSE', 8)}${label(80, 100, 'VISITOR — B. AYRE', 8)}`, 'a visitor’s pass'),
  button: tag(`<circle cx="100" cy="96" r="22" fill="#3d2e22"/><circle cx="92" cy="90" r="2.5" fill="#f2ecdf"/><circle cx="108" cy="90" r="2.5" fill="#f2ecdf"/><circle cx="92" cy="102" r="2.5" fill="#f2ecdf"/><circle cx="108" cy="102" r="2.5" fill="#f2ecdf"/><path d="M122 84c8-4 12 0 14 6" stroke-width="1.5" fill="none"/>`, 'brass, with thread'),
  eyepiece: tag(`<rect x="70" y="80" width="70" height="32" rx="6" fill="#b8791f" fill-opacity=".6"/><rect x="140" y="86" width="20" height="20" rx="3" fill="#b8791f" fill-opacity=".9"/><circle cx="160" cy="96" r="7" fill="#e8f0f5"/>${label(78, 100, 'H.Q.', 9)}`, 'brass, engraved'),
  ticket: tag(`<path d="M60 74h110v44H60z" fill="#efe4c8"/><path d="M60 96a6 6 0 0 0 0 0M170 96a6 6 0 0 1 0 0" /><path d="M110 74v44" stroke-dasharray="3 3"/>${label(68, 92, 'PAWN', 9)}${label(68, 108, 'No. 3391', 9)}`, 'redeemed by another hand'),
};

export const figure = (id: string | undefined): string => (id && (FIGURES[id] || OBJECTS[id])) || '';
