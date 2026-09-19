// The board.
//
// A printed city map -- paper, ink, water, parks, streets and blocks -- with
// the locations pinned onto it as playable spaces. Terrain comes from
// cartography.ts and is baked to one texture per case; the pins, chips and
// pawns are live game objects that tween when the state moves them. Pan by
// dragging, zoom with the wheel or a pinch, tap a pin to open it.

import Phaser from 'phaser';
import type { GameState, LocationDef } from '../types/game-types';
import { caseById } from '../game/cases/index';
import { characterById } from '../game/characters';
import { BOARD, ZOOM } from '../config/constants';
import { buildCity, makeProjection, type City, type Placed, type Projection, type Pt } from './cartography';
import { clamp } from '../utils/math-utils';

export interface BoardView {
  mode: 'idle' | 'move';
  selectedLocation: string | null;
  /** Locations the current detective can walk to right now. */
  reachable: Set<string>;
  /** Suspects out of the frame, by the table's own reckoning. */
  eliminated: Set<string>;
  currentPlayerId: string | null;
}

export interface BoardHandlers {
  onLocation?: (id: string) => void;
  onSuspect?: (id: string) => void;
  onWitness?: (id: string) => void;
  onCamera?: () => void;
}

const COLOR = {
  paper: 0xe9dfc8,
  paperDark: 0xd9cdb2,
  ink: 0x2a2118,
  water: 0xb9c7c4,
  waterInk: 0x6f8c8a,
  park: 0xc9cfae,
  parkInk: 0x8a9a6a,
  block: 0xd3c6a8,
  street: 0xc4b596,
  road: 0xf4eee0,
  roadCase: 0x5a4a38,
  live: 0xd9a441,
  plate: 0xf1e9d6,
  lead: 0xb3252d,
  sealed: 0x8b2f2f,
  grey: 0x6b6f78,
};

const toPoints = (pts: Pt[]) => pts.map(([x, y]) => new Phaser.Geom.Point(x, y));

interface Node {
  loc: Placed;
  root: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Image;
  building: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  flag: Phaser.GameObjects.Text;
  flagBg: Phaser.GameObjects.Graphics;
  lead: Phaser.GameObjects.Container;
  witness: Phaser.GameObjects.Container | null;
  pulse: Phaser.Tweens.Tween | null;
}

interface Token {
  root: Phaser.GameObjects.Container;
  at: string;
  ring: Phaser.GameObjects.Graphics;
  face: Phaser.GameObjects.Image;
  slash: Phaser.GameObjects.Graphics;
  dead: Phaser.GameObjects.Text;
  pulse: Phaser.Tweens.Tween | null;
}

export class BoardScene extends Phaser.Scene {
  private handlers: BoardHandlers = {};
  private state: GameState | null = null;
  private view: BoardView | null = null;
  private proj: Projection | null = null;
  private city: City | null = null;
  private cityFor: string | null = null;
  private placed = new Map<string, Placed>();
  private nodes = new Map<string, Node>();
  private chips = new Map<string, Token>();
  private pawns = new Map<string, Token>();
  private cityImage: Phaser.GameObjects.Image | null = null;
  private roadsLive: Phaser.GameObjects.Graphics | null = null;
  private labels: Phaser.GameObjects.Text[] = [];
  private layers!: { ground: Phaser.GameObjects.Layer; pins: Phaser.GameObjects.Layer; tokens: Phaser.GameObjects.Layer };
  private drag: { x: number; y: number; sx: number; sy: number } | null = null;
  private pinch = 0;
  private fitted = false;
  private cine: Phaser.Tweens.TweenChain | null = null;
  private pressed: Phaser.GameObjects.Container | null = null;
  private cineZoom: Phaser.Tweens.Tween | null = null;

  constructor() { super('board'); }

  setHandlers(h: BoardHandlers): void { this.handlers = h; }

  create(): void {
    this.layers = {
      ground: this.add.layer().setDepth(0),
      pins: this.add.layer().setDepth(10),
      tokens: this.add.layer().setDepth(20),
    };
    const cam = this.cameras.main;
    cam.setBackgroundColor('rgba(0,0,0,0)');
    cam.setBounds(-400, -400, BOARD.w + 800, BOARD.h + 800);
    cam.setZoom(0.6);
    cam.centerOn(BOARD.w / 2, BOARD.h / 2);
    this.bindCamera();
    this.scale.on('resize', () => { if (this.state) this.fit(); });
  }

  // ------------------------------------------------------------- camera

