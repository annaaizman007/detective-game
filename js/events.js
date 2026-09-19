// Nightfall events. One fires at the end of every round, narrated aloud.
// Each effect receives the mutable state plus an `api` of rule helpers that
// state.js injects -- keeps this file free of circular imports.

export const EVENTS = [
  {
    id: 'downpour', title: 'Downpour', kind: 'bad',
    text: 'Rain comes down like nails on a coffin lid. The whole city slows to a crawl.',
    effect: (s) => { s.modifiers.moveSurcharge = 1; return 'Moving costs one extra action next round.'; },
  },
  {
    id: 'pressure', title: 'City Hall Leans In', kind: 'bad',
    text: 'A telephone rings in an office you will never be invited into. The commissioner wants this closed, or buried.',
    effect: (s) => { s.cold = Math.min(s.coldMax, s.cold + 1); return 'The trail cools by an extra step.'; },
  },
  {
    id: 'raid', title: 'Sealed Off', kind: 'bad',
    text: 'Uniforms string a cordon and nobody in a cheap coat gets past it.',
    effect: (s, api) => {
      const loc = api.pick(s.map.locations.filter((l) => l.id !== s.map.start));
      if (!loc) return null;
      s.sealed[loc.id] = 2;
      return `${loc.name} is sealed off.`;
    },
  },
  {
    id: 'panic', title: 'The City Scatters', kind: 'bad',
    text: 'Word gets around. Every guilty conscience in Ashgrave picks up its coat at once.',
    effect: (s, api) => { api.moveSuspects(); api.moveSuspects(); return 'Every suspect has moved twice.'; },
  },
  {
    id: 'blackout', title: 'Blackout', kind: 'bad',
    text: 'The grid stutters and half the bay goes dark. You work the next hours by matchlight.',
    effect: (s) => { s.modifiers.apPenalty = 1; return 'Every detective works one action short next round.'; },
  },
  {
    id: 'tipoff', title: 'An Anonymous Call', kind: 'good',
    text: 'The desk sergeant holds out the receiver. Nobody on the other end gives a name.',
    effect: (s, api) => {
      const t = api.revealCulpritTrait();
      return t ? `The caller knew something: ${t}` : 'The caller told you nothing you did not already have.';
    },
  },
  {
    id: 'informant', title: 'A Loose Tongue', kind: 'good',
    text: 'Somebody talks out of turn in a bar on Salt Street, and it gets back to you.',
    effect: (s, api) => {
      const r = api.revealSuspectTrait();
      return r || 'Nothing in it you had not already written down.';
    },
  },
  {
    id: 'corpse', title: 'A Second Body', kind: 'grim',
    text: 'They pull another one out before dawn. Loose ends do not survive long in this city.',
    effect: (s, api) => {
      const victims = s.suspects.filter((x) => x.id !== s.culpritId && !x.cleared && !x.dead);
      if (victims.length <= 1) return 'This time the body is nobody you were looking for.';
      const v = api.pick(victims);
      v.dead = true; v.cleared = true;
      return `${v.name} is dead. Whoever you are hunting, it was not them.`;
    },
  },
];

export const eventById = (id) => EVENTS.find((e) => e.id === id);
