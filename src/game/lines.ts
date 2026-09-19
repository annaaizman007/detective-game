// The narration corpus.
//
// Every line the narrator can say is either a fixed string from the content
// files or a fixed string combined with a name the case already knows. That
// makes the whole script enumerable ahead of time -- which is what lets
// tools/render-voices.mjs bake it to audio with a real TTS model, and lets
// systems/narrator.ts play those files back instead of synthesising on the fly.
//
// Both sides must agree exactly on the id for a line, so normalisation and
// hashing live here and nowhere else.

import type { TraitId } from '../types/game-types';
import { TRAITS, traitLabel } from './traits';
import { EVENTS } from './events';
import { BOONS } from './gen';
import { CHARACTERS } from './characters';
import { CASES } from './cases/index';
import { allDialogueLines } from './dialogue';
import { allClueExhibits, allExhibitFragments } from './exhibits';
import { allSearchLines } from './search';
import { allWitnessLines, WITNESS_ASKS } from './witnesses';
import { lookFor } from '../ui/portraits';

/** Must match on the renderer and in the browser, or nothing lines up. */
export function normaliseLine(text: string): string {
  return String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Who says a line: the narrator, or a woman in the case (her own voice). Men share the narrator's. */
export type Voice = 'n' | 'f';

/** FNV-1a, 32 bit, hex. Short, stable, and good enough for a few thousand lines. A woman's reading of a line is its own clip. */
export function clipId(text: string, voice: Voice = 'n'): string {
  const s = voice === 'n' ? normaliseLine(text) : `${voice}|${normaliseLine(text)}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const traitFact = (traitId: TraitId, valueId: string): string =>
  `${TRAITS[traitId].label}: ${traitLabel(traitId, valueId)}.`;

export const traitPhrase = (traitId: TraitId, valueId: string): string =>
  `${TRAITS[traitId].label.toLowerCase()}, ${traitLabel(traitId, valueId).toLowerCase()}`;

/** Fixed lines that do not come from any content file. */
const STOCK = [
  'The note says nothing you had not already worked out.',
  'The note names a fact about your killer.',
  'The trail warms up. You have bought yourself time.',
  'A second wind. One more action, and it costs nothing.',
  'The ledger gives somebody up.',
  'The ledger tells you nothing new.',
  'It has been turned over twice already.',
  'Nothing left at',
  'has nothing left to give. You already have all of it.',
  'by the sound of it,',
  'does not deny it.',
  'did it',
  'is not your killer, and now every lawyer in Ashgrave knows your name. Three more hours gone.',
  'Hale looks at',
  'for a long moment and says nothing at all. It is them. Everything about them matches.',
  'Thirty-one years of instinct says',
  'did not do this. Cross them off.',
  'Vale goes back to the body and finds what the first pass missed.',
  'The body has nothing left to say.',
  'Crane puts it above the fold. The whole city is looking now, and looking buys you time.',
  'has already told you everything. Kell gives them absolution anyway.',
  'tells Kell all of it:',
  'Quist puts out the bulletin. Two hours later',
  'is sitting across from her at',
  'and not going anywhere.',
  'The caller told you nothing you did not already have.',
  'The caller knew something:',
  'Nothing in it you had not already written down.',
  'This time the body is nobody you were looking for.',
  'is dead. Whoever you are hunting, it was not them.',
  'is sealed off.',
  'Moving costs one extra action next round.',
  'The trail cools by an extra step.',
  'Every suspect has moved twice.',
  'Every detective works one action short next round.',
  'It gives something away.',
  'It points at',
  'It saves you time.',
  'It costs you time.',
  'It gives something away.',
  'Ashgrave Bay, two in the morning, and it is still raining.',
  'Dispatch to all cars. A woman is dead at the Gilded Hotel, and nobody heard a thing. Take it slow, detective — this one has lawyers.',
];

export interface CorpusLine {
  id: string;
  text: string;
  group: string;
  voice: Voice;
}

/** The voice a person speaks in, from the same table the portraits use. */
export const voiceOf = (personId: string): Voice => (lookFor(personId).fem ? 'f' : 'n');

/**
 * Every line that can be spoken, deduplicated. Order is stable so a re-render
 * of an unchanged script produces an unchanged manifest.
 */
export function collectLines(): CorpusLine[] {
  const out = new Map<string, CorpusLine>();
  const add = (text: string, group: string, voice: Voice = 'n') => {
    const t = normaliseLine(text);
    const key = voice === 'n' ? t : `${voice}|${t}`;
    if (t && !out.has(key)) out.set(key, { id: clipId(t, voice), text: t, group: voice === 'n' ? group : `${group}-${voice}`, voice });
  };

  STOCK.forEach((t) => add(t, 'stock'));

  for (const trait of Object.values(TRAITS)) {
    for (const v of trait.values) {
      add(v.clue, 'evidence');
      add(v.tell, 'tell');
      add(traitFact(trait.id, v.id), 'fact');
      add(traitPhrase(trait.id, v.id), 'fact');
    }
  }

  for (const ex of allClueExhibits()) if (ex.spoken) add(ex.spoken, 'evidence');
  for (const frag of allExhibitFragments()) add(frag, 'paper');
  for (const line of allSearchLines()) add(line, 'search');
  for (const ev of EVENTS) add(`${ev.title.toUpperCase()}. ${ev.text}`, 'event');
  for (const b of Object.values(BOONS)) add(b.text, 'evidence');
  // Stock replies and shrugs are said by whoever is being questioned, so both voices.
  for (const line of allDialogueLines()) { add(line, 'dialogue'); add(line, 'dialogue', 'f'); }
  for (const line of allWitnessLines()) { add(line, 'witness'); add(line, 'witness', 'f'); }
  for (const c of CHARACTERS) { add(c.short, 'name'); add(c.name, 'name'); }

  for (const c of CASES) {
    add(`Ashgrave Bay. ${c.title}.`, 'briefing');
    add(c.briefing, 'briefing');
    c.call.lines.forEach((l) => add(l, 'briefing'));
    add(c.victim, 'name');
    c.radio.forEach((r) => add(r, 'briefing'));
    add(c.epilogue.win, 'epilogue');
    add(c.epilogue.loss, 'epilogue');
    c.locations.forEach((l) => add(l.name, 'name'));
    c.suspects.forEach((sx) => {
      add(sx.name, 'name');
      add(sx.name.split(' ').slice(-1)[0], 'name');
      add(sx.motive, 'motive');
    });
    // What a person says is baked in that person's voice. Questions are the
    // detective's and stay with the narrator.
    c.witnesses.forEach((w) => {
      const v = voiceOf(w.id);
      add(w.intro, 'witness', v);
      add(w.aboutLine, 'witness', v);
      add(w.leadLine, 'witness', v);
      add(w.spentLine, 'witness', v);
      Object.values(w.opinions ?? {}).forEach((o) => add(o, 'witness', v));
      (w.topics ?? []).forEach((t) => { add(t.q, 'dialogue'); add(t.a, 'witness', v); });
      if (v === 'f') {
        // A woman describing a suspect says the name, the tell and the shrug herself.
        c.suspects.forEach((sx) => { add(sx.name, 'name', v); add(sx.name.split(' ').slice(-1)[0], 'name', v); });
        for (const trait of Object.values(TRAITS)) for (const val of trait.values) add(val.tell, 'tell', v);
        add(WITNESS_ASKS.nothing, 'witness', v);
        c.locations.forEach((l) => add(l.name, 'name', v));
      }
    });
    c.suspects.forEach((x) => {
      const v = voiceOf(x.id);
      Object.values(x.opinions ?? {}).forEach((o) => add(o, 'dialogue', v));
      (x.topics ?? []).forEach((t) => { add(t.q, 'dialogue'); add(t.a, 'dialogue', v); });
    });
    c.objects.forEach((o) => {
      add(o.spoken, 'evidence');
      o.unlocks.forEach((u) => {
        add(u.line, 'dialogue');
        add(u.reply, 'dialogue', voiceOf(u.person));
      });
    });
  }

  return [...out.values()];
}
