'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Eye, EyeOff, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/hooks/useAuth';
import {
  COMPANY_MODULE_DEFINITIONS,
  type CompanyModuleNavigationRecord,
  type CompanyModuleSlug,
  type CompanyModuleState,
} from '@/types/modules';

type CompanyModulesResponse = {
  modules: CompanyModuleNavigationRecord[];
};

const SENSITIVE_MODULE_SLUGS: readonly CompanyModuleSlug[] = [
  'primary_health',
  'concierge',
  'nr1',
  'sipat',
  'human_development',
  'denunciation',
];

const STATE_LABELS: Record<CompanyModuleState, string> = {
  enabled: 'Ativo',
  locked: 'Bloqueado',
  coming_soon: 'Planejado',
  partner_managed: 'Parceiro',
  requires_contract: 'Aguardando liberacao',
};

const STATE_HELP: Record<CompanyModuleState, string> = {
  enabled: 'Disponivel para os perfis autorizados quando tambem esta visivel no menu.',
  locked: 'Produto indisponivel no momento, sem liberar fluxo operacional.',
  coming_soon: 'Planejado para ativacao futura, sem liberar comportamento operacional.',
  partner_managed: 'Atendimento conduzido com parceiro autorizado fora da operacao direta UniHER.',
  requires_contract: 'Aguardando liberacao operacional aprovada antes de ativar.',
};

const NON_SENSITIVE_EDITABLE_STATES: readonly CompanyModuleState[] = [
  'enabled',
  'locked',
  'coming_soon',
  'requires_contract',
];

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel carregar os modulos.');
  return payload as T;
}

function isSensitiveModule(slug: CompanyModuleSlug): boolean {
  return SENSITIVE_MODULE_SLUGS.includes(slug);
}

function getDefinition(slug: CompanyModuleSlug) {
  return COMPANY_MODULE_DEFINITIONS.find((definition) => definition.slug === slug);
}

function stateTone(state: CompanyModuleState): string {
  if (state === 'enabled') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (state === 'partner_managed') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (state === 'requires_contract') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-[var(--platform-line)] bg-[var(--platform-group)] text-[var(--platform-ink)]';
}

