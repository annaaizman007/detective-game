# Art review — The Ashgrave Files (cases 2–4)

Reviewed 2026-09-19. Scope: *Salt and Silence*, *The Ninth Bell*, *The Lamplighter*
(the Orchid was left out on request), plus the shared detectives, the opening
film and the generated boards. Every painted asset was looked at: 94 portraits
+ 6 detectives, 92 facades, the three boards at full 2400×1700 (pulled from the
baked `city` texture), the five film frames, and how the art is presented in
the game (dossier, suspects list, map plates). Nothing is missing — every
person and place has a painting.

---

## 1. Verdict

- **Facades** are the strongest layer: one consistent voice (rain, wet cobbles,
  sodium light, Grimshaw/Hopper lineage). About 60% are genuinely good.
- **Portraits** are the weakest layer: technically clean but off-brief — glossy
  3D-render look rather than painted, heavy same-face syndrome, and a dozen
  that contradict the character they stand for.
- **Map** is a competent diagram, not yet a picture: a network graph over a
  uniform dot-field, with visible bugs in bridges, hills and piers.
- **Opening film** has one frame that must not ship as-is.

Priority if only some of it gets fixed:

1. Intro `squad2` frame.
2. The ~14 portrait misfires in §2.
3. Map bridges / hills / plate collisions.
4. Garbled signage on facades.

---

## 2. Portraits

### Systemic (all three cases)

- **Not "painted".** DreamShaper gives a plastic, over-lit, airbrushed render —
  visible pores, specular skin, studio-grey backdrop. The facades are
  painterly; the people are not. The two layers do not feel like one hand.
  Suggest a style pass (painterly LoRA, or `oil on canvas, visible brushwork,
  muted` + lower CFG) and a re-render of the lot from a fixed seed list.
- **Same-face syndrome.** Sparks / Aldous / Vetch / Pell / Marley are one young
  man; Harris and Tutor are one blond at two ages; half the middle-aged women
  share a face. Players are asked to tell people apart — the art should help.
- **Wire spectacles everywhere.** ~40% of the cast; in Salt's witnesses 6 of 9.
  Strip glasses from the default look table and add them only where the
  writing wants them.
- **Peaked officer's cap = "uniform".** Every uniformed job (deckhand,
  archivist, tram driver, porter, dispatcher, constable) gets a naval/police
  officer's cap. A 1948 British constable has a custodian helmet; a deckhand a
  knit cap; an archivist no hat.
- **Women default to glamour.** Red lipstick and set hair on almshouse
  residents, pawnbrokers, tenement mothers, laundresses. Cleavage or
  off-shoulder on Tilda (a widow in mourning), Sister Ayre, Kane, Dwyer, Ruby.
  Add `lipstick, glamour, cleavage, bare shoulders` to the global negative for
  anyone who is not a singer.
- **Inconsistent framing.** Most are head-and-shoulders on grey; Ledoux,
  Gardener, Gurney, Aldridge, Leo, Boyle, Petty, Ruby are ¾-body with props or
  interiors. Pick one crop. At 28px map-token size the busy ones turn to mud.
- **Floating smoke.** Salvi, Keeper, Vane, Crane: smoke with no source. The
  known bug is still present.

### Salt and Silence — re-render

| id | problem |
|---|---|
| `hendriks` | Brief: unshaven, weather-beaten, thick jersey. Got a clean-cut catalogue model in a leather jacket. |
| `okafor` | Chandler in what reads as a kimono with a sash. |
| `tilda` | Widow of fifty in black: off-shoulder gown, cleavage; hair grey on top, black in the bun (notebook pins *grey*). |
| `keeper` | Holding two unexplained sticks; pipe smoke, no pipe. |
| `ledoux` | Only full-length figure in the case; lantern prop; breaks the set. |
| `pell` | Deckhand in an officer's cap. |
| `fry` | "Brother Fry, mission warden" painted as a gangster in a black suit. |
| `lundy`, `sable` | Pawnbroker and petty officer rendered as pin-ups. |

Strong: `cotter` (best portrait in the game), `wren`, `hollis`, `ives`,
`delacroix`, `fenn`.

### The Ninth Bell — re-render

| id | problem |
|---|---|
| `harris` | Plain tie (brief says striped), 2020s haircut, sulky not frightened; the most photographic image in the set. |
| `ansell` | Bell founder as a Regency dandy with a cravat. Should be leather apron, soot, forearms. |
| `pym` | Archivist in a military peaked cap. |
| `gardener` | Glasshouse gardener in suit, tie, overcoat, hands in pockets. Nothing says gardener. |
| `sister` | Modern cardigan and haircut; period break. |
| `greer` | Almshouse pauper in a smart hat and lipstick. |
| `agnes` | "Sister" Agnes in a trench and cloche — the name or the picture is wrong. |
| `coyle` | Water-board clerk painted as the femme-fatale detective. |
| `matron` | Chef's toque instead of a matron's cap. |

