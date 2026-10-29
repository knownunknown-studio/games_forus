import { useEffect, useRef, useState } from 'react';
import type { Action, GameView } from '../../games/two-halves/logic';
import type { RoomView } from '../../shared/protocol';
import { Device, Toolbox } from '../game/Device';
import { Manual } from '../game/Manual';
import { useNow, type Send } from '../net';

export const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function Round({ room, game, at, send }: { room: RoomView; game: GameView; at: number; send: Send }) {
  const now = useNow(200);
  const [tab, setTab] = useState<'device' | 'manual'>('device');
  const [notes, setNotes] = useState(false);
  const [shake, setShake] = useState(false);
  const strikes = useRef(game.strikes);
  const act = (action: Action) => send({ t: 'act', action });
  const since = game.paused ? 0 : now - at;
  const left = Math.max(0, game.timeLeft - since);

  useEffect(() => {
    if (game.strikes <= strikes.current) return;
    strikes.current = game.strikes;
    setShake(true);
    const id = setTimeout(() => setShake(false), 450);
    return () => clearTimeout(id);
  }, [game.strikes]);

  const ask = (kind: 'pause' | 'hint', used: boolean, label: string) => {
    const r = game.requests[kind];
    const text = used ? `${label} used` : r === game.half ? `${label} asked` : r ? `Accept ${label.toLowerCase()}` : label;
    return (
      <button className={`btn btn-sm ${r && r !== game.half ? 'btn-primary' : ''}`} disabled={used} onClick={() => act({ type: kind })}
        aria-label={r === game.half ? `Cancel ${label.toLowerCase()} request` : text}>{text}</button>
    );
  };

  return (
    <main className={`round ${shake ? 'shake' : ''}`}>
      <header className="hud">
        <div className={`timer ${left <= 30_000 ? 'danger' : ''}`} role="timer" aria-label={`${clock(left)} left`}>{clock(left)}</div>
        <div className="strikes">
          <span className="label">Strikes</span>
          <div className="lamps" aria-label={`${game.strikes} of ${game.maxStrikes} strikes`}>
            {Array.from({ length: game.maxStrikes }, (_, i) => <span key={i} className={`lamp ${i < game.strikes ? 'on' : ''}`} />)}
          </div>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {(['device', 'manual'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'device' ? `Device · half ${game.half}` : 'Manual'}
            {t === 'manual' && game.hint && <span className="dot" aria-label="has a hint" />}
          </button>
        ))}
      </div>

      <div className="columns">
        <section className={`col ${tab === 'device' ? 'show' : ''}`} aria-label="Your half of the device">
          <Device game={game} act={act} now={now} />
        </section>
        <section className={`col ${tab === 'manual' ? 'show' : ''}`} aria-label="Manual for your partner's half">
          <Manual game={game} />
        </section>
      </div>

      <Toolbox game={game} act={act} />

      <div className="utilities">
        <button className="btn btn-sm" aria-expanded={notes} onClick={() => setNotes(!notes)}>Notes</button>
        {ask('pause', game.pauseUsed, 'Pause')}
        {ask('hint', game.hintUsed, 'Hint')}
      </div>

      {notes && <Notes text={game.notes} onChange={(text) => act({ type: 'notes', text })} onClose={() => setNotes(false)} />}

      {game.paused && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Paused">
          <div className="card stack center-items">
            <h2 className="display-l">PAUSED</h2>
            {game.paused === 'player' ? (
              <>
                <p className="center">Back in {clock(Math.max(0, game.pauseLeft - (now - at)))} at most.</p>
                <button className="btn btn-primary" onClick={() => act({ type: 'resume' })}>Resume now</button>
              </>
            ) : (
              <p className="center">{room.players[1 - room.you]?.name ?? 'Your partner'} dropped out. The clock is stopped until they are back.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Notes({ text, onChange, onClose }: { text: string; onChange: (t: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(text);
  const typing = useRef(false);
  useEffect(() => { if (!typing.current) setDraft(text); }, [text]);
  useEffect(() => {
    if (!typing.current) return;
    const id = setTimeout(() => { onChange(draft); typing.current = false; }, 300);
    return () => clearTimeout(id);
  }, [draft]);
  return (
    <aside className="sheet" aria-label="Shared notes">
      <div className="row between">
        <h2 className="label">Shared notes · you both see this</h2>
        <button className="btn-text" onClick={onClose}>Close</button>
      </div>
      <textarea value={draft} maxLength={2000} autoFocus placeholder="Serial, symbols, anything you want to remember"
        onChange={(e) => { typing.current = true; setDraft(e.target.value); }} />
    </aside>
  );
}
