'use client';
import AuthProvider from '@/components/platform/AuthProvider';
import AppLayout from '@/components/platform/AppLayout';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayout>
        {children}
      </AppLayout>
    </AuthProvider>
  );
}
