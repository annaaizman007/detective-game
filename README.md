# The Ashgrave Files

**Play it:** https://annaaizman007.github.io/detective-game/ · offline zip on the [releases page](https://github.com/annaaizman007/detective-game/releases).

A co-operative noir detective game that runs entirely in a browser. One to six
players work a 1940s murder case across a city of thirty streets, read the
evidence as the documents it actually is, question the people who live there,
fill in a notebook, and race a clock that burns an hour for every action anyone
takes. A narrator reads every line aloud.

Picking this up on another machine? Start with **[HANDOFF.md](HANDOFF.md)**.

## Play it

```bash
git clone https://github.com/annaaizman007/detective-game
cd detective-game
npm install
npm run dev        # http://localhost:5173
```

Node 18+ is the only requirement. `npm run build` produces a static `dist/`
that any host serves — Netlify (`netlify.toml` is included), GitHub Pages,
itch.io (`.github/workflows/deploy-itch.yml`), or `npx serve dist`. The build
is a PWA and works offline after the first visit.

## How the game works

One of the people on your list killed somebody. Find out which, before the
trail goes cold.

| | |
|---|---|
| **Search a location** | What you find is a document — a coroner's preliminary, a lab sheet, a plaster-cast card, a letter, a clipping. It goes in the **locker**, where you open and read it. Some say something about the killer; some are only paper. |
| **Ask around** | At two-thirds of the locations there is somebody who will talk: a night clerk, a wireless operator, a gravedigger. They can describe a suspect they know, or point you at a place where something was dropped. Two questions and they tire. |
| **Talk to a suspect** | Whoever you speak to is on stage, drawn large, with their lines typed underneath. You choose how to play it and they answer in character. |
| **The notebook** | Yours to fill in. Mark what the exhibits tell you about the killer; suspects whose story cannot match get crossed off — by *your* marks, so read carefully. Or turn on the assisted notebook and let the evidence fill the top row. |
| **The journal** | Every step is written down with the hour it happened. Add your own notes beside any of them and export the case file at the end. |
| **Accuse** | Costs two hours. Wrong costs three more, and they walk. |

### Three ways to ask a suspect

| | You learn | It costs you |
|---|---|---|
| **Level with them** | One thing | Nothing — they stay willing to talk |
| **Press hard** | Two things | They shut down for two rounds |
| **Ask about somebody else** | One thing about a *different* suspect | Nothing |

Each detective gets two actions a turn (three for Hale) plus one ability per
case. Every action burns an hour, and every six hours the city does something
about it — a downpour, a cordon, an anonymous call, a second body.

### Difficulty

| | Facts | Suspects | Hours |
|---|---|---|---|
| Rookie | 4 | 5 | 60 |
| Detective | 5 | 6 | 44 |
| Commissioner | 6 | 8 | 36 |

The budgets are calibrated against the test bot, which solves a board in about
thirty hours on the median. A case at a table runs a couple of hours.

## The cases

Three cities, each generated from its case file: a coast, a river, parks, a
street grid and several hundred blocks, with thirty locations pinned onto it
in five quarters.

- **The Ash and the Orchid** — a singer dies in the best suite in the city.
- **Salt and Silence** — the union boss comes out of the bay with his pockets sewn shut.
- **The Ninth Bell** — the cathedral bell rings nine at midnight; the ringer is dead by morning.
- **The Lamplighter** — three women under three dark gas lamps, and a killer who is not on the list until you dig him out of an archive.

Each case has a fixed culprit, so the story and the answer agree. What changes
every playthrough is the proof: the trait table is dealt from a seed (build and
hair are pinned to the portraits; the rest shuffles), and the evidence lands
in different places. A test asserts that exactly one suspect fits once every
fact is known.

## The people

Everyone — detectives, suspects, witnesses — is drawn from one layered figure
(`src/ui/portraits.ts`): coat, collar, head, features, hair, hat, glasses. A
suspect's portrait fills in as the table learns: hair is ink until a witness
names the colour, a scar appears when it is mentioned, the shoulders widen
when the build comes in.

## Sound

Rain, a fire in the grate, a slow band in the next room, thunder and a
precinct radio that opens with a click when the narrator starts. Rain and the
fire are recordings (`public/assets/audio/sfx/`, cut into seamless
sixty-second loops with `tools/loop-audio.sh`); the music is generated.
Drop `music/lounge.mp3` (or `.ogg`) in the same place and it is used instead.

### The narrator

Browser speech is the fallback. The real thing is baked: every line the
narrator can say is enumerable ahead of time (`src/game/lines.ts`), so
`tools/render-voices.mjs` renders the whole script with a neural model:

```bash
npm run voices -- --setup     # installs Kokoro and downloads it, once
npm run voices                # ~700 clips, a few minutes
```

Clips land in `public/voice/` with a manifest and are packed into one sprite
per group; reload and the game uses them. Composite lines are narrated as
fragments so a name times a tell is two clips, not thousands. A test asserts
100% of the fragments spoken across 160 games exist in the corpus.

## Layout

```
index.html                   the page; the Phaser canvas sits under the DOM
src/
  main.ts
  config/                    game config, asset manifest, constants
  scenes/                    boot, preload, the board, the weather; cartography
  game/                      the rules engine: pure, seeded, typed
    state.ts                 applyAction(state, action)
    rules.ts                 read-only questions about a state
    gen.ts                   case generation
    exhibits.ts              every document a find can be
    witnesses.ts             what you say to a witness
    lines.ts                 the narration corpus
    cases/                   three cities
  systems/                   audio manager, synthesised textures and music,
                             narrator, save manager, input
  ui/                        the DOM: controller, screens, dialogue, locker,
                             notebook, journal, portraits, icons
  net/                       the seam where online play plugs in
  styles/
test/logic.test.ts           the soak suite (vitest)
tools/render-voices.mjs      bakes the narration
public/                      voice pack, PWA manifest, service worker, icons
```

Three things hold the design together:

1. **`applyAction` is pure and randomness is seeded.** Every draw reads
   `state.seed` and `state.tick`, so an ordered action log fully determines
   the board. That is what the save file is, and what online play would send.
2. **Nothing is loaded.** Icons, portraits, the city map, the rain and the
   music are all generated. The only files in `public/` are ones you make.
3. **The narration script is finite**, which is what makes baking it possible.

## Tests

```bash
npm test
```

Sixteen checks: every case builds at every difficulty and player count; every
map is connected; the culprit is always the unique fit; 400 bot games all
terminate; identical action logs give byte-identical states; illegal actions
are rejected; abilities, approaches, witnesses and the locker do what they
promise; the journal is ordered; and every spoken fragment is pre-renderable.
