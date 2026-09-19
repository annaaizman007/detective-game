import type { CaseDef } from '../../types/game-types';
import orchid from './orchid';
import salt from './salt';
import bell from './bell';

export const CASES: CaseDef[] = [orchid, salt, bell];
export const caseById = (id: string): CaseDef => CASES.find((c) => c.id === id) || CASES[0];
