// Atmosphere.
//
// Rain under everything, a fire in the grate, a slow piece of music in the
// next room, and a precinct radio that opens with a click when the narrator
// starts. Recordings are used when they exist under public/assets/audio/
// (see config/asset-manifest.ts); everything else is synthesised, so the game
// still sounds like a rainy room with no media in the repository at all.
//
// One AudioContext, one master gain, one gain per channel. Every channel can
// be turned off and set independently, and the settings persist.

import { AUDIO_ASSETS, AUDIO_EXTENSIONS, type AudioAsset } from '../config/asset-manifest';
import { STORAGE } from '../config/constants';
import { readJSON, writeJSON } from '../utils/storage';
import { clamp } from '../utils/math-utils';
import { rainBuffer, noiseBuffer, fireBuffer } from './synth-textures';
import { NoirBand } from './synth-music';

const RAIN_IDLE = 0.13;
const RAIN_DUCK = 0.075; // pull the rain back so the voice sits on top
const FIRE_IDLE = 0.16;
const MUSIC_IDLE = 0.22;
const MUSIC_DUCK = 0.09;
const HISS_OPEN = 0.02;
const HUM_OPEN = 0.01;

export type Channel = 'rain' | 'fire' | 'music';

export interface AudioSettings {
  enabled: boolean;
  volume: number;
  channels: Record<Channel, { on: boolean; level: number }>;
}

const DEFAULTS: AudioSettings = {
  enabled: true,
  volume: 1,
  channels: {
    rain: { on: true, level: 1 },
    fire: { on: true, level: 0.8 },
    music: { on: true, level: 0.8 },
  },
};

interface ChannelNodes {
  gain: GainNode;
  /** The level the channel sits at when nothing is ducking it. */
  idle: number;
  source: 'file' | 'synth' | null;
}

export class AudioManager {
  ctx: AudioContext | null = null;
  settings: AudioSettings;
  open = false;
  private master: GainNode | null = null;
  private channels: Partial<Record<Channel, ChannelNodes>> = {};
  private hiss: GainNode | null = null;
  private hum: GainNode | null = null;
  private thunderTimer: ReturnType<typeof setTimeout> | null = null;
  private band: NoirBand | null = null;
  private decoded = new Map<string, AudioBuffer | null>();
  /** Called when thunder rolls, so the board can flash. */
  onThunder: ((intensity: number) => void) | null = null;

  constructor() {
    const saved = readJSON<Partial<AudioSettings>>(STORAGE.settings + '.audio');
    this.settings = {
      ...DEFAULTS,
      ...saved,
      channels: { ...DEFAULTS.channels, ...(saved?.channels ?? {}) },
    };
  }

  get supported(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  }

  get enabled(): boolean { return this.settings.enabled; }
  get volume(): number { return this.settings.volume; }
  channel(c: Channel) { return this.settings.channels[c]; }
  sourceOf(c: Channel): 'file' | 'synth' | null { return this.channels[c]?.source ?? null; }

