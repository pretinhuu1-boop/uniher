'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TYPE_ICONS: Record<string, string> = {
  voucher: '🎟️',
  folga: '🏖️',
  produto: '🎁',
  experiencia: '✨',
};

export default function RewardsShop({ userPoints }: { userPoints: number }) {
  const { data, mutate } = useSWR('/api/gamification/rewards', fetcher, { revalidateOnFocus: false });
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const rewards = data?.rewards || [];

  async function handleRedeem(rewardId: string, cost: number) {
    if (userPoints < cost) {
      setToast('Pontos insuficientes!');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    if (!confirm('Confirma o resgate? Seus pontos serão deduzidos.')) return;

    setRedeeming(rewardId);
    try {
      const res = await fetch('/api/gamification/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const d = await res.json();
      if (res.ok) {
        setToast('Resgate solicitado! Aguarde aprovação. 🎉');
        mutate();
      } else {
        setToast(d.error || 'Erro ao resgatar');
      }
    } catch {
      setToast('Erro de conexão');
    }
    setRedeeming(null);
    setTimeout(() => setToast(''), 4000);
  }

  if (rewards.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border-1 p-6 text-center">
        <div className="text-4xl mb-2">🏪</div>
        <h3 className="font-display font-bold text-uni-text-900">Loja de Recompensas</h3>
        <p className="text-sm text-uni-text-400 mt-1">Sua empresa ainda não cadastrou recompensas. Em breve!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border-1 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-uni-text-900">🏪 Loja de Recompensas</h3>
        <span className="text-sm font-bold" style={{ color: '#C9A264' }}>
          ⭐ {userPoints} pts
        </span>
      </div>

      {toast && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-4 ${toast.includes('Erro') || toast.includes('insuficientes') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rewards.map((r: any) => {
          const canAfford = userPoints >= r.points_cost;
          const soldOut = r.quantity_available === 0;

          return (
            <div
              key={r.id}
              className={`border rounded-xl p-4 transition-all ${canAfford && !soldOut ? 'border-border-1 hover:border-gold-300 hover:shadow-sm' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{TYPE_ICONS[r.type] || '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-uni-text-900 truncate">{r.title}</h4>
                  {r.description && (
                    <p className="text-[11px] text-uni-text-400 mt-0.5 line-clamp-2">{r.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold" style={{ color: canAfford ? '#C9A264' : '#9ca3af' }}>
                      ⭐ {r.points_cost} pts
                    </span>
                    {soldOut && <span className="text-[10px] text-red-500 font-bold">ESGOTADO</span>}
                    {r.quantity_available > 0 && (
                      <span className="text-[10px] text-uni-text-300">{r.quantity_available} restantes</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRedeem(r.id, r.points_cost)}
                disabled={!canAfford || soldOut || redeeming === r.id}
                className="w-full mt-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                style={{
                  background: canAfford && !soldOut ? '#C9A264' : '#e5e7eb',
                  color: canAfford && !soldOut ? '#fff' : '#9ca3af',
                }}
              >
                {redeeming === r.id ? 'Resgatando...' : soldOut ? 'Esgotado' : !canAfford ? `Faltam ${r.points_cost - userPoints} pts` : 'Resgatar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
