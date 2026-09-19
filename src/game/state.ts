// The rules engine.
//
// Everything that changes the game goes through applyAction(state, action) and
// nothing else. It is pure: same state + same action => same next state, on any
// machine, because all randomness is drawn from the seed/tick pair carried in
// the state itself. That is the whole reason src/net/ can grow a websocket
// transport later without any of this file changing.

import type {
  Action, CaseDef, CharacterDef, EvidenceState, ExhibitInstance, GameState, JournalEntry, LogKind, NewGameOptions, PlayerState,
  SuspectState, Tone, TraitId, UnlockEffect, WitnessDef,
} from '../types/game-types';
import { drawInt, drawPick, drawShuffle } from './rng';
import { TRAITS, traitValue, traitLabel } from './traits';
import { caseById } from './cases/index';
import { characterById } from './characters';
import { buildCase, DIFFICULTIES, BOONS, WITNESS_PATIENCE } from './gen';
import { EVENTS, type EventApi, type Spoken } from './events';
import { approachById, replyFor, spentReply } from './dialogue';
import { traitFact, traitPhrase } from './lines';
import { exhibitById, itemById } from './exhibits';
import { WITNESS_ASKS, SHOW_LINES } from './witnesses';
import { searchNarrative, searchEmptyLine } from './search';

export const ACCUSE_COST = 2;
export const ABILITY_COST = 1;
// One event fires every this many hours worked. Tying events to the clock
// rather than to the turn order means a table of six sees exactly as much of
// the city's night as a lone detective does.
export const HOURS_PER_EVENT = 6;

