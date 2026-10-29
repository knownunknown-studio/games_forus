import type { ReactNode } from 'react';
import type { GameView } from '../../games/two-halves/logic';
import { KEYPAD_COLUMNS, LIGHTS, MODULE_NAMES, PULSE, WIRE_RULES, WORDS, type ModuleType } from '../../games/two-halves/manual';
import { Glyph } from '../pixels';
import { COLOR_HEX } from './Device';

const Swatch = ({ c }: { c: string }) => <span className="swatch" style={{ ['--c' as string]: COLOR_HEX[c] }}>{c}</span>;

const SECTIONS: Record<ModuleType, (g: GameView) => ReactNode> = {
  wires: () => (
    <>
      <p>Cut exactly one wire. Count wires from the top. Check the rules in order and stop at the first one that fits.</p>
      <ol className="rules">{WIRE_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
      <p className="muted">UV marks only show under the UV torch.</p>
    </>
  ),
  keypad: () => (
    <>
      <p>Find the one column that holds all four symbols. Your partner presses them in that column's order, top to bottom.</p>
      <div className="kcols">
        {KEYPAD_COLUMNS.map((col, i) => (
          <div className="kcol" key={i}>
            <span className="label">{i + 1}</span>
            {col.map((g) => <Glyph key={g} id={g} px={4} />)}
          </div>
        ))}
      </div>
    </>
  ),
  pulse: (g) => (
    <>
      <p>The light flashes a sequence that grows by one each stage. For each flash, your partner presses the colour in the table. Ask them to measure the voltage first. The table changes with every strike.</p>
      {(['low', 'high'] as const).map((band) => (
        <table className="pulse-table" key={band}>
          <caption className="label">{band === 'low' ? 'Under 5 volts' : '5 volts or more'}</caption>
          <thead>
            <tr><th>Flash</th>{[0, 1, 2].map((s) => <th key={s} className={Math.min(g.strikes, 2) === s ? 'now' : ''}>{s === 2 ? '2+ strikes' : `${s} strike${s === 1 ? '' : 's'}`}</th>)}</tr>
          </thead>
          <tbody>
            {LIGHTS.map((l) => (
              <tr key={l}><th><Swatch c={l} /></th>{PULSE[band].map((map, s) => <td key={s} className={Math.min(g.strikes, 2) === s ? 'now' : ''}><Swatch c={map[l]} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      ))}
    </>
  ),
  wordlock: () => (
    <>
      <p>Only one of these words can be spelled with the four dials. Find it together, then your partner presses Submit.</p>
      <div className="words">{WORDS.map((w) => <span key={w}>{w}</span>)}</div>
    </>
  ),
};

export function Manual({ game }: { game: GameView }) {
  const types = [...new Set(game.partner.map((p) => p.type))];
  const d = game.detail;
  return (
    <div className="manual stack">
      <header>
        <h2 className="display-l">MANUAL</h2>
        <p className="muted">Rules for your partner's half. You can't see their modules, so ask them what they see.</p>
      </header>
      {game.hint && <div className="hint" role="status"><span className="label">Hint</span>{game.hint.text}</div>}
      <section className="page">
        <h3 className="h-m">Device details</h3>
        <p>{'serial' in d
          ? `Your half shows the serial number ${d.serial}. Your partner can see the batteries.`
          : `Your half shows ${d.batteries} ${d.batteries === 1 ? 'battery' : 'batteries'}. Your partner can see the serial number.`}</p>
      </section>
      {types.map((t) => (
        <section className="page" key={t}>
          <div className="row between">
            <h3 className="h-m">{MODULE_NAMES[t]}</h3>
            <span className="row gap-sm">
              {game.partner.filter((p) => p.type === t).map((p) => (
                <span key={p.id} className={`badge ${p.solved ? 'ok' : 'armed'}`}>{p.solved ? 'Disarmed' : 'Armed'}</span>
              ))}
            </span>
          </div>
          {SECTIONS[t](game)}
        </section>
      ))}
    </div>
  );
}
