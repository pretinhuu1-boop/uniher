'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from '@/hooks/useAuth';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TYPE_LABELS: Record<string, string> = {
  weekly: '📅 Semanal',
  goal: '🎯 Meta',
  campaign: '🚀 Campanha',
};

const TARGET_LABELS: Record<string, string> = {
  points: 'Pontos acumulados',
  missions: 'Missões concluídas',
  level: 'Nível alcançado',
  streak: 'Dias seguidos',
  challenges: 'Desafios concluídos',
  campaign_join: 'Participar da campanha',
  campaign_complete: 'Completar campanha',
};

const REWARD_LABELS: Record<string, string> = {
  points: '💎 Pontos',
  badge: '🏅 Badge',
  custom: '🎁 Recompensa especial',
};

interface Objective {
  id: string;
  title: string;
  description: string | null;
  type: 'weekly' | 'goal' | 'campaign';
  target_type: string;
  target_value: number;
  campaign_id: string | null;
  campaign_name?: string;
  reward_type: string;
  reward_points: number;
  reward_badge_id: string | null;
  reward_badge_name?: string;
  reward_custom: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: number;
  // progress
  current_value?: number;
  completed?: number;
  reward_claimed?: number;
  week_key?: string;
}

function progressPercent(obj: Objective): number {
  if (!obj.target_value) return 0;
  return Math.min(100, Math.round(((obj.current_value ?? 0) / obj.target_value) * 100));
}

