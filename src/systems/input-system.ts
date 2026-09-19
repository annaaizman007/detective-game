// Keyboard shortcuts for the table. The board's own pointer handling lives
// in the Phaser scene; this maps keys to the same abstract actions the
// buttons dispatch, so a keyboard player never has to reach for the mouse.

export type InputAction =
  | 'escape' | 'search' | 'move' | 'talk' | 'journal' | 'notebook' | 'exhibits' | 'zoom-in' | 'zoom-out' | 'find-me' | 'end-turn' | 'help' | 'casefile';

const KEYS: Record<string, InputAction> = {
  Escape: 'escape',
  s: 'search',
  m: 'move',
  t: 'talk',
  j: 'journal',
  n: 'notebook',
  e: 'exhibits',
  '+': 'zoom-in', '=': 'zoom-in',
  '-': 'zoom-out', '_': 'zoom-out',
  f: 'find-me',
  c: 'casefile',
  '?': 'help',
};

export class InputSystem {
  private handlers = new Set<(a: InputAction, e: KeyboardEvent) => void>();
  private bound = (e: KeyboardEvent) => this.onKey(e);

  attach(): void { window.addEventListener('keydown', this.bound); }
  detach(): void { window.removeEventListener('keydown', this.bound); }

  on(fn: (a: InputAction, e: KeyboardEvent) => void): () => void {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  private onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    // Never steal keys from a field the player is typing in.
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
      if (e.key !== 'Escape') return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter' && e.shiftKey) { for (const fn of this.handlers) fn('end-turn', e); return; }
    const a = KEYS[e.key];
    if (!a) return;
    for (const fn of this.handlers) fn(a, e);
  }
}
