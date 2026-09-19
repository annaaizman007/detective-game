# QA — cases 2 to 4

*Salt and Silence*, *The Ninth Bell*, *The Lamplighter*. Reviewed 2026-09-19 at
commit `c5e7f09` (the working tree; the fourth case and the hidden-people
engine are in). Every suspect, witness, document, object, timeline and gate
was read; three bots were run across every difficulty and table size to
measure how hard each case actually is. Art is out of scope.

> **Spoilers for all three cases**, including who did it.

Since the first review: the per-case clue sheets exist and are good, Salt's
public traits are pinned and its scar is gone, Salt's night now reconciles,
Beatrix is no longer "Sister", and the `needs` gating is a real mechanic. This
review starts from there.

## Scores

| Aspect | Salt | Bell | Lamp | What it measures |
|---|:-:|:-:|:-:|---|
| Premise and motive | 8 | 8 | 9 | Is the crime, the reason and the method sound |
| Timeline and witness consistency | 7 | 4 | 7 | Do the truthful witnesses agree with each other and with `truth` |
| Suspect writing | 8 | 8 | 8 | Voices, alibis, secrets, distinctness |
| Witness and document design | 8 | 5 | 8 | Do finds say how they came to hand; are leads authored |
| Question gating | 7 | 6 | 5 | Are `needs`/`after` meaningful, ordered, and not undercut elsewhere |
| Deduction difficulty (measured) | 5 | 3 | 8 | How hard the case is to solve, from the bots and the trait table |
| Story–mechanics integration | 6 | 5 | 9 | Does the story matter to the solve, or run beside it |
| Narrative delivery | 8 | 8 | 9 | The call, briefing, radio, epilogue, dossier |
| Replayability | 5 | 3 | 6 | Does a second game of the same case solve differently |
| **Case** | **6.9** | **5.6** | **7.7** | |

Overall for the three: **6.7 / 10**. Lamp is the model; Salt is now sound but
easy; Bell has the best hook and the weakest night.

---

## How complicated the task is — measured

Three bots, 30 seeds per cell, 1 and 3 detectives:

- **trait** — the soak-test bot: search, interrogate, ask witnesses about
  suspects, walk. Never asks an authored question or shows an object.
- **story** — the same plus every authored question (free ones first, then the
  paid one with the strongest effect), objects shown to whoever they concern,
  authored leads followed.
- **paper** — story only: search, questions, objects. Never interrogates,
  never asks a witness to describe anyone.

Win rate and median hours used on wins (budget in brackets):

| Case | Difficulty | trait 1p | story 1p | paper 1p | trait 3p | story 3p | paper 3p |
|---|---|---|---|---|---|---|---|
| Salt | Rookie (60) | 97% · 30h | 93% · 29h | 97% · 26h | 97% · 27h | 100% · 25h | 100% · 23h |
| Salt | Detective (44) | 77% · 28h | 83% · 28h | 73% · 32h | 93% · 27h | 97% · 31h | 97% · 25h |
| Salt | Commissioner (36) | 40% · 30h | 43% · 26h | 47% · 27h | 60% · 31h | 57% · 28h | 50% · 29h |
| Bell | Rookie (60) | 100% · 27h | 100% · 25h | 100% · 28h | 97% · 20h | 100% · 24h | 100% · 25h |
| Bell | Detective (44) | 97% · 27h | 90% · 21h | 93% · 25h | 83% · 31h | 93% · 27h | 77% · 24h |
| Bell | Commissioner (36) | 57% · 22h | 57% · 28h | 50% · 22h | 73% · 23h | 80% · 24h | 63% · 23h |
| Lamp | Rookie (70) | **0%** | 80% · 50h | 80% · 40h | **0%** | 60% · 55h | 70% · 56h |
| Lamp | Detective (54) | **0%** | 63% · 44h | 57% · 44h | **0%** | 40% · 49h | 43% · 47h |
| Lamp | Commissioner (46) | **0%** | 37% · 39h | 43% · 35h | **0%** | 17% · 41h | 13% · 44h |

What this says:

1. **In Salt and Bell the story does not change the outcome.** Trait-only,
   story, and story-only all win at the same rate in the same hours. The
   authored questions and objects are a second, parallel route to the same
   facts, not something the case needs. A table can ignore every document and
   every conversation and win exactly as often by interrogating.
2. **In Lamp the story is the game.** Trait-only cannot win (the killer is not
   on the list), and a story player reveals him at a median of ~45 hours in
   (the bot wanders; a table following the Sergeant → Coroner's Court → Gas
   Office funnel would do it in 15–20). Solo Rookie is winnable four times in
   five; Commissioner with three detectives is won one time in six.
