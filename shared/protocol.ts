// Messages between the browser and the server, shared by both sides.
import type { Action, Difficulty, GameView, Half } from '../games/two-halves/logic';

export type ClientMsg =
  | { t: 'create'; pid: string; name: string }
  | { t: 'join'; pid: string; name: string; code: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'difficulty'; difficulty: Difficulty }
  | { t: 'act'; action: Action }
  | { t: 'rematch' }
  | { t: 'lobby' }
  | { t: 'leave' };

export type PlayerView = { name: string; ready: boolean; online: boolean; rematch: boolean } | null;

export type RoomView = {
  code: string;
  you: number;
  difficulty: Difficulty;
  players: PlayerView[];
  halves: Half[];
  game: GameView | null;
};

export type ServerMsg = { t: 'room'; room: RoomView } | { t: 'error'; message: string };
