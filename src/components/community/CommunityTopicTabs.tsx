'use client';

import { useEffect, useRef } from 'react';
import type { CommunityTopic } from '@/types/community';
import styles from './CommunityFeed.module.css';

export type CommunityFeedTab = 'for-you' | 'all' | 'pausas' | 'sono' | 'movimento';

interface CommunityTopicTabsProps {
  activeTab: CommunityFeedTab;
  disabled?: boolean;
  onChange: (tab: CommunityFeedTab) => void;
}

const tabs: Array<{ value: CommunityFeedTab; label: string }> = [
  { value: 'for-you', label: 'Para você' },
  { value: 'all', label: 'Todos' },
  { value: 'pausas', label: 'Pausas' },
  { value: 'sono', label: 'Sono' },
  { value: 'movimento', label: 'Movimento' },
];

export function topicForCommunityTab(tab: CommunityFeedTab): CommunityTopic | undefined {
  if (tab === 'pausas' || tab === 'sono' || tab === 'movimento') return tab;
  return undefined;
}

export function CommunityTopicTabs({ activeTab, disabled = false, onChange }: CommunityTopicTabsProps) {
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className={styles.topicScroller}>
      <div className="flex min-w-max border-b border-[var(--platform-line)]" role="tablist" aria-label="Temas da comunidade">
        {tabs.map((tab) => {
          const selected = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              id={`community-tab-${tab.value}`}
              ref={selected ? activeTabRef : undefined}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="community-feed-panel"
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(tab.value)}
              className={`min-h-11 min-w-[7rem] border-b-2 px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--platform-action)] disabled:cursor-not-allowed disabled:opacity-50 ${selected
                ? 'border-[var(--platform-action)] text-[var(--platform-action-strong)]'
                : 'border-transparent text-[var(--platform-muted)] hover:text-[var(--platform-ink)]'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
