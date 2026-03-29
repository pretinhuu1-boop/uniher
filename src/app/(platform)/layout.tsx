'use client';
import AuthProvider from '@/components/platform/AuthProvider';
import AppLayout from '@/components/platform/AppLayout';
import ReauthModal from '@/components/platform/ReauthModal';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReauthModal />
      <AppLayout>
        {children}
      </AppLayout>
    </AuthProvider>
  );
}
