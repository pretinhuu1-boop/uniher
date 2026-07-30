'use client';

import { FormEvent, useMemo, useState } from 'react';

type Answers = {
  lastGynecologist: string;
  mammography: string;
  papanicolau: string;
  familyHistory: string;
  diabetesHistory: string;
  menstrualCycle: string;
  mentalHealth: string;
  lifestyle: string;
  smoking: string;
};

type Result = {
  overallStatus: 'safe' | 'attention' | 'urgent';
  nextAction: 'continue_semaforo' | 'update_agenda' | 'offer_concierge';
  createConciergeCase: boolean;
  semaforoScores: { dimension: string; score: number; status: 'green' | 'yellow' | 'red' }[];
  examItems: { examName: string; status: string; priority: 'safe' | 'attention' | 'urgent' }[];
};

const QUESTIONS: {
  key: keyof Answers;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'lastGynecologist',
    label: 'Consulta ginecologica',
    options: [
      { value: 'recent', label: 'Nos ultimos 12 meses' },
      { value: 'moderate', label: 'Entre 12 e 24 meses' },
      { value: 'delayed', label: 'Ha mais de 24 meses' },
      { value: 'never', label: 'Nunca fiz' },
    ],
  },
  {
    key: 'mammography',
    label: 'Mamografia',
    options: [
      { value: 'current', label: 'Em dia' },
      { value: 'delayed', label: 'Atrasada' },
      { value: 'never_needed', label: 'Ainda nao indicada' },
      { value: 'na', label: 'Nao se aplica' },
    ],
  },
  {
    key: 'papanicolau',
    label: 'Papanicolau',
    options: [
      { value: 'recent', label: 'Nos ultimos 12 meses' },
      { value: 'moderate', label: 'Entre 12 e 36 meses' },
      { value: 'delayed', label: 'Ha mais de 36 meses' },
      { value: 'never', label: 'Nunca fiz' },
    ],
  },
  {
    key: 'familyHistory',
    label: 'Historico familiar relevante',
    options: [
      { value: 'no', label: 'Nao' },
      { value: 'distant', label: 'Parente distante' },
      { value: 'close', label: 'Parente proxima' },
      { value: 'unknown', label: 'Nao sei informar' },
    ],
  },
  {
    key: 'diabetesHistory',
    label: 'Diabetes',
    options: [
      { value: 'no', label: 'Nao' },
      { value: 'distant', label: 'Historico distante' },
      { value: 'close', label: 'Historico proximo' },
      { value: 'self', label: 'Tenho diagnostico' },
    ],
  },
  {
    key: 'menstrualCycle',
    label: 'Ciclo menstrual',
    options: [
      { value: 'regular', label: 'Regular' },
      { value: 'irregular', label: 'Irregular' },
      { value: 'painful', label: 'Dor intensa' },
      { value: 'menopause', label: 'Menopausa/climaterio' },
      { value: 'contraceptive', label: 'Uso anticoncepcional' },
    ],
  },
  {
    key: 'mentalHealth',
    label: 'Saude emocional',
    options: [
      { value: 'great', label: 'Muito bem' },
      { value: 'good', label: 'Bem' },
      { value: 'regular', label: 'Oscilando' },
      { value: 'concerning', label: 'Preciso de apoio' },
    ],
  },
  {
    key: 'lifestyle',
    label: 'Rotina de movimento',
    options: [
      { value: 'active', label: 'Ativa' },
      { value: 'moderate', label: 'Moderada' },
      { value: 'sedentary', label: 'Pouco ativa' },
      { value: 'inactive', label: 'Sem atividade' },
    ],
  },
  {
    key: 'smoking',
    label: 'Tabagismo',
    options: [
      { value: 'never', label: 'Nunca fumei' },
      { value: 'quit_long', label: 'Parei ha mais de 12 meses' },
      { value: 'quit_recent', label: 'Parei recentemente' },
      { value: 'current', label: 'Fumo atualmente' },
    ],
  },
];

const INITIAL_ANSWERS: Answers = {
  lastGynecologist: 'recent',
  mammography: 'na',
  papanicolau: 'recent',
  familyHistory: 'no',
  diabetesHistory: 'no',
  menstrualCycle: 'regular',
  mentalHealth: 'good',
  lifestyle: 'active',
  smoking: 'never',
};

const STATUS_COPY = {
  safe: { label: 'Verde', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  attention: { label: 'Amarelo', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  urgent: { label: 'Vermelho', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

const ACTION_COPY = {
  continue_semaforo: 'Continuar acompanhando o Semaforo',
  update_agenda: 'Atualizar agenda de exames',
  offer_concierge: 'Solicitar Concierge UniHER',
};

export default function HealthCheckinPage() {
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const statusCopy = useMemo(
    () => result ? STATUS_COPY[result.overallStatus] : null,
    [result]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!consent) {
      setError('Confirme o consentimento para enviar suas respostas.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/collaborator/health-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'exam_quiz_v1',
          consent: { accepted: consent, version: 'health-checkin-v1' },
          answers,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body?.error || 'Nao foi possivel atualizar seu Semaforo agora.');
        return;
      }

      setResult(body.result);
    } catch {
      setError('Falha de conexao. Tente novamente em alguns segundos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 p-6 md:p-10 font-body">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-uni-text-900">Quiz de Exames</h1>
            <p className="mt-1 text-sm text-uni-text-500">Atualize sua prevencao no Semaforo de Saude.</p>
          </div>
          <a
            href="/semaforo"
            className="inline-flex items-center justify-center rounded-md border border-border-1 bg-white px-4 py-2 text-sm font-bold text-uni-text-600 hover:border-rose-200 hover:text-rose-700"
          >
            Ver Semaforo
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTIONS.map((question) => (
              <label key={question.key} className="block rounded-md border border-border-1 bg-white p-4">
                <span className="text-sm font-bold text-uni-text-800">{question.label}</span>
                <select
                  className="mt-3 w-full rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  value={answers[question.key]}
                  onChange={(event) => {
                    setAnswers((current) => ({ ...current, [question.key]: event.target.value }));
                    if (error) setError('');
                  }}
                >
                  {question.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>

          <section className="rounded-md border border-border-1 bg-white p-4 space-y-4">
            <label className="flex items-start gap-3 text-sm text-uni-text-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border-1 accent-rose-600"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (error) setError('');
                }}
              />
              <span>Autorizo o uso privado destas respostas para atualizar meu Semaforo e minha lista de exames.</span>
            </label>

            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto rounded-md bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Atualizar Semaforo'}
            </button>
          </section>
        </form>

        {result && statusCopy && (
          <section className="rounded-md border border-border-1 bg-white p-5 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-uni-text-900">Resultado atualizado</h2>
                <p className="text-sm text-uni-text-500">{ACTION_COPY[result.nextAction]}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${statusCopy.className}`}>
                {statusCopy.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.examItems.map((item) => (
                <div key={item.examName} className="rounded-md border border-border-1 bg-cream-50 p-3">
                  <p className="text-sm font-bold text-uni-text-800">{item.examName}</p>
                  <p className="mt-1 text-xs text-uni-text-500">{item.status} | {item.priority}</p>
                </div>
              ))}
            </div>

            {result.nextAction === 'offer_concierge' && (
              <a
                href="/agenda"
                className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100"
              >
                Abrir minha agenda
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
