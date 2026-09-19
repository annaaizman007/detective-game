// The controller. Owns the current state, the transport and the narrator, and
// re-renders whatever screen is current. All interaction is delegated from one
// click handler on the root, keyed off data-act attributes.

import { createGame, applyAction } from '../state.js';
import * as R from '../rules.js';
import { CASES, caseById } from '../cases/index.js';
import { CHARACTERS, characterById } from '../characters.js';
import { TRAITS, traitLabel } from '../traits.js';
import { Narrator } from '../voice.js';
import { Ambience } from '../audio.js';
import { LocalTransport } from '../net/transport.js';
import { CityMap } from './map.js';
import { renderNotebook } from './notebook.js';
import { icon, portrait, locIcon } from './icons.js';
import * as S from './screens.js';
import { startRain, typewriter, flash } from './fx.js';

export class App {
  constructor(root) {
    this.root = root;
    this.narrator = new Narrator();
    this.ambience = new Ambience();
    this.transport = new LocalTransport();
    this.state = null;
    this.map = null;
    this.screen = 'title';
    this.modal = null;
    this.subtitle = '';
    this.pendingHandoff = null;
    this.lastSeat = null;
    this.ui = { mode: 'idle', selectedLocation: null, selectedSuspect: null, tab: 'notebook', mobile: 'map' };
    this.cam = { x: 0, y: 0, k: 1 };
    this.draft = {
      caseId: CASES[0].id,
      difficulty: 'detective',
      handoff: true,
      seats: [{ name: '', charId: 'hale' }],
    };

    this.narrator.subscribe((ev) => {
      if (ev.type === 'line') { this.subtitle = ev.text; this.paintSubtitle(true); }
      // The radio opens when the narrator starts and closes when they stop,
      // so the voice always arrives inside a room rather than in a vacuum.
      if (ev.type === 'speaking') this.ambience.openChannel();
      if (ev.type === 'idle') { this.paintSubtitle(false); this.ambience.closeChannel(); }
      if (ev.type === 'voices' && this.modal === 'settings') this.renderModal();
    });

    this.transport.onAction((action) => this.commit(action));
    const canvas = document.getElementById('rain');
    if (canvas) this._rain = startRain(canvas);
    this.bind();
    this.render();
  }

  // -------------------------------------------------------------- plumbing

