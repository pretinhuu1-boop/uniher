'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLoadingScreen from '@/components/platform/AuthLoadingScreen';
import { useAuth } from '@/hooks/useAuth';

interface ModuleHoldRedirectProps {
  loginRedirect: string;
}

export function ModuleHoldRedirect({ loginRedirect }: ModuleHoldRedirectProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace(`/auth?redirect=${loginRedirect}`);
      return;
    }

    if (user.role === 'admin') {
      router.replace('/admin?tab=empresas');
      return;
    }

    if (user.role === 'rh') {
      router.replace('/produtos-modulos');
      return;
    }

    if (user.role === 'colaboradora' || Boolean(user.also_collaborator)) {
      router.replace('/colaboradora');
      return;
    }

    router.replace('/dashboard');
  }, [isAuthenticated, isLoading, loginRedirect, router, user]);

  return <AuthLoadingScreen />;
}
