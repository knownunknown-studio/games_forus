import type { CSSProperties } from 'react';
import type { Action, Face, GameView, ModuleView, ToolState } from '../../games/two-halves/logic';
import { LIGHTS, MODULE_NAMES, TOOLS, TOOL_NAMES, type ToolId } from '../../games/two-halves/manual';
import { Glyph, Pixels, SCREW, TOOL_ART } from '../pixels';

export const COLOR_HEX: Record<string, string> = {
  red: '#FF004D', yellow: '#FFEC27', blue: '#29ADFF', black: '#1D2B53', white: '#FFF1E8', green: '#00E436',
};
const css = (vars: Record<string, string>) => vars as CSSProperties;

type Act = (a: Action) => void;
type Has = (t: ToolId) => boolean;

export function Device({ game, act, now }: { game: GameView; act: Act; now: number }) {
  const has: Has = (t) => game.tools[t] === 'mine';
  const d = game.detail;
  return (
    <div className="stack">
      <div className="plate">
        {'serial' in d ? (
          <><span className="label">Serial</span><b>{d.serial}</b></>
        ) : (
          <>
            <span className="label">Batteries</span>
            <span className="batteries" role="img" aria-label={`${d.batteries} batteries`}>
              {Array.from({ length: d.batteries }, (_, i) => <i key={i} />)}
              <b>{d.batteries}</b>
            </span>
          </>
        )}
      </div>
      {game.modules.map((m) => <Module key={m.id} m={m} has={has} act={act} now={now} />)}
    </div>
  );
}

function Module({ m, has, act, now }: { m: ModuleView; has: Has; act: Act; now: number }) {
  return (
    <article className={`module ${m.solved ? 'solved' : ''}`} aria-label={MODULE_NAMES[m.type]}>
      {['tl', 'tr', 'bl', 'br'].map((c) => <span key={c} className={`corner ${c}`}><Pixels rows={SCREW} px={2} /></span>)}
      <header className="row between">
        <h3 className="h-m">{MODULE_NAMES[m.type]}</h3>
        <span className={`badge ${m.solved ? 'ok' : 'armed'}`}>{m.solved ? 'Disarmed' : 'Armed'}</span>
      </header>
      {m.face ? <FaceView m={m} face={m.face} has={has} act={act} now={now} /> : (
        <div className="face cover">
          <div className="screws">
            {Array.from({ length: m.screws }, (_, i) => (
              <button key={i} className="screw" disabled={!has('screwdriver')} aria-label="Remove a screw"
                onClick={() => act({ type: 'unscrew', module: m.id })}><Pixels rows={SCREW} px={5} /></button>
            ))}
          </div>
          <span className="cover-tag">
            <Pixels rows={TOOL_ART.screwdriver} px={2} />
            {has('screwdriver') ? `Tap a screw · ${m.screws} left` : 'You need the screwdriver'}
          </span>
        </div>
      )}
    </article>
  );
}

function FaceView({ m, face: f, has, act, now }: { m: ModuleView; face: Face; has: Has; act: Act; now: number }) {
  const id = m.id, off = m.solved;
  switch (f.type) {
    case 'wires':
      return (
        <div className="face wires">
          {f.wires.map((c, i) => (
            <button key={i} className={`wire ${f.cut[i] ? 'cut' : ''}`} style={css({ '--wire': COLOR_HEX[c] })}
              disabled={off || f.cut[i] || !has('cutters')} onClick={() => act({ type: 'cut', module: id, wire: i })}
              aria-label={`Cut wire ${i + 1}, ${c}${f.marks?.[i] ? ', has a UV mark' : ''}${f.cut[i] ? ', already cut' : ''}`}>
              <span className="post" /><span className="bar" /><span className="post" />
              {f.marks?.[i] && <span className="uv-mark">UV</span>}
            </button>
          ))}
          <div className="row between">
            <button className="btn btn-sm" disabled={off || !!f.marks || !has('uv')} onClick={() => act({ type: 'uv', module: id })}>
              {f.marks ? (f.marks.some(Boolean) ? 'UV mark found' : 'No UV marks') : 'Shine UV torch'}
            </button>
            {!has('cutters') && !off && <span className="label">Needs cutters</span>}
          </div>
        </div>
      );
    case 'keypad':
      return (
        <div className="face keypad">
          {f.glyphs.map((g) => (
            <button key={g} className={`key ${f.pressed.includes(g) ? 'pressed' : ''}`} disabled={off || f.pressed.includes(g)}
              onClick={() => act({ type: 'press', module: id, glyph: g })}><Glyph id={g} px={7} /></button>
          ))}
        </div>
      );
    case 'pulse': {
      const frames = f.flashes.length * 2 + 2, frame = Math.floor(now / 500) % frames;
      const lit = !off && frame % 2 === 0 && frame / 2 < f.flashes.length ? f.flashes[frame / 2] : null;
      return (
        <div className="face pulse">
          <div className="row between">
            <div className="flash" style={css({ '--light': lit ? COLOR_HEX[lit] : 'transparent' })} role="img"
              aria-label={`Sequence: ${f.flashes.join(', ')}`} />
            <div className="meter-wrap">
              <div className="meter"><span className="label">Volts</span><b>{f.voltage ?? '--'}</b></div>
              {f.voltage === null && !off && (has('multimeter')
                ? <button className="btn btn-sm" onClick={() => act({ type: 'measure', module: id })}>Measure</button>
                : <span className="label">Needs multimeter</span>)}
            </div>
          </div>
          <div className="lights">
            {LIGHTS.map((c) => (
              <button key={c} className="light" style={css({ '--light': COLOR_HEX[c] })} disabled={off} aria-label={`Press ${c}`}
                onClick={() => act({ type: 'light', module: id, color: c })} />
            ))}
          </div>
          <span className="label">Stage {f.stage} of {f.stages} · {f.progress} pressed</span>
        </div>
      );
    }
    case 'wordlock':
      return (
        <div className="face wordlock">
          <div className="dials">
            {f.letters.map((l, i) => (
              <div className="dial" key={i}>
                <button disabled={off} aria-label={`Dial ${i + 1} up`} onClick={() => act({ type: 'dial', module: id, dial: i, dir: -1 })}>▲</button>
                <b key={l} aria-live="polite">{l}</b>
                <button disabled={off} aria-label={`Dial ${i + 1} down`} onClick={() => act({ type: 'dial', module: id, dial: i, dir: 1 })}>▼</button>
              </div>
            ))}
          </div>
          <button className="btn btn-sm" disabled={off} onClick={() => act({ type: 'submit', module: id })}>Submit</button>
        </div>
      );
  }
}

const STATUS: Record<ToolState, string> = { mine: 'Tap to pass', partner: 'Partner has it', incoming: 'Arriving...', outgoing: 'Passing...' };

export function Toolbox({ game, act }: { game: GameView; act: Act }) {
  return (
    <section className="toolbox" aria-label="Your toolbox">
      <div className="row between">
        <h2 className="label">Your toolbox</h2>
        <span className="label">One of each tool</span>
      </div>
      <div className="tools">
        {TOOLS.map((t) => {
          const s = game.tools[t];
          return (
            <button key={t} className={`chip ${s}`} disabled={s !== 'mine'} onClick={() => act({ type: 'pass', tool: t })}
              aria-label={`${TOOL_NAMES[t]}: ${STATUS[s]}`}>
              <Pixels rows={TOOL_ART[t]} px={2} />
              <span className="chip-text"><b>{TOOL_NAMES[t]}</b><span className="label">{STATUS[s]}</span></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
