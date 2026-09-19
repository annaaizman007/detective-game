// Save and resume.
//
// Because applyAction is pure and every random draw comes from the state's
// own seed and tick, a game is fully described by how it started plus the
// ordered list of actions since. That is what gets saved: not the board, but
// the recipe for it. Restoring replays the log through the reducer, which is
// also exactly what an online client would do on joining -- see src/net/.
//
// Things the players wrote themselves -- notebook marks, journal notes -- are
// saved alongside but never fed to the reducer, so a note can never change
// the board.

import type { Action, CharacterId, DifficultyId, GameState, TraitId } from '../types/game-types';
import { createGame, applyAction } from '../game/state';
import { STORAGE, APP_VERSION } from '../config/constants';
import { readJSON, writeJSON, remove } from '../utils/storage';
import { debounce } from '../utils/timer';

export interface Note {
  id: string;
  /** Journal entry it hangs off, or null for a free-standing note. */
  entry: number | null;
  hour: number;
  text: string;
  at: number;
}

export interface SaveFile {
  version: 2;
  app: string;
  caseId: string;
  difficulty: DifficultyId;
  seed: string;
  handoff: boolean;
  players: { id: string; name: string; charId: CharacterId }[];
  actions: Action[];
  /** What the table has written in the killer's row of the notebook. */
  marks: Partial<Record<TraitId, string | null>>;
  notes: Note[];
  assisted: boolean;
  journal: boolean;
  startedAt: number;
  savedAt: number;
}

export interface RestoredGame {
  state: GameState;
  file: SaveFile;
}

export class SaveManager {
  private file: SaveFile | null = null;
  private write = debounce(() => { if (this.file) writeJSON(STORAGE.save, this.file); }, 250);

  /** Whatever is on disk, if it is ours and it parses. */
  peek(): SaveFile | null {
    const f = readJSON<SaveFile>(STORAGE.save);
    return f && f.version === 2 && Array.isArray(f.actions) ? f : null;
  }

  begin(state: GameState, opts: { assisted: boolean; journal: boolean }): SaveFile {
    this.file = {
      version: 2,
      app: APP_VERSION,
      caseId: state.caseId,
      difficulty: state.difficulty,
      seed: state.seed,
      handoff: state.handoff,
      players: state.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId })),
      actions: [],
      marks: {},
      notes: [],
      assisted: opts.assisted,
      journal: opts.journal,
      startedAt: Date.now(),
      savedAt: Date.now(),
    };
    this.write();
    return this.file;
  }

  get current(): SaveFile | null { return this.file; }

  record(action: Action): void {
    if (!this.file) return;
    this.file.actions.push(action);
    this.file.savedAt = Date.now();
    this.write();
  }

  patch(p: Partial<Pick<SaveFile, 'marks' | 'notes' | 'assisted' | 'journal'>>): void {
    if (!this.file) return;
    Object.assign(this.file, p);
    this.file.savedAt = Date.now();
    this.write();
  }

  /** Rebuild the board by replaying the log. */
  restore(file: SaveFile = this.peek() as SaveFile): RestoredGame | null {
    if (!file) return null;
    try {
      let state = createGame({
        caseId: file.caseId, difficulty: file.difficulty, seed: file.seed, handoff: file.handoff,
        players: file.players,
      });
      for (const a of file.actions) state = applyAction(state, a);
      state.narration = []; // nothing should be read aloud on a reload
      this.file = file;
      return { state, file };
    } catch {
      return null;
    }
  }

  clear(): void {
    this.file = null;
    remove(STORAGE.save);
  }

  /** A save as text, for moving a game between devices. */
  export(file: SaveFile | null = this.file): string {
    if (!file) return '';
    return btoa(unescape(encodeURIComponent(JSON.stringify(file))));
  }

  import(text: string): SaveFile | null {
    try {
      const f = JSON.parse(decodeURIComponent(escape(atob(text.trim())))) as SaveFile;
      if (f.version !== 2 || !Array.isArray(f.actions)) return null;
      writeJSON(STORAGE.save, f);
      return f;
    } catch {
      return null;
    }
  }
}
