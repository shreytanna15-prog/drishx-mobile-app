'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export function isStaffRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

type AuthContextValue = {
  isSignedIn: boolean;
  isStaff: boolean;
  user: AuthUser | null;
  token: string | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  getAuthHeaders: () => Record<string, string>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const signIn = useCallback((authToken: string, authUser: AuthUser) => {
    setToken(authToken);
    setUser(authUser);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const value = useMemo(
    () => ({
      isSignedIn: Boolean(token),
      isStaff: isStaffRole(user?.role),
      user,
      token,
      signIn,
      signOut,
      getAuthHeaders,
    }),
    [token, user, signIn, signOut, getAuthHeaders]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
