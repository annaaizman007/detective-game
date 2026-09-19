// Full-screen scenes: title, setup, briefing, hand-off curtain, epilogue.
// Each is a pure string of markup; App owns the state and the event wiring.

import { CASES } from '../cases/index.js';
import { CHARACTERS } from '../characters.js';
import { DIFFICULTIES } from '../gen.js';
import { TRAITS, traitLabel } from '../traits.js';
import { icon, portrait } from './icons.js';
import * as R from '../rules.js';

export function titleScreen() {
  return `
  <section class="scene scene--title">
    <div class="title-wrap">
      <p class="title-kicker">A co-operative case for one to six detectives</p>
      <h1 class="title-neon"><span>The</span> Ashgrave <em>Files</em></h1>
      <p class="title-sub">Three cases. Eight suspects. One night, and it is already raining.</p>
      <div class="title-actions">
        <button class="btn btn--hero" data-act="goto-setup">Open a case file</button>
        <button class="btn btn--ghost" data-act="how">How to play</button>
        <button class="btn btn--ghost" data-act="settings">${icon('speaker')} Narration</button>
      </div>
      <p class="title-foot">Pass one device around the table. The narrator reads every briefing aloud.</p>
    </div>
  </section>`;
}

export function setupScreen(draft) {
  const cases = CASES.map((c) => `
    <button class="pick pick--case ${draft.caseId === c.id ? 'is-on' : ''}" data-act="pick-case" data-id="${c.id}">
      <span class="pick-eyebrow">${c.subtitle}</span>
      <span class="pick-title">${c.title}</span>
      <span class="pick-body">${c.tagline}</span>
      <span class="pick-meta">Victim: ${c.victim}</span>
    </button>`).join('');

  const diffs = Object.values(DIFFICULTIES).map((d) => `
    <button class="pick pick--diff ${draft.difficulty === d.id ? 'is-on' : ''}" data-act="pick-diff" data-id="${d.id}">
      <span class="pick-title">${d.label}</span>
      <span class="pick-body">${d.note}</span>
    </button>`).join('');

  const seats = draft.seats.map((seat, i) => {
    const taken = draft.seats.filter((x, j) => j !== i).map((x) => x.charId);
    const opts = CHARACTERS.map((c) => `
      <option value="${c.id}" ${seat.charId === c.id ? 'selected' : ''} ${taken.includes(c.id) ? 'disabled' : ''}>
        ${c.short} — ${c.role}
      </option>`).join('');
    const ch = CHARACTERS.find((c) => c.id === seat.charId);
    return `
      <li class="seat" style="--seat:${ch.color}">
        <span class="seat-face">${portrait(ch.id, ch.color, 56)}</span>
        <div class="seat-main">
          <input class="seat-name" data-act="seat-name" data-i="${i}" value="${seat.name}"
                 maxlength="18" placeholder="Player ${i + 1}" aria-label="Player ${i + 1} name">
          <select class="seat-char" data-act="seat-char" data-i="${i}" aria-label="Detective for player ${i + 1}">${opts}</select>
          <p class="seat-blurb">${ch.blurb}</p>
          <p class="seat-powers">
            <b>${icon('badge')} ${ch.passive}</b>
            <i>${icon('eye')} ${ch.abilityName}: ${ch.abilityText}</i>
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
      </div>
      <div class="setup-col">
        <h3 class="setup-h">3. The detectives <span class="setup-count">${draft.seats.length}/6</span></h3>
        <ul class="seats">${seats}</ul>
        ${draft.seats.length < 6 ? '<button class="btn btn--add" data-act="seat-add">+ Add a detective</button>' : ''}
        <label class="switch">
          <input type="checkbox" data-act="toggle-handoff" ${draft.handoff ? 'checked' : ''}>
          <span>Hand-off screen between turns <i>(pass the device around the table)</i></span>
        </label>
        <button class="btn btn--hero btn--wide" data-act="start-game">Begin the investigation</button>
      </div>
    </div>
  </section>`;
}

export function briefingScreen(s, caseDef) {
  const diff = DIFFICULTIES[s.difficulty];
  return `
  <section class="scene scene--brief">
    <article class="dossier">
      <div class="dossier-stamp">CONFIDENTIAL</div>
      <header class="dossier-head">
        <p class="dossier-dept">Ashgrave Bay Police · Homicide Division</p>
        <h2>${caseDef.title}</h2>
        <p class="dossier-sub">${caseDef.subtitle}</p>
      </header>
      <dl class="dossier-facts">
        <div><dt>Victim</dt><dd>${caseDef.victim}</dd></div>
        <div><dt>Suspects</dt><dd>${s.suspects.length}</dd></div>
        <div><dt>On the clock</dt><dd>${s.coldMax} hours</dd></div>
        <div><dt>Assignment</dt><dd>${diff.label}</dd></div>
      </dl>
      <p class="dossier-body" data-type-target>${caseDef.briefing.replace(/\s+/g, ' ').trim()}</p>
      <p class="dossier-note">
        ${icon('clock')} Every action any detective takes burns one hour. When the hours run out, the trail is cold.
      </p>
      <div class="dossier-actions">
        <button class="btn btn--hero" data-act="enter-game">Take the case</button>
        <button class="btn btn--ghost" data-act="replay-brief">${icon('speaker')} Read it again</button>
        <button class="btn btn--ghost" data-act="skip-voice">Skip narration</button>
      </div>
    </article>
  </section>`;
}

export function handoffScreen(player, ch) {
  return `
  <div class="curtain" data-act="handoff-ready">
    <div class="curtain-inner" style="--seat:${ch.color}">
      <p class="curtain-kicker">Pass the device</p>
      <div class="curtain-face">${portrait(ch.id, ch.color, 120)}</div>
      <h2>${player.name}</h2>
      <p class="curtain-role">${ch.name} · ${ch.role}</p>
      <button class="btn btn--hero">I have it — begin my turn</button>
    </div>
  </div>`;
}

export function endScreen(s, caseDef) {
  const won = s.result === 'win';
  const culprit = s.suspects.find((x) => x.id === s.culpritId);
  const solver = s.players.find((p) => p.id === s.solvedBy);
  const facts = s.chosenTraits.map((t) => `
    <li><span>${icon(TRAITS[t].icon)} ${TRAITS[t].label}</span><b>${traitLabel(t, culprit.traits[t])}</b></li>`).join('');

  return `
  <section class="scene scene--end ${won ? 'is-win' : 'is-loss'}">
    <div class="end-wrap">
      <p class="end-kicker">${won ? 'Case closed' : 'The trail is cold'}</p>
      <h2 class="end-title">${won ? 'You got them.' : 'They walked.'}</h2>
      <div class="end-reveal">
        <div class="end-face">${portrait(culprit.id, won ? '#c8963e' : '#c95d4f', 96)}</div>
        <div class="end-who">
          <b>${culprit.name}</b>
          <i>${culprit.role}</i>
          <p>${culprit.name.split(' ').slice(-1)[0]} killed ${caseDef.victim} ${culprit.motive}</p>
        </div>
      </div>
      <ul class="end-facts">${facts}</ul>
      <p class="end-epilogue">${(won ? caseDef.epilogue.win : caseDef.epilogue.loss).replace(/\s+/g, ' ').trim()}</p>
      <p class="end-stats">
        ${won && solver ? `Collared by <b>${solver.name}</b>. ` : ''}
        ${s.cold} of ${s.coldMax} hours spent · ${R.factsKnown(s)}/${s.chosenTraits.length} facts found
        ${s.wrongAccusations.length ? ` · ${s.wrongAccusations.length} wrong ${s.wrongAccusations.length === 1 ? 'accusation' : 'accusations'}` : ''}
      </p>
      <div class="end-actions">
        <button class="btn btn--hero" data-act="again-same">Run it again</button>
        <button class="btn btn--ghost" data-act="goto-setup">New case</button>
        <button class="btn btn--ghost" data-act="goto-title">Title screen</button>
      </div>
    </div>
  </section>`;
}

export function howToPlay() {
  return `
  <div class="sheet">
    <h3>How to play</h3>
    <p class="sheet-lead">One of the people on your list killed somebody. Find out which, before the night runs out.</p>
    <ol class="sheet-steps">
      <li><b>Search the city.</b> Evidence left at a location tells you a fact about the <em>killer</em> —
        left-handed, size twelve boots, smells of machine oil.</li>
      <li><b>Question the suspects.</b> Talking to somebody tells you a fact about <em>them</em>.
        They clam up for a while afterwards.</li>
      <li><b>Cross them off.</b> The notebook does the arithmetic. When a suspect's known trait
        contradicts a known fact about the killer, they are out.</li>
      <li><b>Name your killer.</b> Accusing costs two hours. Get it wrong and you lose three more.</li>
    </ol>
    <h4>The clock</h4>
    <p>Every action by any detective burns one hour. Six detectives burn the night six times faster,
      so a full table is no easier — just louder. Every four hours the city does something about it.</p>
    <h4>Your turn</h4>
    <p>Two actions each (three for Hale): move one location, search where you stand, question somebody
      standing with you, or use your once-per-case ability. Walking away early does not bank the hours.</p>
    <h4>Playing with friends</h4>
    <p>It is co-operative and all knowledge is shared — the notebook is the table's, not yours.
      Pass the device on the hand-off screen and argue about the board together.</p>
    <button class="btn btn--hero" data-act="close-modal">Got it</button>
  </div>`;
}

export function settingsSheet(narrator) {
  const voices = narrator.voices.map((v) => `
    <option value="${v.voiceURI}" ${v.voiceURI === narrator.voiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('');
  return `
  <div class="sheet">
    <h3>Narration</h3>
    ${narrator.supported
      ? `<label class="switch">
          <input type="checkbox" data-act="toggle-voice" ${narrator.enabled ? 'checked' : ''}>
          <span>Read the case aloud</span>
        </label>
        <label class="field">
          <span>Narrator voice</span>
          <select data-act="pick-voice">${voices || '<option>Loading voices…</option>'}</select>
        </label>
        <button class="btn btn--ghost" data-act="test-voice">${icon('speaker')} Test the voice</button>
        <p class="sheet-note">Voices come from your browser and operating system, so the list differs
          between machines. A deep English voice suits the material. Subtitles show every line either way.</p>`
      : '<p class="sheet-note">This browser has no speech synthesis, so narration runs as subtitles only.</p>'}
    <h4>Comfort</h4>
    <label class="switch">
      <input type="checkbox" data-act="toggle-motion" ${localStorage.getItem('ashgrave.motion') !== 'off' ? 'checked' : ''}>
      <span>Rain, grain and typewriter effects</span>
    </label>
    <button class="btn btn--hero" data-act="close-modal">Close</button>
  </div>`;
}
