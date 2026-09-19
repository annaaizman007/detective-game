// The seam where online play plugs in.
//
// The UI never touches the reducer directly. It hands actions to a transport,
// the transport decides when they become real, and everyone downstream just
// reacts to the state that comes back. Locally that round-trip is instant.
// Over a socket it is a server echo. Nothing above this file has to know which.

export class LocalTransport {
  constructor() {
    this.listeners = new Set();
    this.localSeats = null; // null => this device controls every seat
  }

  async connect() { return { mode: 'local' }; }

  /** Seats this device is allowed to act for. Local play: all of them. */
  controls() { return this.localSeats; }
  canAct(playerId) { return !this.localSeats || this.localSeats.includes(playerId); }

  onAction(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  send(action) {
    // No ordering service needed: one device, one clock.
    for (const fn of this.listeners) fn(action);
  }

  disconnect() { this.listeners.clear(); }
}

/**
 * Sketch of the online sibling. Because applyAction is pure and every random
 * draw comes from the state's own seed/tick, the server never needs to send
 * state -- an ordered action log is enough for every client to arrive at an
 * identical board. See js/net/README.md.
 */
export class SocketTransport {
  constructor(url, room, seat) {
    this.url = url; this.room = room; this.seat = seat;
    this.listeners = new Set();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(`${this.url}?room=${encodeURIComponent(this.room)}`);
    await new Promise((res, rej) => {
      this.socket.addEventListener('open', res, { once: true });
      this.socket.addEventListener('error', rej, { once: true });
    });
    this.socket.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'action') for (const fn of this.listeners) fn(msg.action);
    });
    return { mode: 'online', room: this.room };
  }

  controls() { return [this.seat]; }
  canAct(playerId) { return playerId === this.seat; }
  onAction(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  send(action) {
    // Optimistic application is deliberately NOT done here: the server's order
    // is the only order, so we wait for the echo and stay in lockstep.
    this.socket.send(JSON.stringify({ type: 'action', action }));
  }

  disconnect() { this.socket?.close(); this.listeners.clear(); }
}
