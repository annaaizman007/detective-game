// The narrator.
//
// Every briefing, every clue, every event is spoken aloud through the Web
// Speech API -- no audio files, no API key, works offline. Two browser quirks
// are worked around here because they will bite otherwise:
//   1. voice lists load asynchronously (and sometimes arrive empty first).
//   2. Chrome silently stops a single long utterance after ~15 seconds, so
//      long passages are split into sentence-sized chunks and queued.

const TONES = {
  narrator: { rate: 0.94, pitch: 0.82 },
  brief: { rate: 0.88, pitch: 0.78 },
  alert: { rate: 1.0, pitch: 0.72 },
  clue: { rate: 0.96, pitch: 0.88 },
  title: { rate: 0.8, pitch: 0.7 },
};

// Voices that actually sound like a man in a raincoat, best first.
const PREFERRED = [
  'Google UK English Male', 'Daniel', 'Arthur', 'Oliver', 'Alex', 'Fred',
  'Microsoft George', 'Microsoft Ryan', 'Google US English', 'Samantha',
];

const clean = (text) => String(text)
  .replace(/—|--/g, ', ')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim();

function chunk(text, max = 170) {
  const sentences = clean(text).match(/[^.!?]+[.!?]*\s*/g) || [clean(text)];
  const out = [];
  let buf = '';
  for (const raw of sentences) {
    const sn = raw.trim();
    if (!sn) continue;
    if ((buf + ' ' + sn).trim().length > max && buf) { out.push(buf.trim()); buf = sn; }
    else buf = (buf + ' ' + sn).trim();
  }
  if (buf) out.push(buf);
  // Anything still monstrous gets split on commas.
  return out.flatMap((s) => (s.length <= max * 1.6 ? [s] : s.split(/,\s*/).reduce((acc, part) => {
    const last = acc[acc.length - 1];
    if (last && (last + ', ' + part).length <= max) acc[acc.length - 1] = last + ', ' + part;
    else acc.push(part);
    return acc;
  }, [])));
}

export class Narrator {
  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.enabled = true;
    this.voices = [];
    this.voiceURI = null;
    this.queue = [];
    this.speaking = false;
    this.subscribers = new Set();
    this._keepAlive = null;
    this._token = 0;
    if (this.supported) {
      this._loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this._loadVoices());
      // Safari never fires voiceschanged on first load.
      setTimeout(() => this._loadVoices(), 250);
      setTimeout(() => this._loadVoices(), 1200);
    }
  }

  _loadVoices() {
    if (!this.supported) return;
    const all = window.speechSynthesis.getVoices() || [];
    this.voices = all.filter((v) => /^en/i.test(v.lang));
    if (!this.voices.length) this.voices = all;
    if (!this.voiceURI && this.voices.length) {
      const saved = localStorage.getItem('ashgrave.voice');
      const match = saved && this.voices.find((v) => v.voiceURI === saved);
      this.voiceURI = (match || this._bestVoice()).voiceURI;
    }
    this._emit({ type: 'voices' });
  }

  _bestVoice() {
    for (const name of PREFERRED) {
      const hit = this.voices.find((v) => v.name.includes(name));
      if (hit) return hit;
    }
    return this.voices.find((v) => /en-GB/i.test(v.lang)) || this.voices[0];
  }

  get voice() { return this.voices.find((v) => v.voiceURI === this.voiceURI) || null; }

  setVoice(uri) {
    this.voiceURI = uri;
    try { localStorage.setItem('ashgrave.voice', uri); } catch { /* private mode */ }
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('ashgrave.voiceOn', on ? '1' : '0'); } catch { /* private mode */ }
    if (!on) this.stop();
    this._emit({ type: 'enabled', enabled: on });
  }

  /** Subtitles and speaking-state changes both arrive here. */
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  _emit(ev) { for (const fn of this.subscribers) fn(ev); }

  /** Queue a line. Always resolves, even when speech is off or unavailable. */
  say(text, tone = 'narrator') {
    const line = clean(text);
    if (!line) return;
    this.queue.push({ line, tone });
    this._emit({ type: 'queued', text: line, tone });
    if (!this.speaking) this._drain();
  }

  sayAll(lines) { for (const l of lines) this.say(l.text ?? l, l.tone ?? 'narrator'); }

  stop() {
    this._token += 1;
    this.queue = [];
    this.speaking = false;
    this._stopKeepAlive();
    if (this.supported) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
    this._emit({ type: 'idle' });
  }

  skip() { this.stop(); }

  _stopKeepAlive() {
    if (this._keepAlive) { clearInterval(this._keepAlive); this._keepAlive = null; }
  }

  async _drain() {
    this.speaking = true;
    const token = this._token;
    while (this.queue.length) {
      const item = this.queue.shift();
      if (token !== this._token) return;
      this._emit({ type: 'line', text: item.line, tone: item.tone });
      if (this.enabled && this.supported) {
        for (const part of chunk(item.line)) {
          if (token !== this._token) return;
          await this._utter(part, item.tone, token);
        }
      } else {
        // Silent mode still paces the subtitles so the UI reads naturally.
        await new Promise((r) => setTimeout(r, Math.min(4500, 400 + item.line.length * 28)));
      }
    }
    if (token !== this._token) return;
    this.speaking = false;
    this._emit({ type: 'idle' });
  }

  _utter(text, tone, token) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const t = TONES[tone] || TONES.narrator;
      u.rate = t.rate; u.pitch = t.pitch; u.volume = 1;
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; }
      let done = false;
      let bail = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (bail) clearTimeout(bail);
        this._stopKeepAlive();
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      // Chrome pauses long synthesis unless nudged.
      this._stopKeepAlive();
      this._keepAlive = setInterval(() => {
        if (token !== this._token) { finish(); return; }
        try {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        } catch { /* ignore */ }
      }, 9000);
      // Hard ceiling: never let a swallowed utterance wedge the queue.
      bail = setTimeout(finish, 3000 + text.length * 120);
      try { window.speechSynthesis.speak(u); } catch { finish(); }
    });
  }
}
