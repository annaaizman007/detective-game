// A band in the next room.
//
// Generative noir: a slow minor progression under brushed time, a piano that
// plays less than it could, an upright bass walking when it feels like it and
// a muted horn that says something every eight bars or so and then stops.
// Nothing is sampled; every voice is a few oscillators with envelopes into a
// synthetic room. It is written to sit under narration, not over it.

import { impulseBuffer, noiseBuffer } from './synth-textures';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Chord {
  /** MIDI root, bass register. */
  root: number;
  /** Intervals above the root for the piano voicing. */
  voicing: number[];
  /** Scale degrees (semitones) the horn may use. */
  scale: number[];
}

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO_B9 = [0, 1, 4, 5, 7, 8, 10];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const LOCRIAN = [0, 1, 3, 5, 6, 8, 10];

// D minor. Eight bars; the second four vary.
const PROGRESSION: Chord[] = [
  { root: 38, voicing: [12, 15, 19, 24, 26], scale: DORIAN },            // Dm9
  { root: 38, voicing: [12, 15, 19, 22, 26], scale: DORIAN },            // Dm11
  { root: 43, voicing: [10, 14, 17, 22], scale: DORIAN },                // Gm7
  { root: 45, voicing: [10, 13, 16, 19], scale: MIXO_B9 },               // A7b9
  { root: 38, voicing: [12, 15, 19, 24, 26], scale: DORIAN },            // Dm9
  { root: 46, voicing: [11, 14, 16, 19], scale: IONIAN },                // Bbmaj7
  { root: 40, voicing: [10, 15, 18, 22], scale: LOCRIAN },               // Em7b5
  { root: 45, voicing: [10, 13, 16, 19], scale: MIXO_B9 },               // A7b9
];

export class NoirBand {
  private ctx: AudioContext;
  private out: GainNode;
  private room: ConvolverNode;
  private dry: GainNode;
  private wet: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private bpm = 58;
  private running = false;
  private hornCooldown = 6;

  constructor(ctx: AudioContext, into: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.7;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.45;
    this.room = ctx.createConvolver();
    this.room.buffer = impulseBuffer(ctx, 2.6, 3);
    this.out.connect(this.dry).connect(into);
    this.out.connect(this.room).connect(this.wet).connect(into);
  }

  get beatSeconds(): number { return 60 / this.bpm; }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextBeat = this.ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Look a little ahead and book whatever falls inside the window. */
  private schedule(): void {
    const horizon = this.ctx.currentTime + 0.35;
    while (this.nextBeat < horizon) {
      this.playBeat(this.beat, this.nextBeat);
      this.beat += 1;
      this.nextBeat += this.beatSeconds;
    }
  }

  private chordAt(beat: number): Chord {
    return PROGRESSION[Math.floor(beat / 4) % PROGRESSION.length];
  }

  private playBeat(beat: number, at: number): void {
    const inBar = beat % 4;
    const chord = this.chordAt(beat);
    const bar = Math.floor(beat / 4);
    const swing = this.beatSeconds * 0.34; // where the off-beat lands

    // Brushes on two and four, and a whisper of the ride on the swung eighths.
    if (inBar === 1 || inBar === 3) this.brush(at, 0.05);
    if (Math.random() < 0.7) this.brush(at + swing, 0.016);

    // Bass: the root on one, something on three, and a walk-up now and then.
    if (inBar === 0) this.bass(chord.root, at, 1.3);
    if (inBar === 2) {
      const next = this.chordAt(beat + 2);
      const r = Math.random();
      const note = r < 0.5 ? chord.root + 7 : r < 0.8 ? next.root - 1 : chord.root + 3;
      this.bass(note, at, 1.0);
      if (r > 0.65) this.bass(next.root - (r > 0.85 ? 2 : 1), at + this.beatSeconds, 0.6);
    }

    // Piano: the chord on one, most bars; a second voicing on the and-of-two
    // or on four, sometimes; and every so often nothing at all.
    if (inBar === 0 && Math.random() < 0.85) this.piano(chord, at, 0.16);
    if (inBar === 1 && Math.random() < 0.35) this.piano(chord, at + swing, 0.09, true);
    if (inBar === 3 && Math.random() < 0.3) this.piano(chord, at, 0.1, true);

    // The horn: a short phrase, then it waits.
    if (inBar === 0) {
      this.hornCooldown -= 1;
      if (this.hornCooldown <= 0 && bar % 2 === 0) {
        this.hornPhrase(chord, at + swing);
        this.hornCooldown = 3 + Math.floor(Math.random() * 4);
      }
    }
  }

  // --------------------------------------------------------------- voices

