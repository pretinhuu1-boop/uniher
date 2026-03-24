'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const rules = [
    { label: '8+ caracteres', ok: form.newPassword.length >= 8 },
    { label: '1 maiúscula', ok: /[A-Z]/.test(form.newPassword) },
    { label: '1 minúscula', ok: /[a-z]/.test(form.newPassword) },
    { label: '1 número', ok: /[0-9]/.test(form.newPassword) },
    { label: '1 especial (!@#$%&*)', ok: /[!@#$%&*]/.test(form.newPassword) },
  ];

  async function handleSubmit() {
    if (form.newPassword !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (rules.some(r => !r.ok)) { setError('A senha não atende todos os requisitos'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: form.newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      router.push('/dashboard');
    } else {
      setError(data.error || 'Erro ao trocar senha');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔐</div>
          <h1 className="text-2xl font-display font-bold text-uni-text-900">Primeiro Acesso</h1>
          <p className="text-sm text-uni-text-500">Por segurança, crie uma senha pessoal antes de continuar.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Nova Senha *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Crie sua nova senha"
                className="w-full border border-border-1 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-rose-400 font-mono"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 text-xs"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Confirmar Senha *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repita a nova senha"
                className="w-full border border-border-1 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-rose-400 font-mono"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 text-xs"
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Rules checklist */}
          <div className="grid grid-cols-2 gap-1.5">
            {rules.map(r => (
              <div key={r.label} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${r.ok ? 'text-uni-green' : 'text-uni-text-400'}`}>
                <span>{r.ok ? '✓' : '○'}</span>
                <span>{r.label}</span>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || rules.some(r => !r.ok) || !form.confirm}
            className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : 'Definir minha senha'}
          </button>
        </div>
      </div>
    </div>
  );
}
