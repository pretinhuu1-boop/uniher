'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import s from './auth.module.css';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const resetFields = () => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPw(false);
  };

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    resetFields();
    setTab(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulated delay
    await new Promise((r) => setTimeout(r, 800));
    // Redirect based on stored role (set from welcome page)
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('uniher-role') : null;
    if (storedRole === 'colaboradora') {
      router.push('/colaboradora');
    } else if (storedRole === 'lideranca') {
      router.push('/dashboard');
    } else if (storedRole === 'rh') {
      router.push('/dashboard');
    } else {
      router.push('/welcome');
    }
  };

  return (
    <main className={s.page}>
      <div className={s.card}>
        {/* ── Logo ── */}
        <div className={s.logo}>
          <svg
            className={s.logoIcon}
            width="56"
            height="56"
            viewBox="0 0 36 36"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z"
              fill="#F9EEF3"
              stroke="#C85C7E"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z"
              fill="#EAB8CB"
              stroke="#C85C7E"
              strokeWidth="0.9"
            />
            <circle cx="18" cy="6" r="1.5" fill="#B8922A" />
          </svg>
          <span className={s.logoText}>
            Uni<span className={s.logoAccent}>HER</span>
          </span>
        </div>

        {/* ── Tabs ── */}
        <div className={s.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'login'}
            className={`${s.tab} ${tab === 'login' ? s.tabActive : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Entrar
          </button>
          <button
            role="tab"
            aria-selected={tab === 'register'}
            className={`${s.tab} ${tab === 'register' ? s.tabActive : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Criar conta
          </button>
        </div>

        {/* ── Form ── */}
        <form className={s.form} onSubmit={handleSubmit}>
          {/* Name (register only) */}
          {tab === 'register' && (
            <div className={s.field}>
              <label className={s.label} htmlFor="auth-name">
                Nome Completo
              </label>
              <input
                id="auth-name"
                className={s.input}
                type="text"
                placeholder="Seu nome completo"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          {/* Email */}
          <div className={s.field}>
            <label className={s.label} htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className={s.input}
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className={s.field}>
            <label className={s.label} htmlFor="auth-pw">
              Senha
            </label>
            <div className={s.inputWrap}>
              <input
                id="auth-pw"
                className={s.input}
                type={showPw ? 'text' : 'password'}
                placeholder="********"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className={s.togglePw}
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPw ? (
                  /* Eye-off icon */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot password (login only) */}
          {tab === 'login' && (
            <div className={s.forgot}>
              <button
                type="button"
                className={s.forgotLink}
                onClick={() => {
                  setForgotMsg(true);
                  setTimeout(() => setForgotMsg(false), 3000);
                }}
              >
                Esqueceu sua senha?
              </button>
              {forgotMsg && (
                <p style={{ color: '#2a7d4f', fontSize: '0.82rem', marginTop: 6 }}>
                  Link de recuperacao enviado para seu email!
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className={s.submit} disabled={loading}>
            {loading && <span className={s.spinner} />}
            {tab === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* ── Social note ── */}
        <div className={s.socialNote}>
          <span className={s.socialDot} />
          Login social em breve disponivel
          <span className={s.socialDot} />
        </div>

        {/* ── Switch link ── */}
        <p className={s.switchRow}>
          {tab === 'login' ? (
            <>
              Nao tem conta?{' '}
              <button
                type="button"
                className={s.switchLink}
                onClick={() => switchTab('register')}
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Ja tem conta?{' '}
              <button
                type="button"
                className={s.switchLink}
                onClick={() => switchTab('login')}
              >
                Faca login
              </button>
            </>
          )}
        </p>
        <p className={s.switchRow} style={{ marginTop: 8 }}>
          <a href="/" className={s.switchLink}>← Voltar para o inicio</a>
        </p>
      </div>
    </main>
  );
}
