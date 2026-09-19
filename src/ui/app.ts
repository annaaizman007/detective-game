// The controller. Owns the current state, the transport, the narrator, the
// room and the board, and re-renders whatever screen is current. All DOM
// interaction is delegated from one click handler on the root, keyed off
// data-act attributes; the board talks back through the scene's handlers.

import Phaser from 'phaser';
import type { Action, CharacterId, GameState, TraitId } from '../types/game-types';
import { createGame, applyAction } from '../game/state';
import * as R from '../game/rules';
import { CASES, caseById } from '../game/cases/index';
import { CHARACTERS, characterById } from '../game/characters';
import { Narrator } from '../systems/narrator';
import { AudioManager, type Channel } from '../systems/audio-manager';
import { SaveManager, type Note } from '../systems/save-manager';
import { InputSystem } from '../systems/input-system';
import { LocalTransport } from '../net/transport';
import { gameConfig } from '../config/game-config';
import { BoardScene, type BoardView } from '../scenes/board-scene';
import { renderNotebook, profileOf } from './notebook';
import { lockerList, exhibitView, documentHtml, letterOf, foundSheet } from './exhibits';
import { renderJournal, exportJournal } from './journal';
import { renderDialogue, type DialogueView } from './dialogue';
import { locationPanel, accusePanel, abilityPanel } from './panels';
import { icon, locIcon } from './icons';
import { portraitSvg } from './portraits';
import * as S from './screens';
import { typewriter, flash, esc, download } from './fx';
import { exhibitById, readAloud } from '../game/exhibits';
import { STORAGE } from '../config/constants';

type Screen = 'title' | 'setup' | 'briefing' | 'game' | 'end';
type Modal = 'how' | 'settings' | 'location' | 'dialogue' | 'accuse' | 'ability' | 'exhibit-zoom' | 'casefile' | 'found' | null;
type Tab = 'notebook' | 'locker' | 'journal' | 'suspects' | 'log';

interface UiState {
  mode: 'idle' | 'move';
  selectedLocation: string | null;
  selectedSuspect: string | null;
  selectedExhibit: string | null;
  tab: Tab;
  mobile: 'crew' | 'map' | 'book';
  marks: Partial<Record<TraitId, string | null>>;
  assisted: boolean;
  journal: boolean;
  notes: Note[];
  editing: number | 'new' | null;
  journalFilter: 'all' | 'mine' | 'finds' | 'people';
  revealed: Set<string>;
}

const freshUi = (): UiState => ({
  mode: 'idle', selectedLocation: null, selectedSuspect: null, selectedExhibit: null,
  tab: 'notebook', mobile: 'map', marks: {}, assisted: false, journal: true, notes: [],
  editing: null, journalFilter: 'all', revealed: new Set(),
});

export class App {
  root: HTMLElement;
  narrator = new Narrator();
  audio = new AudioManager();
  saves = new SaveManager();
  input = new InputSystem();
  transport = new LocalTransport();
  game: Phaser.Game;
  board: BoardScene | null = null;
  state: GameState | null = null;
  screen: Screen = 'title';
  modal: Modal = null;
  dialogue: DialogueView | null = null;
  found: { location: string; exhibits: string[]; objects: string[]; by: string } | null = null;
  subtitle = '';
  pendingHandoff: string | null = null;
  lastSeat: string | null = null;
  ui: UiState = freshUi();
  draft: S.Draft = {
    caseId: CASES[0].id, difficulty: 'detective', handoff: true, assisted: false, journal: true,
    seats: [{ name: '', charId: 'hale' }],
  };
  private cancelType: (() => void) | null = null;

  constructor(root: HTMLElement, canvasHost: HTMLElement) {
    this.root = root;
    this.game = new Phaser.Game(gameConfig(canvasHost));
    this.game.events.once('assets-ready', () => {
      this.board = this.game.scene.getScene('board') as BoardScene;
      this.board.setHandlers({
        onLocation: (id) => this.onMapLocation(id),
        onSuspect: (id) => this.openSuspect(id),
        onWitness: (id) => this.openWitness(id),
      });
      if (this.screen === 'game') this.paintBoard();
    });

    this.narrator.subscribe((ev) => {
      if (ev.type === 'line') { this.subtitle = ev.text; this.paintSubtitle(true); }
      // The radio opens when the narrator starts and closes when they stop,
      // so the voice always arrives inside a room rather than in a vacuum.
      if (ev.type === 'speaking') this.audio.openChannel();
      if (ev.type === 'idle') { this.audio.closeChannel(); this.paintSubtitle(false); }
      if (ev.type === 'clips' && this.modal === 'settings') this.renderModal();
      if (ev.type === 'voices' && this.modal === 'settings') this.renderModal();
    });
    this.audio.onThunder = (i) => this.game.events.emit('thunder', i);
    void this.narrator.loadClips().then((found) => { if (found && this.modal === 'settings') this.renderModal(); });

    this.transport.onAction((action) => this.commit(action));
    this.bind();
    this.render();
  }

  // -------------------------------------------------------------- plumbing

