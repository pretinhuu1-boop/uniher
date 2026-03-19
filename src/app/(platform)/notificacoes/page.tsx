'use client';

import { useState } from 'react';
import { NOTIFICATIONS } from '@/data/mock-collaborator';
import styles from './notificacoes.module.css';

const TYPE_ICONS: Record<string, { emoji: string; className: string }> = {
  badge:     { emoji: '\u{1F3C5}', className: styles.iconBadge },
  level:     { emoji: '\u{2B50}',  className: styles.iconLevel },
  campaign:  { emoji: '\u{1F4E2}', className: styles.iconCampaign },
  challenge: { emoji: '\u{1F3AF}', className: styles.iconChallenge },
  alert:     { emoji: '\u{26A0}\uFE0F',  className: styles.iconAlert },
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Notificacoes</h1>
          <span className={styles.unreadBadge}>
            {unreadCount > 0 ? `${unreadCount} nao lidas` : 'Todas lidas \u2713'}
          </span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Marcar todas como lidas
          </button>
          <button className={styles.clearAllBtn} onClick={clearAll}>
            Limpar todas
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {notifications.length === 0 && (
          <p className={styles.emptyMessage}>Nenhuma notificacao.</p>
        )}
        {notifications.map((notif) => {
          const typeInfo = TYPE_ICONS[notif.type] || TYPE_ICONS.alert;
          return (
            <div
              key={notif.id}
              className={`${styles.card} ${!notif.read ? styles.cardUnread : ''}`}
            >
              <div className={`${styles.iconWrap} ${typeInfo.className}`}>
                {typeInfo.emoji}
              </div>
              <div className={styles.content}>
                <span className={styles.cardTitle}>{notif.title}</span>
                <span className={styles.message}>{notif.message}</span>
                <span className={styles.timestamp}>{formatTimestamp(notif.timestamp)}</span>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => toggleRead(notif.id)}
                >
                  {notif.read ? 'Marcar como nao lida' : 'Marcar como lida'}
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => removeNotification(notif.id)}
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
