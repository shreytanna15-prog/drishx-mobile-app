'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AccountApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive?: boolean;
  isApproved?: boolean;
  approvalStatus?: AccountApprovalStatus;
  gstNumber?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  state?: string | null;
  pincode?: string | null;
  rejectionReason?: string | null;
};

export function isStaffRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function isCustomerApproved(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== 'CUSTOMER') {
    return true;
  }
  return Boolean(user.isApproved && user.approvalStatus === 'APPROVED');
}

type AuthContextValue = {
  isSignedIn: boolean;
  isStaff: boolean;
  isCustomerApproved: boolean;
  user: AuthUser | null;
  token: string | null;
  signIn: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
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

  const updateUser = useCallback((authUser: AuthUser) => {
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
      isCustomerApproved: isCustomerApproved(user),
      user,
      token,
      signIn,
      updateUser,
      signOut,
      getAuthHeaders,
    }),
    [token, user, signIn, updateUser, signOut, getAuthHeaders]
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
