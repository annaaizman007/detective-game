// Read-only questions about a game state. No mutation lives here -- the UI and
// the reducer both ask these so they can never disagree about what is legal.

import type { CharacterId, GameState, PlayerState, SuspectState, TraitId, WitnessDef, WitnessState } from '../types/game-types';
import { characterById } from './characters';
import { caseById } from './cases/index';
import { distance, ACCUSE_COST, ABILITY_COST } from './state';

export const currentPlayer = (s: GameState): PlayerState | null => s.players[s.turn] || null;
export const locationById = (s: GameState, id: string) => s.map.locations.find((l) => l.id === id);
export const suspectsAt = (s: GameState, locId: string) => s.suspects.filter((x) => x.at === locId && !x.dead);
export const playersAt = (s: GameState, locId: string) => s.players.filter((p) => p.at === locId);

/**
 * The killer's profile as the table currently believes it. In the assisted
 * notebook that is what the evidence has established; in the detective's own
 * notebook it is whatever they have written down -- which may be wrong.
 */
export type Profile = Partial<Record<TraitId, string | null>>;

/** A suspect is out of the frame once a known trait of theirs contradicts the profile. */
export function contradictions(s: GameState, suspect: SuspectState, profile: Profile = s.knownCulprit): TraitId[] {
  const out: TraitId[] = [];
  for (const t of s.chosenTraits) {
    const fact = profile[t];
    if (!fact) continue;
    if (!suspect.known[t]) continue;
    if (suspect.traits[t] !== fact) out.push(t);
  }
  return out;
}

export const isEliminated = (s: GameState, suspect: SuspectState, profile: Profile = s.knownCulprit): boolean =>
  suspect.dead || suspect.cleared || contradictions(s, suspect, profile).length > 0;

export const liveSuspects = (s: GameState, profile: Profile = s.knownCulprit) =>
  s.suspects.filter((x) => !isEliminated(s, x, profile));

/** How much of the killer's description the evidence has nailed down. */
export const factsKnown = (s: GameState): number => s.chosenTraits.filter((t) => s.knownCulprit[t]).length;

