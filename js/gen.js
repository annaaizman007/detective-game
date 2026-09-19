// Case generation.
//
// The culprit is re-rolled every playthrough, so the same case never solves the
// same way twice. The one hard guarantee: after every clue on the map has been
// found, exactly ONE suspect can still fit. No unsolvable nights.

import { stream } from './rng.js';
import { TRAITS, traitValue } from './traits.js';

// `budget` is the number of HOURS on the clock, and one action burns one hour.
// Counting actions rather than rounds is what keeps the case just as hard with
// six detectives as with one -- six people simply burn the night six times
// faster. Counting rounds instead made a full table trivial.
export const DIFFICULTIES = {
  rookie: { id: 'rookie', label: 'Rookie', traits: 4, suspects: 5, budget: 26,
    note: 'Four facts, five suspects, twenty-six hours. Room to be wrong once.' },
  detective: { id: 'detective', label: 'Detective', traits: 5, suspects: 6, budget: 19,
    note: 'Five facts, six suspects, nineteen hours. The case as written.' },
  commissioner: { id: 'commissioner', label: 'Commissioner', traits: 6, suspects: 8, budget: 15,
    note: 'Six facts, eight suspects, fifteen hours. Most nights you lose.' },
};


export const BOONS = {
  tip: { id: 'tip', label: 'A scribbled tip', icon: 'note',
    text: 'A note in a dead man’s handwriting, folded four times.' },
  spur: { id: 'spur', label: 'A fresh lead', icon: 'lead',
    text: 'A name, an address, and a reason to hurry.' },
  coffee: { id: 'coffee', label: 'Second wind', icon: 'cup',
    text: 'Black coffee and a cigarette on somebody else’s tab.' },
  ledger: { id: 'ledger', label: 'A private ledger', icon: 'book',
    text: 'Somebody wrote down what they should have burned.' },
};

/** Deal trait values so every category is genuinely spread across the suspects. */
function dealTraits(rng, suspectIds, traitIds) {
  const out = {};
  suspectIds.forEach((id) => { out[id] = {}; });
  for (const t of traitIds) {
    const vals = TRAITS[t].values.map((v) => v.id);
    const pool = [];
    // Cycle through a shuffled value list so no value dominates the table.
    while (pool.length < suspectIds.length) pool.push(...rng.shuffle(vals));
    const deal = rng.shuffle(pool.slice(0, suspectIds.length));
    suspectIds.forEach((id, i) => { out[id][t] = deal[i]; });
  }
  return out;
}

const vectorOf = (traits, traitIds) => traitIds.map((t) => traits[t]).join('|');

export function buildCase(caseDef, { difficulty = 'detective', seed = 'ashgrave' } = {}) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.detective;
  const rng = stream(`${seed}:${caseDef.id}:${difficulty}`);

  // --- which facts are in play -------------------------------------------
  const extraCount = Math.max(0, diff.traits - caseDef.publicTraits.length);
  const hiddenTraits = rng.shuffle(caseDef.traitPool).slice(0, extraCount);
  const chosenTraits = [...caseDef.publicTraits, ...hiddenTraits];

  // --- who is in the frame ------------------------------------------------
  const roster = rng.shuffle(caseDef.suspects).slice(0, Math.min(diff.suspects, caseDef.suspects.length));
  const ids = roster.map((s) => s.id);

  let dealt = null;
  let culpritId = rng.pick(ids);
  for (let attempt = 0; attempt < 400; attempt++) {
    const candidate = dealTraits(rng, ids, chosenTraits);
    culpritId = rng.pick(ids);
    const mine = vectorOf(candidate[culpritId], chosenTraits);
    const unique = ids.every((id) => id === culpritId || vectorOf(candidate[id], chosenTraits) !== mine);
    if (unique) { dealt = candidate; break; }
  }
  if (!dealt) {
    // Astronomically unlikely. Force uniqueness rather than ever shipping an
    // unsolvable board.
    dealt = dealTraits(rng, ids, chosenTraits);
    culpritId = ids[0];
    for (const id of ids.slice(1)) {
      if (vectorOf(dealt[id], chosenTraits) === vectorOf(dealt[culpritId], chosenTraits)) {
        const t = rng.pick(chosenTraits);
        const others = TRAITS[t].values.map((v) => v.id).filter((v) => v !== dealt[culpritId][t]);
        dealt[id][t] = rng.pick(others);
      }
    }
  }

  const suspects = roster.map((s) => ({
    ...s,
    traits: dealt[s.id],
    known: Object.fromEntries(chosenTraits.map((t) => [t, caseDef.publicTraits.includes(t)])),
    at: null,
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
  const culpritTraits = dealt[culpritId];
  const evidence = chosenTraits.map((t, i) => ({
    id: `clue-${t}`,
    kind: 'clue',
    trait: t,
    value: culpritTraits[t],
    text: traitValue(t, culpritTraits[t]).clue,
    found: false,
    at: null,
    order: i,
  }));

  const boonPlan = ['tip', 'spur', 'coffee', 'ledger', 'spur', 'coffee'].slice(0, diff.traits >= 6 ? 6 : 4);
  boonPlan.forEach((b, i) => evidence.push({
    id: `boon-${b}-${i}`, kind: 'boon', boon: b, text: BOONS[b].text,
    found: false, at: null,
  }));

  // Spread finds across the city. The crime scene always holds one.
  const capacity = {};
  caseDef.locations.forEach((l) => { capacity[l.id] = 0; });
  const maxPer = Math.max(2, Math.ceil(evidence.length / caseDef.locations.length) + 1);
  const shuffledEvidence = rng.shuffle(evidence);
  const scenePick = shuffledEvidence.find((e) => e.kind === 'clue');
  if (scenePick) { scenePick.at = caseDef.scene; capacity[caseDef.scene] = 1; }
  let ring = rng.shuffle(caseDef.locations.map((l) => l.id));
  let cursor = 0;
  for (const e of shuffledEvidence) {
    if (e.at) continue;
    let guard = 0;
    while (capacity[ring[cursor % ring.length]] >= maxPer && guard++ < ring.length * 2) cursor++;
    const loc = ring[cursor % ring.length];
    e.at = loc; capacity[loc]++; cursor++;
  }

  return {
    chosenTraits,
    publicTraits: caseDef.publicTraits.slice(),
    hiddenTraits: chosenTraits.filter((t) => !caseDef.publicTraits.includes(t)),
    suspects,
    culpritId,
    evidence: evidence.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'clue' ? -1 : 1)),
    rounds: diff.budget,
    difficulty: diff.id,
  };
}
