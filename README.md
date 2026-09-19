# The Ashgrave Files

A co-operative noir detective game that runs entirely in a browser. One to six
players work a 1940s murder case across a city map, cross suspects off a shared
deduction board, and race a clock that burns an hour for every action anyone
takes. A narrator reads the briefings, the clues and the nightly events aloud.

No build step, no dependencies, no accounts, no network calls. Three files of
markup and CSS, a folder of ES modules, and a 60-line static server that exists
only because browsers will not load modules from `file://`.

## Play it

```bash
npm start          # then open http://localhost:8080
```

Any static host works too — it is a plain folder of files, so GitHub Pages or
`npx serve` serve it just as well.

## How the game works

One of the people on your list killed somebody. Find out which, before the
night runs out.

| | |
|---|---|
| **Search a location** | Evidence tells you a fact about the **killer** — left-handed, size twelve boots, smells of machine oil. |
| **Talk to a suspect** | Standing with somebody, you choose how to play it, and they answer in character. What you get depends on the approach. |
| **The notebook** | Does the crossing-off for you. A suspect whose known trait contradicts a known fact about the killer is out of the frame. |
| **Accuse** | Costs two hours. Wrong costs three more, and they walk. |

### Three ways to ask

| | You learn | It costs you |
|---|---|---|
| **Level with them** | One thing | Nothing — they stay willing to talk |
| **Press hard** | Two things | They shut down for two rounds |
| **Ask about somebody else** | One thing about a *different* suspect | Nothing |

Both lines of the exchange are spoken aloud, the detective and the suspect in
different registers.

Each detective gets two actions a turn (three for Hale) plus one ability per
case. Every action burns an hour off the clock, and every four hours the city
does something about it — rain, a cordon, an anonymous call, a second body.

### Difficulty

| | Facts | Suspects | Hours |
|---|---|---|---|
| Rookie | 4 | 5 | 26 |
| Detective | 5 | 6 | 19 |
| Commissioner | 6 | 8 | 15 |

Because the clock counts **actions rather than rounds**, six detectives burn the
night six times faster than one. A full table is louder, not easier.

### The cases

- **The Ash and the Orchid** — a singer dies in the best suite in Ashgrave Bay.
- **Salt and Silence** — the union boss comes out of the harbour with his pockets sewn shut.
- **The Ninth Bell** — the bell rings nine at midnight and the ringer is dead by morning.

Each ships with twelve locations, eight suspects and its own map. The culprit
and the whole trait table are re-rolled from a seed every time you start, so a
case never solves the same way twice.

### Playing with friends

It is co-operative and all knowledge is shared — the notebook belongs to the
table, not to you. Pass one device around; the hand-off screen tells you whose
turn it is. Argue about the board together.

## Narration

Every briefing, clue, exchange and event is narrated. There are two ways it
can be voiced, and the game prefers the better one when it is available.

### Baked audio (recommended)

Browser speech synthesis is the weakest part of this project and there is no
fixing it from inside a browser. So the whole script is enumerable ahead of
time — `js/lines.js` collects every line the narrator can say — and
`tools/render-voices.mjs` bakes it to audio with a real model:

```bash
npm run voices -- --list-voices     # what this machine has
npm run voices                      # bake it
```

It picks the best engine present: ElevenLabs or OpenAI if you export a key,
Piper if it is on your PATH, and macOS `say` otherwise. On a Mac, install a
free Premium voice first (System Settings › Accessibility › Spoken Content ›
System Voice › Manage Voices) and pass it:

```bash
npm run voices -- --voice="Daniel (Enhanced)"
```

Clips land in `voice/` with a manifest; reload and the game uses them. Around
300 clips, roughly sixteen minutes of audio. Rendering is incremental, so a
rerun only does what changed, and a half-finished render still works — the
game falls back per line.

