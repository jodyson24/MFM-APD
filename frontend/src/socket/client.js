import { io } from 'socket.io-client';

let socket = null;

// Same-origin by default (works in dev through Vite's proxy and in production
// where Express serves the SPA). Override with VITE_SOCKET_URL if needed.
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();
  s.auth = (cb) => cb({ token });
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

export function socketConnected() {
  return socket ? socket.connected : false;
}