3. **Lamp inverts co-op scaling.** In Salt and Bell three detectives do better
   than one; in Lamp they do worse at every difficulty, because the reveal
   chain is sequential and every extra person burning hours in the wrong
   quarter shortens the clock. Worth checking at a real table before it ships
   as "the hardest case".
4. **The wrong-accusation trap in Lamp fires in 50–80% of games.** With
   partial facts the notebook narrows the *visible* list to one name, and
   the bot (like a table) accuses. Three hours and an innocent cleared. The
   phone call warns against it, so this is arguably the case's point — but
   know it happens most games.

### The pinned public traits collapsed the trait puzzle

Build and hair are public (every suspect's are known from the start) and now
pinned per suspect. So the two public *clue documents* do far more than they
used to. Over 100 seeds, visible suspects still fitting the killer after only
the build and hair facts:

| Case | Rookie | Detective | Commissioner |
|---|---|---|---|
| Salt | 1 name (44%) or 2 (56%) | 1 (30%) or 2 (70%) | always 2 — Hollis or Ledoux |
| Bell | **always 1 — Nane** | **always 1** | **always 1** |
| Lamp | 0 (somebody is missing) | 0 | 0 |

- **Bell is solved by one document.** Peter Nane is the only `tall` suspect
  on the hill (`bell.ts:212`; everyone else is slight or broad). Find the
  build sheet — one of the 4–6 clue documents scattered over 30 places —
  mark Build: Tall, and every other name crosses itself off. At every
  difficulty, in every seed. The 3–4 hidden traits never matter.
- **Salt comes down to Hollis or Ledoux every time** (both `tall/dark`), and
  at Rookie/Detective Hollis is often not in the roster, so it is Ledoux alone.
- **Lamp reaches "everyone is crossed off, somebody is missing" after two
  documents.** That may be intended, but it is a very early and very loud hint
  for a case whose whole design is the slow discovery that the list is wrong.

The fix is cheap and is the single highest-value change in this review: pin so
that at least three visible suspects share the killer's build+hair in every
roster (Bell: make the Canon or the Matron tall, and one more dark; Salt: make
Okafor or Garrow tall/dark; Lamp: give Vane or Crowe `tall/grey` so the "missing
man" has to be earned), and add a test that asserts it.

---

## Salt and Silence — 6.9

**What works.** The night now reconciles: needle at 8, seal at 9, salt at 10,
trawler anchored 11:10, dinghy 11:15–11:50, watch stopped 11:40, Hollis at the
hall → printers → Brine, Wren's key at 1 and the poor box at 1:30, Fenn's
5:30–6:30 hour, the certificate's two signatures. Every lead is authored.
The two cut-hands suspects (Ledoux, Okafor) are exactly the right kind of
tell. The hidden salt stairs and the Dutch cargo list are a good reward.
Hendriks' "I was on the trawler when he rowed" closes the loop cleanly.

**Still wrong or loose.**

1. The oilskin man is at Tilda's gate on Grieve Point at 4:15 (`salt.ts:206`)
   and at the Harbour Baths in the Salt Yards at 4:30 (`:343`) — opposite ends
   of the harbour, fifteen minutes. He leaves his oilskin in locker 17 at the
   baths, and is "a man in an oilskin" at the morgue at 6:30 (`:316`).
2. Sparks' lead line says "I don't know where [the usual place] is" (`:365`);
   his own paid topic says "The ice house steps" (`:370`).
3. Wren's `notebook` topic leads to the hall (`:166`) — the place it was taken
   *from*. She says she hid it; the lead should go where she hid it.
4. Brack says the heel prints went "toward Customs Row" (`:383`); Wren went to
   the chapel on Grieve Point. Survivable, but the lead points the wrong way.
5. `salt-clues.ts:15` letterhead reads "DR. R. FENN"; she is Ilse.
6. The generic witness question "Where should I be looking?" still composes
   the witness's `leadLine` with a random unsearched building (`state.ts:626`),
   so Sable can say the trawler "tied up later at Fishermen's Chapel". The
   authored topics are fixed; this one path is not. Either give each witness a
   lead line that survives any noun, or have the generic question reuse the
   witness's authored `at`.
7. Once Hendriks is revealed the engine lets him wander the city with the
   other suspects (`state.ts:212` skips only `hidden`); the man who "sleeps
   rough in the salt stairs" turns up at the union hall. Same for Harris and
   Penhale. Revealed suspects should stay at `home`.

**Difficulty.** Two documents → Hollis or Ledoux; one more hidden fact
separates them. Median solve ~28 hours against 44. Commissioner is the only
level with tension (40–57%). Fine as "a harder case" only in name.

## The Ninth Bell — 5.6

**What works.** The premise is the best of the three: nine strokes, nine
years, a sister counting under the tower who thinks it is an apology. The
Canon's tin box, the valve key, the rungs, the boy with the key, the
astronomer who drew what she saw and will not name it. Harris in the
sanatorium is a good hidden person. The clue sheets are the hill's own.

**Wrong.** Bell has the same problem Salt had in the first review: the killer
is in several places at once, and truthful witnesses contradict the truth.

1. **Lister gives Nane an alibi.** "Nane was here till two. He heard the bell
   and sat down on the coal and did not get up for an hour" (`bell.ts:319`,
   again at `:220`, and Dr. Quint at `:204`). The truth has Nane at the top of
   the tower at midnight and on the rungs at 12:04. Lister is a witness;
   witnesses do not lie in this design.
2. **Hobb sells the church keys "at midnight" to a man with cut palms paying
   with a wet reservoir coin** (`:425`). At midnight Nane is ringing the bell;
   the cuts come from the rungs at 12:04 and the wet coin from the reservoir
   at 1:00.
3. **Beatrix gets off the tram at 12:10** (Marley, `:306`) and is under the
   tower counting the bells at 12:00 (Beatrix, Quint, the truth).
4. **1:30 AM, three places:** drinking at the Lamplighter's (Rudge `:462`,
   the truth), taking skiff one out on the reservoir until two (Ferris
   `:488,490`), carrying the depot bag up to the cemetery (Marley `:309`).