  /** Must be called from a user gesture; safe to call repeatedly. */
  start(): void {
    if (!this.supported || !this.settings.enabled) return;
    if (!this.ctx) void this.build();
    else if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  private persist(): void { writeJSON(STORAGE.settings + '.audio', this.settings); }

  // ------------------------------------------------------------ building

  private async build(): Promise<void> {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.settings.enabled ? this.settings.volume : 0;
    this.master.connect(ctx.destination);

    // Channels come up in parallel; a recording that is not there just
    // resolves to null and the synthesiser takes its place.
    await Promise.all([this.buildRain(), this.buildFire(), this.buildMusic()]);
    this.buildRadio();
    this.scheduleThunder(12000);
  }

  private makeChannel(name: Channel, idle: number): ChannelNodes {
    const ctx = this.ctx as AudioContext;
    const gain = ctx.createGain();
    const c = this.settings.channels[name];
    gain.gain.value = c.on ? idle * c.level : 0;
    gain.connect(this.master as GainNode);
    const nodes: ChannelNodes = { gain, idle, source: null };
    this.channels[name] = nodes;
    return nodes;
  }

  /** Try each extension; the first that decodes wins. */
  private async loadRecording(asset: AudioAsset): Promise<AudioBuffer | null> {
    if (this.decoded.has(asset.key)) return this.decoded.get(asset.key) ?? null;
    const ctx = this.ctx as AudioContext;
    for (const ext of AUDIO_EXTENSIONS) {
      try {
        const res = await fetch(`${asset.path}.${ext}`, { cache: 'force-cache' });
        if (!res.ok) continue;
        const type = res.headers.get('content-type') || '';
        if (type.includes('text/html')) continue; // a SPA fallback page, not audio
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.decoded.set(asset.key, buf);
        return buf;
      } catch {
        /* try the next extension */
      }
    }
    this.decoded.set(asset.key, null);
    return null;
  }

  private loopSource(buffer: AudioBuffer, into: AudioNode, rate = 1, offset = 0): AudioBufferSourceNode {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    src.connect(into);
    src.start(ctx.currentTime, offset % buffer.duration);
    return src;
  }

  private async buildRain(): Promise<void> {
    const ctx = this.ctx as AudioContext;
    const ch = this.makeChannel('rain', RAIN_IDLE);
    const file = await this.loadRecording(AUDIO_ASSETS.rain);

    // Heard from inside, through a window: take the very top off.
    const glass = ctx.createBiquadFilter();
    glass.type = 'lowshelf';
    glass.frequency.value = 180;
    glass.gain.value = 3;
    glass.connect(ch.gain);

    if (file) {
      ch.source = 'file';
      this.loopSource(file, glass);
      return;
    }
    ch.source = 'synth';
    // Two copies of the baked buffer, one slightly slowed and started at an
    // offset, so the ear never finds the loop point.
    const buf = rainBuffer(ctx, 9);
    const voices = [1, 0.93].map((rate, i) => {
      const g = ctx.createGain();
      g.gain.value = i ? 0.55 : 1;
      g.connect(glass);
      this.loopSource(buf, g, rate, i * 3.7);
      return g;
    });
    // Slow gusts, or the rain sits dead still and stops sounding like
    // anything happening outside.
    [[0.045, 0.22], [0.019, 0.18]].forEach(([f, depth], i) => {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = f;
      const d = ctx.createGain();
      d.gain.value = depth;
      lfo.connect(d).connect(voices[i].gain);
      lfo.start();
    });
    // Wet street somewhere below: a distant, formless low bed.
    const streetLow = ctx.createBiquadFilter();
    streetLow.type = 'lowpass';
    streetLow.frequency.value = 170;
    const streetGain = ctx.createGain();
    streetGain.gain.value = 0.5;
    streetLow.connect(streetGain).connect(ch.gain);
    this.loopSource(noiseBuffer(ctx, 5, true), streetLow);
  }

  private async buildFire(): Promise<void> {
    const ctx = this.ctx as AudioContext;
    const ch = this.makeChannel('fire', FIRE_IDLE);
    const file = await this.loadRecording(AUDIO_ASSETS.fire);
    // The grate is across the room: warm, a little dull.
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 5200;
    warm.connect(ch.gain);
    if (file) {
      ch.source = 'file';
      this.loopSource(file, warm);
      return;
    }
    ch.source = 'synth';
    const buf = fireBuffer(ctx, 11);
    this.loopSource(buf, warm);
    const second = ctx.createGain();
    second.gain.value = 0.5;
    second.connect(warm);
    this.loopSource(buf, second, 0.91, 5.3);
    // The fire breathes: a slow, irregular swell in the roar.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(second.gain);
    lfo.start();
  }

  private async buildMusic(): Promise<void> {
    const ctx = this.ctx as AudioContext;
    const ch = this.makeChannel('music', MUSIC_IDLE);
    const file = await this.loadRecording(AUDIO_ASSETS.music);
    // Music from the next room: rolled off, and a long way back.
    const wall = ctx.createBiquadFilter();
    wall.type = 'lowpass';
    wall.frequency.value = 3400;
    wall.connect(ch.gain);
    if (file) {
      ch.source = 'file';
      this.loopSource(file, wall);
      return;
    }
    ch.source = 'synth';
    this.band = new NoirBand(ctx, wall);
    if (this.settings.channels.music.on) this.band.start();
  }

  private buildRadio(): void {
    const ctx = this.ctx as AudioContext;
    // Carrier hiss: the radio's own noise floor, only while it is open.
    const hissBand = ctx.createBiquadFilter();
    hissBand.type = 'bandpass';
    hissBand.frequency.value = 1500;
    hissBand.Q.value = 0.7;
    this.hiss = ctx.createGain();
    this.hiss.gain.value = 0;
    hissBand.connect(this.hiss).connect(this.master as GainNode);
    this.loopSource(noiseBuffer(ctx, 2, false), hissBand);

    // Mains hum, the sound of a live valve set.
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    this.hum.connect(this.master as GainNode);
    for (const f of [60, 120]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.hum);
      o.start();
    }
  }

  // ------------------------------------------------------------- thunder

