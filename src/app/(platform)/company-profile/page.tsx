'use client';

import { useState } from 'react';
import { COMPANY } from '@/data/mock-company';
import styles from './company.module.css';

export default function CompanyProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  // Editable fields
  const [companyName, setCompanyName] = useState(COMPANY.name);
  const [tradeName, setTradeName] = useState(COMPANY.tradeName);
  const [cnpj, setCnpj] = useState(COMPANY.cnpj);
  const [sector, setSector] = useState(COMPANY.sector);
  const [contactName, setContactName] = useState(COMPANY.contact.name);
  const [contactEmail, setContactEmail] = useState(COMPANY.contact.email);
  const [contactPhone, setContactPhone] = useState(COMPANY.contact.phone);

  // Snapshot for cancel
  const [snapshot, setSnapshot] = useState({
    companyName: COMPANY.name,
    tradeName: COMPANY.tradeName,
    cnpj: COMPANY.cnpj,
    sector: COMPANY.sector,
    contactName: COMPANY.contact.name,
    contactEmail: COMPANY.contact.email,
    contactPhone: COMPANY.contact.phone,
  });

  const startEditing = () => {
    setSnapshot({ companyName, tradeName, cnpj, sector, contactName, contactEmail, contactPhone });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setCompanyName(snapshot.companyName);
    setTradeName(snapshot.tradeName);
    setCnpj(snapshot.cnpj);
    setSector(snapshot.sector);
    setContactName(snapshot.contactName);
    setContactEmail(snapshot.contactEmail);
    setContactPhone(snapshot.contactPhone);
    setIsEditing(false);
  };

  const saveEditing = () => {
    setSaveLabel('Salvando...');
    setTimeout(() => {
      setSaveLabel('\u2713 Salvo!');
      setIsEditing(false);
      setTimeout(() => setSaveLabel(''), 2000);
    }, 800);
  };

  const stats = [
    { label: 'Colaboradoras', value: COMPANY.collaboratorCount.toLocaleString('pt-BR') },
    { label: 'Missoes Ativas', value: COMPANY.missionsActive },
    { label: 'Pontos Totais', value: COMPANY.totalPoints.toLocaleString('pt-BR') },
    { label: 'Plano Atual', value: COMPANY.plan, isBadge: true },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoPlaceholder}>&#127970;</div>
          <div>
            <h1 className={styles.companyName}>{companyName}</h1>
            <p className={styles.cnpj}>CNPJ: {cnpj}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {saveLabel && <span className={styles.saveLabel}>{saveLabel}</span>}
          {isEditing ? (
            <>
              <button className={styles.saveBtn} onClick={saveEditing}>
                Salvar
              </button>
              <button className={styles.cancelBtn} onClick={cancelEditing}>
                Cancelar
              </button>
            </>
          ) : (
            <button className={styles.editBtn} onClick={startEditing}>
              Editar Dados
            </button>
          )}
        </div>
      </div>

      <div className={styles.statsRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statValue}>
              {stat.isBadge ? (
                <span className={styles.planBadge}>{stat.value}</span>
              ) : (
                stat.value
              )}
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Informacoes da Empresa</h2>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Razao Social</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{companyName}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Nome Fantasia</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{tradeName}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>CNPJ</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{cnpj}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Setor</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{sector}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>N. de Colaboradoras</span>
              <span className={styles.fieldValue}>{COMPANY.collaboratorCount}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Membro desde</span>
              <span className={styles.fieldValue}>{COMPANY.memberSince}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contato RH</h2>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Nome</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{contactName}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>E-mail</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{contactEmail}</span>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Telefone</span>
              {isEditing ? (
                <input
                  className={styles.fieldInput}
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              ) : (
                <span className={styles.fieldValue}>{contactPhone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