export default function ProdutosModulosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const modulesCacheKey = user?.companyId ? '/api/company/modules' : null;
  const { data, error, isLoading, mutate } = useSWR<CompanyModulesResponse>(modulesCacheKey, fetcher);
  const [updatingSlug, setUpdatingSlug] = useState<CompanyModuleSlug | null>(null);
  const [notice, setNotice] = useState('');

  const modules = useMemo(() => data?.modules ?? [], [data?.modules]);
  const enabledCount = modules.filter((module) => !isSensitiveModule(module.module_slug) && module.module_state === 'enabled' && module.visible === 1).length;
  const holdCount = modules.filter((module) => isSensitiveModule(module.module_slug)).length;
  const canEditNonSensitiveModules = user?.isMasterAdmin === true && user?.role === 'admin' && Boolean(user.companyId);

  async function updateModuleState(moduleSlug: CompanyModuleSlug, moduleState: CompanyModuleState) {
    if (!user?.companyId || updatingSlug) return;
    setUpdatingSlug(moduleSlug);
    setNotice('');

    try {
      const response = await fetch('/api/company/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: user.companyId,
          module_slug: moduleSlug,
          module_state: moduleState,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Nao foi possivel atualizar o modulo.');
      setNotice('Estado atualizado com auditoria.');
      await mutate();
    } catch (updateError) {
      setNotice(updateError instanceof Error ? updateError.message : 'Nao foi possivel atualizar o modulo.');
    } finally {
      setUpdatingSlug(null);
    }
  }

  if (authLoading || isLoading) {
    return <FeedbackState kind="loading" title="Carregando produtos" description="Buscando a disponibilidade da empresa autenticada." />;
  }

  if (!user?.companyId) {
    return <FeedbackState kind="denied" title="Empresa nao encontrada" description="Esta superficie depende de um escopo de empresa autenticado." />;
  }

  if (error) {
    return (
      <FeedbackState
        kind="error"
        title="Nao foi possivel carregar os modulos"
        description={error instanceof Error ? error.message : 'Tente novamente em instantes.'}
        action={(
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--platform-line)] bg-[var(--platform-surface)] px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        )}
      />
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--platform-muted)]">Disponibilidade dos produtos</p>
            <h1 className="text-2xl font-semibold text-[var(--platform-ink)]">Produtos e Modulos</h1>
            <p className="text-sm leading-6 text-[var(--platform-muted)]">
              Acompanhe quais produtos estao disponiveis para a empresa atual. Produtos protegidos permanecem indisponiveis ate
              existir uma liberacao aprovada e uma fonte operacional validada.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-lg border border-[var(--platform-line)] bg-[var(--platform-group)] px-3 py-3">
              <p className="text-xl font-semibold text-[var(--platform-ink)]">{modules.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--platform-muted)]">Catalogo</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="text-xl font-semibold text-emerald-800">{enabledCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Ativos seguros</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-xl font-semibold text-amber-800">{holdCount}</p>
              <p className="text-[10px] font-semibold uppercase leading-4 text-amber-700">Protegidos</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Guardrails de ativacao">
        <div className="rounded-lg border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4">
          <ShieldCheck className="mb-3 text-emerald-700" size={20} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--platform-ink)]">Produtos configuraveis</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--platform-muted)]">Educacao e Conquistas podem mudar estado por Master Admin.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <LockKeyhole className="mb-3 text-amber-800" size={20} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-amber-950">Produtos protegidos</h2>
          <p className="mt-1 text-xs leading-5 text-amber-800">NR-1, SIPAT, Concierge, Denuncias, DH e Saude Primaria nao sao ativados por esta tela.</p>
        </div>
        <div className="rounded-lg border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4">
          <Eye className="mb-3 text-[var(--platform-muted)]" size={20} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--platform-ink)]">Menu nao libera operacao</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--platform-muted)]">Menu visivel nao libera execucao operacional, avaliacao automatica, recebimento de relatos ou dados sensiveis.</p>
        </div>
        <div className="rounded-lg border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4">
          <ShieldAlert className="mb-3 text-[var(--platform-muted)]" size={20} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--platform-ink)]">Registro das mudancas</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--platform-muted)]">Mudancas validas passam por verificacao de acesso e ficam registradas.</p>
        </div>
      </section>

      {notice && (
        <p className="rounded-lg border border-[var(--platform-line)] bg-[var(--platform-group)] px-4 py-3 text-sm font-medium text-[var(--platform-ink)]" role="status">
          {notice}
        </p>
      )}

      <section className="grid gap-3" aria-label="Lista de modulos da empresa">
        {modules.map((module) => {
          const definition = getDefinition(module.module_slug);
          const sensitive = isSensitiveModule(module.module_slug);
          const visible = module.visible === 1;
          const editable = canEditNonSensitiveModules && !sensitive;
          const updating = updatingSlug === module.module_slug;

          return (
            <article
              key={module.module_slug}
              className="grid gap-4 rounded-lg border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_180px]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--platform-ink)]">{definition?.label ?? module.module_slug}</h2>
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${sensitive ? 'border-amber-200 bg-amber-50 text-amber-800' : stateTone(module.module_state)}`}>
                    {sensitive ? 'Aguardando liberacao' : STATE_LABELS[module.module_state]}
                  </span>
                  {sensitive && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      Protegido
                    </span>
                  )}
                </div>
                <p className="text-sm leading-6 text-[var(--platform-muted)]">
                  {sensitive
                    ? `Produto protegido nesta tela. Status atual: ${STATE_LABELS[module.module_state]}. A visualizacao no menu nao libera atendimento, avaliacao, recebimento de relatos ou dados sensiveis.`
                    : STATE_HELP[module.module_state]}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-[var(--platform-muted)]">
                {visible ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
                <span>{visible ? 'Visivel na navegacao elegivel' : 'Oculto da navegacao'}</span>
              </div>

              {editable ? (
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--platform-muted)]">
                  Estado
                  <select
                    value={module.module_state}
                    disabled={updating}
                    onChange={(event) => updateModuleState(module.module_slug, event.target.value as CompanyModuleState)}
                    className="h-10 rounded-lg border border-[var(--platform-line)] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[var(--platform-ink)]"
                  >
                    {NON_SENSITIVE_EDITABLE_STATES.map((state) => (
                      <option key={state} value={state}>{STATE_LABELS[state]}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--platform-line)] bg-[var(--platform-group)] px-3 py-2 text-sm font-semibold text-[var(--platform-muted)]">
                  {updating ? <Clock3 size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
                  {sensitive ? 'Alteracao bloqueada' : 'Somente leitura'}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="rounded-[var(--platform-radius-surface)] border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <CheckCircle2 className="mt-0.5 text-amber-800" size={20} aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-amber-950">Como esta tela atua</h2>
            <p className="text-sm leading-6 text-amber-900">
              Esta tela nao altera permissoes de usuario e nao ativa produto protegido. Ela mostra a disponibilidade atual
              dos produtos e permite mudancas apenas nos produtos configuraveis quando o usuario e Master Admin.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
