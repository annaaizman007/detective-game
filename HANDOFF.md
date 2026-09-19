# Handoff — continuing on a Mac

Everything below has been pushed. This file exists so you can pick the project
up locally without reading back through a conversation.

---

## 1. Get it

The repository was empty when this started, so GitHub made the working branch
the **default branch**. There is no `main` and no pull request — a clone gives
you the right code immediately.

```bash
git clone https://github.com/annaaizman007/detective-game
cd detective-game
```

Confirm you are on the branch (you will be, it is the default):

```bash
git branch --show-current     # claude/browser-detective-game-gwbcny
```

There are **no dependencies to install**. Node 18+ is the only requirement.

```bash
npm start                     # http://localhost:8080
npm test                      # 12 checks, a few seconds
```

If you would rather the branch were called `main`, rename it on GitHub under
Settings › General › Default branch, then `git fetch && git checkout main`.

---

## 2. The one thing worth doing first: a real narrator

This is the open complaint, and on a Mac it is about five minutes of work.

Browser speech synthesis cannot be made to sound good from inside a browser —
the synthesiser belongs to macOS, not to the page. So the game can instead
play **pre-rendered audio**, baked once by a proper voice.

**Step 1 — install a good voice.** The ones macOS ships with by default are the
old robotic set. The good ones are free and have to be downloaded:

> System Settings › Accessibility › Spoken Content › System Voice ›
> Manage Voices… › English — download one marked **Premium** (best) or
> **Enhanced**. *Daniel* (British) and *Oliver* suit this game.

**Step 2 — see what you now have:**

```bash
npm run voices -- --list-voices
```

It prints the Premium/Enhanced voices first. If that list is empty, step 1 did
not take.

**Step 3 — bake the narration:**

```bash
npm run voices -- --voice="Daniel (Premium)"
```

About 300 clips, roughly sixteen minutes of audio, a few minutes to render.
It is incremental — rerunning only does what changed — and concurrent.

**Step 4 — reload the game.** It finds `voice/manifest.json` on its own and
uses the recordings. There is a toggle under the badge icon › Narration if you
ever want the synthesised voice back.

### If you want better than macOS

The same command takes other engines, chosen automatically if a key is set:

```bash
export OPENAI_API_KEY=sk-...        # then: npm run voices
export ELEVENLABS_API_KEY=...       # best quality, costs per character
npm run voices -- --engine=piper --voice=/path/to/en_GB-alan-medium.onnx
```

`npm run voices -- --list` prints the whole script without rendering anything,
if you want to read what the narrator says before paying for it.

### Why this was not done for you

The cloud sandbox this was built in cannot reach HuggingFace, so no neural
voice model could be downloaded there. The pipeline and the playback path are
both finished and tested (against generated test tones); the only step left is
running it somewhere with a model, which is your Mac.

---

## 3. Publishing changes to the shared link

The game is published as a private page:

**https://claude.ai/artifact/U3tLGyS5AmBU12M345ogWK**

It is currently at version 4 and is **private** — friends cannot open it until
you share it from the page's Share menu.

The published page is a small wrapper (artifacts supply their own
`<head>`/`<body>`, so `index.html` cannot be published as-is) plus the `css/`
and `js/` files. To push new code to it, ask Claude in a session to republish
that URL with the changed files.

Two constraints worth knowing before you plan anything around it:

- **The artifact blocks outbound network calls.** No TTS API, no model
  download, no fetching anything. That is why baked audio is the only way to
  get a good voice onto the hosted link.
- **A published artifact takes at most 255 files.** The voice pack is ~300
  clips, so hosting it needs the clips concatenated into a handful of sprite
  files with offsets in the manifest. That change is contained to
  `tools/render-voices.mjs` and the playback block in `js/voice.js`, and has
  not been done. Locally there is no limit, so `npm start` is unaffected.

---

## 4. What the code is

```
index.html            the page (local play)
css/core.css          tokens, atmosphere, shared components
css/game.css          scenes and the board
js/
  state.js            the rules engine: applyAction(state, action), pure
  rules.js            read-only questions ("can this player search?")
  gen.js              case generation: culprit, trait table, evidence
  rng.js              seeded PRNG; every draw is a function of (seed, tick)
  traits.js           the deduction alphabet
  characters.js       the six detectives
  dialogue.js         what suspects say, and what each approach costs
  events.js           what the city does every four hours
  lines.js            every line the narrator can say, and its clip id
  voice.js            narrator: clip playback, voice ranking, prosody
  audio.js            generated rain, thunder, precinct radio
  cases/              three cases with their maps and terrain
  ui/cartography.js   generates each city: coast, river, parks, blocks
  ui/map.js           draws the board, pan/zoom, tokens
  ui/app.js           the controller; all interaction is delegated here
  ui/…                notebook, screens, icons, fx
  net/                the seam where online multiplayer plugs in
tools/render-voices.mjs   bakes the narration to audio
test/logic.test.js        headless soak tests
server.js                 zero-dependency static server
```

Three things hold the design together:

1. **`applyAction` is pure and randomness is seeded.** Every draw reads
   `state.seed` and `state.tick`, so an ordered action log fully determines
   the board. Online play is therefore a matter of agreeing on order, not
   serialising state — see `js/net/README.md` for what remains.
2. **Nothing is loaded.** Icons, portraits, the city map, the rain and the
   radio are all generated. There are no media assets in the repository.
3. **The narration script is finite**, which is what makes baking it possible.
   Composite lines carry a `parts` array so they can be assembled from clips.

---

## 5. State of play

**Done**

- Three cases, twelve locations and eight suspects each, culprit and trait
  table re-rolled from a seed every playthrough.
- Printed city map, generated per case, pan and pinch zoom.
- Conversations with three approaches, both halves spoken.
- Six detectives, passives and one ability each.
- Rain, thunder and radio, synthesised; narration with voice ranking and
  phrasing, plus the baked-audio pipeline above.
- 1–6 players pass-and-play with a hand-off screen; responsive to phone width;
  keyboard accessible; honours `prefers-reduced-motion`.
- 12 tests: solvability fuzzed over 2,700 generated boards, termination,
  determinism, illegal-action rejection, ability limits, approach mechanics,
  and 100% narration coverage. Difficulty measured at ~98/81/56% bot win rate,
  flat from one to six players.

**Not done, in the order I would do them**

1. **Bake the voice** (section 2). Biggest single improvement left.
2. **Sprite the voice pack** so the hosted link gets it too (section 3).
3. **Online multiplayer.** The reducer and transport seam are ready; what is
   missing is a ~60-line `ws` relay and a lobby screen. `js/net/README.md`
   spells it out.
4. **More cases.** A case is one file in `js/cases/` — locations with x/y,
   edges, suspects with motives, a briefing, terrain flags. The generator and
   the cartographer handle the rest, and the tests will tell you immediately
   if a map is disconnected or a board unsolvable.

**Known rough edges**

- With no voice pack, the console logs a 404 for `voice/manifest.json` on
  load. It is handled and harmless — the game just checks whether a pack
  exists — but it looks like an error in devtools.
- The notebook table scrolls sideways on narrow panels at the harder
  difficulties, where there are six trait columns. There is a fade on the edge
  to signal it, but it is not ideal.
- The hand-off screen does not hide the board, because the game is
  co-operative and all knowledge is shared. If you ever add hidden roles, that
  screen needs to become opaque.
