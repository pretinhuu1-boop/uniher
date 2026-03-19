'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import s from './onboarding.module.css';

/* ── Types ── */

interface Step1Data {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
}

interface Step2Data {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  setor: string;
}

interface Step3Data {
  nomeResponsavel: string;
  emailCorporativo: string;
  telefone: string;
  qtdColaboradoras: string;
}

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

/* ── Logo SVG Component ── */

function LogoSVG({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 36 36"
      fill="none"
    >
      <path
        d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z"
        fill="#F9EEF3"
        stroke="#C85C7E"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z"
        fill="#EAB8CB"
        stroke="#C85C7E"
        strokeWidth="0.9"
      />
      <circle cx="18" cy="6" r="1.5" fill="#B8922A" />
    </svg>
  );
}

/* ── Step Icons ── */

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════ */

export default function HROnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  /* ── Form State ── */
  const [step1, setStep1] = useState<Step1Data>({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
  });

  const [step2, setStep2] = useState<Step2Data>({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    setor: '',
  });

  const [step3, setStep3] = useState<Step3Data>({
    nomeResponsavel: '',
    emailCorporativo: '',
    telefone: '',
    qtdColaboradoras: '',
  });

  /* ── Handlers ── */

  function handleNext(e: FormEvent) {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniher-role', 'rh');
    }
    router.push('/dashboard');
  }

  /* ── Step Indicator ── */

  function renderStepper() {
    return (
      <div className={s.stepper}>
        {[1, 2, 3].map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`${s.stepCircle} ${
                step === n ? s.stepActive : ''
              } ${step > n ? s.stepCompleted : ''}`}
            >
              {step > n ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7L6 10L11 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                n
              )}
            </div>
            {i < 2 && (
              <div
                className={`${s.stepLine} ${
                  step > n ? s.stepLineCompleted : ''
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ── Step 1: Criar Conta ── */

  function renderStep1() {
    return (
      <div className={s.stepContent} key="step1">
        <div className={s.stepHeader}>
          <h2 className={s.stepTitle}>Criar sua Conta RH</h2>
          <p className={s.stepSubtitle}>
            Primeiro, crie sua conta de administrador RH.
          </p>
        </div>

        <form className={s.form} onSubmit={handleNext}>
          <div className={s.field}>
            <label className={s.label}>Nome Completo</label>
            <input
              className={s.input}
              type="text"
              placeholder="Seu nome completo"
              value={step1.nome}
              onChange={(e) => setStep1({ ...step1, nome: e.target.value })}
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Email Corporativo</label>
            <input
              className={s.input}
              type="email"
              placeholder="seu@empresa.com.br"
              value={step1.email}
              onChange={(e) => setStep1({ ...step1, email: e.target.value })}
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Telefone</label>
            <input
              className={s.input}
              type="tel"
              placeholder="(11) 99999-9999"
              value={step1.telefone}
              onChange={(e) => setStep1({ ...step1, telefone: e.target.value })}
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Senha</label>
            <input
              className={s.input}
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={step1.senha}
              onChange={(e) => setStep1({ ...step1, senha: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Confirmar Senha</label>
            <input
              className={s.input}
              type="password"
              placeholder="Repita a senha"
              value={step1.confirmarSenha}
              onChange={(e) =>
                setStep1({ ...step1, confirmarSenha: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          <div className={s.buttons}>
            <a href="/welcome" className={s.btnOutline}>
              <span aria-hidden="true">&lsaquo;</span> Voltar
            </a>
            <button type="submit" className={s.btnPrimary}>
              Continuar <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── Step 2: Dados da Empresa ── */

  function renderStep2() {
    const cnpjFilled = step2.cnpj.replace(/\D/g, '').length >= 14;

    return (
      <div className={s.stepContent} key="step2">
        <div className={s.stepHeader}>
          <BuildingIcon className={s.stepIcon} />
          <h2 className={s.stepTitle}>Dados da Empresa</h2>
          <p className={s.stepSubtitle}>
            Informações básicas da organização
          </p>
        </div>

        <form className={s.form} onSubmit={handleNext}>
          <div className={s.field}>
            <label className={s.label}>CNPJ da Empresa</label>
            <input
              className={s.input}
              type="text"
              placeholder="00.000.000/0000-00"
              value={step2.cnpj}
              onChange={(e) => setStep2({ ...step2, cnpj: e.target.value })}
              required
            />
            <div
              className={`${s.cnpjHint} ${cnpjFilled ? s.cnpjHintVisible : ''}`}
            >
              <span className={s.cnpjCheck}>&#10003;</span>
              CNPJ válido e disponível
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Razão Social</label>
            <input
              className={s.input}
              type="text"
              placeholder="Razão social da empresa"
              value={step2.razaoSocial}
              onChange={(e) =>
                setStep2({ ...step2, razaoSocial: e.target.value })
              }
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Nome Fantasia</label>
            <input
              className={s.input}
              type="text"
              placeholder="Nome fantasia"
              value={step2.nomeFantasia}
              onChange={(e) =>
                setStep2({ ...step2, nomeFantasia: e.target.value })
              }
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Setor de Atuação</label>
            <select
              className={s.select}
              value={step2.setor}
              onChange={(e) => setStep2({ ...step2, setor: e.target.value })}
              required
            >
              <option value="" disabled>
                Selecione o setor
              </option>
              {SETORES.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>
          </div>

          <div className={s.buttons}>
            <button
              type="button"
              className={s.btnOutline}
              onClick={handleBack}
            >
              <span aria-hidden="true">&lsaquo;</span> Voltar
            </button>
            <button type="submit" className={s.btnPrimary}>
              Próximo <span aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── Step 3: Contato RH ── */

  function renderStep3() {
    return (
      <div className={s.stepContent} key="step3">
        <div className={s.stepHeader}>
          <PeopleIcon className={s.stepIcon} />
          <h2 className={s.stepTitle}>Contato RH</h2>
          <p className={s.stepSubtitle}>
            Dados do responsável pelo programa
          </p>
        </div>

        <form className={s.form} onSubmit={handleNext}>
          <div className={s.field}>
            <label className={s.label}>Nome do Responsável</label>
            <input
              className={s.input}
              type="text"
              placeholder="Nome completo do responsável"
              value={step3.nomeResponsavel}
              onChange={(e) =>
                setStep3({ ...step3, nomeResponsavel: e.target.value })
              }
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>E-mail Corporativo</label>
            <input
              className={s.input}
              type="email"
              placeholder="responsavel@empresa.com.br"
              value={step3.emailCorporativo}
              onChange={(e) =>
                setStep3({ ...step3, emailCorporativo: e.target.value })
              }
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Telefone</label>
            <input
              className={s.input}
              type="tel"
              placeholder="(11) 99999-9999"
              value={step3.telefone}
              onChange={(e) =>
                setStep3({ ...step3, telefone: e.target.value })
              }
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Quantidade de Colaboradoras</label>
            <select
              className={s.select}
              value={step3.qtdColaboradoras}
              onChange={(e) =>
                setStep3({ ...step3, qtdColaboradoras: e.target.value })
              }
              required
            >
              <option value="" disabled>
                Selecione a faixa
              </option>
              {QTD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={s.buttons}>
            <button
              type="button"
              className={s.btnOutline}
              onClick={handleBack}
              disabled={submitting}
            >
              <span aria-hidden="true">&lsaquo;</span> Voltar
            </button>
            <button
              type="submit"
              className={s.btnPrimary}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className={s.spinner} />
                  Finalizando...
                </>
              ) : (
                <>
                  Próximo <span aria-hidden="true">&rsaquo;</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <main className={s.page}>
      <div className={s.card}>
        {/* Logo */}
        <div className={s.logo}>
          <LogoSVG className={s.logoIcon} />
          <span className={s.logoText}>
            Uni<span className={s.logoAccent}>HER</span>
          </span>
        </div>

        {/* Stepper */}
        {renderStepper()}

        {/* Steps */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Bottom link */}
        <p className={s.bottomLink}>
          Já tem uma conta?{' '}
          <Link href="/auth">Fazer login</Link>
        </p>
      </div>
    </main>
  );
}
