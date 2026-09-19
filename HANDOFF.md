# Handoff — The Ashgrave Files

Last updated 2026-09-19 (evening). Everything below is committed on `master`
(mirrored on `claude/browser-detective-game-gwbcny`). This file exists so
anyone can pick the project up without reading a conversation.

---

## 1. Get it running

```bash
git clone https://github.com/annaaizman007/detective-game
cd detective-game
npm install
npm run dev                   # http://localhost:5173
npm test                      # 20 checks, ~15 s
npm run build                 # static dist/
```

Vite 5 + TypeScript (strict) + Phaser 3.90, on the `web-game` skill's
scaffold. Node 18+. Python 3 with `diffusers`, `torch` (MPS) and `Pillow`
for the art pipeline; `ffmpeg` for the opening film and audio loops.

## 2. What it is

A co-operative detective board game for one to six players around one
device. Four cases (`src/game/cases/`), thirty streets each, ~2 hours at
a table. Each case has a fixed culprit; the proof (a dealt trait table and
where the evidence lies) shuffles per seed. Every find is a document you
open and read; the notebook only crosses people off from your own marks.

Cases two to four are the hard ones. They have **hidden places** (not on
the map until a conversation, paper or object reveals them) and **hidden
people** (not in the frame until named; in *The Lamplighter* the killer is
one). Questions are **gated** (`needs:` on a topic — a document, an object,
or `person.topic` already asked) so nobody hands you a fact before you have
the paper. When every visible name is crossed off, the notebook says
somebody is missing.

Engine: a pure seeded reducer (`src/game/state.ts`, `applyAction`), saves
are action logs, replays are byte-identical (tested).

## 3. Where things live

| Thing | Where |
|---|---|
| Cases: locations, suspects, witnesses, items, objects, story, the opening call | `src/game/cases/{orchid,salt,bell,lamp}.ts` |
| Per-city clue documents (24 each; Orchid uses the shared set) | `src/game/cases/{salt,bell,lamp}-clues.ts`, `src/game/exhibits.ts` |
| Hidden/reveal mechanics, question gating | `reveal()`, `hasNeed()` in `src/game/state.ts`; `knownSuspects`, `openLocations`, `everyoneCrossedOff` in `rules.ts` |
| Painted city maps (img2img over the drawn one) | `tools/map-geometry.ts` → `tools/paint-maps.py` → `public/assets/images/maps/` |
| Trait table, tells | `src/game/traits.ts`; pins per suspect in `SuspectDef.traits` |
| Search narrative (where you looked / what looked off) | `src/game/search.ts` |
| Voice corpus (every spoken line, enumerable) | `src/game/lines.ts` |
| UI: controller, screens, dialogue, locker, journal | `src/ui/app.ts`, `screens.ts`, `dialogue.ts`, `exhibits.ts`, `journal.ts` |
| Opening film + drawn fallback | `src/ui/intro.ts`, `tools/make-intro.py`, `public/assets/video/` |
| Board (Phaser): map, pins, facades, cinematic drift | `src/scenes/board-scene.ts`, `preload-scene.ts` |
| Audio: rain/fire recordings, generative band, foley | `src/systems/audio-manager.ts`, `synth-music.ts`, `foley.ts` |
| Narrator (baked clips → sprites) | `src/systems/narrator.ts` |

## 4. The art pipeline (local Stable Diffusion, DreamShaper 8)

```bash
npx vite-node tools/portrait-prompts.mjs        # writes people/prompts.json (casting notes inside the script)
python3 tools/render-portraits.py               # renders missing portraits → public/assets/images/people/<id>.jpg
python3 tools/render-portraits.py --force --only ledoux,vera   # re-render some
npx vite-node tools/building-prompts.mjs        # facades (landmark overrides inside)
python3 tools/render-portraits.py --dir public/assets/images/buildings --size 640x448 --steps 26
```

