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

export default function ConfiguracoesPage() {
  const [nome, setNome] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [cargo, setCargo] = useState('');
  const [saveLabel, setSaveLabel] = useState('Salvar');

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

  // Reminder preferences
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00', '18:00']);
  const [missionReminders, setMissionReminders] = useState<Record<string, boolean>>({
    check_in: true, drink_water: true, complete_challenge: true, update_semaforo: true,
  });
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [reminderSaveLabel, setReminderSaveLabel] = useState('Salvar lembretes');

  useEffect(() => {
    setBrowserSupported('Notification' in window);
    fetch('/api/users/me/notification-preferences')
      .then(r => r.json())
      .then(({ prefs }) => {
        if (prefs) {
          setReminderTimes(prefs.reminder_times ?? ['08:00', '18:00']);
          setMissionReminders(prefs.mission_reminders ?? {});
          setBrowserEnabled(prefs.browser_enabled ?? false);
        }
      }).catch(() => {});
  }, []);

  async function requestBrowserPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    setBrowserEnabled(enabled);
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
          setEmailVal(user.email || '');
          setEmergencyName(user.emergency_contact_name || '');
          setEmergencyPhone(user.emergency_contact_phone || '');
        }
      })
      .catch(() => {
        // Fallback to static values
        setNome('Ana Maria');
        setEmailVal('ana.maria@empresa.com');
        setCargo('Analista de RH');
      });
  }, []);

  const handleToggle = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  async function handleSaveProfile() {
    setSaveLabel('Salvando...');
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome }),
      });
      setSaveLabel('✓ Salvo!');
    } catch {
      setSaveLabel('Erro ao salvar');
    } finally {
      setTimeout(() => setSaveLabel('Salvar'), 2000);
    }
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
              <label className={styles.label}>Nome</label>
              <input className={styles.input} type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input className={styles.input} type="email" value={emailVal} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Departamento</label>
              <input className={styles.input} type="text" defaultValue="RH" readOnly style={{ opacity: 0.6 }} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Cargo</label>
              <input className={styles.input} type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
          </div>
          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={handleSaveProfile}>
              {saveLabel}
            </button>
          </div>
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
                  {browserEnabled ? '✓ Ativadas — você receberá alertas mesmo com a aba em segundo plano' : 'Receba alertas no navegador nos horários configurados'}
                </span>
              </div>
              <button
                onClick={browserEnabled ? () => setBrowserEnabled(false) : requestBrowserPermission}
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
      </div>
    </div>
  );
}
