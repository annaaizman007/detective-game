# Review — The Ashgrave Files

Reviewed 2026-09-19 on branch `claude/browser-detective-game-gwbcny`, commit `924e930`
plus the untracked Salt facades. Read all three case files, the rules engine, the
exhibit corpus, the portrait and facade manifests, and played the opening of
*Salt and Silence* in the browser.

> **Contains spoilers for all three cases.** Every finding below names culprits
> and secrets, because that is what had to be checked.

## Score

| Area | Score | One line |
|---|---|---|
| Story — plot logic per case | 6.5 / 10 | Bell is tight, Orchid is sound, Salt gives itself away and its night does not add up |
| Characters — writing and casting | 7 / 10 | The dialogue is the best thing in the game; the dealt traits are stapled onto people they do not fit |
| Visuals — portraits, facades, UI | 7 / 10 | Handsome, consistent noir look; text artifacts, wrong-costume portraits, and a whole city without paintings |
| Artifacts — documents and objects | 5.5 / 10 | The authored papers are excellent; the deduction exhibits are the wrong city's paperwork in two cases out of three |
| Connectedness — does it all hang together | 6 / 10 | Mechanically airtight (tests pass, every id resolves); narratively the three layers drift apart |
| **Overall** | **6.5 / 10** | |

"Useless stuff" is fine and is not counted against anything. Only things that
contradict each other, or that undercut the deduction, are scored.