Strong: `verger`, `canon`, `tull`, `lister`, `grimm`, `amsel`, `ferris`,
`brannock`.

### The Lamplighter — re-render (weakest set)

| id | problem |
|---|---|
| `penhale` | Brief: gaunt, hollow-eyed, shabby, dismissed inspector. Got a handsome silver-haired executive in a new coat. This is the hidden killer; the look matters. |
| `pask` | Cartoon/Pixar face, police cap. Style break, obvious at dossier size. |
| `klein` | "Printer" taken literally: a modern inkjet printer in the background, desk, 2020s shirt. |
| `leo` | A long wooden rod in his mouth with smoke coming off it. Broken object. |
| `boyle` | Bellhop tunic with medals, peaked cap, anime face. Needs the custodian helmet — the negative list is not enough; try a reference image / ControlNet. |
| `brace` | Modern uniform, clipboard, fluorescent ceiling. |
| `halloway` | Stoker in a 2010s hoodie. |
| `roper` | Teacher in a modern t-shirt dress, stock-photo lighting. |
| `rusk` | Apprentice printer as an open-shirted teen; no apron, no ink. |
| `dwyer` | Modern bob with fringe, cleavage. |
| `kane` | Grieving tenement mother in an off-shoulder evening dress. |
| `lark` | The only greyscale portrait in the game. |
| `kilbride` | The sergeant who opens the case: airline-captain cap with a globe badge. |

Strong: `dunne` (excellent), `vane`, `crowe`, `amos`, `wright`, `benedetti`,
`cobbett`, `marlow`, `bird`, `gurney`.

### Detectives (shared)

`hale`, `vale`, `kell` good. `quist` is anime-glam in an officer's cap for
"the beat cop". `ruby` is a ¾-body glamour shot in a modern blazer. `crane`
has orphan smoke.

Suggested first batch:

```bash
python3 tools/render-portraits.py --force --only penhale,pask,klein,leo,boyle,harris,ansell,pym,hendriks,tilda,fry,brace,halloway,roper
```

---

## 3. Facades

### Systemic

