import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';

type AuthState = {
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const TOKEN_KEY = 'studio.token';
const EMAIL_KEY = 'studio.email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));

  useEffect(() => {
    if (!token) return;
    api.me(token).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
      setToken(null);
      setEmail(null);
    });
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      email,
      login: async (nextEmail, password) => {
        const result = await api.login(nextEmail, password);
        localStorage.setItem(TOKEN_KEY, result.accessToken);
        localStorage.setItem(EMAIL_KEY, result.user.email);
        setToken(result.accessToken);
        setEmail(result.user.email);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
        setToken(null);
        setEmail(null);
      },
    }),
    [token, email],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
