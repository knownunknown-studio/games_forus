// Two Halves rules. The server holds a Game; each player only ever receives viewFor(game, theirHalf).
import { int, pick, rng, shuffle, type Rng } from './rng';
import {
  KEYPAD_COLUMNS, LIGHTS, MODULE_TYPES, PULSE, TOOLS, TOOL_NAMES, WIRE_COLORS, WORDS,
  type Light, type ModuleType, type ToolId, type WireColor,
} from './manual';

export type Half = 'A' | 'B';
export type Difficulty = 'easy' | 'normal' | 'hard';

type Base = { id: string; side: Half; screws: number; solvedAt: number | null };
export type Wires = Base & { type: 'wires'; wires: { color: WireColor; mark: boolean }[]; cut: boolean[]; uv: boolean };
export type Keypad = Base & { type: 'keypad'; column: number; glyphs: number[]; pressed: number[] };
export type Pulse = Base & { type: 'pulse'; seq: Light[]; stage: number; progress: number; voltage: number; measured: boolean };
export type WordLock = Base & { type: 'wordlock'; dials: string[][]; pos: number[]; word: string };
export type Module = Wires | Keypad | Pulse | WordLock;

export type Game = {
  difficulty: Difficulty;
  serial: string;
  batteries: number;
  modules: Module[];
  tools: Record<ToolId, { at: Half; arrives: number }>;
  startedAt: number;
  endsAt: number;
  pausedAt: number | null;
  pauseKind: 'player' | 'disconnect' | null;
  pauseUsed: boolean;
  hintUsed: boolean;
  requests: { pause: Half | null; hint: Half | null };
  hint: { for: Half; moduleId: string; text: string } | null;
  strikes: number;
  maxStrikes: number;
  status: 'playing' | 'won' | 'lost';
  endedAt: number | null;
  lostReason: string | null;
  notes: string;
};

export type Action =
  | { type: 'unscrew' | 'uv' | 'measure' | 'submit'; module: string }
  | { type: 'cut'; module: string; wire: number }
  | { type: 'press'; module: string; glyph: number }
  | { type: 'light'; module: string; color: Light }
  | { type: 'dial'; module: string; dial: number; dir: 1 | -1 }
  | { type: 'pass'; tool: ToolId }
  | { type: 'pause' | 'resume' | 'hint' }
  | { type: 'notes'; text: string };

export const RULES: Record<Difficulty, { perSide: number; secs: number; strikes: number }> = {
  easy: { perSide: 1, secs: 300, strikes: 3 },
  normal: { perSide: 2, secs: 300, strikes: 3 },
  hard: { perSide: 3, secs: 360, strikes: 2 },
};
export const PASS_MS = 2000;
export const STRIKE_MS = 30_000;
export const PAUSE_MS = 60_000;
export const other = (h: Half): Half => (h === 'A' ? 'B' : 'A');

// ---------- Generation ----------

export function generate(seed: string, difficulty: Difficulty, now: number): Game {
  const r = rng(seed);
  const cfg = RULES[difficulty];
  const L = [...'ABCDEFGHJKLMNPRSTUVWXZ'], D = [...'0123456789'];
  const serial = `${pick(r, L)}${pick(r, L)}-${[D, L, D, D, L].map((s) => pick(r, s)).join('')}`;
  const types: ModuleType[] = shuffle(r, MODULE_TYPES);
  while (types.length < cfg.perSide * 2) types.push(pick(r, MODULE_TYPES));
  const modules = types.slice(0, cfg.perSide * 2).map((t, i) => makeModule(r, t, `m${i}`, i % 2 ? 'B' : 'A'));
  const tools = shuffle(r, TOOLS);
  return {
    difficulty, serial, batteries: int(r, 0, 4), modules,
    tools: Object.fromEntries(tools.map((t, i) => [t, { at: i < 2 ? 'A' : 'B', arrives: 0 }])) as Game['tools'],
    startedAt: now, endsAt: now + cfg.secs * 1000, pausedAt: null, pauseKind: null,
    pauseUsed: false, hintUsed: false, requests: { pause: null, hint: null }, hint: null,
    strikes: 0, maxStrikes: cfg.strikes, status: 'playing', endedAt: null, lostReason: null, notes: '',
  };
}

