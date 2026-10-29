// One WebSocket per tab. Reconnects with backoff and rejoins the same seat using a stored player id.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMsg, RoomView, ServerMsg } from '../shared/protocol';

const store = {
  get: (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } },
  set: (s: Storage, k: string, v: string | null) => { try { v === null ? s.removeItem(k) : s.setItem(k, v); } catch {} },
};

const pid = store.get(localStorage, 'pid') ?? crypto.randomUUID();
store.set(localStorage, 'pid', pid);

export type Send = (msg: ClientMsg) => void;
export type Toast = { message: string; id: number };

export function useRoom() {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [at, setAt] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [online, setOnline] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const code = useRef(store.get(sessionStorage, 'room'));
  const name = useRef(store.get(localStorage, 'name') ?? '');

  const send = useCallback<Send>((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    let stopped = false, retry = 0, timer = 0;
    const connect = () => {
      const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.current = s;
      s.onopen = () => {
        retry = 0;
        setOnline(true);
        if (code.current) s.send(JSON.stringify({ t: 'join', pid, name: name.current, code: code.current }));
      };
      s.onmessage = (e) => {
        const msg = JSON.parse(e.data) as ServerMsg;
        if (msg.t === 'room') {
          code.current = msg.room.code;
          store.set(sessionStorage, 'room', msg.room.code);
          setRoom(msg.room);
          setAt(Date.now());
        } else {
          if (msg.message === 'No room with that code.' && code.current) {
            code.current = null;
            store.set(sessionStorage, 'room', null);
          }
          setToast({ message: msg.message, id: Date.now() });
        }
      };
      s.onclose = () => {
        setOnline(false);
        if (!stopped) timer = window.setTimeout(connect, Math.min(5000, 400 * 2 ** retry++));
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); ws.current?.close(); };
  }, []);

  const remember = (n: string) => { name.current = n; store.set(localStorage, 'name', n); };
  return {
    room, at, toast, online, send,
    savedName: name.current,
    create: (n: string) => { remember(n); send({ t: 'create', pid, name: n }); },
    join: (n: string, c: string) => { remember(n); send({ t: 'join', pid, name: n, code: c.toUpperCase() }); },
    leave: () => { send({ t: 'leave' }); code.current = null; store.set(sessionStorage, 'room', null); setRoom(null); },
  };
}

export function useNow(ms = 200) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