  /** Distant thunder, every half-minute or so. Never while the radio is open. */
  private scheduleThunder(delay: number): void {
    if (this.thunderTimer) clearTimeout(this.thunderTimer);
    this.thunderTimer = setTimeout(() => {
      if (this.ctx && this.settings.enabled && this.settings.channels.rain.on && !this.open) this.thunder();
      this.scheduleThunder(24000 + Math.random() * 40000);
    }, delay);
  }

  thunder(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 4, true);
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 140;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const peak = 0.1 + Math.random() * 0.1;
    // A long swell rather than a crack: this storm is several streets away.
    g.gain.setValueAtTime(0.0001, now);
    const rise = 0.5 + Math.random();
    g.gain.exponentialRampToValueAtTime(peak, now + rise);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4 + Math.random() * 1.6);
    src.connect(low).connect(g).connect(this.master);
    src.start();
    src.stop(now + 5.5);
    setTimeout(() => this.onThunder?.(peak / 0.2), Math.max(0, (rise - 0.6) * 1000));
  }

  // -------------------------------------------------------------- radio

  private ramp(param: AudioParam, value: number, seconds = 0.4): void {
    const ctx = this.ctx as AudioContext;
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  /** A relay click: short filtered noise burst with a fast decay. */
  private click(level = 0.06): void {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.08, false);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1900;
    band.Q.value = 1.2;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(level, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    src.connect(band).connect(g).connect(this.master as GainNode);
    src.start();
    src.stop(now + 0.09);
  }

  private levelOf(name: Channel, ducked: boolean): number {
    const c = this.settings.channels[name];
    const ch = this.channels[name];
    if (!c.on || !ch) return 0;
    const idle = name === 'rain' ? (ducked ? RAIN_DUCK : RAIN_IDLE)
      : name === 'music' ? (ducked ? MUSIC_DUCK : MUSIC_IDLE) : ch.idle;
    return idle * c.level;
  }

  /** The narrator has started: open the carrier and duck the room. */
  openChannel(): void {
    if (!this.settings.enabled || !this.ctx || this.open) return;
    this.open = true;
    this.click(0.05);
    if (this.hiss) this.ramp(this.hiss.gain, HISS_OPEN, 0.12);
    if (this.hum) this.ramp(this.hum.gain, HUM_OPEN, 0.2);
    for (const name of ['rain', 'music'] as Channel[]) {
      const ch = this.channels[name];
      if (ch) this.ramp(ch.gain.gain, this.levelOf(name, true), 0.35);
    }
  }

  /** The narrator has finished: close down and let the room back in. */
  closeChannel(): void {
    if (!this.ctx || !this.open) return;
    this.open = false;
    this.click(0.035);
    if (this.hiss) this.ramp(this.hiss.gain, 0, 0.3);
    if (this.hum) this.ramp(this.hum.gain, 0, 0.3);
    for (const name of ['rain', 'music'] as Channel[]) {
      const ch = this.channels[name];
      if (ch) this.ramp(ch.gain.gain, this.levelOf(name, false), 0.8);
    }
  }

  // ----------------------------------------------------------- settings

  setEnabled(on: boolean): void {
    this.settings.enabled = on;
    this.persist();
    if (!this.ctx) { if (on) this.start(); return; }
    this.ramp((this.master as GainNode).gain, on ? this.settings.volume : 0, 0.4);
  }

  setVolume(v: number | string): void {
    this.settings.volume = clamp(Number(v) || 0, 0, 1.6);
    this.persist();
    if (this.ctx && this.settings.enabled) this.ramp((this.master as GainNode).gain, this.settings.volume, 0.15);
  }

  setChannel(name: Channel, patch: Partial<{ on: boolean; level: number }>): void {
    const c = this.settings.channels[name];
    if (patch.on !== undefined) c.on = patch.on;
    if (patch.level !== undefined) c.level = clamp(Number(patch.level) || 0, 0, 1.6);
    this.persist();
    const ch = this.channels[name];
    if (ch) this.ramp(ch.gain.gain, this.levelOf(name, this.open), 0.3);
    if (name === 'music' && this.band) {
      if (c.on) this.band.start(); else this.band.stop();
    }
  }

  /** Something happened on the board: a small musical acknowledgement. */
  sting(kind: 'clue' | 'alert' | 'good' | 'bad'): void {
    this.band?.sting(kind);
  }

  stop(): void {
    if (this.thunderTimer) clearTimeout(this.thunderTimer);
    this.band?.stop();
    if (!this.ctx) return;
    try { void this.ctx.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.open = false;
    this.channels = {};
  }
}
