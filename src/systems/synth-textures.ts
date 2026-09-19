// Sound textures written sample by sample into AudioBuffers and looped.
// Baking one long buffer costs nothing at playback, where scheduling ten
// thousand tiny oscillators a minute would cost a great deal.

/** A couple of seconds of noise, looped. Brown for rumble, white for hiss. */
export function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

/** Crossfade the tail into the head so a loop has no seam, then normalise. */
function finishLoop(work: Float32Array, out: Float32Array, len: number, fade: number, peakTo = 0.85): void {
  for (let i = 0; i < len; i++) out[i] = work[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] = out[i] * k + work[len + i] * (1 - k);
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) { const g = peakTo / peak; for (let i = 0; i < len; i++) out[i] *= g; }
}

/**
 * Rain.
 *
 * Filtered noise alone is a hiss, not rain -- what the ear actually uses to
 * recognise rain is the transients: thousands of individual drops striking
 * things, each a tiny pitched click with its own decay, over a broadband bed.
 * So this bakes the drops in: a dense layer of small ones for the sheet of it,
 * a sparse layer of fat ones for the drips off a ledge, over hiss and rumble.
 * The two channels are generated independently, which is what makes it sound
 * like weather all around rather than a speaker in front of you.
 */
export function rainBuffer(ctx: AudioContext, seconds = 9): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.6);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const work = new Float32Array(len + fade);

    // --- bed: hiss (two-pole lowpass on white) plus a brown rumble -------
    let lp1 = 0; let lp2 = 0; let brown = 0; let hp = 0; let prev = 0;
    for (let i = 0; i < work.length; i++) {
      const white = Math.random() * 2 - 1;
      lp1 += (white - lp1) * 0.28;
      lp2 += (lp1 - lp2) * 0.28;
      brown = (brown + 0.018 * white) / 1.018;
      hp = 0.94 * (hp + lp2 - prev);
      prev = lp2;
      work[i] = hp * 0.22 + brown * 0.4;
    }

    const addDrop = (at: number, freq: number, decaySec: number, amp: number, noisiness: number) => {
      const n = Math.min(work.length - at, Math.floor(decaySec * sr));
      const w = (Math.PI * 2 * freq) / sr;
      for (let t = 0; t < n; t++) {
        const env = Math.exp(-t / (decaySec * sr * 0.32));
        const tone = Math.sin(w * t);
        const grit = Math.random() * 2 - 1;
        work[at + t] += amp * env * (tone * (1 - noisiness) + grit * noisiness);
      }
    };

    // Fine spatter: the sheet of rain.
    for (let d = 0; d < seconds * 300; d++) {
      addDrop(Math.floor(Math.random() * len), 1600 + Math.random() * 4400, 0.004 + Math.random() * 0.014, Math.random() ** 2.1 * 0.85, 0.55);
    }
    // Middle distance: drops on the sill and the car roof below.
    for (let d = 0; d < seconds * 46; d++) {
      addDrop(Math.floor(Math.random() * len), 620 + Math.random() * 1500, 0.018 + Math.random() * 0.05, 0.1 + Math.random() ** 1.7 * 0.55, 0.4);
    }
    // Fat drips off ledges and gutters: rarer, lower, longer.
    for (let d = 0; d < seconds * 9; d++) {
      addDrop(Math.floor(Math.random() * len), 180 + Math.random() * 520, 0.05 + Math.random() * 0.13, 0.18 + Math.random() ** 2 * 0.45, 0.25);
    }

    finishLoop(work, buf.getChannelData(ch), len, fade);
  }
  return buf;
}

/**
 * A fire in the grate.
 *
 * A fire is three things: a low, breathing roar of hot air; a constant fine
 * sizzle; and the pops -- sharp, pitched, irregular, in clusters, each with a
 * short ring as the wood splits. Recordings are almost all pops; so is this.
 */
export function fireBuffer(ctx: AudioContext, seconds = 11): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.8);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const work = new Float32Array(len + fade);

    // Roar: brown noise through a slow, wandering lowpass.
    let brown = 0; let lp = 0; let cutoff = 0.05;
    for (let i = 0; i < work.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      if (i % 4096 === 0) cutoff = 0.03 + Math.random() * 0.05;
      lp += (brown * 3 - lp) * cutoff;
      work[i] = lp * 0.5;
    }
    // Sizzle: a faint, fast-flickering high hiss.
    let sizz = 0;
    for (let i = 0; i < work.length; i++) {
      const white = Math.random() * 2 - 1;
      sizz += (white - sizz) * 0.6;
      const flicker = 0.5 + 0.5 * Math.sin(i * 0.00021) * Math.sin(i * 0.0013);
      work[i] += sizz * 0.05 * flicker;
    }

    const pop = (at: number, freq: number, decaySec: number, amp: number) => {
      const n = Math.min(work.length - at, Math.floor(decaySec * sr));
      const w = (Math.PI * 2 * freq) / sr;
      for (let t = 0; t < n; t++) {
        const env = Math.exp(-t / (decaySec * sr * 0.22));
        // Mostly a click, with a short pitched ring under it.
        const click = t < 40 ? (Math.random() * 2 - 1) : 0;
        work[at + t] += amp * env * (click * 0.9 + Math.sin(w * t) * 0.35);
      }
    };

    // Pops arrive in clusters: a splitting log throws several at once.
    let t = 0;
    while (t < len) {
      const cluster = 1 + Math.floor(Math.random() ** 2 * 6);
      for (let k = 0; k < cluster; k++) {
        const at = Math.min(len - 1, t + Math.floor(Math.random() * sr * 0.18));
        const big = Math.random() < 0.12;
        pop(at, big ? 900 + Math.random() * 1400 : 2200 + Math.random() * 3600,
          big ? 0.05 + Math.random() * 0.06 : 0.008 + Math.random() * 0.02,
          big ? 0.6 + Math.random() * 0.4 : 0.15 + Math.random() ** 1.5 * 0.5);
      }
      t += Math.floor(sr * (0.05 + Math.random() ** 1.6 * 0.55));
    }
    // Embers: a constant patter of tiny ticks.
    for (let d = 0; d < seconds * 60; d++) {
      pop(Math.floor(Math.random() * len), 4000 + Math.random() * 4000, 0.004 + Math.random() * 0.006, 0.05 + Math.random() * 0.12);
    }

    finishLoop(work, buf.getChannelData(ch), len, fade);
  }
  return buf;
}

/** A synthetic room: exponentially decaying noise, for the convolver. */
export function impulseBuffer(ctx: AudioContext, seconds = 2.4, decay = 3.2): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
