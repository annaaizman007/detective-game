// Deterministic RNG. Every random draw is a pure function of (seed, tick), and
// the tick lives inside the game state -- so two machines replaying the same
// action log land on byte-identical states. That is what makes the online
// transport in src/net/ a drop-in later.

export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Stream {
  float: () => number;
  int: (n: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  shuffle: <T>(arr: readonly T[]) => T[];
  readonly tick: number;
}

/** A self-contained stream, used during setup where no state exists yet. */
export function stream(seed: string): Stream {
  let tick = 0;
  const next = () => mulberry32((hashSeed(String(seed)) + tick++ * 0x9e3779b9) >>> 0)();
  return {
    float: next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    get tick() {
      return tick;
    },
  };
}

interface Seeded {
  seed: string;
  tick: number;
}

/** Draws against a mutable state object carrying `seed` and `tick`. */
export function draw(state: Seeded): number {
  const v = mulberry32((hashSeed(String(state.seed)) + state.tick * 0x9e3779b9) >>> 0)();
  state.tick += 1;
  return v;
}

export const drawInt = (state: Seeded, n: number): number => Math.floor(draw(state) * n);
export const drawPick = <T>(state: Seeded, arr: readonly T[]): T => arr[drawInt(state, arr.length)];

export function drawShuffle<T>(state: Seeded, arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = drawInt(state, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
