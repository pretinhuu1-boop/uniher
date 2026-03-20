'use client';
import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MockUser, UserRole } from '@/types/platform';

const STORAGE_KEY_USER = 'uniher-user';

function getStoredUser(): MockUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw) as MockUser;
  } catch {}
  return null;
}

function persistUser(user: MockUser) {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
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
  approved: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  logout: () => void;
}

export function useAuthState(): AuthContextValue {
  // Start with null on both server and client to avoid hydration mismatch.
  // localStorage is read in useEffect (client-only).
  const [user, setUser] = useState<MockUser | null>(null);
  const [approved, setApproved] = useState<boolean>(true);
  const router = useRouter();

  // Verificar sessao ao montar (via /api/auth/me)
  useEffect(() => {
    // Restore from localStorage immediately for instant UI, then validate
    const stored = getStoredUser();
    if (stored) setUser(stored);

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
          };
          setUser(updated);
          setApproved(u.approved !== 0);
          persistUser(updated);
          if (u.mustChangePassword === true) {
            router.push('/primeiro-acesso');
          }
        } else {
          setUser(null);
          setApproved(true);
          clearStoredUser();
        }
      })
      .catch(() => {});
  }, [router]);

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
      };

      setUser(loggedUser);
      persistUser(loggedUser);
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
    window.location.href = '/';
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    approved,
    login,
    register,
    selectRole,
    logout,
  };
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  approved: true,
  login: async () => false,
  register: async () => false,
  selectRole: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
