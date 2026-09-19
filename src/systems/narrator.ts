// The narrator.
//
// Two ways to speak, in order of preference:
//
//   1. BAKED AUDIO. `npm run voices` renders every line the narrator can say
//      with a real neural model into public/voice/, packed into sprites. When
//      the manifest is there, lines are assembled from those recordings.
//   2. THE BROWSER'S SYNTHESISER, for anything missing. Its quality is not in
//      our hands, but four things are: pick the best voice the machine has,
//      leave a neural voice's pitch alone, split text into clauses with real
//      silence between them, and give it a room (see audio-manager.ts).

import { clipId, normaliseLine } from '../game/lines';
import type { Tone } from '../types/game-types';
import { VOICE_BASE } from '../config/asset-manifest';
import { STORAGE } from '../config/constants';
import { clamp } from '../utils/math-utils';
import { sleep } from '../utils/timer';
import { Emitter } from '../utils/event-emitter';
import { readJSON, writeJSON } from '../utils/storage';

const MAX_UTTERANCE = 190;
const MIN_CLAUSE = 26;
const SPRITE_CACHE = 4;

interface VoiceClass { id: 'natural' | 'network' | 'standard'; label: string; weight: number; test: RegExp; rate: number; pitch: number }

// Voice classes, best first. `rate`/`pitch` are the baseline for that class.
const CLASSES: VoiceClass[] = [
  { id: 'natural', label: 'Natural', weight: 100, test: /natural|neural|premium|enhanced|siri/i, rate: 0.97, pitch: 1.0 },
  { id: 'network', label: 'Network', weight: 55, test: /^google\s/i, rate: 0.93, pitch: 0.97 },
  { id: 'standard', label: 'Standard', weight: 10, test: /./, rate: 0.9, pitch: 0.95 },
];
const POOR = /compact|eloquence|espeak|pico|festival|novelty|whisper|zarvox|trinoids|bells/i;
const SUITED = /\b(Daniel|Arthur|Oliver|Ryan|George|Thomas|Alex|Brian|Serena|Kate|Stephanie|Fiona|Moira)\b/;

interface ToneDef { rate: number; pitch: number; pause: number }
const TONES: Record<Tone, ToneDef> = {
  narrator: { rate: 1.0, pitch: 0, pause: 1.0 },
  brief: { rate: 0.96, pitch: -0.02, pause: 1.25 },
  alert: { rate: 1.05, pitch: -0.04, pause: 0.85 },
  clue: { rate: 0.99, pitch: 0.03, pause: 1.1 },
  title: { rate: 0.86, pitch: -0.06, pause: 1.6 },
  ask: { rate: 1.02, pitch: -0.07, pause: 1.15 },
  reply: { rate: 0.97, pitch: 0.11, pause: 1.2 },
  witness: { rate: 0.95, pitch: 0.06, pause: 1.2 },
  good: { rate: 1.0, pitch: 0.02, pause: 1.0 },
  bad: { rate: 0.98, pitch: -0.03, pause: 1.05 },
};

export interface Phrase { text: string; pause: number }

function splitClauses(sentence: string, endPause: number): Phrase[] {
  const pieces = sentence.split(/([,;:—])/);
  const clauses: Phrase[] = [];
  let buf = '';
  for (let i = 0; i < pieces.length; i += 2) {
    buf += pieces[i] || '';
    const delim = pieces[i + 1];
    if (!delim) break;
    buf = buf.replace(/\s+$/, '') + (delim === '—' ? ',' : delim);
    clauses.push({ text: buf.trim(), pause: delim === ',' ? 200 : delim === '—' ? 330 : 280 });
    buf = '';
  }
  if (buf.trim()) clauses.push({ text: buf.trim(), pause: endPause });
  else if (clauses.length) clauses[clauses.length - 1].pause = endPause;
  return clauses;
}

function mergeShort(clauses: Phrase[]): Phrase[] {
  const out: Phrase[] = [];
  for (const c of clauses) {
    const prev = out[out.length - 1];
    const tooShort = prev && (prev.text.length < MIN_CLAUSE || c.text.length < MIN_CLAUSE);
    if (prev && tooShort && prev.text.length + c.text.length + 1 <= MAX_UTTERANCE) {
      prev.text = `${prev.text} ${c.text}`.trim();
      prev.pause = c.pause;
    } else {
      out.push({ ...c });
    }
  }
  return out;
}

