'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string; title: string; description: string; category: string;
  points: number; total_steps: number; deadline: string | null;
  is_default: number; is_active: number; overridden_from: string | null;
  created_by_name: string | null; company_id: string | null;
}

const EMPTY_FORM = { title: '', description: '', category: '', points: 100, total_steps: 7, deadline: '' };

export default function GerenciarDesafiosPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Challenge | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'default' | 'custom' | 'inactive'>('all');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/rh/challenges');
      const d = await res.json();
      setChallenges(d.challenges || []);
    } catch { /* noop */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(c: Challenge) {
    if (c.is_default) return; // defaults cannot be edited inline
    setEditTarget(c);
    setForm({ title: c.title, description: c.description, category: c.category, points: c.points, total_steps: c.total_steps, deadline: c.deadline || '' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      const url = editTarget ? `/api/rh/challenges/${editTarget.id}` : '/api/rh/challenges';
      const body = editTarget
        ? { action: 'update', ...form, points: Number(form.points), total_steps: Number(form.total_steps), deadline: form.deadline || null }
        : { ...form, points: Number(form.points), total_steps: Number(form.total_steps), deadline: form.deadline || null };

      const res = await fetch(url, { method: editTarget ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: editTarget ? 'Desafio atualizado!' : 'Desafio criado!' });
        setShowForm(false);
        load();
      } else {
        setFeedback({ type: 'error', msg: d.error || 'Erro ao salvar' });
      }
    } catch { setFeedback({ type: 'error', msg: 'Erro de conexão' }); }
    setSaving(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function toggle(c: Challenge) {
    const action = c.is_active ? 'deactivate' : 'activate';
    const res = await fetch(`/api/rh/challenges/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const d = await res.json();
    if (d.success) { setFeedback({ type: 'success', msg: c.is_active ? 'Desafio desativado' : 'Desafio ativado' }); load(); }
    setTimeout(() => setFeedback(null), 2000);
  }

  async function restore(c: Challenge) {
    const res = await fetch(`/api/rh/challenges/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore_default' }) });
    const d = await res.json();
    if (d.success) { setFeedback({ type: 'success', msg: 'Desafio restaurado ao padrão!' }); load(); }
    setTimeout(() => setFeedback(null), 2000);
  }

  async function deleteChallenge(c: Challenge) {
    if (!confirm(`Excluir "${c.title}"? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/rh/challenges/${c.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { setFeedback({ type: 'success', msg: 'Desafio excluído' }); load(); }
    setTimeout(() => setFeedback(null), 2000);
  }

  const filtered = challenges.filter(c => {
    if (filter === 'default') return c.is_default;
    if (filter === 'custom') return !c.is_default;
    if (filter === 'inactive') return !c.is_active;
    return true;
  });

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-6 font-body animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-uni-text-900">Gerenciar Desafios</h1>
          <p className="text-uni-text-500 mt-1">Crie, edite, ative/desative desafios para sua empresa.</p>
        </div>
        <button
          onClick={startCreate}
          className="px-5 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
        >
          + Novo Desafio
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn("p-4 rounded-xl border font-bold text-sm", feedback.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
          {feedback.type === 'success' ? '✔ ' : '✗ '}{feedback.msg}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-uni-text-900 text-lg">{editTarget ? 'Editar Desafio' : 'Novo Desafio'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" placeholder="Ex: 7 dias de exercícios" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Descrição *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" placeholder="Descreva o desafio..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Categoria *</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" placeholder="Ex: Bem-estar" />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Pontos</label>
              <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" min={1} max={5000} />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Etapas (total)</label>
              <input type="number" value={form.total_steps} onChange={e => setForm(f => ({ ...f, total_steps: Number(e.target.value) }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" min={1} max={1000} />
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-1">Prazo (opcional)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full border border-border-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border-1 text-uni-text-600 text-sm font-bold hover:bg-cream-50 transition-all">Cancelar</button>
            <button onClick={save} disabled={saving || !form.title || !form.description || !form.category}
              className="px-6 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 disabled:opacity-50 transition-all">
              {saving ? 'Salvando...' : editTarget ? 'Salvar Alterações' : 'Criar Desafio'}
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todos'], ['default', '⭐ Padrão'], ['custom', '✏️ Personalizados'], ['inactive', '🔒 Inativos']] .map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v as any)}
            className={cn("px-4 py-2 rounded-xl border text-sm font-bold transition-all",
              filter === v ? "bg-rose-500 text-white border-rose-500" : "bg-white border-border-1 text-uni-text-600 hover:border-rose-300"
            )}>
            {l}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-uni-text-400">{filtered.length} desafio{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Challenge List */}
      {loading ? (
        <div className="text-center py-12 text-uni-text-400">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className={cn(
              "bg-white border rounded-2xl p-5 shadow-sm",
              !c.is_active && "opacity-60 border-dashed",
              c.is_default && "border-amber-100 bg-amber-50/30"
            )}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-uni-text-900">{c.title}</h3>
                    {c.is_default === 1 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ Padrão</span>}
                    {c.overridden_from && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Sobrescrito</span>}
                    {!c.is_active && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
                  </div>
                  <p className="text-xs text-uni-text-500 mb-2 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-uni-text-400 flex-wrap">
                    <span className="bg-rose-50 text-rose-500 font-bold px-2 py-0.5 rounded-full">{c.category}</span>
                    <span>⭐ {c.points} pts</span>
                    <span>📊 {c.total_steps} etapas</span>
                    {c.deadline && <span>📅 {new Date(c.deadline).toLocaleDateString('pt-BR')}</span>}
                    {c.created_by_name && <span>Por {c.created_by_name}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {/* Edit — only custom */}
                  {!c.is_default && c.is_active && (
                    <button onClick={() => startEdit(c)}
                      className="px-3 py-1.5 text-xs font-bold border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all">
                      ✏️ Editar
                    </button>
                  )}

                  {/* Toggle active */}
                  <button onClick={() => toggle(c)}
                    className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      c.is_active
                        ? "border border-amber-200 text-amber-600 hover:bg-amber-50"
                        : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    )}>
                    {c.is_active ? '🔒 Desativar' : '✅ Ativar'}
                  </button>

                  {/* Restore default */}
                  {c.overridden_from && (
                    <button onClick={() => restore(c)}
                      className="px-3 py-1.5 text-xs font-bold border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-all">
                      ↩ Restaurar
                    </button>
                  )}

                  {/* Delete — only custom non-default */}
                  {!c.is_default && (
                    <button onClick={() => deleteChallenge(c)}
                      className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-all">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-uni-text-400">
              <div className="text-4xl mb-3">🏆</div>
              <p>Nenhum desafio encontrado neste filtro.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
