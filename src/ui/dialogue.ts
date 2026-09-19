// Talking to people.
//
// Whoever you are speaking to is on stage, drawn large, with the place and
// the hour behind them. Under them: what has been said so far, then what you
// can ask next. Everyone has their own questions -- about the victim, the
// night, themselves, each other -- and some of them cost an hour and give
// something up. Suspects can also be leaned on (the three approaches) and
// anyone can be shown what you are carrying.

import type { GameState, SuspectState } from '../types/game-types';
import { APPROACHES, approachById } from '../game/dialogue';
import { characterById } from '../game/characters';
import { TRAITS, traitLabel, traitValue } from '../game/traits';
import { caseById } from '../game/cases/index';
import * as R from '../game/rules';
import { portraitSvg } from './portraits';
import { icon } from './icons';
import { esc } from './fx';
import { figure } from './figures';

export interface DialogueView {
  kind: 'suspect' | 'witness';
  id: string;
  /** Which sub-menu is open, if any. */
  stage: 'choose' | 'lean' | 'pick-subject' | 'pick-object' | 'result' | 'show-result' | 'talk-result';
}

interface Person {
  id: string;
  kind: 'suspect' | 'witness';
  name: string;
  role: string;
  at: string;
  portrait: string;
  here: boolean;
  dead: boolean;
  intro: string;
  bio?: string;
  alibi?: string;
  status?: string;
}

function personOf(s: GameState, v: DialogueView): Person | null {
  const p = R.currentPlayer(s);
  if (!p) return null;
  const c = caseById(s.caseId);
  if (v.kind === 'suspect') {
    const x = s.suspects.find((y) => y.id === v.id);
    if (!x) return null;
    const d = c.suspects.find((q) => q.id === x.id);
    const out = R.isEliminated(s, x);
    return {
      id: x.id, kind: 'suspect', name: x.name, role: x.role, at: x.at, here: x.at === p.at && !x.dead, dead: x.dead,
      portrait: portraitSvg(x.id, { size: 230, known: x.known, traits: x.traits, muted: out }),
      intro: x.blurb, bio: d?.bio, alibi: d?.alibi,
      status: x.dead ? 'found dead' : x.cleared ? 'cleared' : out ? 'ruled out' : undefined,
    };
  }
  const w = R.witnessById(s, v.id);
  if (!w) return null;
  return {
    id: w.def.id, kind: 'witness', name: w.def.name, role: w.def.role, at: w.state.at, here: w.state.at === p.at, dead: false,
    portrait: portraitSvg(w.def.id, { size: 230, reveal: true }), intro: w.def.intro, bio: w.def.bio,
  };
}

function frame(s: GameState, who: Person, body: string, extraCls = ''): string {
  const p = R.currentPlayer(s);
  const ch = p ? characterById(p.charId) : null;
  const where = R.locationById(s, who.at)?.name ?? '';
  return `
    <div class="dlg dlg--${who.kind} ${extraCls}">
      <div class="dlg-stage">
        <span class="dlg-where">${icon('pin')} ${esc(where)} · ${R.clockAt(s.cold)}</span>
        <div class="dlg-char">${who.portrait}</div>
      </div>
      ${p && ch ? `<div class="dlg-you" style="--seat:${ch.color}">${portraitSvg(ch.id, { size: 64, frame: 'face', reveal: true, accent: ch.color })}<span>${esc(p.name)}</span></div>` : ''}
      <div class="dlg-box">
        <div class="dlg-name"><b>${esc(who.name)}</b><i>${esc(who.role)}${who.status ? ` · ${who.status}` : ''}</i></div>
        ${body}
      </div>
    </div>`;
}

/** What has been said, oldest first, so a conversation reads as one. */
function transcript(s: GameState, who: Person): string {
  const lines = R.askedTopics(s, who.id).map((t) => `
    <div class="tr">
      <p class="tr-q">${esc(t.q)}</p>
      <p class="tr-a">${esc(t.a)}</p>
    </div>`).join('');
  return lines ? `<div class="transcript">${lines}</div>` : '';
}

