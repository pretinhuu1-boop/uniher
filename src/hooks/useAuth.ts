'use client';
import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { mutate as mutateSWR } from 'swr';
import { MockUser, UserRole } from '@/types/platform';
import { toSafeUserProjection } from '@/lib/gamification/containment';

const STORAGE_KEY_USER = 'uniher-user';
const PROTECTED_REPORT_ENDPOINTS = [
  '/api/dashboard',
  '/api/analytics/history',
  '/api/analytics/communications',
] as const;

export function isProtectedReportCacheKey(key: unknown): boolean {
  if (!Array.isArray(key) || key[0] !== 'protected-report' || typeof key[1] !== 'string') {
    return false;
  }
  const endpoint = key[1].split('?')[0];
  return PROTECTED_REPORT_ENDPOINTS.some((candidate) => candidate === endpoint);
}

export async function clearProtectedReportCaches(): Promise<void> {
  await mutateSWR(isProtectedReportCacheKey, undefined, {
    revalidate: false,
  });
}

/**
 * Minimal user data stored in localStorage for UI routing only (not for security).
 * Authentication is handled by httpOnly cookies (JWT).
 * Only non-sensitive display fields are persisted: id, name, role.
 */
interface StoredUserData {
  id: string;
  name: string;
  role: UserRole;
  isMasterAdmin?: boolean;
  firstAccessTourCompleted?: boolean;
  mustChangePassword?: boolean;
}

function getStoredUser(): StoredUserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw) as StoredUserData;
  } catch {}
  return null;
}

/** Only persist minimal non-sensitive data for UI routing */
function persistUser(user: MockUser) {
  try {
    const safeUser = toSafeUserProjection(user);
    const minimal: StoredUserData = {
      id: safeUser.id,
      name: safeUser.name,
      role: safeUser.role,
      isMasterAdmin: safeUser.isMasterAdmin,
      firstAccessTourCompleted: safeUser.firstAccessTourCompleted,
      mustChangePassword: safeUser.mustChangePassword,
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(minimal));
  } catch {}
}

function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch {}
}

interface AuthContextValue {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  approved: boolean;
  login: (email: string, password: string) => Promise<MockUser | null>;
  register: (data: any) => Promise<boolean>;
  selectRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<MockUser | null>;
}

export function useAuthState(): AuthContextValue {
  // Start with null on both server and client to avoid hydration mismatch.
  // localStorage is read in useEffect (client-only).
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [approved, setApproved] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Verify session on mount (via /api/auth/me).
  // Don't set user from localStorage immediately — verify with API first,
  // falling back to localStorage only if API fails (offline support).
  useEffect(() => {
    const stored = getStoredUser();
    const publicPathsWithoutSessionCheck = ['/', '/auth', '/esqueci-senha', '/redefinir-senha'];

    if (!stored && pathname && publicPathsWithoutSessionCheck.includes(pathname)) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (data?.user) {
          const u = data.user;
          const updated: MockUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            companyId: u.companyId ?? u.company_id,
            isMasterAdmin: u.isMasterAdmin === true,
            joinedAt: u.created_at,
            also_collaborator: u.also_collaborator,
            nickname: u.nickname,
            can_approve: u.can_approve,
            mustChangePassword: u.mustChangePassword === true,
            firstAccessTourCompleted: u.firstAccessTourCompleted !== false,
          };
          await clearProtectedReportCaches();
          setUser(updated);
          setApproved(u.approved !== 0);
          persistUser(updated);
          // Mark session as active for the fetch interceptor
          try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
          if (u.mustChangePassword === true || u.firstAccessTourCompleted === false) {
            router.push('/primeiro-acesso');
          }
        } else {
          await clearProtectedReportCaches();
          setUser(null);
          setApproved(true);
          clearStoredUser();
        }
      })
      .catch(async () => {
        // API unavailable — fall back to localStorage for offline support
        if (stored) {
          await clearProtectedReportCaches();
          setUser({
            id: stored.id,
            name: stored.name,
            email: '',
            role: stored.role,
            isMasterAdmin: stored.isMasterAdmin === true,
            joinedAt: '',
            mustChangePassword: stored.mustChangePassword === true,
            firstAccessTourCompleted: stored.firstAccessTourCompleted !== false,
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, router]);

  const login = useCallback(async (email: string, password: string): Promise<MockUser | null> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;

      const data = await res.json();
      const u = data.user;

      const loggedUser: MockUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        companyId: u.companyId ?? u.company_id,
        isMasterAdmin: u.isMasterAdmin === true,
        joinedAt: u.created_at,
        also_collaborator: u.also_collaborator,
        mustChangePassword: u.mustChangePassword === true,
        firstAccessTourCompleted: u.firstAccessTourCompleted !== false,
      };

      await clearProtectedReportCaches();
      setUser(loggedUser);
      persistUser(loggedUser);
      // Mark session as active so fetch interceptor doesn't show reauth modal on fresh login
      try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
      return loggedUser;
    } catch {
      return null;
    }
  }, []);

  const register = useCallback(async (data: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return false;

      const responseData = await res.json();
      const u = responseData.user;

      const registered: MockUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        companyId: u.companyId ?? u.company_id,
        isMasterAdmin: u.isMasterAdmin === true,
        joinedAt: u.created_at,
        mustChangePassword: u.mustChangePassword === true,
        firstAccessTourCompleted: u.firstAccessTourCompleted !== false,
      };

      await clearProtectedReportCaches();
      setUser(registered);
      persistUser(registered);
      // Mark session as active so fetch interceptor doesn't show reauth modal on fresh registration
      try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
      return true;
    } catch {
      return false;
    }
  }, []);

  const selectRole = useCallback(async (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    await clearProtectedReportCaches();
    setUser(updated);
    persistUser(updated);
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await clearProtectedReportCaches();
    setUser(null);
    clearStoredUser();
    // Clear session flags so next login starts fresh
    try { sessionStorage.removeItem('uniher-view-mode'); } catch {}
    try { sessionStorage.removeItem('uniher-session-active'); } catch {}
    window.location.href = '/';
  }, []);

  const refreshUser = useCallback(async (): Promise<MockUser | null> => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json().catch(() => null);

      if (!data?.user) {
        await clearProtectedReportCaches();
        setUser(null);
        setApproved(true);
        clearStoredUser();
        return null;
      }

      const u = data.user;
      const updated: MockUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        companyId: u.companyId ?? u.company_id,
        isMasterAdmin: u.isMasterAdmin === true,
        joinedAt: u.created_at,
        also_collaborator: u.also_collaborator,
        nickname: u.nickname,
        can_approve: u.can_approve,
        mustChangePassword: u.mustChangePassword === true,
        firstAccessTourCompleted: u.firstAccessTourCompleted !== false,
      };
      await clearProtectedReportCaches();
      setUser(updated);
      persistUser(updated);
      return updated;
    } catch {
      return null;
    }
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    approved,
    login,
    register,
    selectRole,
    logout,
    refreshUser,
  };
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  approved: true,
  login: async () => null,
  register: async () => false,
  selectRole: async () => {},
  logout: async () => {},
  refreshUser: async () => null,
});

export const useAuth = () => useContext(AuthContext);
