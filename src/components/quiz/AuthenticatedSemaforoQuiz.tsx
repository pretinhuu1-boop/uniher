'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  ONBOARDING_QUIZ_QUESTIONS,
  getOnboardingQuizSelectionText,
} from '@/lib/quiz/onboarding-flow';
import {
  calculateArchetype,
  calculateInitialHealthScore,
  type ArchetypeResult,
} from '@/lib/quiz/engine';
import { cn } from '@/lib/utils';

interface QuizStateResponse {
  archetypeKey: ArchetypeResult['key'] | null;
  answers: number[];
  createdAt: string;
}

const INITIAL_ANSWERS = new Array(ONBOARDING_QUIZ_QUESTIONS.length).fill(50) as number[];

const ARCHETYPE_LABELS: Record<ArchetypeResult['key'], string> = {
  guardia: 'Guardiã da Estabilidade',
  protetora: 'Protetora do Cuidado',
  guerreira: 'Guerreira de Resultados',
  equilibrista: 'Equilibrista da Rotina',
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Falha ao carregar quiz.');
  return response.json();
};

function signalFromScore(score: number) {
  if (score < 45) return {
    label: 'Vermelho',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  };
  if (score < 70) return {
    label: 'Amarelo',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-400',
  };
  return {
    label: 'Verde',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  };
}

function needsConcierge(scores: ReturnType<typeof calculateInitialHealthScore>) {
  return scores.some((item) => item.score < 45);
}

