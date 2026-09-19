// The city cartographer.
//
// Draws an actual map -- water with a ragged coast, a river, parks, a street
// grid and several hundred city blocks -- generated rather than hand-drawn.
// Hand-fitting a coastline around thirty locations is fiddly and breaks the
// moment a location moves; generated terrain is guaranteed never to swallow
// a location, because the water is pushed away from them by construction.
// Everything derives from the case id, so a city looks the same every time.
//
// Output is geometry (point lists), not markup, so the board scene can hand
// it straight to Phaser's Graphics.

import type { CaseDef, LocationDef } from '../types/game-types';
import { stream, type Stream } from '../game/rng';
import { BOARD } from '../config/constants';
import { dist } from '../utils/math-utils';

export type Pt = [number, number];

export interface Placed extends LocationDef { px: number; py: number }

export interface Projection {
  px: (x: number) => number;
  py: (y: number) => number;
  s: number;
  project: (l: LocationDef) => Placed;
}

export interface Block { x: number; y: number; w: number; h: number; r: number }
export interface Park { cx: number; cy: number; r: number; pts: Pt[] }
export interface Label { text: string; x: number; y: number; size: number; kind: 'water' | 'district'; rot?: number }

export interface Bridge { x: number; y: number; angle: number; len: number }
export interface Rail { line: Pt[]; stations: Pt[] }

export interface City {
  sea: Pt[] | null;
  shore: Pt[] | null;
  shoreEcho: Pt[] | null;
  river: { band: Pt[]; spine: Pt[] } | null;
  lake: Pt[] | null;
  parks: Park[];
  /** The grid: every street, as a segment. */
  streets: [Pt, Pt][];
  /** The two or three diagonal avenues the grid was cut by. */
  avenues: [Pt, Pt][];
  blocks: Block[];
  bridges: Bridge[];
  rail: Rail | null;
  labels: Label[];
  maxY: number;
}

// The city proper sits inside this inset; the rest is coast, park and margin.
const inset = (hasSea: boolean) => ({ left: 160, right: 160, top: 130, bottom: hasSea ? 360 : 190 });

/**
 * Case coordinates are authored in a nominal 1000x700 space (larger cases
 * simply use more of it). Fit them into the board's inset so there is room
 * for terrain around and below the city.
 */
export function makeProjection(locations: LocationDef[], hasSea = true): Projection {
  const INSET = inset(hasSea);
  const xs = locations.map((l) => l.x);
  const ys = locations.map((l) => l.y);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs);
  const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  const boxW = BOARD.w - INSET.left - INSET.right;
  const boxH = BOARD.h - INSET.top - INSET.bottom;
  const s = Math.min(boxW / Math.max(1, x1 - x0), boxH / Math.max(1, y1 - y0));
  const offX = INSET.left + (boxW - (x1 - x0) * s) / 2 - x0 * s;
  const offY = INSET.top + (boxH - (y1 - y0) * s) / 2 - y0 * s;
  const px = (x: number) => x * s + offX;
  const py = (y: number) => y * s + offY;
  return { px, py, s, project: (l) => ({ ...l, px: px(l.x), py: py(l.y) }) };
}

/** A ragged shoreline across the foot of the board, always clear of the city. */
function coastline(rng: Stream, pts: Placed[], baseline: number, clearance: number): Pt[] {
  const line: Pt[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const x = (BOARD.w / steps) * i;
    let y = baseline
      + Math.sin(i * 0.41 + rng.float() * 0.2) * 44
      + Math.sin(i * 1.13) * 18
      + (rng.float() - 0.5) * 14;
    for (const p of pts) {
      const gap = y - p.py;
      if (gap < clearance && Math.abs(p.px - x) < clearance * 1.6) y = p.py + clearance;
    }
    line.push([x, Math.min(BOARD.h - 50, y)]);
  }
  // Smooth the clearance kinks out.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < line.length - 1; i++) line[i][1] = (line[i - 1][1] + line[i][1] * 2 + line[i + 1][1]) / 4;
  }
  return line;
}

/** A river pushed out of the way of every location it would otherwise drown. */
function riverPath(rng: Stream, pts: Placed[], fromX: number, toPoint: Pt): Pt[] {
  const steps = 34;
  const spine: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + (toPoint[0] - fromX) * t + Math.sin(t * 3.1) * 140;
    const y = -40 + (toPoint[1] + 40) * t + Math.sin(t * 4.7 + 1) * 52;
    spine.push([x, y]);
  }
  for (let pass = 0; pass < 16; pass++) {
    for (let i = 1; i < spine.length - 1; i++) {
      for (const p of pts) {
        const d = dist(spine[i][0], spine[i][1], p.px, p.py);
        if (d < 150 && d > 0.01) {
          const push = (150 - d) * 0.5;
          spine[i][0] += ((spine[i][0] - p.px) / d) * push;
          spine[i][1] += ((spine[i][1] - p.py) / d) * push;
        }
      }
      spine[i][0] = (spine[i][0] * 2 + spine[i - 1][0] + spine[i + 1][0]) / 4;
      spine[i][1] = (spine[i][1] * 2 + spine[i - 1][1] + spine[i + 1][1]) / 4;
    }
  }
  void rng;
  return spine;
}

