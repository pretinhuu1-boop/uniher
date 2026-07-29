'use client';

import { useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserRoleLabel } from '@/lib/users/role-label';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  blocked: number;
  approved: number;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  blocked: number;
  departments: { id: string; name: string; user_count: number }[];
}

interface Department {
  id: string;
  name: string;
  color: string;
  user_count: number;
}

interface EmployeeImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  insertedRows?: number;
  updatedRows?: number;
}

interface EmployeeImportPreviewRow {
  rowNumber: number;
  fullNamePreview: string;
  emailPreview: string;
  cpfLast4: string;
  rgLast4: string | null;
}

interface EmployeeImportErrorRow {
  rowNumber: number;
  cpfLast4: string | null;
  emailPreview: string | null;
  errors: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Shared Components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
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
    <span className={cn('inline-block w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin', className)} />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ColaboradorasGestaoPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [changeDeptUser, setChangeDeptUser] = useState<string | null>(null);
  const [changeDeptValue, setChangeDeptValue] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<EmployeeImportSummary | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<EmployeeImportPreviewRow[]>([]);
  const [importErrorRows, setImportErrorRows] = useState<EmployeeImportErrorRow[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'previewing' | 'ready' | 'committing' | 'done' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const importCommitInFlight = useRef(false);

  // Build query string
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filterDept) params.set('department', filterDept);
  if (filterRole) params.set('role', filterRole);
  if (filterStatus) params.set('status', filterStatus);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(page * PAGE_SIZE));

  const { data, mutate, isLoading } = useSWR<{
    users: User[];
    total: number;
    stats: Stats;
  }>(`/api/rh/users?${params.toString()}`, fetcher, { revalidateOnFocus: false });

  const { data: deptData } = useSWR<{ departments: Department[] }>('/api/rh/departments', fetcher, { revalidateOnFocus: false });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats;
  const departments = deptData?.departments ?? [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const doAction = useCallback(async (userId: string, action: string, extra?: Record<string, string | null>) => {
    setLoading(`${userId}-${action}`);
    try {
      await fetch(`/api/rh/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      mutate();
    } finally {
      setLoading(null);
    }
  }, [mutate]);

  const handleChangeDept = useCallback(async (userId: string) => {
    await doAction(userId, 'change_department', { department_id: changeDeptValue || null });
    setChangeDeptUser(null);
    setChangeDeptValue('');
  }, [doAction, changeDeptValue]);

  const handleImportPreview = useCallback(async (file: File | null) => {
    setImportFile(file);
    setImportSummary(null);
    setImportPreviewRows([]);
    setImportErrorRows([]);
    setImportMessage('');

    if (!file) {
      setImportStatus('idle');
      return;
    }

    setImportStatus('previewing');
    const form = new FormData();
    form.set('file', file);

    try {
      const res = await fetch('/api/rh/employees/import-preview', {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportStatus('error');
        setImportMessage(data.error || 'Nao foi possivel ler a planilha.');
        return;
      }
      setImportSummary(data.summary ?? null);
      setImportPreviewRows(data.validRows ?? []);
      setImportErrorRows(data.errorRows ?? []);
      setImportStatus((data.summary?.errorRows ?? 0) > 0 ? 'error' : 'ready');
      setImportMessage((data.summary?.errorRows ?? 0) > 0
        ? 'Corrija os erros da planilha antes de confirmar.'
        : 'Previa validada. Confira os totais e confirme para gravar.');
    } catch {
      setImportStatus('error');
      setImportMessage('Erro de conexao ao validar a planilha.');
    }
  }, []);

  const commitImport = useCallback(async () => {
    if (!importFile || importCommitInFlight.current) return;

    importCommitInFlight.current = true;
    setImportStatus('committing');
    setImportMessage('');
    const form = new FormData();
    form.set('file', importFile);

    try {
      const res = await fetch('/api/rh/employees/import-commit', {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportStatus('error');
        setImportSummary(data.summary ?? importSummary);
        setImportErrorRows(data.errorRows ?? []);
        setImportMessage(data.error || 'Nao foi possivel importar a planilha.');
        return;
      }
      setImportSummary(data.summary ?? null);
      setImportPreviewRows([]);
      setImportErrorRows([]);
      setImportStatus('done');
      setImportMessage('Importacao concluida com seguranca.');
      mutate();
    } catch {
      setImportStatus('error');
      setImportMessage('Erro de conexao ao importar a planilha.');
    } finally {
      importCommitInFlight.current = false;
    }
  }, [importFile, importSummary, mutate]);

  // ─── Edit modal state ───
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department_id: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [resetResult, setResetResult] = useState('');

  function openEditModal(u: User) {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      department_id: u.department_id || '',
    });
    setEditMsg('');
    setResetResult('');
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditSaving(true);
    setEditMsg('');
    try {
      // Update name via dedicated endpoint
      const res = await fetch(`/api/rh/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          name: editForm.name,
          role: editForm.role,
          department_id: editForm.department_id || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setEditMsg('Salvo com sucesso!');
        mutate();
        setTimeout(() => setEditUser(null), 1000);
      } else {
        setEditMsg(d.error || 'Erro ao salvar');
      }
    } catch {
      setEditMsg('Erro de conexão');
    }
    setEditSaving(false);
  }

  async function resetPassword() {
    if (!editUser) return;
    setResetResult('');
    try {
      const res = await fetch(`/api/rh/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });
      const d = await res.json();
      if (res.ok) {
        setResetResult(`Nova senha: ${d.temporaryPassword || d.password || 'Enviada por email'}`);
      } else {
        setResetResult(d.error || 'Erro ao resetar');
      }
    } catch {
      setResetResult('Erro de conexão');
    }
  }

  async function softDelete() {
    if (!editUser) return;
    if (!confirm(`Remover ${editUser.name}? Esta ação pode ser revertida pelo admin.`)) return;
    try {
      const res = await fetch(`/api/rh/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'soft_delete' }),
      });
      if (res.ok) {
        setEditUser(null);
        mutate();
      }
    } catch {}
  }

  if (user?.role !== 'rh' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-uni-text-400">
        Acesso restrito ao RH.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-uni-text-900">Gestão de Colaboradoras</h1>
          <p className="text-sm text-uni-text-500 mt-1">Gerencie colaboradoras, lideranças e cadastros importados da sua empresa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/rh/employees/import-template"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-border-1 bg-white px-3 py-2 text-xs font-bold text-uni-text-700 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar modelo
          </a>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Importar planilha
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => handleImportPreview(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {/* Spreadsheet Import */}
      <section className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-uni-text-900">Importação por planilha</h2>
              <p className="text-[11px] text-uni-text-500">Preview mascarado antes da gravação. CPF e RG não aparecem na tela.</p>
            </div>
          </div>
          <button
            onClick={commitImport}
            disabled={!importFile || importStatus !== 'ready'}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-200 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {importStatus === 'committing' ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-2 text-xs text-uni-text-500 md:flex-row md:items-center md:justify-between">
            <span className="font-medium text-uni-text-700">
              {importFile ? importFile.name : 'Nenhum arquivo selecionado'}
            </span>
            {importStatus === 'previewing' && <span className="font-semibold text-uni-text-500">Validando planilha...</span>}
            {importMessage && (
              <span className={cn(
                'inline-flex items-center gap-1 font-semibold',
                importStatus === 'error' ? 'text-amber-700' : 'text-emerald-700'
              )}>
                {importStatus === 'error' && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                {importMessage}
              </span>
            )}
          </div>

          {importSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <StatCard label="Linhas" value={importSummary.totalRows} />
              <StatCard label="Válidas" value={importSummary.validRows} accent="text-emerald-600" />
              <StatCard label="Erros" value={importSummary.errorRows} accent={importSummary.errorRows > 0 ? 'text-amber-600' : 'text-uni-text-900'} />
              <StatCard label="Criadas" value={importSummary.insertedRows ?? '-'} />
              <StatCard label="Atualizadas" value={importSummary.updatedRows ?? '-'} />
            </div>
          )}

          {importPreviewRows.length > 0 && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="text-[11px] font-bold uppercase text-emerald-800 mb-2">Prévia segura</div>
              <div className="grid gap-2 md:grid-cols-2">
                {importPreviewRows.slice(0, 4).map((row) => (
                  <div key={row.rowNumber} className="rounded-md bg-white border border-emerald-100 p-3 text-xs">
                    <div className="font-bold text-uni-text-800">{row.fullNamePreview}</div>
                    <div className="text-uni-text-500">{row.emailPreview}</div>
                    <div className="mt-1 text-[11px] text-uni-text-400">CPF final {row.cpfLast4} {row.rgLast4 ? `- RG final ${row.rgLast4}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importErrorRows.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-[11px] font-bold uppercase text-amber-800 mb-2">Erros para corrigir</div>
              <div className="space-y-2">
                {importErrorRows.slice(0, 5).map((row) => (
                  <div key={`${row.rowNumber}-${row.cpfLast4 ?? 'sem-cpf'}`} className="text-xs text-amber-900">
                    Linha {row.rowNumber}: {row.errors.join('; ')}
                    {row.emailPreview && <span className="text-amber-700"> - {row.emailPreview}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} sub="colaboradoras" />
          <StatCard label="Ativas" value={stats.active} sub="sem bloqueio" accent="text-emerald-600" />
          <StatCard label="Bloqueadas" value={stats.blocked} sub="acesso negado" accent="text-red-600" />
          <StatCard label="Departamentos" value={stats.departments.length} sub="cadastrados" accent="text-blue-600" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              className="w-full border border-border-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <select
            className="border border-border-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 bg-white"
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(0); }}
          >
            <option value="">Todos departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className="border border-border-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 bg-white"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(0); }}
          >
            <option value="">Todos os papéis</option>
            <option value="colaboradora">Colaboradora</option>
            <option value="lideranca">Liderança</option>
            <option value="rh">Admin</option>
          </select>
          <select
            className="border border-border-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 bg-white"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          >
            <option value="">Todos status</option>
            <option value="active">Ativas</option>
            <option value="blocked">Bloqueadas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <div className="px-6 py-4 border-b border-border-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-display font-bold text-uni-text-900">Colaboradoras</h2>
            <span className="text-xs bg-cream-100 text-uni-text-500 px-2 py-0.5 rounded-full font-medium">{total}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <Spinner /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👩‍💼</div>
            <p style={{ fontWeight: 600, color: '#1a2a4a', fontSize: 16 }}>Nenhuma colaboradora encontrada</p>
            <p style={{ color: '#8a7a6a', fontSize: 13, marginTop: 4 }}>Importe uma planilha no botão acima, envie convites manuais em "Convites" ou ajuste os filtros para encontrar quem procura.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border-1">
              {users.map((u) => {
                const isBlocked = u.blocked === 1;
                const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
                const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className={cn('p-4 space-y-3', isBlocked && 'bg-red-50/40')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-uni-text-900 text-sm leading-snug break-words [overflow-wrap:anywhere]">{u.name}</div>
                          <div className="text-[11px] text-uni-text-400 mt-0.5 leading-snug break-words [overflow-wrap:anywhere]">{u.email}</div>
                        </div>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                        isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                        {isBlocked ? 'Bloqueada' : 'Ativa'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-uni-text-500">
                      <span className="bg-cream-100 px-2 py-0.5 rounded-full font-bold text-uni-text-600">
                        {getUserRoleLabel(u.role)}
                      </span>
                      {u.department_name && <span className="min-w-0 break-words [overflow-wrap:anywhere]">{u.department_name}</span>}
                    </div>
                    <div className="flex gap-2">
                      {u.role !== 'rh' && (
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
                      )}
                      <button
                        onClick={() => { setChangeDeptUser(changeDeptUser === u.id ? null : u.id); setChangeDeptValue(u.department_id || ''); }}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                      >
                        Mudar Setor
                      </button>
                    </div>
                    {changeDeptUser === u.id && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="min-w-0 flex-1 border border-border-1 rounded-lg px-2 py-1.5 text-xs bg-white"
                          value={changeDeptValue}
                          onChange={(e) => setChangeDeptValue(e.target.value)}
                        >
                          <option value="">Sem departamento</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button
                          onClick={() => handleChangeDept(u.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all"
                        >
                          Salvar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border-1">
                    <th className="text-left px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Colaboradora</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Departamento</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Papel</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Status</th>
                    <th className="text-right px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-uni-text-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-1">
                  {users.map((u) => {
                    const isBlocked = u.blocked === 1;
                    const blockKey = `${u.id}-${isBlocked ? 'unblock' : 'block'}`;
                    const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr key={u.id} className={cn('transition-colors', isBlocked ? 'bg-red-50/40' : 'hover:bg-cream-50/50')}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-uni-text-900">{u.name}</div>
                              <div className="text-[11px] text-uni-text-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {changeDeptUser === u.id ? (
                            <div className="flex gap-1.5 items-center">
                              <select
                                className="border border-border-1 rounded px-2 py-1 text-xs bg-white w-32"
                                value={changeDeptValue}
                                onChange={(e) => setChangeDeptValue(e.target.value)}
                              >
                                <option value="">Nenhum</option>
                                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                              <button
                                onClick={() => handleChangeDept(u.id)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500 text-white hover:bg-rose-600"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setChangeDeptUser(null)}
                                className="px-2 py-1 rounded text-[10px] font-bold text-uni-text-400 hover:text-uni-text-600"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-uni-text-600">{u.department_name || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold bg-cream-100 text-uni-text-600 px-2 py-0.5 rounded-full">
                            {getUserRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                            isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', isBlocked ? 'bg-red-500' : 'bg-emerald-500')} />
                            {isBlocked ? 'Bloqueada' : 'Ativa'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {u.role !== 'rh' && (
                              <button
                                onClick={() => doAction(u.id, isBlocked ? 'unblock' : 'block')}
                                disabled={loading === blockKey}
                                className={cn(
                                  'px-2 py-1 rounded-md text-[10px] font-bold transition-all',
                                  isBlocked
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100',
                                  loading === blockKey && 'opacity-50 cursor-wait'
                                )}
                              >
                                {loading === blockKey ? '...' : isBlocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                            )}
                            <button
                              onClick={() => { setChangeDeptUser(changeDeptUser === u.id ? null : u.id); setChangeDeptValue(u.department_id || ''); }}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                            >
                              Setor
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-gold-50 text-gold-700 hover:bg-gold-100 transition-all"
                            >
                              Editar
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border-1 flex items-center justify-between">
            <span className="text-[11px] text-uni-text-400">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-1 text-uni-text-600 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border-1 text-uni-text-600 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-display font-bold text-uni-text-900">Editar Colaboradora</h3>
              <button onClick={() => setEditUser(null)} className="text-uni-text-400 hover:text-uni-text-700 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Nome</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Email</label>
                <input value={editForm.email} disabled className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-cream-50 text-uni-text-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Papel</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="colaboradora">Colaboradora</option>
                  <option value="lideranca">Liderança</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-uni-text-600 mb-1 uppercase tracking-wide">Setor</label>
                <select value={editForm.department_id} onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value }))} className="w-full border border-border-1 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">— Nenhum —</option>
                  {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Info */}
            <div className="bg-cream-50 rounded-lg p-3 text-xs text-uni-text-500 space-y-1">
              <div>Criada em: {new Date(editUser.created_at).toLocaleDateString('pt-BR')}</div>
            </div>

            {editMsg && (
              <p className={cn('text-sm font-medium', editMsg.includes('sucesso') ? 'text-emerald-600' : 'text-red-600')}>{editMsg}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={saveEdit} disabled={editSaving} className="px-5 py-2 rounded-lg bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-50">
                {editSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button onClick={resetPassword} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-bold hover:bg-amber-50">
                🔑 Resetar Senha
              </button>
              <button onClick={softDelete} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-bold hover:bg-red-50">
                🗑 Remover
              </button>
              <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-lg border border-border-1 text-uni-text-600 text-sm hover:bg-cream-50 ml-auto">
                Cancelar
              </button>
            </div>

            {resetResult && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <strong>🔑 {resetResult}</strong>
                <button onClick={() => { navigator.clipboard.writeText(resetResult.replace('Nova senha: ', '')); }} className="ml-2 text-xs text-amber-700 underline">Copiar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
