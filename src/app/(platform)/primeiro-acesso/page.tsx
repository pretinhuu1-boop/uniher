'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<'password' | 'welcome'>('password');
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password form
  const [passForm, setPassForm] = useState({ newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);

  const rules = [
    { label: '8+ caracteres', ok: passForm.newPassword.length >= 8 },
    { label: '1 maiúscula', ok: /[A-Z]/.test(passForm.newPassword) },
    { label: '1 minúscula', ok: /[a-z]/.test(passForm.newPassword) },
    { label: '1 número', ok: /[0-9]/.test(passForm.newPassword) },
    { label: '1 especial (!@#$%&*)', ok: /[!@#$%&*]/.test(passForm.newPassword) },
  ];

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      // If password was already changed, skip to welcome
      if (!user.mustChangePassword) {
        setStep('welcome');
      }
    }
  }, [user]);

  async function handlePasswordChange() {
    if (passForm.newPassword !== passForm.confirm) { setError('As senhas não coincidem'); return; }
    if (rules.some(r => !r.ok)) { setError('A senha não atende todos os requisitos'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: passForm.newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      await refreshUser?.();
      setStep('welcome');
    } else {
      setError(data.error || 'Erro ao trocar senha');
    }
    setLoading(false);
  }

  async function handleConfirmAndEnter() {
    setLoading(true);
    setError('');
    // Update name if changed
    if (name !== user?.name && name.trim()) {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao atualizar nome');
        setLoading(false);
        return;
      }
    }
    // Mark first access as complete + get new JWT
    const confirmRes = await fetch('/api/auth/confirm-first-access', { method: 'POST' });
    if (!confirmRes.ok) {
      setError('Erro ao confirmar acesso. Tente novamente.');
      setLoading(false);
      return;
    }
    // Navigate with clean JWT (no mustChangePassword)
    const role = user?.role;
    if (role === 'admin') window.location.href = '/admin';
    else if (role === 'rh') window.location.href = '/dashboard';
    else window.location.href = '/colaboradora';
  }

  const companyName = (user as any)?.companyName || '';
  const roleLabels: Record<string, string> = {
    admin: 'Admin Master',
    rh: 'Admin Empresa',
    lideranca: 'Liderança',
    colaboradora: 'Colaboradora',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAF7F2' }}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-md border" style={{ borderColor: '#f0e8d8', boxShadow: '0 4px 24px rgba(201,162,100,0.1)' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-uniher.png" alt="UniHER" width={120} height={100} priority className="object-contain mx-auto" style={{ height: 'auto' }} />
        </div>

        {/* ─── STEP 1: Password Change ─── */}
        {step === 'password' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>Primeiro Acesso 🔐</h1>
              <p className="text-sm" style={{ color: '#8B7355' }}>Por segurança, crie uma senha pessoal.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#6B5C4D' }}>Nova Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passForm.newPassword}
                  onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Crie sua nova senha"
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm font-mono outline-none"
                  style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8B7355' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#6B5C4D' }}>Confirmar Senha *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passForm.confirm}
                onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repita a nova senha"
                className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
                style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {rules.map(r => (
                <div key={r.label} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: r.ok ? '#16a34a' : '#a3a3a3' }}>
                  <span>{r.ok ? '✓' : '○'}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              onClick={handlePasswordChange}
              disabled={loading || rules.some(r => !r.ok) || !passForm.confirm}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: '#C9A264', fontFamily: 'Georgia, serif' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : 'Definir minha senha →'}
            </button>
          </div>
        )}

        {/* ─── STEP 2: Welcome Confirmation ─── */}
        {step === 'welcome' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                Bem-vinda! <span>👋</span>
              </h1>
              <p className="text-sm" style={{ color: '#8B7355' }}>Confirme seus dados para acessar a plataforma.</p>
            </div>

            {/* Welcome card */}
            <div className="text-center rounded-xl p-5" style={{ background: '#faf7f0', border: '1px solid #f0e8d8' }}>
              <div className="text-3xl mb-2">🏢</div>
              <div className="text-lg font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>{name || 'Usuária'}</div>
              <div className="text-xs font-semibold mt-1" style={{ color: '#C9A264' }}>{roleLabels[user?.role || ''] || 'Colaboradora'}</div>
              {companyName && <div className="text-xs mt-0.5" style={{ color: '#8B7355' }}>{companyName}</div>}
            </div>

            {/* Name field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#6B5C4D' }}>Seu Nome</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!editingName}
                  className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    border: '1px solid #e8dfd0',
                    background: editingName ? '#fff' : '#f5f0e8',
                    color: editingName ? '#1A3A6B' : '#8B7355',
                  }}
                />
                <button
                  onClick={() => setEditingName(v => !v)}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    border: '1px solid #e8dfd0',
                    color: '#C9A264',
                    background: editingName ? '#faf7f0' : 'transparent',
                  }}
                >
                  {editingName ? '✓ OK' : '✏️ Editar'}
                </button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#6B5C4D' }}>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ border: '1px solid #e8dfd0', background: '#f5f0e8', color: '#8B7355' }}
              />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              onClick={handleConfirmAndEnter}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-colors"
              style={{ background: '#C9A264', fontFamily: 'Georgia, serif' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Confirmar e Entrar →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
