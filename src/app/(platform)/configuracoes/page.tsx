'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollaboratorSaved } from '@/hooks/useCollaborator';
import { getUserRoleLabel } from '@/lib/users/role-label';
import type { CollaboratorSavedSessionKey } from '@/hooks/useCollaborator';
import type { CommunityFeedItem, CommunityTopic } from '@/types/community';
import styles from './config.module.css';

const MISSION_LABELS: Record<string, string> = {
  read_content: 'Leitura de Conteúdo',
};

interface TogglePref {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const NOTIFICATION_PREFS: TogglePref[] = [
  { id: 'campaigns', label: 'Campanhas', description: 'Notificar sobre novas campanhas e atualizações', defaultOn: true },
  { id: 'email', label: 'Resumo por e-mail', description: 'Receber resumo semanal por e-mail', defaultOn: false },
];

const PRIVACY_PREFS: TogglePref[] = [
  { id: 'profile', label: 'Perfil visível', description: 'Outras colaboradoras podem ver seu perfil', defaultOn: true },
  { id: 'analytics', label: 'Dados anonimizados', description: 'Permitir uso de dados anonimizados para melhoria', defaultOn: true },
  {
    id: 'communitySupporterName',
    label: 'Mostrar meu nome ao apoiar',
    description: 'Desativada por padrão. Aplica-se somente a futuras visualizações de quem apoiou uma publicação.',
    defaultOn: false,
  },
];

/** Maps toggle id -> API pref_key */
const TOGGLE_KEY_MAP: Record<string, string> = {
  campaigns: 'notif_campaigns',
  email: 'notif_email',
  profile: 'privacy_profile',
  analytics: 'privacy_analytics',
  communitySupporterName: 'privacy_community_supporter_name',
};

const COMMUNITY_TOPIC_LABELS: Record<CommunityTopic, string> = {
  pausas: 'Pausas',
  sono: 'Sono',
  movimento: 'Movimento',
  cuidado: 'Cuidado',
  geral: 'Geral',
};

type PreferencesLoadState = 'loading' | 'ready' | 'error';

function isValidPreferencesPayload(payload: unknown): payload is {
  preferences: Record<string, '0' | '1'>;
} {
  if (!payload || typeof payload !== 'object' || !('preferences' in payload)) return false;
  const preferences = (payload as { preferences?: unknown }).preferences;
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return false;
  const supporterName = (preferences as Record<string, unknown>).privacy_community_supporter_name;
  return supporterName === '0' || supporterName === '1';
}

function isSavedItemsPage(payload: unknown): payload is {
  items: CommunityFeedItem[];
  nextCursor: string | null;
} {
  if (!payload || typeof payload !== 'object') return false;
  const page = payload as { items?: unknown; nextCursor?: unknown };
  return Array.isArray(page.items)
    && (page.nextCursor === null || typeof page.nextCursor === 'string');
}

function isAuthorizationStatus(status: number): status is 401 | 403 {
  return status === 401 || status === 403;
}

export default function ConfiguracoesPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const canUseCollaboratorCommunity = Boolean(
    authUser && (authUser.role === 'colaboradora' || authUser.also_collaborator === 1),
  );
  const collaboratorSavedSessionKey: CollaboratorSavedSessionKey | null = authUser
    ? [
        authUser.id,
        authUser.companyId ?? null,
        authUser.role,
        canUseCollaboratorCommunity ? 1 : 0,
      ]
    : null;
  const collaboratorSessionId = collaboratorSavedSessionKey
    ? JSON.stringify(collaboratorSavedSessionKey)
    : null;
  const saved = useCollaboratorSaved({
    sessionKey: collaboratorSavedSessionKey,
    enabled: !authLoading && canUseCollaboratorCommunity,
  });
  const preferenceSessionKey = collaboratorSessionId;
  const [nome, setNome] = useState('');
  const [nickname, setNickname] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [cargo, setCargo] = useState('');
  const [deptName, setDeptName] = useState('');
  const [saveLabel, setSaveLabel] = useState('Salvar');

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencySaveLabel, setEmergencySaveLabel] = useState('Salvar contato');

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...NOTIFICATION_PREFS, ...PRIVACY_PREFS].forEach(p => {
      initial[p.id] = p.defaultOn;
    });
    return initial;
  });
  const [preferencesLoadState, setPreferencesLoadState] = useState<PreferencesLoadState>('loading');
  const [preferencesReloadKey, setPreferencesReloadKey] = useState(0);
  const preferenceGenerationRef = useRef(0);
  const currentPreferenceSessionRef = useRef(preferenceSessionKey);
  currentPreferenceSessionRef.current = preferenceSessionKey;
  const supporterWriteGenerationRef = useRef(0);
  const supporterWriteControllerRef = useRef<AbortController | null>(null);
  const [supporterNameSaving, setSupporterNameSaving] = useState(false);
  const [supporterNameFeedback, setSupporterNameFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [savedItems, setSavedItems] = useState<CommunityFeedItem[]>([]);
  const [savedItemsSessionId, setSavedItemsSessionId] = useState<string | null>(null);
  const [savedNextCursor, setSavedNextCursor] = useState<string | null>(null);
  const [savedLoadingMore, setSavedLoadingMore] = useState(false);
  const [savedRemovingId, setSavedRemovingId] = useState<string | null>(null);
  const [savedAuthorizationLost, setSavedAuthorizationLost] = useState(false);
  const [savedAuthorizationRetrying, setSavedAuthorizationRetrying] = useState(false);
  const savedAuthorizationLostRef = useRef(false);
  const [savedFeedback, setSavedFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const savedItemsSnapshot = JSON.stringify(saved.items);
  const currentSavedSessionRef = useRef(collaboratorSessionId);
  currentSavedSessionRef.current = collaboratorSessionId;
  const savedOperationGenerationRef = useRef(0);
  const savedOperationControllersRef = useRef(new Set<AbortController>());
  const savedOperationLockRef = useRef<symbol | null>(null);
  const hasCurrentSavedState = savedItemsSessionId === collaboratorSessionId;
  const visibleSavedItems = hasCurrentSavedState ? savedItems : [];
  const visibleSavedNextCursor = hasCurrentSavedState ? savedNextCursor : null;

  // Archetype
  const [archetype, setArchetype] = useState<{ name: string; key: string; description: string; assignedAt: string } | null>(null);
  const [archetypeLoaded, setArchetypeLoaded] = useState(false);

  // LGPD
  const [exportLabel, setExportLabel] = useState('Exportar meus dados');
  const [deleteLabel, setDeleteLabel] = useState('Solicitar exclusão da conta');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lgpdFeedback, setLgpdFeedback] = useState<string | null>(null);

  // Reminder preferences
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00', '18:00']);
  const [missionReminders, setMissionReminders] = useState<Record<string, boolean>>({
    read_content: true,
  });
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushVapidKey, setPushVapidKey] = useState('');
  const [reminderSaveLabel, setReminderSaveLabel] = useState('Salvar lembretes');

  // Load archetype info
  useEffect(() => {
    fetch('/api/collaborator/archetype')
      .then(r => r.json())
      .then(({ archetype: a }) => {
        if (a) setArchetype(a);
        setArchetypeLoaded(true);
      })
      .catch(() => setArchetypeLoaded(true));
  }, []);

  async function handleExportData() {
    setExportLabel('Exportando...');
    try {
      const res = await fetch('/api/users/me/export');
      if (!res.ok) {
        const err = await res.json();
        setLgpdFeedback(err.error || 'Erro ao exportar dados.');
        setTimeout(() => setLgpdFeedback(null), 4000);
        setExportLabel('Exportar meus dados');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uniher-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportLabel('Dados exportados!');
    } catch {
      setExportLabel('Erro ao exportar');
    } finally {
      setTimeout(() => setExportLabel('Exportar meus dados'), 3000);
    }
  }

  async function handleDeleteRequest() {
    setDeleteLabel('Enviando...');
    setShowDeleteConfirm(false);
    try {
      const res = await fetch('/api/users/me/delete-request', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setLgpdFeedback(result.message);
        setDeleteLabel('Solicitação enviada');
      } else {
        setLgpdFeedback(result.error || 'Erro ao solicitar exclusão.');
        setDeleteLabel('Solicitar exclusão da conta');
      }
    } catch {
      setDeleteLabel('Erro ao solicitar');
    } finally {
      setTimeout(() => {
        setDeleteLabel('Solicitar exclusão da conta');
        setLgpdFeedback(null);
      }, 6000);
    }
  }

  // Preference state is scoped to the current authenticated session.
  useEffect(() => {
    const generation = ++preferenceGenerationRef.current;
    const controller = new AbortController();
    setPreferencesLoadState('loading');
    setSupporterNameFeedback(null);

    if (authLoading) {
      return () => controller.abort();
    }
    if (!preferenceSessionKey) {
      setPreferencesLoadState('error');
      return () => controller.abort();
    }

    async function loadPreferences() {
      try {
        const response = await fetch('/api/users/me/preferences', { signal: controller.signal });
        if (!response.ok) throw new Error('Preference load failed');
        const payload: unknown = await response.json();
        if (!isValidPreferencesPayload(payload)) throw new Error('Invalid preference payload');
        if (controller.signal.aborted || preferenceGenerationRef.current !== generation) return;

        setToggles(prev => {
          const updated = { ...prev };
          const reverseMap = Object.fromEntries(
            Object.entries(TOGGLE_KEY_MAP).map(([toggleId, prefKey]) => [prefKey, toggleId]),
          );
          for (const [key, value] of Object.entries(payload.preferences)) {
            const toggleId = reverseMap[key];
            if (toggleId && (value === '0' || value === '1')) updated[toggleId] = value === '1';
          }
          return updated;
        });
        setPreferencesLoadState('ready');
      } catch (error) {
        if (controller.signal.aborted || preferenceGenerationRef.current !== generation) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPreferencesLoadState('error');
      }
    }

    void loadPreferences();
    return () => {
      controller.abort();
      if (preferenceGenerationRef.current === generation) preferenceGenerationRef.current += 1;
    };
  }, [authLoading, preferenceSessionKey, preferencesReloadKey]);

  useEffect(() => {
    supporterWriteGenerationRef.current += 1;
    supporterWriteControllerRef.current?.abort();
    supporterWriteControllerRef.current = null;
    setSupporterNameSaving(false);
    setSupporterNameFeedback(null);

    return () => {
      supporterWriteGenerationRef.current += 1;
      supporterWriteControllerRef.current?.abort();
      supporterWriteControllerRef.current = null;
    };
  }, [preferenceSessionKey]);

  useEffect(() => {
    savedOperationGenerationRef.current += 1;
    for (const controller of savedOperationControllersRef.current) controller.abort();
    savedOperationControllersRef.current.clear();
    savedOperationLockRef.current = null;
    setSavedItems([]);
    setSavedNextCursor(null);
    setSavedItemsSessionId(collaboratorSessionId);
    setSavedLoadingMore(false);
    setSavedRemovingId(null);
    savedAuthorizationLostRef.current = false;
    setSavedAuthorizationLost(false);
    setSavedAuthorizationRetrying(false);
    setSavedFeedback(null);

    return () => {
      savedOperationGenerationRef.current += 1;
      for (const controller of savedOperationControllersRef.current) controller.abort();
      savedOperationControllersRef.current.clear();
      savedOperationLockRef.current = null;
    };
  }, [collaboratorSessionId]);

  useEffect(() => {
    if (!canUseCollaboratorCommunity || savedAuthorizationLostRef.current) return;
    setSavedItems(saved.items);
    setSavedNextCursor(saved.nextCursor);
    setSavedItemsSessionId(collaboratorSessionId);
    setSavedFeedback(null);
  }, [
    canUseCollaboratorCommunity,
    collaboratorSessionId,
    saved.nextCursor,
    savedItemsSnapshot,
  ]);

  useEffect(() => {
    setBrowserSupported('Notification' in window && 'serviceWorker' in navigator);
    // Check if Web Push is available
    fetch('/api/push/vapid-key')
      .then(r => r.json())
      .then(data => {
        if (data.enabled && data.publicKey) {
          setPushAvailable(true);
          setPushVapidKey(data.publicKey);
          // Check existing push subscription
          navigator.serviceWorker?.ready?.then(reg => {
            reg.pushManager.getSubscription().then(sub => {
              if (sub) setBrowserEnabled(true);
            });
          }).catch(() => {});
        }
      }).catch(() => {});
    fetch('/api/users/me/notification-preferences')
      .then(r => r.json())
      .then(({ prefs }) => {
        if (prefs) {
          setReminderTimes(prefs.reminder_times ?? ['08:00', '18:00']);
          setMissionReminders(prefs.mission_reminders ?? {});
          // If push is not available, fall back to browser_enabled flag
          if (!pushAvailable) setBrowserEnabled(prefs.browser_enabled ?? false);
        }
      }).catch(() => {});
  }, []);

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function requestBrowserPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // If push is available, register SW + subscribe
    if (pushAvailable && pushVapidKey && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushVapidKey) as BufferSource,
        });
        const subJson = subscription.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
          }),
        });
      } catch (err) {
        console.error('[PUSH] Subscribe error:', err);
      }
    }

    setBrowserEnabled(true);
  }

  async function disablePushNotifications() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
      } catch (err) {
        console.error('[PUSH] Unsubscribe error:', err);
      }
    }
    setBrowserEnabled(false);
  }

  async function handleSaveReminders() {
    setReminderSaveLabel('Salvando...');
    try {
      await fetch('/api/users/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_times: reminderTimes, mission_reminders: missionReminders, browser_enabled: browserEnabled }),
      });
      setReminderSaveLabel('✓ Salvo!');
    } catch {
      setReminderSaveLabel('Erro ao salvar');
    } finally {
      setTimeout(() => setReminderSaveLabel('Salvar lembretes'), 2500);
    }
  }

  function addReminderTime() {
    if (reminderTimes.length >= 5) return;
    setReminderTimes(t => [...t, '12:00']);
  }

  function updateReminderTime(index: number, value: string) {
    setReminderTimes(t => t.map((v, i) => i === index ? value : v));
  }

  function removeReminderTime(index: number) {
    setReminderTimes(t => t.filter((_, i) => i !== index));
  }

  // Load current user data
  useEffect(() => {
    fetch('/api/users/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (user) {
          setNome(user.name || '');
          setNickname(user.nickname || '');
          setEmailVal(user.email || '');
          setDeptName(user.department_name || '');
          setCargo(getUserRoleLabel(user.role));
          setEmergencyName(user.emergency_contact_name || '');
          setEmergencyPhone(user.emergency_contact_phone || '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSupporterNameToggle() {
    if (preferencesLoadState !== 'ready' || supporterNameSaving || !preferenceSessionKey) return;
    const id = 'communitySupporterName';
    const previousValue = toggles[id];
    const newValue = !previousValue;
    const sessionKey = preferenceSessionKey;
    const generation = ++supporterWriteGenerationRef.current;
    supporterWriteControllerRef.current?.abort();
    const controller = new AbortController();
    supporterWriteControllerRef.current = controller;
    const isCurrent = () => (
      !controller.signal.aborted
      && supporterWriteGenerationRef.current === generation
      && currentPreferenceSessionRef.current === sessionKey
    );
    setToggles(prev => ({ ...prev, [id]: newValue }));
    setSupporterNameSaving(true);
    setSupporterNameFeedback(null);

    try {
      const response = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { privacy_community_supporter_name: newValue ? '1' : '0' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Preference update failed');
      if (!isCurrent()) return;
      setSupporterNameFeedback({ kind: 'success', message: 'Preferência salva.' });
    } catch {
      if (!isCurrent()) return;
      setToggles(prev => ({ ...prev, [id]: previousValue }));
      setSupporterNameFeedback({
        kind: 'error',
        message: 'Não foi possível salvar. A configuração anterior foi restaurada.',
      });
    } finally {
      if (isCurrent()) {
        setSupporterNameSaving(false);
        if (supporterWriteControllerRef.current === controller) {
          supporterWriteControllerRef.current = null;
        }
      }
    }
  }

  const handleToggle = (id: string) => {
    if (preferencesLoadState !== 'ready') return;
    if (id === 'communitySupporterName') {
      void handleSupporterNameToggle();
      return;
    }
    const newValue = !toggles[id];
    setToggles(prev => ({ ...prev, [id]: newValue }));

    const prefKey = TOGGLE_KEY_MAP[id];
    if (prefKey) {
      fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { [prefKey]: newValue ? '1' : '0' } }),
      }).catch(() => {
        // Revert on failure
        setToggles(prev => ({ ...prev, [id]: !newValue }));
      });
    }
  };

  async function purgeSavedAuthorizationBoundary(sessionId: string) {
    if (currentSavedSessionRef.current !== sessionId) return;
    savedOperationGenerationRef.current += 1;
    for (const controller of savedOperationControllersRef.current) controller.abort();
    savedOperationControllersRef.current.clear();
    savedOperationLockRef.current = null;
    setSavedItems([]);
    setSavedNextCursor(null);
    setSavedItemsSessionId(sessionId);
    savedAuthorizationLostRef.current = true;
    setSavedAuthorizationLost(true);
    setSavedAuthorizationRetrying(false);
    setSavedFeedback(null);
    setSavedLoadingMore(false);
    setSavedRemovingId(null);
    try {
      await saved.mutate(undefined, { revalidate: false });
    } catch {
      // Local private state is already purged; cache cleanup is best effort.
    }
  }

  async function handleRetrySavedAuthorization() {
    if (
      !savedAuthorizationLost
      || savedAuthorizationRetrying
      || savedOperationLockRef.current
      || !collaboratorSessionId
    ) return;
    const lock = Symbol('saved-authorization-retry');
    savedOperationLockRef.current = lock;
    const sessionId = collaboratorSessionId;
    const generation = ++savedOperationGenerationRef.current;
    setSavedAuthorizationRetrying(true);
    try {
      const refreshedPage = await saved.mutate();
      if (
        savedOperationGenerationRef.current !== generation
        || currentSavedSessionRef.current !== sessionId
      ) return;
      if (!isSavedItemsPage(refreshedPage)) throw new Error('Invalid saved retry page');
      setSavedItems(refreshedPage.items);
      setSavedNextCursor(refreshedPage.nextCursor);
      setSavedItemsSessionId(sessionId);
      savedAuthorizationLostRef.current = false;
      setSavedAuthorizationLost(false);
    } catch {
      // Authorization loss remains visible until a valid private page is returned.
    } finally {
      if (
        savedOperationLockRef.current === lock
        && savedOperationGenerationRef.current === generation
        && currentSavedSessionRef.current === sessionId
      ) {
        savedOperationLockRef.current = null;
        setSavedAuthorizationRetrying(false);
      }
    }
  }

  async function handleRemoveSaved(item: CommunityFeedItem) {
    if (savedOperationLockRef.current || !collaboratorSessionId || !canUseCollaboratorCommunity) return;
    const lock = Symbol('saved-delete');
    savedOperationLockRef.current = lock;
    for (const pendingController of savedOperationControllersRef.current) pendingController.abort();
    savedOperationControllersRef.current.clear();
    const sessionId = collaboratorSessionId;
    const generation = ++savedOperationGenerationRef.current;
    const controller = new AbortController();
    savedOperationControllersRef.current.add(controller);
    const isCurrent = () => (
      !controller.signal.aborted
      && savedOperationGenerationRef.current === generation
      && currentSavedSessionRef.current === sessionId
    );
    setSavedRemovingId(item.id);
    setSavedFeedback(null);
    try {
      const response = await fetch(`/api/collaborator/feed/${encodeURIComponent(item.id)}/save`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      if (isAuthorizationStatus(response.status)) {
        await purgeSavedAuthorizationBoundary(sessionId);
        return;
      }
      if (!response.ok) throw new Error('Saved item removal failed');
      if (!isCurrent()) return;
      setSavedItems(current => current.filter(candidate => candidate.id !== item.id));
      setSavedNextCursor(null);
      setSavedFeedback({ kind: 'success', message: `${item.title} removido dos salvos.` });
      try {
        const refreshedPage = await saved.mutate();
        if (!isCurrent()) return;
        if (!isSavedItemsPage(refreshedPage)) throw new Error('Saved revalidation returned no page');
        setSavedItems(refreshedPage.items);
        setSavedNextCursor(refreshedPage.nextCursor);
      } catch {
        if (!isCurrent()) return;
        setSavedNextCursor(null);
        setSavedFeedback({
          kind: 'success',
          message: `${item.title} removido dos salvos. A lista será atualizada novamente.`,
        });
      }
    } catch {
      if (!isCurrent()) return;
      setSavedFeedback({
        kind: 'error',
        message: 'Não foi possível remover este item dos salvos. Tente novamente.',
      });
    } finally {
      savedOperationControllersRef.current.delete(controller);
      if (savedOperationLockRef.current === lock) {
        savedOperationLockRef.current = null;
        if (isCurrent()) setSavedRemovingId(null);
      }
    }
  }

  async function handleLoadMoreSaved() {
    if (!visibleSavedNextCursor || savedOperationLockRef.current || !collaboratorSessionId) return;
    const lock = Symbol('saved-page');
    savedOperationLockRef.current = lock;
    const cursor = visibleSavedNextCursor;
    const sessionId = collaboratorSessionId;
    const generation = ++savedOperationGenerationRef.current;
    const controller = new AbortController();
    savedOperationControllersRef.current.add(controller);
    const isCurrent = () => (
      !controller.signal.aborted
      && savedOperationGenerationRef.current === generation
      && currentSavedSessionRef.current === sessionId
    );
    setSavedLoadingMore(true);
    setSavedFeedback(null);
    try {
      const response = await fetch(
        `/api/collaborator/saved?limit=20&cursor=${encodeURIComponent(cursor)}`,
        { signal: controller.signal },
      );
      if (isAuthorizationStatus(response.status)) {
        await purgeSavedAuthorizationBoundary(sessionId);
        return;
      }
      if (!response.ok) throw new Error('Saved items page failed');
      const payload: unknown = await response.json();
      if (!isSavedItemsPage(payload)) throw new Error('Invalid saved items page');
      if (!isCurrent()) return;
      setSavedItems(current => {
        const byId = new Map(current.map(item => [item.id, item]));
        for (const item of payload.items) byId.set(item.id, item);
        return [...byId.values()];
      });
      setSavedNextCursor(payload.nextCursor);
    } catch {
      if (!isCurrent()) return;
      setSavedFeedback({
        kind: 'error',
        message: 'Não foi possível carregar mais itens salvos. Tente novamente.',
      });
    } finally {
      savedOperationControllersRef.current.delete(controller);
      if (savedOperationLockRef.current === lock) {
        savedOperationLockRef.current = null;
        if (isCurrent()) setSavedLoadingMore(false);
      }
    }
  }

  async function handleSaveProfile() {
    setSaveLabel('Salvando...');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      if (res.ok) {
        setSaveLabel('Salvo!');
      } else {
        const d = await res.json();
        setSaveLabel(d.error || 'Erro ao salvar');
      }
    } catch {
      setSaveLabel('Erro ao salvar');
    } finally {
      setTimeout(() => setSaveLabel('Salvar'), 2000);
    }
  }

  async function handleChangePassword() {
    setPwdMsg('');
    if (newPwd !== confirmPwd) { setPwdMsg('As senhas não coincidem.'); return; }
    if (newPwd.length < 8) { setPwdMsg('A nova senha precisa ter no mínimo 8 caracteres.'); return; }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwdMsg('Senha alterada com sucesso!');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        setTimeout(() => setShowPasswordChange(false), 2000);
      } else {
        setPwdMsg(d.error || 'Erro ao alterar senha.');
      }
    } catch {
      setPwdMsg('Erro de conexão.');
    }
    setPwdSaving(false);
  }

  async function handleSaveEmergency() {
    setEmergencySaveLabel('Salvando...');
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        }),
      });
      setEmergencySaveLabel('✓ Contato salvo!');
    } catch {
      setEmergencySaveLabel('Erro ao salvar');
    } finally {
      setTimeout(() => setEmergencySaveLabel('Salvar contato'), 2500);
    }
  }

  const renderToggle = (pref: TogglePref) => {
    const isSupporterName = pref.id === 'communitySupporterName';
    const descriptionId = `preference-${pref.id}-description`;
    const feedbackId = `preference-${pref.id}-feedback`;
    const feedbackMessage = supporterNameSaving
      ? 'Salvando preferência...'
      : supporterNameFeedback?.message;

    return (
      <div key={pref.id} className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <span className={styles.toggleLabel}>{pref.label}</span>
          <span id={descriptionId} className={styles.toggleDesc}>{pref.description}</span>
          {isSupporterName && feedbackMessage && (
            <span
              id={feedbackId}
              className={styles.toggleDesc}
              role={supporterNameFeedback?.kind === 'error' ? 'alert' : 'status'}
              aria-live={supporterNameFeedback?.kind === 'error' ? 'assertive' : 'polite'}
            >
              {feedbackMessage}
            </span>
          )}
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.toggleInput}
            aria-label={pref.label}
            aria-describedby={`${descriptionId}${isSupporterName && feedbackMessage ? ` ${feedbackId}` : ''}`}
            checked={toggles[pref.id]}
            disabled={preferencesLoadState !== 'ready' || (isSupporterName && supporterNameSaving)}
            onChange={() => handleToggle(pref.id)}
          />
          <span className={styles.toggleSlider} />
        </label>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configurações</h1>

      <div className={styles.sections}>
        {/* Perfil */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Perfil</h2>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nome <span style={{ fontSize: 10, color: '#999' }}>(definido pelo admin)</span></label>
              <input className={styles.input} type="text" value={nome} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Apelido <span style={{ fontSize: 10, color: '#999' }}>(como quer ser chamada)</span></label>
              <input className={styles.input} type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Edu, Duda..." />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input className={styles.input} type="email" value={emailVal} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Papel</label>
              <input className={styles.input} type="text" value={cargo} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            {deptName && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setor</label>
                <input className={styles.input} type="text" value={deptName} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            )}
          </div>
          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={handleSaveProfile}>
              {saveLabel}
            </button>
          </div>
        </div>

        {/* Trocar Senha */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Segurança</h2>
          {!showPasswordChange ? (
            <button
              className={styles.saveBtn}
              onClick={() => setShowPasswordChange(true)}
              style={{ background: 'transparent', border: '1px solid #e8dfd0', color: '#7a6b5a' }}
            >
              Alterar minha senha
            </button>
          ) : (
            <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Senha atual *</label>
                <input className={styles.input} type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} autoComplete="current-password" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nova senha *</label>
                <input className={styles.input} type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Confirmar nova senha *</label>
                <input className={styles.input} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password" />
              </div>
              {pwdMsg && <p style={{ fontSize: 13, color: pwdMsg.includes('sucesso') ? '#16a34a' : '#dc2626', margin: 0 }}>{pwdMsg}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.saveBtn} onClick={handleChangePassword} disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}>
                  {pwdSaving ? 'Salvando...' : 'Alterar senha'}
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => { setShowPasswordChange(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdMsg(''); }}
                  style={{ background: 'transparent', border: '1px solid #e8dfd0', color: '#7a6b5a' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contato de Emergência */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🆘 Contato de Confiança</h2>
          <p className={styles.sectionDesc}>
            Este contato receberá uma mensagem de alerta quando você acionar o botão de pânico na sua página inicial.
          </p>
          <div className={styles.emergencyBanner}>
            <span className={styles.emergencyIcon}>🔒</span>
            <span>Seus dados de emergência são privados e nunca serão compartilhados com a empresa.</span>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nome do contato</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Ex: Maria (minha mãe)"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>WhatsApp / Telefone</label>
              <input
                className={styles.input}
                type="tel"
                placeholder="Ex: +55 11 99999-0000"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.saveRow}>
            <button
              className={styles.saveBtn}
              onClick={handleSaveEmergency}
              disabled={!emergencyName || !emergencyPhone}
            >
              {emergencySaveLabel}
            </button>
          </div>
        </div>

        {/* Notificacoes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notificações</h2>
          <div className={styles.toggleList}>
            {NOTIFICATION_PREFS.map(renderToggle)}
          </div>
        </div>

        {/* Privacidade */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacidade</h2>
          {preferencesLoadState === 'loading' && (
            <p className={styles.stateMessage} role="status" aria-live="polite">
              Carregando preferências...
            </p>
          )}
          {preferencesLoadState === 'error' && (
            <div className={styles.stateBlock}>
              <p className={styles.errorMessage} role="alert">
                Não foi possível carregar suas preferências. Os controles permanecem desativados.
              </p>
              <button
                type="button"
                className={styles.inlineAction}
                onClick={() => setPreferencesReloadKey(current => current + 1)}
              >
                Tentar carregar preferências novamente
              </button>
            </div>
          )}
          <div className={styles.toggleList}>
            {PRIVACY_PREFS.map(renderToggle)}
          </div>
          <p className={styles.privacyBoundary}>
            Check-ins, semáforo e respostas da NR-1 nunca entram na comunidade.
          </p>
        </div>

        {/* Itens salvos */}
        {canUseCollaboratorCommunity && (
          <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Itens salvos</h2>
          <p className={styles.sectionDesc}>
            Conteúdos guardados aqui são privados e visíveis somente para você.
          </p>
          {savedAuthorizationLost ? (
            <div className={styles.stateBlock}>
              <p className={styles.errorMessage} role="alert">
                Sessão expirada ou acesso alterado. Entre novamente para continuar.
              </p>
              <button
                type="button"
                className={styles.inlineAction}
                disabled={savedAuthorizationRetrying}
                onClick={() => void handleRetrySavedAuthorization()}
              >
                {savedAuthorizationRetrying
                  ? 'Verificando acesso...'
                  : 'Tentar carregar itens salvos novamente'}
              </button>
            </div>
          ) : saved.isLoading ? (
            <p className={styles.stateMessage} role="status" aria-live="polite">
              Carregando itens salvos...
            </p>
          ) : saved.error ? (
            <div className={styles.stateBlock}>
              <p className={styles.errorMessage} role="alert">
                Não foi possível carregar seus itens salvos.
              </p>
              <button
                type="button"
                className={styles.inlineAction}
                onClick={() => {
                  setSavedFeedback(null);
                  void saved.mutate();
                }}
              >
                Tentar carregar itens salvos novamente
              </button>
            </div>
          ) : visibleSavedItems.length === 0 ? (
            <p className={styles.stateMessage}>Você ainda não salvou conteúdos da comunidade.</p>
          ) : (
            <ul className={styles.savedList}>
              {visibleSavedItems.map(item => (
                <li key={item.id} className={styles.savedItem}>
                  <div className={styles.savedItemCopy}>
                    <span className={styles.savedItemMeta}>
                      {COMMUNITY_TOPIC_LABELS[item.topic]} · {item.readTimeMinutes} min
                    </span>
                    <h3 className={styles.savedItemTitle}>{item.title}</h3>
                    <p className={styles.savedItemSummary}>{item.summary}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.savedRemoveButton}
                    aria-label={`Remover ${item.title} dos salvos`}
                    disabled={savedRemovingId !== null || savedLoadingMore}
                    onClick={() => void handleRemoveSaved(item)}
                  >
                    {savedRemovingId === item.id ? 'Removendo...' : 'Remover'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {visibleSavedNextCursor && !savedAuthorizationLost && !saved.isLoading && !saved.error && (
            <div className={styles.savedActions}>
              <button
                type="button"
                className={styles.inlineAction}
                disabled={savedLoadingMore || savedRemovingId !== null}
                onClick={() => void handleLoadMoreSaved()}
              >
                {savedLoadingMore ? 'Carregando...' : 'Carregar mais itens salvos'}
              </button>
            </div>
          )}
          {savedFeedback && (
            <p
              className={savedFeedback.kind === 'error' ? styles.errorMessage : styles.stateMessage}
              role={savedFeedback.kind === 'error' ? 'alert' : 'status'}
              aria-live={savedFeedback.kind === 'error' ? 'assertive' : 'polite'}
            >
              {savedFeedback.message}
            </p>
          )}
          </div>
        )}

        {/* Lembretes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⏰ Lembretes de Missões</h2>
          <p className={styles.sectionDesc}>
            Configure horários para receber lembretes e manter sua sequência de missões diárias.
          </p>

          {/* Browser notification toggle */}
          {browserSupported && (
            <div className={styles.toggleRow} style={{ marginBottom: 16 }}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Notificações do navegador</span>
                <span className={styles.toggleDesc}>
                  {browserEnabled ? '✓ Ativadas — no celular instalado, os lembretes podem aparecer mesmo com o app fechado ou após perder o login' : 'Receba alertas no navegador e no celular instalado nos horários configurados'}
                </span>
              </div>
              <button
                onClick={browserEnabled ? disablePushNotifications : requestBrowserPermission}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  background: browserEnabled ? '#f43f5e' : 'white',
                  color: browserEnabled ? 'white' : 'var(--text-600)',
                  borderColor: browserEnabled ? '#f43f5e' : 'var(--border-2)',
                }}
              >
                {browserEnabled ? '✓ Ativada' : 'Ativar'}
              </button>
            </div>
          )}

          {/* Reminder times */}
          <p className={styles.label} style={{ marginBottom: 8 }}>Horários de lembrete (máx. 5)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {reminderTimes.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="time"
                  value={t}
                  onChange={e => updateReminderTime(i, e.target.value)}
                  className={styles.input}
                  style={{ width: 110 }}
                />
                {reminderTimes.length > 1 && (
                  <button
                    onClick={() => removeReminderTime(i)}
                    style={{ color: '#f43f5e', fontWeight: 700, fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {reminderTimes.length < 5 && (
              <button
                onClick={addReminderTime}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border-2)',
                  fontSize: '0.78rem', color: 'var(--text-500)', cursor: 'pointer', background: 'none',
                }}
              >
                + Adicionar horário
              </button>
            )}
          </div>

          {/* Per-mission toggles */}
          <p className={styles.label} style={{ marginBottom: 8 }}>Lembrar para</p>
          <div className={styles.toggleList}>
            {Object.entries(MISSION_LABELS).map(([key, label]) => (
              <div key={key} className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>{label}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={missionReminders[key] ?? false}
                    onChange={() => setMissionReminders(prev => ({ ...prev, [key]: !prev[key] }))}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            ))}
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={handleSaveReminders}>
              {reminderSaveLabel}
            </button>
          </div>
        </div>

        {/* Seu Arquétipo */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Seu Arquétipo</h2>
          {!archetypeLoaded ? (
            <p className={styles.sectionDesc}>Carregando...</p>
          ) : archetype ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>
                  {archetype.key === 'arch_guardia' ? '🛡️' : archetype.key === 'arch_protetora' ? '🌸' : archetype.key === 'arch_guerreira' ? '⚔️' : '⚖️'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-900)' }}>{archetype.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-400)' }}>
                    Atribuído em {new Date(archetype.assignedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <p className={styles.sectionDesc} style={{ marginBottom: 12 }}>{archetype.description}</p>
              <a
                href="/quiz"
                style={{
                  display: 'inline-block', fontSize: '0.82rem', fontWeight: 600,
                  color: 'var(--rose-500)', textDecoration: 'none',
                }}
              >
                Refazer quiz →
              </a>
            </div>
          ) : (
            <div>
              <p className={styles.sectionDesc}>Faça o quiz para descobrir seu perfil de saúde e receber recomendações personalizadas.</p>
              <a
                href="/quiz"
                style={{
                  display: 'inline-block', padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--rose-500)', color: 'white', fontSize: '0.85rem',
                  fontWeight: 600, textDecoration: 'none',
                }}
              >
                Fazer o quiz
              </a>
            </div>
          )}
        </div>

        {/* Privacidade e Dados (LGPD) */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacidade e Dados</h2>
          <p className={styles.sectionDesc}>
            Conforme a LGPD, você pode exportar todos os seus dados ou solicitar a exclusão da sua conta a qualquer momento.
          </p>

          {lgpdFeedback && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
              background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
              fontSize: '0.82rem', fontWeight: 500,
            }}>
              {lgpdFeedback}
            </div>
          )}

          <div className={styles.lgpdActions}>
            <div className={styles.lgpdItem}>
              <div className={styles.lgpdCopy}>
                <div className={styles.lgpdItemTitle}>Exportar meus dados</div>
                <div className={styles.lgpdItemDesc}>Baixe uma cópia de todos os seus dados em formato JSON</div>
              </div>
              <button
                onClick={handleExportData}
                className={styles.lgpdButton}
              >
                {exportLabel}
              </button>
            </div>

            <div className={styles.lgpdItem}>
              <div className={styles.lgpdCopy}>
                <div className={styles.lgpdItemTitle}>Solicitar exclusão da conta</div>
                <div className={styles.lgpdItemDesc}>Sua conta será removida em até 15 dias úteis após análise</div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`${styles.lgpdButton} ${styles.lgpdDangerButton}`}
              >
                {deleteLabel}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚠️</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-900)' }}>Tem certeza?</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-500)', marginTop: 8 }}>
                  Esta ação solicitará a exclusão permanente da sua conta e todos os seus dados. O processo é irreversível após a aprovação.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-1)',
                    background: 'white', color: 'var(--text-600)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRequest}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
                    background: '#dc2626', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Confirmar exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
