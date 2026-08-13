import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/client.js';

const AuthContext = createContext();

// Lightweight, stable device fingerprint hash (§8.4) — only the hash is sent,
// never raw signals.
const getDeviceFingerprint = () => {
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency || '',
    ];
    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash).toString(16)}`;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));

  const login = async (email, password) => {
    const res = await api.post(
      '/auth/login',
      { email, password },
      { headers: { 'x-device-fingerprint': getDeviceFingerprint() || '' } }
    );
    const { accessToken, user: userData, sessionId: sid } = res.data;
    localStorage.setItem('accessToken', accessToken);
    if (sid) {
      localStorage.setItem('sessionId', sid);
      setSessionId(sid);
    }
    setToken(accessToken);
    setUser(userData);
    return res.data;
  };

  const logout = async () => {
    const sid = localStorage.getItem('sessionId');
    try {
      await api.post('/auth/logout', { sessionId: sid });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setToken(null);
      setUser(null);
    }
  };

  const setPassword = async (token, password, confirmPassword = password) => {
    await api.post('/auth/set-password', { token, password, confirmPassword });
  };

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await api.get('/users/me'); // we need to implement this endpoint
          setUser(res.data);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('sessionId');
          setSessionId(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const value = { user, loading, login, logout, setPassword, token, sessionId };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);