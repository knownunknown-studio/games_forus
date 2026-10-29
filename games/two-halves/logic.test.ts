import { describe, expect, it } from 'vitest';
import { act, generate, keypadOrder, pulseMap, tick, viewFor, wireAnswer, PASS_MS, PAUSE_MS, type Game, type Module, type Wires } from './logic';
import { KEYPAD_COLUMNS, WORDS } from './manual';

const T0 = 1_000_000;
const give = (g: Game, m: Module, ...tools: (keyof Game['tools'])[]) => tools.forEach((t) => (g.tools[t] = { at: m.side, arrives: 0 }));

function solveModule(g: Game, m: Module, now = T0) {
  give(g, m, 'screwdriver', 'cutters', 'multimeter');
  while (m.screws) expect(act(g, m.side, { type: 'unscrew', module: m.id }, now)).toBeNull();
  if (m.type === 'wires') act(g, m.side, { type: 'cut', module: m.id, wire: wireAnswer(m, g).wire }, now);
  if (m.type === 'keypad') keypadOrder(m).forEach((glyph) => act(g, m.side, { type: 'press', module: m.id, glyph }, now));
  if (m.type === 'pulse') while (!m.solvedAt) act(g, m.side, { type: 'light', module: m.id, color: pulseMap(m.voltage, g.strikes)[m.seq[m.progress]] }, now);
  if (m.type === 'wordlock') {
    m.dials.forEach((d, i) => { while (d[m.pos[i]] !== m.word[i]) act(g, m.side, { type: 'dial', module: m.id, dial: i, dir: 1 }, now); });
    act(g, m.side, { type: 'submit', module: m.id }, now);
  }
}

describe('generation', () => {
  it('is deterministic per seed', () => {
    expect(generate('abc', 'normal', T0)).toEqual(generate('abc', 'normal', T0));
    expect(generate('abc', 'normal', T0)).not.toEqual(generate('abd', 'normal', T0));
  });

  it('deals the right number of modules per side and splits the tools 2 and 2', () => {
    for (const [d, n] of [['easy', 1], ['normal', 2], ['hard', 3]] as const) {
      const g = generate('x', d, T0);
      expect(g.modules.filter((m) => m.side === 'A')).toHaveLength(n);
      expect(g.modules.filter((m) => m.side === 'B')).toHaveLength(n);
      expect(Object.values(g.tools).filter((t) => t.at === 'A')).toHaveLength(2);
    }
  });

  it('deals a fixed, gentle tutorial that makes both players pass a tool', () => {
    const g = generate('any', 'tutorial', T0);
    expect(g.modules.map((m) => [m.side, m.type])).toEqual([['A', 'wires'], ['B', 'keypad']]);
    expect(g.tools.screwdriver.at).toBe('A');
    expect(g.tools.cutters.at).toBe('B');
    expect(g.maxStrikes).toBe(5);
    g.modules.forEach((m) => solveModule(g, m));
    expect(g.status).toBe('won');
  });

  it('always deals keypads and word locks with exactly one answer', () => {
    for (let i = 0; i < 300; i++) {
      for (const m of generate(`seed${i}`, 'hard', T0).modules) {
        if (m.type === 'keypad') expect(KEYPAD_COLUMNS.filter((c) => m.glyphs.every((g) => c.includes(g)))).toHaveLength(1);
        if (m.type === 'wordlock') expect(WORDS.filter((w) => [...w].every((ch, j) => m.dials[j].includes(ch)))).toEqual([m.word]);
      }
    }
  });
});

describe('wire rules', () => {
  const wires = (colors: string[], mark = -1) =>
    ({ wires: colors.map((color, i) => ({ color, mark: i === mark })) }) as unknown as Wires;
  it('follows the manual top to bottom', () => {
    expect(wireAnswer(wires(['red', 'blue', 'red'], 2), { serial: 'AB-1C22D', batteries: 0 }).wire).toBe(2);
    expect(wireAnswer(wires(['blue', 'green', 'white']), { serial: 'AB-1C22D', batteries: 0 }).wire).toBe(1);
    expect(wireAnswer(wires(['red', 'blue', 'red', 'black']), { serial: 'AB-1C23D', batteries: 0 }).wire).toBe(2);
    expect(wireAnswer(wires(['red', 'blue', 'black']), { serial: 'AB-1C22D', batteries: 3 }).wire).toBe(2);
    expect(wireAnswer(wires(['blue', 'red', 'black']), { serial: 'AB-1C22D', batteries: 1 }).wire).toBe(0);
  });
});

