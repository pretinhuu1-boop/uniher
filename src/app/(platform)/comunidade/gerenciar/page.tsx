'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/platform/PageHeader';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import {
  CommunityPostList,
  type CommunityPostStatusFilter,
} from '@/components/community/management/CommunityPostList';
import { CommunityPostEditor } from '@/components/community/management/CommunityPostEditor';
import {
  getEditorialCompanyName,
  MasterCompanySelector,
} from '@/components/community/management/MasterCompanySelector';
import {
  type AdminCompaniesResponse,
  EMPTY_COMMUNITY_POST_FORM,
  type CommunityPostField,
  type CommunityPostFieldErrors,
  type CommunityPostFormValue,
  type EditorialCompany,
  type ManagedCommunityPost,
  toApiExpiry,
  toCommunityPostForm,
  validateCommunityPostForm,
} from '@/components/community/management/types';
import type { CommunityPostStatus } from '@/types/community';

interface ManagementListResponse {
  items: ManagedCommunityPost[];
  settings: { companyFeedEnabled: boolean };
}

interface ManagementPostResponse {
  post: ManagedCommunityPost;
}

type ActionMessage = { kind: 'success' | 'error'; text: string };

async function readApiError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as {
    code?: string;
    message?: string;
    error?: string | { code?: string; message?: string };
  } | null;
  const nestedError = payload?.error && typeof payload.error === 'object' ? payload.error : null;
  const message = nestedError?.message
    ?? payload?.message
    ?? (typeof payload?.error === 'string' ? payload.error : null)
    ?? 'A operação não pôde ser concluída.';
  const code = nestedError?.code ?? payload?.code;
  return code ? `${message} (${code})` : message;
}

async function requestPost(url: string, method: 'POST' | 'PATCH', body: object): Promise<ManagedCommunityPost> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  const payload = await response.json() as ManagementPostResponse;
  if (!payload.post) throw new Error('A API não retornou o conteúdo atualizado.');
  return payload.post;
}