5. **The tower key** is an object found on the reservoir walkway (`:587`);
   Mrs. Brannock says it "came back this morning by itself, on the doorstep"
   (`:386`).
6. **Two accounts of the same damage, twice.** Amsel: the Canon sent for the
   1939 report on Friday afternoon and it came back with the plates torn out
   (`:436`) — and also a big man bought it tonight and tore the plates out in
   the doorway (`:438`). Pym: the Canon sent for the crypt ledger on Friday
   and it came back with a page missing (`:358`) — and also the page was cut
   out tonight with a razor by somebody with a key (`:360`). The item
   (`item:bell:crypt-ledger`) then calls it "Interments, 1939, plot
   forty-four" while Pym's topic says the cut page was Beatrix's 1939
   committal — two different books.
7. `item:bell:depot-sheet` body says "out 00:02 … back 00:51" (`:550`); its
   spoken line, Marley, Fay and the timeline all say a quarter to midnight.
   Fay's blurb says she "signed a tram out at midnight" (`:227`); her bio and
   the depot say she took it at 11:45 without signing.
8. Shale says the man on the walkway dropped the rosary in the channel
   (`:478`); Beatrix says she lost it in the boat (`:250`).
9. The valve key changes hands from Fay to Nane between 11:50 and 1:00 and
   nobody says how, or why Fay signs a valve key "for the Canon" at all.
10. `astro.who` ("Who?") and `sister.nine` ("Why nine?") have no `after`, so
    they can be the first thing you ask.
11. **All 28 leads in Bell are random** (`effect: { type: 'lead' }` with no
    `at`). Salt and Lamp author every one. So Tull's "footprints toward" and
    Grimm's "cart tracks run to" still end in whatever building the RNG
    picks. This was finding 6 in the first review and is fixed in the other
    two cases only.
12. Only two authored `culpritTrait` sources (Harris's hands, Quint's rungs)
    plus one object — and, as above, the build sheet alone solves it.

**Difficulty.** One document. Medians of 20–28 hours are the bot walking
around until it trips over the build sheet.

## The Lamplighter — 7.7

