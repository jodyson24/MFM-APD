import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../socket/client.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map());
  const bound = useRef(false);
  const prevToken = useRef(token);

  const handleDataChanged = useCallback((payload) => {
    if (!payload || !payload.resource) return;
    const cbs = listeners.current.get(payload.resource);
    if (!cbs) return;
    cbs.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // listener errors must not break the socket loop
      }
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!bound.current) {
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('data:changed', handleDataChanged);
      bound.current = true;
    }

    if (!token) {
      disconnectSocket();
      setConnected(false);
      prevToken.current = null;
      return;
    }

    const tokenChanged = prevToken.current && prevToken.current !== token;
    prevToken.current = token;

    if (tokenChanged && socket.connected) {
      // Different user signed in on this tab: re-authenticate the socket.
      disconnectSocket();
    }
    connectSocket(token);
  }, [token, handleDataChanged]);

  const subscribe = useCallback((resource, cb) => {
    if (!resource || typeof cb !== 'function') return () => {};
    if (!listeners.current.has(resource)) listeners.current.set(resource, new Set());
    listeners.current.get(resource).add(cb);
    return () => {
      const set = listeners.current.get(resource);
      if (!set) return;
      set.delete(cb);
      if (set.size === 0) listeners.current.delete(resource);
    };
  }, []);

  const value = { connected, subscribe };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
