'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, useAuthState } from '@/hooks/useAuth';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  const router = useRouter();

  // Redirect unapproved users out of the platform
  useEffect(() => {
    if (auth.user && auth.approved === false) {
      router.replace(`/pending-approval?email=${encodeURIComponent(auth.user.email)}`);
    }
  }, [auth.user, auth.approved, router]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
