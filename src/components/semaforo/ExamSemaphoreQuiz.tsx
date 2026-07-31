'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, ClipboardCheck } from 'lucide-react';
import {
  calculateAge,
  type ExamAnswer,
  getApplicableExams,
  type HealthCheckinResult,
} from '@/lib/health-checkin/mapper';

type ConciergeCase = {
  id: string;
  status: 'open' | 'in_progress';
  severity: 'safe' | 'attention' | 'urgent';
};

type SavedState = {
  birthDate: string | null;
  age: number | null;
  exams: Record<string, ExamAnswer>;
  result: HealthCheckinResult | null;
  conciergeCase: ConciergeCase | null;
};

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

function hasExamAnswer(answer: ExamAnswer | undefined): boolean {
  return Boolean(answer?.notApplicable || answer?.unknown || answer?.dueDate);
}

export default function ExamSemaphoreQuiz() {
  const [birthDate, setBirthDate] = useState('');
  const [profileHasBirthDate, setProfileHasBirthDate] = useState(false);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HealthCheckinResult | null>(null);
  const [conciergeCase, setConciergeCase] = useState<ConciergeCase | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSavedState() {
      try {
        const response = await fetch('/api/collaborator/health-checkin');
        const body = await response.json() as SavedState & { error?: string };
        if (!response.ok) {
          throw new Error(body.error || 'Nao foi possivel carregar seu Semaforo.');
        }
        if (!active) return;

        setBirthDate(body.birthDate ?? '');
        setProfileHasBirthDate(Boolean(body.birthDate));
        setAnswers(body.exams ?? {});
        setResult(body.result ?? null);
        setConciergeCase(body.conciergeCase ?? null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'Nao foi possivel carregar seu Semaforo.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSavedState();
    return () => {
      active = false;
    };
  }, []);

  const age = useMemo(() => {
    if (!birthDate) return null;
    try {
      return calculateAge(birthDate);
    } catch {
      return null;
    }
  }, [birthDate]);
  const applicableExams = useMemo(
    () => age === null ? [] : getApplicableExams(age),
    [age]
  );
  const answeredCount = applicableExams.filter((exam) => hasExamAnswer(answers[exam.id])).length;
  const statusCopy = result ? STATUS_COPY[result.overallStatus] : null;

  function updateExam(examId: string, patch: Partial<ExamAnswer>) {
    setAnswers((current) => ({
      ...current,
      [examId]: {
        ...current[examId],
        ...patch,
      },
    }));
    setResult(null);
    setConciergeCase(null);
    if (error) setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!birthDate || age === null || age < 20 || age > 120) {
      setError('Informe uma data de nascimento valida.');
      return;
    }
    if (answeredCount !== applicableExams.length) {
      setError('Informe o proximo prazo ou marque que ainda nao sabe em todos os exames.');
      return;
    }
    if (!consent) {
      setError('Confirme o consentimento para atualizar seu Semaforo.');
      return;
    }

    setSaving(true);

    try {
      const examAnswers = Object.fromEntries(
        applicableExams.map((exam) => [exam.id, answers[exam.id]])
      );
      const response = await fetch('/api/collaborator/health-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'semaforo_exam_quiz_v1',
          consent: { accepted: consent, version: 'semaforo-exams-v1' },
          answers: {
            birthDate: profileHasBirthDate ? undefined : birthDate,
            exams: examAnswers,
          },
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body?.error || 'Nao foi possivel atualizar seu Semaforo agora.');
        return;
      }

      setProfileHasBirthDate(true);
      setResult(body.result);
      setConciergeCase(body.conciergeCase ?? null);
    } catch {
      setError('Falha de conexao. Tente novamente em alguns segundos.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="border-y border-border-1 bg-white py-6 text-sm font-semibold text-uni-text-500 sm:border sm:p-5">
        Carregando seu Semaforo...
      </div>
    );
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

          {profileHasBirthDate && age !== null ? (
            <div className="text-sm font-bold text-uni-text-700">
              Idade considerada: {age} anos
            </div>
          ) : (
            <label className="w-full md:w-52">
              <span className="text-xs font-bold text-uni-text-600">Data de nascimento</span>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(event) => {
                  setBirthDate(event.target.value);
                  setResult(null);
                  setConciergeCase(null);
                  if (error) setError('');
                }}
                className="mt-2 w-full rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </label>
          )}
        </div>

        {birthDate && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-uni-text-500">
            <ClipboardCheck size={16} aria-hidden="true" />
            {answeredCount} de {applicableExams.length} preenchidos
          </div>
        )}
      </section>

      {birthDate && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {applicableExams.map((exam) => {
              const answer = answers[exam.id] ?? {};
              const disabled = Boolean(answer.unknown || answer.notApplicable);

              return (
                <fieldset key={exam.id} className="min-w-0 rounded-md border border-border-1 bg-white p-4">
                  <legend className="sr-only">{exam.name}</legend>
                  <div className="flex min-h-10 items-start justify-between gap-3 text-sm font-bold text-uni-text-800">
                    <span>{exam.name}</span>
                    {exam.conditional && (
                      <span className="shrink-0 rounded bg-cream-100 px-2 py-1 text-[10px] uppercase text-uni-text-500">
                        Se indicado
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="min-w-0">
                      <span className="text-xs font-bold text-uni-text-600">Ultimo exame</span>
                      <input
                        type="date"
                        value={answer.completedDate ?? ''}
                        disabled={Boolean(answer.notApplicable)}
                        onChange={(event) => updateExam(exam.id, {
                          completedDate: event.target.value || null,
                          notApplicable: false,
                        })}
                        className="mt-1 w-full min-w-0 rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:bg-cream-50 disabled:text-uni-text-400"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="text-xs font-bold text-uni-text-600">Proximo prazo</span>
                      <input
                        type="date"
                        value={answer.dueDate ?? ''}
                        disabled={disabled}
                        onChange={(event) => updateExam(exam.id, {
                          dueDate: event.target.value || null,
                          unknown: false,
                          notApplicable: false,
                        })}
                        className="mt-1 w-full min-w-0 rounded-md border border-border-1 bg-white px-3 py-2 text-sm text-uni-text-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:bg-cream-50 disabled:text-uni-text-400"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 text-xs font-semibold text-uni-text-600 sm:flex-row sm:gap-5">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(answer.unknown)}
                        disabled={Boolean(answer.notApplicable)}
                        onChange={(event) => updateExam(exam.id, {
                          unknown: event.target.checked,
                          dueDate: event.target.checked ? null : answer.dueDate,
                        })}
                        className="h-4 w-4 rounded border-border-1 accent-rose-600"
                      />
                      Ainda nao sei o prazo
                    </label>
                    {exam.conditional && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(answer.notApplicable)}
                          onChange={(event) => updateExam(exam.id, {
                            notApplicable: event.target.checked,
                            unknown: false,
                            completedDate: event.target.checked ? null : answer.completedDate,
                            dueDate: event.target.checked ? null : answer.dueDate,
                          })}
                          className="h-4 w-4 rounded border-border-1 accent-rose-600"
                        />
                        Nao indicado agora
                      </label>
                    )}
                  </div>
                </fieldset>
              );
            })}
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
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <ClipboardCheck size={17} aria-hidden="true" />
              {saving ? 'Atualizando...' : 'Ver meu resultado'}
            </button>
          </section>
        </form>
      )}

      {!birthDate && error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

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
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-uni-text-800">{item.examName}</p>
                    {item.dueDate && (
                      <p className="mt-1 text-xs text-uni-text-500">Prazo: {item.dueDate}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase ${itemCopy.className}`}>
                    {itemCopy.label}
                  </span>
                </div>
              );
            })}
          </div>

          {conciergeCase && result.overallStatus === 'urgent' && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              Encaminhamento registrado para o Concierge.
            </p>
          )}

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
