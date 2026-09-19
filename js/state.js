// The rules engine.
//
// Everything that changes the game goes through applyAction(state, action) and
// nothing else. It is pure: same state + same action => same next state, on any
// machine, because all randomness is drawn from the seed/tick pair carried in
// the state itself. That is the whole reason js/net/ can grow a websocket
// transport later without any of this file changing.

import { drawInt, drawPick, drawShuffle } from './rng.js';
import { TRAITS, traitValue, traitLabel } from './traits.js';
import { caseById } from './cases/index.js';
import { characterById } from './characters.js';
import { buildCase, DIFFICULTIES, BOONS } from './gen.js';
import { EVENTS } from './events.js';
import { approachById, replyFor, spentReply } from './dialogue.js';

export const ACCUSE_COST = 2;
export const ABILITY_COST = 1;
// One event fires every this many hours worked. Tying events to the clock
// rather than to the turn order means a table of six sees exactly as much of
// the city's night as a lone detective does.
export const HOURS_PER_EVENT = 4;

export function createGame({ caseId, difficulty = 'detective', seed, players = [], handoff = true }) {
  const def = caseById(caseId);
  const realSeed = seed || `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const built = buildCase(def, { difficulty, seed: realSeed });

  const adj = {};
  def.locations.forEach((l) => { adj[l.id] = []; });
  def.edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  const state = {
    v: 1,
    seed: realSeed,
    tick: 0,
    caseId: def.id,
    difficulty,
    handoff,
    map: {
      start: def.start,
      scene: def.scene,
      locations: def.locations.map((l) => ({ ...l })),
      edges: def.edges.map((e) => e.slice()),
      adj,
    },
    players: players.map((p, i) => {
      const ch = characterById(p.charId);
      const apMax = ch.id === 'hale' ? 3 : 2;
      return {
        id: p.id || `p${i}`,
        name: (p.name || '').trim() || ch.short,
        charId: ch.id,
        at: def.start,
        ap: apMax,
        apMax,
        abilityUsed: false,
        freeMoveUsed: false,
      };
    }),
    suspects: built.suspects,
    culpritId: built.culpritId,
    evidence: built.evidence,
    chosenTraits: built.chosenTraits,
    publicTraits: built.publicTraits,
    hiddenTraits: built.hiddenTraits,
    knownCulprit: Object.fromEntries(built.chosenTraits.map((t) => [t, null])),
    cold: 0,
    coldMax: 0, // hours on the clock; set from the difficulty below

    round: 1,
    turn: 0,
    phase: 'play',
    result: null,
    sealed: {},
    nextEventAt: HOURS_PER_EVENT,
    // What the detectives have learned about the map itself: where they have
    // already looked, and where looking turned up nothing.
    searched: {},
    modifiers: { moveSurcharge: 0, apPenalty: 0 },
    wrongAccusations: [],
    lastEvent: null,
    conversation: null,
    log: [],
    narration: [],
  };

  state.coldMax = DIFFICULTIES[difficulty].budget;

  pushLog(state, `Case opened: ${def.title.toUpperCase()}. Victim, ${def.victim}.`, 'case');
  return state;
}

// ---------------------------------------------------------------------------
// small helpers (mutate the working draft)
// ---------------------------------------------------------------------------

const loc = (s, id) => s.map.locations.find((l) => l.id === id);
const locName = (s, id) => (loc(s, id) || {}).name || id;
const sus = (s, id) => s.suspects.find((x) => x.id === id);
const player = (s, id) => s.players.find((p) => p.id === id);

function pushLog(s, text, kind = 'info', actor = null) {
  s.log.unshift({ round: s.round, text, kind, actor });
  if (s.log.length > 200) s.log.pop();
}

function say(s, text, tone = 'narrator') {
  s.narration.push({ text, tone });
}

/** Both at once: written to the case log and spoken by the narrator. */
function tell(s, text, kind = 'info', tone = 'narrator') {
  pushLog(s, text, kind);
  say(s, text, tone);
}

export function distance(s, from, to) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let d = 0;
  while (frontier.length && d < 8) {
    d += 1;
    const next = [];
    for (const n of frontier) {
      for (const m of s.map.adj[n] || []) {
        if (seen.has(m)) continue;
        if (m === to) return d;
        seen.add(m); next.push(m);
      }
    }
    frontier = next;
  }
  return Infinity;
}

function revealCulpritTrait(s, traitId = null) {
  const open = s.chosenTraits.filter((t) => !s.knownCulprit[t]);
  if (!open.length) return null;
  const t = traitId && open.includes(traitId) ? traitId : drawPick(s, open);
  const v = sus(s, s.culpritId).traits[t];
  s.knownCulprit[t] = v;
  const ev = s.evidence.find((e) => e.kind === 'clue' && e.trait === t);
  if (ev) ev.found = true;
  return `${TRAITS[t].label}: ${traitLabel(t, v)}.`;
}

function revealSuspectTrait(s, suspectId = null, count = 1) {
  const pool = suspectId
    ? [sus(s, suspectId)].filter(Boolean)
    : drawShuffle(s, s.suspects.filter((x) => !x.dead && s.chosenTraits.some((t) => !x.known[t])));
  const target = pool[0];
  if (!target) return null;
  const open = s.chosenTraits.filter((t) => !target.known[t]);
  if (!open.length) return null;
  const picked = drawShuffle(s, open).slice(0, count);
  picked.forEach((t) => { target.known[t] = true; });
  const parts = picked.map((t) => `${TRAITS[t].label.toLowerCase()} — ${traitLabel(t, target.traits[t]).toLowerCase()}`);
  return `${target.name}: ${parts.join('; ')}.`;
}

function moveSuspects(s) {
  for (const x of s.suspects) {
    if (x.dead) continue;
    if (x.frozen > 0) { x.frozen -= 1; continue; }
    const options = (s.map.adj[x.at] || []).filter((id) => !s.sealed[id]);
    if (options.length) x.at = drawPick(s, options);
  }
}

const eventApi = (s) => ({
  pick: (arr) => (arr.length ? drawPick(s, arr) : null),
  moveSuspects: () => moveSuspects(s),
  revealCulpritTrait: () => revealCulpritTrait(s),
  revealSuspectTrait: () => revealSuspectTrait(s),
});

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

function collect(s, p, ev) {
  ev.found = true;
  if (ev.kind === 'clue') {
    s.knownCulprit[ev.trait] = ev.value;
    tell(s, ev.text, 'clue', 'clue');
    pushLog(s, `FACT ESTABLISHED — the killer’s ${TRAITS[ev.trait].label.toLowerCase()}: ${traitLabel(ev.trait, ev.value)}.`, 'fact');
    return;
  }
  const boon = BOONS[ev.boon];
  tell(s, boon.text, 'boon', 'narrator');
  if (ev.boon === 'tip') {
    const r = revealCulpritTrait(s);
    tell(s, r ? `The note names a fact about your killer. ${r}` : 'The note says nothing you had not already worked out.', 'fact');
  } else if (ev.boon === 'spur') {
    s.cold = Math.max(0, s.cold - 2);
    tell(s, 'The trail warms up. You have bought yourself time.', 'good');
  } else if (ev.boon === 'coffee') {
    p.ap += 1;
    s.cold = Math.max(0, s.cold - 1); // the extra action is genuinely free
    tell(s, `${p.name} finds a second wind. One more action, and it costs nothing.`, 'good');
  } else if (ev.boon === 'ledger') {
    const r = revealSuspectTrait(s);
    tell(s, r ? `The ledger gives somebody up. ${r}` : 'The ledger tells you nothing new.', 'fact');
  }
}

function searchLocation(s, p, locId, picks) {
  const here = s.evidence.filter((e) => e.at === locId && !e.found);
  const rec = s.searched[locId] || (s.searched[locId] = { times: 0, empty: false });
  rec.times += 1;
  if (here.length <= picks) rec.empty = true;
  if (!here.length) {
    tell(s, `Nothing left at ${locName(s, locId)}. It has been turned over twice already.`, 'info');
    return 0;
  }
  const take = here.slice(0, picks);
  take.forEach((e) => collect(s, p, e));
  return take.length;
}

// ---------------------------------------------------------------------------
// turn / round flow
// ---------------------------------------------------------------------------

/** An event tick: time has passed, the city has moved, something has happened. */
function nightfall(s) {
  s.modifiers = { moveSurcharge: 0, apPenalty: 0 };

  for (const x of s.suspects) if (x.clammed > 0) x.clammed -= 1;
  for (const k of Object.keys(s.sealed)) {
    s.sealed[k] -= 1;
    if (s.sealed[k] <= 0) delete s.sealed[k];
  }

  moveSuspects(s);

  const ev = drawPick(s, EVENTS);
  s.lastEvent = ev.id;
  tell(s, `${ev.title.toUpperCase()}. ${ev.text}`, ev.kind === 'good' ? 'good' : 'event', 'alert');
  const outcome = ev.effect(s, eventApi(s));
  if (outcome) tell(s, outcome, 'event');

  const left = Math.max(0, s.coldMax - s.cold);
  pushLog(s, `\u2014 ${left} ${left === 1 ? 'hour' : 'hours'} before the trail is cold. \u2014`, 'round');
}

/** Burn hours off the clock, firing events as the night crosses each mark. */
function tickClock(s, hours) {
  if (hours > 0) s.cold = Math.min(s.coldMax, s.cold + hours);
  let guard = 0;
  while (s.phase === 'play' && s.cold >= s.nextEventAt && guard++ < 20) {
    s.nextEventAt += HOURS_PER_EVENT;
    if (s.cold >= s.coldMax) break; // the night is over; no more events
    nightfall(s);
  }
  if (s.phase === 'play' && s.cold >= s.coldMax) {
    s.phase = 'over';
    s.result = 'loss';
  }
}

/** Hand the clipboard to the next detective; refresh the table on a new round. */
function advanceTurn(s) {
  if (s.phase !== 'play') return;
  if (s.turn + 1 >= s.players.length) {
    s.round += 1;
    s.turn = 0;
    for (const p of s.players) {
      p.ap = Math.max(1, p.apMax - s.modifiers.apPenalty);
      p.freeMoveUsed = false;
    }
    pushLog(s, `\u2014 Round ${s.round}. \u2014`, 'round');
  } else {
    s.turn += 1;
  }
  const next = s.players[s.turn];
  if (next) next.freeMoveUsed = false;
}

// ---------------------------------------------------------------------------
// the reducer
// ---------------------------------------------------------------------------

export function applyAction(prev, action) {
  const s = structuredClone(prev);
  s.narration = [];
  s.conversation = null;
  if (s.phase === 'over') return s;
  const apBefore = s.players.reduce((n, x) => n + x.ap, 0);

  const p = player(s, action.playerId);
  if (!p && action.type !== 'RESIGN') return s;
  if (p && s.players[s.turn] && s.players[s.turn].id !== p.id) return s; // not your turn
  const ch = p ? characterById(p.charId) : null;

  switch (action.type) {
    case 'MOVE': {
      const d = distance(s, p.at, action.to);
      const maxHops = ch.id === 'quist' ? 2 : 1;
      if (d < 1 || d > maxHops) return s;
      if (s.sealed[action.to]) return s;
      const free = ch.id === 'ruby' && !p.freeMoveUsed;
      const cost = free ? 0 : 1 + s.modifiers.moveSurcharge;
      if (!free && p.ap < cost) return s;
      p.ap -= cost;
      if (free) p.freeMoveUsed = true;
      p.at = action.to;
      pushLog(s, `${p.name} moves to ${locName(s, action.to)}.`, 'move', p.id);
      if (free) pushLog(s, 'Ruby knows the shortcut. That one was free.', 'good');
      break;
    }

    case 'SEARCH': {
      if (p.ap < 1) return s;
      if (s.sealed[p.at]) return s;
      p.ap -= 1;
      pushLog(s, `${p.name} searches ${locName(s, p.at)}.`, 'action', p.id);
      searchLocation(s, p, p.at, ch.id === 'vale' ? 2 : 1);
      break;
    }

    case 'INTERROGATE': {
      if (p.ap < 1) return s;
      const x = sus(s, action.suspectId);
      if (!x || x.dead || x.at !== p.at) return s;
      if (x.clammed > 0 && ch.id !== 'kell') return s;

      const approach = approachById(action.approach);
      p.ap -= 1;
      pushLog(s, `${p.name} questions ${x.name} at ${locName(s, p.at)}.`, 'action', p.id);

      // Crane gets one more out of people than they meant to give.
      const extra = ch.id === 'crane' ? 1 : 0;
      // Asking about somebody else turns the answer onto another suspect.
      const subject = approach.aboutOther
        ? drawPick(s, s.suspects.filter((y) => y.id !== x.id && !y.dead
            && s.chosenTraits.some((t) => !y.known[t]))) || x
        : x;

      const open = s.chosenTraits.filter((t) => !subject.known[t]);
      s.conversation = {
        suspectId: x.id,
        subjectId: subject.id,
        approach: approach.id,
        ask: approach.ask[drawInt(s, approach.ask.length)],
        reply: open.length ? replyFor(approach.id, drawInt(s, 4)) : spentReply(drawInt(s, 3)),
        learned: [],
      };

      tell(s, s.conversation.ask, 'talk', 'ask');
      tell(s, s.conversation.reply, 'talk', 'reply');

      if (!open.length) {
        tell(s, `${x.name} has nothing left to give. You already have all of it.`, 'info');
      } else {
        const picked = drawShuffle(s, open).slice(0, approach.reveals + extra);
        picked.forEach((t) => {
          subject.known[t] = true;
          s.conversation.learned.push({ trait: t, who: subject.id });
          const about = subject.id === x.id ? x.name : `${subject.name}, by the sound of it,`;
          tell(s, `${about} ${traitValue(t, subject.traits[t]).tell}`, 'tell', 'clue');
        });
      }

      // Kell is never shut out; everybody else wears out their welcome.
      if (ch.id !== 'kell') x.clammed = Math.max(x.clammed, approach.clams);
      break;
    }

    case 'ABILITY': {
      if (p.abilityUsed || p.ap < ABILITY_COST) return s;
      const ok = runAbility(s, p, ch, action);
      if (!ok) return s;
      p.abilityUsed = true;
      p.ap -= ABILITY_COST;
      break;
    }

    case 'ACCUSE': {
      if (p.ap < ACCUSE_COST) return s;
      const x = sus(s, action.suspectId);
      if (!x || x.cleared || x.dead) return s;
      p.ap -= ACCUSE_COST;
      pushLog(s, `${p.name} accuses ${x.name}.`, 'accuse', p.id);
      if (x.id === s.culpritId) {
        s.phase = 'over';
        s.result = 'win';
        s.solvedBy = p.id;
        tell(s, `${x.name} does not deny it. ${x.name.split(' ')[0]} did it ${x.motive}`, 'win', 'alert');
      } else {
        x.cleared = true;
        s.wrongAccusations.push(x.id);
        tell(s, `${x.name} is not your killer, and now every lawyer in Ashgrave knows your name. Three more hours gone.`, 'bad', 'alert');
        tickClock(s, 3);
      }
      break;
    }

    case 'END_TURN': {
      // The night runs whether you work it or not -- walking away early
      // forfeits the hours, it does not bank them.
      pushLog(s, p.ap > 0 ? `${p.name} calls it early.` : `${p.name} calls it.`, 'muted', p.id);
      p.ap = 0;
      break;
    }

    default:
      return s;
  }

  // Every action point spent is an hour of the night gone. This has to be
  // settled BEFORE the turn advances, because a new round hands out fresh
  // action points and would poison the arithmetic.
  const spent = apBefore - s.players.reduce((n, x) => n + x.ap, 0);
  tickClock(s, spent);
  if (s.phase !== 'play') return s;

  if (p && p.ap <= 0) advanceTurn(s);
  return s;
}

function runAbility(s, p, ch, action) {
  switch (ch.ability) {
    case 'VERDICT': {
      const x = sus(s, action.suspectId);
      if (!x || x.dead) return false;
      if (x.id === s.culpritId) {
        s.chosenTraits.forEach((t) => { x.known[t] = true; });
        tell(s, `Hale looks at ${x.name} for a long moment and says nothing at all. It is them. Everything about them matches.`, 'fact', 'alert');
      } else {
        x.cleared = true;
        tell(s, `Thirty-one years of instinct says ${x.name} did not do this. Cross them off.`, 'fact', 'clue');
      }
      return true;
    }
    case 'AUTOPSY': {
      const r = revealCulpritTrait(s);
      tell(s, r ? `Vale goes back to the body and finds what the first pass missed. ${r}` : 'The body has nothing left to say.', 'fact', 'clue');
      return true;
    }
    case 'HEADLINE': {
      s.cold = Math.max(0, s.cold - 3);
      tell(s, 'Crane puts it above the fold. The whole city is looking now, and looking buys you time.', 'good', 'alert');
      return true;
    }
    case 'BREAKIN': {
      const target = action.locationId;
      if (!loc(s, target)) return false;
      pushLog(s, `Ruby lets herself into ${locName(s, target)}. No warrant, no witnesses.`, 'action', p.id);
      searchLocation(s, p, target, 1);
      return true;
    }
    case 'CONFESSION': {
      const x = sus(s, action.suspectId);
      if (!x || x.dead || x.at !== p.at) return false;
      const open = s.chosenTraits.filter((t) => !x.known[t]);
      if (!open.length) {
        tell(s, `${x.name} has already told you everything. Kell gives them absolution anyway.`, 'info');
        return true;
      }
      open.forEach((t) => { x.known[t] = true; });
      const parts = open.map((t) => `${TRAITS[t].label.toLowerCase()}, ${traitLabel(t, x.traits[t]).toLowerCase()}`);
      tell(s, `${x.name} tells Kell all of it: ${parts.join('; ')}.`, 'fact', 'clue');
      return true;
    }
    case 'APB': {
      const x = sus(s, action.suspectId);
      if (!x || x.dead) return false;
      x.at = p.at;
      x.frozen = 2;
      x.clammed = 0;
      tell(s, `Quist puts out the bulletin. Two hours later ${x.name} is sitting across from her at ${locName(s, p.at)}, and not going anywhere.`, 'good', 'alert');
      return true;
    }
    default:
      return false;
  }
}

export { DIFFICULTIES, BOONS, locName, sus as suspectById, player as playerById };