function withCompanyTarget(url: string, companyId: string | null): string {
  if (!companyId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}companyId=${encodeURIComponent(companyId)}`;
}

export default function CommunityManagementPage() {
  const { isLoading: authLoading, user } = useAuth();
  const canManageCommunity = user?.role === 'rh' || user?.role === 'admin';
  const isMasterAdmin = user?.isMasterAdmin === true;
  const [companies, setCompanies] = useState<EditorialCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [companiesReloadKey, setCompaniesReloadKey] = useState(0);
  const [posts, setPosts] = useState<ManagedCommunityPost[]>([]);
  const [statusFilter, setStatusFilter] = useState<CommunityPostStatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityPostFormValue>({ ...EMPTY_COMMUNITY_POST_FORM });
  const [editorStatus, setEditorStatus] = useState<CommunityPostStatus>('draft');
  const [companyFeedEnabled, setCompanyFeedEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [listError, setListError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CommunityPostFieldErrors>({});
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const editorialCompanyId = isMasterAdmin ? selectedCompanyId || null : null;
  const editorialTargetReady = canManageCommunity && (!isMasterAdmin || Boolean(editorialCompanyId));
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null;

  const resetEditorialWorkspace = useCallback(() => {
    setPosts([]);
    setStatusFilter('all');
    setSelectedId(null);
    setForm({ ...EMPTY_COMMUNITY_POST_FORM });
    setEditorStatus('draft');
    setCompanyFeedEnabled(false);
    setIsLoading(false);
    setIsPending(false);
    setListError('');
    setFieldErrors({});
    setMessage(null);
  }, []);

  const loadPosts = useCallback(async (targetCompanyId: string | null, signal?: AbortSignal) => {
    setIsLoading(true);
    setListError('');
    try {
      const response = await fetch(withCompanyTarget('/api/rh/community/posts', targetCompanyId), { signal, cache: 'no-store' });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = await response.json() as ManagementListResponse;
      if (!Array.isArray(payload.items)) throw new Error('A API retornou uma lista inválida.');
      setPosts(payload.items);
      setCompanyFeedEnabled(payload.settings?.companyFeedEnabled === true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setListError(error instanceof Error ? error.message : 'Não foi possível carregar os conteúdos.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isMasterAdmin) return;
    const controller = new AbortController();
    setCompaniesLoading(true);
    setCompaniesError('');

    fetch('/api/admin/companies?limit=200', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<AdminCompaniesResponse>;
      })
      .then((payload) => {
        if (!Array.isArray(payload.companies)) throw new Error('A API retornou uma lista de empresas inválida.');
        setCompanies(payload.companies);
        setSelectedCompanyId((current) => {
          const remainsActive = payload.companies.some((company) => (
            company.id === current && (company.is_active === true || company.is_active === 1)
          ));
          return remainsActive ? current : '';
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCompanies([]);
        setSelectedCompanyId('');
        setCompaniesError(error instanceof Error ? error.message : 'Não foi possível carregar as empresas.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCompaniesLoading(false);
      });

    return () => controller.abort();
  }, [isMasterAdmin, companiesReloadKey]);

  useEffect(() => {
    if (!editorialTargetReady) return;
    const controller = new AbortController();
    void loadPosts(editorialCompanyId, controller.signal);
    return () => controller.abort();
  }, [editorialCompanyId, editorialTargetReady, loadPosts, reloadKey]);

  const filteredPosts = useMemo(
    () => statusFilter === 'all' ? posts : posts.filter((post) => post.status === statusFilter),
    [posts, statusFilter],
  );

  function startNewPost() {
    setSelectedId(null);
    setEditorStatus('draft');
    setForm({ ...EMPTY_COMMUNITY_POST_FORM });
    setFieldErrors({});
    setMessage(null);
  }

  function changeMasterCompany(companyId: string) {
    resetEditorialWorkspace();
    setSelectedCompanyId(companyId);
  }

  function selectPost(post: ManagedCommunityPost) {
    setSelectedId(post.id);
    setEditorStatus(post.status);
    setForm(toCommunityPostForm(post));
    setFieldErrors({});
    setMessage(null);
  }

  function updateField<Field extends CommunityPostField>(field: Field, value: CommunityPostFormValue[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setMessage(null);
  }

  function validateForm(): boolean {
    const errors = validateCommunityPostForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) return true;
    setMessage({ kind: 'error', text: 'Revise os campos destacados antes de continuar.' });
    return false;
  }

  function mergePost(post: ManagedCommunityPost) {
    setPosts((current) => {
      const index = current.findIndex((item) => item.id === post.id);
      if (index === -1) return [post, ...current];
      return current.map((item) => item.id === post.id ? post : item);
    });
    setSelectedId(post.id);
    setEditorStatus(post.status);
    setForm(toCommunityPostForm(post));
  }

  function editablePayload() {
    return {
      title: form.title.trim(),
      summary: form.summary.trim(),
      bodyText: form.bodyText,
      topic: form.topic,
      readTimeMinutes: form.readTimeMinutes,
      imagePath: form.imagePath.trim() || null,
      expiresAt: toApiExpiry(form.expiresAt),
    };
  }

  async function savePost() {
    if (!editorialTargetReady || !validateForm()) return;
    setIsPending(true);
    setMessage(null);
    try {
      const post = selectedId
        ? await requestPost(withCompanyTarget(`/api/rh/community/posts/${encodeURIComponent(selectedId)}`, editorialCompanyId), 'PATCH', editablePayload())
        : await requestPost('/api/rh/community/posts', 'POST', {
          ...editablePayload(),
          status: 'draft',
          ...(editorialCompanyId ? { companyId: editorialCompanyId } : {}),
        });
      mergePost(post);
      setMessage({ kind: 'success', text: selectedId ? 'Alterações salvas.' : 'Rascunho criado. Agora ele pode ser publicado.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar o conteúdo.' });
    } finally {
      setIsPending(false);
    }
  }

  async function publishPost() {
    if (!editorialTargetReady || !selectedId || editorStatus !== 'draft' || !companyFeedEnabled || !validateForm()) return;
    setIsPending(true);
    setMessage(null);
    try {
      const post = await requestPost(withCompanyTarget(`/api/rh/community/posts/${encodeURIComponent(selectedId)}`, editorialCompanyId), 'PATCH', {
        ...editablePayload(),
        status: 'published',
      });
      mergePost(post);
      setMessage({ kind: 'success', text: 'Conteúdo publicado no feed da empresa.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível publicar o conteúdo.' });
    } finally {
      setIsPending(false);
    }
  }

  async function archivePost() {
    if (!editorialTargetReady || !selectedId || editorStatus !== 'published') return;
    setIsPending(true);
    setMessage(null);
    try {
      const post = await requestPost(withCompanyTarget(`/api/rh/community/posts/${encodeURIComponent(selectedId)}`, editorialCompanyId), 'PATCH', { status: 'archived' });
      mergePost(post);
      setStatusFilter('archived');
      setMessage({ kind: 'success', text: 'Conteúdo arquivado e removido do feed.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível arquivar o conteúdo.' });
    } finally {
      setIsPending(false);
    }
  }

  if (authLoading) {
    return <FeedbackState kind="loading" title="Carregando gestão da comunidade" description="Confirmando suas permissões de acesso." />;
  }

  if (!canManageCommunity) {
    return <FeedbackState kind="denied" title="Acesso restrito" description="A gestão editorial da comunidade está disponível apenas para RH e administração." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Comunidade"
        title="Gestão editorial"
        description={isMasterAdmin
          ? selectedCompany
            ? `Empresa selecionada: ${getEditorialCompanyName(selectedCompany)}. Crie, revise e publique conteúdo em texto simples.`
            : 'Selecione uma empresa para abrir o escopo editorial. Nenhuma leitura ou alteração é feita sem esse alvo.'
          : 'Crie, revise e publique conteúdos da comunidade da empresa. O texto é sempre tratado como conteúdo simples.'}
        primaryAction={(
          <Button type="button" onClick={startNewPost} disabled={!editorialTargetReady} className="w-full gap-2 sm:w-auto">
            <Plus aria-hidden="true" className="h-4 w-4" />Novo conteúdo
          </Button>
        )}
      />

      {isMasterAdmin && (
        <MasterCompanySelector
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          isLoading={companiesLoading}
          error={companiesError}
          onChange={changeMasterCompany}
          onRetry={() => {
            resetEditorialWorkspace();
            setSelectedCompanyId('');
            setCompaniesReloadKey((value) => value + 1);
          }}
        />
      )}

      {isMasterAdmin && !selectedCompany ? (
        <FeedbackState
          kind="empty"
          title={companiesLoading ? 'Carregando empresas' : companiesError ? 'Seleção de empresa indisponível' : 'Selecione uma empresa'}
          description={companiesLoading
            ? 'Aguarde a lista de empresas autorizadas.'
            : companiesError
              ? 'A gestão editorial permanece bloqueada até a lista ser carregada.'
              : 'Escolha uma empresa ativa acima para carregar conteúdos e liberar as ações editoriais.'}
        />
      ) : (
        <div className="grid min-w-0 overflow-hidden rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.6fr)]">
        <CommunityPostList
          posts={filteredPosts}
          selectedId={selectedId}
          statusFilter={statusFilter}
          isLoading={isLoading}
          error={listError}
          onFilterChange={setStatusFilter}
          onSelect={selectPost}
          onCreate={startNewPost}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
        <CommunityPostEditor
          form={form}
          fieldErrors={fieldErrors}
          status={editorStatus}
          isExisting={selectedId !== null}
          companyFeedEnabled={companyFeedEnabled}
          isPending={isPending}
          message={message}
          onChange={updateField}
          onSave={() => { void savePost(); }}
          onPublish={() => { void publishPost(); }}
          onArchive={() => { void archivePost(); }}
        />
        </div>
      )}
    </div>
  );
}
