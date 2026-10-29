// Static game data. The manual never changes between rounds, so couples get better at reading it.
import { rng, shuffle } from './rng';

export const TOOLS = ['screwdriver', 'cutters', 'uv', 'multimeter'] as const;
export type ToolId = (typeof TOOLS)[number];
export const TOOL_NAMES: Record<ToolId, string> = {
  screwdriver: 'Screwdriver',
  cutters: 'Wire cutters',
  uv: 'UV torch',
  multimeter: 'Multimeter',
};

export const MODULE_TYPES = ['wires', 'keypad', 'pulse', 'wordlock'] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];
export const MODULE_NAMES: Record<ModuleType, string> = {
  wires: 'Wires',
  keypad: 'Glyph keypad',
  pulse: 'Pulse lights',
  wordlock: 'Word lock',
};

export const WIRE_COLORS = ['red', 'yellow', 'blue', 'black', 'white', 'green'] as const;
export type WireColor = (typeof WIRE_COLORS)[number];

export const WIRE_RULES = [
  'If a wire shows a UV mark, cut the marked wire.',
  'Otherwise, if there are no red wires, cut the second wire.',
  'Otherwise, if the last digit of the serial number is odd, cut the last red wire.',
  'Otherwise, if the device has 2 or more batteries, cut the last wire.',
  'Otherwise, cut the first wire.',
];

// 24 symmetric 5x5 pixel glyphs, rows joined with "/". Generated once from a fixed seed.
export const GLYPHS: string[] = (() => {
  const r = rng('glyphs-v1');
  const out = new Set<string>();
  while (out.size < 24) {
    const rows = Array.from({ length: 5 }, () => {
      const h = [r() < 0.5, r() < 0.5, r() < 0.5];
      return [...h, h[1], h[0]].map((b) => (b ? '#' : '.')).join('');
    });
    const ink = rows.join('').split('#').length - 1;
    if (ink >= 9 && ink <= 16 && rows.every((row) => row.includes('#'))) out.add(rows.join('/'));
  }
  return [...out];
})();

// Six manual columns of six glyphs each. Press your four in the order of the column that holds all four.
export const KEYPAD_COLUMNS: number[][] = (() => {
  const r = rng('columns-v1');
  return Array.from({ length: 6 }, () => shuffle(r, GLYPHS.map((_, i) => i)).slice(0, 6));
})();

export const WORDS = [
  'PLAN', 'POEM', 'SPOT', 'LAMP', 'NOTE', 'MILK', 'SAND', 'TUNE', 'KITE', 'ROSE',
  'BOLT', 'WAVE', 'FROG', 'CAKE', 'MOON', 'STAR', 'LOCK', 'WIRE', 'GLOW', 'HOPE',
  'KISS', 'NEST', 'DUSK', 'FIRE', 'SNOW', 'PALM', 'HARP', 'TOAD', 'VOLT', 'BEAR',
];

export const LIGHTS = ['red', 'blue', 'green', 'yellow'] as const;
export type Light = (typeof LIGHTS)[number];

// What to press for each flash, by voltage band and current strike count (0, 1, 2+).
export const PULSE: Record<'low' | 'high', Record<Light, Light>[]> = {
  low: [
    { red: 'blue', blue: 'red', green: 'yellow', yellow: 'green' },
    { red: 'yellow', blue: 'green', green: 'blue', yellow: 'red' },
    { red: 'green', blue: 'red', green: 'yellow', yellow: 'blue' },
  ],
  high: [
    { red: 'green', blue: 'yellow', green: 'red', yellow: 'blue' },
    { red: 'blue', blue: 'yellow', green: 'green', yellow: 'red' },
    { red: 'yellow', blue: 'blue', green: 'red', yellow: 'green' },
  ],
};
