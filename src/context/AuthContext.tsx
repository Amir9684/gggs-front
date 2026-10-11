import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';

import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth.api';
import { authEvents } from '../lib/api-client';
import { clearToken, getToken, setToken } from '../lib/token-storage';
import type { User } from '../types/user';

interface AuthContextValue {
  user: User | null;
  /** True only during the initial token-check on app load — distinct from
   *  per-action loading, so a full-screen guard can gate on this alone. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // On first load, a token in storage doesn't mean it's still valid (it
  // may have expired or the account may have been deleted) — /auth/me
  // both confirms that and gives us the full user record to hydrate with.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsBootstrapping(false));
  }, []);

  // A 401 from any request anywhere in the app (token expired mid-session,
  // account deleted, etc.) should drop the session, not just the request
  // that triggered it.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    authEvents.addEventListener('unauthorized', handleUnauthorized);
    return () => authEvents.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authApi.login(payload);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isBootstrapping,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}