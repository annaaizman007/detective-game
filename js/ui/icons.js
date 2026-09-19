// Hand-rolled glyphs. No image assets anywhere in this project -- everything on
// screen is SVG drawn from these paths, so the whole game is a few files and
// loads instantly offline.

const G = {
  hotel: 'M3 21V6l9-3 9 3v15M8 21v-4h8v4M7 10h2M11 10h2M15 10h2M7 13.5h2M11 13.5h2M15 13.5h2',
  police: 'M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3zM12 8v7M8.5 11.5h7',
  bar: 'M4 4h16l-8 8v7M8 19h8M17 4l-1.5 4',
  shop: 'M4 9h16v11H4zM3 9l2-5h14l2 5M9 20v-6h6v6',
  docks: 'M12 3v16M8 6h8M4 13c0 5 3.5 7 8 7s8-2 8-7M4 13h16M12 3a1.6 1.6 0 100-.2',
  factory: 'M3 21V11l5 3V11l5 3V8l6 3v10zM6 21v-3M11 21v-3M16 21v-3',
  church: 'M12 2v6M9.5 4.5h5M6 21V10l6-4 6 4v11zM10 21v-5h4v5',
  hospital: 'M4 21V7h16v14zM9 3h6v4H9zM12 10v7M8.5 13.5h7',
  press: 'M3 6h13v14H3zM16 10h5v8a2 2 0 01-2 2h-3M6 9h7M6 12h7M6 15h5',
  home: 'M3 11l9-7 9 7M5 10v11h14V10M10 21v-6h4v6',
  market: 'M3 8h18l-1.5 12h-15zM3 8l2-4h14l2 4M9 12v4M15 12v4',
  manor: 'M2 21V9l10-6 10 6v12zM9 21v-6h6v6M6 12h2M16 12h2',
  warehouse: 'M2 21V9l10-4 10 4v12zM6 21v-8h12v8M6 16h12',
  light: 'M9 21h6M10 21l1-9h2l1 9M9.5 12h5l-.6-5h-3.8zM11 7V4h2v3M4 9l3 1M20 9l-3 1M5 15l3-1M19 15l-3-1',
  morgue: 'M3 20h18M5 20v-6h14v6M7 14V9a5 5 0 0110 0v5M12 4v2',
  station: 'M5 4h14v11H5zM5 15l-2 5M19 15l2 5M8 8h8M8 11.5h3M8.5 20h7',
  bank: 'M3 9l9-6 9 6M4 9v10M20 9v10M8 11v6M12 11v6M16 11v6M2 21h20',
  school: 'M2 8l10-4 10 4-10 4zM6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5M20 10v5',
  bridge: 'M2 17h20M4 17V9M20 17V9M4 12c5-4 11-4 16 0M8 17v-3.4M12 17v-4.6M16 17v-3.4',
  bathhouse: 'M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5zM7 12V6a2 2 0 014 0M9 4.5c0-1 1-1.5 1-2.5M14 4.5c0-1 1-1.5 1-2.5',
  pin: 'M12 22s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12zM12 12.5a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6',
};

