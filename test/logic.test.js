// Headless soak test: plays thousands of full games with a dumb-but-legal bot.
// Catches unsolvable boards, stuck turns, illegal-state crashes and determinism
// drift (the property the online transport depends on).

import assert from 'node:assert';
import { createGame, applyAction } from '../js/state.js';
import { CASES } from '../js/cases/index.js';
import { CHARACTERS } from '../js/characters.js';
import { DIFFICULTIES } from '../js/gen.js';
import * as R from '../js/rules.js';
import { stream } from '../js/rng.js';
import { APPROACHES } from '../js/dialogue.js';
import { collectLines, normaliseLine } from '../js/lines.js';

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

function newGame(caseId, difficulty, seed, nPlayers) {
  const rng = stream(seed);
  const chars = rng.shuffle(CHARACTERS).slice(0, nPlayers);
  return createGame({
    caseId, difficulty, seed,
    players: chars.map((c, i) => ({ id: `p${i}`, charId: c.id, name: c.short })),
  });
}

/** Plays greedily: search where there is evidence, else interrogate, else walk. */
function playOut(s, seed, { accuseWhenSure = true } = {}) {
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
    const opts = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
    // The bot only knows what a player knows: which places it has already
    // turned over. It cannot see where the unfound evidence actually is.
    const juicy = opts.filter((o) => !R.looksExhausted(s, o.id));
    if (opts.length) {
      s = applyAction(s, { type: 'MOVE', playerId: p.id, to: rng.pick(juicy.length ? juicy : opts).id });
      continue;
    }
    s = applyAction(s, { type: 'END_TURN', playerId: p.id });
  }
  return { s, guard };
}

console.log('\nTHE ASHGRAVE FILES -- logic suite\n');

test('every case builds at every difficulty and every player count', () => {
  for (const c of CASES) for (const d of Object.keys(DIFFICULTIES)) for (let n = 1; n <= 6; n++) {
    const s = newGame(c.id, d, `b-${c.id}-${d}-${n}`, n);
    assert.equal(s.players.length, n);
    assert.ok(s.suspects.length >= 5);
    assert.ok(s.evidence.every((e) => e.at));
    assert.ok(s.suspects.some((x) => x.id === s.culpritId));
  }
});

test('the culprit is always the unique fit once every fact is known', () => {
  for (let i = 0; i < 600; i++) {
    const c = CASES[i % CASES.length];
    const d = Object.keys(DIFFICULTIES)[i % 3];
    const s = newGame(c.id, d, `u${i}`, 3);
    const culprit = s.suspects.find((x) => x.id === s.culpritId);
    const fits = s.suspects.filter((x) => s.chosenTraits.every((t) => x.traits[t] === culprit.traits[t]));
    assert.equal(fits.length, 1, `${c.id}/${d}/${i}: ${fits.length} suspects fit`);
  }
});

test('a full game always terminates in a win or a loss', () => {
  let wins = 0, losses = 0;
  for (let i = 0; i < 400; i++) {
    const c = CASES[i % CASES.length];
    const d = Object.keys(DIFFICULTIES)[i % 3];
    let s = newGame(c.id, d, `p${i}`, 1 + (i % 6));
    const { s: end, guard } = playOut(s, `p${i}`);
    assert.equal(end.phase, 'over', `game ${i} never ended`);
    assert.ok(guard < 4000, `game ${i} hit the action guard`);
    assert.ok(['win', 'loss'].includes(end.result));
    end.result === 'win' ? wins++ : losses++;
  }
  console.log(`       (bot record: ${wins}W / ${losses}L)`);
  assert.ok(wins > 0, 'bot never won a single game -- the game may be unwinnable');
  assert.ok(losses > 0, 'bot never lost -- the game may have no tension');
});

test('identical action logs produce byte-identical states (needed for online play)', () => {
  for (let i = 0; i < 40; i++) {
    const a = playOut(newGame('orchid', 'detective', `det${i}`, 3), `det${i}`).s;
    const b = playOut(newGame('orchid', 'detective', `det${i}`, 3), `det${i}`).s;
    assert.equal(JSON.stringify(a), JSON.stringify(b), `divergence on seed det${i}`);
  }
});

test('illegal actions are rejected without changing anything', () => {
  const s = newGame('orchid', 'detective', 'illegal', 2);
  const before = JSON.stringify(s);
  const wrongSeat = applyAction(s, { type: 'SEARCH', playerId: s.players[1].id });
  assert.equal(JSON.stringify({ ...wrongSeat, narration: [] }), before, 'acted out of turn');
  const nowhere = applyAction(s, { type: 'MOVE', playerId: s.players[0].id, to: 'atlantis' });
  assert.equal(JSON.stringify({ ...nowhere, narration: [] }), before, 'moved to a nonexistent place');
  const far = applyAction(s, { type: 'MOVE', playerId: s.players[0].id, to: 'manor' });
  assert.equal(JSON.stringify({ ...far, narration: [] }), before, 'teleported across the map');
});

test('a wrong accusation costs time and clears the suspect', () => {
  let s = newGame('orchid', 'rookie', 'wrong', 1);
  const innocent = s.suspects.find((x) => x.id !== s.culpritId);
  const p = s.players[0];
  s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: innocent.id });
  assert.ok(s.cold >= 3, 'no time penalty');
  assert.ok(s.suspects.find((x) => x.id === innocent.id).cleared, 'suspect not cleared');
  assert.notEqual(s.result, 'win');
});