export function createGame({ caseId, difficulty = 'detective', seed, players = [], handoff = true }: NewGameOptions): GameState {
  const def = caseById(caseId);
  const realSeed = seed || `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const built = buildCase(def, { difficulty, seed: realSeed });

  const adj: Record<string, string[]> = {};
  def.locations.forEach((l) => { adj[l.id] = []; });
  def.edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  const state: GameState = {
    v: 2,
    seed: realSeed,
    tick: 0,
    caseId: def.id,
    difficulty,
    handoff,
    map: {
      start: def.start,
      scene: def.scene,
      locations: def.locations.map((l) => ({ ...l })),
      edges: def.edges.map((e) => [e[0], e[1]]),
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
    witnesses: built.witnesses,
    culpritId: built.culpritId,
    evidence: built.evidence,
    chosenTraits: built.chosenTraits,
    publicTraits: built.publicTraits,
    hiddenTraits: built.hiddenTraits,
    knownCulprit: Object.fromEntries(built.chosenTraits.map((t) => [t, null])) as Record<TraitId, string | null>,
    exhibits: [],
    leads: {},
    objects: [],
    shown: {},
    asked: {},
    cold: 0,
    coldMax: DIFFICULTIES[difficulty].budget,

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
    testimony: null,
    showing: null,
    talking: null,
    log: [],
    journal: [],
    narration: [],
  };

  pushLog(state, `Case opened: ${def.title.toUpperCase()}. Victim, ${def.victim}.`, 'case');
  journal(state, null, 'open', `Case opened: ${def.title}. Victim, ${def.victim}. ${state.coldMax} hours on the clock.`);
  return state;
}

// ---------------------------------------------------------------------------
// small helpers (mutate the working draft)
// ---------------------------------------------------------------------------

const loc = (s: GameState, id: string) => s.map.locations.find((l) => l.id === id);
const locName = (s: GameState, id: string) => loc(s, id)?.name ?? id;
const sus = (s: GameState, id: string) => s.suspects.find((x) => x.id === id);
const player = (s: GameState, id: string) => s.players.find((p) => p.id === id);
const witnessDef = (s: GameState, id: string): WitnessDef | undefined => caseById(s.caseId).witnesses.find((w) => w.id === id);
const objectById = (s: GameState, id: string) => caseById(s.caseId).objects.find((o) => o.id === id);

function pushLog(s: GameState, text: string, kind: LogKind = 'info', actor: string | null = null) {
  s.log.unshift({ round: s.round, text, kind, actor });
  if (s.log.length > 200) s.log.pop();
}

/** One line in the shared journal, stamped with the hour it happened. */
function journal(s: GameState, p: PlayerState | null, kind: JournalEntry['kind'], text: string, ref?: JournalEntry['ref']) {
  const entry: JournalEntry = { n: s.journal.length + 1, hour: s.cold, round: s.round, playerId: p?.id ?? null, kind, text };
  if (ref) entry.ref = ref;
  s.journal.push(entry);
}

/**
 * `parts` breaks a line into independently renderable fragments. Narration is
 * pre-rendered to audio ahead of time (see game/lines.ts), and a line like
 * "Vera Lang strikes the match left-handed" cannot be baked as one clip --
 * every name times every tell would be thousands of files. Split into
 * ["Vera Lang", "strikes the match left-handed"] it is two clips drawn from
 * small closed sets. Lines with no dynamic part need no split.
 */
function say(s: GameState, text: string, tone: Tone = 'narrator', parts: string[] | null = null) {
  s.narration.push({ text, tone, parts: parts || [text] });
}

/** Both at once: written to the case log and spoken by the narrator. */
function tell(s: GameState, text: string, kind: LogKind = 'info', tone: Tone = 'narrator', parts: string[] | null = null) {
  pushLog(s, text, kind);
  say(s, text, tone, parts);
}

/** Speak a `{ text, parts }` result from one of the reveal helpers. */
function tellResult(s: GameState, lead: string, result: Spoken | null, kind: LogKind = 'fact', tone: Tone = 'narrator') {
  if (!result) return;
  tell(s, `${lead} ${result.text}`, kind, tone, [lead, ...result.parts]);
}

export function distance(s: GameState, from: string, to: string): number {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let d = 0;
  while (frontier.length && d < 8) {
    d += 1;
    const next: string[] = [];
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

function revealCulpritTrait(s: GameState, traitId: TraitId | null = null): Spoken | null {
  const open = s.chosenTraits.filter((t) => !s.knownCulprit[t]);
  if (!open.length) return null;
  const t = traitId && open.includes(traitId) ? traitId : drawPick(s, open);
  const culprit = sus(s, s.culpritId) as SuspectState;
  const v = culprit.traits[t];
  s.knownCulprit[t] = v;
  const ev = s.evidence.find((e) => e.kind === 'clue' && e.trait === t);
  if (ev) ev.found = true;
  const text = traitFact(t, v);
  return { text, parts: [text] };
}

function revealSuspectTrait(s: GameState, suspectId: string | null = null, count = 1): (Spoken & { who: string; traits: TraitId[] }) | null {
  const pool = suspectId
    ? [sus(s, suspectId)].filter((x): x is SuspectState => !!x)
    : drawShuffle(s, s.suspects.filter((x) => !x.dead && s.chosenTraits.some((t) => !x.known[t])));
  const target = pool[0];
  if (!target) return null;
  const open = s.chosenTraits.filter((t) => !target.known[t]);
  if (!open.length) return null;
  const picked = drawShuffle(s, open).slice(0, count);
  picked.forEach((t) => { target.known[t] = true; });
  const phrases = picked.map((t) => traitPhrase(t, target.traits[t]));
  return { text: `${target.name}: ${phrases.join('; ')}.`, parts: [target.name, ...phrases], who: target.id, traits: picked };
}

function moveSuspects(s: GameState) {
  for (const x of s.suspects) {
    if (x.dead) continue;
    if (x.frozen > 0) { x.frozen -= 1; continue; }
    const options = (s.map.adj[x.at] || []).filter((id) => !s.sealed[id]);
    if (options.length) x.at = drawPick(s, options);
  }
}

const eventApi = (s: GameState): EventApi => ({
  pick: (arr) => (arr.length ? drawPick(s, arr) : null),
  moveSuspects: () => moveSuspects(s),
  revealCulpritTrait: () => revealCulpritTrait(s),
  revealSuspectTrait: () => revealSuspectTrait(s),
});

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

/** Put a document in the locker and note it in the journal. */
function file(s: GameState, p: PlayerState | null, defId: string, at: string, data?: Record<string, string>, label?: string, how?: string) {
  const def = exhibitById(defId);
  const key = `${defId}#${s.exhibits.length + 1}`;
  const inst: ExhibitInstance = { key, def: defId, label: label || def.label, at, hour: s.cold, by: p?.id ?? null, ...(how ? { how } : {}), ...(data ? { data } : {}) };
  s.exhibits.push(inst);
  // The journal always says where it came from and how it came to hand.
  journal(s, p, 'exhibit', `Filed: ${inst.label}. ${how ?? `From ${locName(s, at)}.`}`, { exhibit: key, location: at });
  return inst;
}

