// Talking to people.
//
// Whoever you are speaking to is on screen, drawn large, with the place and
// the hour behind them and their lines typed out underneath -- a suspect you
// are leaning on, or a witness who would rather be asleep. What you know about
// a suspect shows on their face; what you learn arrives as a card.

import type { GameState, SuspectState } from '../types/game-types';
import { APPROACHES, approachById } from '../game/dialogue';
import { characterById } from '../game/characters';
import { TRAITS, traitLabel, traitValue } from '../game/traits';
import * as R from '../game/rules';
import { portraitSvg } from './portraits';
import { icon } from './icons';
import { esc } from './fx';

export interface DialogueView {
  kind: 'suspect' | 'witness';
  id: string;
  /** 'choose' offers the approaches or questions; 'result' shows the exchange. */
  stage: 'choose' | 'result' | 'pick-subject';
}

function stage(s: GameState, portrait: string, where: string): string {
  return `
    <div class="dlg-stage">
      <span class="dlg-where">${icon('pin')} ${esc(where)} · ${R.clockAt(s.cold)}</span>
      <div class="dlg-char">${portrait}</div>
    </div>`;
}

function you(s: GameState): string {
  const p = R.currentPlayer(s);
  if (!p) return '';
  const ch = characterById(p.charId);
  return `<div class="dlg-you" style="--seat:${ch.color}">${portraitSvg(ch.id, { size: 64, frame: 'face', reveal: true, accent: ch.color })}<span>${esc(p.name)}</span></div>`;
}

function knownChips(s: GameState, x: SuspectState): string {
  return `<div class="dlg-known">${s.chosenTraits.map((t) => {
    const k = x.known[t];
    return `<span class="chip ${k ? 'is-known' : ''}" title="${TRAITS[t].label}">${icon(TRAITS[t].icon)} ${k ? esc(traitLabel(t, x.traits[t])) : '?'}</span>`;
  }).join('')}</div>`;
}

export function renderDialogue(s: GameState, v: DialogueView): string {
  return v.kind === 'suspect' ? suspectDialogue(s, v) : witnessDialogue(s, v);
}

function suspectDialogue(s: GameState, v: DialogueView): string {
  const x = s.suspects.find((y) => y.id === v.id);
  const p = R.currentPlayer(s);
  if (!x || !p) return '';
  const where = R.locationById(s, x.at)?.name ?? '';
  const out = R.isEliminated(s, x);
  const portrait = portraitSvg(x.id, { size: 230, known: x.known, traits: x.traits, muted: out });
  const can = R.canInterrogate(s, p, x);
  const c = s.conversation;

  if (v.stage === 'result' && c && c.suspectId === x.id) {
    const approach = approachById(c.approach);
    const learned = c.learned.map((l) => {
      const who = s.suspects.find((y) => y.id === l.who) as SuspectState;
      return `<li class="learn">
        <span class="learn-face">${portraitSvg(who.id, { size: 40, frame: 'face', known: who.known, traits: who.traits })}</span>
        <span class="learn-body"><b>${esc(who.name)} — ${TRAITS[l.trait].label.toLowerCase()}: ${esc(traitLabel(l.trait, who.traits[l.trait]))}</b>
        <i>${esc(traitValue(l.trait, who.traits[l.trait]).tell)}</i></span>
      </li>`;
    }).join('');
    return `
    <div class="dlg dlg--suspect">
      ${stage(s, portrait, where)}${you(s)}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(x.name)}</b><i>${esc(x.role)} · ${approach.label.toLowerCase()}</i></div>
        <p class="dlg-ask"><span class="dlg-ask-who">${esc(p.name)}</span>${esc(c.ask)}</p>
        <p class="dlg-line" data-type-target>${esc(c.reply)}</p>
        ${learned ? `<ul class="learned">${learned}</ul>` : '<p class="dlg-note">Nothing new. They have already given you everything they have.</p>'}
        ${x.clammed ? `<p class="dlg-warn">${esc(x.name)} will not talk to you again for a while.</p>` : ''}
        <div class="dlg-choices"><button class="btn btn--hero" data-act="close-modal">Close the notebook</button></div>
      </div>
    </div>`;
  }

  const choices = can
    ? APPROACHES.map((a) => `
        <button class="choice" data-act="do-interrogate" data-id="${x.id}" data-approach="${a.id}">
          <b>${esc(a.label)}</b><i>${esc(a.hint)}</i></button>`).join('')
    : `<button class="choice is-off" disabled><b>${x.dead ? 'Beyond questioning' : x.at !== p.at ? `Not here — they are at ${esc(where)}` : x.clammed ? 'They have stopped talking to you' : 'No time left this turn'}</b></button>`;

  return `
    <div class="dlg dlg--suspect ${out ? 'is-out' : ''}">
      ${stage(s, portrait, where)}${you(s)}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(x.name)}</b><i>${esc(x.role)}${x.dead ? ' · found dead' : x.cleared ? ' · cleared' : out ? ' · ruled out' : ''}</i></div>
        <p class="dlg-line" data-type-target>${esc(x.blurb)}</p>
        ${knownChips(s, x)}
        ${can ? '<h4 class="dlg-h">How do you play it? <span>1 hour</span></h4>' : ''}
        <div class="dlg-choices dlg-choices--grid">${choices}
          <button class="choice choice--leave" data-act="close-modal"><b>Leave it</b></button></div>
      </div>
    </div>`;
}

