'use client';
import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
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

type AuthenticatedScopeUser = Pick<MockUser, 'id' | 'companyId' | 'role'>;
type AuthenticatedScope = string | null;

export function getAuthenticatedScope(user: AuthenticatedScopeUser | null): AuthenticatedScope {
  return user ? JSON.stringify([user.id, user.companyId ?? null, user.role]) : null;
}

export function shouldClearProtectedReportCaches(
  previousScope: AuthenticatedScope | undefined,
  nextScope: AuthenticatedScope,
): boolean {
  return previousScope === undefined || previousScope !== nextScope;
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

export const authBoundaryNavigation = {
  reload: () => window.location.reload(),
};

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
  const authenticatedScopeRef = useRef<AuthenticatedScope | undefined>(undefined);
  const scopeTransitionEpochRef = useRef(0);
  const scopeTransitionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionActionQueueRef = useRef<Promise<void> | null>(null);
  const sessionActionGenerationRef = useRef(0);
  const authReadEpochRef = useRef(0);
  const authActionEpochRef = useRef(0);
  const authSelectionEpochRef = useRef(0);

  const enqueueSessionAction = useCallback(<T,>(action: () => Promise<T>): Promise<T> => {
    const previous = sessionActionQueueRef.current;
    const operation = previous ? previous.then(action) : action();
    const tail = operation.then(() => undefined, () => undefined);
    sessionActionQueueRef.current = tail;
    void tail.then(() => {
      if (sessionActionQueueRef.current === tail) sessionActionQueueRef.current = null;
    });
    return operation;
  }, []);

  const transitionAuthenticatedScope = useCallback((nextUser: AuthenticatedScopeUser | null): Promise<void> => {
    const nextScope = getAuthenticatedScope(nextUser);
    const transitionEpoch = scopeTransitionEpochRef.current;
    const operation = scopeTransitionQueueRef.current.then(async () => {
      if (scopeTransitionEpochRef.current !== transitionEpoch) return;
      const shouldClear = shouldClearProtectedReportCaches(authenticatedScopeRef.current, nextScope);
      if (!shouldClear) return;

      await clearProtectedReportCaches();
      if (scopeTransitionEpochRef.current !== transitionEpoch) return;
      authenticatedScopeRef.current = nextScope;
    });

    // Keep later transitions runnable after a failure while returning the
    // original operation so its caller still observes the purge error.
    scopeTransitionQueueRef.current = operation.catch(() => undefined);
    return operation;
  }, []);

  const failClosedAuthBoundary = useCallback(() => {
    authReadEpochRef.current += 1;
    authActionEpochRef.current += 1;
    authSelectionEpochRef.current += 1;
    sessionActionGenerationRef.current += 1;
    scopeTransitionEpochRef.current += 1;
    authenticatedScopeRef.current = undefined;
    setUser(null);
    setApproved(true);
    setIsLoading(false);
    clearStoredUser();
    try { sessionStorage.removeItem('uniher-view-mode'); } catch {}
    try { sessionStorage.removeItem('uniher-session-active'); } catch {}
    authBoundaryNavigation.reload();
  }, []);

  // Verify session on mount (via /api/auth/me).
  // Don't set user from localStorage immediately — verify with API first,
  // falling back to localStorage only if API fails (offline support).
  useEffect(() => {
    let cancelled = false;
    let responseReceived = false;
    const controller = new AbortController();
    const requestEpoch = ++authReadEpochRef.current;
    const stored = getStoredUser();
    const publicPathsWithoutSessionCheck = ['/', '/auth', '/esqueci-senha', '/redefinir-senha'];

    if (!stored && pathname && publicPathsWithoutSessionCheck.includes(pathname)) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', { signal: controller.signal })
      .then(async response => {
        responseReceived = true;
        const data = response.ok ? await response.json() : null;
        if (cancelled || authReadEpochRef.current !== requestEpoch) return;
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
          await transitionAuthenticatedScope(updated);
          if (cancelled || authReadEpochRef.current !== requestEpoch) return;
          setUser(updated);
          setApproved(u.approved !== 0);
          persistUser(updated);
          // Mark session as active for the fetch interceptor
          try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
          if (u.mustChangePassword === true || u.firstAccessTourCompleted === false) {
            router.push('/primeiro-acesso');
          }
        } else {
          await transitionAuthenticatedScope(null);
          if (cancelled || authReadEpochRef.current !== requestEpoch) return;
          setUser(null);
          setApproved(true);
          clearStoredUser();
        }
      })
      .catch(async (error: unknown) => {
        if (
          cancelled
          || authReadEpochRef.current !== requestEpoch
          || (error instanceof Error && error.name === 'AbortError')
        ) return;
        if (responseReceived) {
          failClosedAuthBoundary();
          return;
        }
        // API unavailable — fall back to localStorage for offline support
        if (stored) {
          const offlineUser: MockUser = {
            id: stored.id,
            name: stored.name,
            email: '',
            role: stored.role,
            isMasterAdmin: stored.isMasterAdmin === true,
            joinedAt: '',
            mustChangePassword: stored.mustChangePassword === true,
            firstAccessTourCompleted: stored.firstAccessTourCompleted !== false,
          };
          try {
            await transitionAuthenticatedScope(offlineUser);
            if (cancelled || authReadEpochRef.current !== requestEpoch) return;
            setUser(offlineUser);
          } catch {
            if (!cancelled && authReadEpochRef.current === requestEpoch) {
              failClosedAuthBoundary();
            }
          }
        }
      })
      .finally(() => {
        if (!cancelled && authReadEpochRef.current === requestEpoch) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [failClosedAuthBoundary, pathname, router, transitionAuthenticatedScope]);

  const login = useCallback((email: string, password: string): Promise<MockUser | null> => {
    const actionGeneration = sessionActionGenerationRef.current;
    return enqueueSessionAction(async () => {
      if (sessionActionGenerationRef.current !== actionGeneration) return null;
      const actionEpoch = ++authActionEpochRef.current;
      authReadEpochRef.current += 1;
      authSelectionEpochRef.current += 1;
      let acceptedResponse = false;
      try {
        if (authActionEpochRef.current !== actionEpoch) return null;
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        acceptedResponse = true;

        const data = await res.json();
        const u = data?.user;
        if (!u?.id || !u.role) throw new Error('Invalid login response');

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

        if (authActionEpochRef.current !== actionEpoch) return null;
        await transitionAuthenticatedScope(loggedUser);
        if (authActionEpochRef.current !== actionEpoch) return null;
        authReadEpochRef.current += 1;
        authSelectionEpochRef.current += 1;
        setUser(loggedUser);
        persistUser(loggedUser);
        // Mark session as active so fetch interceptor doesn't show reauth modal on fresh login
        try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
        return loggedUser;
      } catch {
        if (acceptedResponse) failClosedAuthBoundary();
        return null;
      } finally {
        if (authActionEpochRef.current === actionEpoch) setIsLoading(false);
      }
    });
  }, [enqueueSessionAction, failClosedAuthBoundary, transitionAuthenticatedScope]);

  const register = useCallback((data: any): Promise<boolean> => {
    const actionGeneration = sessionActionGenerationRef.current;
    return enqueueSessionAction(async () => {
      if (sessionActionGenerationRef.current !== actionGeneration) return false;
      const actionEpoch = ++authActionEpochRef.current;
      authReadEpochRef.current += 1;
      authSelectionEpochRef.current += 1;
      let acceptedResponse = false;
      try {
        if (authActionEpochRef.current !== actionEpoch) return false;
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return false;
        acceptedResponse = true;

        const responseData = await res.json();
        const u = responseData?.user;
        if (!u?.id || !u.role) throw new Error('Invalid registration response');

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

        if (authActionEpochRef.current !== actionEpoch) return false;
        await transitionAuthenticatedScope(registered);
        if (authActionEpochRef.current !== actionEpoch) return false;
        authReadEpochRef.current += 1;
        authSelectionEpochRef.current += 1;
        setUser(registered);
        persistUser(registered);
        // Mark session as active so fetch interceptor doesn't show reauth modal on fresh registration
        try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
        return true;
      } catch {
        if (acceptedResponse) failClosedAuthBoundary();
        return false;
      } finally {
        if (authActionEpochRef.current === actionEpoch) setIsLoading(false);
      }
    });
  }, [enqueueSessionAction, failClosedAuthBoundary, transitionAuthenticatedScope]);

  const selectRole = useCallback(async (role: UserRole) => {
    if (!user) return;
    const selectionEpoch = ++authSelectionEpochRef.current;
    authReadEpochRef.current += 1;
    const updated = { ...user, role };
    await transitionAuthenticatedScope(updated);
    if (authSelectionEpochRef.current !== selectionEpoch) return;
    authReadEpochRef.current += 1;
    setUser(updated);
    persistUser(updated);
  }, [transitionAuthenticatedScope, user]);

  const logout = useCallback((): Promise<void> => {
    const actionGeneration = sessionActionGenerationRef.current;
    return enqueueSessionAction(async () => {
      if (sessionActionGenerationRef.current !== actionGeneration) return;
      const actionEpoch = ++authActionEpochRef.current;
      authReadEpochRef.current += 1;
      authSelectionEpochRef.current += 1;
      try {
        if (authActionEpochRef.current !== actionEpoch) return;
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        if (authActionEpochRef.current !== actionEpoch) return;
        await transitionAuthenticatedScope(null);
        if (authActionEpochRef.current !== actionEpoch) return;
        authReadEpochRef.current += 1;
        authSelectionEpochRef.current += 1;
        setUser(null);
        clearStoredUser();
        // Clear session flags so next login starts fresh
        try { sessionStorage.removeItem('uniher-view-mode'); } catch {}
        try { sessionStorage.removeItem('uniher-session-active'); } catch {}
        window.location.href = '/';
      } catch {
        failClosedAuthBoundary();
      } finally {
        if (authActionEpochRef.current === actionEpoch) setIsLoading(false);
      }
    });
  }, [enqueueSessionAction, failClosedAuthBoundary, transitionAuthenticatedScope]);

  const refreshUser = useCallback(async (): Promise<MockUser | null> => {
    const requestEpoch = ++authReadEpochRef.current;
    let responseReceived = false;
    try {
      const response = await fetch('/api/auth/me');
      responseReceived = true;
      const data = response.ok ? await response.json() : null;

      if (authReadEpochRef.current !== requestEpoch) return null;

      if (!data?.user) {
        await transitionAuthenticatedScope(null);
        if (authReadEpochRef.current !== requestEpoch) return null;
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
      await transitionAuthenticatedScope(updated);
      if (authReadEpochRef.current !== requestEpoch) return null;
      setUser(updated);
      persistUser(updated);
      return updated;
    } catch {
      if (responseReceived && authReadEpochRef.current === requestEpoch) {
        failClosedAuthBoundary();
      }
      return null;
    } finally {
      if (authReadEpochRef.current === requestEpoch) setIsLoading(false);
    }
  }, [failClosedAuthBoundary, transitionAuthenticatedScope]);

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
