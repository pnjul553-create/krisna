import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { apiFetch } from '../lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  provider: 'supabase' | 'sqlite';
  hasUsers: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerFirstAdmin: (payload: { email: string; password: string; full_name: string; nip?: string }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'supabase' | 'sqlite'>('sqlite');
  const [hasUsers, setHasUsers] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const status = await apiFetch<{ provider: 'supabase' | 'sqlite'; hasUsers: boolean }>('/api/auth/status');
      setProvider(status.provider);
      setHasUsers(status.hasUsers);

      try {
        const me = await apiFetch<{ user: UserProfile }>('/api/auth/me');
        setUser(me.user);
      } catch {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    setHasUsers(true);
    return res.user;
  };

  const registerFirstAdmin = async (payload: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
  }): Promise<UserProfile> => {
    const res = await apiFetch<{ user: UserProfile }>('/api/auth/register-first', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUser(res.user);
    setHasUsers(true);
    return res.user;
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        provider,
        hasUsers,
        login,
        registerFirstAdmin,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}
