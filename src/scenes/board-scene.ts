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
    // A painted map, when the city has one, is the ground; the drawn one is
    // only the roads on top of it. Otherwise everything is drawn.
    const painted = this.textures.exists(`map-${state.caseId}`);
    if (painted) {
      const img = this.add.image(0, 0, `map-${state.caseId}`).setOrigin(0);
      img.setDisplaySize(BOARD.w, BOARD.h);
      this.layers.ground.add(img);
    } else {
      // Paper.
      g.fillStyle(COLOR.paper, 1);
      g.fillRect(0, 0, BOARD.w, BOARD.h);
      g.fillStyle(COLOR.paperDark, 0.35);
      g.fillRect(-40, BOARD.h * 0.45, BOARD.w + 80, BOARD.h * 0.6);
    }
    if (!painted) {
    // Blocks: the lots between the streets, with a hairline of ink.
    for (const b of city.blocks) {
      g.fillStyle(COLOR.block, 1);
      g.fillRect(b.x, b.y, b.w, b.h);
      g.lineStyle(1.2, COLOR.ink, 0.35);
      g.strokeRect(b.x, b.y, b.w, b.h);
    }
    // The grid, then the avenues cut across it.
    g.lineStyle(4, COLOR.street, 0.9);
    for (const [a, b] of city.streets) g.lineBetween(a[0], a[1], b[0], b[1]);
    for (const [a, b] of city.avenues) { g.lineStyle(26, COLOR.paper, 1); g.lineBetween(a[0], a[1], b[0], b[1]); g.lineStyle(2, COLOR.ink, 0.35); g.lineBetween(a[0], a[1], b[0], b[1]); }
    // Water over the grid, then the shoreline.
    const water = (pts: Pt[]) => { g.fillStyle(COLOR.water, 1); g.fillPoints(toPoints(pts), true); g.lineStyle(3, COLOR.waterInk, 0.9); g.strokePoints(toPoints(pts), true); };
    if (city.sea) water(city.sea);
    if (city.river) water(city.river.band);
    if (city.lake) water(city.lake);
    if (city.shoreEcho) { g.lineStyle(1.5, COLOR.waterInk, 0.45); g.strokePoints(toPoints(city.shoreEcho), false); }
    // Bridges: a deck across the water where a street meets it.
    for (const b of city.bridges) {
      const dx = Math.cos(b.angle) * b.len / 2; const dy = Math.sin(b.angle) * b.len / 2;
      g.lineStyle(20, COLOR.roadCase, 1); g.lineBetween(b.x - dx, b.y - dy, b.x + dx, b.y + dy);
      g.lineStyle(12, COLOR.road, 1); g.lineBetween(b.x - dx, b.y - dy, b.x + dx, b.y + dy);
      g.lineStyle(2, COLOR.ink, 0.6);
      const nx = -Math.sin(b.angle) * 12; const ny = Math.cos(b.angle) * 12;
      g.lineBetween(b.x - dx + nx, b.y - dy + ny, b.x + dx + nx, b.y + dy + ny);
      g.lineBetween(b.x - dx - nx, b.y - dy - ny, b.x + dx - nx, b.y + dy - ny);
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
    // Parks.
    for (const p of city.parks) {
      g.fillStyle(COLOR.park, 1); g.fillPoints(toPoints(p.pts), true);
      g.lineStyle(2, COLOR.parkInk, 0.7); g.strokePoints(toPoints(p.pts), true);
      g.fillStyle(COLOR.parkInk, 0.35);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + 0.3; const r = p.r * (0.25 + ((i * 37) % 10) / 20);
        g.fillCircle(p.cx + Math.cos(a) * r, p.cy + Math.sin(a) * r * 0.78, 2.4);
      }
    }
    }
    // The playable connections, as arterial roads. A road to a hidden place
    // would give it away, so those are drawn live once the place is found.
    const hiddenIds = new Set(state.map.locations.filter((l) => l.hidden).map((l) => l.id));
    const baked = state.map.edges.filter(([a, b]) => !hiddenIds.has(a) && !hiddenIds.has(b));
    for (const [a, b] of baked) {
      const A = this.placed.get(a); const B = this.placed.get(b);
      if (!A || !B) continue;
      g.lineStyle(14, COLOR.roadCase, 0.9); g.lineBetween(A.px, A.py, B.px, B.py);
    }
    for (const [a, b] of baked) {
      const A = this.placed.get(a); const B = this.placed.get(b);
      if (!A || !B) continue;
      g.lineStyle(9, COLOR.road, 1); g.lineBetween(A.px, A.py, B.px, B.py);
    }
    g.generateTexture('city', BOARD.w, BOARD.h);
    g.destroy();
    this.cityImage = this.add.image(0, 0, 'city').setOrigin(0);
    if (painted) this.cityImage.setAlpha(0.72);
    this.layers.ground.add(this.cityImage);
    const grain = this.add.tileSprite(0, 0, BOARD.w, BOARD.h, 'grain').setOrigin(0).setAlpha(painted ? 0.35 : 0.7).setBlendMode(Phaser.BlendModes.MULTIPLY);
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
