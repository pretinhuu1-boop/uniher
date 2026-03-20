'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CustomLeague {
  id: string; name: string; description: string | null;
  type: 'opt_in' | 'department' | 'company';
  icon: string; color: string; is_active: number;
  member_count: number; created_by_name: string | null;
}

const TYPE_LABELS = { opt_in: 'Opt-in (livre)', department: 'Por Setor', company: 'Toda Empresa' };
const TYPE_DESC = {
  opt_in: 'Colaboradoras se inscrevem voluntariamente.',
  department: 'Inscreve automaticamente todos de um setor.',
  company: 'Inscreve automaticamente toda a empresa.',
};

const EMPTY_FORM = { name: '', description: '', type: 'opt_in' as 'opt_in' | 'department' | 'company', icon: '🏆', color: '#C8547E' };

export default function GerenciarLigasPage() {
  const [leagues, setLeagues] = useState<CustomLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomLeague | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/rh/leagues');
      const d = await res.json();
      setLeagues(d.leagues || []);
    } catch { /* noop */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true);
  }

  function startEdit(l: CustomLeague) {
    setEditTarget(l);
    setForm({ name: l.name, description: l.description || '', type: l.type, icon: l.icon, color: l.color });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      const url = editTarget ? `/api/rh/leagues/${editTarget.id}` : '/api/rh/leagues';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (d.success) { setFeedback({ type: 'success', msg: editTarget ? 'Liga atualizada!' : 'Liga criada!' }); setShowForm(false); load(); }
      else setFeedback({ type: 'error', msg: d.error || 'Erro' });
    } catch { setFeedback({ type: 'error', msg: 'Erro de conexão' }); }
    setSaving(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function toggleActive(l: CustomLeague) {
    const res = await fetch(`/api/rh/leagues/${l.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !l.is_active }) });
    const d = await res.json();
    if (d.success) { setFeedback({ type: 'success', msg: l.is_active ? 'Liga desativada' : 'Liga ativada' }); load(); }
    setTimeout(() => setFeedback(null), 2000);
  }

  async function deleteLeague(l: CustomLeague) {
    if (!confirm(`Excluir a liga "${l.name}"? Todos os dados de ranking serão perdidos.`)) return;
    const res = await fetch(`/api/rh/leagues/${l.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { setFeedback({ type: 'success', msg: 'Liga excluída' }); load(); }
    setTimeout(() => setFeedback(null), 2000);
  }

  const ICONS = ['🏆', '🎯', '💪', '🌟', '🔥', '💡', '🚀', '🌸', '💎', '🦋'];

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-6 font-body animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-uni-text-900">Gerenciar Ligas</h1>
          <p className="text-uni-text-500 mt-1">Crie ligas por setor, empresa ou opt-in para engajar sua equipe.</p>
        </div>
        <button onClick={startCreate} className="px-5 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 active:scale-95 transition-all shadow-sm">
          + Nova Liga
        </button>
      </div>

      {feedback && (
        <div className={cn("p-4 rounded-xl border font-bold text-sm", feedback.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
          {feedback.type === 'success' ? '✔ ' : '✗ '}{feedback.msg}
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(TYPE_LABELS).map(([k, label]) => (
          <div key={k} className="bg-white border border-border-1 rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-uni-text-900 text-sm mb-1">{label}</div>
            <div className="text-xs text-uni-text-500">{TYPE_DESC[k as keyof typeof TYPE_DESC]}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-uni-text-900 text-lg">{editTarget ? 'Editar Liga' : 'Nova Liga'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" placeholder="Ex: Liga do Bem-estar" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Descrição (opcional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" placeholder="Descreva a liga..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-white">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Cor</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-border-1 cursor-pointer p-1" />
                <span className="text-sm text-uni-text-500">{form.color}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-uni-text-600 mb-2">Ícone</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    className={cn("w-10 h-10 text-xl rounded-xl border-2 transition-all", form.icon === icon ? "border-rose-400 bg-rose-50" : "border-border-1 bg-white hover:border-rose-200")}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border-1 text-uni-text-600 text-sm font-bold hover:bg-cream-50 transition-all">Cancelar</button>
            <button onClick={save} disabled={saving || !form.name}
              className="px-6 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 disabled:opacity-50 transition-all">
              {saving ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar Liga'}
            </button>
          </div>
        </div>
      )}

      {/* League List */}
      {loading ? (
        <div className="text-center py-12 text-uni-text-400">Carregando...</div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border-1 rounded-2xl">
          <div className="text-5xl mb-3">🏆</div>
          <p className="font-bold text-uni-text-600">Nenhuma liga criada ainda.</p>
          <p className="text-sm text-uni-text-400 mt-1">Crie sua primeira liga para engajar a equipe!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map(l => (
            <div key={l.id} className={cn("bg-white border rounded-2xl p-5 shadow-sm flex items-start gap-4 flex-wrap", !l.is_active && "opacity-60 border-dashed")}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border-2"
                   style={{ borderColor: l.color + '40', backgroundColor: l.color + '15' }}>
                {l.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-uni-text-900">{l.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-100 text-uni-text-500">{TYPE_LABELS[l.type]}</span>
                  {!l.is_active && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inativa</span>}
                </div>
                {l.description && <p className="text-xs text-uni-text-500 mb-2">{l.description}</p>}
                <div className="text-xs text-uni-text-400 flex gap-3 flex-wrap">
                  <span>👥 {l.member_count} membro{l.member_count !== 1 ? 's' : ''}</span>
                  {l.created_by_name && <span>Criada por {l.created_by_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button onClick={() => startEdit(l)} className="px-3 py-1.5 text-xs font-bold border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all">
                  ✏️ Editar
                </button>
                <button onClick={() => toggleActive(l)}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    l.is_active ? "border border-amber-200 text-amber-600 hover:bg-amber-50" : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50")}>
                  {l.is_active ? '🔒 Desativar' : '✅ Ativar'}
                </button>
                <button onClick={() => deleteLeague(l)} className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-all">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
