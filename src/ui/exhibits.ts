// The evidence locker and the document viewer.
//
// Every find is a piece of paper you can open: letterhead, typed heading, a
// table of fields, a sketch in the margin, the body, a stamp. The paper says
// what was observed and stops. Underneath it, the locker offers you the
// notebook -- mark what you conclude -- and, if you would rather be told, the
// examiner's own reading.

import type { ExhibitInstance, GameState, TraitId } from '../types/game-types';
import { exhibitById, fill, type ExhibitDef } from '../game/exhibits';
import { TRAITS, traitLabel } from '../game/traits';
import { caseById } from '../game/cases/index';
import { clockAt, locationById } from '../game/rules';
import { figure } from './figures';
import { icon } from './icons';
import { esc } from './fx';

export const letterOf = (i: number): string => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');

export interface LockerView {
  selectedExhibit: string | null;
  marks: Partial<Record<TraitId, string | null>>;
  assisted: boolean;
  revealed: Set<string>;
}

const KIND_LABEL: Record<string, string> = {
  report: 'Report', lab: 'Laboratory sheet', photo: 'Photograph', statement: 'Statement', telegram: 'Telegram',
  note: 'Note', ledger: 'Ledger page', receipt: 'Receipt', cast: 'Cast card', card: 'Card', letter: 'Letter',
  clipping: 'Clipping', ticket: 'Ticket',
};

function dataFor(inst: ExhibitInstance, s: GameState): Record<string, string> {
  const c = caseById(s.caseId);
  return { victim: c.victim, scene: locationById(s, c.scene)?.name ?? c.scene, ...(inst.data ?? {}) };
}

/** The list: everything filed, newest last, lettered. */
export function lockerList(s: GameState, v: LockerView): string {
  if (!s.exhibits.length) {
    return `<div class="locker-empty">${icon('lead')}<p>Nothing filed yet. Search a location, or ask around; whatever you find ends up here as a document you can open.</p></div>`;
  }
  const rows = s.exhibits.map((inst, i) => {
    const def = exhibitById(inst.def);
    const by = inst.by ? s.players.find((p) => p.id === inst.by)?.name : 'the city';
    const sel = v.selectedExhibit === inst.key;
    const marked = def.trait && v.marks[def.trait];
    return `<li class="ex ${sel ? 'is-sel' : ''} ex--${def.kind}" data-act="open-exhibit" data-key="${esc(inst.key)}">
      <span class="ex-letter">${letterOf(i)}</span>
      <span class="ex-main">
        <b>${esc(inst.label)}</b>
        <i>${KIND_LABEL[def.kind] ?? def.kind} · ${esc(locationById(s, inst.at)?.name ?? inst.at)} · ${clockAt(inst.hour)}${by ? ` · ${esc(by)}` : ''}</i>
      </span>
      <span class="ex-flag">${def.trait ? (marked ? `<em class="is-marked">${icon(TRAITS[def.trait].icon)} noted</em>` : `<em>${icon(TRAITS[def.trait].icon)} unread</em>`) : def.id === 'statement' ? '<em>testimony</em>' : ''}</span>
    </li>`;
  }).join('');
  return `<ul class="locker">${rows}</ul>`;
}

/** One document, as paper. */
export function documentHtml(inst: ExhibitInstance, def: ExhibitDef, s: GameState, letter: string): string {
  const data = dataFor(inst, s);
  const f = (t: string) => esc(fill(t, data));
  const fields = def.fields?.length
    ? `<table class="doc-fields">${def.fields.map(([k, val]) => `<tr><th>${f(k)}</th><td>${f(val)}</td></tr>`).join('')}</table>`
    : '';
  const fig = figure(def.figure);
  const by = inst.by ? s.players.find((p) => p.id === inst.by)?.name : null;
  const where = locationById(s, inst.at)?.name ?? inst.at;
  const body = def.body.map((p) => `<p>${f(p)}</p>`).join('');
  const stamp = def.stamp ? `<span class="doc-stamp doc-stamp--${def.stamp.toLowerCase()}">${def.stamp}</span>` : '';
  return `
  <article class="doc doc--${def.kind}">
    ${stamp}
    <header class="doc-head">
      <span class="doc-source">${f(def.source)}</span>
      <span class="doc-no">Exhibit ${letter}</span>
    </header>
    <h3 class="doc-title">${f(def.title)}</h3>
    ${fields}
    ${fig ? `<figure class="doc-fig">${fig}</figure>` : ''}
    <div class="doc-body">${body}</div>
    <footer class="doc-foot">
      <span>${by ? `Filed by ${esc(by)}` : 'Filed'} · ${esc(where)} · ${clockAt(inst.hour)}</span>
      <span class="doc-case">${esc(caseById(s.caseId).title)}</span>
    </footer>
  </article>`;
}

/** The viewer: the paper, and what the table makes of it. */
export function exhibitView(s: GameState, v: LockerView): string {
  const idx = s.exhibits.findIndex((e) => e.key === v.selectedExhibit);
  const inst = s.exhibits[idx];
  if (!inst) return '';
  const def = exhibitById(inst.def);
  const letter = letterOf(idx);
  const data = dataFor(inst, s);
  const prev = idx > 0 ? s.exhibits[idx - 1].key : null;
  const next = idx < s.exhibits.length - 1 ? s.exhibits[idx + 1].key : null;

  let below = '';
  if (def.trait) {
    const t = def.trait;
    const mark = v.marks[t] ?? null;
    const choices = TRAITS[t].values.map((val) => `
      <button class="mark ${mark === val.id ? 'is-on' : ''}" data-act="mark" data-trait="${t}" data-value="${val.id}">${esc(val.label)}</button>`).join('');
    const revealed = v.assisted || v.revealed.has(inst.key);
    below = `
      <section class="reading">
        <h4 class="sheet-h">${icon(TRAITS[t].icon)} What does this say about the killer’s ${TRAITS[t].label.toLowerCase()}?</h4>
        <div class="marks">${choices}<button class="mark mark--clear ${mark ? '' : 'is-on'}" data-act="mark" data-trait="${t}" data-value="">Not sure</button></div>
        ${revealed
          ? `<p class="reading-text"><b>The examiner’s reading:</b> ${esc(fill(def.reading, data))}</p>`
          : `<button class="btn btn--ghost btn--small" data-act="reveal-reading" data-key="${esc(inst.key)}">Show the examiner’s reading</button>
             <span class="reading-hint">Or work it out and mark the notebook yourself.</span>`}
      </section>`;
  } else if (def.reading) {
    below = `<section class="reading"><p class="reading-text">${esc(fill(def.reading, data))}</p></section>`;
  }

  return `
  <div class="viewer">
    <div class="viewer-bar">
      <button class="btn btn--ghost btn--small" data-act="close-exhibit">← Locker</button>
      <span class="viewer-nav">
        <button class="icon-btn" data-act="open-exhibit" data-key="${esc(prev ?? '')}" ${prev ? '' : 'disabled'} aria-label="Previous exhibit">‹</button>
        <span>${letter} of ${letterOf(s.exhibits.length - 1)}</span>
        <button class="icon-btn" data-act="open-exhibit" data-key="${esc(next ?? '')}" ${next ? '' : 'disabled'} aria-label="Next exhibit">›</button>
      </span>
      <button class="icon-btn" data-act="zoom-exhibit" title="Read it large">⤢</button>
    </div>
    <div class="viewer-paper">${documentHtml(inst, def, s, letter)}</div>
    ${below}
  </div>`;
}

export const markLabel = (t: TraitId, v: string | null | undefined): string => (v ? traitLabel(t, v) : '—');
