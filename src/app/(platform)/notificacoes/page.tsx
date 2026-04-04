'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useCollaborator';
import styles from './notificacoes.module.css';

const TYPE_ICONS: Record<string, { emoji: string; className: string }> = {
  badge: { emoji: '🏅', className: styles.iconBadge },
  level: { emoji: '⭐', className: styles.iconLevel },
  campaign: { emoji: '📢', className: styles.iconCampaign },
  challenge: { emoji: '🎯', className: styles.iconChallenge },
  system: { emoji: 'ℹ️', className: styles.iconAlert },
  alert: { emoji: '⚠️', className: styles.iconAlert },
  security: { emoji: '🔒', className: styles.iconAlert },
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function NotificacoesPage() {
  const { notifications: apiNotifications, mutate } = useNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<NotifFilterKey>('all');

  useEffect(() => {
    setNotifications(apiNotifications as any[]);
  }, [apiNotifications]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error('Falha ao marcar todas');
      await mutate();
    } catch {
      await mutate();
    }
  }

  async function toggleRead(id: string) {
    if (pendingIds.has(id)) return;

    const current = notifications.find((notification) => notification.id === id);
    if (!current) return;

    const nextRead = !current.read;
    setPendingIds((prev) => new Set(prev).add(id));
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: nextRead } : notification,
      ),
    );

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: nextRead }),
      });
      if (!response.ok) throw new Error('Falha ao atualizar notificação');
      await mutate();
    } catch {
      await mutate();
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function removeNotification(id: string) {
    if (pendingIds.has(id)) return;

    setPendingIds((prev) => new Set(prev).add(id));
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));

    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir notificação');
      await mutate();
    } catch {
      await mutate();
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function clearAll() {
    if (!confirm('Excluir todas as notificações?')) return;

    const ids = notifications.map((notification) => notification.id);
    setNotifications([]);

    try {
      await Promise.all(ids.map((id) => fetch(`/api/notifications/${id}`, { method: 'DELETE' })));
      await mutate();
    } catch {
      await mutate();
    }
  }

  const filteredNotifications = notifications.filter(
    (notification) => activeFilter === 'all' || notification.type === activeFilter,
  );

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

      <div className="mb-4 flex flex-wrap gap-2">
        {NOTIF_FILTERS.map((filter) => {
          const count =
            filter.key === 'all'
              ? notifications.length
              : notifications.filter((notification) => notification.type === filter.key).length;

          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeFilter === filter.key
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-500'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeFilter === filter.key ? 'bg-white/20' : 'bg-gray-100'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.list}>
        {notifications.length === 0 && (
          <div className="space-y-2 py-16 text-center">
            <div className="text-4xl">🔔</div>
            <p className="font-medium text-gray-700">Nenhuma notificação</p>
            <p className="text-sm text-gray-400">
              Suas notificações de badges, campanhas e desafios aparecerão aqui.
            </p>
          </div>
        )}

        {filteredNotifications.length === 0 && notifications.length > 0 && (
          <div className="space-y-2 py-12 text-center">
            <div className="text-3xl">{NOTIF_FILTERS.find((filter) => filter.key === activeFilter)?.icon}</div>
            <p className="text-sm text-gray-500">
              Nenhuma notificação de{' '}
              {NOTIF_FILTERS.find((filter) => filter.key === activeFilter)?.label.toLowerCase()}
            </p>
          </div>
        )}

        {filteredNotifications.map((notification) => {
          const typeInfo = TYPE_ICONS[notification.type] || TYPE_ICONS.alert;
          const isPending = pendingIds.has(notification.id);

          return (
            <div
              key={notification.id}
              className={`${styles.card} ${!notification.read ? styles.cardUnread : ''} ${
                isPending ? 'opacity-60' : ''
              }`}
            >
              <div className={`${styles.iconWrap} ${typeInfo.className}`}>{typeInfo.emoji}</div>
              <div className={styles.content}>
                <span className={styles.cardTitle}>{notification.title}</span>
                <span className={styles.message}>{notification.message}</span>
                <span className={styles.timestamp} suppressHydrationWarning>
                  {formatTimestamp(notification.created_at || notification.timestamp || '')}
                </span>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => toggleRead(notification.id)}
                  disabled={isPending}
                >
                  {notification.read ? 'Marcar como não lida' : 'Marcar como lida'}
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => removeNotification(notification.id)}
                  disabled={isPending}
                >
                  Excluir
                </button>
              </div>
              {!notification.read && <div className={styles.unreadDot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