function knownChips(s: GameState, x: SuspectState): string {
  return `<div class="dlg-known">${s.chosenTraits.map((t) => {
    const k = x.known[t];
    return `<span class="chip ${k ? 'is-known' : ''}" title="${TRAITS[t].label}">${icon(TRAITS[t].icon)} ${k ? esc(traitLabel(t, x.traits[t])) : '?'}</span>`;
  }).join('')}</div>`;
}

const dossier = (who: Person) => who.bio || who.alibi
  ? `<div class="dossier-notes">${who.bio ? `<p>${esc(who.bio)}</p>` : ''}${who.alibi ? `<p><b>Says:</b> ${esc(who.alibi)}</p>` : ''}</div>` : '';

export function renderDialogue(s: GameState, v: DialogueView): string {
  const who = personOf(s, v);
  const p = R.currentPlayer(s);
  if (!who || !p) return '';
  const x = v.kind === 'suspect' ? s.suspects.find((y) => y.id === v.id) : undefined;

  // ---- not in front of you: the dossier, and how to get there.
  if (!who.here) {
    const where = R.locationById(s, who.at)?.name ?? '';
    const canGo = R.canMove(s, p, who.at);
    const cost = R.moveCost(s, p);
    return frame(s, who, `
      <p class="dlg-line">${who.dead ? `${esc(who.name)} is in the morgue.` : `${esc(who.name)} is at ${esc(where)}. You are not.`}</p>
      ${dossier(who)}
      ${x ? knownChips(s, x) : ''}
      ${transcript(s, who)}
      <div class="dlg-choices">
        ${!who.dead ? `<button class="btn btn--ghost" data-act="focus-loc" data-id="${esc(who.at)}">${icon('pin')} Show on map</button>` : ''}
        ${!who.dead && canGo ? `<button class="btn btn--hero" data-act="do-move" data-id="${esc(who.at)}">Go there <small>${cost === 0 ? 'free' : `${cost} hr`}</small></button>` : ''}
        <button class="btn btn--ghost" data-act="close-modal">Close</button>
      </div>`, who.dead || R.isEliminated(s, x as SuspectState) ? 'is-out' : '');
  }

  // ---- a result just came back
  if (v.stage === 'talk-result' && s.talking?.personId === who.id) {
    const t = s.talking;
    return frame(s, who, `
      ${transcript(s, who).replace(/<div class="tr">(?![\s\S]*<div class="tr">)/, '<div class="tr is-latest">')}
      ${t.outcome ? `<ul class="learned"><li class="learn"><span class="learn-face">${icon('badge')}</span><span class="learn-body"><b>${esc(t.outcome)}</b><i>Written in the journal.</i></span></li></ul>` : ''}
      <div class="dlg-choices">
        <button class="btn btn--hero" data-act="${v.kind === 'suspect' ? 'open-suspect' : 'open-witness'}" data-id="${esc(who.id)}">Keep talking</button>
        <button class="btn btn--ghost" data-act="close-modal">That will do</button>
      </div>`);
  }
  if (v.stage === 'result' && x && s.conversation?.suspectId === x.id) {
    const c = s.conversation;
    const approach = approachById(c.approach);
    const learned = c.learned.map((l) => {
      const w = s.suspects.find((y) => y.id === l.who) as SuspectState;
      return `<li class="learn"><span class="learn-face">${portraitSvg(w.id, { size: 40, frame: 'face', known: w.known, traits: w.traits })}</span>
        <span class="learn-body"><b>${esc(w.name)} — ${TRAITS[l.trait].label.toLowerCase()}: ${esc(traitLabel(l.trait, w.traits[l.trait]))}</b><i>${esc(traitValue(l.trait, w.traits[l.trait]).tell)}</i></span></li>`;
    }).join('');
    return frame(s, who, `
      <p class="dlg-ask"><span class="dlg-ask-who">${esc(p.name)} · ${esc(approach.label.toLowerCase())}</span>${esc(c.ask)}</p>
      <p class="dlg-line" data-type-target>${esc(c.reply)}</p>
      ${learned ? `<ul class="learned">${learned}</ul>` : '<p class="dlg-note">Nothing new. They have given you everything they have.</p>'}
      ${x.clammed ? `<p class="dlg-warn">${esc(x.name)} will not talk to you again for a while.</p>` : ''}
      <div class="dlg-choices">
        <button class="btn btn--hero" data-act="open-suspect" data-id="${x.id}">Keep talking</button>
        <button class="btn btn--ghost" data-act="close-modal">That will do</button>
      </div>`);
  }
  if (v.stage === 'result' && v.kind === 'witness' && s.testimony?.witnessId === who.id) {
    const t = s.testimony;
    let card = '';
    if (t.question === 'about' && t.trait && t.subjectId) {
      const w = s.suspects.find((y) => y.id === t.subjectId) as SuspectState;
      card = `<ul class="learned"><li class="learn"><span class="learn-face">${portraitSvg(w.id, { size: 40, frame: 'face', known: w.known, traits: w.traits })}</span>
        <span class="learn-body"><b>${esc(w.name)} — ${TRAITS[t.trait].label.toLowerCase()}: ${esc(traitLabel(t.trait, w.traits[t.trait]))}</b><i>Statement filed in the locker.</i></span></li></ul>`;
    } else if (t.question === 'lead' && t.locationId) {
      card = `<ul class="learned"><li class="learn learn--lead"><span class="learn-face">${icon('pin')}</span>
        <span class="learn-body"><b>Lead: ${esc(R.locationById(s, t.locationId)?.name ?? '')}</b><i>Marked on the map.</i></span>
        <button class="btn btn--small btn--ghost" data-act="focus-loc" data-id="${esc(t.locationId)}">Show me</button></li></ul>`;
    }
    return frame(s, who, `
      <p class="dlg-ask"><span class="dlg-ask-who">${esc(p.name)}</span>${esc(t.ask)}</p>
      <p class="dlg-line" data-type-target>${esc(t.reply)}</p>
      ${card}
      <div class="dlg-choices">
        <button class="btn btn--hero" data-act="open-witness" data-id="${who.id}">Keep talking</button>
        <button class="btn btn--ghost" data-act="close-modal">That will do</button>
      </div>`);
  }
  if (v.stage === 'show-result' && s.showing?.personId === who.id) {
    const sh = s.showing;
    const obj = R.objectDefs(s).find((o) => o.id === sh.objectId);
    return frame(s, who, `
      <div class="dlg-object">${obj ? figure(obj.drawing) : ''}<span>${esc(obj?.name ?? '')}</span></div>
      <p class="dlg-ask"><span class="dlg-ask-who">${esc(p.name)}</span>${esc(sh.line)}</p>
      <p class="dlg-line" data-type-target>${esc(sh.reply)}</p>
      ${sh.unlocked && sh.outcome ? `<ul class="learned"><li class="learn"><span class="learn-face">${icon('badge')}</span><span class="learn-body"><b>${esc(sh.outcome)}</b><i>Written in the journal.</i></span></li></ul>` : ''}
      <div class="dlg-choices">
        <button class="btn btn--hero" data-act="${v.kind === 'suspect' ? 'open-suspect' : 'open-witness'}" data-id="${esc(who.id)}">Keep talking</button>
        <button class="btn btn--ghost" data-act="close-modal">That will do</button>
      </div>`);
  }

  // ---- sub-menus
  const back = `<button class="choice choice--leave" data-act="${v.kind === 'suspect' ? 'open-suspect' : 'open-witness'}" data-id="${esc(who.id)}"><b>Back</b></button>`;
  if (v.stage === 'pick-object') {
    const list = R.showable(s, p, who.id).map((o) => `
      <button class="choice choice--object" data-act="do-show" data-object="${esc(o.id)}" data-person="${esc(who.id)}">
        <span class="choice-face">${figure(o.drawing)}</span><b>${esc(o.name)}</b><i>${esc(o.desc)} · 1 hour</i></button>`).join('');
    return frame(s, who, `<p class="dlg-line">What do you want to show them?</p><div class="dlg-choices dlg-choices--grid">${list}${back}</div>`);
  }
  if (v.stage === 'pick-subject' && v.kind === 'witness') {
    const w = R.witnessById(s, who.id);
    const list = (w?.canDescribe ?? []).map((y) => `
      <button class="choice choice--person" data-act="do-ask" data-id="${who.id}" data-q="about" data-suspect="${y.id}">
        <span class="choice-face">${portraitSvg(y.id, { size: 44, frame: 'face', known: y.known, traits: y.traits })}</span>
        <b>${esc(y.name)}</b><i>${esc(y.role)} · ${R.unknownTraits(s, y)} things still unknown · 1 hour</i></button>`).join('');
    return frame(s, who, `<p class="dlg-line">Who do you want to hear about?</p><div class="dlg-choices dlg-choices--grid">${list}${back}</div>`);
  }
  if (v.stage === 'lean' && x) {
    const can = R.canInterrogate(s, p, x);
    const list = can
      ? APPROACHES.map((a) => `<button class="choice" data-act="do-interrogate" data-id="${x.id}" data-approach="${a.id}"><b>${esc(a.label)}</b><i>${esc(a.hint)} · 1 hour</i></button>`).join('')
      : `<button class="choice is-off" disabled><b>${x.clammed ? 'They have stopped talking to you' : 'No time left this turn'}</b></button>`;
    return frame(s, who, `<p class="dlg-line">How do you play it?</p><div class="dlg-choices dlg-choices--grid">${list}${back}</div>`);
  }

  // ---- the conversation
  const topics = R.topicsFor(s, who.id);
  const spoken = R.askedTopics(s, who.id).length;
  const showables = R.showable(s, p, who.id);
  const w = v.kind === 'witness' ? R.witnessById(s, who.id) : null;
  const wCan = w ? R.canAsk(s, p, w) : false;
  const noTime = p.ap < 1;
  const questions = topics.map((t) => `
    <button class="choice choice--q ${t.cost && noTime ? 'is-off' : ''}" data-act="do-talk" data-id="${esc(who.id)}" data-topic="${esc(t.id)}" ${t.cost && noTime ? 'disabled' : ''}>
      <b>${esc(t.q)}</b><i>${t.cost ? `${t.cost} hour` : 'free'}</i></button>`).join('');
  const mechanics = [
    x && !x.dead ? `<button class="choice choice--lean ${R.canInterrogate(s, p, x) ? '' : 'is-off'}" data-act="lean" data-id="${x.id}" ${R.canInterrogate(s, p, x) ? '' : 'disabled'}><b>Lean on them</b><i>${x.clammed ? 'clammed up for now' : 'pick how hard · 1 hour'}</i></button>` : '',
    w && w.canDescribe.length ? `<button class="choice ${wCan ? '' : 'is-off'}" data-act="witness-pick" data-id="${who.id}" ${wCan ? '' : 'disabled'}><b>Who have you seen?</b><i>${w.canDescribe.length} ${w.canDescribe.length === 1 ? 'person' : 'people'} they can describe · 1 hour</i></button>` : '',
    w && w.canLead ? `<button class="choice ${wCan ? '' : 'is-off'}" data-act="do-ask" data-id="${who.id}" data-q="lead" ${wCan ? '' : 'disabled'}><b>Where should I be looking?</b><i>a place worth an hour</i></button>` : '',
    showables.length ? `<button class="choice choice--show ${noTime ? 'is-off' : ''}" data-act="pick-object" data-id="${who.id}" data-kind="${who.kind}" ${noTime ? 'disabled' : ''}><b>Show them something</b><i>${showables.length} in your pocket · 1 hour</i></button>` : '',
  ].join('');
  const patience = w ? `<span class="dlg-patience">${w.state.patience > 0 ? `will answer ${w.state.patience} more ${w.state.patience === 1 ? 'question' : 'questions'} that cost` : 'has said enough for now'}</span>` : '';

  return frame(s, who, `
    ${spoken ? '' : `<p class="dlg-line" data-type-target>${esc(who.intro)}</p>`}
    ${spoken ? '' : dossier(who)}
    ${x ? knownChips(s, x) : ''}
    ${transcript(s, who)}
    ${patience}
    <div class="dlg-choices dlg-choices--grid">
      ${questions}
      ${mechanics}
      <button class="choice choice--leave" data-act="close-modal"><b>${spoken ? 'That will do' : 'Leave it'}</b></button>
    </div>`, who.status && who.status !== 'cleared' ? 'is-out' : '');
}