/**
 * Split into speakable phrases, each with the silence that should follow it.
 * Punctuation is a score for pauses, not decoration -- a comma is a breath and
 * a full stop is a beat. Reinstating that is most of what stops synthesised
 * speech sounding like a list being read out.
 */
export function toPhrases(text: string): Phrase[] {
  const src = normaliseLine(text);
  const sentences = src.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [src];
  const out: Phrase[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const endPause = /\?["')\]]*$/.test(sentence) ? 560 : /!["')\]]*$/.test(sentence) ? 500 : 440;
    out.push(...mergeShort(splitClauses(sentence, endPause)));
  }
  return out.flatMap((p) => {
    if (p.text.length <= MAX_UTTERANCE) return [p];
    const chunks: string[] = [];
    let line = '';
    for (const w of p.text.split(' ')) {
      if (line && `${line} ${w}`.length > MAX_UTTERANCE) { chunks.push(line); line = w; }
      else line = line ? `${line} ${w}` : w;
    }
    if (line) chunks.push(line);
    return chunks.map((t, i) => ({ text: t, pause: i === chunks.length - 1 ? p.pause : 160 }));
  });
}

export const classifyVoice = (v: SpeechSynthesisVoice): VoiceClass =>
  CLASSES.find((c) => c.test.test(v.name)) || CLASSES[CLASSES.length - 1];

export function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = classifyVoice(v).weight;
  if (POOR.test(v.name)) score -= 70;
  if (/^en-GB/i.test(v.lang)) score += 14;
  else if (/^en-(AU|IE|NZ)/i.test(v.lang)) score += 8;
  else if (/^en-US/i.test(v.lang)) score += 6;
  if (SUITED.test(v.name)) score += 9;
  if (v.localService === false) score += 3;
  return score;
}

interface Slice { sprite: string; start: number; duration: number }
interface ManifestClip { id: string; group: string; text: string; sprite?: string; start?: number; duration?: number }
interface Manifest { version: number; engine: string; voice: string; format: string; clips: ManifestClip[]; sprites?: { dir?: string; format?: string } }

interface ClipPack {
  base: string;
  format: string;
  voice: string;
  ids: Set<string>;
  sprites: { dir: string; format: string; slices: Map<string, Slice> } | null;
}

interface QueueItem { line: string; tone: Tone; parts: string[] }
interface Playing { pause(): void }

export type NarratorEvent =
  | { type: 'line'; text: string; tone: Tone }
  | { type: 'speaking' }
  | { type: 'idle' }
  | { type: 'voices' }
  | { type: 'clips'; count: number }
  | { type: 'enabled'; enabled: boolean };

interface NarratorSettings { enabled: boolean; rate: number; voice: string | null; useClips: boolean }

const hasWebAudio = () => typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