  private bindCamera(): void {
    const cam = this.cameras.main;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.input.manager.pointersTotal > 1 && this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.pinch = Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y);
        this.drag = null;
        return;
      }
      this.drag = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const d = Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y);
        if (this.pinch > 0 && d > 0) {
          const mid = { x: (this.input.pointer1.x + this.input.pointer2.x) / 2, y: (this.input.pointer1.y + this.input.pointer2.y) / 2 };
          this.zoomAt(mid.x, mid.y, cam.zoom * (d / this.pinch));
        }
        this.pinch = d;
        return;
      }
      if (!this.drag || !p.isDown) return;
      cam.scrollX = this.drag.sx - (p.x - this.drag.x) / cam.zoom;
      cam.scrollY = this.drag.sy - (p.y - this.drag.y) / cam.zoom;
      this.handlers.onCamera?.();
    });
    const end = () => { this.drag = null; this.pinch = 0; };
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);
    this.input.on('gameout', end);
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.zoomAt(p.x, p.y, cam.zoom * (dy < 0 ? ZOOM.step : 1 / ZOOM.step));
    });
  }

  /** Zoom keeping the world point under the cursor where it is. */
  zoomAt(x: number, y: number, zoom: number): void {
    const cam = this.cameras.main;
    const next = clamp(zoom, ZOOM.min, ZOOM.max);
    const before = cam.getWorldPoint(x, y);
    cam.setZoom(next);
    const after = cam.getWorldPoint(x, y);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
    this.handlers.onCamera?.();
  }

  zoomBy(f: number): void {
    this.zoomAt(this.scale.width / 2, this.scale.height / 2, this.cameras.main.zoom * f);
  }

  focus(locId: string, zoom?: number): void {
    const l = this.placed.get(locId);
    if (!l) return;
    const cam = this.cameras.main;
    if (zoom) cam.setZoom(clamp(zoom, ZOOM.min, ZOOM.max));
    cam.pan(l.px, l.py, 420, 'Sine.easeInOut');
  }

  /** Frame the board for whatever shape the panel happens to be. */
  fit(focusId: string | null = null, pad = 60): void {
    if (!this.state) return;
    this.stopCinematic();
    const cam = this.cameras.main;
    const sw = this.scale.width;
    const sh = this.scale.height;
    if (!sw || !sh) return;
    const kFit = Math.min(sw / (BOARD.w + pad * 2), sh / (BOARD.h + pad * 2));
    // A phone panel is tall and the board is wide. Fitting both axes there
    // shrinks the street names past reading, so a portrait panel fills the
    // height and pans sideways -- which is how people read maps.
    const portrait = sh / sw > 1.15;
    const k = clamp(portrait ? Math.max(kFit, (sh / (BOARD.h + pad * 2)) * 0.8) : kFit, ZOOM.min, ZOOM.max);
    cam.setZoom(k);
    const anchor = focusId ? this.placed.get(focusId) : null;
    if (anchor && k > kFit + 0.001) cam.centerOn(anchor.px, anchor.py);
    else cam.centerOn(BOARD.w / 2, BOARD.h / 2);
    this.fitted = true;
  }

  // -------------------------------------------------------------- render

  render(state: GameState, view: BoardView): void {
    this.state = state;
    this.view = view;
    // Asked to draw before create() has run (a resumed game races the
    // launch): come back the moment the scene exists.
    if (!this.layers) { this.events.once(Phaser.Scenes.Events.CREATE, () => this.render(state, view)); return; }
    if (this.cityFor !== state.caseId) this.buildBoard(state);
    this.updateNodes(state, view);
    this.updateRoads(state, view);
    this.updateChips(state, view);
    this.updatePawns(state, view);
    if (!this.fitted && !this.cine) this.fit(view.currentPlayerId ? state.players.find((p) => p.id === view.currentPlayerId)?.at ?? null : null);
  }

  /** Forget the case so the next render rebuilds. */
  reset(): void {
    this.cityFor = null;
    this.fitted = false;
  }

  private buildBoard(state: GameState): void {
    const def = caseById(state.caseId);
    this.cityFor = state.caseId;
    this.fitted = false;
    this.proj = makeProjection(state.map.locations, def.terrain?.sea !== false);
    const placed = state.map.locations.map(this.proj.project);
    this.placed = new Map(placed.map((l) => [l.id, l]));
    this.city = buildCity(def, placed, this.proj);

    // Clear the previous case.
    this.layers.ground.removeAll(true);
    this.layers.pins.removeAll(true);
    this.layers.tokens.removeAll(true);
    this.nodes.clear(); this.chips.clear(); this.pawns.clear();
    this.labels = [];
    if (this.textures.exists('city')) this.textures.remove('city');

    this.bakeCity(state, this.city);
    this.roadsLive = this.add.graphics();
    this.layers.ground.add(this.roadsLive);
    this.drawLabels(this.city);
    for (const l of placed) this.makeNode(l, state);
  }

  /** Everything static about the city, drawn once into a texture. */
  private bakeCity(state: GameState, city: City): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // A seed for the hand-made variation, fixed per city.
    let h = 2166136261 >>> 0;
    for (const ch of state.caseId) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };

    // The board: green baize under the model, a paper margin for the hills.
    g.fillStyle(COLOR.paper, 1); g.fillRect(0, 0, BOARD.w, BOARD.h);
    g.fillStyle(COLOR.paperDark, 0.35); g.fillRect(-40, BOARD.h * 0.45, BOARD.w + 80, BOARD.h * 0.6);

    // Hills in the margins: contour rings around a few rises, outside the city.
    const rises = Array.from({ length: 5 }, () => ({ x: rnd() * BOARD.w, y: rnd() < 0.5 ? rnd() * 90 : BOARD.h - 60 - rnd() * 200, r: 90 + rnd() * 160 }));
    for (const rise of rises) {
      for (let k = 1; k <= 5; k++) {
        const r = (rise.r * k) / 5;
        const pts: Pt[] = [];
        for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const w = 1 + Math.sin(a * 3 + k) * 0.08 + Math.cos(a * 5 - k) * 0.05; pts.push([rise.x + Math.cos(a) * r * w, rise.y + Math.sin(a) * r * 0.55 * w]); }
        g.fillStyle(0xd7c9a4, 0.18); g.fillPoints(toPoints(pts), true);
        g.lineStyle(1.3, COLOR.ink, 0.18); g.strokePoints(toPoints(pts), true);
      }
    }

    // The street grid and the avenues, as the ground the model stands on.
    for (const b of city.blocks) { g.fillStyle(0xd9ccab, 1); g.fillRect(b.x, b.y, b.w, b.h); }
    g.lineStyle(4, COLOR.street, 0.9);
    for (const [a, b] of city.streets) g.lineBetween(a[0], a[1], b[0], b[1]);
    for (const [a, b] of city.avenues) { g.lineStyle(26, COLOR.paper, 1); g.lineBetween(a[0], a[1], b[0], b[1]); g.lineStyle(2, COLOR.ink, 0.35); g.lineBetween(a[0], a[1], b[0], b[1]); }

    // Water: sea, river, lake, with ripples; the harbour gets a quay, piers and boats.
    const waters: Phaser.Geom.Polygon[] = [];
    const water = (pts: Pt[]) => {
      const poly = new Phaser.Geom.Polygon(toPoints(pts)); waters.push(poly);
      g.fillStyle(0x8fb3b8, 1); g.fillPoints(toPoints(pts), true);
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
      g.lineStyle(1.2, 0xe4eef0, 0.55);
      for (let y = y0 + 14; y < y1; y += 22) {
        for (let x = x0 + 10 + ((y / 22) % 2) * 18; x < x1; x += 36) {
          if (!poly.contains(x, y) || !poly.contains(x + 16, y) || rnd() < 0.35) continue;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y - 2); g.lineTo(x + 10, y); g.lineTo(x + 15, y - 2); g.strokePath();
        }
      }
      g.lineStyle(3, COLOR.waterInk, 0.9); g.strokePoints(toPoints(pts), true);
    };
    const boat = (bx: number, by: number, big: boolean) => {
      const L = big ? 34 : 20; const W = big ? 12 : 7;
      g.fillStyle(COLOR.ink, 0.25); g.fillEllipse(bx + 3, by + 4, L, W);
      g.fillStyle(0x4a3a2c, 1); g.fillEllipse(bx, by, L, W);
      g.fillStyle(0xe8dcc0, 1); g.fillEllipse(bx, by - 1, L * 0.7, W * 0.45);
      if (big) { g.fillStyle(0xf1e9d6, 1); g.fillTriangle(bx - 2, by - 3, bx - 2, by - 26, bx + 14, by - 8); g.lineStyle(1.5, COLOR.ink, 0.8); g.lineBetween(bx - 2, by - 2, bx - 2, by - 28); }
      else { g.lineStyle(1.5, COLOR.ink, 0.8); g.lineBetween(bx, by - 2, bx, by - 12); }
    };
    if (city.sea) {
      water(city.sea);
      const shore = city.shore ?? [];
      if (shore.length > 4) {
        g.lineStyle(6, 0x8a7a5e, 0.7); g.strokePoints(toPoints(shore), false);
        for (let k = 0; k < 6; k++) {
          const i = Math.floor(rnd() * (shore.length - 2)) + 1;
          const [x, y] = shore[i]; const len = 40 + rnd() * 60; const w = 10 + rnd() * 8;
          g.fillStyle(0xb7a27a, 1); g.fillRect(x - w / 2, y, w, len);
          g.lineStyle(1.5, COLOR.ink, 0.6); g.strokeRect(x - w / 2, y, w, len);
          for (let t = 8; t < len; t += 10) g.lineBetween(x - w / 2, y + t, x + w / 2, y + t);
        }
        for (let k = 0; k < 8; k++) {
          const i = Math.floor(rnd() * (shore.length - 2)) + 1;
          const [x, y] = shore[i]; boat(x + (rnd() - 0.5) * 140, y + 50 + rnd() * 140, rnd() < 0.45);
        }
      }
    }
    if (city.river) { water(city.river.band); const sp = city.river.spine; if (sp.length > 6) for (let k = 0; k < 3; k++) { const [x, y] = sp[Math.floor(rnd() * (sp.length - 1))]; boat(x, y, false); } }
    if (city.lake) water(city.lake);
    if (city.shoreEcho) { g.lineStyle(1.5, COLOR.waterInk, 0.45); g.strokePoints(toPoints(city.shoreEcho), false); }

    // The playable connections: roads between the places, under the buildings.
    const hiddenIds = new Set(state.map.locations.filter((l) => l.hidden).map((l) => l.id));
    const baked = state.map.edges.filter(([a, b]) => !hiddenIds.has(a) && !hiddenIds.has(b));
    const roadSegs: [Pt, Pt][] = [];
    for (const [a, b] of baked) {
      const A = this.placed.get(a); const B = this.placed.get(b);
      if (!A || !B) continue;
      roadSegs.push([[A.px, A.py], [B.px, B.py]]);
      g.lineStyle(14, COLOR.roadCase, 0.9); g.lineBetween(A.px, A.py, B.px, B.py);
    }
    for (const [A, B] of roadSegs) { g.lineStyle(9, COLOR.road, 1); g.lineBetween(A[0], A[1], B[0], B[1]); }

    // Parks: lawn, a path, trees with a shadow side.
    for (const p of city.parks) {
      g.fillStyle(0xa9b986, 1); g.fillPoints(toPoints(p.pts), true);
      g.lineStyle(2, COLOR.parkInk, 0.7); g.strokePoints(toPoints(p.pts), true);
      g.lineStyle(3, COLOR.paper, 0.8); g.lineBetween(p.cx - p.r * 0.7, p.cy + p.r * 0.2, p.cx + p.r * 0.7, p.cy - p.r * 0.2);
      for (let i = 0; i < 34; i++) {
        const a = (i / 34) * Math.PI * 2 + 0.3; const r = p.r * (0.2 + ((i * 37) % 10) / 16);
        const x = p.cx + Math.cos(a) * r; const y = p.cy + Math.sin(a) * r * 0.78; const cr = 5 + ((i * 13) % 5);
        g.fillStyle(COLOR.ink, 0.2); g.fillCircle(x + 2, y + 3, cr);
        g.fillStyle(0x6f8a4e, 1); g.fillCircle(x, y, cr);
        g.fillStyle(0x9cb46a, 1); g.fillCircle(x - cr * 0.3, y - cr * 0.3, cr * 0.5);
      }
    }

    // The model city: every lot becomes a little building with a roof, a lit
    // face and a shadowed face, drawn back to front so the near ones stand in
    // front. Nothing is built on water, on a road or where a facade will sit.
    interface Bld { x: number; y: number; w: number; h: number; z: number; wall: number; roof: number; dome: boolean }
    const blds: Bld[] = [];
    const WALLS = [0xe6d9b8, 0xdcc9a3, 0xd9b98f, 0xc9b9a6, 0xe2cfb4, 0xd4c4b0, 0xcdb894];
    const ROOFS = [0xa8503a, 0x9c4a36, 0x7a5a48, 0x6b6f78, 0x8a4c3c, 0x5f6a72];
    const distToSeg = (px: number, py: number, [a, b]: [Pt, Pt]) => {
      const vx = b[0] - a[0]; const vy = b[1] - a[1]; const L2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / L2));
      return Math.hypot(px - (a[0] + vx * t), py - (a[1] + vy * t));
    };
    const pins = [...this.placed.values()].filter((l) => !l.hidden);
    // Build on a fine grid over the whole city, not just the drawn lots, so
    // the model is dense the way a city is; leave the streets, the avenues,
    // the water, the parks and the roads clear.
    const bx0 = Math.min(...city.blocks.map((b) => b.x)) - 20; const bx1 = Math.max(...city.blocks.map((b) => b.x + b.w)) + 20;
    const by0 = Math.min(...city.blocks.map((b) => b.y)) - 20; const by1 = Math.max(...city.blocks.map((b) => b.y + b.h)) + 20;
    const parkPolys = city.parks.map((p) => new Phaser.Geom.Polygon(toPoints(p.pts)));
    const STEP = 30;
    for (let gy = by0; gy < by1; gy += STEP) for (let gx = bx0; gx < bx1; gx += STEP) {
      if (rnd() < 0.08) continue; // a yard, a gap
      const w = 18 + rnd() * 9; const hh = 18 + rnd() * 9;
      const x = gx + (STEP - w) / 2 + (rnd() - 0.5) * 4; const y = gy + (STEP - hh) / 2 + (rnd() - 0.5) * 4;
      const cx = x + w / 2; const cy = y + hh / 2;
      if (waters.some((poly) => poly.contains(cx, cy) || poly.contains(x, y) || poly.contains(x + w, y + hh) || poly.contains(x, y + hh) || poly.contains(x + w, y))) continue;
      if (parkPolys.some((poly) => poly.contains(cx, cy))) continue;
      if (city.streets.some((seg) => distToSeg(cx, cy, seg) < 7 + Math.min(w, hh) / 2)) continue;
      if (city.avenues.some((seg) => distToSeg(cx, cy, seg) < 16 + Math.min(w, hh) / 2)) continue;
      if (roadSegs.some((seg) => distToSeg(cx, cy, seg) < 9 + Math.min(w, hh) / 2)) continue;
      if (pins.some((l) => Math.abs(cx - l.px) < 72 && cy > l.py - 125 && cy < l.py + 22)) continue;
      if (city.rail && city.rail.line.some((pt, i, arr) => i < arr.length - 1 && distToSeg(cx, cy, [pt, arr[i + 1]]) < 12)) continue;
      const z = 14 + rnd() * 24 + (rnd() < 0.15 ? 20 : 0);
      blds.push({ x, y, w, h: hh, z, wall: WALLS[Math.floor(rnd() * WALLS.length)], roof: ROOFS[Math.floor(rnd() * ROOFS.length)], dome: rnd() < 0.03 });
    }
    blds.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    const shade = (c: number, k: number) => {
      const r = Math.round(((c >> 16) & 255) * k); const gg = Math.round(((c >> 8) & 255) * k); const bb = Math.round((c & 255) * k);
      return (r << 16) | (gg << 8) | bb;
    };
    for (const b of blds) {
      const dx = b.z * 0.28; const dy = -b.z * 0.85; // the oblique lift
      // ground shadow
      g.fillStyle(COLOR.ink, 0.18); g.fillRect(b.x + 4, b.y + 4, b.w, b.h);
      // east face (shadow side) and south face (lit)
      g.fillStyle(shade(b.wall, 0.62), 1); g.fillPoints([new Phaser.Geom.Point(b.x + b.w, b.y), new Phaser.Geom.Point(b.x + b.w + dx, b.y + dy), new Phaser.Geom.Point(b.x + b.w + dx, b.y + b.h + dy), new Phaser.Geom.Point(b.x + b.w, b.y + b.h)], true);
      g.fillStyle(shade(b.wall, 0.86), 1); g.fillPoints([new Phaser.Geom.Point(b.x, b.y + b.h), new Phaser.Geom.Point(b.x + b.w, b.y + b.h), new Phaser.Geom.Point(b.x + b.w + dx, b.y + b.h + dy), new Phaser.Geom.Point(b.x + dx, b.y + b.h + dy)], true);
      // windows on the south face
      g.fillStyle(0x3a2e24, 0.75);
      const floors = Math.max(1, Math.floor(b.z / 9)); const bays = Math.max(1, Math.floor(b.w / 9));
      for (let f = 0; f < floors; f++) for (let k = 0; k < bays; k++) {
        const t = (f + 0.5) / floors; const wx = b.x + 3 + k * (b.w - 4) / bays + dx * t; const wy = b.y + b.h + dy * t - 1;
        g.fillRect(wx, wy - 2, 3, 4);
      }
      // roof
      g.fillStyle(b.roof, 1); g.fillRect(b.x + dx, b.y + dy, b.w, b.h);
      g.lineStyle(1, shade(b.roof, 0.7), 0.9);
      for (let t = 4; t < b.h; t += 5) g.lineBetween(b.x + dx, b.y + dy + t, b.x + dx + b.w, b.y + dy + t);
      g.lineStyle(1.2, shade(b.roof, 1.25), 0.9); g.lineBetween(b.x + dx + 2, b.y + dy + b.h / 2, b.x + dx + b.w - 2, b.y + dy + b.h / 2);
      if (b.dome) { g.fillStyle(0x5f8a7a, 1); g.fillCircle(b.x + dx + b.w / 2, b.y + dy + b.h / 2, Math.min(b.w, b.h) * 0.42); g.fillStyle(0xa9cabc, 1); g.fillCircle(b.x + dx + b.w / 2 - 2, b.y + dy + b.h / 2 - 2, Math.min(b.w, b.h) * 0.2); }
      if (rnd() < 0.3) { g.fillStyle(0x5a4438, 1); g.fillRect(b.x + dx + b.w * 0.7, b.y + dy + 2, 3, 5); }
      g.lineStyle(1, COLOR.ink, 0.45); g.strokeRect(b.x + dx, b.y + dy, b.w, b.h);
    }

    // Bridges: a deck across the water where a street meets it (only there).
    for (const b of city.bridges) {
      const ddx = Math.cos(b.angle) * b.len / 2; const ddy = Math.sin(b.angle) * b.len / 2;
      g.lineStyle(20, COLOR.roadCase, 1); g.lineBetween(b.x - ddx, b.y - ddy, b.x + ddx, b.y + ddy);
      g.lineStyle(12, COLOR.road, 1); g.lineBetween(b.x - ddx, b.y - ddy, b.x + ddx, b.y + ddy);
      g.lineStyle(2, COLOR.ink, 0.6);
      const nx = -Math.sin(b.angle) * 12; const ny = Math.cos(b.angle) * 12;
      g.lineBetween(b.x - ddx + nx, b.y - ddy + ny, b.x + ddx + nx, b.y + ddy + ny);
      g.lineBetween(b.x - ddx - nx, b.y - ddy - ny, b.x + ddx - nx, b.y + ddy - ny);
    }
    // The El: a double line on ties, with its stations.
    if (city.rail) {
      const pts = city.rail.line;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / len; const uy = (y1 - y0) / len;
        g.lineStyle(9, COLOR.ink, 0.75); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(3, COLOR.paper, 0.9); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(2, COLOR.ink, 0.7);
        for (let t = 0; t < len; t += 14) g.lineBetween(x0 + ux * t - uy * 7, y0 + uy * t + ux * 7, x0 + ux * t + uy * 7, y0 + uy * t - ux * 7);
      }
      for (const [x, y] of city.rail.stations) {
        g.fillStyle(COLOR.plate, 1); g.fillRect(x - 12, y - 8, 24, 16);
        g.lineStyle(2, COLOR.ink, 0.9); g.strokeRect(x - 12, y - 8, 24, 16);
      }
    }

    g.generateTexture('city', BOARD.w, BOARD.h);
    g.destroy();
    this.cityImage = this.add.image(0, 0, 'city').setOrigin(0);
    this.layers.ground.add(this.cityImage);
    const grain = this.add.tileSprite(0, 0, BOARD.w, BOARD.h, 'grain').setOrigin(0).setAlpha(0.45).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.layers.ground.add(grain);
  }

  private drawLabels(city: City): void {
    for (const l of city.labels) {
      const water = l.kind === 'water';
      const t = this.add.text(l.x, l.y, l.text, {
        fontFamily: water ? '"Oswald"' : '"Special Elite"',
        fontSize: `${l.size}px`,
        color: water ? '#5c7573' : '#5a4a38',
        fontStyle: water ? '300' : 'normal',
        letterSpacing: water ? 14 : 8,
      }).setOrigin(0.5).setAlpha(water ? 0.8 : 0.55).setRotation(Phaser.Math.DegToRad(l.rot || 0));
      this.layers.ground.add(t);
      this.labels.push(t);
    }
  }

  private makeNode(l: Placed, state: GameState): void {
    const root = this.add.container(l.px, l.py);
    const halo = this.add.image(0, -40, 'disc').setScale(2.2, 1.7).setTint(COLOR.live).setAlpha(0);
    // The facade stands on the pin: 160x136, its base at the location.
    const shadow = this.add.graphics();
    shadow.fillStyle(0x100b06, 0.45); shadow.fillEllipse(0, 4, 176, 26);
    const building = this.add.image(0, 8, `bld-${state.caseId}-${l.id}`).setOrigin(0.5, 1);
    building.setScale(160 / (building.width || 200)); // drawn facades are 200 wide, paintings 640
    const frameG = this.add.graphics();
    frameG.lineStyle(3, COLOR.plate, 1); frameG.strokeRect(-80 - 1.5, 8 - building.displayHeight - 1.5, 163, building.displayHeight + 3);
    const ring = this.add.graphics();
    const name = this.add.text(0, 30, l.name, {
      fontFamily: '"Oswald"', fontSize: '21px', color: '#2a2118', fontStyle: '500', letterSpacing: 1,
    }).setOrigin(0.5);
    const nameBg = this.add.graphics();
    nameBg.fillStyle(COLOR.plate, 0.94);
    nameBg.fillRoundedRect(-name.width / 2 - 10, 30 - name.height / 2 - 3, name.width + 20, name.height + 6, 4);
    nameBg.lineStyle(1.5, COLOR.ink, 0.8);
    nameBg.strokeRoundedRect(-name.width / 2 - 10, 30 - name.height / 2 - 3, name.width + 20, name.height + 6, 4);
    const flagBg = this.add.graphics();
    const flag = this.add.text(0, -140, '', { fontFamily: '"Oswald"', fontSize: '14px', color: '#f1e9d6', fontStyle: '600', letterSpacing: 2 }).setOrigin(0.5);
    // A red tag: a witness pointed here.
    const lead = this.add.container(72, -118, [
      this.add.graphics().fillStyle(COLOR.lead, 1).fillCircle(0, 0, 12),
      this.add.text(0, 0, '!', { fontFamily: '"Oswald"', fontSize: '17px', color: '#fff', fontStyle: '700' }).setOrigin(0.5, 0.55),
    ]).setVisible(false);

    // Someone here will talk: their face, small, at the pin's shoulder.
    const w = caseById(state.caseId).witnesses.find((x) => x.at === l.id);
    let witness: Phaser.GameObjects.Container | null = null;
    if (w) {
      const wb = this.add.graphics().fillStyle(COLOR.plate, 1).fillCircle(0, 0, 18).lineStyle(2, COLOR.ink, 1).strokeCircle(0, 0, 18);
      const face = this.add.image(0, 0, `face-${w.id}`);
      face.setScale(36 / (face.width || 72));
      // A Container's hit area is measured from its top-left (Phaser adds
      // half the size back), so shapes are centred at (w/2, h/2).
      witness = this.add.container(-76, -10, [wb, face]).setSize(40, 40)
        .setInteractive(new Phaser.Geom.Circle(20, 20, 20), Phaser.Geom.Circle.Contains);
      this.tappable(witness, () => this.handlers.onWitness?.(w.id));
      this.hoverable(witness, 1.12);
    }

    root.add([halo, shadow, building, frameG, ring, nameBg, name, flagBg, flag, lead]);
    if (witness) root.add(witness);
    // Hit area: the facade plus the name plate, centred on the container's box.
    root.setSize(170, 180).setInteractive(new Phaser.Geom.Rectangle(5, 0, 160, 180), Phaser.Geom.Rectangle.Contains);
    this.tappable(root, () => this.handlers.onLocation?.(l.id));
    this.hoverable(root, 1.05);
    this.layers.pins.add(root);
    this.nodes.set(l.id, { loc: l, root, halo, building, ring, flag, flagBg, lead, witness, pulse: null });
  }

  /** A tap is a press and a release on the same thing, without dragging. */
  private tappable(obj: Phaser.GameObjects.Container, fn: () => void): void {
    obj.on('pointerdown', () => { this.pressed = obj; });
    obj.on('pointerup', (p: Phaser.Input.Pointer) => {
      const ok = this.pressed === obj && p.getDistance() < 10;
      this.pressed = null;
      if (ok) fn();
    });
  }

  private hoverable(obj: Phaser.GameObjects.Container, scale: number): void {
    obj.on('pointerover', () => { this.input.setDefaultCursor('pointer'); this.tweens.add({ targets: obj, scale, duration: 120 }); });
    obj.on('pointerout', () => { this.input.setDefaultCursor('default'); this.tweens.add({ targets: obj, scale: 1, duration: 160 }); });
  }

  private updateNodes(s: GameState, v: BoardView): void {
    const me = v.currentPlayerId ? s.players.find((p) => p.id === v.currentPlayerId) : null;
    for (const [id, n] of this.nodes) {
      const def = s.map.locations.find((l) => l.id === id);
      const open = !def?.hidden || s.revealed.includes(id);
      n.root.setVisible(open);
      if (!open) continue;
      const here = me?.at === id;
      const sealed = !!s.sealed[id];
      const rec = s.searched[id] || { times: 0, empty: false };
      const choosing = v.mode === 'move';
      const target = choosing ? v.reachable.has(id) && !sealed : true;

      n.ring.clear();
      // A frame round the facade: gold where you stand, red where it is sealed.
      if (here) { n.ring.lineStyle(4, COLOR.live, 1); n.ring.strokeRoundedRect(-84, -132, 168, 144, 6); }
      if (sealed) { n.ring.lineStyle(5, COLOR.sealed, 0.95); n.ring.strokeRoundedRect(-88, -136, 176, 152, 6); n.ring.lineBetween(-80, -128, 80, 8); n.ring.lineBetween(80, -128, -80, 8); }
      n.root.setAlpha(target ? 1 : 0.45);
      n.building.setTint(sealed ? 0x8a8a8a : 0xffffff);

      // Halo: lit when it is a legal destination, pulsing on the selection.
      const lit = choosing && v.reachable.has(id) && !sealed;
      if (lit && !n.pulse) {
        n.halo.setAlpha(0.5);
        n.pulse = this.tweens.add({ targets: n.halo, alpha: 0.85, scaleX: 2.5, scaleY: 1.9, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
      } else if (!lit && n.pulse) {
        n.pulse.stop(); n.pulse = null;
        n.halo.setAlpha(here ? 0.22 : 0).setScale(2.2, 1.7);
      } else if (!lit) {
        n.halo.setAlpha(here ? 0.22 : 0);
      }

      const flag = sealed ? 'SEALED OFF' : rec.empty ? 'PICKED CLEAN' : rec.times ? 'SEARCHED' : '';
      n.flag.setText(flag);
      n.flagBg.clear();
      if (flag) {
        const w = n.flag.width + 16;
        n.flagBg.fillStyle(sealed ? COLOR.sealed : rec.empty ? COLOR.grey : 0x8a6a3a, 1);
        n.flagBg.fillRoundedRect(-w / 2, -140 - 10, w, 20, 3);
      }
      n.lead.setVisible(!!s.leads[id] && !rec.empty);
      if (n.witness) {
        const ws = s.witnesses.find((x) => x.at === id);
        n.witness.setAlpha(ws && ws.patience > 0 ? 1 : 0.5);
      }
    }
  }

  private updateRoads(s: GameState, v: BoardView): void {
    const g = this.roadsLive;
    if (!g) return;
    g.clear();
    // Roads to places that were hidden and have since been found.
    const hiddenIds = new Set(s.map.locations.filter((l) => l.hidden).map((l) => l.id));
    const open = (id: string) => !hiddenIds.has(id) || s.revealed.includes(id);
    for (const [a, b] of s.map.edges) {
      if (!(hiddenIds.has(a) || hiddenIds.has(b)) || !open(a) || !open(b)) continue;
      const A = this.placed.get(a) as Placed; const B = this.placed.get(b) as Placed;
      g.lineStyle(14, COLOR.roadCase, 0.9); g.lineBetween(A.px, A.py, B.px, B.py);
      g.lineStyle(9, COLOR.road, 1); g.lineBetween(A.px, A.py, B.px, B.py);
    }
    const me = v.currentPlayerId ? s.players.find((p) => p.id === v.currentPlayerId) : null;
    if (!me || v.mode !== 'move') return;
    for (const [a, b] of s.map.edges) {
      if (!open(a) || !open(b)) continue;
      const live = (me.at === a && v.reachable.has(b)) || (me.at === b && v.reachable.has(a));
      if (!live) continue;
      const A = this.placed.get(a) as Placed; const B = this.placed.get(b) as Placed;
      g.lineStyle(10, COLOR.live, 0.85); g.lineBetween(A.px, A.py, B.px, B.py);
    }
  }

  private makeToken(id: string, faceKey: string, color: number, size: number, onTap: () => void): Token {
    const root = this.add.container(0, 0);
    const ring = this.add.graphics();
    ring.fillStyle(0x100b06, 0.4); ring.fillCircle(0, 3, size + 3);
    ring.fillStyle(color, 1); ring.fillCircle(0, 0, size + 3);
    ring.fillStyle(COLOR.plate, 1); ring.fillCircle(0, 0, size);
    const face = this.add.image(0, 0, faceKey);
    face.setScale((size * 2) / (face.width || 72)); // drawn faces are 72px, painted cut-outs 96px
    const slash = this.add.graphics().setVisible(false);
    slash.lineStyle(4, COLOR.sealed, 0.95); slash.lineBetween(-size, size, size, -size);
    const dead = this.add.text(0, 0, '†', { fontFamily: '"Oswald"', fontSize: `${size * 1.4}px`, color: '#f1e9d6' }).setOrigin(0.5).setVisible(false);
    root.add([ring, face, slash, dead]);
    const box = size * 2 + 6;
    root.setSize(box, box).setInteractive(new Phaser.Geom.Circle(box / 2, box / 2, size + 3), Phaser.Geom.Circle.Contains);
    this.tappable(root, onTap);
    this.hoverable(root, 1.15);
    this.layers.tokens.add(root);
    void id;
    return { root, at: '', ring, face, slash, dead, pulse: null };
  }

  private updateChips(s: GameState, v: BoardView): void {
    // Group the living by location so a crowd fans out under the pin.
    const byLoc = new Map<string, string[]>();
    for (const x of s.suspects) {
      if (x.hidden) { this.chips.get(x.id)?.root.setVisible(false); continue; }
      if (!this.chips.has(x.id)) {
        this.chips.set(x.id, this.makeToken(x.id, `face-${x.id}`, 0x8a6a3a, 22, () => this.handlers.onSuspect?.(x.id)));
      }
      const list = byLoc.get(x.at) || [];
      list.push(x.id);
      byLoc.set(x.at, list);
    }
    for (const [locId, ids] of byLoc) {
      const l = this.placed.get(locId);
      if (!l) continue;
      ids.forEach((id, i) => {
        const x = s.suspects.find((y) => y.id === id);
        const c = this.chips.get(id);
        if (!x || !c) return;
        const n = ids.length;
        const tx = l.px - (n - 1) * 26 + i * 52;
        const ty = l.py + 78;
        const out = v.eliminated.has(id);
        c.slash.setVisible(out && !x.dead);
        c.dead.setVisible(x.dead);
        c.face.setAlpha(out ? 0.45 : 1).setTint(out ? 0x9a9a9a : 0xffffff);
        c.root.setDepth(x.dead ? 0 : 1);
        this.placeToken(c, locId, tx, ty, s);
      });
    }
  }

  private updatePawns(s: GameState, v: BoardView): void {
    const byLoc = new Map<string, string[]>();
    for (const p of s.players) {
      const ch = characterById(p.charId);
      if (!this.pawns.has(p.id)) {
        this.pawns.set(p.id, this.makeToken(p.id, `face-${ch.id}`, Phaser.Display.Color.HexStringToColor(ch.color).color, 24, () => this.handlers.onLocation?.(p.at)));
      }
      const list = byLoc.get(p.at) || [];
      list.push(p.id);
      byLoc.set(p.at, list);
    }
    for (const [locId, ids] of byLoc) {
      const l = this.placed.get(locId);
      if (!l) continue;
      const crowd = s.suspects.some((x) => x.at === locId && !x.dead);
      ids.forEach((id, i) => {
        const t = this.pawns.get(id) as Token;
        const n = ids.length;
        const tx = l.px + 92 - (n - 1) * 18 + i * 36;
        const ty = l.py + (crowd ? 78 : 40);
        const active = id === v.currentPlayerId;
        if (active && !t.pulse) {
          t.pulse = this.tweens.add({ targets: t.root, scale: 1.12, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
        } else if (!active && t.pulse) {
          t.pulse.stop(); t.pulse = null; t.root.setScale(1);
        }
        t.root.setDepth(active ? 3 : 2);
        this.placeToken(t, locId, tx, ty, s);
      });
    }
  }

  /** Walk a token along the streets to its new spot rather than teleporting it. */
  private placeToken(t: Token, locId: string, x: number, y: number, s: GameState): void {
    if (!t.at) { t.root.setPosition(x, y); t.at = locId; return; }
    if (t.at === locId) {
      if (Math.abs(t.root.x - x) > 1 || Math.abs(t.root.y - y) > 1) this.tweens.add({ targets: t.root, x, y, duration: 260, ease: 'Sine.easeOut' });
      return;
    }
    const path = this.route(s, t.at, locId).map((id) => this.placed.get(id) as Placed).filter(Boolean);
    t.at = locId;
    this.tweens.killTweensOf(t.root);
    const steps = path.slice(1).map((l, i, arr) => ({
      targets: t.root, x: i === arr.length - 1 ? x : l.px, y: i === arr.length - 1 ? y : l.py + 40,
      duration: 380, ease: 'Sine.easeInOut',
    }));
    if (!steps.length) { t.root.setPosition(x, y); return; }
    this.tweens.chain({ targets: t.root, tweens: steps });
  }

  private route(s: GameState, from: string, to: string): string[] {
    const prev = new Map<string, string | null>([[from, null]]);
    const q = [from];
    while (q.length) {
      const n = q.shift() as string;
      if (n === to) break;
      for (const m of s.map.adj[n] || []) if (!prev.has(m)) { prev.set(m, n); q.push(m); }
    }
    if (!prev.has(to)) return [from, to];
    const out: string[] = [];
    for (let n: string | null = to; n; n = prev.get(n) ?? null) out.unshift(n);
    return out;
  }

  /**
   * The opening: the camera drifts across the city at night, scene to
   * precinct to somewhere in between, close enough to read the signs. Runs
   * until stopCinematic() or the next fit().
   */
  cinematic(state: GameState): void {
    const cam = this.cameras.main;
    const stops = [state.map.scene, ...state.map.locations.filter((l) => !l.hidden).map((l) => l.id).filter((id) => id !== state.map.scene && id !== state.map.start).slice(0, 2), state.map.start]
      .map((id) => this.placed.get(id)).filter((l): l is Placed => !!l);
    if (!stops.length) return;
    this.stopCinematic();
    cam.setZoom(1.15);
    cam.centerOn(stops[0].px, stops[0].py - 60);
    const steps = stops.slice(1).map((l) => ({
      targets: cam, scrollX: l.px - cam.width / 2 / cam.zoom, scrollY: l.py - 60 - cam.height / 2 / cam.zoom,
      duration: 9000, ease: 'Sine.easeInOut', hold: 1500,
    }));
    this.cine = this.tweens.chain({ targets: cam, tweens: steps, loop: -1 });
    // A slow breathing zoom on top of the drift.
    this.cineZoom = this.tweens.add({ targets: cam, zoom: 1.32, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  stopCinematic(): void {
    this.cine?.stop(); this.cine = null;
    this.cineZoom?.stop(); this.cineZoom = null;
  }

  /** Board coordinates of a location, for anything the DOM wants to anchor. */
  screenPointOf(locId: string): { x: number; y: number } | null {
    const l = this.placed.get(locId);
    if (!l) return null;
    const cam = this.cameras.main;
    return { x: (l.px - cam.worldView.x) * cam.zoom, y: (l.py - cam.worldView.y) * cam.zoom };
  }

  locationDefs(): LocationDef[] { return this.state?.map.locations ?? []; }
}
