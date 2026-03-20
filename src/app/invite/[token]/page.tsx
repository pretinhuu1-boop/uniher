'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InviteData {
  valid: boolean;
  email: string;
  role: string;
  companyName: string;
  departmentName: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  colaboradora: 'Colaboradora',
  rh: 'RH',
  lideranca: 'Liderança',
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    params.then(({ token: t }) => {
      setToken(t);
      fetch(`/api/invites/${t}`)
        .then(r => r.json())
        .then(d => {
          if (d.valid) setInvite(d);
          else setError(d.error || 'Convite inválido');
        })
        .catch(() => setError('Erro ao verificar convite'))
        .finally(() => setLoading(false));
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (form.password.length < 8) { setError('Senha deve ter pelo menos 8 caracteres'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, password: form.password }),
      });
      const d = await res.json();
      if (d.success) {
        router.push(`/pending-approval?email=${encodeURIComponent(invite?.email ?? '')}`);
      } else {
        setError(d.error || 'Erro ao criar conta');
      }
    } catch { setError('Erro de conexão'); }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌸</div>
          <p className="text-uni-text-500 font-body">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-lg text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-display font-bold text-uni-text-900 mb-2">Convite inválido</h1>
          <p className="text-uni-text-500 text-sm">{error}</p>
          <a href="/" className="mt-6 block text-sm font-bold text-rose-500 hover:underline">Voltar ao início</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-cream-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8 text-white text-center">
          <div className="text-4xl mb-2">🌸</div>
          <h1 className="text-2xl font-display font-bold">Bem-vinda à UniHER!</h1>
          <p className="text-rose-100 text-sm mt-1">
            Você foi convidada para {invite?.companyName}
          </p>
        </div>

        <div className="p-8">
          {/* Invite details */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-uni-text-500">Email</span>
              <span className="font-bold text-uni-text-900">{invite?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-uni-text-500">Papel</span>
              <span className="font-bold text-rose-600">{ROLE_LABELS[invite?.role || ''] || invite?.role}</span>
            </div>
            {invite?.departmentName && (
              <div className="flex justify-between text-sm">
                <span className="text-uni-text-500">Setor</span>
                <span className="font-bold text-uni-text-900">{invite.departmentName}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1.5 uppercase tracking-wider">Seu nome completo *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Como prefere ser chamada?"
                className="w-full border border-border-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1.5 uppercase tracking-wider">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-border-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition-colors pr-12"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 text-lg">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1.5 uppercase tracking-wider">Confirmar senha *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repita a senha"
                className="w-full border border-border-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !form.name || !form.password || !form.confirm}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Criando sua conta...' : '🌸 Criar minha conta'}
            </button>
          </form>

          <p className="text-center text-xs text-uni-text-400 mt-4">
            Já tem conta? <a href="/auth" className="text-rose-500 font-bold hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
