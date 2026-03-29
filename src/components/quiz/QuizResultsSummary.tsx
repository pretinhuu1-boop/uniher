'use client';

import { useState, FormEvent } from 'react';
import styles from './QuizResults.module.css';

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  consent?: string;
}

interface QuizResultsSummaryProps {
  archName: string;
  beforeAvg: string;
  afterAvg: string;
  selectedDay: number;
}

export default function QuizResultsSummary({
  archName,
  beforeAvg,
  afterAvg,
  selectedDay,
}: QuizResultsSummaryProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<LeadForm>({ name: '', email: '', phone: '', company: '' });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (value: string) => {
    setForm(prev => ({ ...prev, phone: formatPhone(value) }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (form.name.trim().length < 3) newErrors.name = 'Informe seu nome completo';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Informe um e-mail válido';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) newErrors.phone = 'Informe um telefone válido com DDD';
    if (form.company.trim().length < 2) newErrors.company = 'Informe o nome da empresa';
    if (!consent) newErrors.consent = 'Você precisa aceitar a política de privacidade';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof LeadForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Fiz o diagnóstico UniHER e meu perfil é "${archName}" (score ${beforeAvg} → ${afterAvg} em ${selectedDay} dias). Quero saber mais sobre levar o UniHER para minha empresa!`
  );
  const whatsappUrl = `https://wa.me/5511999999999?text=${whatsappMessage}`;

  if (submitted) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="var(--rose-50)"/>
            <path d="M12 20l5.5 5.5L28 15" stroke="var(--rose-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className={styles.successTitle}>Dados enviados!</h3>
        <p className={styles.successDesc}>
          Nossa equipe entrará em contato em até 24h para apresentar o UniHER para <strong>{form.company}</strong>.
        </p>
        <p className={styles.successProfile}>
          Seu perfil: <strong>{archName}</strong> — Score {beforeAvg} → {afterAvg}
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whatsappBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Falar pelo WhatsApp
        </a>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className={styles.leadCard}>
        <h3 className={styles.leadTitle}>Quase lá!</h3>
        <p className={styles.leadDesc}>
          Preencha seus dados e nossa equipe entrará em contato para levar o UniHER à sua empresa.
        </p>
        <form className={styles.leadForm} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="lead-name">Nome completo</label>
            <input
              id="lead-name"
              className={`${styles.fieldInput} ${errors.name ? styles.fieldInputError : ''}`}
              type="text"
              placeholder="Maria Silva"
              value={form.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'error-name' : undefined}
            />
            {errors.name && <span id="error-name" className={styles.fieldError}>{errors.name}</span>}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="lead-email">E-mail corporativo</label>
            <input
              id="lead-email"
              className={`${styles.fieldInput} ${errors.email ? styles.fieldInputError : ''}`}
              type="email"
              placeholder="maria@empresa.com.br"
              value={form.email}
              onChange={e => handleFieldChange('email', e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'error-email' : undefined}
            />
            {errors.email && <span id="error-email" className={styles.fieldError}>{errors.email}</span>}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="lead-phone">
              Telefone / WhatsApp
            </label>
            <input
              id="lead-phone"
              className={`${styles.fieldInput} ${errors.phone ? styles.fieldInputError : ''}`}
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'error-phone' : undefined}
            />
            {errors.phone && <span id="error-phone" className={styles.fieldError}>{errors.phone}</span>}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="lead-company">Empresa</label>
            <input
              id="lead-company"
              className={`${styles.fieldInput} ${errors.company ? styles.fieldInputError : ''}`}
              type="text"
              placeholder="Nome da empresa"
              value={form.company}
              onChange={e => handleFieldChange('company', e.target.value)}
              aria-invalid={!!errors.company}
              aria-describedby={errors.company ? 'error-company' : undefined}
            />
            {errors.company && <span id="error-company" className={styles.fieldError}>{errors.company}</span>}
          </div>

          {/* LGPD Consent */}
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => {
                setConsent(e.target.checked);
                if (errors.consent) setErrors(prev => ({ ...prev, consent: undefined }));
              }}
              className={styles.consentCheckbox}
            />
            <span className={styles.consentText}>
              Concordo com o tratamento dos meus dados conforme a{' '}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className={styles.consentLink}>
                Política de Privacidade
              </a>{' '}
              e a LGPD.
            </span>
          </label>
          {errors.consent && <span className={styles.fieldError}>{errors.consent}</span>}

          <button type="submit" className={styles.leadSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <span className={styles.spinner} />
                Enviando...
              </>
            ) : (
              <>
                Enviar e receber proposta
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>
        <button className={styles.leadBack} onClick={() => setShowForm(false)}>
          ← Voltar aos resultados
        </button>
      </div>
    );
  }

  return (
    <div className={styles.ctaCard}>
      <h3 className={styles.ctaTitle}>Pronta para evoluir?</h3>
      <p className={styles.ctaDesc}>
        Leve o UniHER para sua empresa e transforme a saúde de todas as
        colaboradoras com missões, campanhas e acompanhamento por IA.
      </p>
      <button className={styles.ctaBtn} onClick={() => setShowForm(true)}>
        Quero essa transformação
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
