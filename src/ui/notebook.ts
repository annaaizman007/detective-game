// The deduction board.
//
// Facts about the killer across the top, what you know about each suspect
// down the side, and the crossings-out. In the assisted notebook the top row
// is filled from the evidence; in the detective's own notebook you fill it
// in yourself from what the exhibits say -- and if you read one wrong, the
// wrong person gets crossed off. That is the game.

import type { GameState, TraitId } from '../types/game-types';
import { TRAITS, traitLabel } from '../game/traits';
import * as R from '../game/rules';
import { icon } from './icons';
import { portraitSvg } from './portraits';
import { esc } from './fx';

export interface NotebookView {
  selectedSuspect: string | null;
  marks: Partial<Record<TraitId, string | null>>;
  assisted: boolean;
}

/** The profile the table is working from. */
export const profileOf = (s: GameState, v: { marks: NotebookView['marks']; assisted: boolean }): R.Profile =>
  v.assisted ? s.knownCulprit : v.marks;

export function renderNotebook(s: GameState, v: NotebookView): string {
  const traits = s.chosenTraits;
  const profile = profileOf(s, v);
  const live = R.liveSuspects(s, profile);
  const exhibitsFor = (t: TraitId) => s.exhibits.filter((e) => e.def === `clue:${t}:${s.knownCulprit[t]}`).length;

  const head = traits.map((t) => {
    const val = profile[t] ?? null;
    const cls = val ? 'is-known' : '';
    const pick = v.assisted
      ? `<span class="nb-th-val">${val ? esc(traitLabel(t, val)) : '— unknown —'}</span>`
      : `<select class="nb-pick" data-act="mark-select" data-trait="${t}" aria-label="Killer's ${TRAITS[t].label}">
          <option value="" ${val ? '' : 'selected'}>— ? —</option>
          ${TRAITS[t].values.map((x) => `<option value="${x.id}" ${val === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}
        </select>`;
    const has = exhibitsFor(t);
    return `<th class="nb-th ${cls} ${has && !val && !v.assisted ? 'has-exhibit' : ''}" title="${TRAITS[t].label}">
      <span class="nb-th-ico">${icon(TRAITS[t].icon)}</span>
      <span class="nb-th-cat">${TRAITS[t].label}</span>
      ${pick}
      ${has && !v.assisted ? `<span class="nb-th-ex" title="An exhibit in the locker speaks to this">${has} in locker</span>` : ''}
    </th>`;
  }).join('');

  const rows = R.knownSuspects(s).map((x) => {
    const out = R.isEliminated(s, x, profile);
    const bad = R.contradictions(s, x, profile);
    const cells = traits.map((t) => {
      const mine = x.known[t] ? x.traits[t] : null;
      const fact = profile[t];
      let cls = 'nb-td';
      let mark = '';
      if (!mine) cls += ' is-blank';
      else if (fact && mine !== fact) { cls += ' is-clash'; mark = '<span class="nb-x">✕</span>'; }
      else if (fact && mine === fact) { cls += ' is-fit'; mark = '<span class="nb-tick">✓</span>'; }
      else cls += ' is-noted';
      return `<td class="${cls}"><span class="nb-v">${mine ? esc(traitLabel(t, mine)) : '?'}</span>${mark}</td>`;
    }).join('');
    const status = x.dead ? 'DEAD' : x.cleared ? 'CLEARED' : bad.length ? 'RULED OUT' : 'IN THE FRAME';
    return `<tr class="nb-tr ${out ? 'is-out' : ''} ${v.selectedSuspect === x.id ? 'is-sel' : ''}" data-act="open-suspect" data-id="${x.id}">
      <th class="nb-who" scope="row">
        <span class="nb-face">${portraitSvg(x.id, { size: 36, frame: 'face', known: x.known, traits: x.traits, muted: out })}</span>
        <span class="nb-id"><b>${esc(x.name)}</b><i>${esc(x.role)}</i><em class="nb-status">${status}</em></span>
      </th>${cells}
    </tr>`;
  }).join('');

  const marked = traits.filter((t) => profile[t]).length;
  const missing = R.everyoneCrossedOff(s, profile);
  return `
    <div class="nb">
      <div class="nb-bar">
        <span class="nb-bar-l">${icon('badge')} ${marked}/${traits.length} ${v.assisted ? 'facts established' : 'facts marked'}</span>
        <span class="nb-bar-r ${live.length === 1 ? 'is-solved' : ''} ${missing ? 'is-missing' : ''}">
          ${missing ? 'NOBODY LEFT — SOMEBODY IS MISSING' : live.length === 1 ? 'ONE NAME LEFT' : `${live.length} still in the frame`}
        </span>
      </div>
      ${missing ? `<p class="nb-missing">Every name on this table is crossed off, and the evidence still describes somebody. There is a person in this city you have not found yet. Somebody knows where. Ask around.</p>` : ''}
      <div class="nb-scroll">
        <table class="nb-table">
          <thead><tr><th class="nb-corner">Suspect</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="nb-foot">
        ${v.assisted
          ? 'The evidence fills the top row for you. A red cross means their story cannot match it.'
          : 'Read the exhibits and fill the top row yourself. Cross-outs follow <em>your</em> marks — read a document wrong and the wrong name comes off.'}
        <label class="nb-mode"><input type="checkbox" data-act="toggle-assisted" ${v.assisted ? 'checked' : ''}> Assisted notebook</label>
      </p>
    </div>`;
}
