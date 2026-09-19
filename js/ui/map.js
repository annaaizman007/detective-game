// The city map: an SVG board with pan and zoom, redrawn from state on every
// change. Small enough (a dozen nodes) that a full redraw is cheaper than
// diffing, and it keeps the render a pure function of the state.

import * as R from '../rules.js';
import { locIcon } from './icons.js';
import { characterById } from '../characters.js';

const VB = { w: 1000, h: 700 };

export class CityMap {
  constructor(svg, handlers = {}, cam = null) {
    this.svg = svg;
    this.handlers = handlers;
    // Shared by reference with the App so pan/zoom survives a re-render.
    this.cam = cam || { x: 0, y: 0, k: 1 };
    this.state = null;
    this.ui = null;
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
    this.cam.k = Math.max(0.7, Math.min(2.6, this.cam.k * f));
    this._applyCamera();
  }

  resetCamera() { this.fitToContent(); }

  /**
   * Scale and centre so the city fills whatever shape the panel happens to be.
   * A fixed viewBox letterboxes badly between a wide desktop board and a tall
   * phone one, and the map is the thing people look at most.
   */
  fitToContent(focusId = null, pad = 78) {
    if (!this.state) return;
    const xs = this.state.map.locations.map((l) => l.x);
    const ys = this.state.map.locations.map((l) => l.y);
    const box = {
      x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad,
      y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad,
    };
    const bw = box.x1 - box.x0;
    const bh = box.y1 - box.y0;
    const sw = this.svg.clientWidth || VB.w;
    const sh = this.svg.clientHeight || VB.h;
    if (!sw || !sh) return;
    // Size of the visible area, expressed in viewBox units.
    const meet = Math.min(sw / VB.w, sh / VB.h);
    const visW = sw / meet;
    const visH = sh / meet;
    // On a phone the panel is tall and the city is wide. Fitting both axes
    // there shrinks the street names to about five pixels, so a portrait panel
    // fills the height instead and pans sideways -- which is how people read
    // maps. Judged by the panel's shape, not its pixel width: a desktop map
    // column is often narrower than a phone screen is tall.
    const kFit = Math.min(visW / bw, visH / bh);
    const portrait = sh / sw > 1.15;
    const k = Math.max(0.7, Math.min(2.6, portrait ? Math.max(kFit, (visH / bh) * 0.78) : kFit));

    // Only chase the focus point when we actually cropped something; otherwise
    // the whole city fits and centring on one detective would shove half the
    // map out of the panel.
    const cropped = k > kFit + 0.001;
    const anchor = cropped && focusId && this.state.map.locations.find((l) => l.id === focusId);
    const cx = anchor ? anchor.x : (box.x0 + box.x1) / 2;
    const cy = anchor ? anchor.y : (box.y0 + box.y1) / 2;
    Object.assign(this.cam, { k, x: (VB.w / 2 - cx) * k, y: (VB.h / 2 - cy) * k });
    this._applyCamera();
  }

  _applyCamera() {
    const g = this.svg.querySelector('#cam');
    if (!g) return;
    const { x, y, k } = this.cam;
    g.setAttribute('transform', `translate(${VB.w / 2 + x} ${VB.h / 2 + y}) scale(${k}) translate(${-VB.w / 2} ${-VB.h / 2})`);
  }

  /** Centre the camera on a location without changing the zoom. */
  focus(locId) {
    const l = this.state?.map.locations.find((n) => n.id === locId);
    if (!l) return;
    this.cam.x = (VB.w / 2 - l.x) * this.cam.k;
    this.cam.y = (VB.h / 2 - l.y) * this.cam.k;
    this._applyCamera();
  }