**What works.** This is what the other three should look like. A killer who
is not on the list and has to be found through a coroner's file, a gas
archive and a coal book; three victims linked by an inquiry nobody re-read;
a fourth lamp with the doctor's initials; a lamplighter everyone blames who
was drunk on a stool for all three nights; a boy who does his round. The
phone call is the best writing in the game ("If the answer is not on your
list, the list is wrong"). Four independent reveal paths. Every lead is
authored. The header comment in `lamp.ts` is the true night minute by minute
— exactly the discipline the first review asked for, and it shows.

**Wrong or loose.**

1. **11:00 PM, two places.** Bird: at Mary Penhale's grave at eleven, leaving
   by the canal (`lamp.ts:554`). Benedetti: at the market at eleven paying
   Little Sam sixpence for the note (`:398`). Cobbett's boy adds a third: the
   man was "under the lamp on the lane" when he handed over the note (`:450`).
2. **12:30 AM, three places.** Hands in the canal at the bend (Wright `:384`),
   asking the mission on Wick Street for lint through the door (Amos `:306`),
   walking to the retort. The story's own timeline lists all three at 12:30.
   Mission and canal are opposite corners of the ward.
3. Wright, at the lock at the far end of the towpath, sees the man "at a
   quarter to twelve, going toward the lane" (`:384`); Mrs. Kane sees him at
   the base of Lamp 41 at a quarter to twelve (`:527`).
4. Pask "walked the towpath on the night his wife died, looking for her. He
   found the constable finding her" (Wright `:382`); Brace has him driving
   until 12:30 and hearing at one (`:425`).
5. **The dossier gives away what the gates protect.** Klein's blurb: "He wrote
   the first anonymous letter to the Herald himself" (`:226`) — his `letter`
   topic is behind three `needs`. Crowe's blurb: "she sold one lodger's
   address to a man in October" (`:239`) — her `man` topic is gated and is a
   `culpritTrait`. Boyle's blurb: "He was asleep in the mission" (`:253`).
   Write blurbs as what the station knows on day one, not the end-screen
   summary.
6. **Four gates are no-ops:** `crowe.man`, `tench.inspector`, `tench.where`,
   `kane.where` each list their own `after` topic among their `needs`, and
   `needs` is any-of, so the gate is always open the moment the question is.
   Tench's reveal therefore costs two hours at one counter with nothing else
   found first.
7. Penhale, once revealed, wanders the ward (see Salt 7). The man who has not
   left the retort house in two years should not be found at the Alhambra.
8. `roper.chalk` and `bird.stones` are short follow-ups with no `after`.
9. The Exchange's description promises "a woman who remembers voices"
   (`:93`); nobody is there. Lamp 41 and Canal Bridge — two of the three
   scenes — have no witness either.
10. `about: ['hollis']` leftover style aside, the notebook item (`:625`) gives
    two hours back for finding the fourth lamp — the right reward — but its
    `reading` says "Nothing to mark; everything to hurry for" while the
    game does nothing with the hurry. If the loss epilogue's fourth lamp is
    real, consider an event that fires it.

**Difficulty.** Genuinely hard, for the right reason. Lower the co-op penalty
(see above) or say in the difficulty hint that this one is for a small table.

---

## Cross-cutting

| | Salt | Bell | Lamp |
|---|---|---|---|
| Topics / paid / gated | 111 / 44 / 21 | 99 / 38 / 17 | 103 / 47 / 16 |
| Leads without an authored place | 0 | **28** | 0 |
| No-op gates | 0 | 0 | **4** |
| `culpritTrait` sources | 4 | 3 | 9 |
| Reveal paths to the hidden person | 2 | 2 | 4 |
| Witnesses who can describe the hidden person | none | none | none |
| Locations with no witness | 10 (incl. the station) | 11 (incl. the tower) | 8 (incl. Lamp 41) |

- No witness `knows` a hidden suspect in any case, so after the reveal the only
  way to fill their row is to interrogate them or hit a `suspectTrait` topic.
  Fine, but it means the reveal is always followed by a walk to `home`.
- Lamp has nine authored `culpritTrait` sources; Bell three. Bell's story
  cannot carry a solve on its own the way Lamp's can.

## Recommendations, in order

1. **Re-pin the public traits** so ≥3 visible suspects share the killer's
   build+hair at every difficulty, and add a test for it. Bell needs this
   most; it is a one-line change per suspect. Without it, everything else in
   Bell is decoration on a one-document puzzle.
2. **Rewrite Bell's night from a minute-by-minute truth**, the way `lamp.ts`
   does in its header, and then fix Lister, Hobb, Marley, Ferris, the key,
   Amsel, Pym, the depot sheet and Shale from it (items 1–8 above).
3. **Author Bell's 28 leads** (`effect: { type: 'lead', at: '…' }`), as Salt
   and Lamp already do.
4. **Lamp:** rewrite the three leaking blurbs; drop the self-referencing need
   from the four no-op gates; move the sixpence to one place and the 12:30
   loop to two times.
5. **Engine:** a revealed suspect stays at `home` (skip them in `moveSuspects`
   when the def has `home`); the generic "where should I be looking" question
   should prefer the witness's authored place before falling back to random.
6. Add `after` to `astro.who`, `sister.nine`, `roper.chalk`, `bird.stones`.
7. Salt small fixes (items 1–5).
8. Decide what Lamp's fourth lamp does on the clock, and test Lamp with three
   or more people before calling it the hardest case rather than the most
   punishing for a full table.

After 1–3, Bell should land around 7 and Salt around 7.5; Lamp is already
there and needs only the polish in 4.