function makeModule(r: Rng, type: ModuleType, id: string, side: Half): Module {
  const base = { id, side, screws: int(r, 2, 3), solvedAt: null };
  if (type === 'wires') {
    const wires = Array.from({ length: int(r, 3, 6) }, () => ({ color: pick(r, WIRE_COLORS), mark: false }));
    if (r() < 0.35) wires[int(r, 0, wires.length - 1)].mark = true;
    return { ...base, type, wires, cut: wires.map(() => false), uv: false };
  }
  if (type === 'keypad') {
    for (;;) {
      const column = int(r, 0, KEYPAD_COLUMNS.length - 1);
      const glyphs = shuffle(r, KEYPAD_COLUMNS[column]).slice(0, 4);
      const unique = KEYPAD_COLUMNS.every((c, i) => i === column || !glyphs.every((g) => c.includes(g)));
      if (unique) return { ...base, type, column, glyphs, pressed: [] };
    }
  }
  if (type === 'pulse') {
    return { ...base, type, seq: Array.from({ length: 3 }, () => pick(r, LIGHTS)), stage: 1, progress: 0, voltage: int(r, 0, 9), measured: false };
  }
  const alphabet = [...'ABCDEFGHIKLMNOPRSTUVWY'];
  for (;;) {
    const word = pick(r, WORDS);
    const dials = [...word].map((ch) => shuffle(r, [ch, ...shuffle(r, alphabet.filter((x) => x !== ch)).slice(0, 5)]));
    const unique = WORDS.every((w) => w === word || ![...w].every((ch, i) => dials[i].includes(ch)));
    if (unique) return { ...base, type: 'wordlock', dials, pos: dials.map(() => int(r, 0, 5)), word };
  }
}

// ---------- Answers (server side only) ----------

const lastDigit = (s: string) => Number([...s].reverse().find((c) => c >= '0' && c <= '9'));

export function wireAnswer(m: Wires, g: Pick<Game, 'serial' | 'batteries'>) {
  const marked = m.wires.findIndex((w) => w.mark);
  if (marked >= 0) return { wire: marked, rule: 0 };
  const reds = m.wires.flatMap((w, i) => (w.color === 'red' ? [i] : []));
  if (!reds.length) return { wire: 1, rule: 1 };
  if (lastDigit(g.serial) % 2) return { wire: reds[reds.length - 1], rule: 2 };
  if (g.batteries >= 2) return { wire: m.wires.length - 1, rule: 3 };
  return { wire: 0, rule: 4 };
}

export const keypadOrder = (m: Keypad) =>
  [...m.glyphs].sort((a, b) => KEYPAD_COLUMNS[m.column].indexOf(a) - KEYPAD_COLUMNS[m.column].indexOf(b));

export const pulseMap = (voltage: number, strikes: number) => PULSE[voltage >= 5 ? 'high' : 'low'][Math.min(strikes, 2)];

// ---------- Time ----------

export const timeLeft = (g: Game, now: number) => Math.max(0, g.endsAt - (g.pausedAt ?? g.endedAt ?? now));

export function pause(g: Game, now: number, kind: 'player' | 'disconnect') {
  if (g.status !== 'playing') return;
  g.pausedAt ??= now;
  if (kind === 'disconnect' || !g.pauseKind) g.pauseKind = kind;
}

export function resume(g: Game, now: number) {
  if (g.pausedAt === null) return;
  g.endsAt += now - g.pausedAt;
  g.pausedAt = null;
  g.pauseKind = null;
}

export function end(g: Game, now: number, status: 'won' | 'lost', reason: string | null = null) {
  if (g.status !== 'playing') return;
  if (g.pausedAt !== null) resume(g, now);
  Object.assign(g, { status, endedAt: now, lostReason: reason });
}

/** Advances time-based state. Returns true when something players can see changed. */
export function tick(g: Game, now: number): boolean {
  if (g.status !== 'playing') return false;
  if (g.pausedAt !== null) {
    if (g.pauseKind === 'player' && now - g.pausedAt >= PAUSE_MS) return resume(g, now), true;
    return false;
  }
  if (now >= g.endsAt) return end(g, g.endsAt, 'lost', 'Time ran out.'), true;
  return false;
}

