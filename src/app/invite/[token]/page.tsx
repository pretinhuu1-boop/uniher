'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface InviteData {
  valid: boolean;
  email: string;
  role: string;
  companyName: string;
  departmentName: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  colaboradora: 'Colaboradora',
  rh: 'Admin Empresa',
  lideranca: 'Liderança',
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', nickname: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const rules = [
    { label: '8+ caracteres', ok: form.password.length >= 8 },
    { label: '1 maiúscula', ok: /[A-Z]/.test(form.password) },
    { label: '1 minúscula', ok: /[a-z]/.test(form.password) },
    { label: '1 número', ok: /[0-9]/.test(form.password) },
    { label: '1 especial', ok: /[!@#$%&*]/.test(form.password) },
  ];

  useEffect(() => {
    params.then(({ token: t }) => {
      setToken(t);
      fetch(`/api/invites/${t}`)
        .then(r => r.json())
        .then(d => {
          if (d.valid) {
            setInvite(d);
            if (d.name) setForm(f => ({ ...f, name: d.name }));
          } else {
            setError(d.error || 'Convite inválido');
          }
        })
        .catch(() => setError('Erro ao verificar convite'))
        .finally(() => setLoading(false));
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userInteracted) { return; } // Block autofill-triggered submits
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (rules.some(r => !r.ok)) { setError('A senha não atende todos os requisitos'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.nickname ? `${form.name} (${form.nickname})` : form.name,
          password: form.password,
        }),
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF7F2' }}>
        <div className="text-center">
          <Image src="/logo-uniher.png" alt="UniHER" width={56} height={47} priority className="object-contain mx-auto animate-pulse" style={{ height: 'auto' }} />
          <p className="text-sm mt-3" style={{ color: '#8B7355' }}>Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAF7F2' }}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" style={{ border: '1px solid #f0e8d8', boxShadow: '0 4px 24px rgba(201,162,100,0.1)' }}>
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>Convite inválido</h1>
          <p className="text-sm" style={{ color: '#8B7355' }}>{error}</p>
          <a href="/" className="mt-6 block text-sm font-bold hover:underline" style={{ color: '#C9A264' }}>Voltar ao início</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAF7F2' }}>
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" style={{ border: '1px solid #f0e8d8', boxShadow: '0 4px 24px rgba(201,162,100,0.1)' }}>
        {/* Header */}
        <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #C9A264 0%, #9A7520 100%)' }}>
          <Image src="/logo-uniher.png" alt="UniHER" width={120} height={100} priority className="mx-auto mb-3 object-contain" style={{ filter: 'brightness(0) invert(1)', height: 'auto' }} />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Bem-vinda à UniHER!</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Você foi convidada para {invite?.companyName}
          </p>
        </div>

        <div className="p-8">
          {/* Invite details */}
          <div className="rounded-xl p-4 mb-6 space-y-2" style={{ background: '#faf7f0', border: '1px solid #f0e8d8' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#8B7355' }}>Email</span>
              <span className="font-bold" style={{ color: '#1A3A6B' }}>{invite?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#8B7355' }}>Papel</span>
              <span className="font-bold" style={{ color: '#C9A264' }}>{ROLE_LABELS[invite?.role || ''] || invite?.role}</span>
            </div>
            {invite?.departmentName && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#8B7355' }}>Setor</span>
                <span className="font-bold" style={{ color: '#1A3A6B' }}>{invite.departmentName}</span>
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
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>Nome (definido pelo admin)</label>
              <input
                type="text"
                value={form.name}
                readOnly
                tabIndex={-1}
                autoComplete="off"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1px solid #e8dfd0', background: '#f0ece5', color: '#8a7d6b', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>
                Apelido <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(como quer ser chamada)</span>
              </label>
              <input
                type="text"
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="Ex: Edu, Duda..."
                autoComplete="off"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onFocus={() => setUserInteracted(true)}
                  onChange={e => { setUserInteracted(true); setForm(f => ({ ...f, password: e.target.value })); }}
                  placeholder="Crie sua senha"
                  autoComplete="new-password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors pr-12"
                  style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8B7355' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>Confirmar senha *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors pr-12"
                  style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8B7355' }}
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Password rules */}
            <div className="grid grid-cols-3 gap-1">
              {rules.map(r => (
                <div key={r.label} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: r.ok ? '#16a34a' : '#a3a3a3' }}>
                  <span>{r.ok ? '✓' : '○'}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving || !form.name || rules.some(r => !r.ok) || !form.confirm}
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#C9A264', fontFamily: 'Georgia, serif' }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando sua conta...
                </span>
              ) : 'Criar minha conta →'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: '#8B7355' }}>
            Já tem conta? <a href="/auth" className="font-bold hover:underline" style={{ color: '#C9A264' }}>Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
