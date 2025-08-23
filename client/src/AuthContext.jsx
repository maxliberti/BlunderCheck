import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getToken as getStoredToken, setToken as setStoredToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState('');

  useEffect(() => {
    const t = getStoredToken();
    if (t) setTokenState(t);
  }, []);

  const setToken = (t) => {
    setStoredToken(t);
    setTokenState(t || '');
  };

  const value = useMemo(() => ({ token, setToken }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