export class Narrator {
  readonly supported: boolean;
  settings: NarratorSettings;
  voices: SpeechSynthesisVoice[] = [];
  queue: QueueItem[] = [];
  speaking = false;
  clips: ClipPack | null = null;
  readonly events = new Emitter<{ event: NarratorEvent }>();
  private token = 0;
  private current: Playing | null = null;
  private ctx: AudioContext | null = null;
  private sprites = new Map<string, Promise<AudioBuffer>>();
  /** Set by the app so narration can be routed through the room. */
  destination: AudioNode | null = null;

  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.settings = { enabled: true, rate: 1, voice: null, useClips: true, ...(readJSON<Partial<NarratorSettings>>(STORAGE.settings + '.voice') ?? {}) };
    if (this.supported) {
      this.loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.loadVoices());
      setTimeout(() => this.loadVoices(), 250);
      setTimeout(() => this.loadVoices(), 1200);
    }
  }

  private persist(): void { writeJSON(STORAGE.settings + '.voice', this.settings); }
  private emit(event: NarratorEvent): void { this.events.emit('event', event); }
  subscribe(fn: (e: NarratorEvent) => void): () => void { return this.events.on('event', fn); }

  get enabled(): boolean { return this.settings.enabled; }
  get rateScale(): number { return this.settings.rate; }
  get voiceURI(): string | null { return this.settings.voice; }
  get useClips(): boolean { return this.settings.useClips; }
  get recorded(): boolean { return !!(this.clips && this.settings.useClips); }
  get voice(): SpeechSynthesisVoice | null { return this.voices.find((v) => v.voiceURI === this.settings.voice) || null; }
  get hasNaturalVoice(): boolean { return this.voices.some((v) => classifyVoice(v).id === 'natural'); }

  // ------------------------------------------------------------- clips

  /** Look for narration baked to audio files. */
  async loadClips(base = VOICE_BASE): Promise<boolean> {
    try {
      const res = await fetch(`${base}manifest.json`, { cache: 'no-cache' });
      if (!res.ok) return false;
      const m = (await res.json()) as Manifest;
      if (!m || !Array.isArray(m.clips) || !m.clips.length) return false;
      this.clips = {
        base,
        format: m.format || 'mp3',
        voice: m.voice || m.engine || 'recorded',
        ids: new Set(m.clips.map((c) => c.id)),
        sprites: m.sprites && hasWebAudio()
          ? {
            dir: m.sprites.dir || 'sprites/',
            format: m.sprites.format || 'mp3',
            slices: new Map(m.clips.filter((c) => c.sprite).map((c) => [c.id, { sprite: c.sprite as string, start: c.start as number, duration: c.duration as number }])),
          }
          : null,
      };
      this.emit({ type: 'clips', count: this.clips.ids.size });
      return true;
    } catch {
      return false;
    }
  }

  setUseClips(on: boolean): void { this.settings.useClips = on; this.persist(); }

  private clipsFor(parts: string[]): { url: string; slice: Slice | null; text: string }[] | null {
    if (!this.recorded || !parts?.length || !this.clips) return null;
    const out = [];
    for (const part of parts) {
      const id = clipId(part);
      if (!this.clips.ids.has(id)) return null;
      out.push({ url: `${this.clips.base}${id}.${this.clips.format}`, slice: this.clips.sprites?.slices.get(id) || null, text: normaliseLine(part) });
    }
    return out;
  }

  private audioCtx(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private spriteBuffer(name: string): Promise<AudioBuffer> {
    const cache = this.sprites;
    const hit = cache.get(name);
    if (hit) { cache.delete(name); cache.set(name, hit); return hit; }
    const sprites = this.clips?.sprites;
    if (!sprites || !this.clips) return Promise.reject(new Error('no sprites'));
    const p = (async () => {
      const res = await fetch(`${this.clips!.base}${sprites.dir}${name}.${sprites.format}`);
      if (!res.ok) throw new Error(`sprite ${name}: ${res.status}`);
      return this.audioCtx().decodeAudioData(await res.arrayBuffer());
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
    while (cache.size > SPRITE_CACHE) cache.delete(cache.keys().next().value as string);
    return p;
  }

  /** Warm the sprites a case will need first, in the background. */
  prefetch(groups = ['briefing', 'stock', 'name']): void {
    const sprites = this.clips?.sprites;
    if (!sprites) return;
    // A group may be cut into parts (`briefing-1`, `briefing-2`); warm them all.
    const names = new Set<string>();
    for (const s of sprites.slices.values()) if (groups.some((g) => s.sprite === g || s.sprite.startsWith(`${g}-`))) names.add(s.sprite);
    void (async () => { for (const g of names) { try { await this.spriteBuffer(g); } catch { /* offline */ } } })();
  }

  private async playSlice(slice: Slice, token: number): Promise<void> {
    const buffer = await this.spriteBuffer(slice.sprite);
    if (token !== this.token) return;
    const ctx = this.audioCtx();
    await new Promise<void>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      let done = false;
      const finish = () => { if (!done) { done = true; this.current = null; resolve(); } };
      src.addEventListener('ended', finish, { once: true });
      this.current = { pause() { try { src.stop(); } catch { /* already stopped */ } } };
      src.start(0, slice.start, slice.duration);
      setTimeout(finish, slice.duration * 1000 + 500);
    });
  }

  private playClip(url: string, token: number): Promise<void> {
    return new Promise((resolve) => {
      const a = new Audio(url);
      a.preload = 'auto';
      let done = false;
      const finish = () => { if (!done) { done = true; this.current = null; resolve(); } };
      a.addEventListener('ended', finish, { once: true });
      a.addEventListener('error', finish, { once: true });
      const bail = setTimeout(finish, 30000);
      a.addEventListener('ended', () => clearTimeout(bail), { once: true });
      this.current = a;
      if (token !== this.token) { finish(); return; }
      a.play().catch(finish);
    });
  }

  // ------------------------------------------------------------ voices

  private loadVoices(): void {
    if (!this.supported) return;
    const all = window.speechSynthesis.getVoices() || [];
    if (!all.length) return;
    const english = all.filter((v) => /^en/i.test(v.lang));
    const pool = english.length ? english : all;
    const before = this.voices.length;
    this.voices = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a) || a.name.localeCompare(b.name));
    const saved = this.settings.voice && this.voices.find((v) => v.voiceURI === this.settings.voice);
    if (!saved && this.voices.length) this.settings.voice = this.voices[0].voiceURI;
    if (this.voices.length !== before) this.emit({ type: 'voices' });
  }

  voiceOptions() {
    return this.voices.map((v) => ({
      uri: v.voiceURI, name: v.name, lang: v.lang, quality: classifyVoice(v).label, best: v.voiceURI === this.voices[0]?.voiceURI,
    }));
  }

  setVoice(uri: string): void { this.settings.voice = uri; this.persist(); }
  setRate(scale: number | string): void { this.settings.rate = clamp(Number(scale) || 1, 0.75, 1.3); this.persist(); }
  setEnabled(on: boolean): void {
    this.settings.enabled = on;
    this.persist();
    if (!on) this.stop();
    this.emit({ type: 'enabled', enabled: on });
  }

  // ------------------------------------------------------------ speaking

  say(text: string, tone: Tone = 'narrator', parts: string[] | null = null): void {
    const line = normaliseLine(text);
    if (!line) return;
    this.queue.push({ line, tone, parts: parts || [text] });
    if (!this.speaking) void this.drain();
  }

  sayAll(lines: { text: string; tone?: Tone; parts?: string[] | null }[]): void {
    for (const l of lines) this.say(l.text, l.tone ?? 'narrator', l.parts ?? null);
  }

  stop(): void {
    this.token += 1;
    this.queue = [];
    this.speaking = false;
    if (this.current) { try { this.current.pause(); } catch { /* ignore */ } this.current = null; }
    if (this.supported) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
    this.emit({ type: 'idle' });
  }

  private async drain(): Promise<void> {
    this.speaking = true;
    const token = this.token;
    this.emit({ type: 'speaking' });

    while (this.queue.length) {
      const item = this.queue.shift() as QueueItem;
      if (token !== this.token) return;
      this.emit({ type: 'line', text: item.line, tone: item.tone });

      const recorded = this.settings.enabled ? this.clipsFor(item.parts) : null;
      if (recorded) {
        for (let i = 0; i < recorded.length; i++) {
          if (token !== this.token) return;
          const r = recorded[i];
          if (r.slice) {
            try { await this.playSlice(r.slice, token); } catch { await this.playClip(r.url, token); }
          } else {
            await this.playClip(r.url, token);
          }
          if (token !== this.token) return;
          const last = i === recorded.length - 1;
          const pause = last ? (/[?!]$/.test(r.text) ? 520 : 400) : /[,:;]$/.test(r.text) ? 190 : 150;
          await sleep(pause);
        }
      } else if (this.settings.enabled && this.supported && this.voice && !this.recorded) {
        // Browser speech only when there is no recorded pack at all. A pack
        // with a line missing (new text, not yet baked) reads as subtitles
        // rather than switching to a synthesiser mid-scene.
        const phrases = toPhrases(item.line);
        const tone = TONES[item.tone] || TONES.narrator;
        for (let i = 0; i < phrases.length; i++) {
          if (token !== this.token) return;
          await this.utter(phrases[i].text, tone, token, i);
          if (token !== this.token) return;
          await sleep(phrases[i].pause * tone.pause);
        }
      } else {
        // Subtitles only: pace them so the text still reads at speaking speed.
        await sleep(Math.min(5200, 500 + item.line.length * 30));
      }
    }

    if (token !== this.token) return;
    this.speaking = false;
    this.emit({ type: 'idle' });
  }

  private utter(text: string, tone: ToneDef, _token: number, index: number): Promise<void> {
    return new Promise((resolve) => {
      const voice = this.voice as SpeechSynthesisVoice;
      const cls = classifyVoice(voice);
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.volume = 1;
      // A little drift phrase to phrase: dead-even timing is the single most
      // machine-like thing about synthesised speech.
      const drift = 1 + (((index * 37) % 7) - 3) * 0.008;
      u.rate = clamp(cls.rate * tone.rate * this.settings.rate * drift, 0.5, 1.5);
      u.pitch = clamp(cls.pitch + tone.pitch, 0.6, 1.4);
      let done = false;
      let bail: ReturnType<typeof setTimeout> | null = null;
      const finish = () => { if (done) return; done = true; if (bail) clearTimeout(bail); resolve(); };
      u.onend = finish;
      u.onerror = finish;
      bail = setTimeout(finish, 2500 + text.length * 110);
      try { window.speechSynthesis.speak(u); } catch { finish(); }
    });
  }
}
