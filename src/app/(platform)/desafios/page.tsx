'use client';

import { useState, useMemo } from 'react';
import { useCollaboratorChallenges, useCollaboratorHome } from '@/hooks/useCollaborator';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type TabKey = 'active' | 'completed' | 'locked';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Em Andamento' },
  { key: 'completed', label: 'Concluidos' },
  { key: 'locked', label: 'Próximos' },
];

const CATEGORIES = ['Hábitos', 'Saúde Mental', 'Prevenção', 'Sono', 'Nutrição'];

export default function DesafiosPage() {
  const { challenges, isLoading, mutate: mutateChallenges } = useCollaboratorChallenges();
  const { mutate: mutateHome } = useCollaboratorHome();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Form State para Novo Desafio (RH ou Auto-desafio)
  const [form, setForm] = useState({ title: '', desc: '', cat: CATEGORIES[0], total: 5, pts: 100 });

  const filtered = useMemo(() => {
    return (challenges || []).filter((c: any) => c.status === activeTab);
  }, [challenges, activeTab]);

  const handleIncrement = async (id: string, total: number, cur: number) => {
    if (cur >= total) return;
    setLoadingId(id);
    try {
      await fetch('/api/collaborator/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: id, increment: 1 })
      });
      mutateChallenges();
      mutateHome(); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.title) return;
    try {
      await fetch('/api/collaborator/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.desc,
          category: form.cat,
          points: form.pts,
          totalSteps: form.total
        })
      });
      mutateChallenges();
      setIsModalOpen(false);
      setForm({ title: '', desc: '', cat: CATEGORIES[0], total: 5, pts: 100 });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 animate-fadeIn font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-uni-text-900">Meus Desafios</h1>
          <p className="text-uni-text-500 mt-1">Pequenos passos diários para grandes conquistas em saúde.</p>
        </div>
        <Button 
          variant="outline" 
          className="rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
          onClick={() => setIsModalOpen(true)}
        >
          + Novo Desafio
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/50 backdrop-blur-sm border border-border-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === tab.key 
                ? "bg-white text-rose-500 shadow-sm border border-rose-100" 
                : "text-uni-text-400 hover:text-uni-text-900"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Challenges List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse">Carregando seus desafios...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-[2rem] border border-dashed border-border-1 space-y-2">
            <span className="text-4xl block">🎯</span>
            <p className="text-uni-text-700 font-medium">Nenhum desafio em &quot;{TABS.find(t => t.key === activeTab)?.label}&quot;</p>
            <p className="text-sm text-uni-text-400">Seus desafios aparecerão aqui! O RH da sua empresa irá criar desafios para você participar.</p>
          </div>
        ) : (
          filtered.map((c: any) => (
            <div 
              key={c.id}
              className={cn(
                "group relative bg-white border border-border-1 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300",
                expandedId === c.id && "ring-2 ring-rose-100"
              )}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                    {c.category === 'Saúde Mental' ? '🧘' : c.category === 'Prevenção' ? '🏥' : c.category === 'Nutrição' ? '🍎' : '💧'}
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-uni-text-900 leading-tight">{c.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400">{c.category}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-emerald-600">+{c.points} pts</span>
                  {c.status === 'completed' && <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Concluído!</span>}
                </div>
              </div>

              <p className="text-sm text-uni-text-600 mb-8 leading-relaxed">
                {c.description}
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-uni-text-400 uppercase tracking-widest">Seu Progresso</span>
                  <span className="text-sm font-bold text-uni-text-900">{c.progress} / {c.total}</span>
                </div>
                <div className="h-3 w-full bg-cream-100 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${(c.progress / c.total) * 100}%` }} 
                  />
                </div>
              </div>

              {c.status === 'active' && (
                <div className="mt-8 flex gap-3">
                  <Button 
                    className="flex-1 rounded-2xl shadow-lg shadow-rose-500/10"
                    disabled={loadingId === c.id}
                    onClick={() => handleIncrement(c.id, c.total, c.progress)}
                  >
                    {loadingId === c.id ? 'Registrando...' : 'Registrar Progresso'}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Desafio">
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-uni-text-400 uppercase tracking-widest px-1">Título</label>
            <input 
              className="w-full px-4 py-3 rounded-2xl border border-border-1 focus:ring-2 focus:ring-rose-200 outline-none"
              placeholder="Ex: Beber 2L de água"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-uni-text-400 uppercase tracking-widest px-1">Descrição</label>
            <textarea 
              className="w-full px-4 py-3 rounded-2xl border border-border-1 focus:ring-2 focus:ring-rose-200 outline-none h-24 resize-none"
              placeholder="Detalhes para te motivar..."
              value={form.desc}
              onChange={e => setForm({...form, desc: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] font-bold text-uni-text-400 uppercase tracking-widest px-1">Meta (Passos)</label>
              <input 
                type="number"
                className="w-full px-4 py-3 rounded-2xl border border-border-1 outline-none"
                value={form.total}
                onChange={e => setForm({...form, total: parseInt(e.target.value) || 1})}
              />
            </div>
             <div className="space-y-1">
              <label className="text-[10px] font-bold text-uni-text-400 uppercase tracking-widest px-1">Pontos</label>
              <input 
                type="number"
                className="w-full px-4 py-3 rounded-2xl border border-border-1 outline-none"
                value={form.pts}
                onChange={e => setForm({...form, pts: parseInt(e.target.value) || 10})}
              />
            </div>
          </div>
          <div className="pt-4">
            <Button className="w-full rounded-2xl py-4 text-lg" onClick={handleCreate}>Começar Desafio!</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
