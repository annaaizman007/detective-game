import Phaser from 'phaser';

/**
 * Rain across the whole viewport, over everything, and lightning when the
 * room's thunder rolls. Runs on its own camera so it never pans with the map.
 */
export class WeatherScene extends Phaser.Scene {
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private flash: Phaser.GameObjects.Rectangle | null = null;
  private wind = 0.12;
  private reduced = false;

  constructor() { super('weather'); }

  create(): void {
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const { width, height } = this.scale;
    this.flash = this.add.rectangle(0, 0, width, height, 0xdde6ff, 0).setOrigin(0).setDepth(10);

    if (!this.reduced) {
      this.emitter = this.add.particles(0, 0, 'streak', {
        x: { min: -100, max: width + 100 },
        y: -40,
        lifespan: 1400,
        speedY: { min: 520, max: 900 },
        speedX: { min: 40, max: 120 },
        scaleY: { min: 0.6, max: 1.4 },
        scaleX: { min: 0.5, max: 1 },
        alpha: { start: 0.42, end: 0.12 },
        rotate: -7,
        quantity: 2,
        frequency: 14,
        blendMode: Phaser.BlendModes.SCREEN,
      });
      this.emitter.setDepth(5);
    }
    this.scale.on('resize', this.onResize, this);
    this.game.events.on('thunder', this.lightning, this);
    this.game.events.on('weather', (on: boolean) => this.setRaining(on));
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.flash?.setSize(size.width, size.height);
    this.emitter?.updateConfig({ x: { min: -100, max: size.width + 100 } });
    this.cameras.main.setSize(size.width, size.height);
  }

  setRaining(on: boolean): void {
    if (!this.emitter) return;
    if (on) this.emitter.start(); else this.emitter.stop();
  }

  /** Two quick flickers and a slow fade, the way a sheet flash reads through cloud. */
  lightning(intensity = 1): void {
    if (!this.flash || this.reduced) return;
    const peak = Math.min(0.5, 0.18 + intensity * 0.22);
    this.tweens.killTweensOf(this.flash);
    this.tweens.chain({
      targets: this.flash,
      tweens: [
        { alpha: peak, duration: 40 },
        { alpha: peak * 0.3, duration: 70 },
        { alpha: peak * 0.8, duration: 50 },
        { alpha: 0, duration: 420, ease: 'Quad.easeOut' },
      ],
    });
  }
}
