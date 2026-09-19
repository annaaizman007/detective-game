// Full-screen scenes: title, setup, briefing, hand-off curtain, epilogue,
// and the two sheets that are not about a case. Each is a pure string of
// markup; App owns the state and the event wiring.

import type { CaseDef, CharacterId, DifficultyId, GameState } from '../types/game-types';
import { CASES } from '../game/cases/index';
import { CHARACTERS } from '../game/characters';
import { DIFFICULTIES } from '../game/gen';
import { TRAITS, traitLabel } from '../game/traits';
import * as R from '../game/rules';
import type { Narrator } from '../systems/narrator';
import type { AudioManager, Channel } from '../systems/audio-manager';
import type { SaveFile } from '../systems/save-manager';
import { icon } from './icons';
import { portraitSvg } from './portraits';
import { esc } from './fx';
import { STORAGE } from '../config/constants';

export interface Draft {
  caseId: string;
  difficulty: DifficultyId;
  handoff: boolean;
  assisted: boolean;
  journal: boolean;
  seats: { name: string; charId: CharacterId }[];
}

export function titleScreen(save: SaveFile | null): string {
  const c = save ? CASES.find((x) => x.id === save.caseId) : null;
  return `
  <section class="scene scene--title">
    <div class="title-wrap">
      <p class="title-kicker">A co-operative case for one to six detectives</p>
      <h1 class="title-neon"><span>The</span> Ashgrave <em>Files</em></h1>
      <p class="title-sub">Three cases. Thirty streets each. Two days before the trail goes cold.</p>
      <div class="title-actions">
        ${save && c ? `<button class="btn btn--hero" data-act="resume-game">Resume — ${esc(c.title)} <small>${save.actions.length} steps in</small></button>` : ''}
        <button class="btn ${save ? 'btn--ghost' : 'btn--hero'}" data-act="goto-setup">${save ? 'New case' : 'Open a case file'}</button>
        <button class="btn btn--ghost" data-act="how">How to play</button>
        <button class="btn btn--ghost" data-act="settings">${icon('speaker')} Sound</button>
      </div>
      <p class="title-foot">${icon('speaker')} Best with the sound up — it is raining, there is a fire in the grate, and the narrator
        reads every briefing aloud. Pass one device around the table.</p>
    </div>
  </section>`;
}

