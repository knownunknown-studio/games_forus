import { useEffect, useState } from 'react';
import { useRoom } from './net';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Result } from './screens/Result';
import { Round } from './screens/Round';

export function App() {
  const net = useRoom();
  const { room, toast } = net;
  const [shown, setShown] = useState(toast);

  useEffect(() => {
    setShown(toast);
    const id = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const game = room?.game;
  return (
    <>
      {!room ? <Home net={net} />
        : !game ? <Lobby room={room} send={net.send} leave={net.leave} />
        : game.status === 'playing' ? <Round room={room} game={game} at={net.at} send={net.send} />
        : <Result room={room} game={game} send={net.send} />}
      {shown && <div className="toast" role="alert" key={shown.id}>{shown.message}</div>}
      {room && !net.online && <div className="toast toast-info" role="status">Reconnecting...</div>}
    </>
  );
}
