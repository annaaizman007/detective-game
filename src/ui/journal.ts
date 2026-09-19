// The journal: every step the table took, in order, stamped with the hour,
// with room beside each for what you were thinking at the time. Exported as
// a case file you can keep.

import type { GameState, JournalEntry } from '../types/game-types';
import type { Note } from '../systems/save-manager';
import { clockAt, locationById } from '../game/rules';
import { caseById } from '../game/cases/index';
import { characterById } from '../game/characters';
import { exhibitById } from '../game/exhibits';
import { TRAITS, traitLabel } from '../game/traits';
import { icon } from './icons';
import { esc } from './fx';
import { letterOf } from './exhibits';

export interface JournalView {
  notes: Note[];
  editing: number | 'new' | null;
  filter: 'all' | 'mine' | 'finds' | 'people';
  marks: Partial<Record<string, string | null>>;
}

const KIND_ICON: Record<JournalEntry['kind'], string> = {
  open: 'badge', move: 'pin', search: 'lead', exhibit: 'note', talk: 'eye', ask: 'eye', show: 'hand', question: 'eye', ability: 'badge',
  accuse: 'skull', event: 'clock', end: 'badge', note: 'book',
};

const dayOf = (hour: number) => Math.floor((2 + hour) / 24) + 1;

export function renderJournal(s: GameState, v: JournalView): string {
  const entries = s.journal.filter((e) => {
    if (v.filter === 'finds') return e.kind === 'exhibit' || e.kind === 'search';
    if (v.filter === 'people') return e.kind === 'talk' || e.kind === 'ask' || e.kind === 'show' || e.kind === 'question';
    if (v.filter === 'mine') return e.playerId === s.players[s.turn]?.id;
    return true;
  });
  let lastDay = 0;
  const rows = entries.map((e) => {
    const p = e.playerId ? s.players.find((x) => x.id === e.playerId) : null;
    const ch = p ? characterById(p.charId) : null;
    const notes = v.notes.filter((n) => n.entry === e.n);
    const day = dayOf(e.hour);
    const dayHead = day !== lastDay ? `<li class="jr-day">${icon('clock')} Day ${day}</li>` : '';
    lastDay = day;
    const ref = e.ref?.exhibit
      ? `<button class="jr-ref" data-act="open-exhibit" data-key="${esc(e.ref.exhibit)}">${icon('note')} Open exhibit ${letterOf(s.exhibits.findIndex((x) => x.key === e.ref?.exhibit))}</button>`
      : e.ref?.suspect
        ? `<button class="jr-ref" data-act="open-suspect" data-id="${esc(e.ref.suspect)}">${icon('eye')} Dossier</button>`
        : e.ref?.location
          ? `<button class="jr-ref" data-act="open-loc" data-id="${esc(e.ref.location)}">${icon('pin')} ${esc(locationById(s, e.ref.location)?.name ?? '')}</button>`
          : '';
    const noteRows = notes.map((n) => `
      <div class="jr-note"><span class="jr-note-t">${esc(n.text)}</span>
        <button class="jr-note-x" data-act="note-delete" data-id="${esc(n.id)}" aria-label="Delete note">×</button></div>`).join('');
    const editor = v.editing === e.n
      ? `<form class="jr-editor" data-act="note-save" data-entry="${e.n}">
          <textarea name="text" rows="2" placeholder="What were you thinking?" aria-label="Note"></textarea>
          <span><button class="btn btn--small btn--hero" type="submit">Save</button>
          <button class="btn btn--small btn--ghost" type="button" data-act="note-cancel">Cancel</button></span>
        </form>`
      : `<button class="jr-add" data-act="note-edit" data-entry="${e.n}">${icon('book')} Add a note</button>`;
    return `${dayHead}<li class="jr jr--${e.kind}" style="--seat:${ch?.color ?? 'var(--brass)'}">
      <span class="jr-time">${clockAt(e.hour)}</span>
      <span class="jr-ico">${icon(KIND_ICON[e.kind])}</span>
      <div class="jr-body">
        <p class="jr-text">${p ? `<b>${esc(p.name)}</b> ` : ''}${esc(e.text)}</p>
        ${ref}${noteRows}${editor}
      </div>
    </li>`;
  }).join('');

  const free = v.notes.filter((n) => n.entry === null);
  const freeRows = free.map((n) => `
    <li class="jr jr--note"><span class="jr-time">${clockAt(n.hour)}</span><span class="jr-ico">${icon('book')}</span>
      <div class="jr-body"><div class="jr-note"><span class="jr-note-t">${esc(n.text)}</span>
        <button class="jr-note-x" data-act="note-delete" data-id="${esc(n.id)}" aria-label="Delete note">×</button></div></div></li>`).join('');

  const newNote = v.editing === 'new'
    ? `<form class="jr-editor jr-editor--new" data-act="note-save" data-entry="">
        <textarea name="text" rows="3" placeholder="A thought about the case — who you suspect, what does not add up." aria-label="New note"></textarea>
        <span><button class="btn btn--small btn--hero" type="submit">Save</button>
        <button class="btn btn--small btn--ghost" type="button" data-act="note-cancel">Cancel</button></span>
      </form>`
    : '';

  return `
    <div class="journal">
      <div class="jr-bar">
        <nav class="jr-filters">
          ${(['all', 'finds', 'people', 'mine'] as const).map((f) => `<button class="jr-filter ${v.filter === f ? 'is-on' : ''}" data-act="journal-filter" data-f="${f}">${f === 'all' ? 'Everything' : f === 'finds' ? 'Finds' : f === 'people' ? 'People' : 'My steps'}</button>`).join('')}
        </nav>
        <span class="jr-tools">
          <button class="btn btn--small btn--ghost" data-act="note-edit" data-entry="">${icon('book')} Note</button>
          <button class="btn btn--small btn--ghost" data-act="journal-export" title="Download the case file">↓ Export</button>
        </span>
      </div>
      ${newNote}
      <ol class="jr-list">${rows}${freeRows}</ol>
    </div>`;
}