  private env(g: GainNode, at: number, peak: number, attack: number, decay: number, sustain = 0, release = 0.3, hold = 0): void {
    const p = g.gain;
    p.cancelScheduledValues(at);
    p.setValueAtTime(0.0001, at);
    p.linearRampToValueAtTime(peak, at + attack);
    if (sustain > 0) {
      p.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), at + attack + decay);
      p.setValueAtTime(Math.max(0.0001, peak * sustain), at + attack + decay + hold);
      p.exponentialRampToValueAtTime(0.0001, at + attack + decay + hold + release);
    } else {
      p.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    }
  }

  private tone(freq: number, type: OscillatorType, at: number, length: number, into: AudioNode, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(into);
    o.start(at);
    o.stop(at + length + 0.05);
    return o;
  }

  /** Felt piano: a fundamental, a quieter octave, a whisper of the twelfth. */
  private pianoNote(note: number, at: number, vel: number, decay = 2.6): void {
    const ctx = this.ctx;
    const f = midi(note);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800 + vel * 6000;
    g.connect(lp).connect(this.out);
    this.env(g, at, vel, 0.006, decay);
    this.tone(f, 'triangle', at, decay, g);
    this.tone(f, 'sine', at, decay, g, 3);
    const o2 = ctx.createGain(); o2.gain.value = 0.35; o2.connect(g);
    this.tone(f * 2, 'sine', at, decay * 0.7, o2);
    const o3 = ctx.createGain(); o3.gain.value = 0.12; o3.connect(g);
    this.tone(f * 3, 'sine', at, decay * 0.4, o3);
  }

  private piano(chord: Chord, at: number, vel: number, sparse = false): void {
    const notes = sparse ? chord.voicing.slice(1, 4) : chord.voicing;
    // Rolled very slightly, the way a hand lands.
    notes.forEach((iv, i) => this.pianoNote(chord.root + iv, at + i * 0.012 + Math.random() * 0.01, vel * (0.8 + Math.random() * 0.3)));
  }

  private bass(note: number, at: number, length: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    g.connect(lp).connect(this.out);
    this.env(g, at, 0.5, 0.012, length);
    const f = midi(note);
    this.tone(f, 'sine', at, length, g);
    const t = ctx.createGain(); t.gain.value = 0.3; t.connect(g);
    this.tone(f, 'triangle', at, length, t, 4);
    // The thump of the string against the board.
    const thump = ctx.createBufferSource();
    thump.buffer = noiseBuffer(ctx, 0.04, false);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.04, at);
    tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    thump.connect(tg).connect(this.out);
    thump.start(at);
  }

  private brush(at: number, level: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.12, false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5200 + Math.random() * 2000;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(level, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    src.connect(bp).connect(g).connect(this.out);
    src.start(at);
    src.stop(at + 0.14);
  }

  /** Muted horn: a sawtooth through a tight formant, with vibrato that arrives late. */
  private horn(note: number, at: number, length: number, vel: number): void {
    const ctx = this.ctx;
    const f = midi(note);
    const g = ctx.createGain();
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 950;
    formant.Q.value = 2.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    g.connect(formant).connect(lp).connect(this.out);
    this.env(g, at, vel, 0.09, 0.25, 0.7, 0.35, Math.max(0, length - 0.6));
    const o = this.tone(f, 'sawtooth', at, length + 0.4, g);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(7, at + 0.45);
    vib.connect(depth).connect(o.detune);
    vib.start(at);
    vib.stop(at + length + 0.5);
  }

  private hornPhrase(chord: Chord, at: number): void {
    const n = 3 + Math.floor(Math.random() * 3);
    let degree = 2 + Math.floor(Math.random() * 3);
    let t = at;
    const b = this.beatSeconds;
    for (let i = 0; i < n; i++) {
      const step = Math.random() < 0.5 ? -1 : 1;
      degree = Math.max(0, Math.min(chord.scale.length - 1, degree + (Math.random() < 0.25 ? step * 2 : step)));
      const len = i === n - 1 ? b * 1.6 : b * (Math.random() < 0.4 ? 0.34 : 0.66);
      this.horn(chord.root + 24 + chord.scale[degree], t, len, 0.07 + Math.random() * 0.04);
      t += len + (Math.random() < 0.3 ? b * 0.34 : 0);
    }
  }

  /** A short musical remark on something that just happened on the board. */
  sting(kind: 'clue' | 'alert' | 'good' | 'bad'): void {
    if (!this.running) return;
    const at = this.ctx.currentTime + 0.02;
    const chord = this.chordAt(this.beat);
    const r = chord.root + 24;
    if (kind === 'clue') [r + 4, r + 7, r + 11, r + 14].forEach((n, i) => this.pianoNote(n, at + i * 0.04, 0.16, 3.5));
    else if (kind === 'alert') { this.bass(chord.root - 12, at, 2.2); this.pianoNote(r - 12, at, 0.2, 3); this.pianoNote(r - 6, at, 0.2, 3); }
    else if (kind === 'good') { this.pianoNote(r + 7, at, 0.14, 2.6); this.pianoNote(r + 12, at + 0.22, 0.16, 3); }
    else { this.pianoNote(r + 1, at, 0.18, 3); this.pianoNote(r, at + 0.3, 0.16, 3.2); }
  }
}
