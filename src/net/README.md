# Playing over the wire

The local game and a networked game run **the same reducer**. Nothing in
`js/state.js` knows or cares which one is in use.

Why it drops in cleanly:

- `applyAction(state, action)` is pure.
- Every random draw comes from `state.seed` + `state.tick`, both of which live
  inside the state and advance deterministically.
- Therefore an **ordered list of actions** fully determines the board. A server
  never has to serialise game state -- it only has to agree on order.

## What's left to build

1. **A relay.** ~60 lines of `ws`: hold a `Map<roomCode, {seed, players, log[]}>`,
   append incoming actions, broadcast them, and replay the log to late joiners.
2. **A lobby screen.** Host creates a room (server returns the code + seed),
   guests join and claim a seat; the host presses start and the server freezes
   the roster into a `createGame` payload every client runs locally.
3. **Swap the transport.** In `js/main.js`, construct `SocketTransport` instead
   of `LocalTransport`. The UI already refuses to act on seats the transport
   says it does not control (`transport.canAct`), so turn enforcement comes for
   free.

Since the game is co-operative and all knowledge is shared, there is no hidden
information to hide from other clients -- which is the part that usually makes
this hard.
