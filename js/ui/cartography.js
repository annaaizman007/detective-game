// The city cartographer.
//
// The board used to be a node diagram -- circles joined by lines. This draws
// an actual map: water with a ragged coast, a river, parks, a street grid and
// several hundred city blocks, all of it on printed paper. It reads as a map
// pinned to a precinct wall, which is what the locations are pinned *to*.
//
// It is generated rather than hand-drawn, for two reasons. Hand-fitting a
// coastline around twelve locations in three cases is fiddly and breaks the
// moment a location moves; and generated terrain is guaranteed never to swallow
// a location, because the water is pushed away from them by construction.
// Everything derives from the case id, so a city looks the same every time.

import { stream } from '../rng.js';

export const BOARD = { w: 1180, h: 880 };

// The city proper sits inside this inset; the rest is coast, park and margin.
// A coastal case needs a deep foot for the water; an inland one would just be
// staring at blank paper, so it gets the space back.
const inset = (hasSea) => ({ left: 92, right: 92, top: 74, bottom: hasSea ? 196 : 104 });

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return dist(px, py, ax + t * dx, ay + t * dy);
}

/**
 * Case coordinates are authored in a 1000x700 space. Fit them into the board's
 * inset so there is room for terrain around and below the city.
 */
export function makeProjection(locations, hasSea = true) {
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
  const px = (x) => x * s + offX;
  const py = (y) => y * s + offY;
  return { px, py, s, project: (l) => ({ ...l, px: px(l.x), py: py(l.y) }) };
}

