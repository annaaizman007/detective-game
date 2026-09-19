// Numbers that several modules agree on.

/** The board is authored in this space; the Phaser world is the same size. */
export const BOARD = { w: 2400, h: 1700 };

export const ZOOM = { min: 0.35, max: 2.6, step: 1.18 };

/** Storage keys. One prefix so a clear is one loop. */
export const STORAGE = {
  prefix: 'ashgrave.',
  save: 'ashgrave.save.v2',
  settings: 'ashgrave.settings.v2',
} as const;

export const APP_VERSION = '2.0.0';
