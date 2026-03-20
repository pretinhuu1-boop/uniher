'use client';

import { useState } from 'react';
import useSWR from 'swr';
import styles from './convites.module.css';

type Tab = 'invites' | 'pending';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ROLE_OPTIONS = [
  { value: 'colaboradora', label: 'Colaboradora' },
  { value: 'lideranca', label: 'Liderança' },
  { value: 'rh', label: 'RH' },
];

const ROLE_LABELS: Record<string, string> = {
  colaboradora: 'Colaboradora',
  lideranca: 'Liderança',
  rh: 'RH',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pendente',  className: styles.statusPending },
  accepted: { label: 'Aceito',    className: styles.statusAccepted },
  expired:  { label: 'Expirado',  className: styles.statusExpired },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function getMinExpiry() {
  // Add 5 min buffer so the input doesn't start in the past
  return new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
}

function getMaxExpiry() {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function getDefaultExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default function ConvitesPage() {
  const [tab, setTab] = useState<Tab>('invites');

  const { data, mutate } = useSWR<{ invites: any[] }>('/api/invites', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: deptData } = useSWR<{ departments: any[] }>('/api/departments', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: pendingData, mutate: mutatePending } = useSWR<{ users: any[] }>(
    '/api/invites/pending',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30_000 }
  );

  const invites = data?.invites ?? [];
  const departments = deptData?.departments ?? [];
  const pendingUsers = pendingData?.users ?? [];

  const [form, setForm] = useState({ email: '', role: 'colaboradora', department_id: '', expires_at: getDefaultExpiry() });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastInviteUrl, setLastInviteUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLastInviteUrl('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          department_id: form.department_id || null,
          expires_at: form.expires_at || undefined,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSuccessMsg(`Convite criado para ${d.email}`);
        setLastInviteUrl(d.inviteUrl);
        setForm({ email: '', role: 'colaboradora', department_id: '', expires_at: getDefaultExpiry() });
        mutate();
      } else {
        setError(d.error || 'Erro ao criar convite');
      }
    } catch {
      setError('Erro de conexão');
    }
    setSubmitting(false);
  }

  async function revokeInvite(token: string) {
    if (!confirm('Revogar este convite?')) return;
    try {
      await fetch(`/api/invites/${token}`, { method: 'DELETE' });
      mutate();
    } catch {
      alert('Erro ao revogar convite');
    }
  }

  async function approveUser(userId: string, action: 'approve' | 'reject') {
    setApproving(userId);
    try {
      await fetch('/api/invites/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      mutatePending();
      mutate();
    } catch {
      alert('Erro ao processar aprovação');
    }
    setApproving(null);
  }

  async function copyLink(url: string, id: string) {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch { /* fallback below */ }
    }
    if (!copied) {
      // Fallback via execCommand (works on HTTP)
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); copied = true; } catch { /* noop */ }
      document.body.removeChild(el);
    }
    if (copied) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      prompt('Copie o link do convite:', url);
    }
  }

  const inviteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Convites</h1>
          <p className={styles.subtitle}>Convide colaboradoras e lideranças para a plataforma</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setTab('invites')}
          style={{
            padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
            border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === 'invites' ? 'var(--rose-500)' : 'var(--white)',
            color: tab === 'invites' ? 'var(--white)' : 'var(--text-600)',
            borderColor: tab === 'invites' ? 'var(--rose-500)' : 'var(--border-2)',
          }}
        >
          ✉️ Convites enviados
        </button>
        <button
          onClick={() => setTab('pending')}
          style={{
            padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
            border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === 'pending' ? 'var(--rose-500)' : 'var(--white)',
            color: tab === 'pending' ? 'var(--white)' : 'var(--text-600)',
            borderColor: tab === 'pending' ? 'var(--rose-500)' : 'var(--border-2)',
            position: 'relative' as const,
          }}
        >
          ⏳ Aprovações pendentes
          {pendingUsers.length > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6, background: '#ef4444',
              color: '#fff', borderRadius: '50%', width: 18, height: 18,
              fontSize: '0.65rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Aprovações pendentes ── */}
      {tab === 'pending' && (
        <div>
          <div className={styles.sectionTitle}>
            <span>⏳</span> Aguardando aprovação
            <span style={{ fontWeight: 400, color: 'var(--text-400)', fontSize: '0.78rem' }}>
              ({pendingUsers.length})
            </span>
          </div>
          {pendingUsers.length === 0 ? (
            <div className={styles.empty}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
              Nenhuma aprovação pendente.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Nome</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Papel</th>
                  <th className={styles.th}>Setor</th>
                  <th className={styles.th}>Cadastrado em</th>
                  <th className={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u: any) => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td} data-label="Nome">
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </td>
                    <td className={styles.td} data-label="Email">{u.email}</td>
                    <td className={styles.td} data-label="Papel">
                      <span className={styles.roleBadge}>{ROLE_LABELS[u.role] ?? u.role}</span>
                    </td>
                    <td className={styles.td} data-label="Setor">
                      {u.department_name ?? <span style={{ color: 'var(--text-400)' }}>—</span>}
                    </td>
                    <td className={styles.td} data-label="Cadastrado em">
                      {formatDate(u.created_at)}
                    </td>
                    <td className={styles.td} data-label="Ações">
                      <div className={styles.rowActions}>
                        <button
                          className={styles.rowBtn}
                          disabled={approving === u.id}
                          onClick={() => approveUser(u.id, 'approve')}
                          style={{ borderColor: '#16a34a', color: '#16a34a' }}
                        >
                          {approving === u.id ? '...' : '✓ Aprovar'}
                        </button>
                        <button
                          className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                          disabled={approving === u.id}
                          onClick={() => approveUser(u.id, 'reject')}
                        >
                          ✗ Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Aba: Convites enviados ── */}
      {tab === 'invites' && <>
      <div className={styles.formCard}>
        <div className={styles.formTitle}>
          <span>✉️</span> Enviar novo convite
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
        {successMsg && <div className={`${styles.alert} ${styles.alertSuccess}`}>✓ {successMsg}</div>}

        {lastInviteUrl && (
          <div className={styles.linkBox}>
            <span className={styles.linkText}>{lastInviteUrl}</span>
            <button
              className={`${styles.copyBtn} ${copiedId === 'new' ? styles.copyBtnCopied : ''}`}
              onClick={() => copyLink(lastInviteUrl, 'new')}
            >
              {copiedId === 'new' ? '✓ Copiado!' : 'Copiar link'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email *</label>
            <input
              type="email"
              required
              placeholder="colaboradora@empresa.com"
              className={styles.input}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Papel *</label>
            <select
              className={styles.select}
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Setor (opcional)</label>
            <select
              className={styles.select}
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            >
              <option value="">— Nenhum —</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Expiração *
              <span style={{ fontWeight: 400, color: 'var(--text-400)', fontSize: '0.75rem', marginLeft: 6 }}>
                (máx. 3 dias · uso único)
              </span>
            </label>
            <input
              type="datetime-local"
              required
              className={styles.input}
              value={form.expires_at}
              min={getMinExpiry()}
              max={getMaxExpiry()}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.email}
            className={styles.submitBtn}
          >
            {submitting ? 'Enviando...' : '+ Convidar'}
          </button>
        </form>
      </div>

      {/* ── Lista de convites ── */}
      <div className={styles.sectionTitle}>
        <span>📋</span> Convites enviados
        <span style={{ fontWeight: 400, color: 'var(--text-400)', fontSize: '0.78rem' }}>
          ({invites.length})
        </span>
      </div>

      {invites.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✉️</div>
          Nenhum convite enviado ainda.
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Papel</th>
              <th className={styles.th}>Setor</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Expira em</th>
              <th className={styles.th}>Convidado por</th>
              <th className={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv: any) => {
              const statusInfo = STATUS_LABELS[inv.status] ?? STATUS_LABELS.expired;
              const inviteUrl = `${inviteOrigin}/invite/${inv.token}`;
              return (
                <tr key={inv.id} className={styles.tr}>
                  <td className={styles.td} data-label="Email">
                    <span style={{ fontWeight: 600 }}>{inv.email}</span>
                  </td>
                  <td className={styles.td} data-label="Papel">
                    <span className={styles.roleBadge}>{ROLE_LABELS[inv.role] ?? inv.role}</span>
                  </td>
                  <td className={styles.td} data-label="Setor">
                    {inv.department_name ?? <span style={{ color: 'var(--text-400)' }}>—</span>}
                  </td>
                  <td className={styles.td} data-label="Status">
                    <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Expira em">
                    {inv.expires_at ? formatDateTime(inv.expires_at) : '—'}
                  </td>
                  <td className={styles.td} data-label="Convidado por">
                    {inv.invited_by_name ?? '—'}
                  </td>
                  <td className={styles.td} data-label="Ações">
                    <div className={styles.rowActions}>
                      {inv.status === 'pending' && (
                        <>
                          <button
                            className={`${styles.rowBtn} ${copiedId === inv.id ? styles.rowBtnCopied : ''}`}
                            onClick={() => copyLink(inviteUrl, inv.id)}
                          >
                            {copiedId === inv.id ? '✓ Copiado' : 'Copiar link'}
                          </button>
                          <button
                            className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                            onClick={() => revokeInvite(inv.token)}
                          >
                            Revogar
                          </button>
                        </>
                      )}
                      {inv.status !== 'pending' && (
                        <span style={{ color: 'var(--text-400)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </>}
    </div>
  );
}
