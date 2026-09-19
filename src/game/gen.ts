// Case generation.
//
// The culprit is re-rolled every playthrough, so the same case never solves the
// same way twice. The one hard guarantee: after every clue on the map has been
// found, exactly ONE suspect can still fit. No unsolvable nights.

import type {
  BoonDef, BoonId, CaseDef, DifficultyDef, DifficultyId, EvidenceState, SuspectState, TraitId, WitnessState,
} from '../types/game-types';
import { stream, type Stream } from './rng';
import { TRAITS, traitValue } from './traits';
import { boonExhibitId, clueExhibitId } from './exhibits';

// `budget` is the number of HOURS on the clock, and one action burns one hour.
// Counting actions rather than rounds is what keeps the case just as hard with
// six detectives as with one -- six people simply burn the night six times
// faster. Counting rounds instead made a full table trivial.
//
// The cities are thirty locations across five quarters now, so a case runs
// over days rather than a night. The budgets were set against the test bot,
// which solves a board in about thirty hours on the median: sixty gives a
// rookie table room to be wrong, forty-four is a fair fight, and thirty-six
// is lost more often than not. At a table that is a couple of hours of play.
export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  rookie: { id: 'rookie', label: 'Rookie', traits: 4, suspects: 5, budget: 60,
    note: 'Four facts, five suspects, sixty hours. Room to be wrong once.' },
  detective: { id: 'detective', label: 'Detective', traits: 5, suspects: 6, budget: 44,
    note: 'Five facts, six suspects, forty-four hours. The case as written.' },
  commissioner: { id: 'commissioner', label: 'Commissioner', traits: 6, suspects: 8, budget: 36,
    note: 'Six facts, eight suspects, thirty-six hours. Most cases you lose.' },
};

export const BOONS: Record<BoonId, BoonDef> = {
  tip: { id: 'tip', label: 'A scribbled tip', icon: 'note',
    text: 'A note in a dead man’s handwriting, folded four times.' },
  spur: { id: 'spur', label: 'A fresh lead', icon: 'lead',
    text: 'A name, an address, and a reason to hurry.' },
  coffee: { id: 'coffee', label: 'Second wind', icon: 'cup',
    text: 'Black coffee and a cigarette on somebody else’s tab.' },
  ledger: { id: 'ledger', label: 'A private ledger', icon: 'book',
    text: 'Somebody wrote down what they should have burned.' },
};

/** Every witness starts fresh: two paid questions and a lead to give. */
export const WITNESS_PATIENCE = 2;

type Dealt = Record<string, Record<TraitId, string>>;

/** Deal trait values so every category is genuinely spread across the suspects. */
type Pins = Record<string, Partial<Record<TraitId, string>>>;

function dealTraits(rng: Stream, suspectIds: string[], traitIds: TraitId[], pins: Pins): Dealt {
  const out: Dealt = {};
  suspectIds.forEach((id) => { out[id] = {} as Record<TraitId, string>; });
  for (const t of traitIds) {
    const vals = TRAITS[t].values.map((v) => v.id);
    const open = suspectIds.filter((id) => !pins[id]?.[t]);
    const pool: string[] = [];
    // Cycle through a shuffled value list so no value dominates the table.
    while (pool.length < open.length) pool.push(...rng.shuffle(vals));
    const deal = rng.shuffle(pool.slice(0, open.length));
    suspectIds.forEach((id) => { const pin = pins[id]?.[t]; if (pin) out[id][t] = pin; });
    open.forEach((id, i) => { out[id][t] = deal[i]; });
  }
  return out;
}

const vectorOf = (traits: Record<TraitId, string>, traitIds: TraitId[]) => traitIds.map((t) => traits[t]).join('|');

export interface BuiltCase {
  chosenTraits: TraitId[];
  publicTraits: TraitId[];
  hiddenTraits: TraitId[];
  suspects: SuspectState[];
  witnesses: WitnessState[];
  culpritId: string;
  evidence: EvidenceState[];
  rounds: number;
  difficulty: DifficultyId;
}

