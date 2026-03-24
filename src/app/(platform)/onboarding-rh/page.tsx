'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OnboardingStatus {
  isNewRH: boolean;
  completedCount: number;
  totalSteps: number;
  steps: {
    profile: boolean;
    departments: boolean;
    invites: boolean;
    challenges: boolean;
    companyProfile: boolean;
  };
}

const STEPS = [
  {
    key: 'departments' as const,
    title: 'Crie departamentos',
    description: 'Organize sua empresa em departamentos',
    href: '/departamentos',
    estimate: '~30s',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
      </svg>
    ),
  },
  {
    key: 'invites' as const,
    title: 'Convide colaboradoras',
    description: 'Envie convites para sua equipe',
    href: '/convites',
    estimate: '~2 min',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    key: 'challenges' as const,
    title: 'Configure seu primeiro desafio',
    description: 'Crie desafios para engajar as colaboradoras',
    href: '/desafios/gerenciar',
    estimate: '~1 min',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    key: 'companyProfile' as const,
    title: 'Personalize sua empresa',
    description: 'Adicione logo, cores e identidade visual',
    href: '/company-profile',
    estimate: '~2 min',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 3.9 2.4-7.4L2 9.4h7.6L12 2z" />
      </svg>
    ),
  },
  {
    key: 'profile' as const,
    title: 'Configure seu perfil',
    description: 'Atualize seu nome e informações pessoais',
    href: '/configuracoes',
    estimate: '~1 min',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function OnboardingRHPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading } = useSWR<OnboardingStatus>('/api/rh/onboarding-status', fetcher, {
    revalidateOnFocus: false,
  });

  if (user?.role !== 'rh') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-uni-text-400">
        Acesso restrito ao RH.
      </div>
    );
  }

  const steps = data?.steps;
  const completedCount = data?.completedCount ?? 0;
  const totalSteps = data?.totalSteps ?? 5;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 3.9 2.4-7.4L2 9.4h7.6L12 2z" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-uni-text-900">
          Bem-vinda ao UniHER!
        </h1>
        <p className="text-sm text-uni-text-500 max-w-md mx-auto">
          Complete os passos abaixo para configurar sua empresa e começar a engajar suas colaboradoras.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-border-1 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-uni-text-700">Progresso</span>
          <span className="text-sm font-bold text-rose-600">{completedCount}/{totalSteps} completos</span>
        </div>
        <div className="h-3 rounded-full bg-cream-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {completedCount === totalSteps && (
          <p className="text-sm text-emerald-600 font-semibold text-center">
            Parabéns! Configuração completa. Sua empresa está pronta!
          </p>
        )}
      </div>

      {/* Steps */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-3 text-sm text-uni-text-400">
          <span className="inline-block w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          Carregando...
        </div>
      ) : (
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = steps?.[step.key] ?? false;
            return (
              <button
                key={step.key}
                onClick={() => router.push(step.href)}
                className={cn(
                  'w-full text-left bg-white rounded-xl border p-5 flex items-center gap-4 transition-all duration-200 group',
                  done
                    ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-sm'
                    : 'border-border-1 hover:border-rose-200 hover:shadow-md hover:-translate-y-0.5'
                )}
              >
                {/* Step Number / Check */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                  done
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
                )}>
                  {done ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-uni-text-300">PASSO {i + 1}</span>
                    <span className="text-[10px] text-uni-text-400">{step.estimate}</span>
                    {done && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                        Concluído
                      </span>
                    )}
                    {i === 0 && !done && (
                      <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full animate-pulse">
                        Comece aqui &rarr;
                      </span>
                    )}
                  </div>
                  <h3 className={cn(
                    'text-sm font-bold mt-0.5',
                    done ? 'text-uni-text-500 line-through' : 'text-uni-text-900'
                  )}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-uni-text-400 mt-0.5">{step.description}</p>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-uni-text-300 flex-shrink-0 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {/* Skip to Dashboard */}
      <div className="text-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-uni-text-400 hover:text-uni-text-600 font-semibold transition-colors"
        >
          Pular e ir para o Dashboard
        </button>
      </div>
    </div>
  );
}