function collect(s: GameState, p: PlayerState, ev: EvidenceState, how?: string) {
  ev.found = true;
  if (ev.kind === 'object') {
    const obj = objectById(s, ev.object);
    if (!obj) return;
    s.objects.push(obj.id);
    tell(s, obj.spoken, 'clue', 'clue');
    pushLog(s, `Found — ${obj.name}. You are carrying it.`, 'fact');
    journal(s, p, 'exhibit', `Picked up ${obj.name.toLowerCase()}. ${how ?? `At ${locName(s, p.at)}.`} Somebody in this city will know it.`, { location: p.at });
    return;
  }
  const def = exhibitById(ev.exhibit);
  if (ev.kind === 'clue') {
    s.knownCulprit[ev.trait] = ev.value;
    // The narrator reads the observation. The conclusion is the table's job.
    tell(s, def.spoken, 'clue', 'clue');
    pushLog(s, `Exhibit filed — ${def.label}.`, 'fact');
    file(s, p, ev.exhibit, p.at, undefined, undefined, how);
    return;
  }
  if (ev.kind === 'item') {
    const item = itemById(ev.item);
    if (!item) return;
    tell(s, item.spoken, 'clue', 'clue');
    pushLog(s, `Found — ${item.label}.`, 'fact');
    file(s, p, ev.exhibit, p.at, undefined, undefined, how);
    const fx = item.effect;
    if (fx?.type === 'suspectTrait') {
      const r = revealSuspectTrait(s, fx.suspectId);
      if (r) tellResult(s, 'It gives something away.', r);
    } else if (fx?.type === 'lead') {
      const candidates = s.evidence.filter((e) => !e.found && e.at !== p.at && e.kind !== 'item' && !s.leads[e.at]);
      const target = candidates.length ? drawPick(s, candidates) : null;
      if (target) {
        s.leads[target.at] = true;
        tell(s, `It points at ${locName(s, target.at)}.`, 'lead', 'narrator', ['It points at', locName(s, target.at)]);
      }
    } else if (fx?.type === 'time') {
      if (fx.hours < 0) s.cold = Math.max(0, s.cold + fx.hours);
      else s.cold = Math.min(s.coldMax, s.cold + fx.hours);
      tell(s, fx.hours < 0 ? 'It saves you time.' : 'It costs you time.', fx.hours < 0 ? 'good' : 'bad');
    }
    return;
  }
  const boon = BOONS[ev.boon];
  tell(s, boon.text, 'boon', 'narrator');
  if (ev.boon === 'tip') {
    const r = revealCulpritTrait(s);
    if (r) {
      tellResult(s, 'The note names a fact about your killer.', r);
      file(s, p, ev.exhibit, p.at, { fact: r.text }, undefined, how);
    } else {
      tell(s, 'The note says nothing you had not already worked out.', 'fact');
      file(s, p, ev.exhibit, p.at, { fact: 'nothing you had not already worked out.' }, undefined, how);
    }
  } else if (ev.boon === 'spur') {
    s.cold = Math.max(0, s.cold - 2);
    tell(s, 'The trail warms up. You have bought yourself time.', 'good');
    file(s, p, ev.exhibit, p.at, undefined, undefined, how);
  } else if (ev.boon === 'coffee') {
    p.ap += 1;
    s.cold = Math.max(0, s.cold - 1); // the extra action is genuinely free
    pushLog(s, `${p.name} finds a second wind.`, 'good');
    say(s, 'A second wind. One more action, and it costs nothing.', 'narrator');
    file(s, p, ev.exhibit, p.at, undefined, undefined, how);
  } else if (ev.boon === 'ledger') {
    const r = revealSuspectTrait(s);
    if (r) {
      tellResult(s, 'The ledger gives somebody up.', r);
      const who = sus(s, r.who) as SuspectState;
      file(s, p, ev.exhibit, p.at, { who: who.name, phrase: r.traits.map((t) => traitPhrase(t, who.traits[t])).join('; ') }, undefined, how);
    } else {
      tell(s, 'The ledger tells you nothing new.', 'fact');
      file(s, p, ev.exhibit, p.at, { who: 'a name you already have', phrase: 'nothing new' }, undefined, how);
    }
  }
}

