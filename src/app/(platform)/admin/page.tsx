'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string;
  sector: string | null;
  plan: string;
  contact_name: string | null;
  contact_email: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: number;
  created_at: string;
  user_count: number;
  department_count: number;
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  points: number;
  blocked: number;
  department_name: string | null;
  created_at: string;
}

interface AllUser extends CompanyUser {
  company_name: string | null;
  company_id: string | null;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: string;
  holder_count: number;
  created_at: string;
}

interface SystemStats {
  companies: number;
  users: number;
  challenges: number;
  badges: number;
  campaigns: number;
  notifications: number;
  db_size_kb: number;
  uptime_seconds: number;
  applied_migrations: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-rose-100 text-rose-700',
  pro: 'bg-amber-100 text-amber-700',
  basic: 'bg-gray-100 text-gray-600',
  trial: 'bg-blue-100 text-blue-600',
};

const ROLE_LABELS: Record<string, string> = {
  rh: 'Admin Empresa',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
  admin: 'Admin Master',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-100 text-gray-600',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
};

const TABS = ['Visão Geral', 'Empresas', 'Usuários', 'Admin Master', 'Badges', 'Sistema', 'Alertas', 'Auditoria'] as const;
type Tab = (typeof TABS)[number];

// ─── Shared Components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border-1 p-5 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400">{label}</span>
      <span className={cn('text-2xl font-display font-bold', accent ?? 'text-uni-text-900')}>{value}</span>
      {sub && <span className="text-[11px] text-uni-text-500">{sub}</span>}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin',
        className
      )}
    />
  );
}

function TabButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5',
        active
          ? 'bg-rose-500 text-white shadow-sm'
          : 'text-uni-text-600 hover:bg-cream-100 hover:text-uni-text-900'
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none',
          active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b border-border-1 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-display font-bold text-uni-text-900">{title}</h2>
        {count !== undefined && (
          <span className="text-xs bg-cream-100 text-uni-text-500 px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: sysData } = useSWR<SystemStats>('/api/admin/system', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: companiesData, isLoading } = useSWR<{ companies: Company[] }>(
    '/api/admin/companies',
    fetcher,
    { revalidateOnFocus: false }
  );

  const companies = companiesData?.companies ?? [];
  const recentCompanies = [...companies].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Empresas" value={sysData?.companies ?? companies.length} sub="cadastradas" />
        <StatCard label="Usuárias" value={sysData?.users ?? '—'} sub="total na plataforma" />
        <StatCard
          label="Campanhas Ativas"
          value={sysData?.campaigns ?? '—'}
          sub="em andamento"
          accent="text-emerald-600"
        />
        <StatCard
          label="Banco de Dados"
          value={sysData ? `${sysData.db_size_kb} KB` : '—'}
          sub="tamanho do arquivo"
        />
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader title="Empresas Recentes" count={recentCompanies.length} />
        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando...
          </div>
        ) : recentCompanies.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="text-4xl block">🏢</span>
            <p className="text-uni-text-700 font-medium text-sm">Nenhuma empresa cadastrada</p>
            <p className="text-xs text-uni-text-400">As empresas recentes aparecerão aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {recentCompanies.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-cream-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-[11px] font-bold text-rose-700 flex-shrink-0">
                  {(c.trade_name || c.name).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-uni-text-900 truncate">{c.trade_name || c.name}</div>
                  <div className="text-[11px] text-uni-text-400">{c.user_count} usuárias</div>
                </div>
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
                    PLAN_COLORS[c.plan] ?? 'bg-gray-100 text-gray-600'
                  )}
                >
                  {c.plan}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompanyUsersPanel({ companyId, onGoToUsers }: { companyId: string; onGoToUsers?: () => void }) {
  const { data, mutate } = useSWR<{ users: CompanyUser[] }>(
    `/api/admin/companies/${companyId}/users`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState<{ userId: string; pass: string } | null>(null);

  const users = data?.users ?? [];

  async function doAction(userId: string, action: string, extra?: Record<string, string>) {
    setLoading(`${userId}-${action}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (action === 'reset_password' && json.tempPassword) {
        setTempPass({ userId, pass: json.tempPassword });
      }
      mutate();
    } finally {
      setLoading(null);
    }
  }

  if (!data)
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-uni-text-400">
        <Spinner /> Carregando usu�rios...
      </div>
    );

  if (users.length === 0)
    return (
      <div className="text-center py-10 space-y-3">
        <span className="text-3xl block">👤</span>
        <p className="text-uni-text-700 font-medium text-sm">Nenhum usu�rio nesta empresa</p>
        <p className="text-xs text-uni-text-400">Adicione um Admin Empresa para come�ar.</p>
        {onGoToUsers && (
          <button onClick={onGoToUsers} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#C9A264' }}>
            + Adicionar Admin Empresa
          </button>
        )}
      </div>
    );

  return (
    <div className="border-t border-border-1 bg-cream-50/50">
      {tempPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTempPass(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-border-1 p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-uni-text-900 text-lg">Senha Tempor�ria</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <code className="font-mono text-lg font-bold text-amber-800 break-all flex-1">{tempPass.pass}</code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(tempPass.pass);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all"
                >
                  Copiar Senha
                </button>
              </div>
            </div>
            <p className="text-xs text-red-600 font-semibold flex items-start gap-1.5">
              <span className="flex-shrink-0">&#9888;&#65039;</span>
              Anote esta senha! Ela n�o será mostrada novamente.
            </p>
            <button
              onClick={() => setTempPass(null)}
              className="w-full py-2.5 bg-uni-text-900 text-white rounded-xl text-sm font-bold hover:bg-uni-text-600 transition-all"
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden divide-y divide-border-1">
        {users.map((u) => {
          const isBlocked = u.blocked === 1;
          const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
          const resetKey = `${u.id}-reset_password`;
          return (
            <div key={u.id} className={cn('p-4 space-y-3', isBlocked && 'bg-red-50/40')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-uni-text-900 text-sm">{u.name}</div>
                  <div className="text-[11px] text-uni-text-400 mt-0.5">{u.email}</div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                    isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                  {isBlocked ? 'Bloqueada' : 'Ativa'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-uni-text-500">
                <span className="bg-cream-100 px-2 py-0.5 rounded-full font-bold text-uni-text-600">
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                {u.department_name && <span>{u.department_name}</span>}
                <span>N�vel {u.level}</span>
                <span>{u.points.toLocaleString('pt-BR')} pts</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                  disabled={loading === blockKey}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[11px] font-bold transition-all',
                    isBlocked
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100',
                    loading === blockKey && 'opacity-50 cursor-wait'
                  )}
                >
                  {loading === blockKey ? '...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button
                  onClick={() => doAction(u.id, 'reset_password')}
                  disabled={loading === resetKey}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all',
                    loading === resetKey && 'opacity-50 cursor-wait'
                  )}
                >
                  {loading === resetKey ? '...' : 'Resetar Senha'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-1">
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Usu?ria</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Departamento</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Papel</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">N?vel</th>
              <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Pts</th>
              <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Status</th>
                    <th className="text-right px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">A??es</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-1">
            {users.map((u) => {
              const isBlocked = u.blocked === 1;
              const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
              const resetKey = `${u.id}-reset_password`;
              return (
                <tr key={u.id} className={cn('transition-colors', isBlocked ? 'bg-red-50/40' : 'hover:bg-white')}>
                  <td className="px-6 py-3">
                    <div className="font-medium text-uni-text-900">{u.name}</div>
                    <div className="text-[11px] text-uni-text-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-uni-text-600 text-xs">{u.department_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold bg-cream-100 text-uni-text-600 px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-uni-text-600">{u.level}</td>
                  <td className="px-4 py-3 text-center text-uni-text-600">{u.points.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                        isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                      {isBlocked ? 'Bloqueada' : 'Ativa'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                        disabled={loading === blockKey}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                          isBlocked
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100',
                          loading === blockKey && 'opacity-50 cursor-wait'
                        )}
                      >
                        {loading === blockKey ? '...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button
                        onClick={() => doAction(u.id, 'reset_password')}
                        disabled={loading === resetKey}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all',
                          loading === resetKey && 'opacity-50 cursor-wait'
                        )}
                      >
                        {loading === resetKey ? '...' : 'Resetar Senha'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EMPTY_COMPANY_FORM = { name: '', trade_name: '', cnpj: '', sector: '', plan: 'trial' as 'trial' | 'pro' | 'enterprise', contact_name: '', contact_email: '', contact_phone: '' };

function CompaniesTab({ onGoToUsers }: { onGoToUsers?: () => void } = {}) {
  const { data, isLoading, error, mutate } = useSWR<{ companies: Company[] }>(
    '/api/admin/companies',
    fetcher,
    { revalidateOnFocus: false }
  );
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);
  const [saving, setSaving] = useState(false);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editCompanyForm, setEditCompanyForm] = useState({ name: '', trade_name: '', cnpj: '', sector: '', plan: 'trial', contact_name: '', contact_email: '', contact_phone: '', primary_color: '', secondary_color: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  function startEditCompany(c: Company) {
    setEditingCompany(c.id);
    setEditCompanyForm({
      name: c.name || '', trade_name: c.trade_name || '', cnpj: c.cnpj || '',
      sector: c.sector || '', plan: c.plan || 'trial',
      contact_name: (c as any).contact_name || '', contact_email: (c as any).contact_email || '', contact_phone: (c as any).contact_phone || '',
      primary_color: (c as any).primary_color || '', secondary_color: (c as any).secondary_color || '',
    });
  }

  async function saveEditCompany() {
    if (!editingCompany) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/companies/${editingCompany}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...editCompanyForm }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Empresa atualizada!' });
        setEditingCompany(null);
        mutate();
      } else {
        setFeedback({ type: 'error', msg: json.error || 'Erro ao atualizar' });
      }
    } catch { setFeedback({ type: 'error', msg: 'Erro de conex�o' }); }
    setSavingEdit(false);
  }
  const companies = data?.companies ?? [];

  async function createCompany() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', msg: 'Empresa cadastrada com sucesso!' });
        setShowCreate(false);
        setForm(EMPTY_COMPANY_FORM);
        mutate();
      } else {
        setFeedback({ type: 'error', msg: json.error || 'Erro ao cadastrar' });
      }
    } catch { setFeedback({ type: 'error', msg: 'Erro de conex�o' }); }
    setSaving(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function toggleBlock(company: Company) {
    const action = company.is_active ? 'block' : 'unblock';
    setBlocking(company.id);
    try {
      await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setFeedback({ type: 'success', msg: company.is_active ? 'Empresa suspensa' : 'Empresa reativada' });
      mutate();
    } catch { setFeedback({ type: 'error', msg: 'Erro' }); }
    setBlocking(null);
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={cn('p-3 rounded-xl text-sm font-bold border', feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
          {feedback.msg}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-border-1 p-6 space-y-4">
          <h3 className="font-display font-bold text-uni-text-900">Nova Empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { field: 'name', label: 'Raz�o Social *', placeholder: 'Empresa Ltda.' },
              { field: 'trade_name', label: 'Nome Fantasia', placeholder: 'Empresa' },
              { field: 'cnpj', label: 'CNPJ *', placeholder: '00.000.000/0001-00' },
              { field: 'sector', label: 'Setor', placeholder: 'Tecnologia' },
              { field: 'contact_name', label: 'Contato', placeholder: 'Nome do respons�vel' },
              { field: 'contact_email', label: 'Email contato', placeholder: 'rh@empresa.com' },
              { field: 'contact_phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
            ] as const).map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">{label}</label>
                <input
                  value={form[field as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Plano *</label>
              <select
                value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value as 'trial' | 'pro' | 'enterprise' }))}
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400 bg-white"
              >
                <option value="trial">Trial</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border-1 text-sm font-bold text-uni-text-600 hover:bg-cream-50">Cancelar</button>
            <button onClick={createCompany} disabled={saving || !form.name || !form.cnpj} className="px-6 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Cadastrar Empresa'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Empresas Cadastradas"
          count={companies.length}
          action={
            <button onClick={() => setShowCreate(s => !s)} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all">
              + Nova Empresa
            </button>
          }
        />

        {isLoading && <div className="p-12 flex items-center justify-center gap-3 text-sm text-uni-text-400"><Spinner /> Carregando...</div>}
        {error && <div className="p-8 text-center text-rose-600 text-sm">Erro ao carregar empresas.</div>}
        {!isLoading && !error && companies.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <span className="text-4xl block">🏢</span>
            <p className="text-uni-text-700 font-medium">Nenhuma empresa cadastrada</p>
            <p className="text-sm text-uni-text-400">Crie a primeira empresa para começar a usar a plataforma.</p>
            <button onClick={() => setShowCreate(true)} className="mt-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all">
              + Criar Empresa
            </button>
          </div>
        )}

        {!isLoading && companies.length > 0 && (
          <div>
            {companies.map((company) => {
              const isBlocked = company.is_active === 0;
              return (
                <div key={company.id} className={cn('border-b border-border-1 last:border-b-0', isBlocked && 'bg-red-50/30')}>
                  <div className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 hover:bg-cream-50/50 transition-colors">
                    {/* Company logo or initials */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
                      style={company.primary_color
                        ? { background: company.primary_color + '20', border: `1px solid ${company.primary_color}40`, color: company.primary_color }
                        : { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
                      }
                    >
                      {company.logo_url
                        ? <img src={company.logo_url} alt="" className="w-full h-full object-contain" />
                        : (company.trade_name || company.name).slice(0, 2).toUpperCase()
                      }
                    </div>

                    <div className="w-full flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-uni-text-900 text-sm">{company.trade_name || company.name}</span>
                        {isBlocked && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">SUSPENSA</span>}
                      </div>
                      <div className="text-[11px] text-uni-text-400 font-mono mt-0.5 break-all">{company.cnpj}</div>
                      <div className="text-[11px] text-uni-text-500 md:hidden break-words">{company.sector || ''}</div>
                    </div>
                    <div className="hidden md:block text-xs text-uni-text-500 w-32 truncate" title={company.sector || ''}>{company.sector || '—'}</div>
                    <div className="flex items-center justify-between sm:block text-left sm:text-center w-full sm:w-14 cursor-pointer" onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}>
                      <div className="text-sm font-bold text-uni-text-900">{company.user_count}</div>
                      <div className="text-[10px] text-uni-text-400">usuárias</div>
                    </div>
                    <span className={cn('inline-flex self-start px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide', PLAN_COLORS[company.plan] ?? 'bg-gray-100 text-gray-600')}>
                      {company.plan}
                    </span>

                    <button onClick={() => startEditCompany(company)} className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all flex-shrink-0">
                      Editar
                    </button>

                    <button
                      onClick={() => toggleBlock(company)}
                      disabled={blocking === company.id}
                      className={cn(
                        'w-full sm:w-auto px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0',
                        isBlocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
                        blocking === company.id && 'opacity-50 cursor-wait'
                      )}
                    >
                      {blocking === company.id ? '...' : isBlocked ? 'Reativar' : 'Suspender'}
                    </button>
                    <span className={cn('text-uni-text-400 transition-transform text-sm cursor-pointer', expandedCompany === company.id && 'rotate-180')} onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}>▾</span>
                  </div>

                  {editingCompany === company.id && (
                    <div className="px-6 py-5 bg-amber-50/30 border-t border-amber-200/50">
                      <p className="text-xs font-bold text-uni-text-600 mb-4 uppercase tracking-wide">Editar Empresa</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Razão Social *</label>
                          <input value={editCompanyForm.name} onChange={e => setEditCompanyForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Nome Fantasia</label>
                          <input value={editCompanyForm.trade_name} onChange={e => setEditCompanyForm(f => ({ ...f, trade_name: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">CNPJ</label>
                          <input value={editCompanyForm.cnpj} onChange={e => setEditCompanyForm(f => ({ ...f, cnpj: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Setor</label>
                          <input value={editCompanyForm.sector} onChange={e => setEditCompanyForm(f => ({ ...f, sector: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Plano</label>
                          <select value={editCompanyForm.plan} onChange={e => setEditCompanyForm(f => ({ ...f, plan: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400">
                            <option value="trial">Trial</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-uni-text-500 mt-5 mb-3 uppercase tracking-wide">Contato da Empresa</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Nome do Contato</label>
                          <input value={editCompanyForm.contact_name} onChange={e => setEditCompanyForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Email do Contato</label>
                          <input type="email" value={editCompanyForm.contact_email} onChange={e => setEditCompanyForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Telefone</label>
                          <input value={editCompanyForm.contact_phone} onChange={e => setEditCompanyForm(f => ({ ...f, contact_phone: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" />
                        </div>
                      </div>

                      <p className="text-xs font-bold text-uni-text-500 mt-5 mb-3 uppercase tracking-wide">Identidade Visual</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Cor Primária</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editCompanyForm.primary_color || '#C9A264'} onChange={e => setEditCompanyForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border-1 cursor-pointer" />
                            <input value={editCompanyForm.primary_color} onChange={e => setEditCompanyForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#C9A264" className="flex-1 border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400 font-mono" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-uni-text-500 mb-1 uppercase tracking-wide">Cor Secundária</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editCompanyForm.secondary_color || '#1A3A6B'} onChange={e => setEditCompanyForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border-1 cursor-pointer" />
                            <input value={editCompanyForm.secondary_color} onChange={e => setEditCompanyForm(f => ({ ...f, secondary_color: e.target.value }))} placeholder="#1A3A6B" className="flex-1 border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400 font-mono" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-amber-200/50">
                        <button onClick={saveEditCompany} disabled={savingEdit} className="px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50" style={{ background: '#C9A264' }}>
                          {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button onClick={() => setEditingCompany(null)} className="px-5 py-2.5 rounded-lg text-xs font-bold text-uni-text-500 hover:bg-gray-100 transition-all border border-border-1">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedCompany === company.id && <CompanyUsersPanel companyId={company.id} onGoToUsers={onGoToUsers} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

const EMPTY_USER_FORM = { name: '', email: '', password: '', role: 'rh' as const, company_id: '', also_collaborator: false };

function UsersTab() {
  const { data: companiesData } = useSWR<{ companies: Company[] }>('/api/admin/companies', fetcher, {
    revalidateOnFocus: false,
  });
  const companies = companiesData?.companies ?? [];

  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState<{ userId: string; pass: string } | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [savingUser, setSavingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showPassText, setShowPassText] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [editingUser, setEditingUser] = useState<AllUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'colaboradora', company_id: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(u: AllUser) {
    setEditForm({ name: u.name, email: u.email, role: u.role, company_id: u.company_id ?? '' });
    setEditingUser(u);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          company_id: editForm.company_id || null,
        }),
      });
      setEditingUser(null);
      await loadAllUsers();
    } finally {
      setSavingEdit(false);
    }
  }

  function generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const rand = (src: string) => src[Math.floor(Math.random() * src.length)];
    // Garante pelo menos 1 de cada categoria
    const required = [rand(upper), rand(lower), rand(digits), rand(special)];
    const rest = Array.from({ length: 8 }, () => rand(all));
    // Embaralha tudo
    const pass = [...required, ...rest].sort(() => Math.random() - 0.5).join('');
    setUserForm(f => ({ ...f, password: pass }));
    setShowPassText(false); // oculta após gerar — usu�rio decide se quer ver
  }

  async function copyPassword() {
    if (!userForm.password) return;
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(userForm.password); copied = true; } catch { }
    }
    if (!copied) {
      const el = document.createElement('textarea');
      el.value = userForm.password; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); copied = true; } catch { }
      document.body.removeChild(el);
    }
    if (copied) { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  }

  // Fetch all users across all companies by aggregating company user lists
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [fetching, setFetching] = useState(false);

  const loadAllUsers = useCallback(async () => {
    if (companies.length === 0) return;
    setFetching(true);
    try {
      const results = await Promise.all(
        companies.map(async (c) => {
          const res = await fetch(`/api/admin/companies/${c.id}/users`);
          const json = await res.json();
          return (json.users ?? []).map((u: CompanyUser) => ({
            ...u,
            company_name: c.trade_name || c.name,
            company_id: c.id,
          }));
        })
      );
      setAllUsers(results.flat());
    } finally {
      setFetching(false);
    }
  }, [companies]);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  async function doAction(userId: string, action: string, extra?: Record<string, string>) {
    setLoading(`${userId}-${action}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (action === 'reset_password' && json.tempPassword) {
        setTempPass({ userId, pass: json.tempPassword });
      }
      await loadAllUsers();
    } finally {
      setLoading(null);
    }
  }

  async function createUser() {
    if (!userForm.company_id) {
      setUserFeedback({ type: 'error', msg: 'Selecione uma empresa.' });
      return;
    }
    setSavingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userForm, company_id: userForm.company_id }),
      });
      const json = await res.json();
      if (json.success) {
        setUserFeedback({ type: 'success', msg: 'Usu�rio criado com sucesso!' });
        setShowCreateUser(false);
        setUserForm(EMPTY_USER_FORM);
        await loadAllUsers();
      } else {
        setUserFeedback({ type: 'error', msg: json.error || 'Erro ao criar usu�rio' });
      }
    } catch { setUserFeedback({ type: 'error', msg: 'Erro de conex�o' }); }
    setSavingUser(false);
    setTimeout(() => setUserFeedback(null), 3000);
  }

  const filtered = allUsers.filter((u) => {
    if (filterCompany && u.company_id !== filterCompany) return false;
    if (filterRole && u.role !== filterRole) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {userFeedback && (
        <div className={cn('p-3 rounded-xl text-sm font-bold border', userFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
          {userFeedback.msg}
        </div>
      )}

      {/* Create User Form */}
      {showCreateUser && (
        <div className="bg-white rounded-xl border border-border-1 p-6 space-y-4">
          <h3 className="font-display font-bold text-uni-text-900">Novo usu�rio Master / Admin</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Nome *</label>
              <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Email *</label>
              <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@empresa.com" className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Senha *</label>
              <div className="relative">
                <input
                  type={showPassText ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Digite ou gere uma senha segura"
                  className="w-full border border-border-1 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-rose-400 font-mono tracking-wider"
                />
                <button type="button" onClick={() => setShowPassText(v => !v)} title={showPassText ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 transition-colors text-xs">
                  {showPassText ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button type="button" onClick={generatePassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-1 text-[11px] font-bold text-uni-text-600 hover:bg-cream-50 hover:border-rose-300 transition-colors">
                  🎲 Gerar senha segura
                </button>
                <button type="button" onClick={copyPassword} disabled={!userForm.password}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-1 text-[11px] font-bold text-uni-text-600 hover:bg-cream-50 hover:border-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {copiedPass ? '✓ Copiada!' : '📋 Copiar'}
                </button>
                {userForm.password && (
                  <span className="ml-auto text-[10px] text-uni-text-400">
                    {/[A-Z]/.test(userForm.password) && /[a-z]/.test(userForm.password) && /[0-9]/.test(userForm.password) && /[!@#$%&*]/.test(userForm.password) && userForm.password.length >= 8
                      ? '✅ Senha forte'
                      : '⚠️ Senha fraca'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Papel *</label>
              <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as typeof userForm.role }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400">
                <option value="rh">Admin Empresa</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Empresa *</label>
              <select value={userForm.company_id} onChange={e => setUserForm(f => ({ ...f, company_id: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400" required>
                <option value="">— Selecione uma empresa —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.trade_name || c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={userForm.also_collaborator}
                onChange={e => setUserForm(f => ({ ...f, also_collaborator: e.target.checked }))}
                className="w-4 h-4 rounded border-border-1 accent-gold-500"
              />
              <span className="text-sm text-uni-text-600">Também participa como colaboradora</span>
            </label>
            <span className="text-[10px] text-uni-text-400" title="Se marcado, este usu�rio pode alternar entre a visão de gestor e a de colaboradora (check-ins, desafios, etc)">ℹ️</span>
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={() => setShowCreateUser(false)} className="px-4 py-2 rounded-lg border border-border-1 text-sm font-bold text-uni-text-600 hover:bg-cream-50">Cancelar</button>
            <button onClick={createUser} disabled={savingUser || !userForm.name || !userForm.email || userForm.password.length < 8}
              className="px-6 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-50">
              {savingUser ? 'Criando...' : 'Criar usu�rio'}
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-uni-text-900 text-lg">Editar usu�rio</h3>
              <button onClick={() => setEditingUser(null)} className="text-uni-text-400 hover:text-uni-text-700 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Nome</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">
                  Papel
                  <span className="cursor-help opacity-50 ml-1" title={editForm.role === 'rh' ? 'Gerencia colaboradoras, campanhas e configurações da empresa' : editForm.role === 'lideranca' ? 'Gestora de equipe — visão dos indicadores do departamento' : 'Usu�ria padrão — check-ins, campanhas e pontos'}>?</span>
                </label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400">
                  <option value="rh">Admin Empresa</option>
                  <option value="lideranca">Lideran�a</option>
                  <option value="colaboradora">Colaboradora</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Empresa</label>
                <select value={editForm.company_id} onChange={e => setEditForm(f => ({ ...f, company_id: e.target.value }))}
                  className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400">
                  <option value="">— Sem empresa —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.trade_name || c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-2 rounded-lg border border-border-1 text-sm font-bold text-uni-text-600 hover:bg-cream-50">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit || !editForm.name || !editForm.email}
                className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-50">
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="text-sm border border-border-1 rounded-lg px-3 py-2 bg-white text-uni-text-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <option value="">Todas as empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.name}
            </option>
          ))}
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm border border-border-1 rounded-lg px-3 py-2 bg-white text-uni-text-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <option value="">Todos os papéis</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-uni-text-400">
          {filtered.length} Usu�ria{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {tempPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTempPass(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-border-1 p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-uni-text-900 text-lg">Senha Tempor�ria</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <code className="font-mono text-lg font-bold text-amber-800 break-all flex-1">{tempPass.pass}</code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(tempPass.pass);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all"
                >
                  Copiar Senha
                </button>
              </div>
            </div>
            <p className="text-xs text-red-600 font-semibold flex items-start gap-1.5">
              <span className="flex-shrink-0">&#9888;&#65039;</span>
              Anote esta senha! Ela n�o será mostrada novamente.
            </p>
            <button
              onClick={() => setTempPass(null)}
              className="w-full py-2.5 bg-uni-text-900 text-white rounded-xl text-sm font-bold hover:bg-uni-text-600 transition-all"
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader title="Usu�rios" count={filtered.length} action={
          <button onClick={() => setShowCreateUser(s => !s)} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all">
            + Novo usu�rio
          </button>
        } />
        {fetching ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando usu�rias...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="text-4xl block">👥</span>
            <p className="text-uni-text-700 font-medium">Nenhuma Usu�ria encontrada</p>
            <p className="text-sm text-uni-text-400">Tente ajustar os filtros ou crie uma nova Usu�ria.</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border-1">
              {filtered.map((u) => {
                const isBlocked = u.blocked === 1;
                return (
                  <div key={u.id} className={cn('p-4 space-y-2', isBlocked && 'bg-red-50/40')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-uni-text-900 text-sm">{u.name}</div>
                        <div className="text-[11px] text-uni-text-400">{u.email}</div>
                        <div className="text-[11px] text-uni-text-500 mt-0.5">{u.company_name}</div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                          isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                        {isBlocked ? 'Bloqueada' : 'Ativa'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                        Editar
                      </button>
                      <button
                        onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                        disabled={!!loading}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-[11px] font-bold transition-all',
                          isBlocked
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100',
                          loading && 'opacity-50 cursor-wait'
                        )}
                      >
                        {isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button
                        onClick={() => doAction(u.id, 'reset_password')}
                        disabled={!!loading}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50"
                      >
                        Resetar Senha
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-1">
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Usuária</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Empresa</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Papel</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Nível</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Status</th>
                    <th className="text-right px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-1">
                  {filtered.map((u) => {
                    const isBlocked = u.blocked === 1;
                    const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
                    const resetKey = `${u.id}-reset_password`;
                    return (
                      <tr key={u.id} className={cn('transition-colors', isBlocked ? 'bg-red-50/40' : 'hover:bg-cream-50/30')}>
                        <td className="px-6 py-3">
                          <div className="font-medium text-uni-text-900">{u.name}</div>
                          <div className="text-[11px] text-uni-text-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-uni-text-600">{u.company_name || '?'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold bg-cream-100 text-uni-text-600 px-2 py-0.5 rounded-full">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-uni-text-600">{u.level}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                              isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                            {isBlocked ? 'Bloqueada' : 'Ativa'}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                              disabled={loading === blockKey}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                                isBlocked
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100',
                                loading === blockKey && 'opacity-50 cursor-wait'
                              )}
                            >
                              {loading === blockKey ? '...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                            <button
                              onClick={() => doAction(u.id, 'reset_password')}
                              disabled={loading === resetKey}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all',
                                loading === resetKey && 'opacity-50 cursor-wait'
                              )}
                            >
                              {loading === resetKey ? '...' : 'Resetar Senha'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Admin Master Tab ─────────────────────────────────────────────────────────

interface AdminMasterUser {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  points: number;
  blocked: number;
  created_at: string;
  company_id: string | null;
}

const EMPTY_MASTER_FORM = { name: '', email: '', password: '', confirmPassword: '', confirmCurrentPassword: '' };

function AdminMasterTab() {
  const { user: currentUser } = useAuth();
  const { data, mutate, isLoading } = useSWR<{ users: AdminMasterUser[] }>('/api/admin/users', fetcher, {
    revalidateOnFocus: false,
  });
  const masters = data?.users ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_MASTER_FORM);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState<{ userId: string; pass: string } | null>(null);

  function generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const rand = (src: string) => src[Math.floor(Math.random() * src.length)];
    const required = [rand(upper), rand(lower), rand(digits), rand(special)];
    const rest = Array.from({ length: 8 }, () => rand(all));
    const pass = [...required, ...rest].sort(() => Math.random() - 0.5).join('');
    setForm(f => ({ ...f, password: pass, confirmPassword: pass }));
  }

  async function copyPassword() {
    if (!form.password) return;
    try { await navigator.clipboard.writeText(form.password); } catch { }
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  }

  function resetForm() {
    setForm(EMPTY_MASTER_FORM);
    setShowPass(false);
    setShowCurrentPass(false);
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setFeedback({ type: 'error', msg: 'As senhas do novo admin n�o coincidem.' });
      return;
    }
    if (!form.confirmCurrentPassword) {
      setFeedback({ type: 'error', msg: 'Confirme com sua senha atual.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'admin',
          confirmCurrentPassword: form.confirmCurrentPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', msg: 'Admin Master criado com sucesso!' });
        resetForm();
        mutate();
      } else {
        setFeedback({ type: 'error', msg: json.error || 'Erro ao criar Admin Master' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Erro de conex�o' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  async function doAction(userId: string, action: string) {
    setLoading(`${userId}-${action}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (action === 'reset_password' && json.tempPassword) {
        setTempPass({ userId, pass: json.tempPassword });
      }
      mutate();
    } finally {
      setLoading(null);
    }
  }

  const inputCls = 'w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white';

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={cn('p-3 rounded-xl text-sm font-bold border', feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
          {feedback.msg}
        </div>
      )}

      {tempPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTempPass(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-border-1 p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-uni-text-900 text-lg">Senha Tempor�ria</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <code className="font-mono text-lg font-bold text-amber-800 break-all flex-1">{tempPass.pass}</code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(tempPass.pass);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all"
                >
                  Copiar Senha
                </button>
              </div>
            </div>
            <p className="text-xs text-red-600 font-semibold flex items-start gap-1.5">
              <span className="flex-shrink-0">&#9888;&#65039;</span>
              Anote esta senha! Ela n�o será mostrada novamente.
            </p>
            <button
              onClick={() => setTempPass(null)}
              className="w-full py-2.5 bg-uni-text-900 text-white rounded-xl text-sm font-bold hover:bg-uni-text-600 transition-all"
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-1 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-uni-text-900">Novo Admin Master</h3>
              <p className="text-[11px] text-uni-text-400 mt-0.5">N�o vinculado a nenhuma empresa — acesso total ao sistema</p>
            </div>
            <button onClick={resetForm} className="text-uni-text-400 hover:text-uni-text-700 text-xl leading-none">×</button>
          </div>

          <form onSubmit={handleCreate} className="p-6 space-y-5">
            {/* Dados do novo admin */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-uni-text-400 mb-3">Dados do novo Admin Master</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className={inputCls} required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@uniher.com.br" className={inputCls} required />
                </div>
              </div>
            </div>

            {/* Senha do novo admin */}
            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Senha do novo Admin *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="M�nimo 8 caracteres"
                    className={cn(inputCls, 'pr-10 font-mono')}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 text-xs">
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                <button type="button" onClick={generatePassword} className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 whitespace-nowrap transition-all">
                  Gerar
                </button>
                <button type="button" onClick={copyPassword} disabled={!form.password} className="px-3 py-2 rounded-lg text-xs font-bold bg-cream-100 text-uni-text-600 hover:bg-cream-200 border border-border-1 transition-all disabled:opacity-40">
                  {copiedPass ? '✓' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Confirmar Senha do novo Admin *</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repita a senha acima"
                className={cn(inputCls, 'font-mono', form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400 ring-1 ring-red-200' : '')}
                required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">As senhas n�o coincidem</p>
              )}
            </div>

            {/* Divider de confirmação */}
            <div className="border-t border-amber-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-500 text-base">🔐</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Confirma��o de identidade</p>
                  <p className="text-[11px] text-uni-text-400">Por segurança, confirme com <strong>sua senha atual</strong> para criar um Admin Master</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={form.confirmCurrentPassword}
                  onChange={e => setForm(f => ({ ...f, confirmCurrentPassword: e.target.value }))}
                  placeholder={`Sua senha atual (${currentUser?.email ?? 'admin logado'})`}
                  className={cn(inputCls, 'pr-10 border-amber-200 focus:ring-amber-200')}
                  required
                />
                <button type="button" onClick={() => setShowCurrentPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-uni-text-400 hover:text-uni-text-700 text-xs">
                  {showCurrentPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-border-1 text-sm font-bold text-uni-text-600 hover:bg-cream-50 transition-all">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.name || !form.email || !form.password || form.password !== form.confirmPassword || !form.confirmCurrentPassword}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Criando...' : 'Criar Admin Master'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Admins Master"
          count={masters.length}
          action={
            !showForm ? (
              <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all">
                + Novo Admin Master
              </button>
            ) : undefined
          }
        />

        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando...
          </div>
        ) : masters.length === 0 ? (
          <div className="p-10 text-center text-sm text-uni-text-400">
            <div className="text-2xl mb-2">🔑</div>
            Nenhum Admin Master cadastrado.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border-1">
              {masters.map(u => {
                const isBlocked = u.blocked === 1;
                return (
                  <div key={u.id} className={cn('p-4 space-y-2', isBlocked && 'bg-red-50/40')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-uni-text-900 text-sm">{u.name}</span>
                          {u.company_id === null && (
                            <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full border border-rose-100">Sistema</span>
                          )}
                        </div>
                        <div className="text-[11px] text-uni-text-400">{u.email}</div>
                        <div className="text-[11px] text-uni-text-400 mt-0.5">{new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                        {isBlocked ? 'Bloqueado' : 'Ativo'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')} disabled={!!loading}
                        className={cn('flex-1 py-2 rounded-lg text-[11px] font-bold transition-all', isBlocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100', loading && 'opacity-50 cursor-wait')}>
                        {isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button onClick={() => doAction(u.id, 'reset_password')} disabled={!!loading}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50">
                        Resetar Senha
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-1">
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Admin Master</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Criado em</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Status</th>
                    <th className="text-right px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">A��es</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-1">
                  {masters.map(u => {
                    const isBlocked = u.blocked === 1;
                    const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
                    const resetKey = `${u.id}-reset_password`;
                    return (
                      <tr key={u.id} className={cn('transition-colors', isBlocked ? 'bg-red-50/40' : 'hover:bg-cream-50/30')}>
                        <td className="px-6 py-3">
                          <div className="font-medium text-uni-text-900">{u.name}</div>
                          <div className="text-[11px] text-uni-text-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 whitespace-nowrap">
                            Sistema · Sem empresa
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-uni-text-500">
                          {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full', isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                            {isBlocked ? 'Bloqueado' : 'Ativo'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2 flex-nowrap">
                            <button onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')} disabled={loading === blockKey}
                              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap', isBlocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100', loading === blockKey && 'opacity-50 cursor-wait')}>
                              {loading === blockKey ? '...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                            <button onClick={() => doAction(u.id, 'reset_password')} disabled={loading === resetKey}
                              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all whitespace-nowrap', loading === resetKey && 'opacity-50 cursor-wait')}>
                              {loading === resetKey ? '...' : 'Resetar Senha'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Badges Tab ───────────────────────────────────────────────────────────────

const RARITY_OPTIONS = ['common', 'rare', 'epic', 'legendary'] as const;
const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: '�pico',
  legendary: 'Lend�rio',
};

const emptyBadgeForm = { name: '', description: '', icon: '🏅', points: 0, rarity: 'common' as const };

function BadgesTab() {
  const { data, mutate, isLoading } = useSWR<{ badges: Badge[] }>('/api/admin/badges', fetcher, {
    revalidateOnFocus: false,
  });
  const badges = data?.badges ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBadgeForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyBadgeForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(b: Badge) {
    setEditingId(b.id);
    setForm({ name: b.name, description: b.description, icon: b.icon, points: b.points, rarity: b.rarity as typeof emptyBadgeForm.rarity });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/admin/badges/${editingId}` : '/api/admin/badges';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Erro ao salvar badge');
        return;
      }
      mutate();
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/badges/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? 'Erro ao excluir badge');
        return;
      }
      mutate();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
          <SectionHeader
            title={editingId ? 'Editar Badge' : 'Novo Badge'}
            action={
              <button onClick={closeForm} className="text-uni-text-400 hover:text-uni-text-700 text-sm">
                Cancelar
              </button>
            }
          />
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-uni-text-400">Ícone (emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                maxLength={4}
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="🏅"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-uni-text-400">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="Nome do badge"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-uni-text-400">Descri��o</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                rows={2}
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                placeholder="Descreva quando este badge é concedido..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-uni-text-400">Pontos</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
                min={0}
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-uni-text-400">Raridade</label>
              <select
                value={form.rarity}
                onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as typeof form.rarity }))}
                className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                {RARITY_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {RARITY_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="md:col-span-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border-1 text-uni-text-600 hover:bg-cream-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Badge'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Badges list */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Badges da Plataforma"
          count={badges.length}
          action={
            !showForm && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all"
              >
                + Novo Badge
              </button>
            )
          }
        />

        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando badges...
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-4xl block">🏅</span>
            <p className="text-uni-text-700 font-medium">Nenhum badge cadastrado</p>
            <p className="text-sm text-uni-text-400">Crie badges para reconhecer as conquistas das colaboradoras.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all">
              + Criar Badge
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-xl flex-shrink-0">
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-uni-text-900 text-sm">{b.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                        RARITY_COLORS[b.rarity] ?? 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {RARITY_LABELS[b.rarity] ?? b.rarity}
                    </span>
                  </div>
                  <div className="text-[11px] text-uni-text-400 mt-0.5 truncate">{b.description}</div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-uni-text-500">
                    <span>{b.points} pts</span>
                    <span>{b.holder_count} detentora{b.holder_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={b.holder_count > 0 || deleting === b.id}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      b.holder_count > 0
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-red-50 text-red-700 hover:bg-red-100',
                      deleting === b.id && 'opacity-50 cursor-wait'
                    )}
                    title={b.holder_count > 0 ? 'Não é possível excluir: usu�rias possuem este badge' : 'Excluir badge'}
                  >
                    {deleting === b.id ? '...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── System Tab ───────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface SystemSettings {
  app_name?: string;
  app_logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  support_email?: string;
  support_phone?: string;
  auto_backup_enabled?: '0' | '1';
  auto_backup_hour?: string;
}

function BrandingEditor() {
  const { data, mutate } = useSWR<{ settings: SystemSettings }>('/api/admin/settings', fetcher, { revalidateOnFocus: false });

  const [form, setForm] = useState<SystemSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [synced, setSynced] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [saveError, setSaveError] = useState('');

  // Sync remote -> form once loaded
  useEffect(() => {
    if (data && !synced) {
      setForm(data.settings ?? {});
      setSynced(true);
    }
  }, [data, synced]);

  function set(k: keyof SystemSettings, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    setSaved(false);
    setSaveError('');
  }

  async function save() {
    setSaving(true);
    setSaveError('');
    const rawHour = Number.parseInt(form.auto_backup_hour ?? '2', 10);
    const normalizedHour = Number.isInteger(rawHour) ? Math.min(23, Math.max(0, rawHour)) : 2;
    const payload = {
      ...form,
      auto_backup_enabled: form.auto_backup_enabled === '0' ? '0' : '1',
      auto_backup_hour: String(normalizedHour),
    };
    const currentEnabled = data?.settings?.auto_backup_enabled === '0' ? '0' : '1';
    const isChangingBackupEnabled = payload.auto_backup_enabled !== currentEnabled;

    if (isChangingBackupEnabled && !masterPassword.trim()) {
      setSaveError('Para ativar ou desativar o backup automático, informe a senha do master.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          ...(isChangingBackupEnabled ? { master_password: masterPassword } : {}),
        }),
      });
      if (res.ok) {
        await mutate();
        setForm(prev => ({ ...prev, auto_backup_hour: String(normalizedHour) }));
        setMasterPassword('');
        setSaved(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveError(d?.error || 'Não foi possível salvar as configurações.');
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white';
  const labelCls = 'text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block';
  const currentEnabled = data?.settings?.auto_backup_enabled === '0' ? '0' : '1';
  const selectedEnabled = form.auto_backup_enabled === '0' ? '0' : '1';
  const requiresMasterPassword = selectedEnabled !== currentEnabled;

  return (
    <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
      <SectionHeader title="Identidade Visual do Sistema" />
      <div className="p-6 space-y-6">

        {/* Preview strip */}
        <div
          className="rounded-xl p-4 flex items-center gap-3 border"
          style={{ background: form.accent_color || '#E8D5A3', borderColor: form.primary_color || '#C9A264' }}
        >
          {form.app_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.app_logo_url} alt="logo" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
              style={{ background: form.primary_color || '#C9A264' }}
            >
              {(form.app_name || 'U')[0]}
            </div>
          )}
          <span className="font-bold text-lg" style={{ color: form.primary_color || '#C9A264' }}>
            {form.app_name || 'UniHER'}
          </span>
          <span className="ml-auto text-xs opacity-60">pr�-visualiza��o</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Nome do Sistema</label>
            <input className={inputCls} value={form.app_name ?? ''} onChange={e => set('app_name', e.target.value)} placeholder="UniHER" />
          </div>
          <div>
            <label className={labelCls}>URL do Logo</label>
            <input className={inputCls} value={form.app_logo_url ?? ''} onChange={e => set('app_logo_url', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Cor Prim�ria</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color ?? '#C9A264'} onChange={e => set('primary_color', e.target.value)} className="h-10 w-14 rounded-lg border border-border-1 cursor-pointer p-0.5" />
              <input className={`${inputCls} flex-1`} value={form.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} placeholder="#C9A264" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cor Secund�ria</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondary_color ?? '#B8922A'} onChange={e => set('secondary_color', e.target.value)} className="h-10 w-14 rounded-lg border border-border-1 cursor-pointer p-0.5" />
              <input className={`${inputCls} flex-1`} value={form.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} placeholder="#B8922A" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cor de Destaque (Accent)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.accent_color ?? '#E8D5A3'} onChange={e => set('accent_color', e.target.value)} className="h-10 w-14 rounded-lg border border-border-1 cursor-pointer p-0.5" />
              <input className={`${inputCls} flex-1`} value={form.accent_color ?? ''} onChange={e => set('accent_color', e.target.value)} placeholder="#E8D5A3" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email de Suporte</label>
            <input className={inputCls} type="email" value={form.support_email ?? ''} onChange={e => set('support_email', e.target.value)} placeholder="suporte@uniher.com.br" />
          </div>
          <div>
            <label className={labelCls}>Telefone de Suporte</label>
            <input className={inputCls} value={form.support_phone ?? ''} onChange={e => set('support_phone', e.target.value)} placeholder="+55 (11) 00000-0000" />
          </div>
        </div>

        <div className="rounded-xl border border-border-1 bg-cream-50/40 p-4">
          <p className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-3">Backup Automatico Global</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status do Backup Diario</label>
              <select
                className={inputCls}
                value={form.auto_backup_enabled ?? '1'}
                onChange={e => set('auto_backup_enabled', e.target.value as '0' | '1')}
              >
                <option value="1">Ativo</option>
                <option value="0">Desativado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Horario (0 a 23)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                max={23}
                value={form.auto_backup_hour ?? '2'}
                onChange={e => set('auto_backup_hour', e.target.value)}
                placeholder="2"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Senha do Master (obrigatória para mudar ativo/desativado)</label>
            <input
              className={inputCls}
              type="password"
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
              placeholder="Digite sua senha atual"
              disabled={!requiresMasterPassword}
            />
          </div>
          <p className="text-xs text-uni-text-500 mt-3">
            Configuracao global do sistema. Vale para todas as empresas.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-60 transition-all"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {saving ? 'Salvando...' : 'Salvar Identidade Visual'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Salvo com sucesso</span>}
          {saveError && <span className="text-sm text-red-600 font-medium">{saveError}</span>}
        </div>
      </div>
    </div>
  );
}

function MasterActionButton({ label, icon, onClick, loading, variant = 'default' }: {
  label: string; icon: string; onClick: () => void; loading?: boolean;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const colors = {
    default: 'border-border-1 text-uni-text-700 hover:bg-cream-50',
    warning: 'border-amber-300 text-amber-700 hover:bg-amber-50',
    danger: 'border-red-300 text-red-700 hover:bg-red-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-all ${colors[variant]} disabled:opacity-50`}
    >
      <span className="text-base">{icon}</span>
      {loading ? <Spinner /> : label}
    </button>
  );
}

function SystemTab() {
  const { data, isLoading, mutate } = useSWR<SystemStats>('/api/admin/system', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000,
  });

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [clearLogsLoading, setClearLogsLoading] = useState(false);

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  async function handleBackup() {
    setBackupLoading(true);
    setBackupMsg('');
    try {
      const res = await fetch('/api/admin/system/backup', { method: 'POST' });
      const d = await res.json();
      if (d.success) setBackupMsg(`Backup criado: ${d.backup} (${d.sizeKB} KB)`);
      else setBackupMsg(`Erro: ${d.error}`);
    } catch { setBackupMsg('Erro ao criar backup'); }
    setBackupLoading(false);
  }

  async function handleIntegrity() {
    setIntegrityLoading(true);
    setIntegrityResult(null);
    try {
      const res = await fetch('/api/admin/system/integrity', { method: 'POST' });
      setIntegrityResult(await res.json());
    } catch { setIntegrityResult({ error: true }); }
    setIntegrityLoading(false);
  }

  async function handleClearLogs(type: 'errors' | 'server' | 'all') {
    setClearLogsLoading(true);
    try {
      await fetch('/api/admin/system/clear-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      mutate();
    } catch { /* */ }
    setClearLogsLoading(false);
  }

  const m = (data as any)?.master;

  return (
    <div className="space-y-6">
      {/* Branding editor */}
      <BrandingEditor />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Banco de Dados" value={data ? `${data.db_size_kb} KB` : '—'} sub="tamanho do arquivo" />
        <StatCard
          label="Uptime"
          value={data ? formatUptime(data.uptime_seconds) : '—'}
          sub="tempo de processo"
          accent="text-emerald-600"
        />
        <StatCard label="Challenges" value={data?.challenges ?? '—'} sub="na plataforma" />
        <StatCard label="Notifica��es" value={data?.notifications ?? '—'} sub="total geradas" />
      </div>

      {/* Health checks */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Health Check"
          action={
            <button
              onClick={() => mutate()}
              className="px-3 py-1.5 text-xs font-bold text-uni-text-500 border border-border-1 rounded-lg hover:bg-cream-50 transition-all"
            >
              Atualizar
            </button>
          }
        />
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Verificando sistema...
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {[
              { label: 'Banco de Dados (SQLite)', ok: !!data, value: data ? `${data.db_size_kb} KB` : 'Indisponível' },
              { label: 'Processo Node.js', ok: !!data, value: data ? `Uptime: ${formatUptime(data.uptime_seconds)}` : 'Desconhecido' },
              { label: 'Empresas', ok: !!data, value: data ? `${data.companies} cadastradas` : '—' },
              { label: 'Usu�rias', ok: !!data, value: data ? `${data.users} ativas` : '—' },
              { label: 'Campanhas Ativas', ok: !!data, value: data ? `${data.campaigns} em andamento` : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.ok ? 'bg-emerald-500' : 'bg-rose-500')} />
                  <span className="text-sm font-medium text-uni-text-800">{item.label}</span>
                </div>
                <span className="text-xs text-uni-text-500">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Control Panel — only on localhost */}
      {isDev && m && (
        <>
          {/* Resources */}
          <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
            <SectionHeader title="Recursos do Servidor" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border-1">
              {/* Memory */}
              <div className="bg-white p-5 space-y-3">
                <h4 className="text-xs font-bold text-uni-text-500 uppercase tracking-wider">Memória</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Node.js Heap</span>
                    <span className="font-mono text-uni-text-800">{m.memory.heapUsedMB} / {m.memory.heapTotalMB} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">RSS (Total Node)</span>
                    <span className="font-mono text-uni-text-800">{m.memory.rssMB} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Sistema</span>
                    <span className="font-mono text-uni-text-800">
                      {(m.memory.systemTotalGB - m.memory.systemFreeGB).toFixed(1)} / {m.memory.systemTotalGB} GB ({m.memory.systemUsedPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={cn('h-2 rounded-full transition-all', m.memory.systemUsedPercent > 85 ? 'bg-red-500' : m.memory.systemUsedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(m.memory.systemUsedPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {/* CPU & System */}
              <div className="bg-white p-5 space-y-3">
                <h4 className="text-xs font-bold text-uni-text-500 uppercase tracking-wider">Sistema</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">CPU</span>
                    <span className="font-mono text-uni-text-800 text-right text-xs max-w-[200px] truncate">{m.cpu.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Cores</span>
                    <span className="font-mono text-uni-text-800">{m.cpu.cores}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Node.js</span>
                    <span className="font-mono text-uni-text-800">{m.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">OS</span>
                    <span className="font-mono text-uni-text-800 text-right text-xs max-w-[200px] truncate">{m.system.platform}</span>
                  </div>
                </div>
              </div>
              {/* Database */}
              <div className="bg-white p-5 space-y-3">
                <h4 className="text-xs font-bold text-uni-text-500 uppercase tracking-wider">Banco de Dados</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Tamanho DB</span>
                    <span className="font-mono text-uni-text-800">{m.db.sizeMB} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">WAL</span>
                    <span className="font-mono text-uni-text-800">{m.db.walSizeMB} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Backups</span>
                    <span className="font-mono text-uni-text-800">{m.backups.count} ({m.backups.totalSizeMB} MB)</span>
                  </div>
                </div>
              </div>
              {/* Logs */}
              <div className="bg-white p-5 space-y-3">
                <h4 className="text-xs font-bold text-uni-text-500 uppercase tracking-wider">Logs</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">Erros registrados</span>
                    <span className={cn('font-mono', m.logs.errorLogEntries > 0 ? 'text-red-600 font-bold' : 'text-uni-text-800')}>{m.logs.errorLogEntries}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">errors.log</span>
                    <span className="font-mono text-uni-text-800">{m.logs.errorLogSizeKB} KB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-uni-text-600">server.log</span>
                    <span className="font-mono text-uni-text-800">{m.logs.serverLogSizeKB} KB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
            <SectionHeader title="A��es do Sistema" />
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3">
                <MasterActionButton icon="💾" label="Backup do Banco" onClick={handleBackup} loading={backupLoading} />
                <MasterActionButton icon="🔍" label="Verificar Integridade" onClick={handleIntegrity} loading={integrityLoading} />
                <MasterActionButton icon="🧹" label="Limpar Logs de Erro" onClick={() => handleClearLogs('errors')} loading={clearLogsLoading} variant="warning" />
                <MasterActionButton icon="🗑️" label="Limpar Todos os Logs" onClick={() => handleClearLogs('all')} loading={clearLogsLoading} variant="danger" />
              </div>
              {backupMsg && (
                <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{backupMsg}</div>
              )}
              {integrityResult && !integrityResult.error && (
                <div className="px-4 py-3 bg-gray-50 border border-border-1 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn('w-2 h-2 rounded-full', integrityResult.integrity.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500')} />
                    <span className="font-medium">Integridade: {integrityResult.integrity.result}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn('w-2 h-2 rounded-full', integrityResult.foreignKeys.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500')} />
                    <span className="font-medium">Foreign Keys: {integrityResult.foreignKeys.status === 'ok' ? 'OK' : `${integrityResult.foreignKeys.violations} violações`}</span>
                  </div>
                  <div className="text-xs text-uni-text-500">Tabelas: {integrityResult.tables}</div>
                </div>
              )}
            </div>
          </div>

          {/* Environment badge */}
          <div className="text-center py-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Modo Desenvolvimento — Painel Master visível apenas em localhost
            </span>
          </div>
        </>
      )}

      {/* Migrations */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Migrations Aplicadas"
          count={data?.applied_migrations?.length ?? 0}
        />
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner />
          </div>
        ) : !data || data.applied_migrations.length === 0 ? (
          <div className="p-8 text-center text-sm text-uni-text-400">Nenhuma migration aplicada.</div>
        ) : (
          <div className="divide-y divide-border-1">
            {data.applied_migrations.map((m) => (
              <div key={m} className="flex items-center gap-3 px-6 py-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm font-mono text-uni-text-700">{m}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alertas Tab ──────────────────────────────────────────────────────────────

interface AdminAlert {
  id: string;
  company_id: string | null;
  company_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  target_role?: string | null;
  notification_type?: string | null;
  audience_label?: string | null;
  sent_by_name: string;
  title: string;
  message: string;
  recipients_count: number;
  created_at: string;
}

function AlertasTab() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'alert' | 'system' | 'campaign' | 'challenge' | 'lesson' | 'gamification'>('alert');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ recipients: number; audienceLabel?: string } | null>(null);
  const [sendError, setSendError] = useState('');

  const { data: companiesData } = useSWR<{ companies: any[] }>('/api/admin/companies', fetcher, { revalidateOnFocus: false });
  const { data: alertsData, mutate: mutateAlerts } = useSWR<{ alerts: AdminAlert[] }>('/api/admin/alerts/send', fetcher, { revalidateOnFocus: false });
  const { data: departmentsData } = useSWR<{ departments: { id: string; name: string }[] }>(
    companyId ? `/api/departments?company_id=${encodeURIComponent(companyId)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const companies = companiesData?.companies ?? [];
  const alerts = alertsData?.alerts ?? [];
  const departments = departmentsData?.departments ?? [];
  const roleLabels: Record<string, string> = {
    admin: 'Admin Master',
    rh: 'RH',
    lideranca: 'Lideran�a',
    colaboradora: 'Colaboradoras',
  };
  const typeLabels: Record<string, string> = {
    alert: 'Alerta',
    system: 'Sistema',
    campaign: 'Campanha',
    challenge: 'Desafio',
    lesson: 'Li��o',
    gamification: 'Gamifica��o',
  };
  const isGlobalAdminAudience = targetRole === 'admin';
  const selectedCompany = companies.find((c: any) => c.id === companyId);
  const selectedDepartment = departments.find((d) => d.id === departmentId);
  const audienceSummary = isGlobalAdminAudience
    ? 'Admin Master global'
    : [
        departmentId && selectedDepartment ? `Departamento ${selectedDepartment.name}` : '',
        companyId && selectedCompany ? `Empresa ${selectedCompany.name}` : '',
        targetRole ? roleLabels[targetRole] : 'Todos os funcion�rios',
      ].filter(Boolean).join(' � ');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setSent(null);
    setSendError('');
    try {
      const res = await fetch('/api/admin/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          company_id: companyId || undefined,
          department_id: departmentId || undefined,
          target_role: targetRole || undefined,
          notification_type: notificationType,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSent({ recipients: d.recipients, audienceLabel: d.audienceLabel });
        setTitle('');
        setMessage('');
        setDepartmentId('');
        setTargetRole('');
        mutateAlerts();
      } else {
        setSendError(d.error ?? 'Erro ao enviar');
      }
    } catch {
      setSendError('Erro de conex�o');
    } finally {
      setSending(false);
    }
  }

  const inputCls = 'w-full border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader title="Enviar Notifica��o para a Equipe" />
        <form onSubmit={handleSend} className="p-4 sm:p-6 space-y-4">
          {sent && (
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
              <span>? Notifica��o enviada para {sent.recipients} pessoa{sent.recipients !== 1 ? 's' : ''}!</span>
              {sent.audienceLabel && <span className="font-normal text-emerald-800 break-words">{sent.audienceLabel}</span>}
            </div>
          )}
          {sendError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-sm text-rose-700">{sendError}</div>
          )}

          <div className="rounded-xl border border-border-1 bg-amber-50/50 px-4 py-3 text-sm leading-6 text-uni-text-600">
            Use este painel para mandar alertas, avisos de sistema e outras notifica��es por empresa, departamento ou perfil.
            O padr�o sem perfil selecionado envia para os funcion�rios. Admin Master � sempre global.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">Tipo</label>
              <select value={notificationType} onChange={e => setNotificationType(e.target.value as typeof notificationType)} className={inputCls}>
                <option value="alert">Alerta</option>
                <option value="system">Sistema</option>
                <option value="campaign">Campanha</option>
                <option value="challenge">Desafio</option>
                <option value="lesson">Li��o</option>
                <option value="gamification">Gamifica��o</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">Empresa</label>
              <select
                value={companyId}
                onChange={e => {
                  setCompanyId(e.target.value);
                  setDepartmentId('');
                }}
                className={inputCls}
                disabled={isGlobalAdminAudience}
              >
                <option value="">{isGlobalAdminAudience ? 'Admin Master n�o usa empresa' : '� Todas as empresas �'}</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">Departamento</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className={inputCls}
                disabled={!companyId || isGlobalAdminAudience}
              >
                <option value="">
                  {isGlobalAdminAudience
                    ? 'Admin Master n�o usa departamento'
                    : companyId
                      ? '� Todos os departamentos �'
                      : 'Selecione uma empresa antes'}
                </option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">Perfil</label>
              <select
                value={targetRole}
                onChange={e => {
                  const nextRole = e.target.value;
                  setTargetRole(nextRole);
                  if (nextRole === 'admin') {
                    setCompanyId('');
                    setDepartmentId('');
                  }
                }}
                className={inputCls}
              >
                <option value="">� Todos os funcion�rios �</option>
                <option value="admin">Admin Master</option>
                <option value="rh">RH</option>
                <option value="lideranca">Lideran�a</option>
                <option value="colaboradora">Colaboradoras</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">T�tulo *</label>
              <input
                className={inputCls}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Atualiza��o importante da campanha"
                maxLength={100}
                required
              />
            </div>
            <div className="rounded-xl border border-border-1 bg-slate-50 px-4 py-3 text-sm text-uni-text-500">
              <p className="font-semibold text-uni-text-700 mb-1">Alvo atual</p>
              <p className="break-words leading-6">{audienceSummary || 'Todos os funcion�rios'}</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide mb-1 block">Mensagem *</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escreva a comunica��o que esse p�blico deve receber."
              maxLength={500}
              required
            />
            <p className="text-[11px] text-uni-text-400 mt-1 text-right">{message.length}/500</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
            >
              {sending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {sending ? 'Enviando...' : '?? Enviar notifica��o'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader title="Hist�rico de envios" count={alerts.length} />
        {alerts.length === 0 ? (
          <div className="p-10 text-center text-sm text-uni-text-400">
            <div className="text-2xl mb-2">??</div>
            Nenhuma notifica��o enviada ainda.
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {alerts.map(a => (
              <div key={a.id} className="px-4 sm:px-6 py-4 flex flex-col gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-sm text-uni-text-900 break-words">{a.title}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                      {typeLabels[a.notification_type ?? 'alert'] ?? 'Notifica��o'}
                    </span>
                    <span className="text-[11px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full">
                      {a.recipients_count} destinat�ria{a.recipients_count !== 1 ? 's' : ''}
                    </span>
                    {(a.audience_label || a.department_name || a.company_name || a.target_role) && (
                      <span className="text-[11px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                        {a.audience_label
                          ?? a.department_name
                          ?? a.company_name
                          ?? (a.target_role ? roleLabels[a.target_role] : 'Segmentado')}
                      </span>
                    )}
                    </div>
                  </div>
                  <p className="text-xs text-uni-text-500 mt-2 break-words leading-5">{a.message}</p>
                  <p className="text-[11px] text-uni-text-400 mt-2 leading-5">
                    Por {a.sent_by_name ?? '�'}
                    <span className="hidden sm:inline"> � </span>
                    <span className="sm:hidden block" />
                    {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auditoria Tab ────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  first_access_password_change: 'Primeira senha definida',
  user_create: 'Usu�rio criado',
  user_edit: 'Usu�rio editado',
  user_block: 'Usu�rio bloqueado',
  user_unblock: 'Usu�rio reativado',
  password_reset: 'Senha resetada',
  company_create: 'Empresa criada',
  company_edit: 'Empresa editada',
  company_block: 'Empresa suspensa',
  company_unblock: 'Empresa reativada',
  system_settings_update: 'Config. do sistema',
  profile_update: 'Perfil atualizado',
  quiz_submit: 'Quiz respondido',
  challenge_complete: 'Desafio conclu�do',
  challenge_create: 'Desafio criado',
  campaign_join: 'Campanha aderida',
  badge_unlock: 'Badge desbloqueada',
  invite_sent: 'Convite enviado',
  invite_approved: 'Convite aprovado',
};

function getAuditBadgeClass(action: string): string {
  if (action === 'login') return 'bg-blue-100 text-blue-700';
  if (action === 'logout') return 'bg-gray-100 text-gray-600';
  if (action.startsWith('user_')) return 'bg-rose-100 text-rose-700';
  if (action.startsWith('company_')) return 'bg-amber-100 text-amber-700';
  if (action.startsWith('password_') || action.includes('password') || action.includes('first_access')) return 'bg-purple-100 text-purple-700';
  if (action === 'quiz_submit') return 'bg-indigo-100 text-indigo-700';
  if (action === 'challenge_complete' || action === 'challenge_create') return 'bg-teal-100 text-teal-700';
  if (action === 'campaign_join') return 'bg-orange-100 text-orange-700';
  if (action === 'badge_unlock') return 'bg-yellow-100 text-yellow-700';
  if (action === 'invite_sent' || action === 'invite_approved') return 'bg-cyan-100 text-cyan-700';
  if (action === 'profile_update') return 'bg-slate-100 text-slate-700';
  if (action === 'system_settings_update') return 'bg-rose-100 text-rose-800';
  return 'bg-gray-100 text-gray-600';
}

function AuditoriaTab() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom' | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (period) params.set('period', period);
  if (period === 'custom' && from) params.set('from', from);
  if (period === 'custom' && to) params.set('to', to);
  if (action) params.set('action', action);
  if (search) params.set('search', search);
  params.set('page', String(page));

  const { data, isLoading } = useSWR<AuditResponse>(
    `/api/admin/audit?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const logs = data?.logs ?? [];

  function handlePeriod(p: 'day' | 'week' | 'month' | '') {
    setPeriod(p);
    setPage(1);
  }

  function handleCustom() {
    setPeriod('custom');
    setPage(1);
  }

  function handleActionChange(v: string) {
    setAction(v);
    setPage(1);
  }

  async function downloadCsv() {
    const dlParams = new URLSearchParams(params);
    dlParams.set('download', '1');
    const res = await fetch(`/api/admin/audit?${dlParams.toString()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-border-1 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period buttons */}
          {(['', 'day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriod(p as 'day' | 'week' | 'month' | '')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                period === (p as typeof period)
                  ? 'bg-rose-500 text-white'
                  : 'border border-border-1 text-uni-text-600 hover:bg-cream-50'
              )}
            >
              {p === '' ? 'Últimos 90 dias' : p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
          <button
            onClick={handleCustom}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              period === 'custom' ? 'bg-rose-500 text-white' : 'border border-border-1 text-uni-text-600 hover:bg-cream-50'
            )}
          >
            Personalizado
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide">De</label>
              <input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPage(1); }}
                className="border border-border-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-uni-text-500 uppercase tracking-wide">At�</label>
              <input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPage(1); }}
                className="border border-border-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={action}
            onChange={e => handleActionChange(e.target.value)}
            className="text-sm border border-border-1 rounded-lg px-3 py-2 bg-white text-uni-text-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value="">Todas as ações</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por usu�rio, ação, entidade..."
            className="flex-1 min-w-[200px] border border-border-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-1 text-xs font-bold text-uni-text-600 hover:bg-cream-50 transition-all"
          >
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <SectionHeader
          title="Log de Auditoria"
          count={data?.total}
        />

        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-uni-text-400">
            <div className="text-2xl mb-2">📋</div>
            Nenhum registro de auditoria encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border-1">
              {logs.map((log) => {
                const detailsObj = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
                const detailStr = Object.entries(detailsObj).map(([k, v]) => `${k}: ${v}`).join(', ');
                const dt = log.created_at.replace('T', ' ').slice(0, 19);
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold', getAuditBadgeClass(log.action))}>
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        {log.entity_label && (
                          <span className="ml-2 text-xs text-uni-text-600 font-medium">{log.entity_label}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-uni-text-400 flex-shrink-0 font-mono">{dt}</span>
                    </div>
                    <div className="text-[11px] text-uni-text-500">
                      <span className="font-medium text-uni-text-700">{log.actor_email}</span>
                      {log.entity_type && <span className="ml-1 text-uni-text-400">· {log.entity_type}</span>}
                    </div>
                    {detailStr && (
                      <div className="text-[11px] text-uni-text-400 truncate">{detailStr}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-1">
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Data/Hora</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Ator</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">A��o</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Entidade</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Detalhes</th>
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-1">
                  {logs.map((log) => {
                    const detailsObj = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
                    const detailStr = Object.entries(detailsObj).map(([k, v]) => `${k}: ${v}`).join(', ');
                    const dt = log.created_at.replace('T', ' ').slice(0, 19);
                    return (
                      <tr key={log.id} className="hover:bg-cream-50/30 transition-colors">
                        <td className="px-6 py-3 text-[11px] font-mono text-uni-text-500 whitespace-nowrap">{dt}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-uni-text-800 truncate max-w-[160px]">{log.actor_email}</div>
                          <div className="text-[10px] text-uni-text-400">{log.actor_role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', getAuditBadgeClass(log.action))}>
                            {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.entity_label ? (
                            <div>
                              <div className="text-xs font-medium text-uni-text-800">{log.entity_label}</div>
                              {log.entity_type && <div className="text-[10px] text-uni-text-400">{log.entity_type}</div>}
                            </div>
                          ) : <span className="text-uni-text-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-uni-text-500 max-w-[200px] truncate">
                          {detailStr || <span className="text-uni-text-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-[11px] font-mono text-uni-text-400">{log.ip ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border-1">
                <span className="text-xs text-uni-text-500">
                  Página {data.page} de {data.pages} · {data.total} registros
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-1 text-uni-text-600 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ← Anterior
                  </button>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-1 text-uni-text-600 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Pr?xima ?
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Visão Geral');
  const { data: sysStats } = useSWR<SystemStats>('/api/admin/system', fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (isAuthenticated && user && user.isMasterAdmin !== true) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (user?.isMasterAdmin !== true) return null;

  const tabCounts: Partial<Record<Tab, number>> = {
    'Empresas': sysStats?.companies,
    'Usuários': sysStats?.users,
    'Badges': sysStats?.badges,
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-uni-text-900">
            Painel <span className="text-rose-500">UniHER</span>
          </h1>
          <p className="text-sm text-uni-text-500 mt-1">Gestão global da plataforma</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Admin UniHER
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            count={tabCounts[tab]}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'Visão Geral' && <OverviewTab />}
        {activeTab === 'Empresas' && <CompaniesTab onGoToUsers={() => setActiveTab('Usuários')} />}
        {activeTab === 'Usuários' && <UsersTab />}
        {activeTab === 'Admin Master' && <AdminMasterTab />}
        {activeTab === 'Badges' && <BadgesTab />}
        {activeTab === 'Sistema' && <SystemTab />}
        {activeTab === 'Alertas' && <AlertasTab />}
        {activeTab === 'Auditoria' && <AuditoriaTab />}
      </div>
    </div>
  );
}
