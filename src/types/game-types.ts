// Every shape the rules engine, the UI and the save file agree on.
//
// The state is plain data on purpose: it is structuredClone'd by the reducer,
// JSON'd by the save manager, and compared byte-for-byte by the determinism
// test. Nothing in here may hold a function or a class instance.

export type TraitId = 'build' | 'hair' | 'hand' | 'mark' | 'vice' | 'scent' | 'shoe';
export type DifficultyId = 'rookie' | 'detective' | 'commissioner';
export type CharacterId = 'hale' | 'vale' | 'crane' | 'ruby' | 'kell' | 'quist';
export type AbilityId = 'VERDICT' | 'AUTOPSY' | 'HEADLINE' | 'BREAKIN' | 'CONFESSION' | 'APB';
export type ApproachId = 'straight' | 'press' | 'sideways';
export type BoonId = 'tip' | 'spur' | 'coffee' | 'ledger';
export type Phase = 'play' | 'over';
export type Result = 'win' | 'loss' | null;

export type LocationType =
  | 'hotel' | 'police' | 'bar' | 'shop' | 'docks' | 'factory' | 'church' | 'hospital' | 'press'
  | 'home' | 'market' | 'manor' | 'warehouse' | 'light' | 'morgue' | 'station' | 'bank' | 'school'
  | 'bridge' | 'bathhouse';

/** Tones drive both the narrator's delivery and the colour of the subtitle. */
export type Tone =
  | 'narrator' | 'brief' | 'title' | 'alert' | 'clue' | 'ask' | 'reply' | 'witness' | 'good' | 'bad';

export type LogKind =
  | 'info' | 'case' | 'move' | 'action' | 'clue' | 'fact' | 'boon' | 'talk' | 'tell' | 'event'
  | 'good' | 'bad' | 'grim' | 'round' | 'accuse' | 'win' | 'muted' | 'witness' | 'lead';

export interface TraitValueDef {
  id: string;
  label: string;
  /** What physical evidence says about the killer. */
  clue: string;
  /** What you notice about a suspect who has this value. */
  tell: string;
}

export interface TraitDef {
  id: TraitId;
  label: string;
  icon: string;
  public?: boolean;
  values: TraitValueDef[];
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  short: string;
  role: string;
  color: string;
  blurb: string;
  passive: string;
  passiveNote: string;
  ability: AbilityId;
  abilityName: string;
  abilityText: string;
}

export interface ApproachDef {
  id: ApproachId;
  label: string;
  hint: string;
  reveals: number;
  clams: number;
  aboutOther?: boolean;
  ask: string[];
}

export interface LocationDef {
  id: string;
  name: string;
  type: LocationType;
  x: number;
  y: number;
  desc: string;
}

export interface SuspectDef {
  id: string;
  name: string;
  role: string;
  blurb: string;
  motive: string;
}

/**
 * Somebody who lives or works at a location and will talk, for a price of an
 * hour. Witnesses are not suspects: they have nothing to hide, only a limited
 * patience and a limited view. `knows` lists the suspects they have seen up
 * close tonight, so what they can tell you is bounded by where they stand.
 */
export interface WitnessDef {
  id: string;
  at: string;
  name: string;
  role: string;
  /** How they introduce themselves. Free to hear. */
  intro: string;
  /** Suspects this witness can describe. */
  knows: string[];
  /** In-character lead-in before a trait observation about a suspect. */
  aboutLine: string;
  /** In-character line that points at where something was dropped. */
  leadLine: string;
  /** What they say when they have nothing left. */
  spentLine: string;
}

export interface DistrictLabel {
  text: string;
  x: number;
  y: number;
  rot?: number;
  size?: number;
}

export interface TerrainDef {
  sea?: boolean;
  seaName?: string;
  river?: boolean;
  riverSource?: number;
  riverMouth?: number;
  lakeAt?: string;
  lakeName?: string;
  parks?: number;
  districts?: DistrictLabel[];
}

export interface CaseDef {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  victim: string;
  scene: string;
  difficultyHint: string;
  publicTraits: TraitId[];
  traitPool: TraitId[];
  briefing: string;
  radio: string[];
  terrain: TerrainDef;
  locations: LocationDef[];
  edges: [string, string][];
  start: string;
  suspects: SuspectDef[];
  witnesses: WitnessDef[];
  /**
   * Documents scattered across the city that belong to this case: letters,
   * clippings, photographs, tickets. Some hand you something -- a habit of a
   * suspect's, a place worth a look, an hour back -- and some are only story,
   * or misdirection. Telling the two apart is the job.
   */
  items: CaseItemDef[];
  epilogue: { win: string; loss: string };
}

export type ItemEffect =
  | { type: 'none' }
  /** The document gives away one thing about a named suspect. */
  | { type: 'suspectTrait'; suspectId: string }
  /** It points at where something else was left. */
  | { type: 'lead' }
  /** It saves or costs time on the clock. */
  | { type: 'time'; hours: number };

export interface CaseItemDef {
  id: string;
  at: string;
  kind: 'report' | 'lab' | 'photo' | 'statement' | 'telegram' | 'note' | 'ledger' | 'receipt' | 'cast' | 'card' | 'letter' | 'clipping' | 'ticket';
  label: string;
  source: string;
  title: string;
  fields?: [string, string][];
  body: string[];
  figure?: string;
  stamp?: 'EVIDENCE' | 'CONFIDENTIAL' | 'RECEIVED' | 'COPY' | 'PERSONAL';
  /** The one sentence the narrator reads when it is found. */
  spoken: string;
  /** What it means, if anything. */
  reading: string;
  effect?: ItemEffect;
  /** Suspects it mentions, so the dossier can cross-reference it. */
  about?: string[];
}

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  traits: number;
  suspects: number;
  budget: number;
  note: string;
}

