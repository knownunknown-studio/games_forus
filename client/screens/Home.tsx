import { useState } from 'react';
import type { useRoom } from '../net';
import { BOMB_A, BOMB_B, Pixels } from '../pixels';

export function Home({ net }: { net: ReturnType<typeof useRoom> }) {
  const invite = new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0, 4) ?? '';
  const [name, setName] = useState(net.savedName);
  const [code, setCode] = useState(invite);
  const [joining, setJoining] = useState(!!invite);
  const who = name.trim() || 'Player';

  return (
    <main className="screen home">
      <p className="label">Games for us</p>
      <div className="hero">
        <div className="bomb" aria-label="A bomb split into two halves" role="img">
          <Pixels rows={BOMB_A} px={9} />
          <Pixels rows={BOMB_B} px={9} />
        </div>
        <h1 className="display-xl">TWO<br />HALVES</h1>
        <p className="tagline">Defuse a bomb together. You each see half of it, and only your partner has the manual for your half.</p>
      </div>
      <div className="stack">
        <label className="field">
          <span className="label">Your name</span>
          <input value={name} maxLength={16} placeholder="Player" autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </label>
        {joining ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); net.join(who, code); }}>
            <label className="field">
              <span className="label">Room code</span>
              <input className="code-input" value={code} maxLength={4} autoCapitalize="characters" autoFocus placeholder="KQ7P"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            </label>
            <button className="btn btn-primary" disabled={!net.online || code.length !== 4}>Join room</button>
            <button type="button" className="btn btn-ghost" onClick={() => setJoining(false)}>Back</button>
          </form>
        ) : (
          <>
            <button className="btn btn-primary" disabled={!net.online} onClick={() => net.create(who)}>Create a room</button>
            <button className="btn" onClick={() => setJoining(true)}>Join with a code</button>
          </>
        )}
        <p className="label center">{net.online ? 'Best played on a call' : 'Connecting...'}</p>
      </div>
    </main>
  );
}
