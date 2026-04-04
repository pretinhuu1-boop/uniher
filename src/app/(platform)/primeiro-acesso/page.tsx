'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/platform';

type Step = 'password' | 'tour' | 'welcome';

type TourSlide = {
  title: string;
  description: string;
  bullets: string[];
  note: string;
};

const TOUR_BY_ROLE: Record<UserRole, TourSlide[]> = {
  admin: [
    {
      title: 'Visao global da operacao',
      description: 'O painel master concentra empresas, acessos administrativos e a camada global da plataforma.',
      bullets: [
        'acompanhar empresas e administradores',
        'controlar acessos de maior alcance',
        'validar operacao da plataforma em nivel geral',
      ],
      note: 'Este perfil atua no escopo global da UniHER.',
    },
    {
      title: 'Comunicacao e governanca',
      description: 'Os modulos administrativos permitem organizar alertas, usuarios e configuracoes com rastreabilidade.',
      bullets: [
        'gerenciar cadastros e permissoes',
        'acompanhar configuracoes principais',
        'orientar a operacao das empresas',
      ],
      note: 'As acoes mais sensiveis ficam reservadas ao admin master.',
    },
    {
      title: 'Experiencia final do produto',
      description: 'Mesmo em perfil master, o objetivo e validar a jornada completa da plataforma para empresa e colaboradora.',
      bullets: [
        'conteudo diario e gamificacao',
        'uso continuo no mobile',
        'comunicacao segmentada por empresa e perfil',
      ],
      note: 'Ao concluir, voce segue para o painel principal.',
    },
  ],
  rh: [
    {
      title: 'Painel da empresa',
      description: 'Aqui voce acompanha a operacao da sua empresa e acessa rapidamente os modulos do dia a dia.',
      bullets: [
        'usuarios, convites e departamentos',
        'campanhas, desafios e objetivos',
        'resumo rapido para reunioes e acompanhamento',
      ],
      note: 'Este perfil opera apenas o escopo da propria empresa.',
    },
    {
      title: 'Licoes e conteudo',
      description: 'As licoes podem ser montadas com fluxo guiado, agendamento e validacao antes da publicacao.',
      bullets: [
        'escolher tipo, tema e agendamento',
        'editar ou validar antes da data',
        'organizar a experiencia da colaboradora com clareza',
      ],
      note: 'O editor foi pensado para uso simples, inclusive no mobile.',
    },
    {
      title: 'Comunicacao com colaboradoras',
      description: 'Voce pode orientar a rotina com alertas, campanhas e notificacoes do proprio escopo.',
      bullets: [
        'comunicacao por publico permitido',
        'acoes de engajamento e reforco',
        'alinhamento entre conteudo e operacao',
      ],
      note: 'A ideia e facilitar o uso real, nao apenas exibir informacoes.',
    },
    {
      title: 'Jornada da colaboradora',
      description: 'A experiencia final combina conteudo, interacao e recorrencia de uso no celular.',
      bullets: [
        'painel com missoes, licoes e notificacoes',
        'gamificacao com pontos, streak e recompensas',
        'uso recorrente e instalacao como PWA',
      ],
      note: 'Ao concluir, voce confirma seus dados e entra na plataforma.',
    },
  ],
  lideranca: [
    {
      title: 'Visao de acompanhamento',
      description: 'A lideranca acessa indicadores e acompanha a rotina da equipe dentro do escopo permitido.',
      bullets: [
        'monitorar andamento das acoes',
        'acompanhar comunicacoes e engajamento',
        'manter visao objetiva da jornada da equipe',
      ],
      note: 'O foco e acompanhamento, nao administracao global.',
    },
    {
      title: 'Fluxo da colaboradora',
      description: 'A plataforma foi desenhada para incentivar recorrencia e clareza de uso.',
      bullets: [
        'conteudo diario e desafios',
        'engajamento com feedback visual',
        'experiencia consistente no mobile',
      ],
      note: 'Ao concluir, voce confirma seus dados e segue para o painel.',
    },
  ],
  colaboradora: [
    {
      title: 'Sua rotina na plataforma',
      description: 'A UniHER organiza conteudo, interacao e lembretes em uma experiencia simples para o dia a dia.',
      bullets: [
        'licoes e conteudos diarios',
        'notificacoes, desafios e orientacoes',
        'acompanhamento da propria jornada',
      ],
      note: 'O objetivo e tornar o uso leve, recorrente e claro.',
    },
    {
      title: 'Engajamento continuo',
      description: 'A plataforma usa elementos de progresso para estimular constancia sem perder simplicidade.',
      bullets: [
        'pontos, streak e feedback visual',
        'tarefas objetivas e navegacao simples',
        'experiencia pensada para celular',
      ],
      note: 'Ao concluir, voce confirma seus dados e entra na plataforma.',
    },
  ],
};

