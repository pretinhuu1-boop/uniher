'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const SETORES = [
  'Saúde',
  'Tecnologia',
  'Financeiro',
  'Educação',
  'Varejo',
  'Indústria',
  'Outro',
];

const QTD_OPTIONS = ['1-50', '51-200', '201-500', '501-1000', '1000+'];

export default function HROnboardingPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /* ── Form State ── */
  const [formData, setFormData] = useState({
    // Step 1: Admin
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Step 2: Company
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    setor: '',
    // Step 3: Specifics
    qtdColaboradoras: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Handlers ── */
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name) newErrors.name = 'Nome é obrigatório';
      if (!formData.email) newErrors.email = 'Email é obrigatório';
      if (formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';
    } else if (step === 2) {
      if (!formData.cnpj) newErrors.cnpj = 'CNPJ é obrigatório';
      if (!formData.razaoSocial) newErrors.razaoSocial = 'Razão Social é obrigatória';
      if (!formData.setor) newErrors.setor = 'Selecione um setor';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      if (step < 3) setStep(step + 1);
      else handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const success = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'rh',
        company: {
          name: formData.razaoSocial,
          tradeName: formData.nomeFantasia || formData.razaoSocial,
          cnpj: formData.cnpj,
          sector: formData.setor,
          contactPhone: formData.phone,
        }
      });

      if (success) {
        setToast({ message: 'Empresa cadastrada com sucesso!', type: 'success' });
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setToast({ message: 'Erro ao cadastrar. Verifique os dados.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Erro de conexão.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream-50 flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Background Decorative */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-100/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gold-50/30 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-xl p-8 md:p-12 animate-scaleIn bg-white/90 backdrop-blur-md relative z-10 shadow-2xl rounded-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <Image src="/logo-uniher.png" alt="UniHER" width={120} height={100} priority className="object-contain mb-2" style={{ width: 120, height: 'auto' }} />
          <h1 className="text-3xl font-display font-bold leading-tight text-gold-600">UniHER <span className="text-uni-text-900">Onboarding</span></h1>
          <p className="text-uni-text-600 mt-2">Vamos configurar o ambiente para sua empresa.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                step === n ? "bg-rose-500 text-white border-rose-500 shadow-md transform scale-110" : 
                step > n ? "bg-uni-green text-white border-uni-green" : "bg-cream-100 text-uni-text-300 border-cream-200"
              )}>
                {step > n ? "✓" : n}
              </div>
              {n < 3 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2 rounded-full transition-colors duration-500",
                  step > n ? "bg-uni-green" : "bg-cream-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleNext} className="space-y-6 animate-fadeIn">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-semibold text-uni-text-900 mb-4">Seus Dados de Administradora</h2>
              <Input label="Nome Completo" value={formData.name} onChange={e => updateField('name', e.target.value)} error={errors.name} required />
              <Input label="Email Corporativo" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} error={errors.email} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Senha" type="password" value={formData.password} onChange={e => updateField('password', e.target.value)} error={errors.password} required />
                <Input label="Confirmar Senha" type="password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} error={errors.confirmPassword} required />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-semibold text-uni-text-900 mb-4">Informações da Empresa</h2>
              <Input label="CNPJ" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={e => updateField('cnpj', e.target.value)} error={errors.cnpj} required />
              <Input label="Razão Social" value={formData.razaoSocial} onChange={e => updateField('razaoSocial', e.target.value)} error={errors.razaoSocial} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome Fantasia" value={formData.nomeFantasia} onChange={e => updateField('nomeFantasia', e.target.value)} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-uni-text-600 pl-1 block">Setor de Atuação</label>
                  <select 
                    className="w-full h-11 px-4 rounded-md border-2 border-border-1 bg-white focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300 transition-all text-uni-text-900 text-sm font-medium"
                    value={formData.setor} 
                    onChange={e => updateField('setor', e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.setor && <p className="text-xs text-rose-700 pl-1">{errors.setor}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-semibold text-uni-text-900 mb-4">Últimos Detalhes</h2>
              <Input label="Telefone de Contato" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-uni-text-600 pl-1 block">Quantidade de Colaboradoras</label>
                <select 
                  className="w-full h-11 px-4 rounded-md border-2 border-border-1 bg-white focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300 transition-all text-uni-text-900 text-sm font-medium"
                  value={formData.qtdColaboradoras} 
                  onChange={e => updateField('qtdColaboradoras', e.target.value)}
                  required
                >
                  <option value="">Selecione a faixa...</option>
                  {QTD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="p-4 bg-rose-50 rounded-md border border-rose-100 mt-4">
                <p className="text-xs text-rose-800 leading-relaxed font-medium transition-all">
                  Ao finalizar, sua empresa entrará no período de Trial de 14 dias com acesso total a todas as ferramentas de saúde e engajamento.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-border-1 mt-8">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleBack} 
              disabled={step === 1 || loading}
              className={step === 1 ? "invisible" : ""}
            >
              ← Voltar
            </Button>
            
            <Button type="submit" className="min-w-[140px] shadow-lg hover:shadow-xl active:scale-[0.98]" disabled={loading}>
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                step === 3 ? "Finalizar Cadastro" : "Continuar →"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-uni-text-400">
          Já possui conta? <Link href="/auth" className="text-rose-500 font-bold hover:underline">Fazer Login</Link>
        </p>
      </Card>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </main>
  );
}
