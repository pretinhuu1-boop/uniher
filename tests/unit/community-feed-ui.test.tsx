// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityFeedItem } from '@/types/community';

const mocks = vi.hoisted(() => ({
  feed: {
    items: [] as CommunityFeedItem[],
    nextCursor: null as string | null,
    settings: { companyFeedEnabled: true },
    error: undefined as Error | undefined,
    isLoading: false,
    isLoadingMore: false,
    retry: vi.fn(),
    loadMore: vi.fn(),
    support: vi.fn(),
    unsupport: vi.fn(),
    save: vi.fn(),
    unsave: vi.fn(),
    loadSupporters: vi.fn(),
  },
  brand: {
    brand: { name: 'Empresa Real', logoUrl: null as string | null },
    error: undefined as Error | undefined,
    isLoading: false,
    retry: vi.fn(),
  },
}));

vi.mock('@/hooks/useCollaborator', () => ({
  useCollaboratorCommunityFeed: () => mocks.feed,
  useCommunityBrand: () => mocks.brand,
}));

import { CommunityFeed } from '@/components/community/CommunityFeed';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import {
  CommunityTopicTabs,
  topicForCommunityTab,
} from '@/components/community/CommunityTopicTabs';

const post: CommunityFeedItem = {
  id: 'post-a',
  title: 'Pausa com propósito',
  summary: 'Uma orientação editorial da empresa.',
  bodyText: '<strong>Respire com calma.</strong>',
  topic: 'pausas',
  readTimeMinutes: 4,
  imagePath: null,
  publishedAt: '2026-07-20T12:00:00.000Z',
  supportCount: 3,
  supportedByMe: false,
  savedByMe: false,
};