function getRoleLabel(role?: UserRole) {
  switch (role) {
    case 'admin':
      return 'Admin Master';
    case 'rh':
      return 'Admin Empresa';
    case 'lideranca':
      return 'Lideranca';
    default:
      return 'Colaboradora';
  }
}

function getLandingPath(role?: UserRole) {
  if (role === 'admin') return '/admin';
  if (role === 'rh' || role === 'lideranca') return '/dashboard';
  return '/colaboradora';
}

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('password');
  const [tourIndex, setTourIndex] = useState(0);
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passForm, setPassForm] = useState({ newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);

  const activeRole = (user?.role || 'colaboradora') as UserRole;
  const tourSlides = useMemo(() => TOUR_BY_ROLE[activeRole] || TOUR_BY_ROLE.colaboradora, [activeRole]);
  const activeSlide = tourSlides[tourIndex];

  const rules = [
    { label: '8+ caracteres', ok: passForm.newPassword.length >= 8 },
    { label: '1 maiuscula', ok: /[A-Z]/.test(passForm.newPassword) },
    { label: '1 minuscula', ok: /[a-z]/.test(passForm.newPassword) },
    { label: '1 numero', ok: /[0-9]/.test(passForm.newPassword) },
    { label: '1 especial (!@#$%&*)', ok: /[!@#$%&*]/.test(passForm.newPassword) },
  ];

  useEffect(() => {
    if (!user) return;

    setName(user.name || '');

    if (user.mustChangePassword === true) {
      setStep('password');
      return;
    }

    if (user.firstAccessTourCompleted === false) {
      setStep('tour');
      return;
    }

    setStep('welcome');
  }, [user]);

  async function markTourAsCompleted() {
    const response = await fetch('/api/users/me/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: {
          first_access_tour_completed: '1',
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success !== true) {
      throw new Error(data?.error || 'Nao foi possivel concluir a apresentacao guiada.');
    }

    await refreshUser?.();
  }

  async function handlePasswordChange() {
    if (passForm.newPassword !== passForm.confirm) {
      setError('As senhas nao coincidem.');
      return;
    }

    if (rules.some((rule) => !rule.ok)) {
      setError('A senha nao atende todos os requisitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passForm.newPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(data?.error || 'Erro ao trocar senha.');
        return;
      }

      const refreshed = await refreshUser?.();
      setTourIndex(0);
      setStep(refreshed?.firstAccessTourCompleted === false ? 'tour' : 'welcome');
    } catch {
      setError('Nao foi possivel atualizar a senha agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTourAdvance() {
    setError('');

    if (tourIndex < tourSlides.length - 1) {
      setTourIndex((current) => current + 1);
      return;
    }

    setLoading(true);
    try {
      await markTourAsCompleted();
      setStep('welcome');
    } catch (tourError) {
      setError(tourError instanceof Error ? tourError.message : 'Nao foi possivel concluir a apresentacao guiada.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTourSkip() {
    setLoading(true);
    setError('');

    try {
      await markTourAsCompleted();
      setStep('welcome');
    } catch (tourError) {
      setError(tourError instanceof Error ? tourError.message : 'Nao foi possivel pular a apresentacao guiada.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAndEnter() {
    setLoading(true);
    setError('');

    try {
      if (name.trim() && name.trim() !== user?.name) {
        const updateResponse = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
        const updateData = await updateResponse.json().catch(() => null);

        if (!updateResponse.ok) {
          setError(updateData?.error || 'Erro ao atualizar nome.');
          return;
        }
      }

      if (user?.firstAccessTourCompleted === false) {
        await markTourAsCompleted();
      }

      const confirmResponse = await fetch('/api/auth/confirm-first-access', { method: 'POST' });
      const confirmData = await confirmResponse.json().catch(() => null);

      if (!confirmResponse.ok || confirmData?.success !== true) {
        setError(confirmData?.error || 'Erro ao confirmar acesso. Tente novamente.');
        return;
      }

      await refreshUser?.();
      window.location.assign(getLandingPath(user?.role as UserRole));
    } catch {
      setError('Nao foi possivel concluir seu primeiro acesso agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const companyName = (user as { companyName?: string } | null)?.companyName || '';
  const roleLabel = getRoleLabel(activeRole);
  const progressPercent = Math.round(((tourIndex + 1) / tourSlides.length) * 100);
  const wideLayout = step === 'tour';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: '#FAF7F2' }}>
      <div
        className={`bg-white rounded-[28px] border w-full ${wideLayout ? 'max-w-5xl' : 'max-w-md'} transition-all duration-300`}
        style={{ borderColor: '#f0e8d8', boxShadow: '0 20px 60px rgba(201,162,100,0.12)' }}
      >
        <div className={`grid ${wideLayout ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'grid-cols-1'}`}>
          <div
            className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r"
            style={{ borderColor: '#f0e8d8', background: wideLayout ? 'linear-gradient(180deg, #fffaf2 0%, #ffffff 100%)' : '#ffffff' }}
          >
            <Image
              src="/logo-uniher.png"
              alt="UniHER"
              width={132}
              height={110}
              priority
              className="object-contain"
              style={{ width: 132, height: 'auto' }}
            />

            <div className="mt-8 space-y-4">
              <span
                className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: '#B4822E', background: '#F9F1E3' }}
              >
                Primeiro acesso
              </span>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                  {step === 'password' && 'Seguranca inicial da sua conta'}
                  {step === 'tour' && 'Conheca a experiencia da plataforma'}
                  {step === 'welcome' && 'Seu ambiente esta pronto'}
                </h1>
                <p className="text-sm sm:text-base leading-7" style={{ color: '#7A6854' }}>
                  {step === 'password' &&
                    'Antes de entrar, defina uma senha pessoal. Em seguida, voce passa por um tour guiado rapido para entender a estrutura da UniHER.'}
                  {step === 'tour' &&
                    'Este tour apresenta os principais pontos da jornada de uso, de forma objetiva, para que sua primeira entrada na plataforma faca sentido desde o inicio.'}
                  {step === 'welcome' &&
                    'Confira seus dados finais e entre na plataforma com clareza sobre o que esta disponivel para o seu perfil.'}
                </p>
              </div>
            </div>

            <div
              className="mt-8 rounded-[24px] border p-5 space-y-3"
              style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8B7355' }}>
                Perfil de acesso
              </div>
              <div>
                <div className="text-xl font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                  {name || user?.name || 'Usuaria'}
                </div>
                <div className="text-sm font-semibold mt-1" style={{ color: '#C9A264' }}>
                  {roleLabel}
                </div>
                {companyName && (
                  <div className="text-sm mt-1" style={{ color: '#8B7355' }}>
                    {companyName}
                  </div>
                )}
              </div>

              <div className="pt-2 text-sm leading-6" style={{ color: '#7A6854' }}>
                {step === 'tour' && `Etapa ${tourIndex + 1} de ${tourSlides.length} do tour guiado.`}
                {step !== 'tour' && 'Fluxo pensado para orientar a primeira entrada com seguranca e contexto.'}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {step === 'password' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                    Definir senha pessoal
                  </h2>
                  <p className="text-sm leading-6" style={{ color: '#8B7355' }}>
                    Use uma senha forte para proteger sua conta e liberar o restante da jornada.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passForm.newPassword}
                      onChange={(e) => setPassForm((current) => ({ ...current, newPassword: e.target.value }))}
                      placeholder="Crie sua nova senha"
                      className="w-full rounded-xl px-4 py-3 pr-24 text-sm font-mono outline-none"
                      style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                      style={{ color: '#8B7355' }}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>
                    Confirmar Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passForm.confirm}
                    onChange={(e) => setPassForm((current) => ({ ...current, confirm: e.target.value }))}
                    placeholder="Repita a nova senha"
                    className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none"
                    style={{ border: '1px solid #e8dfd0', background: '#faf7f2' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.label}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium"
                      style={{
                        color: rule.ok ? '#166534' : '#8B7355',
                        background: rule.ok ? '#edfdf3' : '#f9f4eb',
                        border: `1px solid ${rule.ok ? '#bbf7d0' : '#f0e8d8'}`,
                      }}
                    >
                      <span>{rule.ok ? 'OK' : 'o'}</span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                <button
                  onClick={handlePasswordChange}
                  disabled={loading || rules.some((rule) => !rule.ok) || !passForm.confirm}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ background: '#C9A264', fontFamily: 'Georgia, serif' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    'Salvar e continuar'
                  )}
                </button>
              </div>
            )}

            {step === 'tour' && activeSlide && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8B7355' }}>
                      Tour guiado
                    </div>
                    <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                      {activeSlide.title}
                    </h2>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#B4822E' }}>
                    Etapa {tourIndex + 1} / {tourSlides.length}
                  </div>
                </div>

                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f2eadc' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #d8b06a 0%, #c08d39 100%)' }}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div
                    className="rounded-[24px] border p-6 space-y-4"
                    style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}
                  >
                    <p className="text-base leading-7" style={{ color: '#6F604F' }}>
                      {activeSlide.description}
                    </p>

                    <div className="grid gap-3">
                      {activeSlide.bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="rounded-2xl border px-4 py-3 text-sm font-medium"
                          style={{ borderColor: '#efe5d6', background: '#ffffff', color: '#30486B' }}
                        >
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-[24px] border p-6 flex flex-col justify-between"
                    style={{ borderColor: '#f0e8d8', background: '#faf7f0' }}
                  >
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8B7355' }}>
                        Observacao
                      </div>
                      <p className="mt-3 text-sm leading-7" style={{ color: '#6F604F' }}>
                        {activeSlide.note}
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8B7355' }}>
                        Ao concluir
                      </div>
                      <p className="text-sm leading-7" style={{ color: '#6F604F' }}>
                        Voce confirma seus dados finais e entra no ambiente principal com o fluxo inicial concluido.
                      </p>
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTourSkip}
                    disabled={loading}
                    className="px-4 py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ border: '1px solid #eadfce', color: '#8B7355', background: '#fff' }}
                  >
                    Pular tour
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setTourIndex((current) => Math.max(0, current - 1));
                      }}
                      disabled={loading || tourIndex === 0}
                      className="px-5 py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{ border: '1px solid #eadfce', color: '#1A3A6B', background: '#fff' }}
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleTourAdvance}
                      disabled={loading}
                      className="px-5 py-3 rounded-2xl text-white text-sm font-bold transition-colors disabled:opacity-50"
                      style={{ background: '#C9A264' }}
                    >
                      {loading ? 'Salvando...' : tourIndex === tourSlides.length - 1 ? 'Ir para confirmacao' : 'Continuar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'welcome' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#1A3A6B' }}>
                    Confirmacao final
                  </h2>
                  <p className="text-sm leading-6" style={{ color: '#8B7355' }}>
                    Revise seus dados e conclua a entrada no ambiente principal da plataforma.
                  </p>
                </div>

                <div
                  className="rounded-[24px] p-5 border"
                  style={{ background: '#faf7f0', borderColor: '#f0e8d8' }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8B7355' }}>
                    Pronto para entrar
                  </div>
                  <div className="mt-4 space-y-2 text-sm leading-7" style={{ color: '#6F604F' }}>
                    <div>Perfil configurado: {roleLabel}</div>
                    <div>Conta protegida com senha pessoal.</div>
                    <div>Tour inicial concluido para este usuario.</div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>
                    Seu Nome
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!editingName}
                      className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                      style={{
                        border: '1px solid #e8dfd0',
                        background: editingName ? '#fff' : '#f5f0e8',
                        color: editingName ? '#1A3A6B' : '#8B7355',
                      }}
                    />
                    <button
                      onClick={() => setEditingName((current) => !current)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                      style={{
                        border: '1px solid #e8dfd0',
                        color: '#C9A264',
                        background: editingName ? '#faf7f0' : 'transparent',
                      }}
                    >
                      {editingName ? 'Salvar nome' : 'Editar'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6B5C4D' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{ border: '1px solid #e8dfd0', background: '#f5f0e8', color: '#8B7355' }}
                  />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                <button
                  onClick={handleConfirmAndEnter}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-colors"
                  style={{ background: '#C9A264', fontFamily: 'Georgia, serif' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    'Entrar na plataforma'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push(getLandingPath(activeRole))}
                  className="w-full py-3 rounded-2xl text-sm font-semibold transition-colors"
                  style={{ border: '1px solid #eadfce', color: '#1A3A6B', background: '#fff' }}
                >
                  Ir direto para o painel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