function searchLocation(s: GameState, p: PlayerState, locId: string, picks: number) {
  const here = s.evidence.filter((e) => e.at === locId && !e.found);
  const rec = s.searched[locId] || (s.searched[locId] = { times: 0, empty: false });
  rec.times += 1;
  if (here.length <= picks) rec.empty = true;
  delete s.leads[locId];
  const where = loc(s, locId);
  const story = searchNarrative(locId, where?.type ?? 'office', rec.times, here.length > 0);
  // Where the detective looked, then the thing that made them look closer.
  tell(s, story.looked, 'info', 'narrator');
  if (!here.length) {
    tell(s, searchEmptyLine(locId, rec.times), 'info', 'narrator');
    journal(s, p, 'search', `Searched ${locName(s, locId)}. Nothing there.`, { location: locId });
    return 0;
  }
  if (story.off) tell(s, story.off, 'info', 'narrator');
  const take = here.slice(0, picks);
  journal(s, p, 'search', `Searched ${locName(s, locId)}. ${story.looked}${story.off ? ` ${story.off}` : ''}`, { location: locId });
  const how = `Found at ${locName(s, locId)}, searching. ${story.off ?? story.looked}`;
  take.forEach((e) => collect(s, p, e, how));
  return take.length;
}

// ---------------------------------------------------------------------------
// turn / round flow
// ---------------------------------------------------------------------------

/** An event tick: time has passed, the city has moved, something has happened. */
function nightfall(s: GameState) {
  s.modifiers = { moveSurcharge: 0, apPenalty: 0 };

  for (const x of s.suspects) if (x.clammed > 0) x.clammed -= 1;
  for (const w of s.witnesses) w.patience = Math.min(WITNESS_PATIENCE, w.patience + 1);
  for (const k of Object.keys(s.sealed)) {
    s.sealed[k] -= 1;
    if (s.sealed[k] <= 0) delete s.sealed[k];
  }

  moveSuspects(s);

  const ev = drawPick(s, EVENTS);
  s.lastEvent = ev.id;
  tell(s, `${ev.title.toUpperCase()}. ${ev.text}`, ev.kind === 'good' ? 'good' : 'event', 'alert');
  const outcome = ev.effect(s, eventApi(s));
  let outcomeText = '';
  if (outcome) {
    const o = typeof outcome === 'string' ? { text: outcome, parts: [outcome] } : outcome;
    outcomeText = o.text;
    tell(s, o.text, 'event', 'narrator', o.parts);
  }
  journal(s, null, 'event', `${ev.title}. ${outcomeText || ev.text}`);

  const left = Math.max(0, s.coldMax - s.cold);
  pushLog(s, `— ${left} ${left === 1 ? 'hour' : 'hours'} before the trail is cold. —`, 'round');
}

/** Burn hours off the clock, firing events as the night crosses each mark. */
function tickClock(s: GameState, hours: number) {
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
    journal(s, null, 'end', 'The trail went cold. Whoever did it walked.');
  }
}

/** Hand the clipboard to the next detective; refresh the table on a new round. */
function advanceTurn(s: GameState) {
  if (s.phase !== 'play') return;
  if (s.turn + 1 >= s.players.length) {
    s.round += 1;
    s.turn = 0;
    for (const p of s.players) {
      p.ap = Math.max(1, p.apMax - s.modifiers.apPenalty);
      p.freeMoveUsed = false;
    }
    pushLog(s, `— Round ${s.round}. —`, 'round');
  } else {
    s.turn += 1;
  }
  const next = s.players[s.turn];
  if (next) next.freeMoveUsed = false;
}

// ---------------------------------------------------------------------------
// the reducer
// ---------------------------------------------------------------------------