export function setupScreen(draft: Draft): string {
  const cases = CASES.map((c) => `
    <button class="pick pick--case ${draft.caseId === c.id ? 'is-on' : ''}" data-act="pick-case" data-id="${c.id}">
      <span class="pick-eyebrow">${esc(c.subtitle)}</span>
      <span class="pick-title">${esc(c.title)}</span>
      <span class="pick-body">${esc(c.tagline)}</span>
      <span class="pick-meta">Victim: ${esc(c.victim)} · ${c.locations.length} locations · ${c.witnesses.length} witnesses</span>
    </button>`).join('');

  const diffs = Object.values(DIFFICULTIES).map((d) => `
    <button class="pick pick--diff ${draft.difficulty === d.id ? 'is-on' : ''}" data-act="pick-diff" data-id="${d.id}">
      <span class="pick-title">${esc(d.label)}</span>
      <span class="pick-body">${esc(d.note)}</span>
    </button>`).join('');

  const seats = draft.seats.map((seat, i) => {
    const taken = draft.seats.filter((x, j) => j !== i).map((x) => x.charId);
    const opts = CHARACTERS.map((c) => `
      <option value="${c.id}" ${seat.charId === c.id ? 'selected' : ''} ${taken.includes(c.id) ? 'disabled' : ''}>
        ${esc(c.short)} — ${esc(c.role)}
      </option>`).join('');
    const ch = CHARACTERS.find((c) => c.id === seat.charId) as typeof CHARACTERS[number];
    return `
      <li class="seat" style="--seat:${ch.color}">
        <span class="seat-face">${portraitSvg(ch.id, { size: 64, reveal: true, accent: ch.color })}</span>
        <div class="seat-main">
          <input class="seat-name" data-act="seat-name" data-i="${i}" value="${esc(seat.name)}"
                 maxlength="18" placeholder="Player ${i + 1}" aria-label="Player ${i + 1} name">
          <select class="seat-char" data-act="seat-char" data-i="${i}" aria-label="Detective for player ${i + 1}">${opts}</select>
          <p class="seat-blurb">${esc(ch.blurb)}</p>
          <p class="seat-powers">
            <b>${icon('badge')} ${esc(ch.passive)}</b>
            <i>${icon('eye')} ${esc(ch.abilityName)}: ${esc(ch.abilityText)}</i>
          </p>
        </div>
        ${draft.seats.length > 1 ? `<button class="seat-x" data-act="seat-remove" data-i="${i}" aria-label="Remove player ${i + 1}">×</button>` : ''}
      </li>`;
  }).join('');

  return `
  <section class="scene scene--setup">
    <header class="setup-head">
      <button class="btn btn--back" data-act="goto-title">← Back</button>
      <h2>Assign the case</h2>
    </header>
    <div class="setup-grid">
      <div class="setup-col">
        <h3 class="setup-h">1. The case</h3>
        <div class="pick-row">${cases}</div>
        <h3 class="setup-h">2. How hard</h3>
        <div class="pick-row pick-row--3">${diffs}</div>
        <h3 class="setup-h">3. How you work</h3>
        <label class="switch">
          <input type="checkbox" data-act="toggle-assisted-draft" ${draft.assisted ? 'checked' : ''}>
          <span>Assisted notebook <i>(the evidence fills in the killer’s profile for you; off, you read the exhibits and mark it yourself)</i></span>
        </label>
        <label class="switch">
          <input type="checkbox" data-act="toggle-journal-draft" ${draft.journal ? 'checked' : ''}>
          <span>Keep a journal <i>(every step is recorded, with room for your own notes)</i></span>
        </label>
        <label class="switch">
          <input type="checkbox" data-act="toggle-handoff" ${draft.handoff ? 'checked' : ''}>
          <span>Hand-off screen between turns <i>(pass the device around the table)</i></span>
        </label>
      </div>
      <div class="setup-col">
        <h3 class="setup-h">4. The detectives <span class="setup-count">${draft.seats.length}/6</span></h3>
        <ul class="seats">${seats}</ul>
        ${draft.seats.length < 6 ? '<button class="btn btn--add" data-act="seat-add">+ Add a detective</button>' : ''}
        <button class="btn btn--hero btn--wide" data-act="start-game">Begin the investigation</button>
      </div>
    </div>
  </section>`;
}

export function briefingScreen(s: GameState, caseDef: CaseDef): string {
  const diff = DIFFICULTIES[s.difficulty];
  const paras = caseDef.briefing.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z])/);
  // Group sentences into three or four cards so each reads as one beat.
  const cards: string[] = [];
  const per = Math.max(1, Math.ceil(paras.length / 4));
  for (let i = 0; i < paras.length; i += per) cards.push(paras.slice(i, i + per).join(' '));
  return `
  <section class="scene scene--cine">
    <div class="cine-cards">
      <div class="cine-card cine-card--title">
        <p class="cine-kicker">Ashgrave Bay Police · Homicide</p>
        <h2>${esc(caseDef.title)}</h2>
        <p class="cine-sub">${esc(caseDef.subtitle)}</p>
      </div>
      ${cards.map((c, i) => `<div class="cine-card" style="--i:${i + 1}"><p>${esc(c)}</p></div>`).join('')}
      <div class="cine-card cine-card--facts" style="--i:${cards.length + 1}">
        <dl class="dossier-facts">
          <div><dt>Victim</dt><dd>${esc(caseDef.victim)}</dd></div>
          <div><dt>Suspects</dt><dd>${s.suspects.length}</dd></div>
          <div><dt>On the clock</dt><dd>${s.coldMax} hours</dd></div>
          <div><dt>Assignment</dt><dd>${esc(diff.label)}</dd></div>
        </dl>
      </div>
    </div>
    <div class="cine-actions">
      <button class="btn btn--hero" data-act="enter-game">Take the case</button>
      <button class="btn btn--ghost" data-act="replay-brief">${icon('speaker')} Read it again</button>
      <button class="btn btn--ghost" data-act="skip-voice">Skip narration</button>
    </div>
  </section>`;
}

