import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { handle, leave, rooms, sweep, HOLD_MS } from './rooms';
import type { RoomView, ServerMsg } from '../shared/protocol';

const sock = () => {
  const inbox: ServerMsg[] = [];
  const ws = { readyState: 1, send: (s: string) => inbox.push(JSON.parse(s)), close: () => {} } as unknown as WebSocket;
  const last = () => (inbox.filter((m) => m.t === 'room').at(-1) as { room: RoomView }).room;
  const error = () => inbox.filter((m) => m.t === 'error').at(-1);
  return { ws, last, error };
};

function pair() {
  const a = sock(), b = sock();
  handle(a.ws, { t: 'create', pid: 'pa', name: 'Pranay' });
  const code = a.last().code;
  handle(b.ws, { t: 'join', pid: 'pb', name: 'Sam', code });
  return { a, b, code };
}

describe('rooms', () => {
  it('creates a room with a 4 letter code and seats two players', () => {
    const { a, b, code } = pair();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);
    expect(b.last().players.map((p) => p?.name)).toEqual(['Pranay', 'Sam']);
    const c = sock();
    handle(c.ws, { t: 'join', pid: 'pc', name: 'X', code });
    expect(c.error()).toEqual({ t: 'error', message: 'That room is full.' });
    handle(a.ws, { t: 'leave' });
  });

  it('starts when both are ready and gives each player a different half', () => {
    const { a, b } = pair();
    handle(a.ws, { t: 'ready', ready: true });
    expect(a.last().game).toBeNull();
    handle(b.ws, { t: 'ready', ready: true });
    expect(a.last().game?.half).toBe('A');
    expect(b.last().game?.half).toBe('B');
    expect(a.last().game?.detail).toHaveProperty('serial');
    expect(b.last().game?.detail).toHaveProperty('batteries');
  });

  it('pauses on disconnect, resumes on rejoin, and swaps halves on rematch', () => {
    const { a, b, code } = pair();
    handle(a.ws, { t: 'ready', ready: true });
    handle(b.ws, { t: 'ready', ready: true });
    leave(b.ws);
    expect(a.last().game?.paused).toBe('disconnect');
    const b2 = sock();
    handle(b2.ws, { t: 'join', pid: 'pb', name: 'Sam', code });
    expect(b2.last().you).toBe(1);
    expect(a.last().game?.paused).toBeNull();

    const room = rooms.get(code)!;
    room.game!.status = 'won';
    handle(a.ws, { t: 'rematch' });
    handle(b2.ws, { t: 'rematch' });
    expect(a.last().game?.half).toBe('B');
    expect(b2.last().game?.half).toBe('A');
    expect(a.last().game?.status).toBe('playing');
  });

  it('ends the game if a partner stays away past the hold', () => {
    const { a, b } = pair();
    handle(a.ws, { t: 'ready', ready: true });
    handle(b.ws, { t: 'ready', ready: true });
    leave(b.ws);
    sweep(Date.now() + HOLD_MS + 1);
    expect(a.last().game?.status).toBe('lost');
    expect(a.last().players[1]).toBeNull();
  });
});
