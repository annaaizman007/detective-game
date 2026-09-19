# Handoff — continuing on a Mac

Everything below has been committed on `claude/browser-detective-game-gwbcny`,
which is the repository's default branch. This file exists so you can pick the
project up without reading back through a conversation.

---

## 1. Get it running

```bash
git clone https://github.com/annaaizman007/detective-game
cd detective-game
npm install
npm run dev                   # http://localhost:5173
npm test                      # 16 checks, ~10 s
npm run build                 # static dist/
```

The project is Vite + TypeScript + Phaser 3, laid out on the `web-game`
skill's scaffold. Node 18+.

## 2. The narrator

The neural voice pack is baked and works. `public/voice/` is gitignored
(24 MB), so on a fresh clone:

```bash
npm run voices -- --setup     # pip installs kokoro-onnx + soundfile, downloads ~340 MB
npm run voices                # ~700 clips, a few minutes; reuses what exists
```

The manifest, the per-clip mp3s and eleven sprite files under
`public/voice/sprites/` are produced together. The game plays the sprites
through Web Audio and falls back to the per-clip files, then to browser
speech. `--voice=bm_lewis --force` re-renders with another voice;
`--list` prints the script.

Every time a spoken line is added anywhere (a case file, an exhibit, a
witness), the corpus test tells you immediately if it is not covered, and a
re-bake renders only the new lines.

## 3. What was built on 2026-09-19

- **Migration** to Vite/TS/Phaser. The engine (`src/game/`) is a faithful,
  typed port of the original reducer; the tests are the original suite plus
  six new ones.
- **Exhibits.** Every find is a document (`src/game/exhibits.ts`) drawn as
  paper in the locker (`src/ui/exhibits.ts`, figures in `src/ui/figures.ts`).
  A clue exhibit states the observation; the conclusion is the table's.
- **Witnesses** (`ASK` action) at two-thirds of the locations.
- **Case documents** — 26 per city, some with effects (`suspectTrait`,
  `lead`, `time`), most only story.
- **Thirty-location cities**, five quarters each, generated map.
- **Portraits** (`src/ui/portraits.ts`) that fill in with known traits.
- **Dialogue** presentation (`src/ui/dialogue.ts`).
- **Detective's notebook** (manual marks, cross-outs from your marks) with
  an assisted mode.
- **Journal** with notes and export; **save/resume** as an action log.
- **Room audio**: fire, generative music, file-first channels.
- **PWA** (manifest, service worker, icons), Netlify config, GitHub Actions
  build, itch.io deploy workflow.

## 4. Publishing to the shared link

The game is published as a private Claude artifact:

**https://claude.ai/artifact/U3tLGyS5AmBU12M345ogWK**

The host supplies its own `<head>`/`<body>`, so what is published is a body
fragment: `npm run build && node tools/artifact-wrapper.mjs` writes
`dist/artifact.html`, which goes up as the page with `dist/assets/*` and
`public/voice/*` as files. Ask Claude in a session to republish that URL.
Constraints: no outbound network calls from the page (so the voice must be
shipped as files, which it is), 255 files and 64 MB per version.

## 5. Not done, in the order I would do them

1. **Real recordings for rain and fire.** The synthesised versions are
   decent; a CC0 recording is better. Drop `rain.ogg` and `fire.ogg` into
   `public/assets/audio/sfx/` and they are used automatically.
2. **Online multiplayer.** `src/net/transport.ts` has the seam and
   `src/net/README.md` the plan: a ~60-line `ws` relay and a lobby screen.
3. **More cases.** One file in `src/game/cases/`. The tests catch a
   disconnected map, an unsolvable board, a witness at an unknown location.
4. **Character art polish.** The paper-doll system works; more hair and hat
   variants and per-character colour would go a long way.

## 6. Known rough edges

- With no voice pack the console logs a 404 for `voice/manifest.json`.
  Handled, harmless.
- The notebook table scrolls sideways at six trait columns on narrow panels.
- The hand-off curtain does not hide the board: all knowledge is shared.
- Phaser's first-boot needs explicit pixel dimensions (see
  `src/config/game-config.ts`); a percentage resolves to 0×0 on a fixed parent.