  private bind(): void {
    this.root.addEventListener('click', (e) => {
      this.audio.start(); // audio contexts only start from a gesture
      const target = e.target as HTMLElement;
      const el = target.closest<HTMLElement>('[data-act]');
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'FORM' || el.tagName === 'TEXTAREA') return;
      e.preventDefault();
      this.onAct(el.dataset.act as string, el);
    });
    this.root.addEventListener('change', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (el && el.tagName !== 'FORM') this.onAct(el.dataset.act as string, el);
    });
    this.root.addEventListener('input', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLInputElement>('[data-act="seat-name"]');
      if (el) this.draft.seats[+(el.dataset.i as string)].name = el.value;
      const range = (e.target as HTMLElement).closest<HTMLInputElement>('input[type=range][data-act]');
      if (range) this.onAct(range.dataset.act as string, range);
    });
    this.root.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('form[data-act]');
      if (!form) return;
      e.preventDefault();
      this.onAct(form.dataset.act as string, form);
    });
    this.input.attach();
    this.input.on((a, e) => {
      if (a === 'escape') {
        if (this.modal) this.closeModal();
        else if (this.ui.mode !== 'idle') { this.ui.mode = 'idle'; this.render(); }
        return;
      }
      if (this.screen !== 'game' || this.modal || !this.state) return;
      e.preventDefault();
      const p = R.currentPlayer(this.state);
      switch (a) {
        case 'move': return this.onAct('move-mode', null);
        case 'search': return R.canSearch(this.state, p) ? this.onAct('do-search', null) : undefined;
        case 'talk': return this.onAct('open-loc', { dataset: { id: p?.at } } as unknown as HTMLElement);
        case 'notebook': this.ui.tab = 'notebook'; return this.render();
        case 'exhibits': this.ui.tab = 'locker'; return this.render();
        case 'journal': this.ui.tab = 'journal'; return this.render();
        case 'zoom-in': return this.board?.zoomBy(1.2);
        case 'zoom-out': return this.board?.zoomBy(1 / 1.2);
        case 'find-me': if (p) this.board?.focus(p.at); return;
        case 'end-turn': return this.onAct('do-endturn', null);
        case 'help': return this.onAct('how', null);
        case 'casefile': return this.onAct('casefile', null);
        default: return undefined;
      }
    });
    window.addEventListener('resize', () => this.syncViewport());
  }

  dispatch(action: Action): void { this.transport.send(action); }

  commit(action: Action): void {
    const before = this.state;
    if (!before) return;
    const next = applyAction(before, action);
    if (next === before) return;
    // The reducer returns the same object only for an illegal action; a
    // legal one always clones. Compare the things that would have changed.
    if (next.tick === before.tick && next.cold === before.cold && next.log.length === before.log.length) return;
    this.state = next;
    this.saves.record(action);

    if (next.narration.length) {
      this.narrator.stop();
      this.narrator.sayAll(next.narration.map((n) => ({ text: n.text, tone: n.tone, parts: n.parts })));
      const big = next.narration.find((n) => n.tone === 'clue' || n.tone === 'alert');
      if (big) { flash(big.tone === 'clue' ? 'clue' : 'alert'); this.audio.sting(big.tone === 'clue' ? 'clue' : 'alert'); }
      else if (next.narration.some((n) => n.tone === 'good')) this.audio.sting('good');
      else if (next.narration.some((n) => n.tone === 'bad')) this.audio.sting('bad');
    }

    this.ui.mode = 'idle';
    if (next.conversation) {
      this.dialogue = { kind: 'suspect', id: next.conversation.suspectId, stage: 'result' };
      this.modal = 'dialogue';
    } else if (next.testimony) {
      this.dialogue = { kind: 'witness', id: next.testimony.witnessId, stage: 'result' };
      this.modal = 'dialogue';
    } else if (next.showing) {
      this.dialogue = { kind: next.showing.kind, id: next.showing.personId, stage: 'show-result' };
      this.modal = 'dialogue';
    } else if (next.talking) {
      this.dialogue = { kind: next.talking.kind, id: next.talking.personId, stage: 'talk-result' };
      this.modal = 'dialogue';
    } else if (action.type === 'SEARCH' || (action.type === 'ABILITY' && characterById(R.currentPlayer(before)?.charId ?? 'hale').ability === 'BREAKIN')) {
      // A search gets its own screen: where you looked, what turned up.
      const filed = next.exhibits.slice(before.exhibits.length);
      const picked = next.objects.slice(before.objects.length);
      this.found = { location: action.type === 'SEARCH' ? R.currentPlayer(before)?.at ?? '' : (action as { locationId?: string }).locationId ?? '', exhibits: filed.map((e) => e.key), objects: picked, by: R.currentPlayer(before)?.name ?? '' };
      this.modal = 'found';
      if (filed.length) { this.ui.tab = 'locker'; this.ui.selectedExhibit = filed[0].key; }
    }
    if (next.phase === 'over') {
      this.screen = 'end';
      this.modal = null;
      this.render();
      return;
    }

    // Hand the device over when the seat changes.
    const seat = next.players[next.turn]?.id;
    if (next.handoff && next.players.length > 1 && seat !== this.lastSeat) {
      this.lastSeat = seat;
      this.pendingHandoff = seat;
    }
    this.render();
  }

  private profile() { return this.state ? profileOf(this.state, this.ui) : {}; }

  // ------------------------------------------------------------ interaction

  onAct(act: string, el: HTMLElement | null): void {
    const s = this.state;
    const p = s ? R.currentPlayer(s) : null;
    const d = (k: string) => el?.dataset?.[k] ?? '';
    const checked = () => !!(el as HTMLInputElement | null)?.checked;
    const value = () => (el as HTMLInputElement | null)?.value ?? '';

    switch (act) {
      case 'goto-title': this.screen = 'title'; this.modal = null; this.narrator.stop(); return this.render();
      case 'goto-setup':
        this.screen = 'setup'; this.modal = null; this.narrator.stop();
        this.narrator.prefetch(); // decode the first sprites while players choose detectives
        return this.render();
      case 'how': this.modal = 'how'; return this.renderModal();
      case 'settings': this.modal = 'settings'; return this.renderModal();
      case 'close-modal': return this.closeModal();

      case 'pick-case': this.draft.caseId = d('id'); return this.render();
      case 'pick-diff': this.draft.difficulty = d('id') as S.Draft['difficulty']; return this.render();
      case 'seat-add': return this.addSeat();
      case 'seat-remove': this.draft.seats.splice(+d('i'), 1); return this.render();
      case 'seat-char': this.draft.seats[+d('i')].charId = value() as CharacterId; return this.render();
      case 'toggle-handoff': this.draft.handoff = checked(); return;
      case 'toggle-assisted-draft': this.draft.assisted = checked(); return;
      case 'toggle-journal-draft': this.draft.journal = checked(); return;
      case 'start-game': return this.startGame();
      case 'resume-game': return this.resumeGame();

      case 'enter-game': this.screen = 'game'; this.narrator.stop(); this.board?.stopCinematic(); this.board?.reset(); return this.render();
      case 'skip-cards': this.cancelType?.(); this.cancelType = null; return;
      case 'replay-brief': return this.narrateBriefing();
      case 'skip-voice': return this.narrator.stop();
      case 'handoff-ready': this.pendingHandoff = null; return this.render();

      case 'toggle-voice': this.narrator.setEnabled(checked()); return;
      case 'toggle-clips': this.narrator.setUseClips(checked()); return this.renderModal();
      case 'pick-voice':
        this.narrator.setVoice(value());
        this.renderModal();
        this.narrator.stop();
        return this.narrator.say('Ashgrave Bay, two in the morning, and it is still raining.', 'brief');
      case 'set-rate': this.narrator.setRate(value()); return;
      case 'test-voice':
        this.narrator.stop();
        return this.narrator.say('Dispatch to all cars. A woman is dead at the Gilded Hotel, and nobody heard a thing. Take it slow, detective — this one has lawyers.', 'brief');
      case 'toggle-ambience': this.audio.setEnabled(checked()); return;
      case 'set-ambience-vol': this.audio.setVolume(value()); return;
      case 'toggle-channel': this.audio.setChannel(d('ch') as Channel, { on: checked() }); return;
      case 'set-channel': this.audio.setChannel(d('ch') as Channel, { level: Number(value()) }); return;
      case 'toggle-motion': {
        try { localStorage.setItem(STORAGE.prefix + 'motion', checked() ? 'on' : 'off'); } catch { /* ignore */ }
        return window.location.reload();
      }
      case 'voice-quick': this.narrator.setEnabled(!this.narrator.enabled); return this.render();
      case 'ambience-quick': this.audio.setEnabled(!this.audio.enabled); return this.render();

      case 'move-mode':
        this.ui.mode = this.ui.mode === 'move' ? 'idle' : 'move';
        this.ui.mobile = 'map';
        return this.render();
      case 'tab': this.ui.tab = d('tab') as Tab; this.ui.selectedExhibit = null; return this.render();
      case 'mobile': {
        this.ui.mobile = d('tab') as UiState['mobile'];
        this.render();
        if (this.ui.mobile === 'map') requestAnimationFrame(() => { this.syncViewport(); this.board?.fit(p?.at ?? null); });
        return;
      }
      case 'zoom-in': return this.board?.zoomBy(1.2);
      case 'zoom-out': return this.board?.zoomBy(1 / 1.2);
      case 'zoom-reset': return this.board?.fit(p?.at ?? null);
      case 'find-me': if (p) this.board?.focus(p.at); return;
      case 'focus-loc': this.ui.mobile = 'map'; this.closeModal(); requestAnimationFrame(() => this.board?.focus(d('id'), 1.1)); return;

      case 'open-loc': this.ui.selectedLocation = d('id'); this.modal = 'location'; return this.renderModal();
      case 'open-suspect': return this.openSuspect(d('id'));
      case 'open-witness': return this.openWitness(d('id'));
      case 'witness-pick': this.dialogue = { kind: 'witness', id: d('id'), stage: 'pick-subject' }; this.modal = 'dialogue'; return this.renderModal();
      case 'pick-object': this.dialogue = { kind: d('kind') as 'suspect' | 'witness', id: d('id'), stage: 'pick-object' }; this.modal = 'dialogue'; return this.renderModal();
      case 'lean': this.dialogue = { kind: 'suspect', id: d('id'), stage: 'lean' }; this.modal = 'dialogue'; return this.renderModal();
      case 'do-talk':
        this.modal = null;
        return p ? this.dispatch({ type: 'TALK', playerId: p.id, personId: d('id'), topicId: d('topic') }) : undefined;
      case 'do-show':
        this.modal = null;
        return p ? this.dispatch({ type: 'SHOW', playerId: p.id, objectId: d('object'), personId: d('person') }) : undefined;
      case 'casefile': this.modal = 'casefile'; return this.renderModal();

      case 'do-move': this.closeModal(); return p ? this.dispatch({ type: 'MOVE', playerId: p.id, to: d('id') }) : undefined;
      case 'do-search': this.closeModal(); return p ? this.dispatch({ type: 'SEARCH', playerId: p.id }) : undefined;
      case 'do-interrogate':
        this.modal = null;
        return p ? this.dispatch({ type: 'INTERROGATE', playerId: p.id, suspectId: d('id'), approach: d('approach') as Action extends { approach: infer A } ? A : never }) : undefined;
      case 'do-ask':
        this.modal = null;
        return p ? this.dispatch({ type: 'ASK', playerId: p.id, witnessId: d('id'), question: d('q') as 'about' | 'lead', suspectId: d('suspect') || undefined }) : undefined;
      case 'do-endturn': return p ? this.dispatch({ type: 'END_TURN', playerId: p.id }) : undefined;
      case 'open-accuse': this.modal = 'accuse'; return this.renderModal();
      case 'do-accuse': this.closeModal(); return p ? this.dispatch({ type: 'ACCUSE', playerId: p.id, suspectId: d('id') }) : undefined;
      case 'open-ability': return this.openAbility();
      case 'do-ability': {
        this.closeModal();
        if (!p) return;
        const need = R.abilityTarget(p.charId);
        const a: Extract<Action, { type: 'ABILITY' }> = { type: 'ABILITY', playerId: p.id };
        if (need === 'location') a.locationId = d('id');
        else if (need !== 'none') a.suspectId = d('id');
        return this.dispatch(a);
      }

      // ---- the locker
      case 'open-exhibit':
        if (!d('key')) return;
        this.ui.tab = 'locker'; this.ui.selectedExhibit = d('key'); this.ui.mobile = 'book';
        if (this.modal && this.modal !== 'exhibit-zoom') this.modal = null;
        return this.render();
      case 'close-exhibit': this.ui.selectedExhibit = null; return this.render();
      case 'read-aloud': return this.readAloud(d('key'));
      case 'zoom-exhibit': this.modal = 'exhibit-zoom'; return this.renderModal();
      case 'reveal-reading': this.ui.revealed.add(d('key')); return this.render();
      case 'mark': this.setMark(d('trait') as TraitId, d('value') || null); return this.render();
      case 'mark-select': this.setMark(d('trait') as TraitId, value() || null); return this.render();
      case 'toggle-assisted': this.ui.assisted = checked(); this.saves.patch({ assisted: this.ui.assisted }); return this.render();

      // ---- the journal
      case 'journal-filter': this.ui.journalFilter = d('f') as UiState['journalFilter']; return this.render();
      case 'note-edit': this.ui.editing = d('entry') ? +d('entry') : 'new'; this.ui.tab = 'journal'; this.render(); this.root.querySelector<HTMLTextAreaElement>('.jr-editor textarea')?.focus(); return;
      case 'note-cancel': this.ui.editing = null; return this.render();
      case 'note-save': {
        const form = el as HTMLFormElement | null;
        const text = (form?.querySelector('textarea') as HTMLTextAreaElement | null)?.value.trim();
        if (text && s) {
          const entry = d('entry') ? +d('entry') : null;
          this.ui.notes.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, entry, hour: s.cold, text, at: Date.now() });
          this.saves.patch({ notes: this.ui.notes });
        }
        this.ui.editing = null;
        return this.render();
      }
      case 'note-delete':
        this.ui.notes = this.ui.notes.filter((n) => n.id !== d('id'));
        this.saves.patch({ notes: this.ui.notes });
        return this.render();
      case 'journal-export':
        if (s) download(`ashgrave-${s.caseId}-${s.seed.slice(0, 6)}.txt`, exportJournal(s, this.ui.notes, this.ui.marks));
        return;

      case 'again-same': return this.startGame(this.state?.caseId, this.state?.difficulty);
      case 'quit': this.screen = 'title'; this.state = null; this.saves.clear(); this.narrator.stop(); this.board?.reset(); return this.render();
      default: return undefined;
    }
  }

  /** The narrator reads a document out: the title, then the paragraphs. */
  private readAloud(key: string): void {
    const s = this.state;
    const inst = s?.exhibits.find((e) => e.key === key);
    if (!s || !inst) return;
    const def = exhibitById(inst.def, s.caseId);
    const c = caseById(s.caseId);
    const data = { victim: c.victim, scene: R.locationById(s, c.scene)?.name ?? c.scene, ...(inst.data ?? {}) };
    const { text, parts } = readAloud(def, data);
    this.narrator.stop();
    this.narrator.say(text, 'narrator', parts);
  }

  private setMark(trait: TraitId, value: string | null): void {
    this.ui.marks[trait] = value;
    this.saves.patch({ marks: this.ui.marks });
  }

  /** A tap on the map means "go there" while choosing a destination, and
   *  "tell me about this place" the rest of the time. */
  onMapLocation(id: string): void {
    const s = this.state;
    if (!s) return;
    const p = R.currentPlayer(s);
    if (this.ui.mode === 'move' && p && R.canMove(s, p, id)) {
      this.dispatch({ type: 'MOVE', playerId: p.id, to: id });
      return;
    }
    this.ui.selectedLocation = id;
    this.modal = 'location';
    this.renderModal();
  }

  openSuspect(id: string): void {
    this.ui.selectedSuspect = id;
    this.dialogue = { kind: 'suspect', id, stage: 'choose' };
    this.modal = 'dialogue';
    this.renderModal();
  }

  openWitness(id: string): void {
    this.dialogue = { kind: 'witness', id, stage: 'choose' };
    this.modal = 'dialogue';
    this.renderModal();
  }

  addSeat(): void {
    const taken = this.draft.seats.map((s) => s.charId);
    const free = CHARACTERS.find((c) => !taken.includes(c.id));
    if (!free) return;
    this.draft.seats.push({ name: '', charId: free.id });
    this.render();
  }

  startGame(caseId?: string, difficulty?: S.Draft['difficulty']): void {
    const d = this.draft;
    this.state = createGame({
      caseId: caseId || d.caseId,
      difficulty: difficulty || d.difficulty,
      handoff: d.handoff,
      players: d.seats.map((s, i) => ({ id: `p${i}`, name: s.name, charId: s.charId })),
    });
    this.ui = { ...freshUi(), assisted: d.assisted, journal: d.journal };
    this.saves.begin(this.state, { assisted: d.assisted, journal: d.journal });
    this.lastSeat = this.state.players[0].id;
    this.pendingHandoff = null;
    this.board?.reset();
    this.screen = 'briefing';
    this.modal = null;
    this.render();
    this.narrateBriefing();
  }

  resumeGame(): void {
    const restored = this.saves.restore();
    if (!restored) { this.saves.clear(); return this.render(); }
    this.state = restored.state;
    const f = restored.file;
    this.ui = { ...freshUi(), marks: f.marks, assisted: f.assisted, journal: f.journal, notes: f.notes };
    this.lastSeat = this.state.players[this.state.turn]?.id ?? null;
    this.pendingHandoff = null;
    this.board?.reset();
    this.screen = this.state.phase === 'over' ? 'end' : 'game';
    this.modal = null;
    this.render();
    this.narrator.stop();
    this.narrator.say(`Ashgrave Bay. ${caseById(this.state.caseId).title}.`, 'title');
  }

  narrateBriefing(): void {
    if (!this.state) return;
    const def = caseById(this.state.caseId);
    this.narrator.stop();
    this.narrator.say(`Ashgrave Bay. ${def.title}.`, 'title');
    this.narrator.say(def.briefing, 'brief');
    def.radio.forEach((line) => this.narrator.say(line, 'alert'));
  }

  openAbility(): void {
    const s = this.state;
    const p = s && R.currentPlayer(s);
    if (!s || !p) return;
    if (R.abilityTarget(p.charId) === 'none') { this.dispatch({ type: 'ABILITY', playerId: p.id }); return; }
    this.modal = 'ability';
    this.renderModal();
  }

  closeModal(): void { this.modal = null; this.dialogue = null; this.render(); }

  // ---------------------------------------------------------------- render

  render(): void {
    const prevScroll = this.root.querySelector('.book-body')?.scrollTop;
    this.cancelType?.(); this.cancelType = null;
    this.root.className = `screen-${this.screen}`;
    if (this.screen === 'title') this.root.innerHTML = S.titleScreen(this.saves.peek());
    else if (this.screen === 'setup') this.root.innerHTML = S.setupScreen(this.draft);
    else if (this.screen === 'briefing' && this.state) this.root.innerHTML = S.briefingScreen(this.state, caseById(this.state.caseId));
    else if (this.screen === 'end' && this.state) this.root.innerHTML = S.endScreen(this.state, caseById(this.state.caseId));
    else if (this.state) this.root.innerHTML = this.gameScreen();

    const boardOn = this.screen === 'game';
    const cine = this.screen === 'briefing';
    if (this.board) {
      if (boardOn || cine) { if (this.game.scene.isSleeping('board')) this.game.scene.wake('board'); }
      else if (!this.game.scene.isSleeping('board') && this.game.scene.isActive('board')) this.game.scene.sleep('board');
      if (boardOn) this.paintBoard();
      if (cine && this.state) {
        // The city, full screen, drifting under the briefing.
        this.board.cameras.main.setViewport(0, 0, this.game.scale.width, this.game.scale.height);
        this.paintBoard();
        this.board.cinematic(this.state);
      }
    }
    if (boardOn) {
      const body = this.root.querySelector('.book-body');
      if (body && prevScroll != null) body.scrollTop = prevScroll;
      this.paintSubtitle(this.narrator.speaking);
    }
    if (this.screen === 'briefing') this.runCards();
    if (boardOn && this.pendingHandoff && this.state) {
      const nextP = this.state.players.find((q) => q.id === this.pendingHandoff);
      if (nextP) this.root.insertAdjacentHTML('beforeend', S.handoffScreen(nextP, characterById(nextP.charId)));
    }
    this.renderModal();
  }

  /** The briefing cards, one after another, each typed. */
  private runCards(): void {
    const cards = [...this.root.querySelectorAll<HTMLElement>('.cine-card')];
    let i = 0;
    let stopped = false;
    let typing: (() => void) | null = null;
    const next = () => {
      if (stopped || this.screen !== 'briefing') return;
      const card = cards[i++];
      if (!card) return;
      card.classList.add('is-on');
      const p = card.querySelector<HTMLElement>('p:not(.cine-kicker):not(.cine-sub)');
      const isTitle = card.classList.contains('cine-card--title');
      if (p && !isTitle) {
        const text = p.textContent || '';
        typing = typewriter(p, text, { speed: 14, onDone: () => { typing = null; setTimeout(next, 700); } });
      } else {
        setTimeout(next, isTitle ? 1800 : 400);
      }
    };
    // Skipping: finish the card being typed and show the rest at once.
    this.cancelType = () => { stopped = true; typing?.(); cards.forEach((c) => c.classList.add('is-on')); };
    setTimeout(next, 400);
  }

  /** Keep the board camera inside the map panel, whatever the layout does. */
  syncViewport(): void {
    if (!this.board || this.screen !== 'game') return;
    const el = this.root.querySelector<HTMLElement>('.map-wrap');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const cam = this.board.cameras.main;
    if (cam.x !== r.left || cam.y !== r.top || cam.width !== r.width || cam.height !== r.height) {
      cam.setViewport(r.left, r.top, r.width, r.height);
    }
  }

  paintBoard(): void {
    if (!this.board || !this.state) return;
    this.syncViewport();
    const s = this.state;
    const p = R.currentPlayer(s);
    const profile = this.profile();
    const view: BoardView = {
      mode: this.ui.mode,
      selectedLocation: this.ui.selectedLocation,
      reachable: new Set(p ? R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id)).map((o) => o.id) : []),
      eliminated: new Set(s.suspects.filter((x) => R.isEliminated(s, x, profile)).map((x) => x.id)),
      currentPlayerId: p?.id ?? null,
    };
    this.board.render(s, view);
  }

  paintSubtitle(active: boolean): void {
    const bar = this.root.querySelector('.narr');
    if (!bar) return;
    bar.classList.toggle('is-live', !!active);
    const text = bar.querySelector('.narr-text');
    if (text && text.textContent !== this.subtitle) text.textContent = this.subtitle;
  }

  renderModal(): void {
    let host = this.root.querySelector<HTMLElement>('.modal-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'modal-host';
      this.root.appendChild(host);
    }
    this.cancelType?.(); this.cancelType = null;
    if (!this.modal) { host.innerHTML = ''; return; }
    const wide = this.modal === 'dialogue' || this.modal === 'exhibit-zoom' || this.modal === 'casefile' || this.modal === 'found';
    host.innerHTML = `<div class="modal-back" data-act="close-modal"></div>
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">${this.modalBody()}</div>`;
    const target = host.querySelector<HTMLElement>('[data-type-target]');
    if (target) {
      this.cancelType = typewriter(target, target.textContent || '', { speed: 14 });
      target.addEventListener('click', () => { this.cancelType?.(); this.cancelType = null; }, { once: true });
    }
  }

  modalBody(): string {
    const s = this.state;
    switch (this.modal) {
      case 'how': return S.howToPlay();
      case 'settings': return S.settingsSheet(this.narrator, this.audio);
      case 'casefile': return s ? S.caseFile(s, caseById(s.caseId)) : '';
      case 'found': return s && this.found ? foundSheet(s, this.found) : '';
      case 'location': return s && this.ui.selectedLocation ? locationPanel(s, this.ui.selectedLocation, this.profile()) : '';
      case 'dialogue': return s && this.dialogue ? renderDialogue(s, this.dialogue) : '';
      case 'accuse': return s ? accusePanel(s, this.profile()) : '';
      case 'ability': return s ? abilityPanel(s, this.profile()) : '';
      case 'exhibit-zoom': {
        if (!s) return '';
        const idx = s.exhibits.findIndex((e) => e.key === this.ui.selectedExhibit);
        const inst = s.exhibits[idx];
        if (!inst) return '';
        return `<div class="sheet sheet--paper"><button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
          <div class="paper-zoom">${documentHtml(inst, exhibitById(inst.def, s.caseId), s, letterOf(idx))}</div></div>`;
      }
      default: return '';
    }
  }

  // ------------------------------------------------------------ game screen

  gameScreen(): string {
    const s = this.state as GameState;
    const def = caseById(s.caseId);
    const p = R.currentPlayer(s) as GameState['players'][number];
    const ch = characterById(p.charId);
    const hoursLeft = Math.max(0, s.coldMax - s.cold);
    const warmth = Math.max(0, Math.min(1, hoursLeft / s.coldMax));
    const day = Math.floor((2 + s.cold) / 24) + 1;
    const tabs: [Tab, string][] = [['notebook', 'Notebook'], ['locker', `Locker${s.exhibits.length ? ` (${s.exhibits.length})` : ''}`], ['suspects', 'Suspects']];
    if (this.ui.journal) tabs.push(['journal', 'Journal']);
    tabs.push(['log', 'Log']);

    return `
    <div class="game ${this.ui.mobile === 'map' ? 'm-map' : this.ui.mobile === 'book' ? 'm-book' : 'm-crew'}">
      <header class="topbar">
        <div class="topbar-l">
          <span class="tb-case">${esc(def.title)}</span>
          <span class="tb-sub">${esc(def.subtitle)} · Day ${day}, ${R.clockAt(s.cold)}</span>
        </div>
        <div class="trail ${warmth < 0.26 ? 'is-critical' : warmth < 0.5 ? 'is-warning' : ''}">
          <div class="trail-meta">
            <span>${icon('clock')} ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'} left</span>
            <span>Round ${s.round}</span>
          </div>
          <div class="trail-bar"><i style="width:${warmth * 100}%"></i></div>
        </div>
        <div class="topbar-r">
          <button class="btn btn--small btn--ghost tb-casefile" data-act="casefile" title="The case file, any time">${icon('note')} Case file</button>
          <button class="icon-btn ${this.narrator.enabled ? 'is-on' : ''}" data-act="voice-quick" title="${this.narrator.enabled ? 'Narration on' : 'Narration off'}">${icon(this.narrator.enabled ? 'speaker' : 'mute')}</button>
          <button class="icon-btn ${this.audio.enabled ? 'is-on' : ''}" data-act="ambience-quick" title="${this.audio.enabled ? 'Room on' : 'Room off'}">${icon('rain')}</button>
          <button class="icon-btn" data-act="settings" title="Sound settings">${icon('badge')}</button>
          <button class="icon-btn" data-act="how" title="How to play">?</button>
        </div>
      </header>

      <aside class="crew">
        ${this.turnCard(s, p, ch)}
        <div class="roster">
          <h4 class="panel-h">The squad</h4>
          <ul>${s.players.map((q, i) => {
            const c = characterById(q.charId);
            return `<li class="roster-i ${i === s.turn ? 'is-turn' : ''}" style="--seat:${c.color}">
              <span class="roster-face">${portraitSvg(c.id, { size: 32, frame: 'face', reveal: true, accent: c.color })}</span>
              <span class="roster-n"><b>${esc(q.name)}</b><i>${esc(c.short)} · ${esc(R.locationById(s, q.at)?.name ?? '')}</i></span>
              <span class="roster-ap">${'●'.repeat(q.ap)}${'○'.repeat(Math.max(0, q.apMax - q.ap))}</span>
            </li>`;
          }).join('')}</ul>
        </div>
      </aside>

      <main class="board">
        <div class="map-wrap ${this.ui.mode === 'move' ? 'is-choosing' : ''}">
          <div class="map-tools">
            <button class="icon-btn" data-act="zoom-in" aria-label="Zoom in">+</button>
            <button class="icon-btn" data-act="zoom-out" aria-label="Zoom out">−</button>
            <button class="icon-btn" data-act="find-me" aria-label="Centre on my detective">${icon('pin')}</button>
            <button class="icon-btn" data-act="zoom-reset" aria-label="Reset the view">□</button>
          </div>
          ${this.ui.mode === 'move' ? '<div class="map-hint">Tap a lit street to go there · Esc to cancel</div>' : ''}
          <div class="narr"><span class="narr-ico">${icon('speaker')}</span><p class="narr-text">${esc(this.subtitle)}</p></div>
        </div>
      </main>

      <aside class="book">
        <nav class="tabs">
          ${tabs.map(([k, label]) => `<button class="tab ${this.ui.tab === k ? 'is-on' : ''}" data-act="tab" data-tab="${k}">${label}</button>`).join('')}
        </nav>
        <div class="book-body">${this.tabBody(s)}</div>
      </aside>

      <nav class="mobilebar">
        ${[['crew', 'Turn'], ['map', 'Map'], ['book', 'Files']].map(([k, label]) =>
          `<button class="mtab ${this.ui.mobile === k ? 'is-on' : ''}" data-act="mobile" data-tab="${k}">${label}</button>`).join('')}
      </nav>
    </div>`;
  }

  turnCard(s: GameState, p: GameState['players'][number], ch: ReturnType<typeof characterById>): string {
    const canSearch = R.canSearch(s, p);
    const here = R.suspectsAt(s, p.at);
    const w = R.witnessAt(s, p.at);
    const abilityBlock = R.abilityBlocker(s, p);
    const moves = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
    const cost = R.moveCost(s, p);
    const loc = R.locationById(s, p.at);
    const askable = !!w && R.canAsk(s, p, w);

    return `
    <div class="turncard" style="--seat:${ch.color}">
      <div class="turncard-top">
        <span class="turncard-face">${portraitSvg(ch.id, { size: 60, reveal: true, accent: ch.color })}</span>
        <div>
          <p class="turncard-kick">Now working</p>
          <h3>${esc(p.name)}</h3>
          <p class="turncard-role">${esc(ch.name)}</p>
        </div>
      </div>
      <p class="turncard-where">${loc ? locIcon(loc.type) : ''} ${esc(loc?.name ?? '')}</p>
      <div class="ap">
        <span class="ap-label">Hours this turn</span>
        <span class="ap-pips">${'<i class="ap-on"></i>'.repeat(p.ap)}${'<i class="ap-off"></i>'.repeat(Math.max(0, p.apMax - p.ap))}</span>
      </div>
      <div class="acts">
        <button class="act ${canSearch ? '' : 'is-off'}" data-act="do-search" ${canSearch ? '' : 'disabled'}>
          ${icon('lead')}<b>Search here</b>
          <i>${s.sealed[p.at] ? 'Sealed off' : R.looksExhausted(s, p.at) ? 'Picked clean already' : s.leads[p.at] ? 'A witness pointed here' : '1 hour · turn the place over'}</i>
        </button>
        <button class="act ${this.ui.mode === 'move' ? 'is-armed' : ''} ${moves.length ? '' : 'is-off'}" data-act="move-mode" ${moves.length ? '' : 'disabled'}>
          ${icon('pin')}<b>${this.ui.mode === 'move' ? 'Choosing…' : 'Move'}</b>
          <i>${this.ui.mode === 'move' ? 'Tap a lit street' : cost === 0 ? 'Free — Ruby’s shortcut' : `${cost} ${cost === 1 ? 'hour' : 'hours'} · pick a street`}</i>
        </button>
        <button class="act ${here.length ? '' : 'is-off'}" data-act="open-loc" data-id="${p.at}" ${here.length ? '' : 'disabled'}>
          ${icon('eye')}<b>Suspects</b>
          <i>${here.length ? `${here.length} here` : 'None here'}</i>
        </button>
        <button class="act ${w ? '' : 'is-off'}" data-act="open-witness" data-id="${w?.def.id ?? ''}" ${w ? '' : 'disabled'}>
          ${icon('book')}<b>Ask around</b>
          <i>${w ? (askable ? `${esc(w.def.name)}, ${esc(w.def.role.split(',')[0])}` : w.state.patience <= 0 ? `${esc(w.def.name)} has said enough` : esc(w.def.name)) : 'Nobody to ask here'}</i>
        </button>
        <button class="act act--special ${abilityBlock ? 'is-off' : ''}" data-act="open-ability" ${abilityBlock ? 'disabled' : ''}>
          ${icon('badge')}<b>${esc(ch.abilityName)}</b>
          <i>${abilityBlock || '1 hour · once per case'}</i>
        </button>
      </div>
      <div class="acts-end">
        <button class="btn btn--danger ${R.canAccuse(s, p) ? '' : 'is-off'}" data-act="open-accuse" ${R.canAccuse(s, p) ? '' : 'disabled'}>
          Make an accusation <small>2 hrs</small>
        </button>
        <button class="btn btn--ghost btn--small" data-act="do-endturn">End turn${p.ap > 0 ? ` (forfeits ${p.ap})` : ''}</button>
      </div>
    </div>`;
  }

  tabBody(s: GameState): string {
    const profile = this.profile();
    switch (this.ui.tab) {
      case 'notebook': return renderNotebook(s, { selectedSuspect: this.ui.selectedSuspect, marks: this.ui.marks, assisted: this.ui.assisted });
      case 'locker': {
        const v = { selectedExhibit: this.ui.selectedExhibit, marks: this.ui.marks, assisted: this.ui.assisted, revealed: this.ui.revealed };
        return this.ui.selectedExhibit ? exhibitView(s, v) : lockerList(s, v);
      }
      case 'journal': return renderJournal(s, { notes: this.ui.notes, editing: this.ui.editing, filter: this.ui.journalFilter, marks: this.ui.marks });
      case 'suspects':
        return `<ul class="dossiers">${s.suspects.map((x) => {
          const out = R.isEliminated(s, x, profile);
          return `<li class="dossier-card ${out ? 'is-out' : ''}" data-act="open-suspect" data-id="${x.id}">
            <span class="dc-face">${portraitSvg(x.id, { size: 56, known: x.known, traits: x.traits, muted: out })}</span>
            <div class="dc-main">
              <b>${esc(x.name)}</b><i>${esc(x.role)}</i>
              <p>${esc(x.blurb)}</p>
              <span class="dc-at">${x.dead ? 'In the morgue' : `Last seen: ${esc(R.locationById(s, x.at)?.name ?? '')}`}</span>
            </div>
            <span class="dc-flag">${x.dead ? 'DEAD' : x.cleared ? 'CLEARED' : out ? 'RULED OUT' : 'IN FRAME'}</span>
          </li>`;
        }).join('')}</ul>`;
      default:
        return `<ul class="log-list">${s.log.map((l) =>
          `<li class="log-i log--${l.kind}"><span class="log-r">${l.round}</span><p>${esc(l.text)}</p></li>`).join('')}</ul>`;
    }
  }
}
