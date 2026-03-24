'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CompanyData {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string;
  sector: string | null;
  plan: string;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  user_count: number;
  department_count: number;
  total_points: number;
  missions_active: number;
}

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [sector, setSector] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [snap, setSnap] = useState({ companyName: '', tradeName: '', cnpj: '', sector: '', contactName: '', contactEmail: '', contactPhone: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company data
  useEffect(() => {
    fetch('/api/company')
      .then(r => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then(({ company: c }) => {
        setCompany(c);
        setCompanyName(c.name || '');
        setTradeName(c.trade_name || '');
        setCnpj(c.cnpj || '');
        setSector(c.sector || '');
        setContactName(c.contact_name || '');
        setContactEmail(c.contact_email || '');
        setContactPhone(c.contact_phone || '');
        setLogoUrl(c.logo_url || null);
      })
      .catch(() => setError('Empresa nao encontrada. Verifique se sua conta esta vinculada a uma empresa.'))
      .finally(() => setLoading(false));
  }, []);

  const startEditing = () => {
    setSnap({ companyName, tradeName, cnpj, sector, contactName, contactEmail, contactPhone });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setCompanyName(snap.companyName); setTradeName(snap.tradeName); setCnpj(snap.cnpj);
    setSector(snap.sector); setContactName(snap.contactName); setContactEmail(snap.contactEmail); setContactPhone(snap.contactPhone);
    setIsEditing(false);
  };

  const saveEditing = async () => {
    setSaveLabel('Salvando...');
    try {
      const res = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          tradeName,
          sector,
          contactName,
          contactEmail,
          contactPhone,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      const { company: updated } = await res.json();
      setCompany(prev => prev ? { ...prev, ...updated } : prev);
      setSaveLabel('Salvo!');
      setIsEditing(false);
    } catch {
      setSaveLabel('Erro ao salvar');
    } finally {
      setTimeout(() => setSaveLabel(''), 2000);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload falhou');
      const { url } = await res.json();
      setLogoUrl(url);
      // Update company logo via PATCH
      await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: url }),
      });
    } catch {
      // silent fail — user can retry
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-10 flex items-center justify-center">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100" />
          <p className="text-sm text-uni-text-400 font-medium">Carregando dados da empresa...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-10 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 border border-border-1 shadow-sm max-w-md text-center space-y-4">
          <span className="text-4xl">🏢</span>
          <h2 className="text-lg font-bold text-uni-text-900">Empresa nao encontrada</h2>
          <p className="text-sm text-uni-text-500">{error || 'Sua conta nao esta vinculada a nenhuma empresa.'}</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Colaboradoras', value: company.user_count.toLocaleString('pt-BR'), icon: '👥', color: 'bg-rose-50 text-rose-500' },
    { label: 'Missoes Ativas', value: String(company.missions_active), icon: '🎯', color: 'bg-violet-50 text-violet-500' },
    { label: 'Pontos Totais', value: company.total_points.toLocaleString('pt-BR'), icon: '⭐', color: 'bg-amber-50 text-amber-500' },
    { label: 'Plano Atual', value: company.plan, icon: '📈', color: 'bg-emerald-50 text-emerald-500', isBadge: true },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 font-body animate-fadeIn">

      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-8 border border-border-1 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div
            onClick={handleLogoClick}
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-border-1 bg-cream-50 flex flex-col items-center justify-center text-uni-text-400 text-xs font-medium text-center gap-1 cursor-pointer hover:border-rose-300 hover:text-rose-400 transition-colors group overflow-hidden"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <>
                <span className="text-3xl group-hover:scale-110 transition-transform">🏢</span>
                <span className="text-[10px]">Adicionar logo</span>
                <span className="text-[8px] opacity-60">PNG, JPG ate 2MB</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />
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
              Editar Dados
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
            <span className="text-rose-500">🏛</span> Informacoes da Empresa
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            <EditField label="Razao Social"  value={companyName}  onChange={setCompanyName}  isEditing={isEditing} />
            <EditField label="Nome Fantasia" value={tradeName}    onChange={setTradeName}    isEditing={isEditing} />
            <EditField label="CNPJ"          value={cnpj}         onChange={setCnpj}         isEditing={isEditing} />
            <EditField label="Setor"         value={sector}       onChange={setSector}       isEditing={isEditing} />
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400 mb-1">N de Colaboradoras</dt>
              <dd className="text-sm font-semibold text-uni-text-900">{company.user_count}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-uni-text-400 mb-1">Membro desde</dt>
              <dd className="text-sm font-semibold text-uni-text-900">{formatDate(company.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* RH Contact */}
        <div className="bg-white rounded-2xl p-7 border border-border-1 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-uni-text-900 mb-6">
            <span className="text-rose-500">✉️</span> Contato RH
          </h2>
          <dl className="space-y-5">
            <EditField label="Nome do Responsavel" value={contactName}  onChange={setContactName}  isEditing={isEditing} />
            <EditField label="E-mail"              value={contactEmail} onChange={setContactEmail} isEditing={isEditing} type="email" />
            <EditField label="Telefone"            value={contactPhone} onChange={setContactPhone} isEditing={isEditing} type="tel" />
          </dl>
        </div>
      </div>
    </div>
  );
}