describe('play', () => {
  it('wins when every module on both sides is solved', () => {
    const g = generate('win', 'hard', T0);
    g.modules.forEach((m) => solveModule(g, m));
    expect(g.status).toBe('won');
    expect(g.strikes).toBe(0);
  });

  it('needs the right tool in your own box', () => {
    const g = generate('tools', 'normal', T0);
    const m = g.modules[0];
    g.tools.screwdriver = { at: m.side === 'A' ? 'B' : 'A', arrives: 0 };
    expect(act(g, m.side, { type: 'unscrew', module: m.id }, T0)).toMatch(/screwdriver/);
    expect(act(g, m.side === 'A' ? 'B' : 'A', { type: 'unscrew', module: m.id }, T0)).toMatch(/not on your side/);
  });

  it('passes tools with a delay', () => {
    const g = generate('pass', 'normal', T0);
    const from = g.tools.cutters.at, to = from === 'A' ? 'B' : 'A';
    expect(act(g, from, { type: 'pass', tool: 'cutters' }, T0)).toBeNull();
    expect(viewFor(g, to, T0 + 10).tools.cutters).toBe('incoming');
    expect(viewFor(g, to, T0 + PASS_MS).tools.cutters).toBe('mine');
    expect(act(g, from, { type: 'pass', tool: 'cutters' }, T0 + PASS_MS)).toMatch(/not in your box/);
  });

  it('strikes cost 30 seconds and the last one ends the round', () => {
    const g = generate('strike', 'hard', T0);
    const m = g.modules.find((x) => x.type === 'wordlock' || x.type === 'keypad')!;
    give(g, m, 'screwdriver');
    while (m.screws) act(g, m.side, { type: 'unscrew', module: m.id }, T0);
    const wrong = () => m.type === 'keypad'
      ? act(g, m.side, { type: 'press', module: m.id, glyph: keypadOrder(m)[3] }, T0)
      : (m.pos = m.word.split('').map((ch, i) => (m.dials[i].indexOf(ch) + 1) % 6), act(g, m.side, { type: 'submit', module: m.id }, T0));
    const ends = g.endsAt;
    wrong();
    expect(g.endsAt).toBe(ends - 30_000);
    wrong();
    expect(g.status).toBe('lost');
  });

  it('loses when time runs out, and pause needs both players', () => {
    const g = generate('time', 'normal', T0);
    act(g, 'A', { type: 'pause' }, T0);
    expect(g.pausedAt).toBeNull();
    act(g, 'B', { type: 'pause' }, T0 + 1000);
    expect(g.pausedAt).toBe(T0 + 1000);
    tick(g, T0 + 1000 + PAUSE_MS);
    expect(g.pausedAt).toBeNull();
    expect(g.endsAt).toBe(T0 + 300_000 + PAUSE_MS);
    expect(tick(g, g.endsAt)).toBe(true);
    expect(g.status).toBe('lost');
  });

  it('gives the hint to the reader of the first unsolved module', () => {
    const g = generate('hint', 'normal', T0);
    act(g, 'A', { type: 'hint' }, T0);
    act(g, 'B', { type: 'hint' }, T0);
    const reader = g.modules[0].side === 'A' ? 'B' : 'A';
    expect(viewFor(g, reader, T0).hint?.moduleId).toBe(g.modules[0].id);
    expect(viewFor(g, g.modules[0].side, T0).hint).toBeNull();
  });
});

describe('views', () => {
  it('never leak answers or the other half', () => {
    const g = generate('leak', 'hard', T0);
    g.modules.forEach((m) => (m.screws = 0));
    for (const h of ['A', 'B'] as const) {
      const v = viewFor(g, h, T0);
      const json = JSON.stringify(v);
      expect(json).not.toMatch(/"word"|"column"|"seq"|"mark"|"voltage":\d/);
      expect(v.modules.every((m) => g.modules.find((x) => x.id === m.id)!.side === h)).toBe(true);
      expect('serial' in v.detail).toBe(h === 'A');
    }
  });

  it('hides a module face until its cover is off', () => {
    const g = generate('cover', 'normal', T0);
    expect(viewFor(g, 'A', T0).modules.every((m) => m.face === null)).toBe(true);
  });
});
