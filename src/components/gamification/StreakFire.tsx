'use client';

import { useEffect, useState } from 'react';

interface StreakFireProps {
  streak: number;
  showAnimation?: boolean;
}

export default function StreakFire({ streak, showAnimation = false }: StreakFireProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (showAnimation && streak > 0) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showAnimation, streak]);

  const fireSize = Math.min(streak, 30); // Cap visual at 30
  const intensity = fireSize / 30; // 0-1

  return (
    <div className="relative flex flex-col items-center">
      {/* Fire emoji with growing animation */}
      <div
        className={`transition-all duration-500 ${animate ? 'scale-150' : 'scale-100'}`}
        style={{
          fontSize: `${24 + intensity * 24}px`,
          filter: `brightness(${1 + intensity * 0.5})`,
          textShadow: streak > 0 ? `0 0 ${8 + intensity * 16}px rgba(255, 140, 0, ${0.3 + intensity * 0.5})` : 'none',
        }}
      >
        {streak === 0 ? '❄️' : streak < 3 ? '🔥' : streak < 7 ? '🔥🔥' : '🔥🔥🔥'}
      </div>

      {/* Streak count */}
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className="font-display font-bold"
          style={{
            fontSize: `${18 + intensity * 12}px`,
            color: streak === 0 ? '#94a3b8' : `hsl(${30 - intensity * 15}, ${70 + intensity * 30}%, ${50 - intensity * 10}%)`,
          }}
        >
          {streak}
        </span>
        <span className="text-xs text-uni-text-400">
          {streak === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      {/* Motivational text */}
      {streak === 0 && (
        <p className="text-[10px] text-uni-text-400 mt-0.5">Faça check-in para começar!</p>
      )}
      {streak > 0 && streak < 3 && (
        <p className="text-[10px] text-orange-500 mt-0.5">Continue assim! 💪</p>
      )}
      {streak >= 3 && streak < 7 && (
        <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Sequência incrível! 🌟</p>
      )}
      {streak >= 7 && streak < 30 && (
        <p className="text-[10px] text-red-500 font-bold mt-0.5">Imparável! 👑</p>
      )}
      {streak >= 30 && (
        <p className="text-[10px] font-bold mt-0.5" style={{ color: '#C9A264' }}>Lendária! 🏆✨</p>
      )}

      {/* Streak at risk warning */}
      {animate && streak > 0 && (
        <div className="absolute -top-8 animate-bounce">
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
            +1 🔥
          </span>
        </div>
      )}
    </div>
  );
}
