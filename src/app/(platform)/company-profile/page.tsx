'use client';

import { useState } from 'react';
import { COMPANY } from '@/data/mock-company';
import { cn } from '@/lib/utils';

function EditField({ label, value, onChange, isEditing, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; isEditing: boolean; type?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400 mb-1">{label}</dt>
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-10 px-3 text-sm font-medium text-uni-text-900 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
        />
      ) : (
        <dd className="text-sm font-semibold text-uni-text-900">{value || '–'}</dd>
      )}
    </div>
  );
}

export default function CompanyProfilePage() {
  const [isEditing, setIsEditing]     = useState(false);
  const [saveLabel, setSaveLabel]     = useState('');

  const [companyName,   setCompanyName]   = useState(COMPANY.name);
  const [tradeName,     setTradeName]     = useState(COMPANY.tradeName);
  const [cnpj,          setCnpj]          = useState(COMPANY.cnpj);
  const [sector,        setSector]        = useState(COMPANY.sector);
  const [contactName,   setContactName]   = useState(COMPANY.contact.name);
  const [contactEmail,  setContactEmail]  = useState(COMPANY.contact.email);
  const [contactPhone,  setContactPhone]  = useState(COMPANY.contact.phone);

  const [snap, setSnap] = useState({ companyName, tradeName, cnpj, sector, contactName, contactEmail, contactPhone });

  const startEditing = () => {
    setSnap({ companyName, tradeName, cnpj, sector, contactName, contactEmail, contactPhone });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setCompanyName(snap.companyName); setTradeName(snap.tradeName); setCnpj(snap.cnpj);
    setSector(snap.sector); setContactName(snap.contactName); setContactEmail(snap.contactEmail); setContactPhone(snap.contactPhone);
    setIsEditing(false);
  };

  const saveEditing = () => {
    setSaveLabel('Salvando...');
    setTimeout(() => {
      setSaveLabel('✓ Salvo!');
      setIsEditing(false);
      setTimeout(() => setSaveLabel(''), 2000);
    }, 800);
  };

  const stats = [
    { label: 'Colaboradoras', value: COMPANY.collaboratorCount.toLocaleString('pt-BR'), icon: '👥', color: 'bg-rose-50 text-rose-500' },
    { label: 'Missões Ativas', value: String(COMPANY.missionsActive), icon: '🎯', color: 'bg-violet-50 text-violet-500' },
    { label: 'Pontos Totais', value: COMPANY.totalPoints.toLocaleString('pt-BR'), icon: '⭐', color: 'bg-amber-50 text-amber-500' },
    { label: 'Plano Atual', value: COMPANY.plan, icon: '📈', color: 'bg-emerald-50 text-emerald-500', isBadge: true },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 font-body animate-fadeIn">

      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-8 border border-border-1 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border-1 bg-cream-50 flex flex-col items-center justify-center text-uni-text-400 text-xs font-medium text-center gap-1 cursor-pointer hover:border-rose-300 hover:text-rose-400 transition-colors group">
            <span className="text-3xl group-hover:scale-110 transition-transform">🏢</span>
            <span className="text-[10px]">Adicionar logo</span>
            <span className="text-[8px] opacity-60">PNG, JPG até 2MB</span>
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-uni-text-900">{companyName}</h1>
            <p className="text-sm text-uni-text-400 mt-1">CNPJ: {cnpj}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {saveLabel && <span className="text-sm font-bold text-emerald-600 animate-fadeIn">{saveLabel}</span>}
          {isEditing ? (
            <>
              <button onClick={cancelEditing} className="px-4 py-2 rounded-lg border border-border-1 text-sm font-bold text-uni-text-600 hover:border-uni-text-400 transition-all">Cancelar</button>
              <button onClick={saveEditing}   className="px-5 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-all shadow-sm">Salvar</button>
            </>
          ) : (
            <button onClick={startEditing} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose/20">
              ✏️ Editar Dados
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-border-1 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3", stat.color)}>
              {stat.icon}
            </div>
            <div className="text-2xl font-display font-bold text-uni-text-900">
              {stat.isBadge ? (
                <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full">{stat.value}</span>
              ) : stat.value}
            </div>
            <div className="text-xs font-medium text-uni-text-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <div className="bg-white rounded-2xl p-7 border border-border-1 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-uni-text-900 mb-6">
            <span className="text-rose-500">🏛</span> Informações da Empresa
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="Razão Social"  value={companyName}  onChange={setCompanyName}  isEditing={isEditing} />
            <EditField label="Nome Fantasia" value={tradeName}    onChange={setTradeName}    isEditing={isEditing} />
            <EditField label="CNPJ"          value={cnpj}         onChange={setCnpj}         isEditing={isEditing} />
            <EditField label="Setor"         value={sector}       onChange={setSector}       isEditing={isEditing} />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400 mb-1">Nº de Colaboradoras</dt>
              <dd className="text-sm font-semibold text-uni-text-900">{COMPANY.collaboratorCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400 mb-1">Membro desde</dt>
              <dd className="text-sm font-semibold text-uni-text-900">{COMPANY.memberSince}</dd>
            </div>
          </dl>
        </div>

        {/* RH Contact */}
        <div className="bg-white rounded-2xl p-7 border border-border-1 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-uni-text-900 mb-6">
            <span className="text-rose-500">✉️</span> Contato RH
          </h2>
          <dl className="space-y-5">
            <EditField label="Nome do Responsável" value={contactName}  onChange={setContactName}  isEditing={isEditing} />
            <EditField label="E-mail"              value={contactEmail} onChange={setContactEmail} isEditing={isEditing} type="email" />
            <EditField label="Telefone"            value={contactPhone} onChange={setContactPhone} isEditing={isEditing} type="tel" />
          </dl>
        </div>
      </div>
    </div>
  );
}
