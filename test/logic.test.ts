// Headless soak test: plays thousands of full games with a dumb-but-legal bot.
// Catches unsolvable boards, stuck turns, illegal-state crashes and determinism
// drift (the property the online transport depends on).

import { describe, expect, it } from 'vitest';
import { createGame, applyAction } from '../src/game/state';
import { CASES } from '../src/game/cases/index';
import { CHARACTERS } from '../src/game/characters';
import { DIFFICULTIES, LOOKALIKES, looksLike } from '../src/game/gen';
import * as R from '../src/game/rules';
import { stream } from '../src/game/rng';
import { APPROACHES } from '../src/game/dialogue';
import { collectLines, normaliseLine } from '../src/game/lines';
import { EXHIBITS, missingExhibits, readAloud } from '../src/game/exhibits';
import { searchNarrative } from '../src/game/search';
import type { Action, DifficultyId, GameState } from '../src/types/game-types';

const DIFFS = Object.keys(DIFFICULTIES) as DifficultyId[];

function newGame(caseId: string, difficulty: DifficultyId, seed: string, nPlayers: number): GameState {
  const rng = stream(seed);
  const chars = rng.shuffle(CHARACTERS).slice(0, nPlayers);
  return createGame({
    caseId, difficulty, seed,
    players: chars.map((c, i) => ({ id: `p${i}`, charId: c.id, name: c.short })),
  });
}

/** Plays greedily: search where there is evidence, else interrogate, else walk. */
function playOut(s: GameState, seed: string, { accuseWhenSure = true } = {}) {
  const rng = stream(`bot:${seed}`);
  let guard = 0;
  while (s.phase === 'play' && guard++ < 4000) {
    const p = R.currentPlayer(s);
    if (!p) break;
    const live = R.liveSuspects(s);
    if (accuseWhenSure && live.length === 1 && R.canAccuse(s, p)) {
      s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: live[0].id });
      continue;
    }
    if (R.canSearch(s, p)) { s = applyAction(s, { type: 'SEARCH', playerId: p.id }); continue; }
    const here = R.suspectsAt(s, p.at).filter((x) => R.canInterrogate(s, p, x) && !R.isEliminated(s, x));
    if (here.length) {
      const target = rng.pick(here);
      const unknown = R.unknownTraits(s, target);
      s = applyAction(s, {
        type: 'INTERROGATE', playerId: p.id, suspectId: target.id,
        approach: unknown >= 2 ? 'press' : 'straight',
      });
      continue;
    }
    // A witness is worth an hour when they can describe somebody still in the frame.
    const w = R.witnessAt(s, p.at);
    if (w && R.canAsk(s, p, w)) {
      const subject = w.canDescribe.find((x) => !R.isEliminated(s, x) && R.unknownTraits(s, x) > 0);
      if (subject) { s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'about', suspectId: subject.id }); continue; }
      if (w.canLead) { s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'lead' }); continue; }
    }
    const opts = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
    // The bot only knows what a player knows: which places it has already
    // turned over, and where a witness has pointed.
    const leads = opts.filter((o) => R.hasLead(s, o.id));
    const juicy = opts.filter((o) => !R.looksExhausted(s, o.id));
    if (opts.length) {
      const pool = leads.length ? leads : juicy.length ? juicy : opts;
      s = applyAction(s, { type: 'MOVE', playerId: p.id, to: rng.pick(pool).id });
      continue;
    }
    s = applyAction(s, { type: 'END_TURN', playerId: p.id });
  }
  return { s, guard };
}

const stripTransient = (s: GameState) => JSON.stringify({ ...s, narration: [], conversation: null, testimony: null });

