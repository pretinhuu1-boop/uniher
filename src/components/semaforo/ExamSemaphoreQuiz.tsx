'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, ClipboardCheck } from 'lucide-react';
import {
  ExamAnswer,
  getApplicableExams,
  HealthCheckinStatus,
} from '@/lib/health-checkin/mapper';

type Result = {
  overallStatus: HealthCheckinStatus;
  nextAction: 'continue_semaforo' | 'update_agenda' | 'offer_concierge';
  createConciergeCase: false;
  counts: { green: number; yellow: number; red: number };
  examItems: {
    examId: string;
    examName: string;
    status: 'completed' | 'pending' | 'overdue';
    priority: HealthCheckinStatus;
  }[];
};

const ANSWER_OPTIONS: { value: ExamAnswer; label: string }[] = [
  { value: 'in_day', label: 'Em dia - proximo prazo a mais de 2 meses' },
  { value: 'due_soon', label: 'Atencao - vence em ate 2 meses' },
  { value: 'overdue', label: 'Atrasado - vencido ha 1 mes ou mais' },
  { value: 'not_sure', label: 'Nao sei - preciso confirmar' },
];

const STATUS_COPY = {
  safe: {
    label: 'Verde',
    description: 'Seus exames informados estao em dia.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  attention: {
    label: 'Amarelo',
    description: 'Ha exames proximos do prazo ou que precisam ser confirmados.',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  urgent: {
    label: 'Vermelho',
    description: 'Ha exame atrasado com prioridade para acompanhamento do Concierge.',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: CircleAlert,
  },
};

const ITEM_STATUS_COPY = {
  safe: { label: 'Em dia', className: 'bg-emerald-100 text-emerald-700' },
  attention: { label: 'Atencao', className: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Atrasado', className: 'bg-rose-100 text-rose-700' },
};

export default function ExamSemaphoreQuiz() {
  const [age, setAge] = useState(35);
  const [answers, setAnswers] = useState<Partial<Record<string, ExamAnswer>>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const applicableExams = useMemo(() => getApplicableExams(age), [age]);
  const answeredCount = applicableExams.filter((exam) => answers[exam.id]).length;
  const statusCopy = result ? STATUS_COPY[result.overallStatus] : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult(null);

    if (answeredCount !== applicableExams.length) {
      setError('Responda a situacao de todos os exames exibidos.');
      return;
    }
    if (!consent) {
      setError('Confirme o consentimento para atualizar seu Semaforo.');
      return;
    }

    setSaving(true);

    try {
      const examAnswers = Object.fromEntries(
        applicableExams.map((exam) => [exam.id, answers[exam.id] as ExamAnswer])
      );
      const response = await fetch('/api/collaborator/health-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'semaforo_exam_quiz_v1',
          consent: { accepted: consent, version: 'semaforo-exams-v1' },
          answers: { age, exams: examAnswers },
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
    <div className="space-y-6">
      <section className="border-y border-border-1 bg-white py-5 sm:border sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-uni-text-400">Quiz preventivo</p>
            <h2 className="mt-1 text-xl font-display font-bold text-uni-text-900">
              Exames indicados para sua idade
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-uni-text-500">
              O Semaforo acompanha prazo de exames. Ele nao calcula risco clinico nem mede bem-estar.
            </p>
          </div>

          <label className="w-full md:w-44">
            <span className="text-xs font-bold text-uni-text-600">Sua idade</span>
            <input
              type="number"
              min={20}
              max={120}
              value={age}
              onChange={(event) => {
                const nextAge = Number(event.target.value);
                setAge(Number.isFinite(nextAge) ? nextAge : 20);
                setResult(null);
                if (error) setError('');
              }}
              className="mt-2 w-full rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-uni-text-500">
          <ClipboardCheck size={16} aria-hidden="true" />
          {answeredCount} de {applicableExams.length} respondidos
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {applicableExams.map((exam) => (
            <label key={exam.id} className="block rounded-md border border-border-1 bg-white p-4">
              <span className="flex min-h-10 items-start justify-between gap-3 text-sm font-bold text-uni-text-800">
                {exam.name}
                {exam.conditional && (
                  <span className="shrink-0 rounded bg-cream-100 px-2 py-1 text-[10px] uppercase text-uni-text-500">
                    Se indicado
                  </span>
                )}
              </span>
              <select
                required
                aria-label={`Situacao de ${exam.name}`}
                className="mt-3 w-full rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                value={answers[exam.id] ?? ''}
                onChange={(event) => {
                  setAnswers((current) => ({
                    ...current,
                    [exam.id]: event.target.value as ExamAnswer,
                  }));
                  if (error) setError('');
                }}
              >
                <option value="" disabled>Selecione a situacao</option>
                {ANSWER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                {exam.conditional && (
                  <option value="not_applicable">Nao indicado para mim neste momento</option>
                )}
              </select>
            </label>
          ))}
        </section>

        <section className="border-y border-border-1 bg-white py-5 sm:border sm:p-5">
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
            <span>
              Autorizo o uso privado destas respostas para atualizar meu Semaforo e minha lista de exames.
            </span>
          </label>

          {error && (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-md bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Atualizando...' : 'Ver meu resultado'}
          </button>
        </section>
      </form>

      {result && statusCopy && (
        <section className="space-y-5 border-y border-border-1 bg-white py-5 sm:border sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-uni-text-900">Resultado do Semaforo</h2>
              <p className="mt-1 text-sm text-uni-text-500">{statusCopy.description}</p>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-black uppercase ${statusCopy.className}`}>
              <statusCopy.icon size={16} aria-hidden="true" />
              {statusCopy.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{result.counts.green}</p>
              <p className="text-xs font-semibold text-emerald-700">Em dia</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{result.counts.yellow}</p>
              <p className="text-xs font-semibold text-amber-700">Atencao</p>
            </div>
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-center">
              <p className="text-2xl font-bold text-rose-700">{result.counts.red}</p>
              <p className="text-xs font-semibold text-rose-700">Atrasados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {result.examItems.map((item) => {
              const itemCopy = ITEM_STATUS_COPY[item.priority];
              return (
                <div key={item.examId} className="flex items-center justify-between gap-3 rounded-md border border-border-1 bg-cream-50 p-3">
                  <p className="text-sm font-bold text-uni-text-800">{item.examName}</p>
                  <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase ${itemCopy.className}`}>
                    {itemCopy.label}
                  </span>
                </div>
              );
            })}
          </div>

          {result.nextAction !== 'continue_semaforo' && (
            <a
              href="/agenda"
              className="inline-flex w-full items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 sm:w-auto"
            >
              Organizar proximo passo na agenda
            </a>
          )}
        </section>
      )}
    </div>
  );
}
