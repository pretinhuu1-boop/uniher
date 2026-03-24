'use client';

import { useState, useMemo, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Image from 'next/image';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: '1 letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: '1 número', test: (v: string) => /\d/.test(v) },
  { label: '1 caractere especial (!@#$%&*)', test: (v: string) => /[!@#$%&*]/.test(v) },
];

function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validation = useMemo(() => PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  })), [password]);

  const allValid = validation.every((r) => r.passed);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allValid || !passwordsMatch) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao redefinir senha.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }: { visible: boolean }) =>
    visible ? (
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
    );

  // No token in URL
  if (!token) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-rose-100/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[45%] rounded-full bg-gold-50/40 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-md border-border-2 shadow-xl animate-scaleIn relative z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3 mb-8 group cursor-pointer" onClick={() => router.push('/')}>
            <div className="relative transform transition-transform group-hover:scale-110 duration-500">
              <Image src="/logo-uniher.png" alt="UniHER" width={180} height={150} priority className="object-contain" style={{ width: 180, height: 'auto' }} />
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-uni-text-600">Link inválido</h2>
            <p className="text-sm text-uni-text-400">
              Este link de redefinição de senha é inválido ou expirou.
            </p>
            <button
              type="button"
              onClick={() => router.push('/esqueci-senha')}
              className="text-sm text-rose-500 hover:text-rose-700 transition-colors font-medium"
            >
              Solicitar novo link
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="text-xs text-uni-text-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar para o login
            </button>
          </div>
        </Card>
      </main>
    );
  }

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

        {success ? (
          <div className="text-center space-y-4 animate-fadeIn">
            <div className="mx-auto w-16 h-16 rounded-full bg-uni-green/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-uni-green">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-uni-text-600">Senha redefinida com sucesso!</h2>
            <p className="text-sm text-uni-text-400">
              Sua senha foi alterada. Agora você pode fazer login com a nova senha.
            </p>
            <Button
              onClick={() => router.push('/auth')}
              className="w-full h-12 mt-2"
            >
              Ir para o login
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-uni-text-600">Redefinir senha</h1>
              <p className="text-sm text-uni-text-400 mt-1">
                Crie uma nova senha para sua conta.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Nova senha */}
              <div className="relative w-full">
                <Input
                  label="Nova senha"
                  type={showPw ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="new-password"
                  required
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
                  <EyeIcon visible={showPw} />
                </button>
              </div>

              {/* Password validation feedback */}
              {password.length > 0 && (
                <div className="space-y-1.5 animate-fadeIn">
                  {validation.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-xs">
                      {rule.passed ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-uni-green shrink-0">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-uni-text-300 shrink-0">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                      <span className={rule.passed ? 'text-uni-green' : 'text-uni-text-400'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmar senha */}
              <div className="relative w-full">
                <Input
                  label="Confirmar senha"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[38px] p-2 text-uni-text-300 hover:text-rose-500 transition-colors"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  aria-label={showConfirmPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon visible={showConfirmPw} />
                </button>
              </div>

              {/* Passwords match feedback */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2 text-xs animate-fadeIn">
                  {passwordsMatch ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-uni-green shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-uni-green">Senhas conferem</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span className="text-rose-500">Senhas não conferem</span>
                    </>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm font-medium text-rose-700 animate-fadeIn">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading || !allValid || !passwordsMatch}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Redefinir senha'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-xs text-uni-text-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Voltar para o login
              </button>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center">Carregando...</div>}>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