describe('THE ASHGRAVE FILES -- logic suite', () => {
  it('every case builds at every difficulty and every player count', () => {
    for (const c of CASES) for (const d of DIFFS) for (let n = 1; n <= 6; n++) {
      const s = newGame(c.id, d, `b-${c.id}-${d}-${n}`, n);
      expect(s.players.length).toBe(n);
      expect(s.suspects.length).toBeGreaterThanOrEqual(5);
      expect(s.evidence.every((e) => e.at)).toBe(true);
      expect(s.suspects.some((x) => x.id === s.culpritId)).toBe(true);
      expect(s.witnesses.length).toBeGreaterThan(0);
    }
  });

  it('every city map is connected and every witness stands somewhere real', () => {
    for (const c of CASES) {
      const s = newGame(c.id, 'detective', `conn-${c.id}`, 1);
      for (const l of s.map.locations) expect(R.moveOptions(s, { ...s.players[0], at: l.id }).length).toBeGreaterThan(0);
      for (const w of c.witnesses) {
        expect(c.locations.some((l) => l.id === w.at), `${c.id}: witness ${w.id} at unknown ${w.at}`).toBe(true);
        for (const k of w.knows) expect(c.suspects.some((x) => x.id === k), `${c.id}: witness ${w.id} knows unknown ${k}`).toBe(true);
      }
      const seen = new Set(c.witnesses.map((w) => w.at));
      expect(seen.size).toBe(c.witnesses.length); // one witness per location
    }
  });

  it('the culprit is always the unique fit once every fact is known', () => {
    for (let i = 0; i < 600; i++) {
      const c = CASES[i % CASES.length];
      const d = DIFFS[i % 3];
      const s = newGame(c.id, d, `u${i}`, 3);
      const culprit = s.suspects.find((x) => x.id === s.culpritId)!;
      const fits = s.suspects.filter((x) => s.chosenTraits.every((t) => x.traits[t] === culprit.traits[t]));
      expect(fits.length, `${c.id}/${d}/${i}: ${fits.length} suspects fit`).toBe(1);
    }
  });

  it('a full game always terminates in a win or a loss', () => {
    let wins = 0, losses = 0;
    for (let i = 0; i < 400; i++) {
      const c = CASES[i % CASES.length];
      const d = DIFFS[i % 3];
      const s = newGame(c.id, d, `p${i}`, 1 + (i % 6));
      const { s: end, guard } = playOut(s, `p${i}`);
      expect(end.phase, `game ${i} never ended`).toBe('over');
      expect(guard).toBeLessThan(4000);
      expect(['win', 'loss']).toContain(end.result);
      if (end.result === 'win') wins++; else losses++;
    }
    console.log(`       (bot record: ${wins}W / ${losses}L)`);
    expect(wins, 'bot never won a single game -- the game may be unwinnable').toBeGreaterThan(0);
    expect(losses, 'bot never lost -- the game may have no tension').toBeGreaterThan(0);
  });

  it('identical action logs produce byte-identical states (needed for online play)', () => {
    for (let i = 0; i < 40; i++) {
      const a = playOut(newGame('orchid', 'detective', `det${i}`, 3), `det${i}`).s;
      const b = playOut(newGame('orchid', 'detective', `det${i}`, 3), `det${i}`).s;
      expect(JSON.stringify(a), `divergence on seed det${i}`).toBe(JSON.stringify(b));
    }
  });

  it('illegal actions are rejected without changing anything', () => {
    const s = newGame('orchid', 'detective', 'illegal', 2);
    const before = stripTransient(s);
    expect(stripTransient(applyAction(s, { type: 'SEARCH', playerId: s.players[1].id })), 'acted out of turn').toBe(before);
    expect(stripTransient(applyAction(s, { type: 'MOVE', playerId: s.players[0].id, to: 'atlantis' })), 'moved nowhere').toBe(before);
    expect(stripTransient(applyAction(s, { type: 'MOVE', playerId: s.players[0].id, to: 'manor' })), 'teleported').toBe(before);
    expect(stripTransient(applyAction(s, { type: 'ASK', playerId: s.players[0].id, witnessId: 'pruett', question: 'lead' })), 'asked a witness across town').toBe(before);
  });

  it('a wrong accusation costs time and clears the suspect', () => {
    let s = newGame('orchid', 'rookie', 'wrong', 1);
    const innocent = s.suspects.find((x) => x.id !== s.culpritId)!;
    const p = s.players[0];
    s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: innocent.id });
    expect(s.cold).toBeGreaterThanOrEqual(3);
    expect(s.suspects.find((x) => x.id === innocent.id)!.cleared).toBe(true);
    expect(s.result).not.toBe('win');
  });

  it('a right accusation wins immediately', () => {
    let s = newGame('salt', 'rookie', 'right', 2);
    s = applyAction(s, { type: 'ACCUSE', playerId: s.players[0].id, suspectId: s.culpritId });
    expect(s.result).toBe('win');
    expect(s.phase).toBe('over');
  });

  it('every ability runs without throwing and is once per case', () => {
    for (const ch of CHARACTERS) {
      const s = createGame({ caseId: 'bell', difficulty: 'rookie', seed: `ab-${ch.id}`,
        players: [{ id: 'p0', charId: ch.id, name: ch.short }] });
      const p = s.players[0];
      const need = R.abilityTarget(ch.id);
      const act: Extract<Action, { type: 'ABILITY' }> = { type: 'ABILITY', playerId: p.id };
      if (need === 'suspect-any') act.suspectId = s.suspects[0].id;
      if (need === 'location') act.locationId = s.map.locations[3].id;
      if (need === 'suspect-here') {
        s.suspects[0].at = p.at; // walk somebody to us first
        act.suspectId = s.suspects[0].id;
      }
      const after = applyAction(s, act);
      expect(after.players[0].abilityUsed, `${ch.id} ability did not fire`).toBe(true);
      const again = applyAction(after, act);
      expect(again.players[0].ap, `${ch.id} ability fired twice`).toBe(after.players[0].ap);
    }
  });

  it('each way of questioning does what it promises', () => {
    for (const approach of APPROACHES) {
      // Quist deliberately: Kell is never clammed out and Crane gets an extra
      // trait, so either would mask what the approach itself does.
      const s = createGame({
        caseId: 'orchid', difficulty: 'commissioner', seed: `talk-${approach.id}`,
        players: [{ id: 'p0', charId: 'quist', name: 'Quist' }],
      });
      const p = s.players[0];
      const x = s.suspects[0];
      x.at = p.at;
      x.clammed = 0;
      const before = s.suspects.map((y) => ({ id: y.id, known: { ...y.known } }));
      const after = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: x.id, approach: approach.id });

      expect(after.conversation, `${approach.id}: no conversation recorded`).toBeTruthy();
      expect(after.conversation!.ask && after.conversation!.reply).toBeTruthy();
      expect(after.conversation!.learned.length).toBe(approach.reveals);

      const revealed = after.suspects.reduce((n, y) => {
        const was = before.find((b) => b.id === y.id)!;
        return n + after.chosenTraits.filter((t) => y.known[t] && !was.known[t]).length;
      }, 0);
      expect(revealed, `${approach.id}: revealed ${revealed} traits`).toBe(approach.reveals);

      const subject = after.conversation!.subjectId;
      if (approach.aboutOther) expect(subject).not.toBe(x.id);
      else expect(subject).toBe(x.id);
      expect(after.suspects.find((y) => y.id === x.id)!.clammed).toBe(approach.clams);
    }
  });

  it('a witness describes a suspect they know, files a statement, and then tires', () => {
    let s = createGame({ caseId: 'orchid', difficulty: 'commissioner', seed: 'witness',
      players: [{ id: 'p0', charId: 'hale', name: 'Hale' }] });
    const p = s.players[0];
    p.at = 'gilded';
    const w = R.witnessAt(s, 'gilded')!;
    expect(w.def.id).toBe('pruett');
    expect(w.canDescribe.length).toBeGreaterThan(0);
    const subject = w.canDescribe[0];
    const knownBefore = s.chosenTraits.filter((t) => subject.known[t]).length;

    s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: 'pruett', question: 'about', suspectId: subject.id });
    expect(s.testimony?.subjectId).toBe(subject.id);
    expect(s.testimony?.trait).toBeTruthy();
    const after = s.suspects.find((x) => x.id === subject.id)!;
    expect(s.chosenTraits.filter((t) => after.known[t]).length).toBe(knownBefore + 1);
    expect(s.exhibits.at(-1)?.def).toBe('statement');
    expect(s.journal.some((j) => j.kind === 'ask')).toBe(true);

    // The same witness will not describe the same person twice.
    const again = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: 'pruett', question: 'about', suspectId: subject.id });
    expect(again.players[0].ap).toBe(s.players[0].ap);

    // A lead points at a place with something still to find.
    s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: 'pruett', question: 'lead' });
    expect(s.testimony?.question).toBe('lead');
    const loc = s.testimony!.locationId!;
    expect(s.leads[loc]).toBe(true);
    expect(s.evidence.some((e) => e.at === loc && !e.found)).toBe(true);
    expect(R.witnessAt(s, 'gilded')!.state.patience).toBe(0);
  });

  it('people answer their own questions, once, and a paid one gives something up', () => {
    let s = createGame({ caseId: 'orchid', difficulty: 'commissioner', seed: 'talk-topics', players: [{ id: 'p0', charId: 'quist', name: 'Quist' }] });
    const p = s.players[0];
    p.at = 'trust';
    const free = R.topicsFor(s, 'vine').find((t) => t.cost === 0)!;
    s = applyAction(s, { type: 'TALK', playerId: p.id, personId: 'vine', topicId: free.id });
    expect(s.talking?.q).toBe(free.q);
    expect(s.players[0].ap).toBe(p.ap);
    expect(R.topicsFor(s, 'vine').some((t) => t.id === free.id)).toBe(false);
    const again = applyAction(s, { type: 'TALK', playerId: p.id, personId: 'vine', topicId: free.id });
    expect(again.talking).toBeNull();
    const paid = R.topicsFor(s, 'vine').find((t) => t.cost > 0)!;
    const before = s.suspects.map((x) => s.chosenTraits.filter((t) => x.known[t]).length).reduce((a, b) => a + b, 0);
    s = applyAction(s, { type: 'TALK', playerId: p.id, personId: 'vine', topicId: paid.id });
    expect(s.players[0].ap).toBe(p.ap - 1);
    const after = s.suspects.map((x) => s.chosenTraits.filter((t) => x.known[t]).length).reduce((a, b) => a + b, 0);
    expect(after).toBeGreaterThanOrEqual(before);
    expect(s.journal.at(-1)?.kind).toBe('question');
    // Nobody answers from across town.
    const far = createGame({ caseId: 'orchid', difficulty: 'rookie', seed: 'talk-far', players: [{ id: 'p0', charId: 'hale', name: 'Hale' }] });
    expect(applyAction(far, { type: 'TALK', playerId: 'p0', personId: 'vine', topicId: 'night' }).talking).toBeNull();
  });

  it('an object shown to the right person unlocks a scene, and a wrong one is a shrug', () => {
    let s = createGame({ caseId: 'orchid', difficulty: 'commissioner', seed: 'objects', players: [{ id: 'p0', charId: 'hale', name: 'Hale' }] });
    const p = s.players[0];
    const obj = CASES[0].objects[0];
    s.objects.push(obj.id);
    const target = obj.unlocks[0];
    const w = s.witnesses.find((x) => x.id === target.person);
    const x = s.suspects.find((y) => y.id === target.person);
    p.at = w ? w.at : x ? x.at : p.at;
    s = applyAction(s, { type: 'SHOW', playerId: p.id, objectId: obj.id, personId: target.person });
    expect(s.showing?.unlocked).toBe(true);
    expect(s.showing?.reply).toBe(target.reply);
    expect(s.shown[obj.id]).toContain(target.person);
    const again = applyAction(s, { type: 'SHOW', playerId: p.id, objectId: obj.id, personId: target.person });
    expect(again.showing).toBeNull();
    // Somebody it means nothing to.
    const other = s.witnesses.find((y) => y.id !== target.person && !obj.unlocks.some((u) => u.person === y.id))!;
    s.players[0].at = other.at; s.players[0].ap = 2;
    s = applyAction(s, { type: 'SHOW', playerId: p.id, objectId: obj.id, personId: other.id });
    expect(s.showing?.unlocked).toBe(false);
  });

  it('every collected clue is a document in the locker, and the locker has no holes', () => {
    expect(missingExhibits()).toEqual([]);
    for (const ex of Object.values(EXHIBITS)) {
      expect(ex.body.length).toBeGreaterThan(0);
      expect(ex.reading.length).toBeGreaterThan(0);
    }
    let s = newGame('bell', 'rookie', 'locker', 1);
    const p = s.players[0];
    const ev = s.evidence.find((e) => e.kind === 'clue')!;
    p.at = ev.at;
    s = applyAction(s, { type: 'SEARCH', playerId: p.id });
    expect(s.exhibits.length).toBeGreaterThanOrEqual(1);
    expect(s.exhibits[0].def).toMatch(/^(clue|boon):/);
    expect(s.journal.filter((j) => j.kind === 'exhibit').length).toBe(s.exhibits.length);
    // Every filed paper says how it came to hand, on the paper and in the journal.
    for (const ex of s.exhibits) {
      expect(ex.how).toMatch(/^Found at /);
      const entry = s.journal.find((j) => j.ref?.exhibit === ex.key)!;
      expect(entry.text).toContain(ex.how);
      expect(entry.ref?.location).toBe(ex.at);
    }
  });

  it('the notebook agrees with the painting: pinned traits are never re-dealt', () => {
    for (const c of CASES) {
      for (const d of DIFFS) {
        for (let i = 0; i < 6; i++) {
          const s = newGame(c.id, d, `pin${i}`, 1);
          for (const x of s.suspects) {
            const def = c.suspects.find((y) => y.id === x.id)!;
            for (const [t, v] of Object.entries(def.traits ?? {})) if (s.chosenTraits.includes(t as never)) expect(x.traits[t as keyof typeof x.traits]).toBe(v);
          }
        }
      }
    }
  });

  it('the public papers never single the killer out: every roster seats lookalikes', () => {
    for (const c of CASES) {
      const killer = c.suspects.find((x) => x.id === c.culprit)!;
      const twins = c.suspects.filter((x) => x.id !== c.culprit && !x.hidden && looksLike(x, killer, c.publicTraits));
      expect(twins.length, `${c.id}: only ${twins.length} suspects are pinned to the killer's build and hair`).toBeGreaterThanOrEqual(LOOKALIKES);
      for (const d of DIFFS) for (let i = 0; i < 20; i++) {
        const s = newGame(c.id, d, `twin${i}`, 1);
        const me = s.suspects.find((x) => x.id === s.culpritId)!;
        const still = s.suspects.filter((x) => x.id !== me.id && !x.hidden && s.publicTraits.every((t) => x.traits[t] === me.traits[t]));
        expect(still.length, `${c.id}/${d}/twin${i}: build and hair leave ${still.length} others standing`).toBeGreaterThanOrEqual(LOOKALIKES);
      }
    }
  });

  it('a suspect written with a home never leaves it', () => {
    for (const c of CASES) {
      const homed = c.suspects.filter((x) => x.home);
      if (!homed.length) continue;
      let s = newGame(c.id, 'commissioner', `home-${c.id}`, 2);
      for (const x of s.suspects) if (x.home) x.hidden = false; // as if every one had been revealed
      for (let i = 0; i < 40 && s.phase === 'play'; i++) s = applyAction(s, { type: 'END_TURN', playerId: R.currentPlayer(s)!.id });
      for (const x of s.suspects) if (x.home) expect(x.at, `${c.id}: ${x.id} wandered to ${x.at}`).toBe(x.home);
    }
  });

  it('every gated question names a real document, object or conversation, and every hidden thing can be found', () => {
    for (const c of CASES) {
      const people = [...c.suspects, ...c.witnesses];
      const ids = new Set([...c.items.map((i) => i.id), ...c.objects.map((o) => o.id)]);
      const topicsOf = (pid: string) => people.find((p) => p.id === pid)?.topics ?? [];
      for (const p of people) {
        for (const t of p.topics ?? []) {
          for (const n of Array.isArray(t.needs) ? t.needs : t.needs ? [t.needs] : []) {
            const dot = n.indexOf('.');
            const ok = dot > 0 ? topicsOf(n.slice(0, dot)).some((x) => x.id === n.slice(dot + 1)) : ids.has(n);
            expect(ok, `${c.id}: ${p.id}.${t.id} needs ${n}`).toBe(true);
          }
        }
      }
      // Something in the case must be able to reveal each hidden place and person.
      const effects: { locationId?: string; suspectId?: string }[] = [];
      const grab = (fx?: { type: string; locationId?: string; suspectId?: string }) => { if (fx?.type === 'reveal') effects.push(fx); };
      people.forEach((p) => (p.topics ?? []).forEach((t) => grab(t.effect)));
      c.items.forEach((i) => grab(i.effect));
      c.objects.forEach((o) => o.unlocks.forEach((u) => grab(u.effect)));
      for (const l of c.locations.filter((x) => x.hidden)) expect(effects.some((e) => e.locationId === l.id), `${c.id}: nothing reveals ${l.id}`).toBe(true);
      for (const x of c.suspects.filter((y) => y.hidden)) {
        expect(effects.some((e) => e.suspectId === x.id), `${c.id}: nothing reveals ${x.id}`).toBe(true);
        expect(x.home, `${c.id}: hidden suspect ${x.id} needs a home`).toBeTruthy();
      }
    }
  });

  it('a search tells the same story every time, and a document reads aloud from corpus clips', () => {
    const a = searchNarrative('tower', 'tower', 1, true);
    expect(a).toEqual(searchNarrative('tower', 'tower', 1, true));
    expect(a.off).not.toBeNull();
    expect(searchNarrative('tower', 'tower', 1, false).off).toBeNull();

    const corpus = new Set(collectLines().map((l) => l.text));
    let s = newGame('orchid', 'rookie', 'aloud', 1);
    const p = s.players[0];
    const ev = s.evidence.find((e) => e.kind === 'clue')!;
    p.at = ev.at;
    s = applyAction(s, { type: 'SEARCH', playerId: p.id });
    const inst = s.exhibits[0];
    const c = CASES.find((x) => x.id === s.caseId)!;
    const { text, parts } = readAloud(EXHIBITS[inst.def], { victim: c.victim, scene: c.scene, ...(inst.data ?? {}) });
    expect(text.length).toBeGreaterThan(20);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(corpus.has(normaliseLine(part))).toBe(true);
  });

  it('the journal records every step in order', () => {
    const { s } = playOut(newGame('salt', 'detective', 'journal', 2), 'journal');
    expect(s.journal[0].kind).toBe('open');
    expect(s.journal.at(-1)?.kind).toBe('end');
    for (let i = 1; i < s.journal.length; i++) {
      expect(s.journal[i].n).toBe(s.journal[i - 1].n + 1);
      expect(s.journal[i].hour).toBeGreaterThanOrEqual(s.journal[i - 1].hour - 3); // the spur can wind the clock back
    }
    expect(s.journal.some((j) => j.kind === 'move')).toBe(true);
    expect(s.journal.some((j) => j.kind === 'search')).toBe(true);
  });

  it('a conversation is a one-action record, not sticky state', () => {
    let s = newGame('salt', 'rookie', 'sticky', 1);
    const p = s.players[0];
    s.suspects[0].at = p.at;
    s = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: s.suspects[0].id, approach: 'straight' });
    expect(s.conversation).toBeTruthy();
    s = applyAction(s, { type: 'SEARCH', playerId: p.id });
    expect(s.conversation).toBeNull();
  });

  it('the trail running out ends the game in a loss', () => {
    let s = newGame('orchid', 'rookie', 'cold', 1);
    let guard = 0;
    while (s.phase === 'play' && guard++ < 500) {
      s = applyAction(s, { type: 'END_TURN', playerId: R.currentPlayer(s)!.id });
    }
    expect(s.result).toBe('loss');
    expect(s.cold).toBeGreaterThanOrEqual(s.coldMax);
  });

  it('every spoken fragment is in the pre-rendered corpus', () => {
    const corpus = new Set(collectLines().map((l) => l.text));
    const missing = new Map<string, number>();
    let total = 0;

    for (let i = 0; i < 160; i++) {
      const c = CASES[i % CASES.length];
      const d = DIFFS[i % 3];
      let s = newGame(c.id, d, `voice${i}`, 1 + (i % 4));
      let guard = 0;
      while (s.phase === 'play' && guard++ < 900) {
        const p = R.currentPlayer(s);
        if (!p) break;
        for (const n of s.narration) {
          for (const part of n.parts) {
            total++;
            const t = normaliseLine(part);
            if (!corpus.has(t)) missing.set(t, (missing.get(t) || 0) + 1);
          }
        }
        // exercise every action type, abilities and witnesses included
        const live = R.liveSuspects(s);
        if (live.length === 1 && R.canAccuse(s, p)) {
          s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: live[0].id }); continue;
        }
        if (R.canUseAbility(s, p) && !R.abilityBlocker(s, p) && guard % 5 === 0) {
          const need = R.abilityTarget(p.charId);
          const a: Extract<Action, { type: 'ABILITY' }> = { type: 'ABILITY', playerId: p.id };
          if (need === 'location') a.locationId = s.map.locations[guard % s.map.locations.length].id;
          else if (need === 'suspect-here') a.suspectId = R.suspectsAt(s, p.at)[0]?.id;
          else if (need !== 'none') a.suspectId = s.suspects[guard % s.suspects.length].id;
          if (need === 'none' || a.suspectId || a.locationId) { s = applyAction(s, a); continue; }
        }
        const w = R.witnessAt(s, p.at);
        if (w && R.canAsk(s, p, w) && guard % 3 === 0) {
          if (w.canDescribe.length) s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'about', suspectId: w.canDescribe[0].id });
          else s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'lead' });
          continue;
        }
        const here = R.suspectsAt(s, p.at).filter((x) => R.canInterrogate(s, p, x));
        if (here.length) {
          s = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: here[0].id,
            approach: APPROACHES[guard % APPROACHES.length].id });
          continue;
        }
        if (!R.looksExhausted(s, p.at) && p.ap >= 1 && !s.sealed[p.at]) {
          s = applyAction(s, { type: 'SEARCH', playerId: p.id }); continue;
        }
        const opts = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
        if (opts.length) { s = applyAction(s, { type: 'MOVE', playerId: p.id, to: opts[guard % opts.length].id }); continue; }
        s = applyAction(s, { type: 'END_TURN', playerId: p.id });
      }
    }

    const missedCount = [...missing.values()].reduce((a, b) => a + b, 0);
    const coverage = total ? (100 * (total - missedCount)) / total : 100;
    console.log(`       (${total} fragments spoken, ${coverage.toFixed(1)}% pre-renderable)`);
    if (missing.size) {
      const worst = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      console.log('       uncovered:', worst.map(([t, n]) => `${n}x "${t.slice(0, 54)}"`).join('\n                  '));
    }
    expect(coverage, `only ${coverage.toFixed(1)}% of spoken fragments can be pre-rendered`).toBeGreaterThan(99.5);
  });
});