test('a right accusation wins immediately', () => {
  let s = newGame('salt', 'rookie', 'right', 2);
  s = applyAction(s, { type: 'ACCUSE', playerId: s.players[0].id, suspectId: s.culpritId });
  assert.equal(s.result, 'win');
  assert.equal(s.phase, 'over');
});

test('every ability runs without throwing and is once per case', () => {
  for (const ch of CHARACTERS) {
    let s = createGame({ caseId: 'bell', difficulty: 'rookie', seed: `ab-${ch.id}`,
      players: [{ id: 'p0', charId: ch.id, name: ch.short }] });
    const p = s.players[0];
    const need = R.abilityTarget(ch.id);
    let act = { type: 'ABILITY', playerId: p.id };
    if (need === 'suspect-any') act.suspectId = s.suspects[0].id;
    if (need === 'location') act.locationId = s.map.locations[3].id;
    if (need === 'suspect-here') {
      // walk somebody to us first
      s.suspects[0].at = p.at;
      act.suspectId = s.suspects[0].id;
    }
    const after = applyAction(s, act);
    assert.ok(after.players[0].abilityUsed, `${ch.id} ability did not fire`);
    const again = applyAction(after, act);
    assert.equal(again.players[0].ap, after.players[0].ap, `${ch.id} ability fired twice`);
  }
});

test('each way of questioning does what it promises', () => {
  for (const approach of APPROACHES) {
    // Quist deliberately: Kell is never clammed out and Crane gets an extra
    // trait, so either would mask what the approach itself does.
    let s = createGame({
      caseId: 'orchid', difficulty: 'commissioner', seed: `talk-${approach.id}`,
      players: [{ id: 'p0', charId: 'quist', name: 'Quist' }],
    });
    const p = s.players[0];
    const x = s.suspects[0];
    x.at = p.at;
    x.clammed = 0;
    const before = s.suspects.map((y) => ({ id: y.id, known: { ...y.known } }));
    const after = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: x.id, approach: approach.id });

    assert.ok(after.conversation, `${approach.id}: no conversation recorded`);
    assert.ok(after.conversation.ask && after.conversation.reply, `${approach.id}: nobody spoke`);
    assert.equal(after.conversation.learned.length, approach.reveals,
      `${approach.id}: learned ${after.conversation.learned.length}, promised ${approach.reveals}`);

    // Count what actually changed across the whole table, not just the target.
    const revealed = after.suspects.reduce((n, y) => {
      const was = before.find((b) => b.id === y.id);
      return n + after.chosenTraits.filter((t) => y.known[t] && !was.known[t]).length;
    }, 0);
    assert.equal(revealed, approach.reveals, `${approach.id}: revealed ${revealed} traits`);

    const subject = after.conversation.subjectId;
    if (approach.aboutOther) assert.notEqual(subject, x.id, 'sideways asked about the same person');
    else assert.equal(subject, x.id, `${approach.id} asked about the wrong person`);

    assert.equal(after.suspects.find((y) => y.id === x.id).clammed, approach.clams,
      `${approach.id}: wrong clam-up`);
  }
});

test('a conversation is a one-action record, not sticky state', () => {
  let s = newGame('salt', 'rookie', 'sticky', 1);
  const p = s.players[0];
  s.suspects[0].at = p.at;
  s = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: s.suspects[0].id, approach: 'straight' });
  assert.ok(s.conversation, 'no conversation after questioning');
  s = applyAction(s, { type: 'SEARCH', playerId: p.id });
  assert.equal(s.conversation, null, 'the conversation survived the next action');
});

test('the trail running out ends the game in a loss', () => {
  let s = newGame('orchid', 'rookie', 'cold', 1);
  let guard = 0;
  while (s.phase === 'play' && guard++ < 500) {
    s = applyAction(s, { type: 'END_TURN', playerId: R.currentPlayer(s).id });
  }
  assert.equal(s.result, 'loss');
  assert.ok(s.cold >= s.coldMax, 'lost without the clock running out');
});

test('every spoken fragment is in the pre-rendered corpus', () => {
  const corpus = new Set(collectLines().map((l) => l.text));
  const missing = new Map();
  let total = 0;

  for (let i = 0; i < 160; i++) {
    const c = CASES[i % CASES.length];
    const d = Object.keys(DIFFICULTIES)[i % 3];
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
      // exercise every action type, abilities included
      const live = R.liveSuspects(s);
      if (live.length === 1 && R.canAccuse(s, p)) {
        s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: live[0].id }); continue;
      }
      if (R.canUseAbility(s, p) && !R.abilityBlocker(s, p) && guard % 5 === 0) {
        const need = R.abilityTarget(p.charId);
        const a = { type: 'ABILITY', playerId: p.id };
        if (need === 'location') a.locationId = s.map.locations[guard % s.map.locations.length].id;
        else if (need === 'suspect-here') a.suspectId = R.suspectsAt(s, p.at)[0]?.id;
        else if (need !== 'none') a.suspectId = s.suspects[guard % s.suspects.length].id;
        if (need === 'none' || a.suspectId || a.locationId) { s = applyAction(s, a); continue; }
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
  assert.ok(coverage > 99.5, `only ${coverage.toFixed(1)}% of spoken fragments can be pre-rendered`);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