// ---------- Actions ----------

const toolReady = (g: Game, t: ToolId, h: Half, now: number) => g.tools[t].at === h && now >= g.tools[t].arrives;

function strike(g: Game, now: number) {
  g.strikes++;
  g.endsAt -= STRIKE_MS;
  if (g.strikes >= g.maxStrikes) end(g, now, 'lost', 'Too many strikes. The device went off.');
  else tick(g, now);
}

function solve(g: Game, m: Module, now: number) {
  m.solvedAt = now;
  if (g.modules.every((x) => x.solvedAt)) end(g, now, 'won');
}

function request(g: Game, h: Half, kind: 'pause' | 'hint', now: number) {
  if (kind === 'pause' ? g.pauseUsed : g.hintUsed) return `No ${kind} left this round.`;
  const asked = g.requests[kind];
  g.requests[kind] = asked ? null : h; // first tap asks, partner's tap accepts, your second tap cancels
  if (!asked || asked === h) return null;
  if (kind === 'pause') {
    g.pauseUsed = true;
    pause(g, now, 'player');
  } else {
    g.hintUsed = true;
    g.hint = makeHint(g);
  }
  return null;
}

function makeHint(g: Game): Game['hint'] {
  const m = g.modules.find((x) => !x.solvedAt)!;
  const text =
    m.type === 'wires' ? `Wires: rule ${wireAnswer(m, g).rule + 1} is the one that applies.`
    : m.type === 'keypad' ? `Glyph keypad: the symbols are in column ${m.column + 1}.`
    : m.type === 'pulse' ? `Pulse lights: the voltage is ${m.voltage >= 5 ? '5 or more' : 'under 5'}.`
    : `Word lock: the word starts with ${m.word[0]}.`;
  return { for: other(m.side), moduleId: m.id, text };
}

/** Applies one player's action. Returns an error message to show that player, or null. */
export function act(g: Game, h: Half, a: Action, now: number): string | null {
  if (g.status !== 'playing') return 'The round is over.';
  if (a.type === 'notes') return (g.notes = String(a.text).slice(0, 2000)), null;
  if (a.type === 'resume') return g.pauseKind === 'player' ? (resume(g, now), null) : 'Nothing to resume.';
  if (g.pausedAt !== null) return 'The game is paused.';
  if (a.type === 'pause' || a.type === 'hint') return request(g, h, a.type, now);
  if (a.type === 'pass') {
    if (!TOOLS.includes(a.tool) || !toolReady(g, a.tool, h, now)) return 'That tool is not in your box.';
    g.tools[a.tool] = { at: other(h), arrives: now + PASS_MS };
    return null;
  }

  const m = g.modules.find((x) => x.id === a.module);
  if (!m || m.side !== h) return 'That module is not on your side.';
  if (m.solvedAt) return 'That module is already disarmed.';
  const need = (t: ToolId) => (toolReady(g, t, h, now) ? null : `You need the ${TOOL_NAMES[t].toLowerCase()} for that.`);
  const bad = 'That does not work on this module.';

  if (a.type === 'unscrew') {
    if (!m.screws) return 'The cover is already off.';
    return need('screwdriver') ?? (m.screws--, null);
  }
  if (m.screws) return 'Take the cover off first.';

  switch (a.type) {
    case 'uv':
      if (m.type !== 'wires') return bad;
      return need('uv') ?? ((m.uv = true), null);
    case 'cut': {
      if (m.type !== 'wires' || m.cut[a.wire] !== false) return bad;
      const e = need('cutters');
      if (e) return e;
      m.cut[a.wire] = true;
      if (a.wire === wireAnswer(m, g).wire) solve(g, m, now);
      else strike(g, now);
      return null;
    }
    case 'press':
      if (m.type !== 'keypad' || !m.glyphs.includes(a.glyph) || m.pressed.includes(a.glyph)) return bad;
      if (keypadOrder(m)[m.pressed.length] !== a.glyph) return strike(g, now), null;
      m.pressed.push(a.glyph);
      if (m.pressed.length === m.glyphs.length) solve(g, m, now);
      return null;
    case 'measure':
      if (m.type !== 'pulse') return bad;
      return need('multimeter') ?? ((m.measured = true), null);
    case 'light':
      if (m.type !== 'pulse' || !LIGHTS.includes(a.color)) return bad;
      if (a.color !== pulseMap(m.voltage, g.strikes)[m.seq[m.progress]]) {
        m.progress = 0;
        return strike(g, now), null;
      }
      if (++m.progress === m.stage) {
        m.stage++;
        m.progress = 0;
        if (m.stage > m.seq.length) solve(g, m, now);
      }
      return null;
    case 'dial':
      if (m.type !== 'wordlock' || !(a.dial >= 0 && a.dial < m.dials.length)) return bad;
      m.pos[a.dial] = (m.pos[a.dial] + (a.dir === 1 ? 1 : 5)) % 6;
      return null;
    case 'submit':
      if (m.type !== 'wordlock') return bad;
      if (m.dials.map((d, i) => d[m.pos[i]]).join('') === m.word) solve(g, m, now);
      else strike(g, now);
      return null;
  }
  return bad;
}

