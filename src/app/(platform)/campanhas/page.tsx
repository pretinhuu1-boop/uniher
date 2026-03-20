'use client';

import { useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const TEMAS = [
  { label: 'Saúde Mental', color: '#A48090', icon: '🧠' },
  { label: 'Prevenção', color: '#C85C7E', icon: '🌸' },
  { label: 'Hábitos Saudáveis', color: '#3E7D5A', icon: '🌿' },
  { label: 'Nutrição', color: '#EF9F27', icon: '🍎' },
] as const;

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

type FilterStatus = 'all' | 'active' | 'done' | 'next';

export default function CampanhasPage() {
  const { user } = useAuth();
  const { campaigns, isLoading, createCampaign, joinCampaign, mutate } = useCampaigns();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formTema, setFormTema] = useState<typeof TEMAS[number]['label']>(TEMAS[0].label);
  const [formMes, setFormMes] = useState<typeof MESES[number]>(MESES[new Date().getMonth()]);

  const isRH = user?.role === 'rh';

  const filteredCampaigns = campaigns.filter((c: any) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  const handleCreate = async () => {
    if (!formName) return;
    try {
      const temaObj = TEMAS.find(t => t.label === formTema);
      await createCampaign({
        name: formName,
        month: `${formMes} · ${formTema}`,
        color: temaObj?.color || '#C85C7E',
        status: 'next'
      });
      setIsModalOpen(false);
      setFormName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'next' ? 'active' : currentStatus === 'active' ? 'done' : 'next';
    const labelMap: Record<string, string> = { next: 'Próxima', active: 'Ativa', done: 'Concluída' };
    setLoadingAction(`status-${id}`);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, status_label: labelMap[next] }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    setLoadingAction(`delete-${id}`);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir campanha');
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleJoin = async (id: string) => {
    setLoadingAction(id);
    try {
      await joinCampaign(id);
      // O hook mutate revalida
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'done': return 'bg-rose-100 text-rose-700';
      default: return 'bg-cream-200 text-uni-text-500';
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 animate-fadeIn font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-uni-text-900">Campanhas Temáticas</h1>
          <p className="text-uni-text-500 mt-1">Conscientização e engajamento em saúde feminina ao longo do ano.</p>
        </div>
        
        {isRH && (
          <Button 
            className="rounded-2xl shadow-lg shadow-rose-500/20"
            onClick={() => setIsModalOpen(true)}
          >
            + Criar Campanha
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/50 backdrop-blur-sm border border-border-1 rounded-2xl w-fit">
        {['all', 'active', 'next', 'done'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f as FilterStatus)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all truncate uppercase tracking-widest",
              activeFilter === f 
                ? "bg-white text-rose-500 shadow-sm border border-rose-100" 
                : "text-uni-text-400 hover:text-uni-text-900"
            )}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'next' ? 'Próximas' : 'Concluídas'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse">Carregando campanhas...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="col-span-full py-20 text-center text-uni-text-400">Nenhuma campanha encontrada para este filtro.</div>
        ) : (
          filteredCampaigns.map((c: any) => (
            <div 
              key={c.id} 
              className="group relative bg-white border border-border-1 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400">{c.month}</span>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusBadgeClass(c.status))}>
                  {c.status_label || (c.status === 'active' ? 'Ativa' : c.status === 'done' ? 'Concluída' : 'Próxima')}
                </span>
              </div>

              <h3 className="text-xl font-display font-bold text-uni-text-900 mb-2">{c.name}</h3>
              <p className="text-xs text-uni-text-500 leading-relaxed mb-6 flex-grow">
                Junte-se à nossa missão de saúde e autocuidado focada em {c.month.split('·')[1] || 'você'}.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-uni-text-400">Progresso Geral</span>
                  <span className="text-rose-500">{c.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${c.progress}%`, background: c.color }} />
                </div>
              </div>

              <div className="mt-6">
                {!isRH ? (
                  <Button
                    onClick={() => handleJoin(c.id)}
                    disabled={c.joined || c.status !== 'active' || loadingAction === c.id}
                    variant={c.joined ? 'outline' : 'primary'}
                    className={cn(
                      "w-full rounded-2xl",
                      c.joined && "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-50"
                    )}
                  >
                    {loadingAction === c.id ? 'Aderindo...' : c.joined ? '✔ Participando' : 'Participar Agora'}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 rounded-2xl text-xs",
                        c.status === 'next' && "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                        c.status === 'active' && "border-rose-200 text-rose-500 hover:bg-rose-50",
                        c.status === 'done' && "border-amber-200 text-amber-600 hover:bg-amber-50"
                      )}
                      disabled={loadingAction === `status-${c.id}`}
                      onClick={() => handleUpdateStatus(c.id, c.status)}
                    >
                      {loadingAction === `status-${c.id}`
                        ? '...'
                        : c.status === 'next'
                        ? '▶ Ativar'
                        : c.status === 'active'
                        ? '✓ Concluir'
                        : '↩ Reabrir'}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-red-200 text-red-400 hover:bg-red-50 px-3"
                      disabled={loadingAction === `delete-${c.id}`}
                      onClick={() => handleDelete(c.id)}
                      aria-label="Excluir campanha"
                    >
                      {loadingAction === `delete-${c.id}` ? '...' : '🗑'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Agendar Nova Campanha"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-uni-text-600 mb-2 uppercase tracking-widest">Nome da Campanha</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-2xl border border-border-1 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              placeholder="Ex: Primavera Saudável"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-2 uppercase tracking-widest">Tema</label>
              <select 
                className="w-full px-4 py-3 rounded-2xl border border-border-1 outline-none appearance-none bg-white"
                value={formTema}
                onChange={(e) => setFormTema(e.target.value as typeof TEMAS[number]['label'])}
              >
                {TEMAS.map(t => <option key={t.label} value={t.label}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-uni-text-600 mb-2 uppercase tracking-widest">Mês</label>
              <select 
                className="w-full px-4 py-3 rounded-2xl border border-border-1 outline-none appearance-none bg-white"
                value={formMes}
                onChange={(e) => setFormMes(e.target.value as typeof MESES[number])}
              >
                {MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1 rounded-2xl" onClick={handleCreate}>Criar Agora</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
