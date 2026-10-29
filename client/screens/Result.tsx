import { MODULE_NAMES } from '../../games/two-halves/manual';
import type { GameView } from '../../games/two-halves/logic';
import type { RoomView } from '../../shared/protocol';
import type { Send } from '../net';
import { BOOM, HEART, Pixels } from '../pixels';
import { clock } from './Round';

export function Result({ room, game, send }: { room: RoomView; game: GameView; send: Send }) {
  const won = game.status === 'won';
  const me = room.players[room.you], partner = room.players[1 - room.you];
  return (
    <main className={`screen result ${won ? 'won' : 'lost'}`}>
      <div className="hero">
        <Pixels rows={won ? HEART : BOOM} px={10} label={won ? 'A heart made of two halves' : 'An explosion'} />
        <h1 className="display-xl">{won ? 'DISARMED!' : 'BOOM.'}</h1>
        <p className="tagline">{won ? 'You did that together.' : game.lostReason}</p>
      </div>
      <section className="card stats">
        <div><span className="label">Time left</span><b>{clock(game.timeLeft)}</b></div>
        <div><span className="label">Strikes</span><b>{game.strikes} / {game.maxStrikes}</b></div>
        {game.result?.modules.map((m, i) => (
          <div key={i}>
            <span className="label">{MODULE_NAMES[m.type]} · half {m.side}</span>
            <b>{m.secs === null ? 'Armed' : clock(m.secs * 1000)}</b>
          </div>
        ))}
      </section>
      <div className="stack">
        <button className="btn btn-primary" disabled={me?.rematch || !partner} onClick={() => send({ t: 'rematch' })}>
          {me?.rematch ? 'Waiting for partner...' : partner?.rematch ? 'Rematch, partner is in' : 'Rematch, swap sides'}
        </button>
        <button className="btn btn-ghost" onClick={() => send({ t: 'lobby' })}>Back to lobby</button>
      </div>
    </main>
  );
}
