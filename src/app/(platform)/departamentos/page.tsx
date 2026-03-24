'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Department {
  id: string;
  name: string;
  color: string;
  user_count: number;
  created_at: string;
}

const DEFAULT_COLORS = [
  '#3E7D5A', '#E11D48', '#2563EB', '#D97706', '#7C3AED',
  '#0891B2', '#DC2626', '#059669', '#CA8A04', '#6366F1',
];

export default function DepartamentosPage() {
  const { user } = useAuth();
  const { data, mutate, isLoading } = useSWR<{ departments: Department[] }>('/api/rh/departments', fetcher, { revalidateOnFocus: false });
  const departments = data?.departments ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3E7D5A' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (user?.role !== 'rh' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-uni-text-400">
        Acesso restrito ao RH.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    setSubmitting(true);
    try {
      const isEdit = !!editId;
      const url = isEdit ? `/api/rh/departments/${editId}` : '/api/rh/departments';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setForm({ name: '', color: '#3E7D5A' });
        setShowForm(false);
        setEditId(null);
        mutate();
      } else {
        setError(d.error || 'Erro ao salvar');
      }
    } catch {
      setError('Erro de conexão');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/rh/departments/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        mutate();
        setDeleteConfirm(null);
      } else {
        alert(d.error || 'Erro ao excluir');
      }
    } catch {
      alert('Erro de conexão');
    }
  }

  function startEdit(dept: Department) {
    setEditId(dept.id);
    setForm({ name: dept.name, color: dept.color });
    setShowForm(true);
    setError('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', color: '#3E7D5A' });
    setError('');
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-uni-text-900">Departamentos</h1>
          <p className="text-sm text-uni-text-500 mt-1">Gerencie os departamentos da sua empresa</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', color: '#3E7D5A' }); setError(''); }}
            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 hover:-translate-y-0.5 transition-all"
          >
            + Novo Departamento
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-1 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-uni-text-900">
              {editId ? 'Editar Departamento' : 'Novo Departamento'}
            </h2>
            <button onClick={cancelForm} className="text-uni-text-400 hover:text-uni-text-600 text-sm font-bold">
              Cancelar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm font-semibold">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-uni-text-500 mb-1 block">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Marketing, Tecnologia, RH..."
                className="w-full border border-border-1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 transition-colors"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-uni-text-500 mb-2 block">Cor</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all',
                      form.color === c ? 'border-uni-text-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Departamento'}
            </button>
          </form>
        </div>
      )}

      {/* Department List */}
      <div className="bg-white rounded-xl border border-border-1 overflow-hidden">
        <div className="px-6 py-4 border-b border-border-1 flex items-center gap-3">
          <h2 className="text-base font-display font-bold text-uni-text-900">Seus Departamentos</h2>
          <span className="text-xs bg-cream-100 text-uni-text-500 px-2 py-0.5 rounded-full font-medium">{departments.length}</span>
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-sm text-uni-text-400">
            <span className="inline-block w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            Carregando...
          </div>
        ) : departments.length === 0 ? (
          <div className="p-10 text-center text-sm text-uni-text-400">
            Nenhum departamento cadastrado. Crie o primeiro!
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream-50/50 transition-colors">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                >
                  {d.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-uni-text-900 truncate">{d.name}</div>
                  <div className="text-[11px] text-uni-text-400">
                    {d.user_count} {d.user_count === 1 ? 'colaboradora' : 'colaboradoras'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(d)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                  >
                    Editar
                  </button>
                  {deleteConfirm === d.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold text-uni-text-400 hover:text-uni-text-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(d.id)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
