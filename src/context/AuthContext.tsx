import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { apiFetch, setAuthToken } from '../lib/api';

interface AuthStatusResponse {
  provider: 'supabase' | 'sqlite';
  hasUsers: boolean;
  schemaReady?: boolean;
  schemaError?: string | null;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  provider: 'supabase' | 'sqlite' | null;
  hasUsers: boolean;
  schemaReady: boolean;
  schemaError: string | null;
  statusError: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerFirstAdmin: (payload: { email: string; password: string; full_name: string; nip?: string }) => Promise<UserProfile>;
  registerAccount: (payload: { email: string; password: string; full_name: string; nip?: string }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'supabase' | 'sqlite' | null>(null);
  const [hasUsers, setHasUsers] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      setStatusError(null);
      const status = await apiFetch<AuthStatusResponse>('/api/auth/status');
      if (status?.provider !== 'supabase' && status?.provider !== 'sqlite') {
        throw new Error('Respons status server tidak valid.');
      }
      setProvider(status.provider);
      setHasUsers(Boolean(status.hasUsers));
      setSchemaReady(status.schemaReady !== false);
      setSchemaError(status.schemaError || null);

      try {
        const me = await apiFetch<{ user: UserProfile }>('/api/auth/me');
        setUser(me.user);
      } catch {
        setUser(null);
      }
    } catch (err: any) {
      setUser(null);
      setProvider(null);
      setStatusError(err?.message || 'Tidak dapat terhubung ke server autentikasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await apiFetch<{ user: UserProfile; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
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
    const res = await apiFetch<{ user: UserProfile; token?: string }>('/api/auth/register-first', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    setUser(res.user);
    setHasUsers(true);
    return res.user;
  };

  const registerAccount = async (payload: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
  }): Promise<UserProfile> => {
    const res = await apiFetch<{ user: UserProfile; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    setUser(res.user);
    setHasUsers(true);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        provider,
        hasUsers,
        schemaReady,
        schemaError,
        statusError,
        login,
        registerFirstAdmin,
        registerAccount,
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