/** The hour on the clock: the case opens at two in the morning. */
export function clockAt(hour: number): string {
  const h = (2 + hour) % 24;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

export function moveOptions(s: GameState, p: PlayerState | null) {
  if (!p) return [];
  const ch = characterById(p.charId);
  const hops = ch.id === 'quist' ? 2 : 1;
  return s.map.locations
    .filter((l) => l.id !== p.at && !s.sealed[l.id])
    .map((l) => ({ id: l.id, hops: distance(s, p.at, l.id) }))
    .filter((l) => l.hops >= 1 && l.hops <= hops);
}

export function moveCost(s: GameState, p: PlayerState): number {
  const ch = characterById(p.charId);
  if (ch.id === 'ruby' && !p.freeMoveUsed) return 0;
  return 1 + s.modifiers.moveSurcharge;
}

export function canMove(s: GameState, p: PlayerState | null, toId: string): boolean {
  if (!p || s.phase !== 'play') return false;
  const opts = moveOptions(s, p);
  if (!opts.some((o) => o.id === toId)) return false;
  return moveCost(s, p) === 0 || p.ap >= moveCost(s, p);
}

/** Honest, player-visible knowledge about a location -- never peeks at unfound evidence. */
export const searchRecord = (s: GameState, locId: string) => s.searched[locId] || { times: 0, empty: false };
export const looksExhausted = (s: GameState, locId: string): boolean => searchRecord(s, locId).empty;
export const hasLead = (s: GameState, locId: string): boolean => !!s.leads[locId];

// Deliberately blind to whether evidence is actually there: that is exactly
// what the detectives are paying an hour to find out. A greyed-out button
// would hand it to them for free.
export const canSearch = (s: GameState, p: PlayerState | null): boolean =>
  !!p && s.phase === 'play' && p.ap >= 1 && !s.sealed[p.at] && !looksExhausted(s, p.at);

export function canInterrogate(s: GameState, p: PlayerState | null, suspect: SuspectState | undefined): boolean {
  if (!p || s.phase !== 'play' || p.ap < 1) return false;
  if (!suspect || suspect.dead || suspect.at !== p.at) return false;
  const ch = characterById(p.charId);
  if (suspect.clammed > 0 && ch.id !== 'kell') return false;
  return true;
}

/** Pressing hard shuts a suspect down, so it is only worth it while they
 *  still have several things left to give. */
export const unknownTraits = (s: GameState, suspect: SuspectState): number =>
  s.chosenTraits.filter((t) => !suspect.known[t]).length;

// ------------------------------------------------------------- witnesses

export interface WitnessView {
  state: WitnessState;
  def: WitnessDef;
  /** Suspects in tonight's frame this witness can still describe. */
  canDescribe: SuspectState[];
  canLead: boolean;
}

export function witnessAt(s: GameState, locId: string): WitnessView | null {
  const w = s.witnesses.find((x) => x.at === locId);
  if (!w) return null;
  const def = caseById(s.caseId).witnesses.find((d) => d.id === w.id);
  if (!def) return null;
  const canDescribe = s.suspects.filter((x) => def.knows.includes(x.id) && !x.dead && !w.described.includes(x.id));
  return { state: w, def, canDescribe, canLead: !w.leadGiven };
}

export const witnessById = (s: GameState, id: string): WitnessView | null => {
  const w = s.witnesses.find((x) => x.id === id);
  return w ? witnessAt(s, w.at) : null;
};

export function canAsk(s: GameState, p: PlayerState | null, view: WitnessView | null): boolean {
  if (!p || !view || s.phase !== 'play' || p.ap < 1) return false;
  if (view.state.at !== p.at || view.state.patience <= 0) return false;
  return view.canDescribe.length > 0 || view.canLead;
}

// --------------------------------------------------------------- objects

export const objectDefs = (s: GameState) => caseById(s.caseId).objects;
export const heldObjects = (s: GameState) => objectDefs(s).filter((o) => s.objects.includes(o.id));

/** Objects you could hand this person right now: held, and not shown to them before. */
export function showable(s: GameState, p: PlayerState | null, personId: string): ReturnType<typeof heldObjects> {
  if (!p || s.phase !== 'play' || p.ap < 1) return [];
  return heldObjects(s).filter((o) => !(s.shown[o.id] || []).includes(personId));
}

// ---------------------------------------------------------------- topics

export interface TopicView { id: string; q: string; cost: number; asked: boolean }

/** The questions you can still put to this person, in the order written. */
export function topicsFor(s: GameState, personId: string): TopicView[] {
  const c = caseById(s.caseId);
  const def = c.suspects.find((x) => x.id === personId)?.topics ?? c.witnesses.find((w) => w.id === personId)?.topics ?? [];
  const asked = s.asked[personId] || [];
  return def
    .filter((t) => !asked.includes(t.id))
    .filter((t) => !t.after || asked.includes(t.after))
    .filter((t) => !t.needs || s.objects.includes(t.needs))
    .map((t) => ({ id: t.id, q: t.q, cost: t.cost ?? 0, asked: false }));
}

/** What has already been said, for reading back. */
export function askedTopics(s: GameState, personId: string): { q: string; a: string }[] {
  const c = caseById(s.caseId);
  const def = c.suspects.find((x) => x.id === personId)?.topics ?? c.witnesses.find((w) => w.id === personId)?.topics ?? [];
  const asked = s.asked[personId] || [];
  return def.filter((t) => asked.includes(t.id)).map((t) => ({ q: t.q, a: t.a }));
}

export const canAccuse = (s: GameState, p: PlayerState | null): boolean =>
  !!p && s.phase === 'play' && p.ap >= ACCUSE_COST;
export const canUseAbility = (s: GameState, p: PlayerState | null): boolean =>
  !!p && s.phase === 'play' && !p.abilityUsed && p.ap >= ABILITY_COST;

export type AbilityTarget = 'suspect-any' | 'suspect-here' | 'location' | 'none';

/** What, if anything, the ability needs the player to point at. */
export function abilityTarget(charId: CharacterId): AbilityTarget {
  switch (characterById(charId).ability) {
    case 'VERDICT': return 'suspect-any';
    case 'CONFESSION': return 'suspect-here';
    case 'APB': return 'suspect-any';
    case 'BREAKIN': return 'location';
    default: return 'none';
  }
}

export function abilityBlocker(s: GameState, p: PlayerState | null): string | null {
  if (!p) return 'No detective on the clock.';
  if (p.abilityUsed) return 'Already used this case.';
  if (p.ap < ABILITY_COST) return 'Not enough time left this turn.';
  const need = abilityTarget(p.charId);
  if (need === 'suspect-here' && suspectsAt(s, p.at).length === 0) return 'Nobody here to talk to.';
  return null;
}

export { ACCUSE_COST, ABILITY_COST };
