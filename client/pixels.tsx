// Pixel art drawn as SVG rects. Same palette and sprites as the Figma file.
import { GLYPHS, type ToolId } from '../games/two-halves/manual';

const PAL: Record<string, string> = {
  K: '#1D2B53', '#': '#1D2B53', Y: '#FFEC27', R: '#FF004D', B: '#29ADFF', W: '#FFF1E8',
  P: '#FF77A8', G: '#00E436', S: '#FFCCAA', O: '#FFA300',
};

export function Pixels({ rows, px = 2, label }: { rows: string[]; px?: number; label?: string }) {
  const w = rows[0].length, h = rows.length;
  return (
    <svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {rows.flatMap((row, y) => [...row].map((c, x) => PAL[c] && <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill={PAL[c]} />))}
    </svg>
  );
}

export const Glyph = ({ id, px = 6 }: { id: number; px?: number }) => <Pixels rows={GLYPHS[id].split('/')} px={px} label={`Glyph ${id + 1}`} />;

export const TOOL_ART: Record<ToolId, string[]> = {
  screwdriver: ['........KKK.', '.......KYYYK', '......KYYYYK', '.....KYYYYK.', '....KYYYYK..', '....KKYYK...', '...KK.KK....', '..KK........', '.KK.........', 'KK..........', 'K...........', '............'],
  cutters: ['..K......K..', '..KK....KK..', '...KK..KK...', '....KKKK....', '.....KK.....', '....KKKK....', '...KK..KK...', '.KKKK..KKKK.', 'KRRRK..KRRRK', 'KR.RK..KR.RK', 'KRRRK..KRRRK', '.KKK....KKK.'],
  uv: ['............', '.........P..', 'KKKKKKKK..P.', 'KBBBBBBKK...', 'KBBKBBBKWKPP', 'KBBBBBBKWK..', 'KBBBBBBKWKPP', 'KBBKBBBKWK..', 'KBBBBBBKK...', 'KKKKKKKK..P.', '.........P..', '............'],
  multimeter: ['..KKKKKKKK..', '..KYYYYYYK..', '..KYKKKKYK..', '..KYKGGKYK..', '..KYKKKKYK..', '..KYYYYYYK..', '..KYYKKYYK..', '..KYKWWKYK..', '..KYKWWKYK..', '..KYYKKYYK..', '..KYYYYYYK..', '..KKKKKKKK..'],
};

export const SCREW = ['.KKKK.', 'KSSSKK', 'KSSKSK', 'KSKSSK', 'KKSSSK', '.KKKK.'];

const BOMB = ['...........Y..O.', '..........O.Y...', '.........K..O...', '........K.......', '.......KK.......', '.....KKKKKK.....', '....KKKKKKKK....', '...KKWWKKKKKK...', '...KWWKKKKKKK...', '..KKWKKKKKKKKK..', '..KKKKKKKKKKKK..', '..KKKKKKKKKKKK..', '...KKKKKKKKKK...', '...KKKKKKKKKK...', '....KKKKKKKK....', '.....KKKKKK.....'];
export const BOMB_A = BOMB.map((r) => r.slice(0, 8).replace(/K/g, 'R'));
export const BOMB_B = BOMB.map((r, i) => (i < 5 ? r.slice(8) : r.slice(8).replace(/K/g, 'B')));

export const COACH = ['...KKKK...', '..KWWWWK..', '.KWKWWKWK.', '.KWWWWWWK.', '.KWRRRRWK.', '..KKKKKK..', '...KYYK...', '..KYYYYK..', '..KYKKYK..', '..KK..KK..'];

export const HEART =['.RRR..BBB.', 'RWRRRBBBBB', 'RRRRRBBBBB', 'RRRRRBBBBB', '.RRRRBBBB.', '..RRRBBB..', '...RRBB...', '....RB....'];
export const BOOM = ['.....Y......', '..Y..O..Y...', '...OOROO....', '.YORRRRROY..', '..ORRYYRRO..', 'YORRYWWYRROY', '..ORRYYRRO..', '.YORRRRROY..', '...OOROO....', '..Y..O..Y...', '.....Y......'];
