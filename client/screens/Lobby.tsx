import { useState } from 'react';
import type { Difficulty } from '../../games/two-halves/logic';
import type { RoomView } from '../../shared/protocol';
import type { Send } from '../net';

const LEVELS: [Difficulty, string][] = [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']];

export function Lobby({ room, send, leave }: { room: RoomView; send: Send; leave: () => void }) {
  const [copied, setCopied] = useState(false);
  const me = room.players[room.you];
  const both = room.players.every(Boolean);
  const link = `${location.origin}/?room=${room.code}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { prompt('Copy this link', link); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="screen">
      <div className="row between">
        <button className="btn-text" onClick={leave}>&lt; Back</button>
        <span className="label">Room</span>
      </div>
      <section className="card stack center-items">
        <span className="label">Share this code</span>
        <div className="code" aria-label={`Room code ${room.code.split('').join(' ')}`}>
          {[...room.code].map((c, i) => <span key={i}>{c}</span>)}
        </div>
        <button className="btn full" onClick={copy}>{copied ? 'Link copied' : 'Copy invite link'}</button>
      </section>

      <section className="stack-sm">
        <h2 className="label">Players</h2>
        {room.players.map((p, i) => (
          <div className="player" key={i}>
            <span className={`avatar half-${room.halves[i]}`} />
            <div className="grow">
              <div className="h-m">{p ? (i === room.you ? `${p.name} (you)` : p.name) : 'Waiting for partner'}</div>
              <div className="label">Half {room.halves[i]}</div>
            </div>
            {p && <span className={`badge ${p.ready ? 'ok' : ''}`}>{!p.online ? 'Away' : p.ready ? 'Ready' : 'Joined'}</span>}
          </div>
        ))}
      </section>

      <section className="stack-sm">
        <h2 className="label">Difficulty</h2>
        <div className="segmented" role="radiogroup" aria-label="Difficulty">
          {LEVELS.map(([d, label]) => (
            <button key={d} role="radio" aria-checked={room.difficulty === d} className={room.difficulty === d ? 'on' : ''}
              onClick={() => send({ t: 'difficulty', difficulty: d })}>{label}</button>
          ))}
        </div>
      </section>

      <div className="grow" />
      <button className={`btn ${me?.ready ? '' : 'btn-primary'}`} onClick={() => send({ t: 'ready', ready: !me?.ready })}>
        {me?.ready ? 'Not ready yet' : "I'm ready"}
      </button>
      <p className="muted center">{both ? 'The round starts when you are both ready.' : 'Send the code to your partner to start.'}</p>
    </main>
  );
}