export function applyAction(prev: GameState, action: Action): GameState {
  const s = structuredClone(prev);
  s.narration = [];
  s.conversation = null;
  s.testimony = null;
  s.showing = null;
  s.talking = null;
  if (s.phase === 'over') return s;
  const apBefore = s.players.reduce((n, x) => n + x.ap, 0);

  const p = player(s, action.playerId);
  if (!p) return s;
  if (s.players[s.turn] && s.players[s.turn].id !== p.id) return s; // not your turn
  const ch = characterById(p.charId);

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
      const from = p.at;
      p.at = action.to;
      pushLog(s, `${p.name} moves to ${locName(s, action.to)}.`, 'move', p.id);
      if (free) pushLog(s, 'Ruby knows the shortcut. That one was free.', 'good');
      journal(s, p, 'move', `Went from ${locName(s, from)} to ${locName(s, action.to)}.`, { location: action.to });
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

      const noted: string[] = [];
      if (!open.length) {
        tell(s, `${x.name} has nothing left to give. You already have all of it.`, 'info', 'narrator',
          [x.name, 'has nothing left to give. You already have all of it.']);
      } else {
        const picked = drawShuffle(s, open).slice(0, approach.reveals + extra);
        picked.forEach((t) => {
          subject.known[t] = true;
          s.conversation!.learned.push({ trait: t, who: subject.id });
          const about = subject.id === x.id ? x.name : `${subject.name}, by the sound of it,`;
          const said = traitValue(t, subject.traits[t]).tell;
          noted.push(`${subject.name} ${said}`);
          tell(s, `${about} ${said}`, 'tell', 'clue', subject.id === x.id
            ? [x.name, said]
            : [subject.name, 'by the sound of it,', said]);
        });
      }
      journal(s, p, 'talk',
        `Questioned ${x.name} at ${locName(s, p.at)} (${approach.label.toLowerCase()}). ${noted.length ? noted.join(' ') : 'Learned nothing new.'}`,
        { suspect: x.id });

      // Kell is never shut out; everybody else wears out their welcome.
      if (ch.id !== 'kell') x.clammed = Math.max(x.clammed, approach.clams);
      break;
    }

    case 'ASK': {
      if (p.ap < 1) return s;
      const w = s.witnesses.find((y) => y.id === action.witnessId);
      const def = w && witnessDef(s, w.id);
      if (!w || !def || w.at !== p.at || w.patience <= 0) return s;
      const caseDef = caseById(s.caseId);

      if (action.question === 'about') {
        const subject = action.suspectId ? sus(s, action.suspectId) : undefined;
        if (!subject || subject.dead || !def.knows.includes(subject.id) || w.described.includes(subject.id)) return s;
        p.ap -= 1;
        w.patience -= 1;
        w.described.push(subject.id);
        const ask = WITNESS_ASKS.about[drawInt(s, WITNESS_ASKS.about.length)];
        pushLog(s, `${p.name} asks ${def.name} about ${subject.name}.`, 'action', p.id);
        tell(s, ask, 'talk', 'ask');
        const open = s.chosenTraits.filter((t) => !subject.known[t]);
        if (!open.length) {
          const reply = `${subject.name}? ${WITNESS_ASKS.nothing}`;
          s.testimony = { witnessId: w.id, question: 'about', ask, reply, subjectId: subject.id };
          tell(s, reply, 'witness', 'witness', [subject.name, WITNESS_ASKS.nothing]);
          journal(s, p, 'ask', `Asked ${def.name} about ${subject.name}. Nothing new.`, { witness: w.id, suspect: subject.id });
        } else {
          const t = drawPick(s, open);
          subject.known[t] = true;
          const said = traitValue(t, subject.traits[t]).tell;
          const surname = subject.name.split(' ').slice(-1)[0];
          // Their own words about the person first, then what they noticed.
          const opinion = def.opinions?.[subject.id] ?? def.aboutLine;
          const reply = `${subject.name}? ${opinion} ${surname} ${said}`;
          s.testimony = { witnessId: w.id, question: 'about', ask, reply, subjectId: subject.id, trait: t };
          tell(s, reply, 'witness', 'witness', [subject.name, opinion, surname, said]);
          const inst = file(s, p, 'statement', p.at, {
            witness: def.name, role: def.role, where: locName(s, p.at), by: p.name,
            text: reply, parts: [subject.name, opinion, surname, said].join('\n'),
            reading: `${subject.name} — ${traitPhrase(t, subject.traits[t])}.`,
          }, `Statement — ${def.name}`, `Taken down at ${locName(s, p.at)} from ${def.name}, ${def.role}, when asked about ${subject.name}.`);
          s.testimony.exhibit = inst.key;
          journal(s, p, 'ask', `Asked ${def.name} about ${subject.name}: ${surname} ${said}`, { witness: w.id, suspect: subject.id });
        }
      } else {
        if (w.leadGiven) return s;
        p.ap -= 1;
        w.patience -= 1;
        w.leadGiven = true;
        const ask = WITNESS_ASKS.lead[drawInt(s, WITNESS_ASKS.lead.length)];
        pushLog(s, `${p.name} asks ${def.name} what they saw.`, 'action', p.id);
        tell(s, ask, 'talk', 'ask');
        const candidates = s.evidence.filter((e) => !e.found && e.at !== p.at && !s.leads[e.at]);
        const pickFrom = candidates.length ? candidates : s.evidence.filter((e) => !e.found && e.at !== p.at);
        const ev = pickFrom.length ? drawPick(s, pickFrom) : null;
        if (!ev) {
          const reply = WITNESS_ASKS.noLead;
          s.testimony = { witnessId: w.id, question: 'lead', ask, reply };
          tell(s, reply, 'witness', 'witness');
          journal(s, p, 'ask', `Asked ${def.name} what they saw. Nothing useful.`, { witness: w.id });
        } else {
          s.leads[ev.at] = true;
          const where = locName(s, ev.at);
          const reply = `${def.leadLine} ${where}.`;
          s.testimony = { witnessId: w.id, question: 'lead', ask, reply, locationId: ev.at };
          tell(s, reply, 'lead', 'witness', [def.leadLine, where]);
          const inst = file(s, p, 'statement', p.at, {
            witness: def.name, role: def.role, where: locName(s, p.at), by: p.name,
            text: reply, parts: [def.leadLine, where].join('\n'), reading: `Something to find at ${where}.`,
          }, `Statement — ${def.name}`, `Taken down at ${locName(s, p.at)} from ${def.name}, ${def.role}, when asked what they had seen.`);
          s.testimony.exhibit = inst.key;
          journal(s, p, 'ask', `${def.name} pointed at ${where}: "${reply}"`, { witness: w.id, location: ev.at });
        }
      }
      if (!caseDef) return s;
      break;
    }

    case 'SHOW': {
      if (p.ap < 1) return s;
      if (!s.objects.includes(action.objectId)) return s;
      const obj = objectById(s, action.objectId);
      if (!obj) return s;
      const shownTo = s.shown[obj.id] || (s.shown[obj.id] = []);
      if (shownTo.includes(action.personId)) return s;
      // The person has to be in front of you: a suspect standing here, or
      // the witness who lives here.
      const suspect = sus(s, action.personId);
      const wdef = witnessDef(s, action.personId);
      const wstate = s.witnesses.find((w) => w.id === action.personId);
      const here = suspect ? !suspect.dead && suspect.at === p.at : !!wstate && wstate.at === p.at;
      if (!here) return s;
      const who = suspect ? suspect.name : wdef?.name ?? action.personId;
      const kind: 'suspect' | 'witness' = suspect ? 'suspect' : 'witness';
      p.ap -= 1;
      shownTo.push(action.personId);
      pushLog(s, `${p.name} shows ${who} ${obj.name.toLowerCase()}.`, 'action', p.id);
      const unlock = obj.unlocks.find((u) => u.person === action.personId);
      if (!unlock) {
        const line = SHOW_LINES.ask[drawInt(s, SHOW_LINES.ask.length)];
        const reply = SHOW_LINES.shrug[drawInt(s, SHOW_LINES.shrug.length)];
        s.showing = { objectId: obj.id, personId: action.personId, kind, line, reply, unlocked: false };
        tell(s, line, 'talk', 'ask');
        tell(s, reply, 'talk', kind === 'suspect' ? 'reply' : 'witness');
        journal(s, p, 'show', `Showed ${who} ${obj.name.toLowerCase()}. It meant nothing to them.`, suspect ? { suspect: suspect.id } : { witness: action.personId });
        break;
      }
      s.showing = { objectId: obj.id, personId: action.personId, kind, line: unlock.line, reply: unlock.reply, unlocked: true };
      tell(s, unlock.line, 'talk', 'ask');
      tell(s, unlock.reply, 'talk', kind === 'suspect' ? 'reply' : 'witness');
      const outcome = applyUnlock(s, p, unlock.effect);
      s.showing.outcome = outcome;
      journal(s, p, 'show', `Showed ${who} ${obj.name.toLowerCase()}. ${unlock.reply} ${outcome}`.trim(), suspect ? { suspect: suspect.id } : { witness: action.personId });
      break;
    }

    case 'TALK': {
      const suspect = sus(s, action.personId);
      const wdef = witnessDef(s, action.personId);
      const wstate = s.witnesses.find((w) => w.id === action.personId);
      const sdef = suspect ? caseById(s.caseId).suspects.find((d) => d.id === suspect.id) : undefined;
      const topics = (suspect ? sdef?.topics : wdef?.topics) ?? [];
      const topic = topics.find((t) => t.id === action.topicId);
      if (!topic) return s;
      const here = suspect ? !suspect.dead && suspect.at === p.at : !!wstate && wstate.at === p.at;
      if (!here) return s;
      const asked = s.asked[action.personId] || (s.asked[action.personId] = []);
      if (asked.includes(topic.id)) return s;
      if (topic.after && !asked.includes(topic.after)) return s;
      if (topic.needs && !s.objects.includes(topic.needs)) return s;
      const cost = topic.cost ?? 0;
      if (p.ap < cost) return s;
      p.ap -= cost;
      asked.push(topic.id);
      const who = suspect ? suspect.name : wdef?.name ?? action.personId;
      const kind: 'suspect' | 'witness' = suspect ? 'suspect' : 'witness';
      pushLog(s, `${p.name} asks ${who}: ${topic.q}`, 'talk', p.id);
      tell(s, topic.q, 'talk', 'ask');
      tell(s, topic.a, 'talk', kind === 'suspect' ? 'reply' : 'witness');
      s.talking = { personId: action.personId, kind, topicId: topic.id, q: topic.q, a: topic.a };
      if (topic.effect) s.talking.outcome = applyUnlock(s, p, topic.effect);
      journal(s, p, 'question', `${who}, asked "${topic.q}": ${topic.a}${s.talking.outcome ? ` ${s.talking.outcome}` : ''}`, suspect ? { suspect: suspect.id } : { witness: action.personId });
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
        tell(s, `${x.name} does not deny it. ${x.name.split(' ')[0]} did it ${x.motive}`, 'win', 'alert',
          [x.name, 'does not deny it.', x.name.split(' ').slice(-1)[0], 'did it', x.motive]);
        journal(s, p, 'accuse', `Accused ${x.name}. They did not deny it. Case closed.`, { suspect: x.id });
        journal(s, null, 'end', `${x.name} killed ${caseById(s.caseId).victim} ${x.motive}`);
      } else {
        x.cleared = true;
        s.wrongAccusations.push(x.id);
        tell(s, `${x.name} is not your killer, and now every lawyer in Ashgrave knows your name. Three more hours gone.`, 'bad', 'alert',
          [x.name, 'is not your killer, and now every lawyer in Ashgrave knows your name. Three more hours gone.']);
        journal(s, p, 'accuse', `Accused ${x.name}. Wrong. Three hours lost, and ${x.name.split(' ').slice(-1)[0]} is off the list.`, { suspect: x.id });
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

  if (p.ap <= 0) advanceTurn(s);
  return s;
}