  bind() {
    this.root.addEventListener('click', (e) => {
      this.ambience.start(); // audio contexts only start from a gesture
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act;
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
      e.preventDefault();
      this.onAct(act, el);
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target.closest('[data-act]');
      if (el) this.onAct(el.dataset.act, el);
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target.closest('[data-act="seat-name"]');
      if (el) this.draft.seats[+el.dataset.i].name = el.value;
    });
    this.root.addEventListener('keydown', (e) => {
      const node = e.target.closest?.('[data-node]');
      if (node && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.onMapLocation(node.dataset.node);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.modal) this.closeModal();
        else if (this.ui.mode !== 'idle') { this.ui.mode = 'idle'; this.render(); }
      }
    });
  }

  dispatch(action) { this.transport.send(action); }

  commit(action) {
    const before = this.state;
    const next = applyAction(before, action);
    if (next === before) return;
    this.state = next;

    if (next.narration.length) {
      this.narrator.stop();
      this.narrator.sayAll(next.narration.map((n) => ({ text: n.text, tone: n.tone })));
      const big = next.narration.find((n) => n.tone === 'clue' || n.tone === 'alert');
      if (big) flash(big.tone === 'clue' ? 'clue' : 'alert');
    }

    this.ui.mode = 'idle';
    if (next.phase === 'over') {
      this.screen = 'end';
      this.render();
      return;
    }

    // Hand the device over when the seat changes.
    const seat = next.players[next.turn]?.id;
    if (this.state.handoff && next.players.length > 1 && seat !== this.lastSeat) {
      this.lastSeat = seat;
      this.pendingHandoff = seat;
    }
    this.render();
  }

  // ------------------------------------------------------------ interaction

  onAct(act, el) {
    const s = this.state;
    const p = s ? R.currentPlayer(s) : null;

    switch (act) {
      case 'goto-title': this.screen = 'title'; this.modal = null; this.narrator.stop(); return this.render();
      case 'goto-setup': this.screen = 'setup'; this.modal = null; this.narrator.stop(); return this.render();
      case 'how': this.modal = 'how'; return this.renderModal();
      case 'settings': this.modal = 'settings'; return this.renderModal();
      case 'close-modal': return this.closeModal();

      case 'pick-case': this.draft.caseId = el.dataset.id; return this.render();
      case 'pick-diff': this.draft.difficulty = el.dataset.id; return this.render();
      case 'seat-add': return this.addSeat();
      case 'seat-remove': this.draft.seats.splice(+el.dataset.i, 1); return this.render();
      case 'seat-char': this.draft.seats[+el.dataset.i].charId = el.value; return this.render();
      case 'toggle-handoff': this.draft.handoff = el.checked; return;
      case 'start-game': return this.startGame();

      case 'enter-game': this.screen = 'game'; this.narrator.stop(); return this.render();
      case 'replay-brief': return this.narrateBriefing();
      case 'skip-voice': return this.narrator.stop();

      case 'handoff-ready': this.pendingHandoff = null; return this.render();

      case 'toggle-voice': this.narrator.setEnabled(el.checked); return;
      case 'pick-voice':
        this.narrator.setVoice(el.value);
        this.renderModal();
        this.narrator.stop();
        return this.narrator.say('Ashgrave Bay, two in the morning, and it is still raining.', 'brief');
      case 'set-rate':
        this.narrator.setRate(el.value);
        return;
      case 'test-voice':
        this.narrator.stop();
        return this.narrator.say(
          'Dispatch to all cars. A woman is dead at the Gilded Hotel, and nobody heard a thing. Take it slow, detective \u2014 this one has lawyers.',
          'brief',
        );
      case 'toggle-ambience': this.ambience.setEnabled(el.checked); return;
      case 'toggle-motion': {
        try { localStorage.setItem('ashgrave.motion', el.checked ? 'on' : 'off'); } catch { /* ignore */ }
        return window.location.reload();
      }
      case 'voice-quick': this.narrator.setEnabled(!this.narrator.enabled); return this.render();

      case 'move-mode':
        this.ui.mode = this.ui.mode === 'move' ? 'idle' : 'move';
        this.ui.mobile = 'map';
        return this.render();

      case 'tab': this.ui.tab = el.dataset.tab; return this.render();
      case 'mobile': {
        this.ui.mobile = el.dataset.tab;
        this.render();
        // The map panel had zero size while hidden, so re-frame it now.
        if (el.dataset.tab === 'map') requestAnimationFrame(() => this.map?.fitToContent(p?.at));
        return undefined;
      }
      case 'zoom-in': return this.map?.zoomBy(1.2);
      case 'zoom-out': return this.map?.zoomBy(1 / 1.2);
      case 'zoom-reset': return this.map?.fitToContent(p?.at);
      case 'find-me': return this.map?.focus(p.at);

      case 'open-loc': this.ui.selectedLocation = el.dataset.id; this.modal = 'location'; return this.renderModal();
      case 'open-suspect': this.ui.selectedSuspect = el.dataset.id; this.modal = 'suspect'; return this.renderModal();

      case 'do-move': this.closeModal(); return this.dispatch({ type: 'MOVE', playerId: p.id, to: el.dataset.id });
      case 'do-search': this.closeModal(); return this.dispatch({ type: 'SEARCH', playerId: p.id });
      case 'do-interrogate': this.closeModal(); return this.dispatch({ type: 'INTERROGATE', playerId: p.id, suspectId: el.dataset.id });
      case 'do-endturn': return this.dispatch({ type: 'END_TURN', playerId: p.id });

      case 'open-accuse': this.modal = 'accuse'; return this.renderModal();
      case 'do-accuse': this.closeModal(); return this.dispatch({ type: 'ACCUSE', playerId: p.id, suspectId: el.dataset.id });

      case 'open-ability': return this.openAbility();
      case 'do-ability': {
        this.closeModal();
        const need = R.abilityTarget(p.charId);
        const a = { type: 'ABILITY', playerId: p.id };
        if (need === 'location') a.locationId = el.dataset.id;
        else if (need !== 'none') a.suspectId = el.dataset.id;
        return this.dispatch(a);
      }

      case 'again-same': return this.startGame(this.state.caseId, this.state.difficulty);
      case 'quit': this.screen = 'title'; this.state = null; this.narrator.stop(); return this.render();
      default: return undefined;
    }
  }

  /** A tap on the map means "go there" while choosing a destination, and
   *  "tell me about this place" the rest of the time. */
  onMapLocation(id) {
    const s = this.state;
    const p = R.currentPlayer(s);
    if (this.ui.mode === 'move' && R.canMove(s, p, id)) {
      return this.dispatch({ type: 'MOVE', playerId: p.id, to: id });
    }
    this.ui.selectedLocation = id;
    this.modal = 'location';
    return this.renderModal();
  }

  addSeat() {
    const taken = this.draft.seats.map((s) => s.charId);
    const free = CHARACTERS.find((c) => !taken.includes(c.id));
    if (!free) return;
    this.draft.seats.push({ name: '', charId: free.id });
    this.render();
  }

  startGame(caseId, difficulty) {
    const d = this.draft;
    this.state = createGame({
      caseId: caseId || d.caseId,
      difficulty: difficulty || d.difficulty,
      handoff: d.handoff,
      players: d.seats.map((s, i) => ({ id: `p${i}`, name: s.name, charId: s.charId })),
    });
    this.lastSeat = this.state.players[0].id;
    this.pendingHandoff = null;
    this.ui = { mode: 'idle', selectedLocation: null, selectedSuspect: null, tab: 'notebook', mobile: 'map' };
    this.cam = { x: 0, y: 0, k: 1 };
    this.camFitted = false;
    this.screen = 'briefing';
    this.modal = null;
    this.render();
    this.narrateBriefing();
  }

  narrateBriefing() {
    const def = caseById(this.state.caseId);
    this.narrator.stop();
    this.narrator.say(`Ashgrave Bay. ${def.title}.`, 'title');
    this.narrator.say(def.briefing, 'brief');
    def.radio.forEach((line) => this.narrator.say(line, 'alert'));
  }

  openAbility() {
    const s = this.state;
    const p = R.currentPlayer(s);
    const need = R.abilityTarget(p.charId);
    if (need === 'none') return this.dispatch({ type: 'ABILITY', playerId: p.id });
    this.modal = 'ability';
    return this.renderModal();
  }

  closeModal() { this.modal = null; this.render(); }

  // ---------------------------------------------------------------- render

  render() {
    const prevScroll = this.root.querySelector('.log-list')?.scrollTop;
    if (this.screen === 'title') this.root.innerHTML = S.titleScreen();
    else if (this.screen === 'setup') this.root.innerHTML = S.setupScreen(this.draft);
    else if (this.screen === 'briefing') this.root.innerHTML = S.briefingScreen(this.state, caseById(this.state.caseId));
    else if (this.screen === 'end') this.root.innerHTML = S.endScreen(this.state, caseById(this.state.caseId));
    else this.root.innerHTML = this.gameScreen();

    if (this.screen === 'game') {
      const svg = this.root.querySelector('#city');
      this.map = new CityMap(svg, {
        onLocation: (id) => this.onMapLocation(id),
        onSuspect: (id) => { this.ui.selectedSuspect = id; this.modal = 'suspect'; this.renderModal(); },
      }, this.cam);
      this.map.render(this.state, this.ui);
      // First look at a board: frame the whole city.
      if (!this.camFitted) {
        this.camFitted = true;
        const me = R.currentPlayer(this.state)?.at;
        requestAnimationFrame(() => this.map?.fitToContent(me));
      }
      const log = this.root.querySelector('.log-list');
      if (log && prevScroll != null) log.scrollTop = prevScroll;
      this.paintSubtitle(this.narrator.speaking);
    }

    if (this.screen === 'briefing') {
      const target = this.root.querySelector('[data-type-target]');
      if (target) typewriter(target, target.textContent, { speed: 12 });
    }

    if (this.screen === 'game' && this.pendingHandoff) {
      const nextP = this.state.players.find((q) => q.id === this.pendingHandoff);
      if (nextP) {
        this.root.insertAdjacentHTML('beforeend', S.handoffScreen(nextP, characterById(nextP.charId)));
      }
    }

    this.renderModal();
  }

  paintSubtitle(active) {
    const bar = this.root.querySelector('.narr');
    if (!bar) return;
    bar.classList.toggle('is-live', !!active);
    const text = bar.querySelector('.narr-text');
    if (text && text.textContent !== this.subtitle) text.textContent = this.subtitle;
  }

  renderModal() {
    let host = this.root.querySelector('.modal-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'modal-host';
      this.root.appendChild(host);
    }
    if (!this.modal) { host.innerHTML = ''; return; }
    host.innerHTML = `<div class="modal-back" data-act="close-modal"></div>
      <div class="modal" role="dialog" aria-modal="true">${this.modalBody()}</div>`;
  }

  modalBody() {
    switch (this.modal) {
      case 'how': return S.howToPlay();
      case 'settings': return S.settingsSheet(this.narrator, this.ambience);
      case 'location': return this.locationPanel();
      case 'suspect': return this.suspectPanel();
      case 'accuse': return this.accusePanel();
      case 'ability': return this.abilityPanel();
      default: return '';
    }
  }

  // ------------------------------------------------------------ game screen

  gameScreen() {
    const s = this.state;
    const def = caseById(s.caseId);
    const p = R.currentPlayer(s);
    const ch = characterById(p.charId);
    const hoursLeft = Math.max(0, s.coldMax - s.cold);
    const warmth = Math.max(0, Math.min(1, hoursLeft / s.coldMax));

    return `
    <div class="game ${this.ui.mobile === 'map' ? 'm-map' : this.ui.mobile === 'book' ? 'm-book' : 'm-crew'}">
      <canvas id="rain" class="rain"></canvas>

      <header class="topbar">
        <div class="topbar-l">
          <span class="tb-case">${def.title}</span>
          <span class="tb-sub">${def.subtitle}</span>
        </div>
        <div class="trail ${warmth < 0.26 ? 'is-critical' : warmth < 0.5 ? 'is-warning' : ''}">
          <div class="trail-meta">
            <span>${icon('clock')} ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'} left</span>
            <span>Round ${s.round}</span>
          </div>
          <div class="trail-bar"><i style="width:${warmth * 100}%"></i></div>
        </div>
        <div class="topbar-r">
          <button class="icon-btn ${this.narrator.enabled ? 'is-on' : ''}" data-act="voice-quick"
                  title="${this.narrator.enabled ? 'Narration on' : 'Narration off'}">
            ${icon(this.narrator.enabled ? 'speaker' : 'mute')}
          </button>
          <button class="icon-btn" data-act="settings" title="Narration settings">${icon('badge')}</button>
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
              <span class="roster-face">${portrait(c.id, c.color, 30)}</span>
              <span class="roster-n"><b>${q.name}</b><i>${c.short} · ${R.locationById(s, q.at).name}</i></span>
              <span class="roster-ap">${'●'.repeat(q.ap)}${'○'.repeat(Math.max(0, q.apMax - q.ap))}</span>
            </li>`;
          }).join('')}</ul>
        </div>
      </aside>

      <main class="board">
        <div class="map-wrap ${this.ui.mode === 'move' ? 'is-choosing' : ''}">
          <svg id="city" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="City map"></svg>
          <div class="map-tools">
            <button class="icon-btn" data-act="zoom-in" aria-label="Zoom in">+</button>
            <button class="icon-btn" data-act="zoom-out" aria-label="Zoom out">−</button>
            <button class="icon-btn" data-act="find-me" aria-label="Centre on my detective">${icon('pin')}</button>
            <button class="icon-btn" data-act="zoom-reset" aria-label="Reset the view">□</button>
          </div>
          <div class="narr"><span class="narr-ico">${icon('speaker')}</span><p class="narr-text">${this.subtitle}</p></div>
        </div>
      </main>

      <aside class="book">
        <nav class="tabs">
          ${[['notebook', 'Notebook'], ['suspects', 'Suspects'], ['log', 'Case log']].map(([k, label]) =>
            `<button class="tab ${this.ui.tab === k ? 'is-on' : ''}" data-act="tab" data-tab="${k}">${label}</button>`).join('')}
        </nav>
        <div class="book-body">${this.tabBody(s)}</div>
      </aside>

      <nav class="mobilebar">
        ${[['crew', 'Turn'], ['map', 'Map'], ['book', 'Notebook']].map(([k, label]) =>
          `<button class="mtab ${this.ui.mobile === k ? 'is-on' : ''}" data-act="mobile" data-tab="${k}">${label}</button>`).join('')}
      </nav>
    </div>`;
  }

  turnCard(s, p, ch) {
    const canSearch = R.canSearch(s, p);
    const here = R.suspectsAt(s, p.at);
    const abilityBlock = R.abilityBlocker(s, p);
    const moves = R.moveOptions(s, p).filter((o) => R.canMove(s, p, o.id));
    const cost = R.moveCost(s, p);

    return `
    <div class="turncard" style="--seat:${ch.color}">
      <div class="turncard-top">
        <span class="turncard-face">${portrait(ch.id, ch.color, 54)}</span>
        <div>
          <p class="turncard-kick">Now working</p>
          <h3>${p.name}</h3>
          <p class="turncard-role">${ch.name}</p>
        </div>
      </div>
      <p class="turncard-where">${locIcon(R.locationById(s, p.at).type)} ${R.locationById(s, p.at).name}</p>
      <div class="ap">
        <span class="ap-label">Hours this turn</span>
        <span class="ap-pips">${'<i class="ap-on"></i>'.repeat(p.ap)}${'<i class="ap-off"></i>'.repeat(Math.max(0, p.apMax - p.ap))}</span>
      </div>
      <div class="acts">
        <button class="act ${canSearch ? '' : 'is-off'}" data-act="do-search" ${canSearch ? '' : 'disabled'}>
          ${icon('lead')}<b>Search here</b>
          <i>${s.sealed[p.at] ? 'Sealed off' : R.looksExhausted(s, p.at) ? 'Picked clean already' : '1 hour · turn the place over'}</i>
        </button>
        <button class="act ${this.ui.mode === 'move' ? 'is-armed' : ''} ${moves.length ? '' : 'is-off'}" data-act="move-mode" ${moves.length ? '' : 'disabled'}>
          ${icon('pin')}<b>${this.ui.mode === 'move' ? 'Choosing…' : 'Move'}</b>
          <i>${this.ui.mode === 'move' ? 'Tap a lit street' : cost === 0 ? 'Free — Ruby’s shortcut' : `${cost} ${cost === 1 ? 'hour' : 'hours'} · pick a street`}</i>
        </button>
        <button class="act ${here.length ? '' : 'is-off'}" data-act="open-loc" data-id="${p.at}" ${here.length ? '' : 'disabled'}>
          ${icon('eye')}<b>Question</b>
          <i>${here.length ? `${here.length} here` : 'Nobody here'}</i>
        </button>
        <button class="act act--special ${abilityBlock ? 'is-off' : ''}" data-act="open-ability" ${abilityBlock ? 'disabled' : ''}>
          ${icon('badge')}<b>${ch.abilityName}</b>
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

  tabBody(s) {
    if (this.ui.tab === 'notebook') return renderNotebook(s, this.ui);
    if (this.ui.tab === 'suspects') {
      return `<ul class="dossiers">${s.suspects.map((x) => {
        const out = R.isEliminated(s, x);
        return `<li class="dossier-card ${out ? 'is-out' : ''}" data-act="open-suspect" data-id="${x.id}">
          <span class="dc-face">${portrait(x.id, out ? '#5b6472' : '#c8963e', 44)}</span>
          <div class="dc-main">
            <b>${x.name}</b><i>${x.role}</i>
            <p>${x.blurb}</p>
            <span class="dc-at">${x.dead ? 'In the morgue' : `Last seen: ${R.locationById(s, x.at).name}`}</span>
          </div>
          <span class="dc-flag">${x.dead ? 'DEAD' : x.cleared ? 'CLEARED' : out ? 'RULED OUT' : 'IN FRAME'}</span>
        </li>`;
      }).join('')}</ul>`;
    }
    return `<ul class="log-list">${s.log.map((l) =>
      `<li class="log-i log--${l.kind}"><span class="log-r">${l.round}</span><p>${l.text}</p></li>`).join('')}</ul>`;
  }

  // ---------------------------------------------------------------- panels

  locationPanel() {
    const s = this.state;
    const p = R.currentPlayer(s);
    const l = R.locationById(s, this.ui.selectedLocation);
    if (!l) return '';
    const here = p.at === l.id;
    const canGo = R.canMove(s, p, l.id);
    const cost = R.moveCost(s, p);
    const people = R.suspectsAt(s, l.id);
    const rec = R.searchRecord(s, l.id);

    return `
    <div class="sheet sheet--loc">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <span class="sheet-ico">${locIcon(l.type)}</span>
      <h3>${l.name}</h3>
      <p class="sheet-lead">${l.desc}</p>
      <p class="sheet-tags">
        ${s.sealed[l.id] ? '<span class="tag tag--bad">Sealed off</span>' : ''}
        ${rec.empty ? '<span class="tag">Picked clean</span>' : rec.times ? `<span class="tag">Searched ${rec.times}×</span>` : '<span class="tag tag--new">Never searched</span>'}
        ${here ? '<span class="tag tag--you">You are here</span>' : ''}
      </p>

      <div class="sheet-actions">
        ${here
          ? `<button class="btn ${R.canSearch(s, p) ? 'btn--hero' : 'is-off'}" data-act="do-search" ${R.canSearch(s, p) ? '' : 'disabled'}>
              ${R.looksExhausted(s, l.id) ? 'Nothing left here' : 'Search this place'} <small>1 hr</small></button>`
          : `<button class="btn ${canGo ? 'btn--hero' : 'is-off'}" data-act="do-move" data-id="${l.id}" ${canGo ? '' : 'disabled'}>
              ${canGo ? `Move here <small>${cost === 0 ? 'free' : `${cost} hr`}</small>` : s.sealed[l.id] ? 'Sealed off' : 'Too far this turn'}</button>`}
      </div>

      <h4 class="sheet-h">Who is here</h4>
      ${people.length ? `<ul class="minilist">${people.map((x) => {
        const can = R.canInterrogate(s, p, x);
        const out = R.isEliminated(s, x);
        return `<li class="${out ? 'is-out' : ''}">
          <span class="ml-face">${portrait(x.id, out ? '#5b6472' : '#c8963e', 34)}</span>
          <span class="ml-n"><b>${x.name}</b><i>${x.role}</i></span>
          <button class="btn btn--small ${can ? '' : 'is-off'}" data-act="do-interrogate" data-id="${x.id}" ${can ? '' : 'disabled'}>
            ${!here ? 'Not with you' : x.clammed ? 'Clammed up' : can ? 'Question · 1 hr' : 'No'}
          </button>
        </li>`;
      }).join('')}</ul>` : '<p class="sheet-note">Nobody worth talking to.</p>'}
    </div>`;
  }

  suspectPanel() {
    const s = this.state;
    const p = R.currentPlayer(s);
    const x = R.suspectsAt(s, this.ui.selectedLocation).find((y) => y.id === this.ui.selectedSuspect)
      || s.suspects.find((y) => y.id === this.ui.selectedSuspect);
    if (!x) return '';
    const out = R.isEliminated(s, x);
    const bad = R.contradictions(s, x);
    const can = R.canInterrogate(s, p, x);

    const rows = s.chosenTraits.map((t) => {
      const mine = x.known[t] ? x.traits[t] : null;
      const fact = s.knownCulprit[t];
      const cls = !mine ? 'is-blank' : fact && mine !== fact ? 'is-clash' : fact ? 'is-fit' : 'is-noted';
      return `<li class="${cls}">
        <span>${icon(TRAITS[t].icon)} ${TRAITS[t].label}</span>
        <b>${mine ? traitLabel(t, mine) : 'Unknown'}</b>
        <em>${fact ? `killer: ${traitLabel(t, fact)}` : 'killer: ?'}</em>
      </li>`;
    }).join('');

    return `
    <div class="sheet sheet--suspect ${out ? 'is-out' : ''}">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <div class="sus-head">
        <span class="sus-face">${portrait(x.id, out ? '#5b6472' : '#c8963e', 76)}</span>
        <div>
          <h3>${x.name}</h3>
          <p class="sus-role">${x.role}</p>
          <p class="sus-flag">${x.dead ? 'Found dead' : x.cleared ? 'Cleared' : bad.length ? `Ruled out — ${bad.map((t) => TRAITS[t].label.toLowerCase()).join(', ')} does not match` : 'Still in the frame'}</p>
        </div>
      </div>
      <p class="sheet-lead">${x.blurb}</p>
      <p class="sheet-tags"><span class="tag">${x.dead ? 'The morgue' : R.locationById(s, x.at).name}</span>
        ${x.clammed ? '<span class="tag tag--bad">Clammed up</span>' : ''}</p>
      <ul class="traitlist">${rows}</ul>
      <div class="sheet-actions">
        <button class="btn ${can ? 'btn--hero' : 'is-off'}" data-act="do-interrogate" data-id="${x.id}" ${can ? '' : 'disabled'}>
          ${can ? 'Question them · 1 hr' : x.dead ? 'Beyond questioning' : x.at !== p.at ? 'Not where you are' : x.clammed ? 'They have stopped talking' : 'No time left'}
        </button>
      </div>
    </div>`;
  }

  accusePanel() {
    const s = this.state;
    const p = R.currentPlayer(s);
    const live = R.liveSuspects(s);
    return `
    <div class="sheet sheet--accuse">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <h3>Name your killer</h3>
      <p class="sheet-lead">Two hours to make the case. Get it wrong and you lose three more, and they walk.</p>
      ${live.length > 1 ? `<p class="warn">${live.length} suspects still fit the evidence. This is a guess.</p>` : ''}
      <ul class="minilist">${s.suspects.filter((x) => !x.dead && !x.cleared).map((x) => {
        const out = R.isEliminated(s, x);
        return `<li class="${out ? 'is-out' : ''}">
          <span class="ml-face">${portrait(x.id, out ? '#5b6472' : '#c95d4f', 34)}</span>
          <span class="ml-n"><b>${x.name}</b><i>${out ? 'Ruled out by the evidence' : x.role}</i></span>
          <button class="btn btn--small btn--danger" data-act="do-accuse" data-id="${x.id}">Accuse</button>
        </li>`;
      }).join('')}</ul>
    </div>`;
  }

  abilityPanel() {
    const s = this.state;
    const p = R.currentPlayer(s);
    const ch = characterById(p.charId);
    const need = R.abilityTarget(p.charId);
    let list = '';

    if (need === 'location') {
      list = `<ul class="minilist">${s.map.locations.filter((l) => l.id !== p.at).map((l) => `
        <li><span class="ml-face ml-face--loc">${locIcon(l.type)}</span>
          <span class="ml-n"><b>${l.name}</b><i>${R.looksExhausted(s, l.id) ? 'Picked clean' : R.searchRecord(s, l.id).times ? 'Searched before' : 'Never searched'}</i></span>
          <button class="btn btn--small" data-act="do-ability" data-id="${l.id}">Break in</button></li>`).join('')}</ul>`;
    } else {
      const pool = need === 'suspect-here' ? R.suspectsAt(s, p.at) : s.suspects.filter((x) => !x.dead);
      list = `<ul class="minilist">${pool.map((x) => {
        const out = R.isEliminated(s, x);
        return `<li class="${out ? 'is-out' : ''}">
          <span class="ml-face">${portrait(x.id, out ? '#5b6472' : '#c8963e', 34)}</span>
          <span class="ml-n"><b>${x.name}</b><i>${x.role}</i></span>
          <button class="btn btn--small" data-act="do-ability" data-id="${x.id}">Choose</button></li>`;
      }).join('')}</ul>`;
    }

    return `
    <div class="sheet">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <h3>${ch.abilityName}</h3>
      <p class="sheet-lead">${ch.abilityText}</p>
      <p class="sheet-note">Costs one hour, and ${ch.short} can only do it once this case.</p>
      ${list}
    </div>`;
  }
}
