// The board.
//
// A printed city map -- paper, ink, water, parks, streets and blocks -- with
// the locations pinned onto it as playable spaces. Terrain comes from
// cartography.js; this file draws it, places the tokens, and handles pan,
// zoom and clicks. Redrawn wholesale on every state change: a dozen spaces is
// cheap, and it keeps the render a pure function of the state.

import * as R from '../rules.js';
import { locIcon } from './icons.js';
import { characterById } from '../characters.js';
import { caseById } from '../cases/index.js';
import { BOARD, makeProjection, buildCity } from './cartography.js';

const VB = BOARD;

export class CityMap {
  constructor(svg, handlers = {}, cam = null) {
    this.svg = svg;
    this.handlers = handlers;
    // Shared by reference with the App so pan/zoom survives a re-render.
    this.cam = cam || { x: 0, y: 0, k: 1 };
    this.state = null;
    this.ui = null;
    this._cityFor = null;
    this._bindCamera();
  }

  _bindCamera() {
    const svg = this.svg;
    const pointers = new Map();
    let last = null;
    let pinch = 0;

    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-node], [data-chip]')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinch = spread();
      last = { x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('is-grabbing');
    });

    svg.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const now = spread();
        if (pinch > 0 && now > 0) this.zoomBy(now / pinch);
        pinch = now;
        return;
      }
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const scale = VB.w / (svg.clientWidth || VB.w);
      this.cam.x += dx * scale; this.cam.y += dy * scale;
      this._applyCamera();
    });

    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!pointers.size) svg.classList.remove('is-grabbing');
      try { svg.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
  }

  zoomBy(f) {
    this.cam.k = Math.max(0.55, Math.min(3, this.cam.k * f));
    this._applyCamera();
  }

  _applyCamera() {
    const g = this.svg.querySelector('#cam');
    if (!g) return;
    const { x, y, k } = this.cam;
    g.setAttribute('transform', `translate(${VB.w / 2 + x} ${VB.h / 2 + y}) scale(${k}) translate(${-VB.w / 2} ${-VB.h / 2})`);
  }

  focus(locId) {
    const l = this.proj && this.state?.map.locations.find((n) => n.id === locId);
    if (!l) return;
    this.cam.x = (VB.w / 2 - this.proj.px(l.x)) * this.cam.k;
    this.cam.y = (VB.h / 2 - this.proj.py(l.y)) * this.cam.k;
    this._applyCamera();
  }

  /** Frame the board for whatever shape the panel happens to be. */
  fitToContent(focusId = null, pad = 26) {
    if (!this.state) return;
    const sw = this.svg.clientWidth || VB.w;
    const sh = this.svg.clientHeight || VB.h;
    if (!sw || !sh) return;
    const bw = VB.w + pad * 2;
    const bh = VB.h + pad * 2;
    const meet = Math.min(sw / VB.w, sh / VB.h);
    const visW = sw / meet;
    const visH = sh / meet;

    // A phone panel is tall and the board is wide. Fitting both axes there
    // shrinks the street names past reading, so a portrait panel fills the
    // height and pans sideways -- which is how people read maps. Judged by
    // the panel's shape, not its pixel width.
    const kFit = Math.min(visW / bw, visH / bh);
    const portrait = sh / sw > 1.15;
    const k = Math.max(0.55, Math.min(3, portrait ? Math.max(kFit, (visH / bh) * 0.74) : kFit));
    const cropped = k > kFit + 0.001;
    const anchor = cropped && focusId && this.state.map.locations.find((l) => l.id === focusId);
    const cx = anchor ? this.proj.px(anchor.x) : VB.w / 2;
    const cy = anchor ? this.proj.py(anchor.y) : VB.h / 2;
    Object.assign(this.cam, { k, x: (VB.w / 2 - cx) * k, y: (VB.h / 2 - cy) * k });
    this._applyCamera();
  }

  render(state, ui) {
    this.state = state;
    this.ui = ui;
    const s = state;
    const def = caseById(s.caseId);
    this.proj = makeProjection(s.map.locations, def.terrain?.sea !== false);
    const P = this.proj;
    const placed = s.map.locations.map(P.project);

    // Terrain only depends on the case, so generate it once per board.
    if (this._cityFor !== s.caseId) {
      this.city = buildCity(def, placed);
      this._cityFor = s.caseId;
    }
    const city = this.city;

    const p = R.currentPlayer(s);
    const choosing = ui.mode === 'move';
    const reach = new Set(p ? R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id)).map((o) => o.id) : []);

    this.svg.innerHTML = `
      ${this._defs(city)}
      <g id="cam">
        ${this._paper()}
        ${this._terrain(city)}
        ${this._roads(s, P, reach, p)}
        ${placed.map((l) => this._node(s, ui, l, p, reach, choosing)).join('')}
        ${this._labels(city)}
      </g>`;

    this._applyCamera();
    this.svg.querySelectorAll('[data-node]').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); this.handlers.onLocation?.(el.dataset.node); });
    });
    this.svg.querySelectorAll('[data-chip]').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); this.handlers.onSuspect?.(el.dataset.chip); });
    });
  }

  _defs(city) {
    return `<defs>
      <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.13"/></feComponentTransfer>
      </filter>
      <filter id="inkBleed" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="tokenLift" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="2.4" stdDeviation="2.4" flood-color="#100b06" flood-opacity=".5"/>
      </filter>
      <pattern id="parkHatch" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <rect width="13" height="13" fill="var(--map-park)"/>
        <circle cx="3.2" cy="3.2" r="1.15" fill="var(--map-park-ink)" opacity=".55"/>
      </pattern>
      <pattern id="waterLines" width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill="var(--map-water)"/>
        <path d="M-2 7q6.5 -4 13 0t13 0M-2 20q6.5 -4 13 0t13 0" fill="none"
              stroke="var(--map-water-ink)" stroke-opacity=".38" stroke-width="1"/>
      </pattern>
      <mask id="landMask">
        <rect width="${VB.w}" height="${VB.h}" fill="#fff"/>
        ${city.sea ? `<path d="${city.sea}" fill="#000"/>` : ''}
        ${city.river ? `<path d="${city.river.fill}" fill="#000"/>` : ''}
        ${city.lake ? `<path d="${city.lake}" fill="#000"/>` : ''}
      </mask>
    </defs>`;
  }

  _paper() {
    return `
      <rect class="map-paper" width="${VB.w}" height="${VB.h}"/>
      <rect width="${VB.w}" height="${VB.h}" filter="url(#paperGrain)" opacity=".55"/>
      <rect class="map-stain" x="-40" y="${VB.h * 0.45}" width="${VB.w + 80}" height="${VB.h * 0.6}"/>`;
  }

  _terrain(city) {
    const parks = city.parks.map((p) => `<path class="map-park" d="${p.path}"/>`).join('');
    const blocks = city.blocks.map((b) =>
      `<rect class="map-block" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" transform="rotate(${b.r} ${b.x} ${b.y})"/>`).join('');
    const minor = city.minorStreets.map((d) => `<path class="map-street" d="${d}"/>`).join('');

    return `
      <g mask="url(#landMask)">
        <g class="map-blocks">${blocks}</g>
        <g class="map-streets">${minor}</g>
        <g class="map-parks">${parks}</g>
      </g>
      ${city.sea ? `
        <path class="map-water" d="${city.sea}"/>
        <path class="map-shore" d="${city.shoreLine}"/>
        <path class="map-shore map-shore--echo" d="${city.shoreEcho}"/>` : ''}
      ${city.river ? `
        <path class="map-water" d="${city.river.fill}"/>
        <path class="map-shore" d="${city.river.fill}" fill="none"/>` : ''}
      ${city.lake ? `
        <path class="map-water" d="${city.lake}"/>
        <path class="map-shore" d="${city.lake}" fill="none"/>` : ''}`;
  }

  /** The playable connections, drawn as the map's arterial roads. */
  _roads(s, P, reach, p) {
    return `<g class="roads">${s.map.edges.map(([a, b]) => {
      const A = s.map.locations.find((l) => l.id === a);
      const B = s.map.locations.find((l) => l.id === b);
      const live = p && ((p.at === a && reach.has(b)) || (p.at === b && reach.has(a)));
      const d = `M${P.px(A.x)} ${P.py(A.y)}L${P.px(B.x)} ${P.py(B.y)}`;
      return `<g class="road ${live ? 'road--live' : ''}">
        <path class="road-case" d="${d}"/>
        <path class="road-fill" d="${d}"/>
        ${live ? `<path class="road-live" d="${d}"/>` : ''}
      </g>`;
    }).join('')}</g>`;
  }

  _labels(city) {
    return `<g class="map-labels">${city.labels.map((l) =>
      `<text class="map-label map-label--${l.kind}" x="${l.x}" y="${l.y}"
             font-size="${l.size}" transform="rotate(${l.rot || 0} ${l.x} ${l.y})">${l.text}</text>`).join('')}</g>`;
  }

  _node(s, ui, l, p, reach, choosing) {
    const here = p && p.at === l.id;
    const sealed = !!s.sealed[l.id];
    const rec = R.searchRecord(s, l.id);
    const targetable = choosing ? (reach.has(l.id) && !sealed) : true;

    const suspects = R.suspectsAt(s, l.id);
    const dets = R.playersAt(s, l.id);

    const chips = suspects.map((x, i) => {
      const n = suspects.length;
      const rx = -(n - 1) * 15 + i * 30;
      const out = R.isEliminated(s, x);
      const initials = x.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean)
        .slice(0, 2).map((w) => w[0]).join('');
      return `<g class="chip ${out ? 'chip--out' : ''} ${x.dead ? 'chip--dead' : ''}"
                 data-chip="${x.id}" transform="translate(${rx} 44)" filter="url(#tokenLift)">
        <circle r="13" class="chip-bg"/>
        <circle r="10" class="chip-inner"/>
        <text y="4" class="chip-t">${x.dead ? '†' : initials}</text>
        ${out && !x.dead ? '<line x1="-10" y1="10" x2="10" y2="-10" class="chip-slash"/>' : ''}
      </g>`;
    }).join('');

    const pawns = dets.map((d, i) => {
      const ch = characterById(d.charId);
      const px = -(dets.length - 1) * 13 + i * 26;
      const py = suspects.length ? 76 : 44;
      return `<g class="pawn ${d.id === p?.id ? 'pawn--active' : ''}"
                 transform="translate(${px} ${py})" filter="url(#tokenLift)">
        <circle r="12.5" fill="${ch.color}" class="pawn-bg"/>
        <circle r="8.5" class="pawn-ring" fill="none"/>
        <text y="4" class="pawn-t">${ch.short[0]}</text>
      </g>`;
    }).join('');

    const flag = sealed
      ? '<g class="flag flag--sealed"><rect x="-31" y="-9" width="62" height="18" rx="2"/><text y="4">SEALED</text></g>'
      : rec.empty
        ? '<g class="flag flag--done"><rect x="-40" y="-9" width="80" height="18" rx="2"/><text y="4">PICKED CLEAN</text></g>'
        : rec.times
          ? '<g class="flag flag--part"><rect x="-36" y="-9" width="72" height="18" rx="2"/><text y="4">SEARCHED</text></g>'
          : '';

    return `<g class="node ${here ? 'node--here' : ''} ${sealed ? 'node--sealed' : ''}
                 ${targetable ? 'node--hit' : 'node--cold'}"
             data-node="${l.id}" transform="translate(${l.px} ${l.py})" tabindex="0"
             role="button" aria-label="${l.name}">
      <circle r="35" class="node-halo"/>
      <circle r="25" class="node-plate" filter="url(#tokenLift)"/>
      <circle r="25" class="node-ring"/>
      <circle r="20" class="node-ring node-ring--inner"/>
      <g class="node-ico" transform="translate(-12 -12) scale(1.02)">${locIcon(l.type)}</g>
      <g class="node-name-plate" transform="translate(0 -38)">
        <text class="node-name">${l.name}</text>
      </g>
      <g transform="translate(0 -58)">${flag}</g>
      ${chips}${pawns}
    </g>`;
  }
}

export { VB };