export function handoffScreen(player: GameState['players'][number], ch: typeof CHARACTERS[number]): string {
  return `
  <div class="curtain" data-act="handoff-ready">
    <div class="curtain-inner" style="--seat:${ch.color}">
      <p class="curtain-kicker">Pass the device</p>
      <div class="curtain-face">${portraitSvg(ch.id, { size: 140, reveal: true, accent: ch.color })}</div>
      <h2>${esc(player.name)}</h2>
      <p class="curtain-role">${esc(ch.name)} · ${esc(ch.role)}</p>
      <button class="btn btn--hero">I have it — begin my turn</button>
    </div>
  </div>`;
}

export function endScreen(s: GameState, caseDef: CaseDef): string {
  const won = s.result === 'win';
  const culprit = s.suspects.find((x) => x.id === s.culpritId) as GameState['suspects'][number];
  const solver = s.players.find((p) => p.id === s.solvedBy);
  const facts = s.chosenTraits.map((t) => `
    <li><span>${icon(TRAITS[t].icon)} ${TRAITS[t].label}</span><b>${esc(traitLabel(t, culprit.traits[t]))}</b></li>`).join('');
  return `
  <section class="scene scene--end ${won ? 'is-win' : 'is-loss'}">
    <div class="end-wrap">
      <p class="end-kicker">${won ? 'Case closed' : 'The trail is cold'}</p>
      <h2 class="end-title">${won ? 'You got them.' : 'They walked.'}</h2>
      <div class="end-reveal">
        <div class="end-face">${portraitSvg(culprit.id, { size: 150, reveal: true, traits: culprit.traits, accent: won ? '#c8963e' : '#c95d4f' })}</div>
        <div class="end-who">
          <b>${esc(culprit.name)}</b>
          <i>${esc(culprit.role)}</i>
          <p>${esc(culprit.name.split(' ').slice(-1)[0])} killed ${esc(caseDef.victim)} ${esc(culprit.motive)}</p>
        </div>
      </div>
      <ul class="end-facts">${facts}</ul>
      <p class="end-epilogue">${esc((won ? caseDef.epilogue.win : caseDef.epilogue.loss).replace(/\s+/g, ' ').trim())}</p>
      ${caseDef.story.truth.length ? `<details class="end-truth" ${won ? 'open' : ''}><summary>What really happened</summary>${caseDef.story.truth.map((par) => `<p>${esc(par)}</p>`).join('')}</details>` : ''}
      ${s.suspects.some((x) => caseDef.suspects.find((d) => d.id === x.id)?.secret) ? `<details class="end-truth"><summary>What everybody was hiding</summary><ul class="end-secrets">${s.suspects.map((x) => {
        const d = caseDef.suspects.find((q) => q.id === x.id);
        return d?.secret ? `<li><span class="end-secret-face">${portraitSvg(x.id, { size: 40, frame: 'face', reveal: true, traits: x.traits })}</span><div><b>${esc(x.name)}</b><p>${esc(d.secret)}</p></div></li>` : '';
      }).join('')}</ul></details>` : ''}
      <p class="end-stats">
        ${won && solver ? `Collared by <b>${esc(solver.name)}</b>. ` : ''}
        ${s.cold} of ${s.coldMax} hours spent · ${R.factsKnown(s)}/${s.chosenTraits.length} facts found · ${s.exhibits.length} exhibits filed
        ${s.wrongAccusations.length ? ` · ${s.wrongAccusations.length} wrong ${s.wrongAccusations.length === 1 ? 'accusation' : 'accusations'}` : ''}
      </p>
      <div class="end-actions">
        <button class="btn btn--ghost" data-act="journal-export">↓ Keep the case file</button>
        <button class="btn btn--hero" data-act="again-same">Run it again</button>
        <button class="btn btn--ghost" data-act="goto-setup">New case</button>
        <button class="btn btn--ghost" data-act="quit">Title screen</button>
      </div>
    </div>
  </section>`;
}

