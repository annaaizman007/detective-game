import Phaser from 'phaser';
import { CASES } from '../game/cases/index';
import { CHARACTERS } from '../game/characters';
import { iconSvg, svgDataUri, ICON_NAMES } from '../ui/icons';
import { portraitSvg } from '../ui/portraits';

export const INK = '#2a2118';

/**
 * Nothing here comes off the network: every texture is rasterised from the
 * same SVG the DOM uses, so the board and the panels share one set of marks
 * and there is no asset folder to keep in step.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() { super('preload'); }

  preload(): void {
    // A progress bar, for the principle of the thing: this takes a moment.
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0xc8963e, 0.6);
      bar.fillRect(width / 2 - 80, height - 26, 160 * v, 3);
    });
    this.load.on('complete', () => bar.destroy());

    for (const name of ICON_NAMES) {
      this.load.svg(`ico-${name}`, svgDataUri(iconSvg(name, INK, 64, 1.6)), { width: 64, height: 64 });
    }
    // Faces for the chips: the "unknown" drawing, so the map never gives
    // away a trait the table has not established.
    for (const c of CASES) {
      for (const x of c.suspects) this.load.svg(`face-${x.id}`, svgDataUri(portraitSvg(x.id, { size: 72, frame: 'face' })), { width: 72, height: 72 });
      for (const w of c.witnesses) this.load.svg(`face-${w.id}`, svgDataUri(portraitSvg(w.id, { size: 72, frame: 'face', reveal: true })), { width: 72, height: 72 });
    }
    for (const d of CHARACTERS) {
      this.load.svg(`face-${d.id}`, svgDataUri(portraitSvg(d.id, { size: 72, frame: 'face', reveal: true, accent: d.color })), { width: 72, height: 72 });
    }
  }

  create(): void {
    this.makeGrain();
    this.makeStreak();
    this.makeDisc();
    // The board waits for a case; the weather starts now.
    this.scene.launch('weather');
    this.scene.launch('board');
    this.scene.sleep('board');
    this.game.events.emit('assets-ready');
  }

  /** Paper grain: a tile of soft noise the map is stamped with. */
  private makeGrain(): void {
    const size = 256;
    const tex = this.textures.createCanvas('grain', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.random() * 55;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 38;
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }

  /** One raindrop streak. */
  private makeStreak(): void {
    const tex = this.textures.createCanvas('streak', 4, 28);
    if (!tex) return;
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, 'rgba(173,196,214,0)');
    g.addColorStop(0.6, 'rgba(173,196,214,0.9)');
    g.addColorStop(1, 'rgba(200,220,235,1)');
    ctx.fillStyle = g;
    ctx.fillRect(1, 0, 2, 28);
    tex.refresh();
  }

  /** A soft white disc, tinted at use for halos and glows. */
  private makeDisc(): void {
    const size = 128;
    const tex = this.textures.createCanvas('disc', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
