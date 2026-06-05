'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchCurrentUser, mapApiUser } from '@/lib/auth-api';

const STORAGE_KEY = '@drishx/auth-session';

type StoredSession = {
  token: string;
  user: AuthUser;
};

async function persistSession(session: StoredSession | null) {
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}

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
  isReady: boolean;
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !stored) {
          return;
        }

        const session = JSON.parse(stored) as StoredSession;
        if (!session?.token || !session?.user?.id) {
          return;
        }

        setToken(session.token);
        setUser(session.user);

        try {
          const result = await fetchCurrentUser(session.token);
          const mapped = mapApiUser(result.user as Record<string, unknown>);
          if (cancelled) {
            return;
          }
          setUser(mapped);
          await persistSession({ token: session.token, user: mapped });
        } catch {
          // Keep the cached session when offline or the backend is temporarily unavailable.
        }
      } catch {
        await persistSession(null);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((authToken: string, authUser: AuthUser) => {
    setToken(authToken);
    setUser(authUser);
    void persistSession({ token: authToken, user: authUser });
  }, []);

  const updateUser = useCallback(
    (authUser: AuthUser) => {
      setUser(authUser);
      if (token) {
        void persistSession({ token, user: authUser });
      }
    },
    [token]
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    void persistSession(null);
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
      isReady,
      user,
      token,
      signIn,
      updateUser,
      signOut,
      getAuthHeaders,
    }),
    [token, user, isReady, signIn, updateUser, signOut, getAuthHeaders]
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