/** Thicken a polyline into a closed band, so a river can be filled as water. */
function bandFromSpine(spine: Pt[], halfWidth: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = halfWidth * (0.75 + 0.5 * (i / spine.length)); // widens toward the sea
    left.push([spine[i][0] + nx * w, spine[i][1] + ny * w]);
    right.unshift([spine[i][0] - nx * w, spine[i][1] - ny * w]);
  }
  return [...left, ...right];
}

function blobAt(rng: Stream, cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const rr = r * (0.7 + rng.float() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.78]);
  }
  return pts;
}

function segDistPt(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len)) : 0;
  return dist(px, py, a[0] + t * dx, a[1] + t * dy);
}

/** Ray-cast point in polygon. */
export function inside(pt: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function buildCity(caseDef: CaseDef, projected: Placed[], proj: Projection): City {
  const rng = stream(`map:${caseDef.id}`);
  const t = caseDef.terrain || {};
  const INSET = inset(t.sea !== false);
  const maxY = Math.max(...projected.map((p) => p.py));

  // --- water ------------------------------------------------------------
  const shore = t.sea === false ? null : coastline(rng, projected, maxY + 190, 130);
  const sea: Pt[] | null = shore ? [...shore, [BOARD.w, BOARD.h], [0, BOARD.h]] : null;
  const shoreEcho: Pt[] | null = shore ? shore.map(([x, y], i) => [x, y + 26 + Math.sin(i * 0.7) * 6]) : null;

  let river: City['river'] = null;
  if (t.river) {
    const mouth: Pt = shore ? shore[Math.floor(shore.length * (t.riverMouth ?? 0.62))] : [BOARD.w * 0.7, BOARD.h - 80];
    const spine = riverPath(rng, projected, BOARD.w * (t.riverSource ?? 0.28), mouth);
    river = { band: bandFromSpine(spine, 34), spine };
  }

  let lake: Pt[] | null = null;
  if (t.lakeAt) {
    const anchor = projected.find((p) => p.id === t.lakeAt);
    if (anchor) lake = blobAt(rng, anchor.px + 190, anchor.py + 110, 150);
  }
  const water: Pt[][] = [sea, river?.band ?? null, lake].filter((p): p is Pt[] => !!p);
  const wet = (x: number, y: number) => water.some((poly) => inside([x, y], poly));

  // --- parks: green where the city has room -----------------------------
  const parks: Park[] = [];
  for (let tries = 0; tries < 600 && parks.length < (t.parks ?? 2); tries++) {
    const cx = 240 + rng.float() * (BOARD.w - 480);
    const cy = INSET.top + rng.float() * (maxY - INSET.top);
    if (projected.some((p) => dist(cx, cy, p.px, p.py) < 240)) continue;
    if (parks.some((p) => dist(cx, cy, p.cx, p.cy) < 460)) continue;
    if (wet(cx, cy)) continue;
    const r = 105 + rng.float() * 52;
    parks.push({ cx, cy, r, pts: blobAt(rng, cx, cy, r) });
  }

  // --- the street grid --------------------------------------------------
  // A Chicago grid: north-south and east-west streets on a regular pitch,
  // cut by a couple of diagonal avenues. The pitch is what makes it read as
  // a plan of a city rather than a diagram.
  const PX = 124; const PY = 108;
  const xs: number[] = []; const ys: number[] = [];
  for (let x = 40 + rng.int(30); x < BOARD.w; x += PX) xs.push(x);
  for (let y = 30 + rng.int(30); y < BOARD.h; y += PY) ys.push(y);
  const streets: [Pt, Pt][] = [];
  for (const x of xs) streets.push([[x, -80], [x, BOARD.h + 80]]);
  for (const y of ys) streets.push([[-80, y], [BOARD.w + 80, y]]);
  const avenues: [Pt, Pt][] = [];
  const nAv = 2 + rng.int(2);
  for (let i = 0; i < nAv; i++) {
    const fromLeft = rng.float() < 0.5;
    const x0 = fromLeft ? -60 : BOARD.w + 60;
    const y0 = rng.float() * BOARD.h * 0.5;
    const x1 = fromLeft ? BOARD.w + 60 : -60;
    const y1 = y0 + (rng.float() < 0.5 ? 1 : -1) * (BOARD.w * (0.3 + rng.float() * 0.35));
    avenues.push([[x0, y0], [x1, y1]]);
  }

  // --- city blocks: the cells between the streets, minus what is in the way
  const blocks: Block[] = [];
  const STREET = 14; // half width of a street, in the plan
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + STREET; const x1 = xs[i + 1] - STREET;
      const y0 = ys[j] + STREET; const y1 = ys[j + 1] - STREET;
      if (y0 > maxY + 160) continue;
      // Split each cell into two or three lots so the texture is fine-grained.
      const lots = 1 + rng.int(3);
      for (let k = 0; k < lots; k++) {
        const lx0 = x0 + ((x1 - x0) * k) / lots + 3;
        const lx1 = x0 + ((x1 - x0) * (k + 1)) / lots - 3;
        const cx = (lx0 + lx1) / 2; const cy = (y0 + y1) / 2;
        if (projected.some((p) => Math.abs(cx - p.px) < 100 && Math.abs(cy - p.py) < 90)) continue;
        if (parks.some((p) => dist(cx, cy, p.cx, p.cy) < p.r + 30)) continue;
        if (wet(lx0, y0) || wet(lx1, y1) || wet(lx0, y1) || wet(lx1, y0) || wet(cx, cy)) continue;
        if (avenues.some(([a, b]) => segDistPt(cx, cy, a, b) < 34)) continue;
        // Skip a few lots outright: vacant ground, rail yards, the odd gap.
        if (rng.float() < 0.08) continue;
        blocks.push({ x: Math.round(lx0), y: Math.round(y0), w: Math.round(lx1 - lx0), h: Math.round(y1 - y0), r: 0 });
      }
    }
  }

  // --- bridges: where an east-west or north-south street crosses the river
  const bridges: Bridge[] = [];
  if (river) {
    const spine = river.spine;
    const onSpine = (px: number, py: number) => spine.reduce((best, p) => Math.min(best, dist(px, py, p[0], p[1])), Infinity);
    for (const [a, b] of streets) {
      const vertical = a[0] === b[0];
      // Walk the street; the first point closest to the spine is the crossing.
      let best: Pt | null = null; let bestD = 40;
      for (let t = 0; t <= 1; t += 0.004) {
        const x = a[0] + (b[0] - a[0]) * t; const y = a[1] + (b[1] - a[1]) * t;
        if (x < 0 || x > BOARD.w || y < 0 || y > maxY + 200) continue;
        const d = onSpine(x, y);
        if (d < bestD) { bestD = d; best = [x, y]; }
      }
      if (best && !projected.some((p) => dist(best![0], best![1], p.px, p.py) < 120)) {
        // Only every other candidate: not every street has a bridge.
        if (rng.float() < 0.55) bridges.push({ x: best[0], y: best[1], angle: vertical ? Math.PI / 2 : 0, len: 92 });
      }
    }
  }

  // --- the El: an elevated loop around the densest quarter, with stations
  let rail: Rail | null = null;
  {
    // Densest quarter = the location with most neighbours within 320.
    const centre = projected.slice().sort((p, q) =>
      projected.filter((o) => dist(o.px, o.py, q.px, q.py) < 320).length
      - projected.filter((o) => dist(o.px, o.py, p.px, p.py) < 320).length)[0];
    if (centre) {
      const snapX = (v: number) => xs.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), xs[0]) + STREET - 4;
      const snapY = (v: number) => ys.reduce((b, y) => (Math.abs(y - v) < Math.abs(b - v) ? y : b), ys[0]) + STREET - 4;
      const L = snapX(centre.px - 260); const R = snapX(centre.px + 250);
      const T = snapY(centre.py - 220); const B = snapY(centre.py + 210);
      const line: Pt[] = [[L, T], [R, T], [R, B], [L, B], [L, T], [L, -80]];
      const stations: Pt[] = [[(L + R) / 2, T], [R, (T + B) / 2], [(L + R) / 2, B], [L, (T + B) / 2]];
      rail = { line, stations };
    }
  }

  // --- labels the cartographer would have set in italic ------------------
  const labels: Label[] = [];
  if (shore && t.seaName) labels.push({ text: t.seaName, x: BOARD.w * 0.5, y: BOARD.h - 110, size: 60, kind: 'water' });
  if (lake && t.lakeName) {
    const anchor = projected.find((p) => p.id === t.lakeAt) as Placed;
    labels.push({ text: t.lakeName, x: anchor.px + 190, y: anchor.py + 118, size: 34, kind: 'water' });
  }
  // District names are authored in case space, like the locations.
  (t.districts || []).forEach((d) => labels.push({ text: d.text, x: proj.px(d.x), y: proj.py(d.y), rot: d.rot, kind: 'district', size: d.size || 44 }));

  return { sea, shore, shoreEcho, river, lake, parks, streets, avenues, blocks, bridges, rail, labels, maxY };
}
