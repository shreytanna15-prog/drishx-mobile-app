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
import {
  getAuthHeaders as buildAuthHeaders,
  getMemoryAccessToken,
  logoutSession,
  registerAuthFailureHandler,
  resolveAuthTokens,
  storeMobileAuthSession,
} from '@/lib/auth-fetch';
import { getRefreshToken } from '@/lib/secure-auth-storage';

const USER_STORAGE_KEY = '@drishx/auth-user';

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
  signIn: (accessToken: string, user: AuthUser, refreshToken?: string | null) => void;
  updateUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistUser(user: AuthUser | null) {
  if (user) {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const signOut = useCallback(async () => {
    await logoutSession();
    setToken(null);
    setUser(null);
    await persistUser(null);
  }, []);

  useEffect(() => {
    registerAuthFailureHandler(() => {
      void signOut();
    });
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const storedUserRaw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const refreshToken = await getRefreshToken();

        if (cancelled || !storedUserRaw || !refreshToken) {
          return;
        }

        const storedUser = JSON.parse(storedUserRaw) as AuthUser;
        if (!storedUser?.id) {
          return;
        }

        setUser(storedUser);

        const { refreshAccessToken } = await import('@/lib/auth-fetch');
        const refreshed = await refreshAccessToken();
        if (cancelled) {
          return;
        }

        if (!refreshed) {
          await signOut();
          return;
        }

        const accessToken = getMemoryAccessToken();
        if (!accessToken) {
          await signOut();
          return;
        }

        setToken(accessToken);

        try {
          const result = await fetchCurrentUser(accessToken);
          const mapped = mapApiUser(result.user as Record<string, unknown>);
          if (cancelled) {
            return;
          }
          setUser(mapped);
          await persistUser(mapped);
        } catch {
          // Keep cached user when offline.
        }
      } catch {
        if (!cancelled) {
          await signOut();
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
  }, [signOut]);

  const signIn = useCallback(
    (accessToken: string, authUser: AuthUser, refreshToken?: string | null) => {
      void storeMobileAuthSession({ accessToken, refreshToken });
      setToken(accessToken);
      setUser(authUser);
      void persistUser(authUser);
    },
    []
  );

  const updateUser = useCallback(
    (authUser: AuthUser) => {
      setUser(authUser);
      void persistUser(authUser);
    },
    []
  );

  const getAuthHeaders = useCallback((): Record<string, string> => {
    return buildAuthHeaders(token);
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

export { resolveAuthTokens };