/** What a scene gives up: a fact, a habit, a place, an alibi, time. Returns a line for the journal. */
function applyUnlock(s: GameState, p: PlayerState, fx: UnlockEffect): string {
  switch (fx.type) {
    case 'culpritTrait': {
      const r = revealCulpritTrait(s);
      if (r) { tellResult(s, 'It comes out.', r); return r.text; }
      tell(s, 'It confirms what you already had.', 'fact');
      return 'Nothing new.';
    }
    case 'suspectTrait': {
      const r = revealSuspectTrait(s, fx.suspectId);
      if (r) { tellResult(s, 'It gives something away.', r); return r.text; }
      tell(s, 'It confirms what you already had.', 'fact');
      return 'Nothing new.';
    }
    case 'clear': {
      const x = sus(s, fx.suspectId);
      if (!x) return '';
      if (x.id === s.culpritId) {
        // The killer's story cannot hold. Something slips instead.
        const r = revealCulpritTrait(s);
        tell(s, `${x.name} tells it well. It does not hold.`, 'bad', 'narrator', [x.name, 'tells it well. It does not hold.']);
        if (r) { tellResult(s, 'It comes out.', r); return r.text; }
        return 'Their story does not hold.';
      }
      if (x.cleared) return '';
      x.cleared = true;
      tell(s, `${x.name} is cleared. Their story holds.`, 'good', 'narrator', [x.name, 'is cleared. Their story holds.']);
      return `${x.name} is cleared.`;
    }
    case 'lead': {
      const candidates = s.evidence.filter((e) => !e.found && e.at !== p.at && e.kind !== 'item' && !s.leads[e.at]);
      const target = candidates.length ? drawPick(s, candidates) : null;
      if (!target) return '';
      s.leads[target.at] = true;
      tell(s, `It points at ${locName(s, target.at)}.`, 'lead', 'narrator', ['It points at', locName(s, target.at)]);
      return `Lead: ${locName(s, target.at)}.`;
    }
    case 'time': {
      s.cold = fx.hours < 0 ? Math.max(0, s.cold + fx.hours) : Math.min(s.coldMax, s.cold + fx.hours);
      tell(s, fx.hours < 0 ? 'It saves you time.' : 'It costs you time.', fx.hours < 0 ? 'good' : 'bad');
      return fx.hours < 0 ? 'Time saved.' : 'Time lost.';
    }
    default:
      return '';
  }
}

