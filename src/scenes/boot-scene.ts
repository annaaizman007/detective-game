import Phaser from 'phaser';
import { FONTS } from '../config/asset-manifest';

/**
 * Boot waits for the web fonts, because the board draws street names and
 * district labels with them and Phaser bakes text into textures: a label
 * drawn before its font arrives stays in the fallback font.
 */
export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  create(): void {
    const wants = FONTS.flatMap((f) => f.weights.map((w) => `${w} 16px "${f.family}"`));
    const ready = typeof document !== 'undefined' && 'fonts' in document
      ? Promise.all(wants.map((f) => document.fonts.load(f).catch(() => null)))
      : Promise.resolve([]);
    // Never wait longer than a beat and a half; offline, the fallback is fine.
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => this.scene.start('preload'));
  }
}