function ResultPanel({
  result,
  answers,
  savingMessage,
  onRetake,
}: {
  result: ArchetypeResult;
  answers: number[];
  savingMessage?: string;
  onRetake: () => void;
}) {
  const scores = calculateInitialHealthScore(answers);
  const shouldEscalate = needsConcierge(scores);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-white p-5">
        <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
          Resultado do quiz
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--platform-ink)]">{ARCHETYPE_LABELS[result.key]}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--platform-muted)]">{result.description}</p>

        <div className="mt-5 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-group)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--platform-muted)]">Score comportamental</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--platform-ink)]">{Math.round(result.score)}</p>
        </div>

        <div className="mt-5 space-y-2">
          {result.benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm font-medium text-[var(--platform-muted)]">
              <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
              {benefit}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-group)] p-4">
          <div className="flex items-start gap-3">
            {shouldEscalate ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-600" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-semibold text-[var(--platform-ink)]">
                {shouldEscalate ? 'Concierge UniHER recomendado' : 'Acompanhamento privado recomendado'}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--platform-muted)]">
                {shouldEscalate
                  ? 'O quiz aponta uma dimensao em vermelho. A colaboradora pode solicitar Concierge quando o contrato estiver habilitado.'
                  : 'O quiz orienta sua jornada privada e os proximos sinais do Semaforo.'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/concierge?source=semaforo&archetype=${result.key}`}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--platform-radius-control)] bg-[var(--platform-action)] px-4 py-3 text-sm font-semibold text-white"
            >
              Solicitar Concierge UniHER
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] px-4 py-3 text-sm font-semibold text-[var(--platform-ink)]"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Refazer quiz
            </button>
          </div>
          {savingMessage ? <p className="mt-3 text-xs font-medium text-[var(--platform-muted)]">{savingMessage}</p> : null}
        </div>
      </div>

      <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-white p-5">
        <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
          Semaforo por dimensao
        </p>
        <p className="mt-1 text-sm text-[var(--platform-muted)]">
          Leitura educativa baseada no quiz correto de onboarding. Nao e diagnostico clinico.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {scores.map((item) => {
            const signal = signalFromScore(item.score);
            return (
              <div
                key={item.dimension}
                className="rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-group)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="min-w-0 text-sm font-semibold text-[var(--platform-ink)]">{item.dimension}</h4>
                  <span className={`inline-flex flex-none items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${signal.className}`}>
                    <span className={`h-2 w-2 rounded-full ${signal.dot}`} aria-hidden="true" />
                    {signal.label}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={cn('h-full rounded-full', signal.dot)}
                    style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--platform-muted)]">{Math.round(item.score)} / 100</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AuthenticatedSemaforoQuiz() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(INITIAL_ANSWERS);
  const [localResult, setLocalResult] = useState<ArchetypeResult | null>(null);
  const [savingMessage, setSavingMessage] = useState('');
  const { data, mutate } = useSWR<QuizStateResponse | null>('/api/quiz', fetcher, {
    revalidateOnFocus: false,
  });

  const persistedResult = useMemo(() => {
    if (!data?.answers?.length) return null;
    return calculateArchetype(data.answers);
  }, [data?.answers]);
  const visibleResult = localResult ?? (!started ? persistedResult : null);
  const visibleAnswers = localResult ? answers : data?.answers ?? answers;
  const currentQuestion = ONBOARDING_QUIZ_QUESTIONS[step];
  const progressPercent = ((step + 1) / ONBOARDING_QUIZ_QUESTIONS.length) * 100;

  const updateAnswer = (value: number) => {
    const nextAnswers = [...answers];
    nextAnswers[step] = value;
    setAnswers(nextAnswers);
  };

  const resetQuiz = () => {
    setStarted(true);
    setStep(0);
    setAnswers(INITIAL_ANSWERS);
    setLocalResult(null);
    setSavingMessage('');
  };

  const finishQuiz = async () => {
    const result = calculateArchetype(answers);
    setLocalResult(result);
    setSavingMessage('Salvando resultado privado...');

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers, archetypeKey: result.key }),
      });
      if (!response.ok) throw new Error('save_failed');
      await mutate();
      setSavingMessage('Resultado salvo no seu perfil UniHER.');
    } catch {
      setSavingMessage('Nao foi possivel salvar agora. O resultado continua visivel nesta sessao.');
    }
  };

  const next = () => {
    if (step < ONBOARDING_QUIZ_QUESTIONS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    void finishQuiz();
  };

  return (
    <section
      className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 sm:p-5"
      aria-labelledby="semaforo-quiz-title"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
          Quiz do Semaforo
        </p>
        <h2 id="semaforo-quiz-title" className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
          Resultado personalizado e rota de apoio
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--platform-muted)]">
          O quiz correto da plataforma usa sliders de onboarding, salva o arquétipo no perfil e colore as dimensões do Semáforo.
        </p>
      </div>

      {visibleResult ? (
        <ResultPanel
          result={visibleResult}
          answers={visibleAnswers}
          savingMessage={savingMessage}
          onRetake={resetQuiz}
        />
      ) : !started ? (
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">Check-in inicial</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--platform-ink)]">Responder quiz do Semaforo</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--platform-muted)]">
            Responda as 6 perguntas do onboarding para receber seu perfil e o Semaforo inicial por dimensao.
          </p>
          <button
            type="button"
            onClick={resetQuiz}
            className="mt-5 inline-flex items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-action)] px-5 py-3 text-sm font-semibold text-white"
          >
            Comecar quiz do Semaforo
          </button>
        </div>
      ) : (
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-white p-6 sm:p-8">
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-[var(--platform-group)]">
            <div
              className="h-full rounded-full bg-[var(--platform-action)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
              Pergunta {step + 1} de {ONBOARDING_QUIZ_QUESTIONS.length}
            </span>
            <span className="text-xs font-semibold text-[var(--platform-muted)]">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-semibold text-[var(--platform-ink)]">{currentQuestion.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{currentQuestion.helper}</p>

          <div className="mt-8">
            <input
              type="range"
              min="0"
              max="100"
              step="25"
              value={answers[step]}
              onChange={(event) => updateAnswer(Number(event.target.value))}
              aria-label={`Resposta da pergunta ${step + 1}`}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--platform-group)] accent-[var(--platform-action)]"
            />
            <div className="mt-4 flex justify-between gap-3 text-xs font-semibold uppercase text-[var(--platform-muted)]">
              <span>{currentQuestion.leftLabel}</span>
              <span className="text-right">{currentQuestion.rightLabel}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--platform-action-strong)]">
              {getOnboardingQuizSelectionText(answers[step], currentQuestion)}
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0}
              className="rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] px-5 py-3 text-sm font-semibold text-[var(--platform-ink)] disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-[var(--platform-radius-control)] bg-[var(--platform-action)] px-5 py-3 text-sm font-semibold text-white"
            >
              {step === ONBOARDING_QUIZ_QUESTIONS.length - 1 ? 'Ver resultado' : 'Proxima pergunta'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
