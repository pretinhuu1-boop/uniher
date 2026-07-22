'use client';

import useSWR from 'swr';
import { FeedbackState } from '@/components/ui/FeedbackState';

const fetcher = (url: string) => fetch(url).then((response) => response.json());

interface SafeNotification {
  id: string;
  type: 'campaign' | 'challenge' | 'alert' | 'lesson' | 'system' | 'reminder';
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export default function NotificationsPage() {
  const { data, isLoading, mutate } = useSWR('/api/notifications', fetcher);
  const notifications = (data?.notifications ?? []) as SafeNotification[];

  if (isLoading) {
    return <FeedbackState kind="loading" title="Carregando avisos" description="Buscando suas comunicações pessoais." />;
  }
  if (notifications.length === 0) {
    return <FeedbackState kind="empty" title="Nenhum aviso novo" description="Campanhas, lembretes e comunicações aparecerão aqui." />;
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    await mutate();
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--platform-ink)]">Notificações</h1>
        <p className="text-sm text-[var(--platform-muted)]">Acompanhe comunicações e lembretes da plataforma.</p>
      </header>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => markRead(notification.id)}
            className="w-full rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[var(--platform-ink)]">{notification.title}</h2>
                <p className="mt-1 text-sm text-[var(--platform-muted)]">{notification.message}</p>
              </div>
              {!notification.read && <span className="text-xs font-semibold text-[var(--platform-accent)]">Nova</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
