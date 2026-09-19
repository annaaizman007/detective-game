// Dumps each city's generated geometry (the same cartography the board
// draws) as JSON, so tools/paint-maps.py can paint it.
//   npx vite-node tools/map-geometry.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { CASES } from '../src/game/cases/index';
import { makeProjection, buildCity } from '../src/scenes/cartography';
import { BOARD } from '../src/config/constants';

mkdirSync('tools/maps', { recursive: true });
for (const c of CASES) {
  const proj = makeProjection(c.locations, c.terrain?.sea !== false);
  const placed = c.locations.map(proj.project);
  const city = buildCity(c, placed, proj);
  const hidden = new Set(c.locations.filter((l) => l.hidden).map((l) => l.id));
  const pos = Object.fromEntries(placed.map((p) => [p.id, [p.px, p.py]]));
  const roads = c.edges.filter(([a, b]) => !hidden.has(a) && !hidden.has(b)).map(([a, b]) => [pos[a], pos[b]]);
  const out = { w: BOARD.w, h: BOARD.h, ...city, roads, locations: placed.map((p) => ({ id: p.id, x: p.px, y: p.py, type: p.type, hidden: !!p.hidden })) };
  writeFileSync(`tools/maps/${c.id}.json`, JSON.stringify(out));
  console.log(c.id, 'blocks', city.blocks.length, 'streets', city.streets.length, 'sea', !!city.sea, 'river', !!city.river);
}
