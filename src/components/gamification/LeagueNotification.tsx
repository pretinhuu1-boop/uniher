'use client';

import { useEffect, useState } from 'react';

interface LeagueNotificationProps {
  show: boolean;
  type: 'overtaken' | 'overtook' | 'promotion' | 'demotion';
  name?: string;
  position?: number;
  onClose: () => void;
}

const MESSAGES = {
  overtaken: (name: string) => `${name} te ultrapassou no ranking! 😱`,
  overtook: (name: string) => `Você ultrapassou ${name}! 🎉`,
  promotion: () => 'Parabéns! Você subiu de liga! 🏆',
  demotion: () => 'Você desceu de liga. Vamos recuperar! 💪',
};

const ICONS = {
  overtaken: '⚡',
  overtook: '🚀',
  promotion: '🏆',
  demotion: '📉',
};

const COLORS = {
  overtaken: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  overtook: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  promotion: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' },
  demotion: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
};

export default function LeagueNotification({ show, type, name, onClose }: LeagueNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  if (!show && !visible) return null;

  const colors = COLORS[type];
  const message = MESSAGES[type](name || 'Alguém');

  return (
    <div
      className={`fixed top-4 right-4 z-[9998] transition-all duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      style={{ maxWidth: '340px' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border-l-4"
        style={{ background: colors.bg, borderColor: colors.border }}
      >
        <span className="text-2xl">{ICONS[type]}</span>
        <p className="text-sm font-semibold flex-1" style={{ color: colors.text }}>
          {message}
        </p>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-xs opacity-50 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}