/** The whole case, any time: what is known, when it happened, who is in it. */
export function caseFile(s: GameState, caseDef: CaseDef): string {
  const st = caseDef.story;
  const suspects = s.suspects.map((x) => {
    const d = caseDef.suspects.find((q) => q.id === x.id);
    return `<li class="cf-sus">
      <span class="cf-face">${portraitSvg(x.id, { size: 48, frame: 'face', known: x.known, traits: x.traits })}</span>
      <div><b>${esc(x.name)}</b><i>${esc(x.role)}</i>
        ${d?.bio ? `<p>${esc(d.bio)}</p>` : ''}${d?.alibi ? `<p class="cf-alibi"><b>Says:</b> ${esc(d.alibi)}</p>` : ''}</div>
    </li>`;
  }).join('');
  return `
  <div class="sheet sheet--casefile">
    <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
    <p class="dossier-dept">Ashgrave Bay Police · Case file</p>
    <h3>${esc(caseDef.title)}</h3>
    <p class="sheet-lead">${esc(caseDef.tagline)}</p>
    <dl class="dossier-facts dossier-facts--tight">
      <div><dt>Victim</dt><dd>${esc(caseDef.victim)}</dd></div>
      <div><dt>Scene</dt><dd>${esc(R.locationById(s, caseDef.scene)?.name ?? caseDef.scene)}</dd></div>
      <div><dt>On the clock</dt><dd>${Math.max(0, s.coldMax - s.cold)} of ${s.coldMax} hours</dd></div>
    </dl>
    <h4 class="sheet-h">The briefing</h4>
    <p class="cf-body">${esc(caseDef.briefing.replace(/\s+/g, ' ').trim())}</p>
    ${st.backstory.length ? `<h4 class="sheet-h">What is known</h4>${st.backstory.map((par) => `<p class="cf-body">${esc(par)}</p>`).join('')}` : ''}
    ${st.timeline.length ? `<h4 class="sheet-h">The night</h4><ol class="cf-timeline">${st.timeline.map((t) => `<li><span>${esc(t.time)}</span><p>${esc(t.text)}</p></li>`).join('')}</ol>` : ''}
    <h4 class="sheet-h">Dispatch</h4>
    <ul class="cf-radio">${caseDef.radio.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <h4 class="sheet-h">The suspects</h4>
    <ul class="cf-suspects">${suspects}</ul>
    <div class="sheet-actions">
      <button class="btn btn--ghost" data-act="replay-brief">${icon('speaker')} Hear the briefing</button>
      <button class="btn btn--hero" data-act="close-modal">Back to it</button>
    </div>
  </div>`;
}

export function howToPlay(): string {
  return `
  <div class="sheet">
    <h3>How to play</h3>
    <p class="sheet-lead">One of the people on your list killed somebody. Find out which, before the trail goes cold.</p>
    <ol class="sheet-steps">
      <li><b>Search the city.</b> What you find is a document — a coroner's note, a lab sheet, a photograph, a letter. Open it in the <em>locker</em> and read it. Some say something about the killer. Some are only paper.</li>
      <li><b>Ask around.</b> At some locations there is someone who will talk: a night clerk, a barman, a gravedigger. They can describe a suspect they know, or point you at a place. Two questions and they tire.</li>
      <li><b>Question the suspects.</b> Talking to somebody tells you a fact about <em>them</em>. They clam up for a while afterwards.</li>
      <li><b>Fill the notebook.</b> Mark what the exhibits tell you about the killer. Suspects whose story cannot match get crossed off — by <em>your</em> marks, so read carefully.</li>
      <li><b>Name your killer.</b> Accusing costs two hours. Get it wrong and you lose three more.</li>
    </ol>
    <h4>The clock</h4>
    <p>Every action by any detective burns one hour. Six detectives burn the days six times faster,
      so a full table is no easier — just louder. Every few hours the city does something about it.</p>
    <h4>Your turn</h4>
    <p>Two actions each (three for Hale): move one location, search where you stand, question somebody
      standing with you, ask a witness, or use your once-per-case ability. Walking away early does not bank the hours.</p>
    <h4>The journal</h4>
    <p>Every step is written down with the hour it happened. Add your own notes beside any of them, and export the whole case file at the end.</p>
    <h4>Keys</h4>
    <p><kbd>M</kbd> move · <kbd>S</kbd> search · <kbd>T</kbd> talk · <kbd>N</kbd> notebook · <kbd>E</kbd> locker · <kbd>J</kbd> journal · <kbd>F</kbd> find me · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>Esc</kbd> close</p>
    <button class="btn btn--hero" data-act="close-modal">Got it</button>
  </div>`;
}

