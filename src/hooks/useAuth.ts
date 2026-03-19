'use client';
import { useState, useCallback, createContext, useContext } from 'react';
import { MockUser, UserRole } from '@/types/platform';
import { MOCK_USERS } from '@/data/mock-users';

const STORAGE_KEY_ROLE = 'uniher-role';
const STORAGE_KEY_USER = 'uniher-user';

function getStoredUser(): MockUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const role = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
    if (role && MOCK_USERS[role]) {
      return MOCK_USERS[role];
    }
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      return JSON.parse(raw) as MockUser;
    }
  } catch {
    // Ignore parse errors or restricted storage access
  }
  return null;
}

function persistUser(user: MockUser, role: UserRole) {
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch {
    // Ignore storage errors
  }
}

interface AuthContextValue {
  user: MockUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  logout: () => void;
}

export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<MockUser | null>(() => getStoredUser());

  const login = useCallback(async (_email: string, _password: string): Promise<boolean> => {
    // Simulated delay
    await new Promise(r => setTimeout(r, 800));
    // Default to RH user for demo
    const loggedUser = MOCK_USERS.rh;
    setUser(loggedUser);
    persistUser(loggedUser, 'rh');
    return true;
  }, []);

  const register = useCallback(async (_name: string, _email: string, _password: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 800));
    const registeredUser = MOCK_USERS.rh;
    setUser(registeredUser);
    persistUser(registeredUser, 'rh');
    return true;
  }, []);

  const selectRole = useCallback((role: UserRole) => {
    const selected = MOCK_USERS[role] || MOCK_USERS.rh;
    setUser(selected);
    persistUser(selected, MOCK_USERS[role] ? role : 'rh');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearStoredUser();
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    login,
    register,
    selectRole,
    logout,
  };
}

// React Context for sharing auth across pages
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  selectRole: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
