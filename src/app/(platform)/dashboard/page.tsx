'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/platform/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/AvatarBadge';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardKPI } from '@/types/platform';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const PERIOD_OPTIONS = ['1m', '3m', '6m', '1a'];

export default function DashboardPage() {
  const { kpis, departments, roi, campaigns, engagement, ageDistribution, isLoading } = useDashboard();
  const { user } = useAuth();
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState('1m');
  const [filterDept, setFilterDept] = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  // Smart redirect for new RH users to onboarding
  useEffect(() => {
    if (user?.role !== 'rh') return;
    fetch('/api/rh/onboarding-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.isNewRH) {
          router.push('/onboarding-rh');
        }
      })
      .catch(() => {});
  }, [user?.role, router]);

  const activeRoi = roi;

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-10 font-body animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">OFG</span>
            <span className="text-uni-text-400 text-sm font-medium">/ corporativo</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-uni-text-900 leading-tight">Dashboard RH</h1>
          <p className="text-uni-text-600 mt-1 max-w-xl">Visão geral estratégica da saúde e engajamento da população feminina da sua empresa.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-white rounded-lg p-1 border border-border-1 shadow-sm h-11 w-fit">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={cn(
                  "px-4 h-full rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                  activePeriod === p ? "bg-rose-500 text-white shadow-md shadow-rose-200" : "text-uni-text-400 hover:text-uni-text-900"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" className="h-11 shadow-sm font-bold uppercase text-[10px] tracking-widest px-6">Exportar</Button>
          <Button className="h-11 shadow-md shadow-rose font-bold uppercase text-[10px] tracking-widest px-6">Convidar</Button>
        </div>
      </header>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-4 py-4 border-y border-border-1 mt-6">
        <select
          aria-label="Filtrar por departamento"
          className="h-10 px-4 rounded-lg bg-white border border-border-1 text-xs font-bold text-uni-text-600 focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition-all outline-none"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">DEPARTAMENTO</option>
          {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select
          aria-label="Filtrar por status de saúde"
          className="h-10 px-4 rounded-lg bg-white border border-border-1 text-xs font-bold text-uni-text-600 focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition-all outline-none"
          value={filterHealth}
          onChange={e => setFilterHealth(e.target.value)}
        >
          <option value="">STATUS DE SAÚDE</option>
          <option value="low">BAIXO RISCO</option>
          <option value="medium">MÉDIO RISCO</option>
          <option value="high">ALTO RISCO</option>
        </select>
        {(filterDept || filterHealth) && (
          <button onClick={() => { setFilterDept(''); setFilterHealth(''); }} className="text-[10px] font-bold text-rose-500 hover:underline uppercase tracking-wide">Limpar Filtros</button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-border-1">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : kpis.length > 0 ? kpis.map((kpi: DashboardKPI, i: number) => (
          <StatCard key={i} kpi={kpi} className="animate-scaleIn h-full" />
        )) : (
          <div className="col-span-full text-center text-uni-text-400 text-sm py-8">Sem dados de KPI disponíveis</div>
        )}
      </div>

      {/* ROI Banner */}
      <div className="bg-gradient-to-r from-uni-green to-emerald-600 p-8 rounded-2xl shadow-xl shadow-green/20 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
        <div className="relative z-10">
          <h3 className="text-2xl font-display font-bold mb-2">Projeção de ROI Dinâmica</h3>
          <p className="text-emerald-50 max-w-sm opacity-90">Baseado na redução projetada de absenteísmo e sinistralidade.</p>
        </div>
        <div className="grid grid-cols-3 gap-8 md:gap-16 relative z-10 w-full md:w-auto">
          <div className="text-center group-hover:scale-110 transition-transform">
            <div className="text-3xl font-bold">{activeRoi.roiMultiplier}x</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 opacity-70">ROI Estimado</div>
          </div>
          <div className="text-center group-hover:scale-110 transition-transform">
            <div className="text-3xl font-bold">{activeRoi.savings}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 opacity-70">Economia/Ano</div>
          </div>
          <div className="text-center group-hover:scale-110 transition-transform">
            <div className="text-3xl font-bold">{activeRoi.absenteeismReduction}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 opacity-70">Absenteísmo</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl p-8 border border-border-1 min-h-[400px]">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-8" />
              <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 pb-12 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-uni-text-900">Engajamento ao Longo do Tempo</h3>
              <p className="text-xs text-uni-text-500">Benchmark de atividade vs retenção.</p>
            </div>
            <Badge variant="success">Tendência de Alta</Badge>
          </div>
          <div className="flex-grow">
            {engagement.length > 0 ? (
             <Line
               data={{
                 labels: engagement.map((d: any) => d.month),
                 datasets: [
                   {
                     label: 'Engajamento %',
                     data: engagement.map((d: any) => d.engagement),
                     borderColor: '#C9A264',
                     backgroundColor: 'rgba(200,92,126,0.1)',
                     fill: true,
                     tension: 0.4
                   },
                   {
                    label: 'Retenção %',
                    data: engagement.map((d: any) => d.retention),
                    borderColor: '#3E7D5A',
                    backgroundColor: 'rgba(62,125,90,0.1)',
                    fill: true,
                    tension: 0.4
                  }
                 ]
               }}
               options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }}
             />
            ) : (
              <div className="flex items-center justify-center h-full text-uni-text-400 text-sm">Sem dados de engajamento</div>
            )}
          </div>
        </Card>

        <Card className="p-8 flex flex-col min-h-[400px]">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-uni-text-900">Distribuição Demográfica</h3>
            <p className="text-xs text-uni-text-500">População ativa por faixa etária.</p>
          </div>
          {ageDistribution.length > 0 ? (
            <>
              <div className="flex-grow flex items-center justify-center relative">
                <div className="w-64 h-64">
                  <Doughnut
                    data={{
                      labels: ageDistribution.map((d: any) => d.label),
                      datasets: [{ data: ageDistribution.map((d: any) => d.percent), backgroundColor: ageDistribution.map((d: any) => d.color) }]
                    }}
                    options={{ cutout: '70%', plugins: { legend: { display: false } } }}
                  />
                </div>
                <div className="absolute text-center">
                  <div className="text-xs font-bold text-uni-text-400 uppercase tracking-widest">Total</div>
                  <div className="text-3xl font-display font-bold text-uni-text-900">{ageDistribution.reduce((s: number, d: any) => s + d.percent, 0)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-border-1">
                {ageDistribution.map((d: any) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px] font-bold text-uni-text-600 uppercase tracking-wide">{d.label}: {d.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-uni-text-400 text-sm">Sem dados demográficos</div>
          )}
        </Card>
      </div>
      )}

      {/* Campaign / Ranking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-uni-text-900">Ranking de Departamentos</h3>
              <p className="text-xs text-uni-text-500">Melhores performances em saúde preventiva.</p>
            </div>
            <Button variant="ghost" className="text-xs text-rose-500 p-0 hover:bg-transparent">Ver Ranking Global →</Button>
          </div>
          <div className="space-y-4">
            {departments.length > 0 ? departments.slice(0, 5).map((dept: any, i: number) => (
              <div key={dept.id} className="group flex items-center gap-4 hover:translate-x-1 transition-transform">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: `${dept.color}20`, color: dept.color }}>
                  {i+1}
                </div>
                <div className="flex-grow space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-uni-text-900">{dept.name}</span>
                    <span className="text-uni-text-400 font-medium">{dept.engagementPercent}% Engajado</span>
                  </div>
                  <div className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-uni-green transition-all"
                      style={{ width: `${dept.engagementPercent}%`, backgroundColor: dept.color }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-uni-text-400 text-sm py-8">Sem departamentos cadastrados</div>
            )}
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-lg font-bold text-uni-text-900 mb-6">Campanhas Ativas</h3>
          <div className="space-y-6">
            {campaigns.length > 0 ? campaigns.map((camp: any, idx: number) => (
              <div key={camp.id ?? camp.name ?? idx} className="p-4 rounded-xl border border-border-1 bg-cream-50/20 hover:border-rose-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[8px] uppercase">{camp.month}</Badge>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    camp.status === 'active' ? "text-uni-green" : camp.status === 'done' ? "text-uni-text-400" : "text-uni-text-300"
                  )}>
                    {camp.statusLabel}
                  </span>
                </div>
                <h4 className="font-bold text-uni-text-900 text-sm mb-4">{camp.name}</h4>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-grow bg-white rounded-full overflow-hidden border border-border-1">
                    <div className="h-full" style={{ width: `${camp.progress}%`, background: camp.color }} />
                  </div>
                  <span className="text-[10px] font-bold text-uni-text-500">{camp.progress}%</span>
                </div>
              </div>
            )) : (
              <div className="text-center text-uni-text-400 text-sm py-8">Sem campanhas</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
