// Atmosphere on the DOM side: typewriter, flicker, the big flashes. Rain is
// the weather scene's now. Everything here is cancellable and honours the
// player's motion setting in one place.

import { STORAGE } from '../config/constants';

export const reduceMotion = (): boolean =>
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  || localStorage.getItem(STORAGE.prefix + 'motion') === 'off';

/** Types text out character by character; returns a cancel function. */
export function typewriter(el: HTMLElement, text: string, { speed = 18, onDone }: { speed?: number; onDone?: () => void } = {}): () => void {
  if (reduceMotion()) { el.textContent = text; onDone?.(); return () => {}; }
  el.textContent = '';
  let i = 0;
  let stopped = false;
  const step = () => {
    if (stopped) return;
    const take = text[i] === ' ' ? 2 : 1; // bursty, like a real machine
    el.textContent = text.slice(0, (i += take));
    if (i < text.length) setTimeout(step, speed + Math.random() * speed * 0.8);
    else onDone?.();
  };
  setTimeout(step, 90);
  return () => { stopped = true; el.textContent = text; };
}

/** Briefly flashes an element -- used when a clue lands. */
export function pulse(el: Element | null, cls = 'is-pulsing', ms = 900): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/** A one-shot full-screen wash of colour for big beats. */
export function flash(kind: 'clue' | 'alert' = 'clue'): void {
  if (reduceMotion()) return;
  const el = document.createElement('div');
  el.className = `screen-flash flash-${kind}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/** Escape text for insertion into markup. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Download a text file from the browser. */
export function download(name: string, text: string, type = 'text/plain'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}
