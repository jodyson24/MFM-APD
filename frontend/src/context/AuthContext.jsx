import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
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

  const setPassword = async (token, password) => {
    await api.post('/auth/set-password', { token, password });
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