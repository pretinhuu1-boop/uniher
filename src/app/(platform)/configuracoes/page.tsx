'use client';

import { useState, useEffect } from 'react';
import styles from './config.module.css';

const MISSION_LABELS: Record<string, string> = {
  check_in: 'Check-in Diário',
  drink_water: 'Hidratação',
  complete_challenge: 'Desafios',
  update_semaforo: 'Semáforo de Saúde',
  read_content: 'Leitura de Conteúdo',
  share_badge: 'Compartilhar Badge',
};

interface TogglePref {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const NOTIFICATION_PREFS: TogglePref[] = [
  { id: 'badges', label: 'Novos badges', description: 'Notificar quando desbloquear um badge', defaultOn: true },
  { id: 'campaigns', label: 'Campanhas', description: 'Notificar sobre novas campanhas e atualizacoes', defaultOn: true },
  { id: 'challenges', label: 'Desafios', description: 'Lembrar sobre desafios ativos e prazos', defaultOn: true },
  { id: 'email', label: 'Resumo por e-mail', description: 'Receber resumo semanal por e-mail', defaultOn: false },
];

const PRIVACY_PREFS: TogglePref[] = [
  { id: 'ranking', label: 'Exibir no ranking', description: 'Seu departamento aparece no ranking geral', defaultOn: true },
  { id: 'profile', label: 'Perfil visivel', description: 'Outros colaboradoras podem ver seu perfil', defaultOn: true },
  { id: 'analytics', label: 'Dados anonimizados', description: 'Permitir uso de dados anonimizados para melhoria', defaultOn: true },
];

/** Maps toggle id -> API pref_key */
const TOGGLE_KEY_MAP: Record<string, string> = {
  badges: 'notif_badges',
  campaigns: 'notif_campaigns',
  challenges: 'notif_challenges',
  email: 'notif_email',
  ranking: 'privacy_ranking',
  profile: 'privacy_profile',
  analytics: 'privacy_analytics',
};

export default function ConfiguracoesPage() {
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
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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
    check_in: true, drink_water: true, complete_challenge: true, update_semaforo: true,
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

  // Load notification/privacy toggle preferences from API
  useEffect(() => {
    fetch('/api/users/me/preferences')
      .then(r => r.json())
      .then(({ preferences }) => {
        if (preferences && typeof preferences === 'object') {
          setToggles(prev => {
            const updated = { ...prev };
            // Reverse map: pref_key -> toggle id
            const reverseMap: Record<string, string> = {};
            for (const [toggleId, prefKey] of Object.entries(TOGGLE_KEY_MAP)) {
              reverseMap[prefKey] = toggleId;
            }
            for (const [key, value] of Object.entries(preferences)) {
              const toggleId = reverseMap[key];
              if (toggleId) {
                updated[toggleId] = value === '1';
              }
            }
            return updated;
          });
        }
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));
  }, []);

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
          setCargo(user.role === 'rh' ? 'Admin Empresa' : user.role === 'lideranca' ? 'Liderança' : 'Colaboradora');
          setEmergencyName(user.emergency_contact_name || '');
          setEmergencyPhone(user.emergency_contact_phone || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleToggle = (id: string) => {
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

  const renderToggle = (pref: TogglePref) => (
    <div key={pref.id} className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <span className={styles.toggleLabel}>{pref.label}</span>
        <span className={styles.toggleDesc}>{pref.description}</span>
      </div>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={toggles[pref.id]}
          onChange={() => handleToggle(pref.id)}
        />
        <span className={styles.toggleSlider} />
      </label>
    </div>
  );

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
          <div className={styles.toggleList}>
            {PRIVACY_PREFS.map(renderToggle)}
          </div>
        </div>

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-1)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-900)' }}>Exportar meus dados</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-400)' }}>Baixe uma cópia de todos os seus dados em formato JSON</div>
              </div>
              <button
                onClick={handleExportData}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem',
                  fontWeight: 600, border: '1px solid var(--border-2)', background: 'white',
                  color: 'var(--text-700)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {exportLabel}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-900)' }}>Solicitar exclusão da conta</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-400)' }}>Sua conta será removida em até 15 dias úteis após análise</div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem',
                  fontWeight: 600, border: '1px solid #fca5a5', background: '#fff1f2',
                  color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
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
