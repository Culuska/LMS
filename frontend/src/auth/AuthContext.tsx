import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { AuthContext } from './context';
import type { RegisterInput } from './context';
import type { AuthenticatedUser, LoginResponse } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On load, if a token is already stored, confirm it's still valid (and pick up any
  // role change since the token was issued — see backend JwtStrategy.validate) rather
  // than trusting stale localStorage state.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<AuthenticatedUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('accessToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('accessToken', result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api.post<LoginResponse>('/auth/register', input);
    localStorage.setItem('accessToken', result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, clearMustChangePassword }),
    [user, isLoading, login, register, logout, clearMustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
