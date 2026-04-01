'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useCollaborator';
import styles from './notificacoes.module.css';

const TYPE_ICONS: Record<string, { emoji: string; className: string }> = {
  badge:     { emoji: '🏅', className: styles.iconBadge },
  level:     { emoji: '⭐', className: styles.iconLevel },
  campaign:  { emoji: '📢', className: styles.iconCampaign },
  challenge: { emoji: '🎯', className: styles.iconChallenge },
  system:    { emoji: 'ℹ️', className: styles.iconAlert },
  alert:     { emoji: '⚠️', className: styles.iconAlert },
  security:  { emoji: '🔒', className: styles.iconAlert },
};

const NOTIF_FILTERS = [
  { key: 'all', label: 'Todas', icon: '📋' },
  { key: 'badge', label: 'Badges', icon: '🏅' },
  { key: 'campaign', label: 'Campanhas', icon: '📢' },
  { key: 'challenge', label: 'Desafios', icon: '🎯' },
  { key: 'system', label: 'Sistema', icon: '⚙️' },
  { key: 'security', label: 'Segurança', icon: '🔒' },
] as const;

type NotifFilterKey = typeof NOTIF_FILTERS[number]['key'];

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

export default function NotificacoesPage() {
  const { notifications: apiNotifications, mutate } = useNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<NotifFilterKey>('all');

  useEffect(() => {
    setNotifications(apiNotifications as any[]);
  }, [apiNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error('Falha ao marcar todas');
      await mutate();
    } catch { await mutate(); }
  }

  async function toggleRead(id: string) {
    if (pendingIds.has(id)) return;
    const current = notifications.find(n => n.id === id);
    if (!current) return;
    const nextRead = !current.read;
    setPendingIds(p => new Set(p).add(id));
    // Optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: nextRead } : n));
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: nextRead }),
      });
      if (!response.ok) throw new Error('Falha ao atualizar notificacao');
      await mutate();
    } catch { await mutate(); }
    setPendingIds(p => { const s = new Set(p); s.delete(id); return s; });
  }

  async function removeNotification(id: string) {
    if (pendingIds.has(id)) return;
    setPendingIds(p => new Set(p).add(id));
    // Optimistic
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir notificacao');
      await mutate();
    } catch { await mutate(); }
    setPendingIds(p => { const s = new Set(p); s.delete(id); return s; });
  }

  async function clearAll() {
    if (!confirm('Excluir todas as notificações?')) return;
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try {
      await Promise.all(ids.map(id => fetch(`/api/notifications/${id}`, { method: 'DELETE' })));
      await mutate();
    } catch { await mutate(); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Notificações</h1>
          <span className={styles.unreadBadge}>
            {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas ✓'}
          </span>
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllRead}>
              Marcar todas como lidas
            </button>
          )}
          {notifications.length > 0 && (
            <button className={styles.clearAllBtn} onClick={clearAll}>
              Limpar todas
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {NOTIF_FILTERS.map((f) => {
          const count = f.key === 'all' ? notifications.length : notifications.filter(n => n.type === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilter === f.key
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.key ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.list}>
        {notifications.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">🔔</div>
            <p className="text-gray-700 font-medium">Nenhuma notificação</p>
            <p className="text-sm text-gray-400">Suas notificações de badges, campanhas e desafios aparecerão aqui.</p>
          </div>
        )}
        {notifications.filter(n => activeFilter === 'all' || n.type === activeFilter).length === 0 && notifications.length > 0 && (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">{NOTIF_FILTERS.find(f => f.key === activeFilter)?.icon}</div>
            <p className="text-gray-500 text-sm">Nenhuma notificação de {NOTIF_FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()}</p>
          </div>
        )}
        {notifications.filter(n => activeFilter === 'all' || n.type === activeFilter).map((notif) => {
          const typeInfo = TYPE_ICONS[notif.type] || TYPE_ICONS.alert;
          const isPending = pendingIds.has(notif.id);
          return (
            <div
              key={notif.id}
              className={`${styles.card} ${!notif.read ? styles.cardUnread : ''} ${isPending ? 'opacity-60' : ''}`}
            >
              <div className={`${styles.iconWrap} ${typeInfo.className}`}>
                {typeInfo.emoji}
              </div>
              <div className={styles.content}>
                <span className={styles.cardTitle}>{notif.title}</span>
                <span className={styles.message}>{notif.message}</span>
                <span className={styles.timestamp} suppressHydrationWarning>
                  {formatTimestamp(notif.created_at || notif.timestamp || '')}
                </span>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => toggleRead(notif.id)}
                  disabled={isPending}
                >
                  {notif.read ? 'Marcar como não lida' : 'Marcar como lida'}
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => removeNotification(notif.id)}
                  disabled={isPending}
                >
                  Excluir
                </button>
              </div>
              {!notif.read && <div className={styles.unreadDot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
