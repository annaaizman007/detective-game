// The deduction board. This is the actual game: facts about the killer across
// the top, what you know about each suspect down the side, and the crossings-out
// computed for you so nobody has to argue about who is still in the frame.

import { TRAITS, traitLabel } from '../traits.js';
import * as R from '../rules.js';
import { icon, portrait } from './icons.js';

export function renderNotebook(s, ui) {
  const traits = s.chosenTraits;
  const known = s.knownCulprit;
  const live = R.liveSuspects(s);

  const head = traits.map((t) => {
    const v = known[t];
    return `<th class="nb-th ${v ? 'is-known' : ''}" title="${TRAITS[t].label}">
      <span class="nb-th-ico">${icon(TRAITS[t].icon)}</span>
      <span class="nb-th-cat">${TRAITS[t].label}</span>
      <span class="nb-th-val">${v ? traitLabel(t, v) : '— unknown —'}</span>
    </th>`;
  }).join('');

  const rows = s.suspects.map((x) => {
    const out = R.isEliminated(s, x);
    const bad = R.contradictions(s, x);
    const cells = traits.map((t) => {
      const mine = x.known[t] ? x.traits[t] : null;
      const fact = known[t];
      let cls = 'nb-td';
      let mark = '';
      if (!mine) { cls += ' is-blank'; }
      else if (fact && mine !== fact) { cls += ' is-clash'; mark = '<span class="nb-x">✕</span>'; }
      else if (fact && mine === fact) { cls += ' is-fit'; mark = '<span class="nb-tick">✓</span>'; }
      else cls += ' is-noted';
      return `<td class="${cls}"><span class="nb-v">${mine ? traitLabel(t, mine) : '?'}</span>${mark}</td>`;
    }).join('');

    const status = x.dead ? 'DEAD' : x.cleared ? 'CLEARED' : bad.length ? 'RULED OUT' : 'IN THE FRAME';
    return `<tr class="nb-tr ${out ? 'is-out' : ''} ${ui.selectedSuspect === x.id ? 'is-sel' : ''}" data-suspect="${x.id}">
      <th class="nb-who" scope="row">
        <span class="nb-face">${portrait(x.id, out ? '#5b6472' : '#c8963e', 34)}</span>
        <span class="nb-id">
          <b>${x.name}</b>
          <i>${x.role}</i>
          <em class="nb-status">${status}</em>
        </span>
      </th>${cells}
    </tr>`;
  }).join('');

  const factCount = R.factsKnown(s);
  return `
    <div class="nb">
      <div class="nb-bar">
        <span class="nb-bar-l">${icon('badge')} ${factCount}/${traits.length} facts on the killer</span>
        <span class="nb-bar-r ${live.length === 1 ? 'is-solved' : ''}">
          ${live.length === 1 ? 'ONE NAME LEFT' : `${live.length} still in the frame`}
        </span>
      </div>
      <div class="nb-scroll">
        <table class="nb-table">
          <thead><tr><th class="nb-corner">Suspect</th>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="nb-foot">A red cross means their story cannot match the evidence — cross them off.
        ${traits.length > 3 ? 'Scroll the table sideways for the rest of the facts.' : ''}</p>
    </div>`;
}
