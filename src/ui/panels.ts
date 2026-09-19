// Sheets that are not conversations: a location, the accusation, an ability.

import type { GameState } from '../types/game-types';
import { characterById } from '../game/characters';
import * as R from '../game/rules';
import { icon, locIcon } from './icons';
import { buildingHtml } from './buildings';
import { portraitSvg } from './portraits';
import { esc } from './fx';
import type { Profile } from '../game/rules';

export function locationPanel(s: GameState, locId: string, profile: Profile): string {
  const p = R.currentPlayer(s);
  const l = R.locationById(s, locId);
  if (!l || !p) return '';
  const here = p.at === l.id;
  const canGo = R.canMove(s, p, l.id);
  const cost = R.moveCost(s, p);
  const people = R.suspectsAt(s, l.id);
  const rec = R.searchRecord(s, l.id);
  const w = R.witnessAt(s, l.id);
  const finds = s.exhibits.filter((e) => e.at === l.id);

  const witness = w ? `
    <h4 class="sheet-h">Someone to ask</h4>
    <div class="wit">
      <span class="wit-face">${portraitSvg(w.def.id, { size: 56, frame: 'face', reveal: true })}</span>
      <span class="wit-n"><b>${esc(w.def.name)}</b><i>${esc(w.def.role)}</i>
        <em>${w.state.patience > 0 ? `Will answer ${w.state.patience} more ${w.state.patience === 1 ? 'question' : 'questions'}` : 'Has said enough for now'}</em></span>
      <button class="btn btn--small ${here && R.canAsk(s, p, w) ? '' : 'is-off'}" data-act="open-witness" data-id="${w.def.id}">
        ${here ? 'Talk' : 'Not with you'}</button>
    </div>` : '';

  return `
    <div class="sheet sheet--loc">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <div class="loc-pic">${buildingHtml(s.caseId, l, 560)}<span class="loc-pic-cap">${locIcon(l.type)} ${esc(l.district ?? '')}</span></div>
      <h3>${esc(l.name)}</h3>
      <p class="sheet-lead">${esc(l.desc)}</p>
      <p class="sheet-tags">
        ${s.sealed[l.id] ? '<span class="tag tag--bad">Sealed off</span>' : ''}
        ${s.leads[l.id] ? '<span class="tag tag--lead">A witness pointed here</span>' : ''}
        ${rec.empty ? '<span class="tag">Picked clean</span>' : rec.times ? `<span class="tag">Searched ${rec.times}×</span>` : '<span class="tag tag--new">Never searched</span>'}
        ${here ? '<span class="tag tag--you">You are here</span>' : ''}
        ${finds.length ? `<span class="tag">${finds.length} ${finds.length === 1 ? 'exhibit' : 'exhibits'} found here</span>` : ''}
      </p>
      <div class="sheet-actions">
        ${here
          ? `<button class="btn ${R.canSearch(s, p) ? 'btn--hero' : 'is-off'}" data-act="do-search" ${R.canSearch(s, p) ? '' : 'disabled'}>
              ${R.looksExhausted(s, l.id) ? 'Nothing left here' : 'Search this place'} <small>1 hr</small></button>`
          : `<button class="btn ${canGo ? 'btn--hero' : 'is-off'}" data-act="do-move" data-id="${l.id}" ${canGo ? '' : 'disabled'}>
              ${canGo ? `Go there <small>${cost === 0 ? 'free' : `${cost} hr`}</small>` : s.sealed[l.id] ? 'Sealed off' : 'Too far this turn'}</button>`}
        <button class="btn btn--ghost" data-act="focus-loc" data-id="${l.id}">${icon('pin')} Show on map</button>
      </div>
      ${witness}
      <h4 class="sheet-h">Who is here</h4>
      ${people.length ? `<ul class="minilist">${people.map((x) => {
        const can = R.canInterrogate(s, p, x);
        const out = R.isEliminated(s, x, profile);
        return `<li class="${out ? 'is-out' : ''}">
          <span class="ml-face">${portraitSvg(x.id, { size: 36, frame: 'face', known: x.known, traits: x.traits, muted: out })}</span>
          <span class="ml-n"><b>${esc(x.name)}</b><i>${esc(x.role)}</i></span>
          <button class="btn btn--small ${can ? '' : 'is-off'}" data-act="open-suspect" data-id="${x.id}">
            ${!here ? 'Dossier' : x.clammed ? 'Clammed up' : can ? 'Talk to them' : 'Dossier'}
          </button>
        </li>`;
      }).join('')}</ul>` : '<p class="sheet-note">None of the suspects are here right now.</p>'}
    </div>`;
}

export function accusePanel(s: GameState, profile: Profile): string {
  const live = R.liveSuspects(s, profile);
  return `
    <div class="sheet sheet--accuse">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <h3>Name your killer</h3>
      <p class="sheet-lead">Two hours to make the case. Get it wrong and you lose three more, and they walk.</p>
      ${live.length > 1 ? `<p class="warn">${live.length} suspects still fit your notebook. This is a guess.</p>` : ''}
      <ul class="minilist">${s.suspects.filter((x) => !x.dead && !x.cleared).map((x) => {
        const out = R.isEliminated(s, x, profile);
        return `<li class="${out ? 'is-out' : ''}">
          <span class="ml-face">${portraitSvg(x.id, { size: 36, frame: 'face', known: x.known, traits: x.traits, muted: out })}</span>
          <span class="ml-n"><b>${esc(x.name)}</b><i>${out ? 'Ruled out by your notebook' : esc(x.role)}</i></span>
          <button class="btn btn--small btn--danger" data-act="do-accuse" data-id="${x.id}">Accuse</button>
        </li>`;
      }).join('')}</ul>
    </div>`;
}

export function abilityPanel(s: GameState, profile: Profile): string {
  const p = R.currentPlayer(s);
  if (!p) return '';
  const ch = characterById(p.charId);
  const need = R.abilityTarget(p.charId);
  let list = '';
  if (need === 'location') {
    list = `<ul class="minilist">${s.map.locations.filter((l) => l.id !== p.at).map((l) => `
      <li><span class="ml-face ml-face--loc">${locIcon(l.type)}</span>
        <span class="ml-n"><b>${esc(l.name)}</b><i>${s.leads[l.id] ? 'A witness pointed here' : R.looksExhausted(s, l.id) ? 'Picked clean' : R.searchRecord(s, l.id).times ? 'Searched before' : 'Never searched'}</i></span>
        <button class="btn btn--small" data-act="do-ability" data-id="${l.id}">Break in</button></li>`).join('')}</ul>`;
  } else {
    const pool = need === 'suspect-here' ? R.suspectsAt(s, p.at) : s.suspects.filter((x) => !x.dead);
    list = `<ul class="minilist">${pool.map((x) => {
      const out = R.isEliminated(s, x, profile);
      return `<li class="${out ? 'is-out' : ''}">
        <span class="ml-face">${portraitSvg(x.id, { size: 36, frame: 'face', known: x.known, traits: x.traits, muted: out })}</span>
        <span class="ml-n"><b>${esc(x.name)}</b><i>${esc(x.role)}</i></span>
        <button class="btn btn--small" data-act="do-ability" data-id="${x.id}">Choose</button></li>`;
    }).join('')}</ul>`;
  }
  return `
    <div class="sheet">
      <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
      <h3>${esc(ch.abilityName)}</h3>
      <p class="sheet-lead">${esc(ch.abilityText)}</p>
      <p class="sheet-note">Costs one hour, and ${esc(ch.short)} can only do it once this case.</p>
      ${list}
    </div>`;
}