describe('CommunityTopicTabs', () => {
  afterEach(cleanup);

  it('maps the approved tabs without claiming a recommendation algorithm', () => {
    const onChange = vi.fn();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const view = render(<CommunityTopicTabs activeTab="for-you" onChange={onChange} />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Para você', 'Todos', 'Pausas', 'Sono', 'Movimento',
    ]);
    expect(screen.getByRole('tab', { name: 'Para você' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Sono' }));
    expect(onChange).toHaveBeenCalledWith('sono');
    expect(topicForCommunityTab('for-you')).toBeUndefined();
    expect(topicForCommunityTab('all')).toBeUndefined();
    expect(topicForCommunityTab('movimento')).toBe('movimento');

    scrollIntoView.mockClear();
    view.rerender(<CommunityTopicTabs activeTab="sono" onChange={onChange} />);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' });
  });

  it('uses roving focus with wrap, Home and End while keeping selection coherent', () => {
    function ControlledTabs() {
      const [activeTab, setActiveTab] = useState<'for-you' | 'all' | 'pausas' | 'sono' | 'movimento'>('for-you');
      return <CommunityTopicTabs activeTab={activeTab} onChange={setActiveTab} />;
    }

    render(<ControlledTabs />);
    const tabs = screen.getAllByRole('tab') as HTMLButtonElement[];
    tabs[0].focus();

    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[4]);
    expect(tabs[4].getAttribute('aria-selected')).toBe('true');
    expect(tabs[4].tabIndex).toBe(0);
    expect(tabs[0].tabIndex).toBe(-1);

    fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(document.activeElement).toBe(tabs[4]);
    expect(tabs[4].getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabs[4], { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });
});

describe('CommunityPostCard', () => {
  afterEach(cleanup);

  it('renders plain text and reveals only consented supporter names after deliberate disclosure', async () => {
    const loadSupporters = vi.fn().mockResolvedValue({ names: ['Ana'], nextCursor: null });
    const { container } = render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={vi.fn()}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={loadSupporters}
      />,
    );

    expect(screen.getByText('Empresa Real')).toBeTruthy();
    expect(screen.getByText('<strong>Respire com calma.</strong>')).toBeTruthy();
    expect(container.querySelector('strong')).toBeNull();
    expect(screen.queryByText('Ana')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText(/nomes aparecem somente com consentimento/i)).toBeTruthy();
    expect(screen.getByText('2 apoios permanecem anônimos.')).toBeTruthy();
    expect(loadSupporters).toHaveBeenCalledWith('post-a', undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar lista de apoiadoras' }));
    expect(screen.queryByRole('region', { name: 'Apoiadoras com nome autorizado' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    await waitFor(() => expect(loadSupporters).toHaveBeenCalledTimes(2));
  });

  it('disables a support action while its request is pending', async () => {
    let resolveSupport: (() => void) | undefined;
    const onSupport = vi.fn(() => new Promise<void>((resolve) => { resolveSupport = resolve; }));
    render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={onSupport}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={vi.fn()}
      />,
    );

    const supportButton = screen.getByRole('button', { name: 'Apoiar' }) as HTMLButtonElement;
    fireEvent.click(supportButton);
    await waitFor(() => expect(supportButton.disabled).toBe(true));
    resolveSupport?.();
    await waitFor(() => expect(supportButton.disabled).toBe(false));
  });

  it('discards a supporter response that arrives after the disclosure is closed', async () => {
    let resolveFirst: ((response: { names: string[]; nextCursor: null }) => void) | undefined;
    const firstRequest = new Promise<{ names: string[]; nextCursor: null }>((resolve) => { resolveFirst = resolve; });
    const loadSupporters = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce({ names: [], nextCursor: null });
    render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={vi.fn()}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={loadSupporters}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    await waitFor(() => expect(loadSupporters).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Fechar lista de apoiadoras' }));
    await act(async () => {
      resolveFirst?.({ names: ['Nome revogado'], nextCursor: null });
      await firstRequest;
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));

    await waitFor(() => expect(loadSupporters).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Nome revogado')).toBeNull();
  });

  it('refreshes an open disclosure after support changes so a removed name disappears', async () => {
    const loadSupporters = vi.fn()
      .mockResolvedValueOnce({ names: ['Meu nome', 'Ana'], nextCursor: null })
      .mockResolvedValueOnce({ names: ['Ana'], nextCursor: null });
    render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={vi.fn().mockResolvedValue(undefined)}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={loadSupporters}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    expect(await screen.findByText('Meu nome')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apoiar' }));

    await waitFor(() => expect(loadSupporters).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Meu nome')).toBeNull());
    expect(screen.getByText('Ana')).toBeTruthy();
  });

  it('never restores stale names when an older disclosure response loses a support race', async () => {
    let resolveStale: ((response: { names: string[]; nextCursor: null }) => void) | undefined;
    const staleRequest = new Promise<{ names: string[]; nextCursor: null }>((resolve) => { resolveStale = resolve; });
    const loadSupporters = vi.fn()
      .mockReturnValueOnce(staleRequest)
      .mockResolvedValueOnce({ names: ['Nome atual'], nextCursor: null });
    render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={vi.fn().mockResolvedValue(undefined)}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={loadSupporters}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    await waitFor(() => expect(loadSupporters).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Apoiar' }));
    expect(await screen.findByText('Nome atual')).toBeTruthy();

    await act(async () => {
      resolveStale?.({ names: ['Nome antigo'], nextCursor: null });
      await staleRequest;
    });
    expect(screen.queryByText('Nome antigo')).toBeNull();
    expect(screen.getByText('Nome atual')).toBeTruthy();
  });

  it('does not refetch names after a pending support action is closed', async () => {
    let resolveSupport: (() => void) | undefined;
    const onSupport = vi.fn(() => new Promise<void>((resolve) => { resolveSupport = resolve; }));
    const loadSupporters = vi.fn().mockResolvedValue({ names: ['Ana'], nextCursor: null });
    render(
      <CommunityPostCard
        item={post}
        brand={{ name: 'Empresa Real', logoUrl: null }}
        onSupport={onSupport}
        onUnsupport={vi.fn()}
        onSave={vi.fn()}
        onUnsave={vi.fn()}
        loadSupporters={loadSupporters}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver apoiadoras' }));
    expect(await screen.findByText('Ana')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apoiar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar lista de apoiadoras' }));
    await act(async () => { resolveSupport?.(); });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Apoiar' }) as HTMLButtonElement).disabled).toBe(false));
    expect(loadSupporters).toHaveBeenCalledTimes(1);
  });
});

describe('CommunityFeed states', () => {
  beforeEach(() => {
    mocks.feed.items = [];
    mocks.feed.nextCursor = null;
    mocks.feed.settings = { companyFeedEnabled: true };
    mocks.feed.error = undefined;
    mocks.feed.isLoading = false;
    mocks.feed.isLoadingMore = false;
    mocks.brand.brand = { name: 'Empresa Real', logoUrl: null };
    mocks.brand.error = undefined;
    mocks.brand.isLoading = false;
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('renders loading, disabled, empty and error states with retry', () => {
    mocks.feed.isLoading = true;
    const view = render(<CommunityFeed />);
    expect(screen.getByLabelText('Carregando publicações')).toBeTruthy();

    mocks.feed.isLoading = false;
    mocks.feed.settings = { companyFeedEnabled: false };
    view.rerender(<CommunityFeed />);
    expect(screen.getByText('Comunidade desativada pela empresa')).toBeTruthy();

    mocks.feed.settings = { companyFeedEnabled: true };
    view.rerender(<CommunityFeed />);
    expect(screen.getByText('Nenhum conteúdo publicado')).toBeTruthy();

    mocks.feed.error = new Error('Falha segura');
    view.rerender(<CommunityFeed />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mocks.feed.retry).toHaveBeenCalledOnce();
  });

  it('renders content and the explicit end-of-feed state', () => {
    mocks.feed.items = [post];
    render(<CommunityFeed />);
    expect(screen.getByRole('heading', { name: 'Pausa com propósito' })).toBeTruthy();
    expect(screen.getByText('Você chegou ao fim das publicações.')).toBeTruthy();
  });
});