Portraits are 512², facades 640×448, all JPEG q90. Nobody smokes unless
listed in `SMOKES` in the prompt script (phrased as "held between two
fingers", or the model paints cigarettes floating in the air). `people.json` /
`manifest.json` list what exists; the SVG fallbacks in `src/ui/portraits.ts`
and `src/ui/buildings.ts` draw anything missing. Hair and build in the
notebook are pinned to the paintings (`traits:` on each suspect) — if you
re-render a suspect with different hair, change the pin.

The opening film (the squad room: the detectives at the table, a man
running the corridor, the door flung open, the sergeant telling it):
`tools/intro2/prompts.json` → `python3 tools/render-portraits.py --dir
tools/intro2 --size 896x512 --steps 34` → `python3 tools/make-intro.py`
(Ken Burns, crossfades, hand-held shake, grain, synthesised foley) →
`public/assets/video/intro.mp4`. If a browser will not run the soundtrack
the film goes muted and the room's foley stands in.

The map is drawn as a model city (`bakeCity` in `src/scenes/board-scene.ts`):
dense extruded buildings on a grid with roofs and lit/shadowed faces, kept
off the water, the parks, the streets, the roads and the facade plates;
bridges only where a street meets water (cartography decides).

## 5. The narrator

Kokoro (local) bakes every line in the corpus. Women speak in `bf_emma`
(their lines are separate clips, id = hash of `f|text`); men and the
narrator share `bm_george`. Narration is **on request** by default: the
speaker button on the subtitle bar, on every answer and every paper plays
the last thing said; Settings → "When the narrator speaks" switches to
reading everything.

```bash
npm run voices -- --setup     # once: pip installs kokoro-onnx, downloads ~340 MB
npm run voices                # incremental; ~3000 clips, sprite parts under 15 min each
```

The per-clip files in `public/voice/` are gitignored; the manifest and the sprite parts are committed (force-added) so a clone has the voice. Re-bake after any text change; the corpus
test fails if a spoken fragment is not enumerable. There is no browser
speech fallback once a pack exists (Anna's rule: never the robot voice).

## 6. Serving and sharing

- Local: `npm run dev`.
- Her machine, on Tailscale: `node tools/serve-dist.mjs` (127.0.0.1:4173) +
  `tailscale serve --bg 4173` → https://annas-macbook-pro.tail2143ad.ts.net/
  Rebuild with `npm run build`; the server serves `dist/` directly.
- Public without Tailscale on the other end: `tailscale funnel --bg 4173`
  (same URL, open to the internet; `tailscale funnel --bg off` to close).
- **GitHub Pages (the link to give people):** https://annaaizman007.github.io/detective-game/
  Rebuilt from `master` by `.github/workflows/pages.yml` on every push
  (or by hand: push `dist/` to the `gh-pages` branch).
- **Offline zip:** `npm run zip` → `build/the-ashgrave-files.zip` (game +
  "Play on Mac.command" / "Play on Windows.bat"). Uploaded as a release:
  https://github.com/annaaizman007/detective-game/releases
- Claude artifact: https://claude.ai/artifact/U3tLGyS5AmBU12M345ogWK —
  publish `dist/artifact.html` (from `node tools/artifact-wrapper.mjs`) with
  `dist/assets/*`, `public/assets/*` and `public/voice/*` as files, in
  chunks under 64 MB per version.

The game is pass-the-device; there is no online play yet (`src/net/` holds
the seam and a plan).

## 7. Writing rules (from Anna, 2026-09-19)

- Plain, complete sentences. No noir fragments. A first-time player must
  understand what just happened.
- Every artifact says how it was found: the found screen, the paper's "How
  it came to hand", the journal entry with a link.
- Not every place has something.
- Painted 1950s pulp art for people and buildings, not paper dolls.
- Fix the story first (one true minute-by-minute timeline per case), then
  write witnesses from it. `REVIEW.md` is the audit that found the gaps and
  the record of how they were closed.

## 8. Not done, in the order I would do them

1. Play-test all four cases end to end at a table; tune the timeline and
   the ~75–80 % bot win rate (`test/logic.test.ts` has the bot).
2. Online multiplayer (a ~60-line ws relay and a lobby; see `src/net/README.md`).
3. A fourth case. One file in `src/game/cases/` plus its `-clues.ts`; the
   tests catch a disconnected map, an unsolvable board, a missing exhibit.
4. Reduce voice pack size (opus/lower bitrate) so the artifact publish is one
   version instead of three.
5. Rookie/Detective drop suspects from the roster but the remaining topics
   still name them; harmless, could be filtered.

## 9. Known rough edges

- Portrait prompts longer than 77 CLIP tokens are truncated (a warning in
  the render log); keep casting notes short.
- With no voice pack the console logs a 404 for `voice/manifest.json`.
- The service worker caches aggressively; hard-reload after a rebuild.