const round = (n) => Math.round(n * 10) / 10;
const toPath = (pts, close) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${round(p[0])} ${round(p[1])}`).join('') + (close ? 'Z' : '');

/** A ragged shoreline across the foot of the board, always clear of the city. */
function coastline(rng, pts, baseline, clearance) {
  const line = [];
  const steps = 46;
  for (let i = 0; i <= steps; i++) {
    const x = (BOARD.w / steps) * i;
    // Two octaves of wobble so the coast has both bays and small detail.
    let y = baseline
      + Math.sin(i * 0.41 + rng.float() * 0.2) * 22
      + Math.sin(i * 1.13) * 9
      + (rng.float() - 0.5) * 7;
    // Never let the sea reach a location.
    for (const p of pts) {
      const gap = y - p.py;
      if (gap < clearance) y = p.py + clearance;
    }
    line.push([x, Math.min(BOARD.h - 26, y)]);
  }
  return line;
}

/** A river pushed out of the way of every location it would otherwise drown. */
function riverPath(rng, pts, fromX, toPoint) {
  const steps = 26;
  const spine = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + (toPoint[0] - fromX) * t + Math.sin(t * 3.1) * 70;
    const y = -20 + (toPoint[1] + 20) * t + Math.sin(t * 4.7 + 1) * 26;
    spine.push([x, y]);
  }
  // Relax: shove each sample away from any location within reach.
  for (let pass = 0; pass < 14; pass++) {
    for (let i = 1; i < spine.length - 1; i++) {
      for (const p of pts) {
        const d = dist(spine[i][0], spine[i][1], p.px, p.py);
        if (d < 74 && d > 0.01) {
          const push = (74 - d) * 0.5;
          spine[i][0] += ((spine[i][0] - p.px) / d) * push;
          spine[i][1] += ((spine[i][1] - p.py) / d) * push;
        }
      }
      // Keep it smooth after all that shoving.
      spine[i][0] = (spine[i][0] * 2 + spine[i - 1][0] + spine[i + 1][0]) / 4;
      spine[i][1] = (spine[i][1] * 2 + spine[i - 1][1] + spine[i + 1][1]) / 4;
    }
  }
  return spine;
}

/** Thicken a polyline into a closed band, so a river can be filled as water. */
function bandFromSpine(spine, halfWidth) {
  const left = [];
  const right = [];
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

function blobAt(rng, cx, cy, r) {
  const pts = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const rr = r * (0.7 + rng.float() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.78]);
  }
  return pts;
}

export function buildCity(caseDef, projected) {
  const rng = stream(`map:${caseDef.id}`);
  const t = caseDef.terrain || {};
  const INSET = inset(t.sea !== false);
  const maxY = Math.max(...projected.map((p) => p.py));

  // --- water ------------------------------------------------------------
  const shore = t.sea === false ? null : coastline(rng, projected, maxY + 96, 66);
  const sea = shore
    ? toPath([...shore, [BOARD.w, BOARD.h], [0, BOARD.h]], true)
    : null;
  const shoreLine = shore ? toPath(shore, false) : null;
  // A second, slacker line inside the water: the cartographer's depth mark.
  const shoreEcho = shore
    ? toPath(shore.map(([x, y], i) => [x, y + 13 + Math.sin(i * 0.7) * 3]), false)
    : null;

  let river = null;
  if (t.river) {
    const mouth = shore
      ? shore[Math.floor(shore.length * (t.riverMouth ?? 0.62))]
      : [BOARD.w * 0.7, BOARD.h - 40];
    const spine = riverPath(rng, projected, BOARD.w * (t.riverSource ?? 0.28), mouth);
    river = { fill: toPath(bandFromSpine(spine, 17), true), spine: toPath(spine, false) };
  }

  let lake = null;
  if (t.lakeAt) {
    const anchor = projected.find((p) => p.id === t.lakeAt);
    if (anchor) lake = toPath(blobAt(rng, anchor.px + 96, anchor.py + 54, 74), true);
  }

  // --- parks: green where the city has room -----------------------------
  const parks = [];
  for (let tries = 0; tries < 420 && parks.length < (t.parks ?? 2); tries++) {
    const cx = 120 + rng.float() * (BOARD.w - 240);
    const cy = INSET.top + rng.float() * (maxY - INSET.top);
    if (projected.some((p) => dist(cx, cy, p.px, p.py) < 118)) continue;
    if (parks.some((p) => dist(cx, cy, p.cx, p.cy) < 230)) continue;
    const r = 52 + rng.float() * 26;
    parks.push({ cx, cy, r, path: toPath(blobAt(rng, cx, cy, r), true) });
  }

  // --- the street grid --------------------------------------------------
  // Two skewed families of long streets, so the city has a grain without
  // looking like graph paper.
  const streets = [];
  const skew = -0.16 + rng.float() * 0.32;
  for (let i = -6; i < 26; i++) {
    const x = i * 58 + rng.float() * 16;
    streets.push([[x, -40], [x + BOARD.h * skew, BOARD.h + 40]]);
  }
  for (let i = -4; i < 20; i++) {
    const y = i * 56 + rng.float() * 14;
    streets.push([[-40, y], [BOARD.w + 40, y + BOARD.w * skew * 0.4]]);
  }
  const minorStreets = streets.map(([a, b]) => toPath([a, b], false));

  // --- city blocks ------------------------------------------------------
  const blocks = [];
  for (let tries = 0; tries < 2600 && blocks.length < 260; tries++) {
    const x = rng.float() * BOARD.w;
    const y = rng.float() * (maxY + 70);
    if (projected.some((p) => dist(x, y, p.px, p.py) < 46)) continue;
    if (parks.some((p) => dist(x, y, p.cx, p.cy) < p.r + 12)) continue;
    blocks.push({
      x: round(x), y: round(y),
      w: round(11 + rng.float() * 26),
      h: round(9 + rng.float() * 20),
      r: round(skew * -34 + (rng.float() - 0.5) * 7),
    });
  }

  // --- labels the cartographer would have set in italic ------------------
  const labels = [];
  if (shore && t.seaName) labels.push({ text: t.seaName, x: BOARD.w * 0.5, y: BOARD.h - 52, size: 30, kind: 'water' });
  if (lake && t.lakeName) {
    const anchor = projected.find((p) => p.id === t.lakeAt);
    labels.push({ text: t.lakeName, x: anchor.px + 96, y: anchor.py + 58, size: 17, kind: 'water' });
  }
  (t.districts || []).forEach((d) => labels.push({ ...d, kind: 'district', size: d.size || 22 }));

  return { sea, shoreLine, shoreEcho, river, lake, parks, minorStreets, blocks, labels, maxY };
}

export { segDist };