export function buildCase(caseDef: CaseDef, { difficulty = 'detective' as DifficultyId, seed = 'ashgrave' } = {}): BuiltCase {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.detective;
  const rng = stream(`${seed}:${caseDef.id}:${difficulty}`);

  // --- which facts are in play -------------------------------------------
  const extraCount = Math.max(0, diff.traits - caseDef.publicTraits.length);
  const hiddenTraits = rng.shuffle(caseDef.traitPool).slice(0, extraCount);
  const chosenTraits: TraitId[] = [...caseDef.publicTraits, ...hiddenTraits];

  // --- who is in the frame ------------------------------------------------
  // The killer is always in it; the rest of the roster is drawn.
  const others = rng.shuffle(caseDef.suspects.filter((x) => x.id !== caseDef.culprit));
  const killer = caseDef.suspects.find((x) => x.id === caseDef.culprit) ?? caseDef.suspects[0];
  const roster = rng.shuffle([killer, ...others.slice(0, Math.min(diff.suspects, caseDef.suspects.length) - 1)]);
  const ids = roster.map((s) => s.id);

  // What the writing has already decided about each person.
  const pins: Pins = Object.fromEntries(roster.map((s) => [s.id, s.traits ?? {}]));

  let dealt: Dealt | null = null;
  const culpritId = killer.id;
  for (let attempt = 0; attempt < 400; attempt++) {
    const candidate = dealTraits(rng, ids, chosenTraits, pins);
    const mine = vectorOf(candidate[culpritId], chosenTraits);
    const unique = ids.every((id) => id === culpritId || vectorOf(candidate[id], chosenTraits) !== mine);
    if (unique) { dealt = candidate; break; }
  }
  if (!dealt) {
    // Astronomically unlikely. Force uniqueness rather than ever shipping an
    // unsolvable board.
    dealt = dealTraits(rng, ids, chosenTraits, pins);
    for (const id of ids.filter((x) => x !== culpritId)) {
      if (vectorOf(dealt[id], chosenTraits) === vectorOf(dealt[culpritId], chosenTraits)) {
        // Only an unpinned fact may be changed to force it.
        const free = chosenTraits.filter((x) => !pins[id]?.[x]);
        const t = rng.pick(free.length ? free : chosenTraits);
        const others = TRAITS[t].values.map((v) => v.id).filter((v) => v !== dealt![culpritId][t]);
        dealt[id][t] = rng.pick(others);
      }
    }
  }
  const table = dealt;

  const suspects: SuspectState[] = roster.map((s) => ({
    ...s,
    traits: table[s.id],
    known: Object.fromEntries(chosenTraits.map((t) => [t, caseDef.publicTraits.includes(t)])) as Record<TraitId, boolean>,
    at: '',
    clammed: 0,
    frozen: 0,
    cleared: false,
    dead: false,
  }));

  // Scatter the suspects, never onto the precinct steps.
  const streetIds = caseDef.locations.map((l) => l.id).filter((id) => id !== caseDef.start);
  const spread = rng.shuffle(streetIds);
  suspects.forEach((s, i) => { s.at = spread[i % spread.length]; });

  // --- what is out there to find -----------------------------------------
  const culpritTraits = table[culpritId];
  const evidence: EvidenceState[] = chosenTraits.map((t, i) => ({
    id: `clue-${t}`,
    kind: 'clue' as const,
    trait: t,
    value: culpritTraits[t],
    text: traitValue(t, culpritTraits[t]).clue,
    exhibit: clueExhibitId(t, culpritTraits[t]),
    found: false,
    at: '',
    order: i,
  }));

  // Fewer finds than places: about a third of the city turns up nothing.
  const boonPlan: BoonId[] = (['tip', 'spur', 'ledger', 'coffee'] as BoonId[]).slice(0, diff.traits >= 6 ? 4 : 3);
  boonPlan.forEach((b, i) => evidence.push({
    id: `boon-${b}-${i}`, kind: 'boon', boon: b, text: BOONS[b].text, exhibit: boonExhibitId(b),
    found: false, at: '',
  }));

  // The case's own documents sit where they were written to be.
  for (const item of caseDef.items) {
    evidence.push({ id: `item-${item.id}`, kind: 'item', item: item.id, text: item.spoken, exhibit: item.id, found: false, at: item.at });
  }

  for (const obj of caseDef.objects) {
    evidence.push({ id: `object-${obj.id}`, kind: 'object', object: obj.id, text: obj.spoken, found: false, at: obj.at });
  }

  // Spread finds across the city. The crime scene always holds one.
  const capacity: Record<string, number> = {};
  caseDef.locations.forEach((l) => { capacity[l.id] = 0; });
  evidence.forEach((e) => { if (e.at) capacity[e.at] = (capacity[e.at] || 0) + 1; });
  const maxPer = Math.max(2, Math.ceil(evidence.length / caseDef.locations.length) + 1);
  const shuffledEvidence = rng.shuffle(evidence);
  const scenePick = shuffledEvidence.find((e) => e.kind === 'clue');
  if (scenePick) { scenePick.at = caseDef.scene; capacity[caseDef.scene] = (capacity[caseDef.scene] || 0) + 1; }
  const ring = rng.shuffle(caseDef.locations.map((l) => l.id));
  let cursor = 0;
  for (const e of shuffledEvidence) {
    if (e.at) continue;
    let guard = 0;
    while (capacity[ring[cursor % ring.length]] >= maxPer && guard++ < ring.length * 2) cursor++;
    const loc = ring[cursor % ring.length];
    e.at = loc; capacity[loc]++; cursor++;
  }

  // --- who will talk ------------------------------------------------------
  // Witnesses only know suspects who are actually in tonight's frame; the
  // others were written for a bigger roster and simply never come up.
  const witnesses: WitnessState[] = caseDef.witnesses.map((w) => ({
    id: w.id, at: w.at, patience: WITNESS_PATIENCE, described: [], leadGiven: false,
  }));

  return {
    chosenTraits,
    publicTraits: caseDef.publicTraits.slice(),
    hiddenTraits: chosenTraits.filter((t) => !caseDef.publicTraits.includes(t)),
    suspects,
    witnesses,
    culpritId,
    // Within a location, finds come up in a shuffled order so a search may
    // turn up a love letter before the coroner's sheet. Stable sort keeps the
    // shuffle; the order is what the search takes from the top.
    evidence: rng.shuffle(evidence),
    rounds: diff.budget,
    difficulty: diff.id,
  };
}
