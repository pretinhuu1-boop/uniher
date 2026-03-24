'use client';

import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading } = useAuth();

  // Show loading screen while auth state is being resolved to prevent flash of unauthorized content
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo-uniher.png" alt="UniHER" width={120} height={100} className="object-contain animate-pulse" style={{ width: 120, height: 'auto' }} />
          <span className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream-50 font-body">
      {/* Sidebar Desktop e Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Mobile Topbar */}
        <header className="md:hidden sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border-1 bg-white/80 backdrop-blur-md px-4 shadow-sm">
          <button 
            className="p-2 -ml-2 rounded-full hover:bg-cream-100 transition-colors text-uni-text-600"
            onClick={() => setSidebarOpen(true)} 
            aria-label="Abrir menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          {title && <h1 className="text-lg font-display font-bold text-uni-text-900 line-clamp-1">{title}</h1>}
        </header>

        {/* Content Container */}
        <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full animate-pageIn">
          {children}
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
}
