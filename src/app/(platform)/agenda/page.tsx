'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { FeedbackState } from '@/components/ui/FeedbackState';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TYPE_LABELS: Record<string, string> = { exame: 'Exame', consulta: 'Consulta', lembrete: 'Lembrete' };
const TYPE_ICONS: Record<string, string> = { exame: '🏥', consulta: '👩‍⚕️', lembrete: '🔔' };
const STATUS_LABELS: Record<string, string> = { pending: 'Pendente', completed: 'Realizado', cancelled: 'Cancelado', missed: 'Perdido' };
const STATUS_COLORS: Record<string, string> = { pending: '#C9A264', completed: '#16a34a', cancelled: '#9ca3af', missed: '#dc2626' };

function getMonthStr(d: Date) { return d.toISOString().slice(0, 7); }
function formatDate(s: string) { const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default function AgendaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canUsePersonalAgenda = user?.role === 'colaboradora' || user?.also_collaborator === 1;
  const [month, setMonth] = useState(getMonthStr(new Date()));
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'exame', date: '', time: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const params = new URLSearchParams({ month });
  if (filterType) params.set('type', filterType);

  const { data, mutate, isLoading } = useSWR(
    canUsePersonalAgenda ? `/api/collaborator/agenda?${params}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const events = data?.events ?? [];

  const handleSubmit = useCallback(async () => {
    if (!form.title || !form.date) { setMsg('Preencha título e data'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/collaborator/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('Evento criado!');
        setForm({ title: '', type: 'exame', date: '', time: '', notes: '' });
        setShowForm(false);
        mutate();
      } else {
        const d = await res.json();
        setMsg(d.error || 'Erro ao criar');
      }
    } catch { setMsg('Erro de conexão'); }
    setSaving(false);
  }, [form, mutate]);

  const markCompleted = useCallback(async (id: string) => {
    await fetch(`/api/collaborator/agenda/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    mutate();
  }, [mutate]);

  const cancelEvent = useCallback(async (id: string) => {
    if (!confirm('Cancelar este evento?')) return;
    await fetch(`/api/collaborator/agenda/${id}`, { method: 'DELETE' });
    mutate();
  }, [mutate]);

  // Month navigation
  const prevMonth = () => { const d = new Date(month + '-15'); d.setMonth(d.getMonth() - 1); setMonth(getMonthStr(d)); };
  const nextMonth = () => { const d = new Date(month + '-15'); d.setMonth(d.getMonth() + 1); setMonth(getMonthStr(d)); };
  const monthLabel = new Date(month + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Group events by date
  const grouped: Record<string, typeof events> = {};
  events.forEach((e: any) => { (grouped[e.date] ??= []).push(e); });

  if (authLoading) {
    return (
      <FeedbackState
        kind="loading"
        title="Carregando sua agenda"
        description="Estamos confirmando seu acesso aos lembretes pessoais."
      />
    );
  }

  if (!canUsePersonalAgenda) {
    return (
      <FeedbackState
        kind="denied"
        title="Agenda pessoal indisponível"
        description="Este perfil não possui acesso persistido à experiência de colaboradora."
      />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--ff-body, Montserrat, sans-serif)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontFamily: 'var(--ff-display, Playfair Display, serif)', fontWeight: 700, color: '#1a2a4a', margin: 0 }}>
            📅 Minha Agenda de Exames
          </h1>
          <p style={{ color: '#8a7a6a', fontSize: 14, marginTop: 4 }}>
            Acompanhe exames, consultas, lembretes e histórico realizado.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: '#C9A264', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Novo evento
        </button>
      </div>

      {/* New event form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8dfd0', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a4a', marginBottom: 16 }}>Novo Evento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: 1 }}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Mamografia anual" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8dfd0', fontSize: 14, marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: 1 }}>Tipo *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8dfd0', fontSize: 14, marginTop: 4 }}>
                <option value="exame">🏥 Exame</option>
                <option value="consulta">👩‍⚕️ Consulta</option>
                <option value="lembrete">🔔 Lembrete</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: 1 }}>Data *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8dfd0', fontSize: 14, marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: 1 }}>Horário</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8dfd0', fontSize: 14, marginTop: 4 }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8a7a6a', letterSpacing: 1 }}>Observações</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Detalhes adicionais..." rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8dfd0', fontSize: 14, marginTop: 4, resize: 'vertical' }} />
          </div>
          {msg && <p style={{ color: msg.includes('!') ? '#16a34a' : '#dc2626', fontSize: 13, marginTop: 8 }}>{msg}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', background: '#C9A264', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: 'transparent', color: '#8a7a6a', border: '1px solid #e8dfd0', borderRadius: 8, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ padding: '6px 14px', border: '1px solid #e8dfd0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16 }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#1a2a4a', textTransform: 'capitalize' }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ padding: '6px 14px', border: '1px solid #e8dfd0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16 }}>→</button>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'exame', 'consulta', 'lembrete'].map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid #e8dfd0', fontSize: 13, cursor: 'pointer',
            background: filterType === t ? '#C9A264' : '#fff', color: filterType === t ? '#fff' : '#5a4a3a', fontWeight: filterType === t ? 600 : 400,
          }}>
            {t ? `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}` : 'Todos'}
          </button>
        ))}
      </div>

      {/* Events list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8a7a6a' }}>Carregando...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8a7a6a', background: '#fff', borderRadius: 12, border: '1px solid #e8dfd0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <p style={{ fontWeight: 600, color: '#5a4a3a' }}>Nenhum evento neste mês</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "+ Novo evento" para agendar um exame ou consulta.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([date, evts]) => (
            <div key={date}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A264', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                {formatDate(date)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(evts as any[]).map((e: any) => (
                  <div key={e.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e8dfd0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <span style={{ fontSize: 28 }}>{TYPE_ICONS[e.type] || '📋'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a2a4a' }}>
                          {e.title}
                          {e.time && <span style={{ fontSize: 12, color: '#8a7a6a', marginLeft: 8 }}>às {e.time}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>
                          <span style={{ background: `${STATUS_COLORS[e.status]}15`, color: STATUS_COLORS[e.status], padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                            {STATUS_LABELS[e.status] || e.status}
                          </span>
                        </div>
                        {e.notes && <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 4, fontStyle: 'italic' }}>{e.notes}</div>}
                      </div>
                    </div>
                    {e.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => markCompleted(e.id)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          ✓ Realizado
                        </button>
                        <button onClick={() => cancelEvent(e.id)} style={{ padding: '6px 12px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
