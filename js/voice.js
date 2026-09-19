// The narrator.
//
// Speech comes from the browser's own synthesiser -- no API key, no audio
// files, works offline. The quality of that synthesiser is not in our hands,
// but four things are, and they are the difference between "a robot reading a
// list" and "a man reading a report":
//
//   1. PICK THE RIGHT VOICE. Most machines carry a natural/neural voice
//      alongside the old formant ones, and nothing else here matters as much.
//      Voices are therefore scored and the best one is chosen automatically.
//   2. DON'T MANGLE IT. Pitch-shifting a neural voice is exactly what makes it
//      sound synthetic. Prosody is now per voice class: the good ones are left
//      alone, only the old ones get nudged.
//   3. BREATHE. A single long utterance is read flat. Text is split into
//      clauses and sentences with real silence between them, which is most of
//      what we hear as "reading" rather than "reciting".
//   4. GIVE IT A ROOM. Perfectly dry speech sounds synthetic; the same speech
//      over a radio in a rainy room does not. See js/audio.js.

const MAX_UTTERANCE = 190;

// Voice classes, best first. `rate`/`pitch` are the baseline for that class.
const CLASSES = [
  { id: 'natural', label: 'Natural', weight: 100, test: /natural|neural|premium|enhanced|siri/i,
    rate: 0.97, pitch: 1.0 },
  { id: 'network', label: 'Network', weight: 55, test: /^google\s/i,
    rate: 0.93, pitch: 0.97 },
  { id: 'standard', label: 'Standard', weight: 10, test: /./,
    rate: 0.90, pitch: 0.95 },
];

// Voices that are genuinely low-fidelity, whatever else their name says.
const POOR = /compact|eloquence|espeak|pico|festival|novelty|whisper|zarvox|trinoids|bells/i;

// Voices that happen to suit a man in a wet raincoat.
const SUITED = /\b(Daniel|Arthur|Oliver|Ryan|George|Thomas|Alex|Brian|Serena|Kate|Stephanie|Fiona|Moira)\b/;