export function locIcon(type, cls = '') {
  const d = G[type] || G.pin;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${
    d.split('M').filter(Boolean).map((seg) => `<path d="M${seg}"/>`).join('')
  }</svg>`;
}

const TRAIT_G = {
  body: 'M12 3a2.2 2.2 0 100 4.4A2.2 2.2 0 0012 3zM8 21v-6H6.5l1.7-5.4A2 2 0 0110.1 8h3.8a2 2 0 011.9 1.6L17.5 15H16v6',
  hair: 'M4 13a8 8 0 0116 0v1H4zM6 14c0 5 2.5 7 6 7s6-2 6-7M8 8c2-2 6-2 8 0',
  hand: 'M7 12V5.5a1.5 1.5 0 013 0V11M10 11V4.5a1.5 1.5 0 013 0V11M13 11V6a1.5 1.5 0 013 0v7M16 10.5a1.5 1.5 0 013 0V15c0 4-2.5 6-6 6h-2c-3 0-4.5-1.5-5.5-4l-1.5-4a1.5 1.5 0 012.6-1.4',
  mark: 'M8 3l1.5 4M11 2l1 5M15 3l-1.5 4M5 10h14l-1.5 11h-11zM9 14l6 4M15 14l-6 4',
  vice: 'M6 8h9v6a3 3 0 01-3 3H9a3 3 0 01-3-3zM15 9h2.5a2.5 2.5 0 010 5H15M4 21h13M9 5V3M12 5V2.5',
  scent: 'M9 20h6a3 3 0 003-3v-3H6v3a3 3 0 003 3zM8 11c0-2 2-2.5 2-4.5S8 4 8 4M12 11c0-2 2-2.5 2-4.5S12 4 12 4M16 11c0-1.6 1.4-2 1.4-3.4',
  shoe: 'M3 17v-7h4l3 2.5 4 .5c3 .4 7 1.4 7 3.5V17zM3 17h18v2H3zM7 10V8',
  note: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 15.5h7M9 19h4',
  lead: 'M11 3a7 7 0 105.2 11.7L21 19.5 19.5 21l-4.8-4.8A7 7 0 0011 3zm0 3a4 4 0 110 8 4 4 0 010-8',
  cup: 'M5 8h11v6a5 5 0 01-5 5H10a5 5 0 01-5-5zM16 9h2.5a2.5 2.5 0 010 5H16M3 21h15M8 5V3M11 5V2.5',
  book: 'M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z',
  skull: 'M12 2a8 8 0 00-8 8c0 3 1.5 4.6 2.5 5.5V19h11v-3.5c1-.9 2.5-2.5 2.5-5.5a8 8 0 00-8-8zM9 10.5a1.6 1.6 0 100-.2M15 10.5a1.6 1.6 0 100-.2M11 15h2M8 22v-3M12 22v-3M16 22v-3',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5.5l3.5 2',
  eye: 'M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6',
  badge: 'M12 2l2.4 2.1 3.1-.6 1.1 3 2.9 1.3-1.1 3 1.1 3-2.9 1.3-1.1 3-3.1-.6L12 20l-2.4-2.5-3.1.6-1.1-3L2.5 13.8l1.1-3-1.1-3 2.9-1.3 1.1-3 3.1.6z',
  speaker: 'M4 9v6h3.5L13 20V4L7.5 9zM16.5 9.5a3.5 3.5 0 010 5M19 7a7 7 0 010 10',
  mute: 'M4 9v6h3.5L13 20V4L7.5 9zM17 10l4 4M21 10l-4 4',
};

export function icon(name, cls = '') {
  const d = TRAIT_G[name] || G[name] || G.pin;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${
    d.split('M').filter(Boolean).map((seg) => `<path d="M${seg}"/>`).join('')
  }</svg>`;
}

/**
 * A deterministic noir portrait: hat brim, coat collar, shoulders. Same id
 * always yields the same silhouette, so a suspect looks like themselves.
 */
export function portrait(id, color = '#c8963e', size = 64) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hat = h % 4;              // 0 fedora, 1 flat cap, 2 bare, 3 wide brim
  const collar = (h >> 3) % 3;
  const brim = [26, 20, 0, 32][hat];
  const crown = [16, 10, 0, 18][hat];
  return `<svg class="portrait" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="pg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${color}" stop-opacity=".12"/>
    </linearGradient></defs>
    <rect width="64" height="64" rx="4" fill="url(#pg-${id})"/>
    <g fill="#0b0d12">
      <path d="M32 58c-12 0-18-5-18-11 0-5 5-8 10-9.5l${collar === 0 ? '8 6 8-6' : collar === 1 ? '8 8 8-8' : '6 5 10-5'}c5 1.5 10 4.5 10 9.5 0 6-6 11-18 11z"/>
      <ellipse cx="32" cy="27" rx="11" ry="13"/>
      ${crown ? `<path d="M${32 - brim / 2} 20h${brim}v2h-${brim}z"/><path d="M${32 - crown / 2} ${20 - crown * 0.55}h${crown}v${crown * 0.55}h-${crown}z" />` : ''}
    </g>
    <g opacity=".5" fill="${color}">
      <ellipse cx="27" cy="29" rx="1.7" ry="1.2"/><ellipse cx="37" cy="29" rx="1.7" ry="1.2"/>
    </g>
  </svg>`;
}