What is genuinely good and should not be touched: the plain-sentence dialogue,
the witnesses' free "what was the victim like" questions, the `Where you looked /
What looked off / What turned up` search card, the authored documents with
"How it came to hand", the notebook that only crosses off from your own marks,
the board, the room audio, and the engine (pure reducer, seeded, byte-identical
replays, 19 green tests).

---

## Findings, ranked

### 1. The deduction exhibits are Orchid's paperwork in every city — high

`src/game/exhibits.ts` holds the 24 clue documents (build/hair/hand/mark/vice/
scent/shoe). Every one is written for *The Ash and the Orchid*: Mercy Hospital
letterhead, Ashgrave Bay Police, a female victim of twenty-six, a hotel suite,
a pillow, a lift attendant, "hotel stock: Turkish cigarettes only".

Seen on screen in *Salt and Silence* (victim Aurel Bask, a man in his fifties,
Harbour Morgue): searching the Quay Tram Stop turns up **"MERCY HOSPITAL ·
LABORATORY — Trace examination — She marked whoever she fought. Among the fresh
tissue under her nails…"** found "behind a picture that hangs an inch off
straight". In *The Ninth Bell* the victim is a forty-four-year-old nun at the
foot of a tower and the exhibits will still say she was twenty-six and died on
silk.

These are the core finds — the ones the notebook is built on — so this is the
single biggest break in the "documents as evidence" premise.

**Recommendation.** Make the clue corpus per case. Cheapest route: keep the
`clue:<trait>:<value>` ids but let `CaseDef` carry an optional
`exhibits: Partial<Record<string, ExhibitDef>>` override, and have `exhibitById`
look there first. Salt needs its own 24 (harbour morgue, coastguard log,
chandler's sales book, a bootprint in rock salt); Bell needs its own (the tower
stairs, the cut rope, the Observatory margin drawing). The `missingExhibits()`
test already exists — extend it to assert every case covers every
trait value.

### 2. Salt names its killer in the dossier — high

`src/game/cases/salt.ts:209` — Ledoux's blurb, visible in the Suspects tab from
turn one: *"Big man, scar across his left thumb."* Then twelve witnesses and
suspects describe the night's mystery man as "a big man with a scar across his
thumb" (Teague, Vetch, Kite, Harrow, Mott, Lundy, Rook, Cully, Fry, Ives,
Okafor, Tilda). The culprit is fixed (`culprit: 'ledoux'`), so the case reads
as solved by the end of the first conversation, regardless of what the trait
table says.

Orchid and Bell do not do this. Bell's gardener blurb ("dug grave forty-four;
takes flowers to Marrow House every Sunday") is the right kind of tell —
suggestive, not conclusive.

**Recommendation.** Take the scar out of Ledoux's blurb and bio. Give the
"big man with the scar" to two or three suspects (Okafor is already written as
having a cut hand; Garrow's hands could carry a winch scar from '41) so the
description narrows the field without closing it. Or make the tell a thing only
one witness saw clearly and others half-saw.

### 3. The dealt traits contradict the written people — high

Traits are dealt at random (`gen.ts:dealTraits`) with no reference to the
suspect definitions. So:

- Ledoux, "big man" in his bio, was dealt **Tall / Red**; Okafor, fifty-eight
  and sleepless, **Broad / Red**; Etta Wren, thirty-nine, **Grey**.
- Dr. Fenn — Hamburg surgeon, grieving lover — came up **Vice: Cards**, and the
  tram conductor duly said "Fenn shuffles a deck through the whole
  conversation", grafted onto her authored line about the doctor riding to the
  pier with her bag.
- The `mark: scar` tell is "a white scar running from ear to jaw"; the story's
  scar is across a thumb.
- Portraits are painted (fixed hair, fixed build), so the notebook's "Hair:
  Grey" sits next to a portrait with dark hair. The old paper-doll portraits
  filled in from traits; the paintings cannot.

**Recommendation.** Two options, pick one:

- *Pin the public traits.* Add `traits?: Partial<Record<TraitId, string>>` to
  `SuspectDef`, author `build` and `hair` (the two public traits) to match each
  portrait and bio, and let the dealer fill in only the hidden ones. Uniqueness
  is still guaranteed by the retry loop.
- *Or drop build/hair from the public set* and make the public traits ones a
  painting cannot contradict (vice, scent, handedness).

Either way, rewrite each `tell` per case or make the tells trait-only ("a scar,
old and white") rather than location-specific ("ear to jaw").

### 4. Salt's night does not reconcile — medium

Timeline reconstructed from the witness and suspect lines (all witnesses are
documented as truthful):

- Bask's watch stops at **11:40** — he is in the water. The murder weapon
  (Okafor's rigging knife) is redeemed at Lundy's at **midnight**, twenty
  minutes later.
- The `truth` says Ledoux rowed in **alone** and there was never a second man.
  Pell (his own deckhand, `salt.ts:286,288`) says the skipper put two men
  ashore in the rowing boat and waited two hours on deck, smoking. Sable and
  Garrow both log two out, one back. Ledoux's own topic says two men got off.
  The truth contradicts every witness.
- The dinghy comes back at 1:30 (Sable, Garrow), or 2:30 (Sable's lead line,
  the coastguard fix). Pick one.
- The big man is at the salt works at 10, the Brine, Lundy's, the café, the
  Customs House, the printers and the last tram at midnight, the hall and the
  bond store at 1, back in the dinghy at 1:30, the baths at 2, the ice house
  for an hour around 3, Tilda's gate at 3, the chapel, the infirmary and the
  mission at 4, the morgue at 6 — while the Marie-Louise, with him at the
  wheel, ties up at 3:05 and wirelesses ALL DONE at 3:12.
- Hollis is at the union hall until midnight (Brack), in the Brine from ten
  till one (Teague, Rook, the flask), and in bed thirty-one at the mission all
  night (Fry, `salt.ts:481`) — and Fry's own topic (`:483`) says bed thirty-one
  was the big man.
- "The old salt stairs under the point" is where the story says the usual place
  is; there is no such location on the map, and the mechanical lead will name
  a random building instead (see 6).

Orchid has a milder version: Lillian's call is at 1:52, the Jade Room phone
rings at 2:00 (Lantern Quarter, far east), and the house detective finds her at
2:09 in the Gilded (the Heights, far west). Nine minutes to cross the city and
kill her. The door is on the chain from inside and the truth never says how
Brandt left an eleventh-floor suite. Brandt is at Rosie's, the Jade Room and
the bonded warehouse all "at one".

Bell: car seven leaves the depot at 12:02 carrying Beatrix, who was under the
tower at 12:00 counting the bells.

**Recommendation.** Write the true timeline first for each case (one column,
minute by minute, one row per named person), then write the witnesses *from*
it. Give the big man three sightings, not fifteen — each witness gets the
victim's last day, one thing about a suspect they know, and one lead; only
some of those leads should be the killer.

### 5. Salt's button clears the killer — medium

`salt.ts:604` — showing the brass button to Ledoux has `effect: { type: 'clear',
suspectId: 'ledoux' }`. The engine guards it (`state.ts:721`: the culprit
cannot be cleared; "tells it well. It does not hold" fires and a fact drops
instead), so it is not a bug — but that line is a bright neon arrow. The moment
the table sees "It does not hold" on Ledoux and "is cleared" on anyone else,
the case is over. `salt.ts:610` — Kite's reply to the watch is entirely about
Fenn's movements, but its effect is `culpritTrait`; the text and the effect
point at different people.

**Recommendation.** Give the culprit's object unlocks `suspectTrait` or `lead`,
never `clear`. Make Kite's watch reply say something about the killer.

### 6. Authored leads and mechanical leads disagree — medium

A witness's `leadLine` is a sentence ending in "toward" / "the usual place is",
completed by whichever location the RNG picks from the unfound evidence
(`state.ts:567`). The authored paid topic on the same witness names a specific
place: Harrow says "He ran toward the ice house" and the game then says "It
points at Harbour Savings." Sparks: "In this harbour, the usual place is
Longshoremen's Hall."

**Recommendation.** Either author the lead target (`effect: { type: 'lead', at:
'icehouse' }`, falling back to random only if that location is already
searched), or write leadLines that do not claim to know the place ("He went
somewhere in a hurry. Try").

### 7. Portrait casting and artifacts — medium

Generated from `people/prompts.json`; the prompts describe hats and coats but
not the person, so the model defaulted:

- **Bernard Okafor**, **Femi Oyelaran** (ex-customs officer from Lagos) and
  **"Ruby" Okonkwo** are all painted white.
- **Fr. Ambrose Kell** has no collar; **Canon Aldritch** is a man smoking a
  cigarette in a lounge suit. **Matron Crake** (asylum matron) and **Beatrix
  Ayre** (asylum patient) are both painted as nuns; the only actual nun in the
  case is the dead one.
- **Ledoux** has "NAAALTY 0145" burned into his coat; **Silas Crane** has
  "POARRAVO" across his chest. Both are on screen in the Suspects tab and the
  seat picker.
- Vera Lang is a pin-up in a red dress with cleavage; every other portrait is a
  buttoned coat in a grey room. She looks pasted in from a different game.

**Recommendation.** Add ethnicity, age and role dress to the prompt for every
person whose name or bio implies it; re-render the seven above; add "no text,
no lettering, no logos" to the negative prompt and reject any render with
letters in it. `public/dev/portraits.html` is the right place to eyeball a
re-render.

### 8. Facades: Bell has none, and some Salt ones do not say what the place is — medium

- *The Ninth Bell* has 0/30 painted facades (Orchid 30/30, Salt 30/30 with
  the new files). It falls back to the parametric drawings, which are fine but
  visibly a different game next to the other two.
- Salt: the Brine & Bell is a neon **JAZZ** club (it is a sawdust dockers'
  pub); the Customs House, the Harbourmaster's Office and the Cannery are
  generic rainy streets with no readable landmark; Grieve Point Light and the
  Coastguard Tower are both lighthouses on the same map. Framing flips between
  interiors (bank colonnade, hospital corridor, baths) and exteriors.
- The briefing card (`Take the case` screen) is translucent over the zoomed
  map, so the typed briefing sits on top of building paintings and node labels
  and is hard to read. A solid or darker card behind the text would fix it.

**Recommendation.** Render Bell's 30 (prompts already in
`buildings/prompts.json` pipeline). Re-prompt the six Salt ones above with the
landmark in the prompt ("customs house with a clock and a flag", "trawler
berths with nets"). Decide interior or exterior and stick to it per map.

### 9. The three cases share a template too visibly — low

Orchid and Salt both have: customs seal **4471** broken tonight, a pawn ticket
redeemed at midnight by a hand that did not pledge it, a big man in a wet
coat, a boat with no lights landing under the lighthouse, a last tram with
eleven passengers and one who walked back, a ferry count one short, a
lighthouse keeper who logs and crosses out. A table playing the second case
will recognise the beats and skip the "useless stuff" — which is the part you
want them wasting time on.

**Recommendation.** Keep the shared universe (St. Ordell's, Marrow House and
the Canon threading from Orchid to Bell is a nice touch) but give each city
its own furniture. Salt's are easy: replace the pawn beat with the chandler's
sales book, the ferry with the tram to the salt works, the wet-coat man with a
man who smells of the ice house.

### 10. Small things — low

- `README.md` and the header of `gen.ts` say the culprit is re-rolled every
  playthrough; `CaseDef.culprit` is fixed and the comment on the type says so.
  Update the docs; once a table knows it is fixed, replay value is the trait
  table, not the answer.
- Beatrix is named `'Sister Beatrix Ayre'` — a patient, not a nun; the
  "Sister" reads as a title and the portrait cements it. Call her Beatrix Ayre.
- Every case has exactly 10 of 30 locations without a witness and 12–14 with
  an authored document; the empties cluster (Salt: pier9, station, shipping,
  bank, light, raskhouse, drydock, ropewalk, cannery, slip). Pier Nine — the
  crime scene — has nobody to ask.
- At Rookie/Detective two or three suspects are dropped from the roster, but
  the remaining suspects' `opinions` and topics still name them ("Ledoux was
  there too", "ask Aldous"). Harmless, occasionally confusing.
- `buildings/manifest.json` has a `people` key duplicating `ids` — copy-paste
  from the people manifest.
- HANDOFF.md §3 still describes the paper-doll portrait system as current.

---

## Suggested order of work

1. Per-case clue exhibits (finding 1) — one file per case, ~24 documents each.
   This is the most words, and the biggest win.
2. Pin public traits to the paintings (finding 3) — a small engine change, then
   audit the tells.
3. Fix Salt's giveaway and its timeline (findings 2, 4, 5, 6) — rewrite in place.
4. Re-render the seven portraits and six facades; render Bell's thirty
   (findings 7, 8).
5. Docs and small things (finding 10).

After 1–3 the story, the characters and the artifacts would agree with each
other, which is the thing the score is really measuring. I would expect it to
land around 8.

---

## Addressed — 2026-09-19, later the same day

1. **Per-case clue exhibits** — done. `src/game/cases/salt-clues.ts` and
   `bell-clues.ts` (24 each: harbour morgue, pier ladder, spilled salt; tower
   rungs, cut rope, rope chalk). `CaseDef.clues`, `exhibitById(id, caseId)`,
   `missingExhibits()` checks every case covers every trait value.
2. **Salt names its killer** — done. Scar gone from Ledoux's blurb and bio; the
   night's tells are an oilskin with the hood up and hands cut on canvas, and
   Okafor has cut hands too. Sightings cut to the ones the timeline supports.
3. **Dealt traits vs written people** — done. `SuspectDef.traits` pins build
   and hair for all 24 suspects to their portraits; the dealer honours pins;
   the scar tell is trait-only. Test added.
4. **Salt's night** — rewritten from a single true timeline (in `story.
   timeline`): one man rows to Pier Nine at 11:15 and back at 11:50, knife
   redeemed the 10th, Hollis pulls the notice at 12:05, Wren takes the
   notebook at 1:00, body found at low water 4:50, doctor signs at 5:40/6:20.
   Each case now has its own `startHour` (Salt 8 AM, Bell 7 AM). Orchid's
   call moved to 12:52 with the last car up at one and the fire escape; Bell's
   car seven leaves at 11:45.
5. **Button clears the killer** — done; both unlocks are `suspectTrait`.
   Kite's watch reply is about the killer.
6. **Authored vs mechanical leads** — done. `lead` effects take `at`; every
   Salt lead names its place; lead lines no longer claim a place.
7. **Portraits** — re-rendered with casting notes (ethnicity, role dress, hair
   colour, no-text negatives): Crane, Kell, Vera, Ruby, Okafor, Tilda, Fenn,
   Ledoux, Oyelaran, Canon, Matron, Blake, Fay, Beatrix; plus Sam Cotter, the
   fisherman now standing on Pier Nine.
8. **Facades** — Bell's 30 rendered; ten Salt facades re-prompted with their
   landmark. Briefing cards sit on a solid card.
9. **Shared template** — Salt's seal is 2216, the ferry count is a tide table,
   the pawn beat is the night before, the wet-coat man is an oilskin.
10. README, `gen.ts` header and HANDOFF updated; Beatrix Ayre is no longer a
    Sister; the buildings manifest carries only `ids`.
