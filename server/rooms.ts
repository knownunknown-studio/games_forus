// Rooms: a 4-letter code, two seats, and at most one game. Every change broadcasts a fresh per-seat view.
import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import { act, end, generate, pause, resume, tick, viewFor, PASS_MS, RULES, type Difficulty, type Game, type Half } from '../games/two-halves/logic';
import type { ClientMsg, RoomView, ServerMsg } from '../shared/protocol';

type Seat = { pid: string; name: string; ws: WebSocket | null; ready: boolean; rematch: boolean; leftAt: number | null };
export type Room = { code: string; seats: (Seat | null)[]; difficulty: Difficulty; game: Game | null; round: number; emptySince: number | null };

export const rooms = new Map<string, Room>();
const conns = new Map<WebSocket, { room: Room; seat: number }>();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const HOLD_MS = 60_000;
const ROOM_TTL_MS = 10 * 60_000;

const newCode = () => {
  let code: string;
  do code = Array.from(randomBytes(4), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  while (rooms.has(code));
  return code;
};

// Sides swap every round, so a rematch puts each player on the other half.
const halfOf = (room: Room, seat: number): Half => ((seat + room.round) % 2 ? 'B' : 'A');
const send = (ws: WebSocket | null | undefined, msg: ServerMsg) => ws?.readyState === 1 && ws.send(JSON.stringify(msg));

function view(room: Room, seat: number, now: number): RoomView {
  return {
    code: room.code,
    you: seat,
    difficulty: room.difficulty,
    players: room.seats.map((s) => s && { name: s.name, ready: s.ready, online: !!s.ws, rematch: s.rematch }),
    halves: [halfOf(room, 0), halfOf(room, 1)],
    game: room.game && viewFor(room.game, halfOf(room, seat), now),
  };
}

export function broadcast(room: Room) {
  const now = Date.now();
  room.seats.forEach((s, i) => send(s?.ws, { t: 'room', room: view(room, i, now) }));
}

function start(room: Room, now: number) {
  room.game = generate(randomBytes(8).toString('hex'), room.difficulty, now);
  room.seats.forEach((s) => s && Object.assign(s, { ready: false, rematch: false }));
}

export function handle(ws: WebSocket, msg: ClientMsg) {
  const now = Date.now();
  const fail = (message: string) => send(ws, { t: 'error', message });

  if (msg.t === 'create' || msg.t === 'join') {
    const name = String(msg.name ?? '').trim().slice(0, 16) || 'Player';
    const pid = String(msg.pid ?? '').slice(0, 64);
    if (!pid) return fail('Missing player id.');
    const room: Room | undefined = msg.t === 'create'
      ? { code: newCode(), seats: [null, null], difficulty: 'normal', game: null, round: 0, emptySince: null }
      : rooms.get(String(msg.code ?? '').trim().toUpperCase());
    if (!room) return fail('No room with that code.');
    let seat = room.seats.findIndex((s) => s?.pid === pid);
    if (seat < 0) seat = room.seats.findIndex((s) => !s);
    if (seat < 0) return fail('That room is full.');
    rooms.set(room.code, room);
    leave(ws);
    const prev = room.seats[seat];
    if (prev?.ws && prev.ws !== ws) { conns.delete(prev.ws); prev.ws.close(4000, 'Opened in another tab'); }
    room.seats[seat] = { pid, name, ws, ready: prev?.ready ?? false, rematch: prev?.rematch ?? false, leftAt: null };
    conns.set(ws, { room, seat });
    room.emptySince = null;
    if (room.game?.pauseKind === 'disconnect' && room.seats.every((s) => s?.ws)) resume(room.game, now);
    return broadcast(room);
  }

  const c = conns.get(ws);
  if (!c) return fail('Join a room first.');
  const { room, seat } = c;
  const me = room.seats[seat]!;
  const g = room.game;

  switch (msg.t) {
    case 'ready':
      if (g) return;
      me.ready = !!msg.ready;
      if (room.seats.every((s) => s?.ready && s.ws)) start(room, now);
      break;
    case 'difficulty':
      if (g || !(msg.difficulty in RULES)) return;
      room.difficulty = msg.difficulty;
      room.seats.forEach((s) => s && (s.ready = false));
      break;
    case 'act': {
      if (!g || !msg.action || typeof msg.action !== 'object') return;
      const error = act(g, halfOf(room, seat), msg.action, now);
      if (error) return fail(error);
      if (msg.action.type === 'pass') setTimeout(() => broadcast(room), PASS_MS + 20);
      break;
    }
    case 'rematch':
      if (!g || g.status === 'playing') return;
      me.rematch = true;
      if (room.seats.every((s) => s?.rematch)) {
        room.round++;
        start(room, now);
      }
      break;
    case 'lobby':
      if (g?.status === 'playing') return;
      room.game = null;
      room.seats.forEach((s) => s && Object.assign(s, { ready: false, rematch: false }));
      break;
    case 'leave':
      return leave(ws, true);
    default:
      return;
  }
  broadcast(room);
}

/** Called on socket close (seat held for HOLD_MS) or an explicit leave (seat freed now). */
export function leave(ws: WebSocket, explicit = false) {
  const c = conns.get(ws);
  if (!c) return;
  conns.delete(ws);
  const { room, seat } = c;
  const s = room.seats[seat];
  if (!s || s.ws !== ws) return;
  const now = Date.now();
  if (explicit) {
    room.seats[seat] = null;
    if (room.game) end(room.game, now, 'lost', 'Your partner left the room.');
  } else {
    Object.assign(s, { ws: null, leftAt: now });
    if (room.game) pause(room.game, now, 'disconnect');
  }
  broadcast(room);
}

/** Runs a few times a second: timers, auto-resume, dropped seats, empty rooms. */
export function sweep(now = Date.now()) {
  for (const room of rooms.values()) {
    let changed = room.game ? tick(room.game, now) : false;
    room.seats.forEach((s, i) => {
      if (!s || s.ws || s.leftAt === null || now - s.leftAt < HOLD_MS) return;
      room.seats[i] = null;
      if (room.game) end(room.game, now, 'lost', 'Your partner did not come back in time.');
      changed = true;
    });
    if (room.seats.some((s) => s?.ws)) room.emptySince = null;
    else if ((room.emptySince ??= now) && now - room.emptySince > ROOM_TTL_MS) {
      rooms.delete(room.code);
      continue;
    }
    if (changed) broadcast(room);
  }
}
