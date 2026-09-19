// After `vite build`: the per-clip voice files are the bake's cache, not
// something to ship. The game plays the sprite parts; the per-clip files
// are only a fallback for a browser without Web Audio, which is nobody now.
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'dist/voice';
let bytes = 0, n = 0;
for (const f of await readdir(dir).catch(() => [])) {
  if (!f.endsWith('.mp3')) continue;
  bytes += (await stat(join(dir, f))).size;
  await rm(join(dir, f));
  n += 1;
}
console.log(`pruned ${n} per-clip voice files (${(bytes / 1e6).toFixed(0)} MB) from dist/`);
