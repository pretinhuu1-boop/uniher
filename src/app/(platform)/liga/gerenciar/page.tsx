'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLoadingScreen from '@/components/platform/AuthLoadingScreen';
import { useAuth } from '@/hooks/useAuth';

export default function LigaGerenciarCompatibilityRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/auth?redirect=%2Fliga%2Fgerenciar');
      return;
    }

    if (user.role === 'admin' || user.role === 'rh') {
      router.replace('/gamificacao-config');
      return;
    }

    if (user.role === 'lideranca') {
      router.replace('/campanhas');
      return;
    }

    if (user.role === 'colaboradora' || user.also_collaborator === 1) {
      router.replace('/conquistas');
      return;
    }

    router.replace('/campanhas');
  }, [isAuthenticated, isLoading, router, user]);

  return <AuthLoadingScreen />;
}
