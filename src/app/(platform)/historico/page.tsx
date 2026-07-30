'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLoadingScreen from '@/components/platform/AuthLoadingScreen';
import { useAuth } from '@/hooks/useAuth';

export default function HistoricoCompatibilityRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/auth?redirect=%2Fhistorico');
      return;
    }

    if (user.role === 'admin' || user.role === 'rh' || user.role === 'lideranca') {
      router.replace('/dashboard?section=exames');
      return;
    }

    router.replace('/colaboradora');
  }, [isAuthenticated, isLoading, router, user]);

  return <AuthLoadingScreen />;
}
