// The evidence locker and the document viewer.
//
// Every find is a piece of paper you can open: letterhead, typed heading, a
// table of fields, a sketch in the margin, the body, a stamp. The paper says
// what was observed and stops. Underneath it, the locker offers you the
// notebook -- mark what you conclude -- and, if you would rather be told, the
// examiner's own reading.

import type { ExhibitInstance, GameState, TraitId } from '../types/game-types';
import { exhibitById, fill, type ExhibitDef } from '../game/exhibits';
import { searchNarrative } from '../game/search';
import { TRAITS, traitLabel } from '../game/traits';
import { caseById } from '../game/cases/index';
import { clockAt, startHour, locationById, heldObjects } from '../game/rules';
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

/** The things the table is carrying. */
function objectsHtml(s: GameState): string {
  const held = heldObjects(s);
  if (!held.length) return '';
  return `<h4 class="locker-h">${icon('hand')} In your pockets</h4>
    <ul class="objects">${held.map((o) => {
      const shownTo = (s.shown[o.id] || []).length;
      return `<li class="obj">
        <span class="obj-fig">${figure(o.drawing)}</span>
        <span class="obj-main"><b>${esc(o.name)}</b><i>${esc(o.desc)}</i>
          <em>${shownTo ? `Shown to ${shownTo} ${shownTo === 1 ? 'person' : 'people'}.` : 'Show it to somebody. The right somebody will know it.'}</em></span>
      </li>`;
    }).join('')}</ul>`;
}

/** The list: everything filed, newest last, lettered. */
export function lockerList(s: GameState, v: LockerView): string {
  const objects = objectsHtml(s);
  if (!s.exhibits.length) {
    return `${objects}<div class="locker-empty">${icon('lead')}<p>Nothing filed yet. Search a location, or ask around; whatever you find ends up here as a document you can open.</p></div>`;
  }
  const rows = s.exhibits.map((inst, i) => {
    const def = exhibitById(inst.def, s.caseId);
    const by = inst.by ? s.players.find((p) => p.id === inst.by)?.name : 'the city';
    const sel = v.selectedExhibit === inst.key;
    const marked = def.trait && v.marks[def.trait];
    return `<li class="ex ${sel ? 'is-sel' : ''} ex--${def.kind}" data-act="open-exhibit" data-key="${esc(inst.key)}">
      <span class="ex-letter">${letterOf(i)}</span>
      <span class="ex-main">
        <b>${esc(inst.label)}</b>
        <i>${KIND_LABEL[def.kind] ?? def.kind} · ${esc(locationById(s, inst.at)?.name ?? inst.at)} · ${clockAt(inst.hour, startHour(s))}${by ? ` · ${esc(by)}` : ''}</i>
      </span>
      <span class="ex-flag">${def.trait ? (marked ? `<em class="is-marked">${icon(TRAITS[def.trait].icon)} noted</em>` : `<em>${icon(TRAITS[def.trait].icon)} unread</em>`) : def.id === 'statement' ? '<em>testimony</em>' : ''}</span>
    </li>`;
  }).join('');
  return `${objects}${objects ? `<h4 class="locker-h">${icon('note')} Filed</h4>` : ''}<ul class="locker">${rows}</ul>`;
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
      <span>${by ? `Found by ${esc(by)} at ${esc(where)}` : `From ${esc(where)}`}, ${clockAt(inst.hour, startHour(s))}</span>
      <span class="doc-case">${esc(caseById(s.caseId).title)}</span>
    </footer>
    ${inst.how ? `<p class="doc-how"><b>How it came to hand.</b> ${esc(inst.how)}</p>` : ''}
  </article>`;
}

/** The viewer: the paper, and what the table makes of it. */
export function exhibitView(s: GameState, v: LockerView): string {
  const idx = s.exhibits.findIndex((e) => e.key === v.selectedExhibit);
  const inst = s.exhibits[idx];
  if (!inst) return '';
  const def = exhibitById(inst.def, s.caseId);
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
      <button class="icon-btn" data-act="read-aloud" data-key="${esc(inst.key)}" title="The narrator reads it out">${icon('speaker')}</button>
      <button class="icon-btn" data-act="zoom-exhibit" title="Read it large">⤢</button>
    </div>
    <div class="viewer-paper">${documentHtml(inst, def, s, letter)}</div>
    ${below}
  </div>`;
}

export const markLabel = (t: TraitId, v: string | null | undefined): string => (v ? traitLabel(t, v) : '—');

/** Where you looked and what you found, before it goes in the locker. */
export function foundSheet(s: GameState, f: { location: string; exhibits: string[]; objects: string[]; by: string }): string {
  const loc = locationById(s, f.location);
  const rec = s.searched[f.location] || { times: 0, empty: false };
  const docs = f.exhibits.map((key) => {
    const i = s.exhibits.findIndex((e) => e.key === key);
    const inst = s.exhibits[i];
    if (!inst) return '';
    const def = exhibitById(inst.def, s.caseId);
    const hint = def.trait ? 'Read it. Then mark what it says about the killer in the Notebook.'
      : def.id.startsWith('boon:') ? 'Read it in the Locker.' : 'Read it in the Locker. It may matter, or it may only be paper.';
    return `<li class="found-i">
      <span class="ex-letter">${letterOf(i)}</span>
      <span class="ex-main"><b>${esc(inst.label)}</b><i>${esc(KIND_LABEL[def.kind] ?? def.kind)}</i><em>${esc(hint)}</em></span>
      <span class="found-btns">
        <button class="btn btn--small btn--hero" data-act="open-exhibit" data-key="${esc(key)}">Read it</button>
        <button class="btn btn--small btn--ghost" data-act="read-aloud" data-key="${esc(key)}" title="The narrator reads it out">${icon('speaker')} Read to me</button>
      </span>
    </li>`;
  }).join('');
  const objs = f.objects.map((id) => {
    const o = heldObjects(s).find((x) => x.id === id);
    if (!o) return '';
    return `<li class="found-i">
      <span class="obj-fig">${figure(o.drawing)}</span>
      <span class="ex-main"><b>${esc(o.name)}</b><i>${esc(o.desc)}</i><em>You are carrying it. Show it to someone. The right person will recognise it.</em></span>
    </li>`;
  }).join('');
  const nothing = !docs && !objs;
  const count = f.exhibits.length + f.objects.length;
  const story = searchNarrative(f.location, loc?.type ?? 'office', rec.times, count > 0);
  return `
  <div class="sheet sheet--found">
    <button class="sheet-x" data-act="close-modal" aria-label="Close">×</button>
    <p class="dossier-dept">${esc(f.by)} searched</p>
    <h3>${esc(loc?.name ?? f.location)}</h3>
    <div class="found-story">
      <p><b>Where you looked.</b> ${esc(story.looked)}</p>
      ${story.off ? `<p><b>What looked off.</b> ${esc(story.off)}</p>` : ''}
      <p><b>What turned up.</b> ${nothing
        ? (rec.times <= 1 ? 'Nothing. Not every door in this city has something behind it.' : 'Nothing. The place has been turned over already; there is nothing left here.')
        : `${count === 1 ? 'One thing' : `${count} things`}${rec.empty ? '. That is everything this place had.' : '. There may be more; a second search would say.'}`}</p>
    </div>
    ${docs ? `<h4 class="sheet-h">Documents</h4><ul class="found">${docs}</ul>` : ''}
    ${objs ? `<h4 class="sheet-h">Objects</h4><ul class="found">${objs}</ul>` : ''}
    <div class="sheet-actions">
      <button class="btn btn--ghost" data-act="close-modal">Back to the map</button>
    </div>
  </div>`;
}
