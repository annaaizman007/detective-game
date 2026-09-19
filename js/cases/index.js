import orchid from './orchid.js';
import salt from './salt.js';
import bell from './bell.js';

export const CASES = [orchid, salt, bell];
export const caseById = (id) => CASES.find((c) => c.id === id) || CASES[0];