export interface BoonDef {
  id: BoonId;
  label: string;
  icon: string;
  text: string;
}

// ------------------------------------------------------------------ state

export interface PlayerState {
  id: string;
  name: string;
  charId: CharacterId;
  at: string;
  ap: number;
  apMax: number;
  abilityUsed: boolean;
  freeMoveUsed: boolean;
}

export interface SuspectState extends SuspectDef {
  traits: Record<TraitId, string>;
  known: Record<TraitId, boolean>;
  at: string;
  clammed: number;
  frozen: number;
  cleared: boolean;
  dead: boolean;
}

export interface WitnessState {
  id: string;
  at: string;
  /** Paid questions left before they stop talking for the night. */
  patience: number;
  /** Suspects already described, so the same one is never described twice. */
  described: string[];
  leadGiven: boolean;
}

export type EvidenceState =
  | {
      id: string;
      kind: 'item';
      /** Case-authored document id, e.g. 'item:orchid:love-letter'. */
      item: string;
      text: string;
      exhibit: string;
      found: boolean;
      at: string;
    }
  | {
      id: string;
      kind: 'clue';
      trait: TraitId;
      value: string;
      text: string;
      /** The document this clue is read from. See game/exhibits.ts. */
      exhibit: string;
      found: boolean;
      at: string;
      order: number;
    }
  | {
      id: string;
      kind: 'boon';
      boon: BoonId;
      text: string;
      exhibit: string;
      found: boolean;
      at: string;
    };

export interface LogEntry {
  round: number;
  text: string;
  kind: LogKind;
  actor: string | null;
}

export interface NarrationLine {
  text: string;
  tone: Tone;
  parts: string[];
}

export interface ConversationState {
  suspectId: string;
  subjectId: string;
  approach: ApproachId;
  ask: string;
  reply: string;
  learned: { trait: TraitId; who: string }[];
}

export type WitnessQuestion = 'about' | 'lead';

export interface TestimonyState {
  witnessId: string;
  question: WitnessQuestion;
  ask: string;
  reply: string;
  /** For 'about': the suspect described and the trait observed. */
  subjectId?: string;
  trait?: TraitId;
  /** For 'lead': the location pointed at. */
  locationId?: string;
  /** The exhibit id of the typed statement filed from this testimony. */
  exhibit?: string;
}

/**
 * One line of the detectives' journal. Written by the reducer for every
 * action, so it is shared, ordered and deterministic. Players' own notes are
 * kept outside the state (see systems/save-manager.ts) so that typing a
 * thought never changes the board.
 */
export interface JournalEntry {
  n: number;
  /** Hours since the case opened, i.e. state.cold at the time. */
  hour: number;
  round: number;
  playerId: string | null;
  kind: 'open' | 'move' | 'search' | 'exhibit' | 'talk' | 'ask' | 'ability' | 'accuse' | 'event' | 'end' | 'note';
  text: string;
  /** Something the entry can open: an exhibit, a suspect, a location. */
  ref?: { exhibit?: string; suspect?: string; location?: string; witness?: string };
}

export interface GameState {
  v: number;
  seed: string;
  tick: number;
  caseId: string;
  difficulty: DifficultyId;
  handoff: boolean;
  map: {
    start: string;
    scene: string;
    locations: LocationDef[];
    edges: [string, string][];
    adj: Record<string, string[]>;
  };
  players: PlayerState[];
  suspects: SuspectState[];
  witnesses: WitnessState[];
  culpritId: string;
  evidence: EvidenceState[];
  chosenTraits: TraitId[];
  publicTraits: TraitId[];
  hiddenTraits: TraitId[];
  knownCulprit: Record<TraitId, string | null>;
  /** Exhibits in the locker, in the order they were filed. */
  exhibits: ExhibitInstance[];
  /** Locations a witness has pointed at. Cleared when searched. */
  leads: Record<string, true>;
  cold: number;
  coldMax: number;
  round: number;
  turn: number;
  phase: Phase;
  result: Result;
  solvedBy?: string;
  sealed: Record<string, number>;
  nextEventAt: number;
  searched: Record<string, { times: number; empty: boolean }>;
  modifiers: { moveSurcharge: number; apPenalty: number };
  wrongAccusations: string[];
  lastEvent: string | null;
  conversation: ConversationState | null;
  testimony: TestimonyState | null;
  log: LogEntry[];
  journal: JournalEntry[];
  narration: NarrationLine[];
}

/**
 * A document in the evidence locker. The definition (layout, wording) lives in
 * game/exhibits.ts; the instance records where and when it was filed and any
 * words that were only known at the time -- a name a ledger gave up, the
 * witness a statement was taken from.
 */
export interface ExhibitInstance {
  /** Unique per filing. Statements can be filed more than once. */
  key: string;
  /** Definition id, e.g. 'clue:hand:left' or 'statement'. */
  def: string;
  label: string;
  at: string;
  hour: number;
  by: string | null;
  data?: Record<string, string>;
}

// ---------------------------------------------------------------- actions

export type Action =
  | { type: 'MOVE'; playerId: string; to: string }
  | { type: 'SEARCH'; playerId: string }
  | { type: 'INTERROGATE'; playerId: string; suspectId: string; approach: ApproachId }
  | { type: 'ASK'; playerId: string; witnessId: string; question: WitnessQuestion; suspectId?: string }
  | { type: 'ABILITY'; playerId: string; suspectId?: string; locationId?: string }
  | { type: 'ACCUSE'; playerId: string; suspectId: string }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'RESIGN'; playerId: string };

export interface NewGameOptions {
  caseId: string;
  difficulty?: DifficultyId;
  seed?: string;
  players: { id?: string; name?: string; charId: CharacterId }[];
  handoff?: boolean;
}