The trick that makes this possible is that composite lines are narrated as
**fragments**. "Vera Lang strikes the match left-handed" would need every name
times every tell — thousands of files. Split into `["Vera Lang", "strikes the
match left-handed"]` it is two clips from small closed sets. A test asserts
that 100% of the fragments spoken across 160 real games exist in the corpus,
so nothing falls back by accident.

### Browser speech (the fallback)

With no `voice/` directory the game synthesises, and `js/voice.js` works on
the parts that are ours:

- **Voice ranking.** Voices are scored by class (natural/neural, network,
  standard), penalised if they are known low-fidelity engines, and nudged
  toward English accents that suit the material. The best is picked
  automatically; the settings list is grouped so you can see which of yours
  are the good ones.
- **No mangling.** Pitch-shifting a neural voice is exactly what makes it
  sound synthetic, so prosody is per voice class.
- **Phrasing.** Lines are split at sentence and clause boundaries and spoken
  with silence between them, weighted by punctuation.
- **A room to speak in.** `js/audio.js` puts rain under everything and a
  precinct-radio carrier that opens with a relay click while the narrator
  talks. Dry speech in silence reads as a machine; the same speech over a
  radio in a rainy room does not.

Subtitles show every line either way.

## How it is built

```
index.html          markup shell
css/                core.css (tokens, atmosphere, components), game.css (scenes and board)
js/
  state.js          the rules engine: applyAction(state, action), pure
  rules.js          read-only questions about a state ("can this player search?")
  gen.js            case generation: culprit, trait table, evidence placement
  rng.js            seeded PRNG; every draw is a function of (seed, tick)
  traits.js         the deduction alphabet
  characters.js     the six playable detectives
  dialogue.js       how suspects answer, and what each approach costs
  events.js         what the city does every four hours
  voice.js          the narrator: voice ranking, prosody, phrase timing
  audio.js          generated rain, thunder and precinct-radio ambience
  cases/            three hand-authored cases with their maps
  ui/               app.js (controller), cartography.js, map.js, notebook.js,
                    screens.js, icons.js, fx.js
  net/              the transport seam where online play plugs in
server.js           zero-dependency static server
test/logic.test.js  headless soak tests
```

Three design decisions carry most of the weight:

Two design decisions carry most of the weight:

**Everything is drawn, nothing is loaded.** Location icons and suspect
portraits are generated SVG — a suspect's silhouette is a hash of their id, so
they look like themselves every game. So is the rain, the thunder and the radio
hiss, built from noise buffers and oscillators. There are no media assets at
all.

**The city is generated, not drawn by hand.** `ui/cartography.js` builds each
board from the case id: a ragged coastline, a river relaxed away from every
location it would otherwise drown, parks in the gaps, a skewed street grid and
a few hundred blocks, all masked to the land. It is generated rather than
authored because hand-fitting a coastline around twelve locations is fiddly and
breaks the moment one moves — and because terrain built by pushing water *away*
from the locations can never swallow one. Same case, same city, every time.

**The reducer is pure and the randomness is seeded.** `applyAction` is a
function of state and action; every random draw reads `state.seed` and
`state.tick`. An ordered list of actions therefore determines the board
completely, which is what makes multiplayer over a socket a matter of agreeing
on order rather than serialising state. See [`js/net/README.md`](js/net/README.md)
for what is left to build.

## Tests

```bash
npm test
```

Plays hundreds of complete games with a bot that only knows what a player would
know, and asserts:

- every case builds at every difficulty and every player count
- the culprit is always the **unique** fit once every fact is found — no
  unsolvable boards (fuzzed over 2,700 generated cases)
- every game terminates in a win or a loss, and the bot both wins and loses
- identical action logs produce byte-identical states (the property online play
  depends on)
- illegal actions change nothing
- every ability fires exactly once per case

## Accessibility

Keyboard navigation and focus rings throughout, map nodes reachable by tab and
activated with Enter. `prefers-reduced-motion` is honoured, and rain, grain and
the typewriter effect can be switched off under **Narration → Comfort**. All
narration is subtitled.
