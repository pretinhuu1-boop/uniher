'use client';

import { useEffect, useState } from 'react';

interface HeartsDisplayProps {
  hearts: number;
  maxHearts: number;
  enabled: boolean;
}

export default function HeartsDisplay({ hearts, maxHearts, enabled }: HeartsDisplayProps) {
  const [lostHeart, setLostHeart] = useState(false);

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <span
          key={i}
          className={`transition-all duration-300 ${i >= hearts ? 'opacity-30 grayscale scale-90' : ''} ${lostHeart && i === hearts ? 'animate-ping' : ''}`}
          style={{ fontSize: '18px' }}
        >
          ❤️
        </span>
      ))}
      <span className="text-xs text-uni-text-400 ml-1">
        {hearts}/{maxHearts}
      </span>
    </div>
  );
}
