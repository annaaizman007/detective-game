import Phaser from 'phaser';
import { CASES } from '../game/cases/index';
import { CHARACTERS } from '../game/characters';
import { iconSvg, svgDataUri, ICON_NAMES } from '../ui/icons';
import { portraitSvg, isPainted, paintedUrl } from '../ui/portraits';
import { buildingSvg } from '../ui/buildings';

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

    // One drawn facade per location, at night, in the rain.
    for (const c of CASES) {
      for (const l of c.locations) this.load.svg(`bld-${c.id}-${l.id}`, svgDataUri(buildingSvg(l.type, `${c.id}:${l.id}`)), { width: 200, height: 170 });
    }
    for (const name of ICON_NAMES) {
      this.load.svg(`ico-${name}`, svgDataUri(iconSvg(name, INK, 64, 1.6)), { width: 64, height: 64 });
    }
    // Faces for the chips. A painted person loads their painting (cut round
    // in create); a drawn one gets the "unknown" drawing, so the map never
    // gives away a trait the table has not established.
    const face = (id: string, svg: () => string) => {
      if (isPainted(id)) this.load.image(`paint-${id}`, paintedUrl(id));
      else this.load.svg(`face-${id}`, svgDataUri(svg()), { width: 72, height: 72 });
    };
    for (const c of CASES) {
      for (const x of c.suspects) face(x.id, () => portraitSvg(x.id, { size: 72, frame: 'face' }));
      for (const w of c.witnesses) face(w.id, () => portraitSvg(w.id, { size: 72, frame: 'face', reveal: true }));
    }
    for (const d of CHARACTERS) face(d.id, () => portraitSvg(d.id, { size: 72, frame: 'face', reveal: true, accent: d.color }));
  }

  create(): void {
    this.cutFaces();
    this.makeGrain();
    this.makeStreak();
    this.makeDisc();
    // The board waits for a case; the weather starts now.
    this.scene.launch('weather');
    this.scene.launch('board');
    this.scene.sleep('board');
    this.game.events.emit('assets-ready');
  }

  /** A painting is 512x640; the chip wants a round face. Cut it out once. */
  private cutFaces(): void {
    const ids = [...CASES.flatMap((c) => [...c.suspects.map((x) => x.id), ...c.witnesses.map((w) => w.id)]), ...CHARACTERS.map((d) => d.id)];
    for (const id of ids) {
      if (!this.textures.exists(`paint-${id}`)) continue;
      const src = this.textures.get(`paint-${id}`).getSourceImage() as HTMLImageElement;
      const size = 96;
      const tex = this.textures.createCanvas(`face-${id}`, size, size);
      if (!tex) continue;
      const ctx = tex.getContext();
      ctx.save();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
      // The face sits in the upper middle of the painting.
      const cw = src.width * 0.62; const ch = cw;
      ctx.drawImage(src, (src.width - cw) / 2, src.height * 0.08, cw, ch, 0, 0, size, size);
      ctx.restore();
      tex.refresh();
    }
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
