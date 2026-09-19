// Read-only questions about a game state. No mutation lives here -- the UI and
// the reducer both ask these so they can never disagree about what is legal.

import { characterById } from './characters.js';
import { distance, ACCUSE_COST, ABILITY_COST } from './state.js';

export const currentPlayer = (s) => s.players[s.turn] || null;
export const locationById = (s, id) => s.map.locations.find((l) => l.id === id);
export const suspectsAt = (s, locId) => s.suspects.filter((x) => x.at === locId && !x.dead);
export const playersAt = (s, locId) => s.players.filter((p) => p.at === locId);

/** A suspect is out of the frame once a known trait of theirs contradicts a known fact. */
export function contradictions(s, suspect) {
  const out = [];
  for (const t of s.chosenTraits) {
    const fact = s.knownCulprit[t];
    if (!fact) continue;
    if (!suspect.known[t]) continue;
    if (suspect.traits[t] !== fact) out.push(t);
  }
  return out;
}

export const isEliminated = (s, suspect) =>
  suspect.dead || suspect.cleared || contradictions(s, suspect).length > 0;

export const liveSuspects = (s) => s.suspects.filter((x) => !isEliminated(s, x));

/** How much of the killer's description you have nailed down, 0..1. */
export const factsKnown = (s) => s.chosenTraits.filter((t) => s.knownCulprit[t]).length;

export function moveOptions(s, p) {
  if (!p) return [];
  const ch = characterById(p.charId);
  const hops = ch.id === 'quist' ? 2 : 1;
  return s.map.locations
    .filter((l) => l.id !== p.at && !s.sealed[l.id])
    .map((l) => ({ id: l.id, hops: distance(s, p.at, l.id) }))
    .filter((l) => l.hops >= 1 && l.hops <= hops);
}

export function moveCost(s, p) {
  const ch = characterById(p.charId);
  if (ch.id === 'ruby' && !p.freeMoveUsed) return 0;
  return 1 + s.modifiers.moveSurcharge;
}

export function canMove(s, p, toId) {
  if (!p || s.phase !== 'play') return false;
  const opts = moveOptions(s, p);
  if (!opts.some((o) => o.id === toId)) return false;
  return moveCost(s, p) === 0 || p.ap >= moveCost(s, p);
}

/** Honest, player-visible knowledge about a location -- never peeks at unfound evidence. */
export const searchRecord = (s, locId) => s.searched[locId] || { times: 0, empty: false };
export const looksExhausted = (s, locId) => searchRecord(s, locId).empty;

// Deliberately blind to whether evidence is actually there: that is exactly
// what the detectives are paying an hour to find out. A greyed-out button
// would hand it to them for free.
export const canSearch = (s, p) =>
  !!p && s.phase === 'play' && p.ap >= 1 && !s.sealed[p.at] && !looksExhausted(s, p.at);

export function canInterrogate(s, p, suspect) {
  if (!p || s.phase !== 'play' || p.ap < 1) return false;
  if (!suspect || suspect.dead || suspect.at !== p.at) return false;
  const ch = characterById(p.charId);
  if (suspect.clammed > 0 && ch.id !== 'kell') return false;
  return true;
}

export const canAccuse = (s, p) => !!p && s.phase === 'play' && p.ap >= ACCUSE_COST;
export const canUseAbility = (s, p) =>
  !!p && s.phase === 'play' && !p.abilityUsed && p.ap >= ABILITY_COST;

/** What, if anything, the ability needs the player to point at. */
export function abilityTarget(charId) {
  switch (characterById(charId).ability) {
    case 'VERDICT': return 'suspect-any';
    case 'CONFESSION': return 'suspect-here';
    case 'APB': return 'suspect-any';
    case 'BREAKIN': return 'location';
    default: return 'none';
  }
}

export function abilityBlocker(s, p) {
  if (!p) return 'No detective on the clock.';
  if (p.abilityUsed) return 'Already used this case.';
  if (p.ap < ABILITY_COST) return 'Not enough time left this turn.';
  const need = abilityTarget(p.charId);
  if (need === 'suspect-here' && suspectsAt(s, p.at).length === 0) return 'Nobody here to talk to.';
  return null;
}

export { ACCUSE_COST, ABILITY_COST };
