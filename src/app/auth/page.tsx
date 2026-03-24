'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import Image from 'next/image';

/** Only allow safe internal redirect paths (prevent open redirect attacks) */
function getSafeRedirect(redirect: string | null): string | null {
  if (!redirect) return null;
  // Only allow relative paths starting with /
  if (!redirect.startsWith('/')) return null;
  // Block protocol-relative URLs
  if (redirect.startsWith('//')) return null;
  // Block known external patterns
  if (redirect.includes('://')) return null;
  return redirect;
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Se já autenticado, redirecionar
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'colaboradora') {
        const redirect = getSafeRedirect(searchParams.get('redirect'));
        router.push(redirect || '/colaboradora');
      } else {
        const redirect = getSafeRedirect(searchParams.get('redirect'));
        router.push(redirect || '/dashboard');
      }
    }
  }, [isAuthenticated, user, router, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ok = await login(email, password);

      if (!ok) {
        setError('Email ou senha incorretos.');
        return;
      }

      setToast({ message: 'Bem-vinda de volta!', type: 'success' });

      const u = JSON.parse(localStorage.getItem('uniher-user') || '{}');
      // Admin always goes to /admin, ignoring redirect param
      let target: string;
      if (u.role === 'admin') {
        target = '/admin';
      } else {
        target = getSafeRedirect(searchParams.get('redirect')) || (u.role === 'rh' || u.role === 'lideranca' ? '/dashboard' : '/colaboradora');
      }
      router.push(target);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-rose-100/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[45%] rounded-full bg-gold-50/40 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-md border-border-2 shadow-xl animate-scaleIn relative z-10 rounded-lg">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8 group cursor-pointer" onClick={() => router.push('/')}>
          <div className="relative transform transition-transform group-hover:scale-110 duration-500">
            <Image src="/logo-uniher.png" alt="UniHER" width={180} height={150} priority className="object-contain" style={{ width: 180, height: 'auto' }} />
          </div>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative w-full">
            <Input
              label="Senha"
              type={showPw ? 'text' : 'password'}
              placeholder="********"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              className="absolute right-3 top-[38px] p-2 text-uni-text-300 hover:text-rose-500 transition-colors"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium text-rose-700 animate-fadeIn">{error}</p>
          )}

          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Entrar'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/esqueci-senha')}
            className="text-xs text-uni-text-300 hover:text-rose-500 transition-colors"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xs text-uni-text-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para o início
          </button>
        </div>
      </Card>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center">Carregando...</div>}>
      <AuthContent />
    </Suspense>
  );
}