function witnessDialogue(s: GameState, v: DialogueView): string {
  const w = R.witnessById(s, v.id);
  const p = R.currentPlayer(s);
  if (!w || !p) return '';
  const where = R.locationById(s, w.state.at)?.name ?? '';
  const portrait = portraitSvg(w.def.id, { size: 230, reveal: true });
  const here = w.state.at === p.at;
  const t = s.testimony;

  if (v.stage === 'result' && t && t.witnessId === w.def.id) {
    let card = '';
    if (t.question === 'about' && t.trait && t.subjectId) {
      const who = s.suspects.find((y) => y.id === t.subjectId) as SuspectState;
      card = `<ul class="learned"><li class="learn">
        <span class="learn-face">${portraitSvg(who.id, { size: 40, frame: 'face', known: who.known, traits: who.traits })}</span>
        <span class="learn-body"><b>${esc(who.name)} — ${TRAITS[t.trait].label.toLowerCase()}: ${esc(traitLabel(t.trait, who.traits[t.trait]))}</b>
        <i>Statement filed in the locker.</i></span></li></ul>`;
    } else if (t.question === 'lead' && t.locationId) {
      card = `<ul class="learned"><li class="learn learn--lead">
        <span class="learn-face">${icon('pin')}</span>
        <span class="learn-body"><b>Lead: ${esc(R.locationById(s, t.locationId)?.name ?? '')}</b><i>Marked on the map. Something is still there to find.</i></span>
        <button class="btn btn--small btn--ghost" data-act="focus-loc" data-id="${esc(t.locationId)}">Show me</button></li></ul>`;
    }
    return `
    <div class="dlg dlg--witness">
      ${stage(s, portrait, where)}${you(s)}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(w.def.name)}</b><i>${esc(w.def.role)}</i></div>
        <p class="dlg-ask"><span class="dlg-ask-who">${esc(p.name)}</span>${esc(t.ask)}</p>
        <p class="dlg-line" data-type-target>${esc(t.reply)}</p>
        ${card}
        <div class="dlg-choices">
          ${R.canAsk(s, p, w) ? `<button class="btn btn--ghost" data-act="open-witness" data-id="${w.def.id}">Ask something else</button>` : ''}
          <button class="btn btn--hero" data-act="close-modal">That will do</button>
        </div>
      </div>
    </div>`;
  }

  const spent = w.state.patience <= 0;
  const line = spent ? w.def.spentLine : w.def.intro;

  if (v.stage === 'pick-subject') {
    const list = w.canDescribe.map((x) => `
      <button class="choice choice--person" data-act="do-ask" data-id="${w.def.id}" data-q="about" data-suspect="${x.id}">
        <span class="choice-face">${portraitSvg(x.id, { size: 44, frame: 'face', known: x.known, traits: x.traits })}</span>
        <b>${esc(x.name)}</b><i>${esc(x.role)} · ${R.unknownTraits(s, x)} things still unknown</i></button>`).join('');
    return `
    <div class="dlg dlg--witness">
      ${stage(s, portrait, where)}${you(s)}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(w.def.name)}</b><i>${esc(w.def.role)}</i></div>
        <p class="dlg-line">Who do you want to hear about?</p>
        <div class="dlg-choices dlg-choices--grid">${list}
          <button class="choice choice--leave" data-act="open-witness" data-id="${w.def.id}"><b>Back</b></button></div>
      </div>
    </div>`;
  }

  const canAsk = R.canAsk(s, p, w);
  const choices = !here
    ? `<button class="choice is-off" disabled><b>Not where you are — they are at ${esc(where)}</b></button>`
    : spent
      ? `<button class="choice is-off" disabled><b>They have said enough for now</b><i>Patience comes back as the hours pass.</i></button>`
      : !canAsk
        ? `<button class="choice is-off" disabled><b>${p.ap < 1 ? 'No time left this turn' : 'Nothing more they can tell you'}</b></button>`
        : `${w.canDescribe.length ? `<button class="choice" data-act="witness-pick" data-id="${w.def.id}"><b>Ask about someone</b><i>${w.canDescribe.length} ${w.canDescribe.length === 1 ? 'person' : 'people'} they know · 1 hour</i></button>` : ''}
           ${w.canLead ? `<button class="choice" data-act="do-ask" data-id="${w.def.id}" data-q="lead"><b>What did you see tonight?</b><i>A place worth a look · 1 hour</i></button>` : ''}`;

  return `
    <div class="dlg dlg--witness">
      ${stage(s, portrait, where)}${you(s)}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(w.def.name)}</b><i>${esc(w.def.role)} · will answer ${w.state.patience} more ${w.state.patience === 1 ? 'question' : 'questions'}</i></div>
        <p class="dlg-line" data-type-target>${esc(line)}</p>
        <div class="dlg-choices dlg-choices--grid">${choices}
          <button class="choice choice--leave" data-act="close-modal"><b>Leave them be</b></button></div>
      </div>
    </div>`;
}