/** The whole case as a text file: journal, exhibits, notebook, notes. */
export function exportJournal(s: GameState, notes: Note[], marks: Partial<Record<string, string | null>>): string {
  const c = caseById(s.caseId);
  const out: string[] = [];
  out.push(`THE ASHGRAVE FILES — ${c.title.toUpperCase()}`, c.subtitle, `Victim: ${c.victim}`, '');
  out.push('DETECTIVES', ...s.players.map((p) => `  ${p.name} (${characterById(p.charId).name})`), '');
  out.push('JOURNAL');
  for (const e of s.journal) {
    const p = e.playerId ? s.players.find((x) => x.id === e.playerId) : null;
    out.push(`  Day ${dayOf(e.hour)} ${clockAt(e.hour).padStart(8)}  ${p ? p.name + ': ' : ''}${e.text}`);
    for (const n of notes.filter((x) => x.entry === e.n)) out.push(`             > ${n.text}`);
  }
  const free = notes.filter((n) => n.entry === null);
  if (free.length) { out.push('', 'NOTES'); for (const n of free) out.push(`  ${clockAt(n.hour)}  ${n.text}`); }
  out.push('', 'EXHIBITS');
  s.exhibits.forEach((inst, i) => {
    const def = exhibitById(inst.def, s.caseId);
    out.push(`  ${letterOf(i)}. ${inst.label} — ${locationById(s, inst.at)?.name ?? inst.at}, ${clockAt(inst.hour)}`);
    for (const line of def.body) out.push(`       ${line.replace(/\{(\w+)\}/g, (m, k: string) => inst.data?.[k] ?? (k === 'victim' ? c.victim : m))}`);
  });
  out.push('', 'NOTEBOOK — the killer, as marked');
  for (const t of s.chosenTraits) out.push(`  ${TRAITS[t].label.padEnd(20)} ${marks[t] ? traitLabel(t, marks[t] as string) : '?'}`);
  out.push('', 'SUSPECTS');
  for (const x of s.suspects) {
    const known = s.chosenTraits.filter((t) => x.known[t]).map((t) => `${TRAITS[t].label.toLowerCase()}: ${traitLabel(t, x.traits[t])}`);
    out.push(`  ${x.name} (${x.role})${x.dead ? ' — dead' : x.cleared ? ' — cleared' : ''}`, `       ${known.length ? known.join('; ') : 'nothing known'}`);
  }
  return out.join('\n');
}
