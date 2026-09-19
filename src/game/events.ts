// Nightfall events. One fires every four hours of the case, narrated aloud.
// Each effect receives the mutable state plus an `api` of rule helpers that
// state.ts injects -- keeps this file free of circular imports.

import type { GameState } from '../types/game-types';

export interface Spoken {
  text: string;
  parts: string[];
}

export interface EventApi {
  pick: <T>(arr: T[]) => T | null;
  moveSuspects: () => void;
  revealCulpritTrait: () => Spoken | null;
  revealSuspectTrait: () => Spoken | null;
}

export interface EventDef {
  id: string;
  title: string;
  kind: 'bad' | 'good' | 'grim';
  text: string;
  effect: (s: GameState, api: EventApi) => string | Spoken | null;
}

export const EVENTS: EventDef[] = [
  {
    id: 'downpour', title: 'Downpour', kind: 'bad',
    text: 'The rain comes down hard and the whole city slows to a crawl. Getting anywhere takes longer.',
    effect: (s) => { s.modifiers.moveSurcharge = 1; return 'Moving costs one extra action next round.'; },
  },
  {
    id: 'pressure', title: 'City Hall Leans In', kind: 'bad',
    text: 'The commissioner telephones. He wants this case closed fast, and he does not care how. You lose time answering him.',
    effect: (s) => { s.cold = Math.min(s.coldMax, s.cold + 1); return 'The trail cools by an extra step.'; },
  },
  {
    id: 'raid', title: 'Sealed Off', kind: 'bad',
    text: 'The police seal off one street with a cordon. Nobody gets in for a while.',
    effect: (s, api) => {
      const loc = api.pick(s.map.locations.filter((l) => l.id !== s.map.start));
      if (!loc) return null;
      s.sealed[loc.id] = 2;
      return { text: `${loc.name} is sealed off.`, parts: [loc.name, 'is sealed off.'] };
    },
  },
  {
    id: 'panic', title: 'The City Scatters', kind: 'bad',
    text: 'Word gets around that the police are asking questions. Every suspect moves somewhere else at once.',
    effect: (s, api) => { api.moveSuspects(); api.moveSuspects(); return 'Every suspect has moved twice.'; },
  },
  {
    id: 'blackout', title: 'Blackout', kind: 'bad',
    text: 'The power fails and half the city goes dark. Everything takes longer for the next few hours.',
    effect: (s) => { s.modifiers.apPenalty = 1; return 'Every detective works one action short next round.'; },
  },
  {
    id: 'tipoff', title: 'An Anonymous Call', kind: 'good',
    text: 'The desk sergeant holds out the telephone. Somebody who will not give a name has something to tell you.',
    effect: (s, api) => {
      const t = api.revealCulpritTrait();
      return t
        ? { text: `The caller knew something: ${t.text}`, parts: ['The caller knew something:', ...t.parts] }
        : 'The caller told you nothing you did not already have.';
    },
  },
  {
    id: 'informant', title: 'A Loose Tongue', kind: 'good',
    text: 'Somebody says too much in a bar, and it gets back to you.',
    effect: (s, api) => {
      const r = api.revealSuspectTrait();
      return r || 'Nothing in it you had not already written down.';
    },
  },
  {
    id: 'corpse', title: 'A Second Body', kind: 'grim',
    text: 'Another body is found before dawn. Somebody who knew too much has been silenced.',
    effect: (s, api) => {
      const victims = s.suspects.filter((x) => x.id !== s.culpritId && !x.cleared && !x.dead);
      if (victims.length <= 1) return 'This time the body is nobody you were looking for.';
      const v = api.pick(victims);
      if (!v) return null;
      v.dead = true; v.cleared = true;
      return { text: `${v.name} is dead. Whoever you are hunting, it was not them.`,
        parts: [v.name, 'is dead. Whoever you are hunting, it was not them.'] };
    },
  },
];

export const eventById = (id: string): EventDef | undefined => EVENTS.find((e) => e.id === id);