// ---------- What each player can see ----------

export type ToolState = 'mine' | 'partner' | 'incoming' | 'outgoing';
export type Face =
  | { type: 'wires'; wires: WireColor[]; marks: boolean[] | null; cut: boolean[] }
  | { type: 'keypad'; glyphs: number[]; pressed: number[] }
  | { type: 'pulse'; flashes: Light[]; stage: number; stages: number; progress: number; voltage: number | null }
  | { type: 'wordlock'; letters: string[] };
export type ModuleView = { id: string; type: ModuleType; screws: number; solved: boolean; face: Face | null };

function face(m: Module): Face {
  switch (m.type) {
    case 'wires': return { type: m.type, wires: m.wires.map((w) => w.color), marks: m.uv ? m.wires.map((w) => w.mark) : null, cut: m.cut };
    case 'keypad': return { type: m.type, glyphs: m.glyphs, pressed: m.pressed };
    case 'pulse': {
      const stage = Math.min(m.stage, m.seq.length);
      return { type: m.type, flashes: m.seq.slice(0, stage), stage, stages: m.seq.length, progress: m.progress, voltage: m.measured ? m.voltage : null };
    }
    case 'wordlock': return { type: m.type, letters: m.dials.map((d, i) => d[m.pos[i]]) };
  }
}

export function viewFor(g: Game, h: Half, now: number) {
  const tool = (t: ToolId): ToolState => {
    const { at, arrives } = g.tools[t];
    const moving = now < arrives;
    return at === h ? (moving ? 'incoming' : 'mine') : moving ? 'outgoing' : 'partner';
  };
  return {
    half: h,
    status: g.status,
    lostReason: g.lostReason,
    difficulty: g.difficulty,
    timeLeft: timeLeft(g, now),
    paused: g.pausedAt === null ? null : g.pauseKind,
    pauseLeft: g.pausedAt === null ? 0 : Math.max(0, PAUSE_MS - (now - g.pausedAt)),
    strikes: g.strikes,
    maxStrikes: g.maxStrikes,
    pauseUsed: g.pauseUsed,
    hintUsed: g.hintUsed,
    requests: g.requests,
    hint: g.hint?.for === h ? g.hint : null,
    notes: g.notes,
    detail: h === 'A' ? { serial: g.serial } : { batteries: g.batteries },
    modules: g.modules.filter((m) => m.side === h).map((m): ModuleView => ({
      id: m.id, type: m.type, screws: m.screws, solved: !!m.solvedAt, face: m.screws ? null : face(m),
    })),
    partner: g.modules.filter((m) => m.side !== h).map((m) => ({ id: m.id, type: m.type, solved: !!m.solvedAt })),
    tools: Object.fromEntries(TOOLS.map((t) => [t, tool(t)])) as Record<ToolId, ToolState>,
    result: g.status === 'playing' ? null : {
      modules: g.modules.map((m) => ({ type: m.type, side: m.side, secs: m.solvedAt ? Math.round((m.solvedAt - g.startedAt) / 1000) : null })),
    },
  };
}
export type GameView = ReturnType<typeof viewFor>;