// ─── Colaboradora view ────────────────────────────────────────────────────────
function ColaboradoraView() {
  const { data, isLoading, mutate } = useSWR<{ objectives: Objective[] }>('/api/objectives', fetcher);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  async function claim(obj: Objective) {
    setClaiming(obj.id);
    const res = await fetch(`/api/objectives/${obj.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_key: obj.week_key }),
    });
    const json = await res.json();
    setClaiming(null);
    if (res.ok) {
      let msg = '🎉 Recompensa resgatada!';
      if (json.reward_type === 'points') msg += ` +${json.reward_points} pontos`;
      else if (json.reward_type === 'badge') msg += ` Badge "${json.reward_badge_name}" desbloqueado!`;
      else if (json.reward_custom) msg += ` ${json.reward_custom}`;
      setToast(msg);
      mutate();
      setTimeout(() => setToast(''), 5000);
    } else {
      setToast(json.error ?? 'Erro ao resgatar');
      setTimeout(() => setToast(''), 4000);
    }
  }

  const objectives = data?.objectives ?? [];
  const active = objectives.filter(o => !o.completed);
  const done = objectives.filter(o => o.completed);

  return (
    <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1a0a00', color: '#fdf6f0', borderRadius: 12,
          padding: '14px 20px', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
          border: '1px solid rgba(244,63,94,.3)', maxWidth: 360,
        }}>{toast}</div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', marginBottom: 4 }}>Objetivos & Recompensas</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>Complete os objetivos e resgate suas recompensas</p>

      {isLoading && <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Carregando...</p>}

      {!isLoading && objectives.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <p>Nenhum objetivo ativo no momento.</p>
          <p style={{ fontSize: 13 }}>Aguarde sua empresa configurar novos objetivos!</p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F43F5E', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Em andamento</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {active.map(obj => <ObjectiveCard key={obj.id} obj={obj} onClaim={claim} claiming={claiming} />)}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Concluídos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {done.map(obj => <ObjectiveCard key={obj.id} obj={obj} onClaim={claim} claiming={claiming} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ObjectiveCard({ obj, onClaim, claiming }: { obj: Objective; onClaim: (o: Objective) => void; claiming: string | null }) {
  const pct = progressPercent(obj);
  const canClaim = obj.completed && !obj.reward_claimed;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '18px 20px',
      border: obj.completed ? '2px solid #22c55e' : '1px solid #f0e6e6',
      boxShadow: '0 2px 12px rgba(0,0,0,.04)',
      opacity: obj.reward_claimed ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: '#fff0f3', color: '#F43F5E', textTransform: 'uppercase', letterSpacing: 0.5
            }}>{TYPE_LABELS[obj.type]}</span>
            {obj.reward_claimed && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Resgatado</span>}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', margin: 0 }}>{obj.title}</h3>
          {obj.description && <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>{obj.description}</p>}
        </div>
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <RewardBadge obj={obj} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
          <span>{TARGET_LABELS[obj.target_type] ?? obj.target_type}</span>
          <span style={{ fontWeight: 700, color: '#1a0a00' }}>
            {obj.current_value ?? 0} / {obj.target_value}
          </span>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 8,
            background: obj.completed ? '#22c55e' : 'linear-gradient(90deg, #F43F5E, #fb923c)',
            width: `${pct}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {obj.ends_at && (
        <p style={{ fontSize: 11, color: '#aaa', marginTop: 8, margin: '8px 0 0' }}>
          Encerra em {new Date(obj.ends_at).toLocaleDateString('pt-BR')}
        </p>
      )}

      {canClaim && (
        <button
          onClick={() => onClaim(obj)}
          disabled={claiming === obj.id}
          style={{
            marginTop: 14, width: '100%', padding: '10px 0',
            background: 'linear-gradient(135deg, #F43F5E, #fb923c)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          {claiming === obj.id ? 'Resgatando...' : '🎁 Resgatar Recompensa'}
        </button>
      )}
    </div>
  );
}

function RewardBadge({ obj }: { obj: Objective }) {
  if (obj.reward_type === 'points') {
    return (
      <div style={{ background: '#fff7ed', borderRadius: 10, padding: '6px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: 18 }}>💎</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>+{obj.reward_points}</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>pts</div>
      </div>
    );
  }
  if (obj.reward_type === 'badge') {
    return (
      <div style={{ background: '#fdf4ff', borderRadius: 10, padding: '6px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: 18 }}>🏅</div>
        <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 600 }}>Badge</div>
      </div>
    );
  }
  return (
    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '6px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 18 }}>🎁</div>
      <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Especial</div>
    </div>
  );
}

// ─── RH / Admin view ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'goal' as 'weekly' | 'goal' | 'campaign',
  target_type: 'missions' as string,
  target_value: 10,
  campaign_id: '',
  reward_type: 'points' as 'points' | 'badge' | 'custom',
  reward_points: 100,
  reward_badge_id: '',
  reward_custom: '',
  starts_at: '',
  ends_at: '',
};

function RHView() {
  const { data, isLoading, mutate } = useSWR<{ objectives: Objective[] }>('/api/rh/objectives', fetcher);
  const { data: campaigns } = useSWR<{ campaigns: { id: string; name: string }[] }>('/api/campaigns', fetcher);
  const { data: badges } = useSWR<{ badges: { id: string; name: string }[] }>('/api/admin/badges', fetcher);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError('');
    const body: Record<string, unknown> = {
      title: form.title, description: form.description || undefined,
      type: form.type, target_type: form.target_type, target_value: Number(form.target_value),
      reward_type: form.reward_type,
    };
    if (form.type === 'campaign') body.campaign_id = form.campaign_id;
    if (form.reward_type === 'points') body.reward_points = Number(form.reward_points);
    if (form.reward_type === 'badge') body.reward_badge_id = form.reward_badge_id;
    if (form.reward_type === 'custom') body.reward_custom = form.reward_custom;
    if (form.starts_at) body.starts_at = new Date(form.starts_at).toISOString();
    if (form.ends_at) body.ends_at = new Date(form.ends_at).toISOString();

    const res = await fetch('/api/rh/objectives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      mutate();
    } else {
      const j = await res.json();
      setError(typeof j.error === 'string' ? j.error : 'Erro ao criar objetivo');
    }
  }

  async function deleteObj(id: string) {
    if (!confirm('Desativar este objetivo?')) return;
    await fetch(`/api/rh/objectives/${id}`, { method: 'DELETE' });
    mutate();
  }

  const objectives = data?.objectives ?? [];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a0a00', margin: 0 }}>Objetivos & Recompensas</h1>
          <p style={{ color: '#888', fontSize: 14, margin: '4px 0 0' }}>Crie objetivos motivadores para sua equipe</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{
            background: 'linear-gradient(135deg, #F43F5E, #fb923c)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Novo Objetivo'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #f0e6e6', marginBottom: 28, boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a0a00', marginTop: 0, marginBottom: 20 }}>Novo Objetivo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <FormField label="Título *">
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: 7 missões esta semana" style={inputStyle} />
            </FormField>
            <FormField label="Tipo">
              <select value={form.type} onChange={e => set('type', e.target.value as typeof form.type)} style={inputStyle}>
                <option value="weekly">📅 Semanal (reseta toda semana)</option>
                <option value="goal">🎯 Meta única</option>
                <option value="campaign">🚀 Por campanha</option>
              </select>
            </FormField>
            <FormField label="O que medir">
              <select value={form.target_type} onChange={e => set('target_type', e.target.value)} style={inputStyle}>
                <option value="missions">Missões concluídas</option>
                <option value="points">Pontos acumulados</option>
                <option value="level">Nível alcançado</option>
                <option value="streak">Dias seguidos</option>
                <option value="challenges">Desafios concluídos</option>
                {form.type === 'campaign' && <option value="campaign_join">Participar da campanha</option>}
                {form.type === 'campaign' && <option value="campaign_complete">Completar campanha</option>}
              </select>
            </FormField>
            <FormField label={`Meta (${TARGET_LABELS[form.target_type] ?? form.target_type})`}>
              <input type="number" min={1} value={form.target_value} onChange={e => set('target_value', Number(e.target.value))} style={inputStyle} />
            </FormField>
            {form.type === 'campaign' && (
              <FormField label="Campanha vinculada">
                <select value={form.campaign_id} onChange={e => set('campaign_id', e.target.value)} style={inputStyle}>
                  <option value="">Selecione...</option>
                  {campaigns?.campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
            )}
            <FormField label="Tipo de recompensa">
              <select value={form.reward_type} onChange={e => set('reward_type', e.target.value as typeof form.reward_type)} style={inputStyle}>
                <option value="points">💎 Pontos</option>
                <option value="badge">🏅 Badge</option>
                <option value="custom">🎁 Recompensa especial</option>
              </select>
            </FormField>
            {form.reward_type === 'points' && (
              <FormField label="Quantidade de pontos">
                <input type="number" min={1} value={form.reward_points} onChange={e => set('reward_points', Number(e.target.value))} style={inputStyle} />
              </FormField>
            )}
            {form.reward_type === 'badge' && (
              <FormField label="Badge">
                <select value={form.reward_badge_id} onChange={e => set('reward_badge_id', e.target.value)} style={inputStyle}>
                  <option value="">Selecione um badge...</option>
                  {badges?.badges?.map((b: { id: string; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </FormField>
            )}
            {form.reward_type === 'custom' && (
              <FormField label="Descrição da recompensa">
                <input value={form.reward_custom} onChange={e => set('reward_custom', e.target.value)} placeholder="Ex: Vale folga, brinde, voucher..." style={inputStyle} />
              </FormField>
            )}
            <FormField label="Início (opcional)">
              <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label="Encerramento (opcional)">
              <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Descrição (opcional)">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Explique o objetivo para a equipe..." style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          {error && <p style={{ color: '#F43F5E', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button
            onClick={save}
            disabled={saving || !form.title}
            style={{
              marginTop: 16, background: 'linear-gradient(135deg, #F43F5E, #fb923c)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '11px 28px', fontSize: 14, fontWeight: 700,
              cursor: saving || !form.title ? 'not-allowed' : 'pointer',
              opacity: saving || !form.title ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : '✓ Criar Objetivo'}
          </button>
        </div>
      )}

      {isLoading && <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Carregando...</p>}

      {!isLoading && objectives.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <p>Nenhum objetivo criado ainda.</p>
          <p style={{ fontSize: 13 }}>Crie objetivos para motivar sua equipe!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {objectives.map(obj => (
          <div key={obj.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #f0e6e6', boxShadow: '0 2px 8px rgba(0,0,0,.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fff0f3', color: '#F43F5E' }}>{TYPE_LABELS[obj.type]}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f5f5f5', color: '#666' }}>{REWARD_LABELS[obj.reward_type]}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a0a00' }}>{obj.title}</h3>
                {obj.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{obj.description}</p>}
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#aaa' }}>
                  Meta: {obj.target_value} {TARGET_LABELS[obj.target_type]}
                  {obj.reward_type === 'points' && ` · Recompensa: ${obj.reward_points} pts`}
                  {obj.reward_type === 'custom' && ` · ${obj.reward_custom}`}
                  {obj.reward_type === 'badge' && ` · Badge: ${obj.reward_badge_name ?? '—'}`}
                </p>
              </div>
              <button
                onClick={() => deleteObj(obj.id)}
                style={{ background: 'none', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >Desativar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, background: '#fafafa',
  boxSizing: 'border-box',
};

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ObjetivosPage() {
  const { user } = useAuth();
  const isRH = user?.role === 'rh' || user?.role === 'admin' || user?.role === 'lideranca';

  if (!user) return null;
  return isRH ? <RHView /> : <ColaboradoraView />;
}
