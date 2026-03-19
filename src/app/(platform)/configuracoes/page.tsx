'use client';

import { useState } from 'react';
import styles from './config.module.css';

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
  const [nome, setNome] = useState('Ana Maria');
  const [emailVal, setEmailVal] = useState('ana.maria@empresa.com');
  const [cargo, setCargo] = useState('Analista de RH');
  const [saveLabel, setSaveLabel] = useState('Salvar');

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...NOTIFICATION_PREFS, ...PRIVACY_PREFS].forEach(p => {
      initial[p.id] = p.defaultOn;
    });
    return initial;
  });

  const handleToggle = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
      <h1 className={styles.title}>Configuracoes</h1>

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
              <input className={styles.input} type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Departamento</label>
              <input className={styles.input} type="text" defaultValue="RH" readOnly />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Cargo</label>
              <input className={styles.input} type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
          </div>
          <div className={styles.saveRow}>
            <button
              className={styles.saveBtn}
              onClick={() => {
                setSaveLabel('✓ Salvo!');
                setTimeout(() => setSaveLabel('Salvar'), 2000);
              }}
            >
              {saveLabel}
            </button>
          </div>
        </div>

        {/* Notificacoes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notificacoes</h2>
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
      </div>
    </div>
  );
}