// How each kind of line is delivered, as multipliers on the voice's baseline.
const TONES = {
  narrator: { rate: 1.00, pitch: 0, pause: 1.00 },
  brief: { rate: 0.96, pitch: -0.02, pause: 1.25 },
  alert: { rate: 1.05, pitch: -0.04, pause: 0.85 },
  clue: { rate: 0.99, pitch: 0.03, pause: 1.10 },
  title: { rate: 0.86, pitch: -0.06, pause: 1.60 },
  // Two voices in a conversation: the detective asking, and whoever is
  // unlucky enough to be answering. Same synthesiser, different register.
  ask: { rate: 1.02, pitch: -0.07, pause: 1.15 },
  reply: { rate: 0.97, pitch: 0.11, pause: 1.20 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalise(text) {
  return String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split into speakable phrases, each with the silence that should follow it.
 * Punctuation is a score for pauses, not decoration -- a comma is a breath and
 * a full stop is a beat, and reinstating that is most of what stops synthetic
 * speech sounding like a list.
 */
const MIN_CLAUSE = 26;

/** One sentence -> clauses, each carrying the silence that should follow it. */
function splitClauses(sentence, endPause) {
  const pieces = sentence.split(/([,;:\u2014])/);
  const clauses = [];
  let buf = '';
  for (let i = 0; i < pieces.length; i += 2) {
    buf += pieces[i] || '';
    const delim = pieces[i + 1];
    if (!delim) break;
    // An em dash is a beat, not a word: it becomes a comma in the spoken text
    // (most synthesisers read it aloud or ignore it) and a longer silence.
    buf = buf.replace(/\s+$/, '') + (delim === '\u2014' ? ',' : delim);
    clauses.push({ text: buf.trim(), pause: delim === ',' ? 200 : delim === '\u2014' ? 330 : 280 });
    buf = '';
  }
  if (buf.trim()) clauses.push({ text: buf.trim(), pause: endPause });
  else if (clauses.length) clauses[clauses.length - 1].pause = endPause;
  return clauses;
}

/** Glue tiny fragments onto their neighbour so the reading is not choppy. */
function mergeShort(clauses) {
  const out = [];
  for (const c of clauses) {
    const prev = out[out.length - 1];
    const tooShort = prev && (prev.text.length < MIN_CLAUSE || c.text.length < MIN_CLAUSE);
    if (tooShort && prev.text.length + c.text.length + 1 <= MAX_UTTERANCE) {
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
export function toPhrases(text) {
  const src = normalise(text);
  const sentences = src.match(/[^.!?]+[.!?]+["\')\]]*|[^.!?]+$/g) || [src];
  const out = [];

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const endPause = /\?["\')\]]*$/.test(sentence) ? 560
      : /!["\')\]]*$/.test(sentence) ? 500
        : 440;
    out.push(...mergeShort(splitClauses(sentence, endPause)));
  }

  // A single clause longer than one utterance gets a hard split on words.
  return out.flatMap((p) => {
    if (p.text.length <= MAX_UTTERANCE) return [p];
    const chunks = [];
    let line = '';
    for (const w of p.text.split(' ')) {
      if (line && `${line} ${w}`.length > MAX_UTTERANCE) { chunks.push(line); line = w; }
      else line = line ? `${line} ${w}` : w;
    }
    if (line) chunks.push(line);
    return chunks.map((t, i) => ({ text: t, pause: i === chunks.length - 1 ? p.pause : 160 }));
  });
}

export function classifyVoice(v) {
  return CLASSES.find((c) => c.test.test(v.name)) || CLASSES[CLASSES.length - 1];
}

export function scoreVoice(v) {
  let score = classifyVoice(v).weight;
  if (POOR.test(v.name)) score -= 70;
  if (/^en-GB/i.test(v.lang)) score += 14;
  else if (/^en-(AU|IE|NZ)/i.test(v.lang)) score += 8;
  else if (/^en-US/i.test(v.lang)) score += 6;
  if (SUITED.test(v.name)) score += 9;
  if (v.localService === false) score += 3;
  return score;
}

export class Narrator {
  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.enabled = true;
    this.rateScale = 1;
    this.voices = [];
    this.voiceURI = null;
    this.queue = [];
    this.speaking = false;
    this.subscribers = new Set();
    this._token = 0;

    try {
      if (localStorage.getItem('ashgrave.voiceOn') === '0') this.enabled = false;
      const r = parseFloat(localStorage.getItem('ashgrave.rate'));
      if (Number.isFinite(r)) this.rateScale = clamp(r, 0.75, 1.3);
    } catch { /* private mode */ }

    if (this.supported) {
      this._loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this._loadVoices());
      // Safari and some Chrome builds never fire voiceschanged on first load.
      setTimeout(() => this._loadVoices(), 250);
      setTimeout(() => this._loadVoices(), 1200);
    }
  }

  _loadVoices() {
    if (!this.supported) return;
    const all = window.speechSynthesis.getVoices() || [];
    if (!all.length) return;
    const english = all.filter((v) => /^en/i.test(v.lang));
    const pool = english.length ? english : all;
    const before = this.voices.length;
    this.voices = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a) || a.name.localeCompare(b.name));

    const saved = (() => { try { return localStorage.getItem('ashgrave.voice'); } catch { return null; } })();
    const savedVoice = saved && this.voices.find((v) => v.voiceURI === saved);
    // Keep re-picking the best until the player chooses for themselves: the
    // good voices often arrive in a later batch than the poor ones.
    if (savedVoice) this.voiceURI = savedVoice.voiceURI;
    else if (this.voices.length) this.voiceURI = this.voices[0].voiceURI;

    if (this.voices.length !== before) this._emit({ type: 'voices' });
  }

  /** Ranked, grouped and labelled, for the settings list. */
  voiceOptions() {
    return this.voices.map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
      quality: classifyVoice(v).label,
      best: v.voiceURI === this.voices[0]?.voiceURI,
    }));
  }

  get voice() { return this.voices.find((v) => v.voiceURI === this.voiceURI) || null; }
  get hasNaturalVoice() { return this.voices.some((v) => classifyVoice(v).id === 'natural'); }

  setVoice(uri) {
    this.voiceURI = uri;
    try { localStorage.setItem('ashgrave.voice', uri); } catch { /* private mode */ }
  }

  setRate(scale) {
    this.rateScale = clamp(Number(scale) || 1, 0.75, 1.3);
    try { localStorage.setItem('ashgrave.rate', String(this.rateScale)); } catch { /* ignore */ }
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('ashgrave.voiceOn', on ? '1' : '0'); } catch { /* private mode */ }
    if (!on) this.stop();
    this._emit({ type: 'enabled', enabled: on });
  }

  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  _emit(ev) { for (const fn of this.subscribers) fn(ev); }

  say(text, tone = 'narrator') {
    const line = normalise(text);
    if (!line) return;
    this.queue.push({ line, tone });
    if (!this.speaking) this._drain();
  }

  sayAll(lines) { for (const l of lines) this.say(l.text ?? l, l.tone ?? 'narrator'); }

  stop() {
    this._token += 1;
    this.queue = [];
    this.speaking = false;
    if (this.supported) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
    this._emit({ type: 'idle' });
  }

  skip() { this.stop(); }

  async _drain() {
    this.speaking = true;
    const token = this._token;
    this._emit({ type: 'speaking' });

    while (this.queue.length) {
      const item = this.queue.shift();
      if (token !== this._token) return;
      this._emit({ type: 'line', text: item.line, tone: item.tone });

      if (this.enabled && this.supported && this.voice) {
        const phrases = toPhrases(item.line);
        const tone = TONES[item.tone] || TONES.narrator;
        for (let i = 0; i < phrases.length; i++) {
          if (token !== this._token) return;
          await this._utter(phrases[i].text, tone, token, i);
          if (token !== this._token) return;
          await sleep(phrases[i].pause * tone.pause);
        }
      } else {
        // Subtitles only: pace them so the text still reads at speaking speed.
        await sleep(Math.min(5200, 500 + item.line.length * 30));
      }
    }

    if (token !== this._token) return;
    this.speaking = false;
    this._emit({ type: 'idle' });
  }

  _utter(text, tone, token, index) {
    return new Promise((resolve) => {
      const voice = this.voice;
      const cls = classifyVoice(voice);
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.volume = 1;
      // A little drift phrase to phrase: dead-even timing is the single most
      // machine-like thing about synthesised speech.
      const drift = 1 + (((index * 37) % 7) - 3) * 0.008;
      u.rate = clamp(cls.rate * tone.rate * this.rateScale * drift, 0.5, 1.5);
      u.pitch = clamp(cls.pitch + tone.pitch, 0.6, 1.4);

      let done = false;
      let bail = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (bail) clearTimeout(bail);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;

      // Phrases are short enough that Chrome's ~15s truncation never fires, so
      // the old pause/resume keep-alive is gone -- it caused audible stutter.
      // A watchdog still guarantees the queue cannot wedge on a dropped event.
      bail = setTimeout(finish, 2500 + text.length * 110);
      try { window.speechSynthesis.speak(u); } catch { finish(); }
    });
  }
}