  render(state, ui) {
    this.state = state; this.ui = ui;
    const s = state;
    const p = R.currentPlayer(s);
    const mode = ui.mode; // 'idle' | 'move' | 'breakin'
    const reach = new Set(p ? R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id)).map((o) => o.id) : []);

    const roads = s.map.edges.map(([a, b]) => {
      const A = s.map.locations.find((l) => l.id === a);
      const B = s.map.locations.find((l) => l.id === b);
      const live = p && ((p.at === a && reach.has(b)) || (p.at === b && reach.has(a)));
      return `<g class="road ${live ? 'road--live' : ''}">
        <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="road-bed"/>
        <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="road-mark"/>
      </g>`;
    }).join('');

    const nodes = s.map.locations.map((l) => this._node(s, ui, l, p, reach, mode)).join('');

    this.svg.innerHTML = `
      <defs>
        <radialGradient id="cityGlow" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stop-color="#1b2534"/>
          <stop offset="60%" stop-color="#10151e"/>
          <stop offset="100%" stop-color="#080a0f"/>
        </radialGradient>
        <pattern id="blocks" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <rect width="64" height="64" fill="none"/>
          <path d="M0 32h64M32 0v64" stroke="#8fb4d8" stroke-opacity=".05" stroke-width="1"/>
          <path d="M0 0h64v64H0z" stroke="#8fb4d8" stroke-opacity=".035" fill="none"/>
        </pattern>
        <filter id="nodeGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="-1000" y="-1000" width="3000" height="2700" fill="url(#cityGlow)"/>
      <rect x="-1000" y="-1000" width="3000" height="2700" fill="url(#blocks)"/>
      <g id="cam">
        <g class="roads">${roads}</g>
        <g class="nodes">${nodes}</g>
      </g>`;

    this._applyCamera();
    this.svg.querySelectorAll('[data-node]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlers.onLocation?.(el.dataset.node);
      });
    });
    this.svg.querySelectorAll('[data-chip]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlers.onSuspect?.(el.dataset.chip);
      });
    });
  }

  _node(s, ui, l, p, reach, mode) {
    const here = p && p.at === l.id;
    const sealed = !!s.sealed[l.id];
    const rec = R.searchRecord(s, l.id);
    const targetable = mode === 'move' ? (reach.has(l.id) && !sealed) : true;
    const selected = ui.selectedLocation === l.id;

    const suspects = R.suspectsAt(s, l.id);
    const dets = R.playersAt(s, l.id);

    // Markers stack straight down from the disc: label, node, suspects,
    // detectives, status flag. Radial scatter read as unanchored clutter.
    const chips = suspects.map((x, i) => {
      const n = suspects.length;
      const rx = -(n - 1) * 14 + i * 28;
      const ry = 40;
      const out = R.isEliminated(s, x);
      const initials = x.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
      return `<g class="chip ${out ? 'chip--out' : ''} ${x.dead ? 'chip--dead' : ''}" data-chip="${x.id}" transform="translate(${rx} ${ry})">
        <circle r="12.5" class="chip-bg"/>
        <text y="4" class="chip-t">${x.dead ? '†' : initials}</text>
        ${out && !x.dead ? '<line x1="-10" y1="10" x2="10" y2="-10" class="chip-slash"/>' : ''}
      </g>`;
    }).join('');

    const pawns = dets.map((d, i) => {
      const ch = characterById(d.charId);
      const px = -(dets.length - 1) * 12 + i * 24;
      const py = suspects.length ? 68 : 40;
      return `<g class="pawn ${d.id === p?.id ? 'pawn--active' : ''}" transform="translate(${px} ${py})">
        <circle r="12" fill="${ch.color}" class="pawn-bg"/>
        <text y="4" class="pawn-t">${ch.short[0]}</text>
      </g>`;
    }).join('');

    const flags = [];
    if (sealed) flags.push('<g class="flag flag--sealed"><rect x="-30" y="-9" width="60" height="18" rx="3"/><text y="4">SEALED</text></g>');
    else if (rec.empty) flags.push('<g class="flag flag--done"><rect x="-38" y="-9" width="76" height="18" rx="3"/><text y="4">PICKED CLEAN</text></g>');
    else if (rec.times > 0) flags.push('<g class="flag flag--part"><rect x="-34" y="-9" width="68" height="18" rx="3"/><text y="4">SEARCHED</text></g>');

    return `<g class="node ${here ? 'node--here' : ''} ${selected ? 'node--sel' : ''} ${sealed ? 'node--sealed' : ''} ${targetable ? 'node--hit' : 'node--cold'} ${mode !== 'idle' && targetable ? 'node--target' : ''}"
             data-node="${l.id}" transform="translate(${l.x} ${l.y})" tabindex="0" role="button" aria-label="${l.name}">
      <circle r="34" class="node-halo"/>
      <circle r="27" class="node-disc"/>
      <circle r="27" class="node-ring"/>
      <g class="node-ico" transform="translate(-13 -13)">${locIcon(l.type)}</g>
      <g class="node-plate" transform="translate(0 ${-42})">
        <text class="node-name">${l.name}</text>
      </g>
      <g transform="translate(0 ${-64})">${flags.join('')}</g>
      ${chips}${pawns}
    </g>`;
  }
}

export { VB };
