// Measures how hard each case is, the way QA-CASES.md measures it: three bots
// (trait: search, interrogate, describe, walk; story: the same plus every
// authored question and object; paper: story only, never an interrogation),
// thirty seeds a cell, one and three detectives, plus how many suspects the
// two public papers leave standing.
//
//   npx vite-node tools/measure-cases.ts          # every case, ~1 minute
//   npx vite-node tools/measure-cases.ts lamp     # one case
import { createGame, applyAction } from '../src/game/state';
import { CASES } from '../src/game/cases/index';
import { CHARACTERS } from '../src/game/characters';
import { DIFFICULTIES } from '../src/game/gen';
import * as R from '../src/game/rules';
import { stream } from '../src/game/rng';
import type { DifficultyId, GameState } from '../src/types/game-types';

const DIFFS = Object.keys(DIFFICULTIES) as DifficultyId[];
type Bot = 'trait' | 'story' | 'paper';
const only = process.argv[2];

function newGame(caseId: string, difficulty: DifficultyId, seed: string, n: number): GameState {
  const rng = stream(seed);
  const chars = rng.shuffle(CHARACTERS).slice(0, n);
  return createGame({ caseId, difficulty, seed, players: chars.map((c, i) => ({ id: `p${i}`, charId: c.id, name: c.short })) });
}
const rank = (fx?: { type: string }) => fx?.type === 'reveal' ? 5 : fx?.type === 'culpritTrait' ? 4 : fx?.type === 'suspectTrait' ? 3 : fx?.type === 'lead' ? 2 : fx?.type === 'clear' ? 1 : 0;

function play(s: GameState, seed: string, bot: Bot) {
  const rng = stream(`bot:${seed}`);
  const c = CASES.find((x) => x.id === s.caseId)!;
  const defOf = (id: string) => c.suspects.find((x) => x.id === id) ?? c.witnesses.find((w) => w.id === id);
  let guard = 0;
  while (s.phase === 'play' && guard++ < 4000) {
    const p = R.currentPlayer(s)!;
    const live = R.liveSuspects(s);
    if (live.length === 1 && R.canAccuse(s, p)) { s = applyAction(s, { type: 'ACCUSE', playerId: p.id, suspectId: live[0].id }); continue; }
    if (R.canSearch(s, p)) { s = applyAction(s, { type: 'SEARCH', playerId: p.id }); continue; }
    const w = R.witnessAt(s, p.at);
    const people = [...R.suspectsAt(s, p.at).map((x) => x.id), ...(w ? [w.def.id] : [])];
    if (bot !== 'trait') {
      // objects to whoever they concern
      for (const pid of people) for (const o of R.showable(s, p, pid)) if (o.unlocks.some((u) => u.person === pid)) {
        s = applyAction(s, { type: 'SHOW', playerId: p.id, objectId: o.id, personId: pid }); continue;
      }
      // free questions first, then the paid one with the strongest effect
      let best: { pid: string; id: string; score: number } | null = null;
      for (const pid of people) for (const t of R.topicsFor(s, pid)) {
        const def = defOf(pid)?.topics?.find((x) => x.id === t.id);
        const score = t.cost === 0 ? 100 : rank(def?.effect);
        if (t.cost > p.ap) continue;
        if (!best || score > best.score) best = { pid, id: t.id, score };
      }
      if (best && (best.score >= 100 || best.score > 0)) { s = applyAction(s, { type: 'TALK', playerId: p.id, personId: best.pid, topicId: best.id }); continue; }
    }
    if (bot !== 'paper') {
      const here = R.suspectsAt(s, p.at).filter((x) => R.canInterrogate(s, p, x) && !R.isEliminated(s, x));
      if (here.length) {
        const target = rng.pick(here);
        s = applyAction(s, { type: 'INTERROGATE', playerId: p.id, suspectId: target.id, approach: R.unknownTraits(s, target) >= 2 ? 'press' : 'straight' });
        continue;
      }
      if (w && R.canAsk(s, p, w)) {
        const subject = w.canDescribe.find((x) => !R.isEliminated(s, x) && R.unknownTraits(s, x) > 0);
        if (subject) { s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'about', suspectId: subject.id }); continue; }
      }
    }
    if (w && R.canAsk(s, p, w) && w.canLead) { s = applyAction(s, { type: 'ASK', playerId: p.id, witnessId: w.def.id, question: 'lead' }); continue; }
    const opts = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
    const leads = opts.filter((o) => R.hasLead(s, o.id));
    const juicy = opts.filter((o) => !R.looksExhausted(s, o.id));
    if (opts.length) { const pool = leads.length ? leads : juicy.length ? juicy : opts; s = applyAction(s, { type: 'MOVE', playerId: p.id, to: rng.pick(pool).id }); continue; }
    s = applyAction(s, { type: 'END_TURN', playerId: p.id });
  }
  return s;
}

const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };

console.log('## Public traits: visible non-culprit suspects still fitting after build+hair (100 seeds)');
for (const c of CASES) {
  const row: string[] = [];
  for (const d of DIFFS) {
    const hist: Record<number, number> = {};
    for (let i = 0; i < 100; i++) {
      const s = newGame(c.id, d, `pub${i}`, 1);
      const me = s.suspects.find((x) => x.id === s.culpritId)!;
      const n = s.suspects.filter((x) => x.id !== me.id && !x.hidden && s.publicTraits.every((t) => x.traits[t] === me.traits[t])).length;
      hist[n] = (hist[n] || 0) + 1;
    }
    row.push(Object.entries(hist).map(([k, v]) => `${k} others: ${v}%`).join(', '));
  }
  console.log(`| ${c.id} | ${row.join(' | ')} |`);
}

console.log('\n## Bots, 30 seeds per cell: win% · median hours on wins (wrong accusations per game)');
console.log('| Case | Difficulty | trait 1p | story 1p | paper 1p | trait 3p | story 3p | paper 3p |');
for (const c of CASES) {
  if (only && c.id !== only) continue;
  for (const d of DIFFS) {
    const cells: string[] = [];
    for (const n of [1, 3]) for (const bot of ['trait', 'story', 'paper'] as Bot[]) {
      let wins = 0; const hours: number[] = []; let wrong = 0;
      for (let i = 0; i < 30; i++) {
        const seed = `m-${c.id}-${d}-${bot}-${n}-${i}`;
        const end = play(newGame(c.id, d, seed, n), seed, bot);
        if (end.result === 'win') { wins++; hours.push(end.cold); }
        wrong += end.wrongAccusations.length;
      }
      cells.push(`${Math.round(100 * wins / 30)}% · ${isNaN(med(hours)) ? '—' : med(hours) + 'h'} (${(wrong / 30).toFixed(1)})`);
    }
    console.log(`| ${c.id} | ${d} (${DIFFICULTIES[d].budget + (c.clockBonus ?? 0)}) | ${cells.join(' | ')} |`);
  }
}
