'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Image from 'next/image';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao enviar solicitação.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.');
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

        {success ? (
          <div className="text-center space-y-4 animate-fadeIn">
            {/* Checkmark icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-uni-green/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-uni-green">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-uni-text-600">Email enviado!</h2>
            <p className="text-sm text-uni-text-400 leading-relaxed">
              Se o email estiver cadastrado, enviaremos instruções de recuperação. Verifique sua caixa de entrada.
            </p>
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="text-xs text-uni-text-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto mt-4"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar para o login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-uni-text-600">Esqueceu sua senha?</h1>
              <p className="text-sm text-uni-text-400 mt-1">
                Informe seu email para receber as instruções de recuperação.
              </p>
            </div>

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

              {error && (
                <p className="text-sm font-medium text-rose-700 animate-fadeIn">{error}</p>
              )}

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Enviar instruções'}
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
