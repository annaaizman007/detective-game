// The one helper the case files share with the locker. Kept alone so a case
// file can import it without pulling in the locker, which imports the cases.

import type { ExhibitDef, TraitId } from '../types/game-types';

export const clue = (
  trait: TraitId,
  value: string,
  def: Omit<ExhibitDef, 'id' | 'trait' | 'value'>,
): ExhibitDef => ({ id: `clue:${trait}:${value}`, trait, value, ...def });