function runAbility(s: GameState, p: PlayerState, ch: CharacterDef, action: Extract<Action, { type: 'ABILITY' }>): boolean {
  switch (ch.ability) {
    case 'VERDICT': {
      const x = action.suspectId ? sus(s, action.suspectId) : undefined;
      if (!x || x.dead) return false;
      if (x.id === s.culpritId) {
        s.chosenTraits.forEach((t) => { x.known[t] = true; });
        tell(s, `Hale looks at ${x.name} for a long moment and says nothing at all. It is them. Everything about them matches.`, 'fact', 'alert',
          ['Hale looks at', x.name, 'for a long moment and says nothing at all. It is them. Everything about them matches.']);
        journal(s, p, 'ability', `Hale's verdict on ${x.name}: it is them.`, { suspect: x.id });
      } else {
        x.cleared = true;
        tell(s, `Thirty-one years of instinct says ${x.name} did not do this. Cross them off.`, 'fact', 'clue',
          ['Thirty-one years of instinct says', x.name, 'did not do this. Cross them off.']);
        journal(s, p, 'ability', `Hale's verdict on ${x.name}: not them. Crossed off.`, { suspect: x.id });
      }
      return true;
    }
    case 'AUTOPSY': {
      const r = revealCulpritTrait(s);
      if (r) tellResult(s, 'Vale goes back to the body and finds what the first pass missed.', r, 'fact', 'clue');
      else tell(s, 'The body has nothing left to say.', 'fact', 'clue');
      journal(s, p, 'ability', `Second autopsy. ${r ? r.text : 'The body had nothing left to say.'}`);
      return true;
    }
    case 'HEADLINE': {
      s.cold = Math.max(0, s.cold - 3);
      tell(s, 'Crane puts it above the fold. The whole city is looking now, and looking buys you time.', 'good', 'alert');
      journal(s, p, 'ability', 'Crane ran it on the front page. Three hours bought back.');
      return true;
    }
    case 'BREAKIN': {
      const target = action.locationId;
      if (!target || !loc(s, target)) return false;
      pushLog(s, `Ruby lets herself into ${locName(s, target)}. No warrant, no witnesses.`, 'action', p.id);
      journal(s, p, 'ability', `Ruby broke into ${locName(s, target)}.`, { location: target });
      searchLocation(s, p, target, 1);
      return true;
    }
    case 'CONFESSION': {
      const x = action.suspectId ? sus(s, action.suspectId) : undefined;
      if (!x || x.dead || x.at !== p.at) return false;
      const open = s.chosenTraits.filter((t) => !x.known[t]);
      if (!open.length) {
        tell(s, `${x.name} has already told you everything. Kell gives them absolution anyway.`, 'info', 'narrator',
          [x.name, 'has already told you everything. Kell gives them absolution anyway.']);
        journal(s, p, 'ability', `${x.name} confessed to Kell, but had nothing left to tell.`, { suspect: x.id });
        return true;
      }
      open.forEach((t) => { x.known[t] = true; });
      const phrases = open.map((t) => traitPhrase(t, x.traits[t]));
      tell(s, `${x.name} tells Kell all of it: ${phrases.join('; ')}.`, 'fact', 'clue',
        [x.name, 'tells Kell all of it:', ...phrases]);
      journal(s, p, 'ability', `${x.name} told Kell everything: ${phrases.join('; ')}.`, { suspect: x.id });
      return true;
    }
    case 'APB': {
      const x = action.suspectId ? sus(s, action.suspectId) : undefined;
      if (!x || x.dead) return false;
      x.at = p.at;
      x.frozen = 2;
      x.clammed = 0;
      tell(s, `Quist puts out the bulletin. Two hours later ${x.name} is sitting across from her at ${locName(s, p.at)}, and not going anywhere.`, 'good', 'alert',
        ['Quist puts out the bulletin. Two hours later', x.name, 'is sitting across from her at', locName(s, p.at), 'and not going anywhere.']);
      journal(s, p, 'ability', `Quist's bulletin brought ${x.name} to ${locName(s, p.at)}.`, { suspect: x.id });
      return true;
    }
    default:
      return false;
  }
}

/** Only exported for the test suite's sanity checks. */
export const _internal = { traitLabel, TRAITS };
export { DIFFICULTIES, BOONS, locName, sus as suspectById, player as playerById };
export type { CaseDef };
