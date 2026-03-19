'use client';
import { ReactNode } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
