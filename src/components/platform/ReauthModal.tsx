'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { installFetchInterceptor, setReauthCallback } from '@/lib/auth/fetch-interceptor';

export default function ReauthModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((success: boolean) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReauth = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setIsOpen(true);
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    });
  }, []);

  useEffect(() => {
    installFetchInterceptor();
    setReauthCallback(handleReauth);
  }, [handleReauth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !user?.email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      });

      if (res.ok) {
        setIsOpen(false);
        setPassword('');
        resolveRef.current?.(true);
        resolveRef.current = null;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Senha incorreta');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setPassword('');
    resolveRef.current?.(false);
    resolveRef.current = null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" style={{ border: '1px solid #f0e8d8' }}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔒</div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
            Sessão Expirada
          </h2>
          <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
            Digite sua senha para continuar de onde parou.
          </p>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl p-3 mb-4" style={{ background: '#faf7f0', border: '1px solid #f0e8d8' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#C9A264', color: '#fff' }}>
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'UN'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#1A3A6B' }}>{user?.name}</div>
            <div className="text-[11px] truncate" style={{ color: '#8B7355' }}>{user?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#6B5C4D' }}>
              Senha
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none"
                style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: '#8B7355' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: '1px solid #e8dfd0', color: '#8B7355' }}
            >
              Sair
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
              style={{ background: '#C9A264' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Continuar'}
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] mt-4" style={{ color: '#a3a3a3' }}>
          Sua sessão expirou por segurança. Nenhum dado foi perdido.
        </p>
      </div>
    </div>
  );
}
