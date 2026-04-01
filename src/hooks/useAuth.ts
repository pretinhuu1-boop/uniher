'use client';
import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MockUser, UserRole } from '@/types/platform';

const STORAGE_KEY_USER = 'uniher-user';

/**
 * Minimal user data stored in localStorage for UI routing only (not for security).
 * Authentication is handled by httpOnly cookies (JWT).
 * Only non-sensitive display fields are persisted: id, name, role.
 */
interface StoredUserData {
  id: string;
  name: string;
  role: UserRole;
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
    const minimal: StoredUserData = { id: user.id, name: user.name, role: user.role };
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
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  logout: () => void;
  refreshUser: () => void;
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
      .then(data => {
        if (data?.user) {
          const u = data.user;
          const updated: MockUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            level: u.level,
            points: u.points,
            streak: u.streak,
            joinedAt: u.created_at,
            also_collaborator: u.also_collaborator || (u.role === 'lideranca' ? 1 : 0),
            nickname: u.nickname,
            can_approve: u.can_approve,
          };
          setUser(updated);
          setApproved(u.approved !== 0);
          persistUser(updated);
          // Mark session as active for the fetch interceptor
          try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
          if (u.mustChangePassword === true) {
            router.push('/primeiro-acesso');
          }
        } else {
          setUser(null);
          setApproved(true);
          clearStoredUser();
        }
      })
      .catch(() => {
        // API unavailable — fall back to localStorage for offline support
        if (stored) {
          setUser({
            id: stored.id,
            name: stored.name,
            email: '',
            role: stored.role,
            level: 0,
            points: 0,
            streak: 0,
            joinedAt: '',
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      const u = data.user;

      const loggedUser: MockUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        level: u.level,
        points: u.points,
        streak: u.streak,
        joinedAt: u.created_at,
        also_collaborator: u.also_collaborator || (u.role === 'lideranca' ? 1 : 0),
      };

      setUser(loggedUser);
      persistUser(loggedUser);
      // Mark session as active so fetch interceptor doesn't show reauth modal on fresh login
      try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
      return true;
    } catch {
      return false;
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
        level: u.level,
        points: u.points,
        streak: u.streak,
        joinedAt: u.created_at,
      };

      setUser(registered);
      persistUser(registered);
      // Mark session as active so fetch interceptor doesn't show reauth modal on fresh registration
      try { sessionStorage.setItem('uniher-session-active', '1'); } catch {}
      return true;
    } catch {
      return false;
    }
  }, []);

  const selectRole = useCallback((role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    persistUser(updated);
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    clearStoredUser();
    // Clear session flags so next login starts fresh
    try { sessionStorage.removeItem('uniher-view-mode'); } catch {}
    try { sessionStorage.removeItem('uniher-session-active'); } catch {}
    window.location.href = '/';
  }, []);

  const refreshUser = useCallback(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data?.user) {
        const u = data.user;
        const updated: MockUser = {
          id: u.id, name: u.name, email: u.email, role: u.role as UserRole,
          level: u.level, points: u.points, streak: u.streak, joinedAt: u.created_at,
          also_collaborator: u.also_collaborator || (u.role === 'lideranca' ? 1 : 0),
          nickname: u.nickname, can_approve: u.can_approve,
        };
        setUser(updated);
        persistUser(updated);
      }
    }).catch(() => {});
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
  login: async () => false,
  register: async () => false,
  selectRole: () => {},
  logout: () => {},
  refreshUser: () => {},
});

export const useAuth = () => useContext(AuthContext);
