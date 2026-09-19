// The seam where online play plugs in.
//
// The UI never touches the reducer directly. It hands actions to a transport,
// the transport decides when they become real, and everyone downstream just
// reacts to the state that comes back. Locally that round-trip is instant.
// Over a socket it is a server echo. Nothing above this file has to know which.

import type { Action } from '../types/game-types';

export interface Transport {
  connect(): Promise<{ mode: 'local' | 'online'; room?: string }>;
  controls(): string[] | null;
  canAct(playerId: string): boolean;
  onAction(fn: (a: Action) => void): () => void;
  send(action: Action): void;
  disconnect(): void;
}

export class LocalTransport implements Transport {
  private listeners = new Set<(a: Action) => void>();
  localSeats: string[] | null = null; // null => this device controls every seat

  async connect() { return { mode: 'local' as const }; }
  controls() { return this.localSeats; }
  canAct(playerId: string) { return !this.localSeats || this.localSeats.includes(playerId); }
  onAction(fn: (a: Action) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  send(action: Action) { for (const fn of this.listeners) fn(action); }
  disconnect() { this.listeners.clear(); }
}

/**
 * Sketch of the online sibling. Because applyAction is pure and every random
 * draw comes from the state's own seed/tick, the server never needs to send
 * state -- an ordered action log is enough for every client to arrive at an
 * identical board. See src/net/README.md.
 */
export class SocketTransport implements Transport {
  private listeners = new Set<(a: Action) => void>();
  private socket: WebSocket | null = null;

  constructor(private url: string, private room: string, private seat: string) {}

  async connect() {
    const socket = new WebSocket(`${this.url}?room=${encodeURIComponent(this.room)}`);
    this.socket = socket;
    await new Promise<void>((res, rej) => {
      socket.addEventListener('open', () => res(), { once: true });
      socket.addEventListener('error', () => rej(new Error('socket error')), { once: true });
    });
    socket.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data)) as { type: string; action: Action };
      if (msg.type === 'action') for (const fn of this.listeners) fn(msg.action);
    });
    return { mode: 'online' as const, room: this.room };
  }

  controls() { return [this.seat]; }
  canAct(playerId: string) { return playerId === this.seat; }
  onAction(fn: (a: Action) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  send(action: Action) {
    // Optimistic application is deliberately NOT done here: the server's order
    // is the only order, so we wait for the echo and stay in lockstep.
    this.socket?.send(JSON.stringify({ type: 'action', action }));
  }
  disconnect() { this.socket?.close(); this.listeners.clear(); }
}
