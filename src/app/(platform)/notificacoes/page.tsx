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
};

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

  useEffect(() => {
    setNotifications(apiNotifications as any[]);
  }, [apiNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      mutate();
    } catch { mutate(); }
  }

  async function toggleRead(id: string) {
    if (pendingIds.has(id)) return;
    setPendingIds(p => new Set(p).add(id));
    // Optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      mutate();
    } catch { mutate(); }
    setPendingIds(p => { const s = new Set(p); s.delete(id); return s; });
  }

  async function removeNotification(id: string) {
    if (pendingIds.has(id)) return;
    setPendingIds(p => new Set(p).add(id));
    // Optimistic
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      mutate();
    } catch { mutate(); }
    setPendingIds(p => { const s = new Set(p); s.delete(id); return s; });
  }

  async function clearAll() {
    if (!confirm('Excluir todas as notificações?')) return;
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try {
      await Promise.all(ids.map(id => fetch(`/api/notifications/${id}`, { method: 'DELETE' })));
      mutate();
    } catch { mutate(); }
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

      <div className={styles.list}>
        {notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔔</div>
            <p className={styles.emptyMessage}>Nenhuma notificação.</p>
          </div>
        )}
        {notifications.map((notif) => {
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