- **Garbled signage** is the most visible flaw, worse in the location panel:
  "HANNUR RANK" (Harbour Savings), "CAIFIEY" (Ferry Slip), "FHCCS" (Fenwick
  Motors), "NNNEN" (Nunn's), "LANP HILLINLL / SHHL" (Lamplighter's Arms),
  "CHION / HEL'ET" (Dispensary), "CINTNE" (Hobb's Pawn), "CAIRE" (Tea Rooms).
  Either add `text, lettering, signage, letters` to the negative and accept
  blank fascias, or inpaint the real names.
- **Wrong century / wrong city.** Skyscrapers behind The Docker's Voice, Gas
  Company, Waterworks Tower, Reservoir Boathouse (a Chicago skyline). Big Ben
  behind the Customs House. A Skytree-style lit tower behind the Bell Foundry.
  Cyberpunk cyan strips on Ordell Water Board. Modern cars in several.
- **Neon.** Marconi Station (red neon Eiffel lattice), Wards Telephone Exchange
  (red-light district), Ward Infirmary (red neon and a white cross floating in
  the sky), Ferry Slip (red/blue hot-dog stand), Marrow House (modern glass
  clinic with a neon cross). These read American 1980s.
- **Interiors still present** despite the handoff note: Terrace Tea Rooms,
  Wards Reading Room, Dockside Café (Nighthawks crowd), Bond Store 12.
- **Duplicate landmarks confuse navigation.** Salt has three lighthouses
  (Grieve Point Light, Coastguard Tower, Old Salt Stairs). Bell has three
  gothic cathedrals (Bell Tower, Chapter House, Lower Chapel — the last is a
  humble mission). On the board these are indistinguishable thumbnails.
- **Crowd figures** distort at plate size (Lundy's Pawn, Hobb's Pawn,
  Glasshouse, St Jude's — a queue of cloned nuns). Facades with no people are
  consistently better.
- **Weather drift.** Chapter House has snow; Retort House a full moon;
  everything else rain. Snow reads as a different season.

### Name / picture mismatches

| facade | picture shows |
|---|---|
| `salt-pier9` (the crime scene) | A canal between houses; no pier, no tape. |
| `salt-raskhouse` ("grey shingles on the point, a widow's lamp") | Floodlit Georgian mansion with a reflecting pool. |
| `salt-drydock` ("a hull the size of a church on stilts") | Chimneys, no hull. |
| `salt-chandler` | A bookshop with a striped awning. |
| `salt-shipping` | A corner diner. |
| `bell-glasshouse` (a greenhouse with a stoker) | An Asian lantern night-market. |
| `bell-foundry` | An empty alley. |
| `lamp-coal` | No coal. |
| `lamp-bridge` | Fine — but the plate sits *beside* the canal on the board, not on it. |

### Keep as the style bible

Grieve Point Light, Trawler Berths, Harbour Baths, Ice House, Narrows
Cannery, Salt Works · Observatory, Pump House, Bell Tower, Ordell Cemetery,
Academy, Tram Depot, Amsel's Books, Sanatorium, Villa, Crypt · Canal Lock,
Canal Bridge, Gasworks, Lamp 41, Alhambra, Night Market, Ragged School,
Coroner's Court, Holy Cross.

---

## 4. The map (`bakeCity`, `src/scenes/board-scene.ts`)

- **It reads as a diagram.** Case roads are a white straight-line graph laid
  over an evenly scattered field of identical blocks. No density gradient, no
  hierarchy, no negative space; the Salt Yards look exactly like Customs Row.
  The eye lands on the facade plates because nothing else has weight.
  Suggest: fewer, larger buildings near the plates; open ground (yards, goods
  sidings, cemeteries) between districts; district-specific roof palettes
  (slate for the Close, rust for the Yards, soot for the Wards).
- **Bridges do not match roads (Bell, Lamp).** Case roads cross the river with
  no bridge in at least four places on Bell; bridge rectangles sit where no
  road crosses (one is on the top edge of the board). The bridge logic uses
  grid streets, not the playable roads — and the player sees the roads.
- **Hills are inside the city.** Contour rises sit under buildings on all
  three boards (Bell top-right and bottom-left, Salt bottom-right). The
  "outside the city" guard is not holding; they end up as faint scribbles
  under the blocks.
- **Piers start on land** (Salt, two of six), and grid lines run under the
  water as an echo that looks like a slip rather than a chart convention.
- **Tram loop** is a rectangular railway-track symbol with square stations —
  reads as a fence. A dashed pair of thin lines with a small circle at stops
  is more cartographic.
- **Reservoir** (Bell) is a jagged polygon bulge; the river is a bent band
  with hard corners.
- **Buildings ignore blocks.** Extruded blocks stray outside the tan block
  rectangles and leave empty rectangles elsewhere; windows are random
  dice-dots. The extrusion and lighting are consistent and pleasant — it is
  the placement that looks random.
- **Plates collide** in the centre of Bell (Close Green / Glasshouse /
  Verger's Cottage / Dispensary overlap; the Reservoir plate sits on the
  water). Salt and Lamp are clean.
- **District names are illegible** — pale ghost text under the buildings.
  Lift them above the block layer at ~40% ink, or drop them.
- **Edges clip names** under the DOM panels (Grieve Point Light, The
  Observatory, Ward Infirmary, Pier Nine). The camera fit should use the
  visible middle, not the full canvas.
- Water colour, ripples, boats and the shore stroke are nice — keep.

---

## 5. Opening film (`tools/intro2/`, `public/assets/video/intro.mp4`)

- **`squad2.jpg` — blocking.** The woman at centre has a moustache; the woman
  at right has a pen through her face; the man at right holds a chair. This
  frame is in the cut. Re-render or drop it.
- **The sergeant is the wrong person for two of the three cases.** The film
  shows one middle-aged male sergeant in a green US-highway-patrol raincoat
  with an American shield badge and a whistle in his mouth. Salt's caller is
  *Sergeant Ruth Dunmore* and Lamp's is *Sergeant Ada Kilbride* — both women,
  both in the women's voice. Bell's is a young constable. Either a "tell"
  frame per case, or shoot the sergeant from behind / in silhouette so the
  voice can carry.
- Three registers: the film is photoreal, the portraits render-glossy, the
  facades painted.
- `run.jpg` is 640×512 while the others are 896×512 — Ken Burns hides it, but
  it is a different crop.
- `burst.jpg` is the best frame; `squad.jpg` is fine.

---

## 6. Small things

- App icon (badge-star with an "A") works at 192/512 — no notes.
- Salt notebook pins `tilda` hair *grey*; the painting is half black. Re-render
  or pin *dark*.
- Suspect tokens on the map at ~28px: the busy ¾-body portraits (Ledoux,
  Gurney, Boyle) turn to mud — another reason to standardise the crop.
