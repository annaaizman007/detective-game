// Every file the game can load, by key. Nearly everything on screen is
// generated -- icons, portraits, the map, the rain -- so this list is short,
// and every entry is optional: a missing file falls back to synthesis.
//
// Drop recordings here to use them instead of the synthesised versions:
//
//   public/assets/audio/sfx/rain.ogg        a real rain loop (CC0)
//   public/assets/audio/sfx/fire.ogg        a fireplace loop (CC0)
//   public/assets/audio/music/lounge.ogg    a slow noir piece, looped
//
// .mp3 works too; the loader tries each extension in turn.

export interface AudioAsset {
  key: string;
  /** Path under public/, without extension. */
  path: string;
  loop: boolean;
  optional: true;
}

export const AUDIO_ASSETS: Record<'rain' | 'fire' | 'music', AudioAsset> = {
  rain: { key: 'rain', path: 'assets/audio/sfx/rain', loop: true, optional: true },
  fire: { key: 'fire', path: 'assets/audio/sfx/fire', loop: true, optional: true },
  music: { key: 'music', path: 'assets/audio/music/lounge', loop: true, optional: true },
};

export const AUDIO_EXTENSIONS = ['ogg', 'mp3', 'wav'] as const;

/** The baked narration, produced by `npm run voices`. */
export const VOICE_BASE = 'voice/';

/** Fonts the DOM and the Phaser canvas both draw with; waited on at boot. */
export const FONTS = [
  { family: 'Oswald', weights: ['300', '400', '500', '600'] },
  { family: 'Special Elite', weights: ['400'] },
  { family: 'Inter', weights: ['400', '500', '600'] },
];