export function settingsSheet(narrator: Narrator, audio: AudioManager): string {
  const options = narrator.voiceOptions();
  const current = options.find((o) => o.uri === narrator.voiceURI);
  const groups = ['Natural', 'Network', 'Standard']
    .map((q) => {
      const rows = options.filter((o) => o.quality === q);
      if (!rows.length) return '';
      return `<optgroup label="${q}${q === 'Natural' ? ' — best available' : ''}">${
        rows.map((o) => `<option value="${esc(o.uri)}" ${o.uri === narrator.voiceURI ? 'selected' : ''}>${esc(o.name)} (${esc(o.lang)})</option>`).join('')
      }</optgroup>`;
    }).join('');

  const recorded = narrator.clips
    ? `<label class="switch">
        <input type="checkbox" data-act="toggle-clips" ${narrator.useClips ? 'checked' : ''}>
        <span>Use the recorded narration <i>(${narrator.clips.ids.size} lines, voice “${esc(narrator.clips.voice)}”)</i></span>
      </label>`
    : '<p class="sheet-note">No recorded narration found. Run <code>npm run voices</code> to bake one with a real voice; until then the browser reads the lines.</p>';

  const channel = (c: Channel, label: string, hint: string) => {
    const ch = audio.channel(c);
    const src = audio.sourceOf(c);
    return `
      <div class="chan">
        <label class="switch">
          <input type="checkbox" data-act="toggle-channel" data-ch="${c}" ${ch.on ? 'checked' : ''}>
          <span>${label} <i>${hint}${src ? ` · ${src === 'file' ? 'recording' : 'synthesised'}` : ''}</i></span>
        </label>
        <input type="range" data-act="set-channel" data-ch="${c}" min="0" max="1.6" step="0.05" value="${ch.level}" aria-label="${label} level">
      </div>`;
  };

  return `
  <div class="sheet sheet--settings">
    <h3>Sound</h3>
    <h4>The room</h4>
    <label class="switch">
      <input type="checkbox" data-act="toggle-ambience" ${audio.enabled ? 'checked' : ''}>
      <span>Atmosphere on <i>(the narrator comes in over the wire)</i></span>
    </label>
    <label class="field">
      <span>Overall</span>
      <input type="range" data-act="set-ambience-vol" min="0" max="1.6" step="0.05" value="${audio.volume}">
    </label>
    ${channel('rain', 'Rain', 'against the window')}
    ${channel('fire', 'The fire', 'in the grate across the room')}
    ${channel('music', 'Music', 'a slow band in the next room')}
    <p class="sheet-note">Drop a recording in <code>public/assets/audio/</code> — <code>sfx/rain</code>, <code>sfx/fire</code>, <code>music/lounge</code> as .mp3 or .ogg — and it is used in place of the synthesised one.</p>

    <h4>Narration</h4>
    ${narrator.supported || narrator.clips
      ? `<label class="switch">
          <input type="checkbox" data-act="toggle-voice" ${narrator.enabled ? 'checked' : ''}>
          <span>Read the case aloud</span>
        </label>
        ${recorded}
        ${narrator.supported ? `
        <label class="field">
          <span>Fallback voice ${current ? `<i class="q q--${current.quality.toLowerCase()}">${current.quality}</i>` : ''}</span>
          <select data-act="pick-voice" id="voice-pick">${groups || '<option>Loading voices…</option>'}</select>
        </label>
        <label class="field">
          <span>Pace</span>
          <input type="range" data-act="set-rate" id="voice-rate" min="0.75" max="1.3" step="0.05" value="${narrator.rateScale}">
          <em class="field-ends"><span>Slower</span><span>Faster</span></em>
        </label>` : ''}
        <button class="btn btn--ghost btn--wide" data-act="test-voice">${icon('speaker')} Hear a dispatch</button>`
      : '<p class="sheet-note">This browser has no speech synthesis, so narration runs as subtitles only.</p>'}

    <h4>Motion</h4>
    <label class="switch">
      <input type="checkbox" data-act="toggle-motion" ${localStorage.getItem(STORAGE.prefix + 'motion') !== 'off' ? 'checked' : ''}>
      <span>On-screen rain, grain and typewriter effects</span>
    </label>
    <button class="btn btn--hero btn--wide" data-act="close-modal">Close</button>
  </div>`;
}
