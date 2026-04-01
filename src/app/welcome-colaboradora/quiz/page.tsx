'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { calculateArchetype } from '@/lib/quiz/engine';

type Question = {
  id: number;
  title: string;
  helper: string;
  leftLabel: string;
  rightLabel: string;
  dim: string;
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'O que mais motiva voce no dia a dia?',
    helper: 'Pense no que mais combina com seu jeito hoje: manter estabilidade ou buscar novos desafios.',
    leftLabel: 'Prefiro estabilidade',
    rightLabel: 'Prefiro desafios',
    dim: 'stability_vs_challenge',
  },
  {
    id: 2,
    title: 'Como voce prefere cuidar da sua saude?',
    helper: 'Escolha entre um cuidado mais compartilhado, com apoio, ou metas mais pessoais e individuais.',
    leftLabel: 'Gosto de apoio e troca',
    rightLabel: 'Prefiro metas pessoais',
    dim: 'care_vs_balance',
  },
  {
    id: 3,
    title: 'Como esta sua rotina de exames preventivos?',
    helper: 'Considere exames de rotina, consultas e acompanhamentos que ajudam a prevenir problemas antes deles aparecerem.',
    leftLabel: 'Preciso organizar isso',
    rightLabel: 'Esta tudo em dia',
    dim: 'prevention',
  },
  {
    id: 4,
    title: 'Como anda a qualidade do seu sono?',
    helper: 'Pense em como voce dorme na maior parte da semana, incluindo interrupcoes e sensacao de descanso ao acordar.',
    leftLabel: 'Sono bem interrompido',
    rightLabel: 'Durmo e descanso bem',
    dim: 'sleep',
  },
  {
    id: 5,
    title: 'Seu nivel de energia ao longo do dia e:',
    helper: 'Considere se voce passa o dia com cansaco, oscilacoes ou se costuma manter disposicao.',
    leftLabel: 'Oscila bastante',
    rightLabel: 'Se mantem bem',
    dim: 'energy',
  },
  {
    id: 6,
    title: 'Como voce lida com o estresse no trabalho?',
    helper: 'Nao pense no ideal. Responda como voce realmente se sente na rotina de hoje.',
    leftLabel: 'Isso pesa em mim',
    rightLabel: 'Consigo lidar bem',
    dim: 'mental',
  },
];

function getSelectionText(value: number, question: Question) {
  if (value <= 20) return `Muito mais perto de: ${question.leftLabel.toLowerCase()}`;
  if (value <= 40) return `Mais perto de: ${question.leftLabel.toLowerCase()}`;
  if (value < 60) return 'No meio da balanca';
  if (value < 80) return `Mais perto de: ${question.rightLabel.toLowerCase()}`;
  return `Muito mais perto de: ${question.rightLabel.toLowerCase()}`;
}

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(50));
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const currentQuestion = QUESTIONS[step];
  const progressPercent = ((step + 1) / QUESTIONS.length) * 100;
  const totalXp = QUESTIONS.length * 20;

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    void handleSubmit();
  };

  const updateAnswer = (value: number) => {
    const nextAnswers = [...answers];
    nextAnswers[step] = value;
    setAnswers(nextAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const archetype = calculateArchetype(answers);
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, archetypeKey: archetype.key }),
      });

      if (!res.ok) {
        setToast({
          message: 'Nao foi possivel finalizar seu check-in agora. Tente novamente em alguns segundos.',
          type: 'error',
        });
        return;
      }

      const data = await res.json();
      const archetypeName = data?.archetype?.name || archetype.key;

      setToast({
        message: `Check-in concluido. Perfil identificado: ${archetypeName}.`,
        type: 'success',
      });

      window.setTimeout(() => router.push('/colaboradora'), 1800);
    } catch {
      setToast({
        message: 'Falha de conexao. Verifique sua internet e tente novamente.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-cream-50 p-6 font-body">
      <div className="absolute right-0 top-0 h-[60%] w-[60%] rounded-full bg-rose-100/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[40%] w-[40%] rounded-full bg-gold-100/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center">
        <div className="mb-12 h-1.5 w-full overflow-hidden rounded-full bg-cream-200 shadow-inner">
          <div
            className="h-full bg-rose-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <Card className="w-full overflow-hidden rounded-lg border-border-1 bg-white/95 p-10 shadow-2xl backdrop-blur-sm md:p-14">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                Missao diaria
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Etapa {step + 1}/{QUESTIONS.length}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                +{totalXp} XP ao concluir
              </span>
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">
              QUESTAO {step + 1} DE {QUESTIONS.length}
            </span>

            <div className="flex items-center gap-2">
              {QUESTIONS.map((q, idx) => (
                <span
                  key={q.id}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border border-cream-300 transition-all',
                    idx < step && 'bg-emerald-500 border-emerald-500',
                    idx === step && 'bg-rose-500 border-rose-500 scale-125',
                    idx > step && 'bg-cream-100'
                  )}
                />
              ))}
            </div>

            <h2 className="min-h-[4rem] text-3xl font-display font-bold leading-tight text-uni-text-900">
              {currentQuestion.title}
            </h2>

            <p className="max-w-2xl text-sm leading-relaxed text-uni-text-500 md:text-base">
              {currentQuestion.helper}
            </p>

            <div className="w-full px-2 py-12">
              <div className="mb-6 rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-left text-sm text-uni-text-600">
                <p className="font-semibold text-uni-text-800">Como responder</p>
                <p className="mt-1">
                  Esta barra funciona como uma balanca. Arraste a bolinha para o lado que mais combina com voce.
                  Se ficar no meio, significa que voce esta entre os dois lados.
                </p>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="25"
                value={answers[step]}
                onChange={(event) => updateAnswer(Number(event.target.value))}
                aria-label={`Balanca de resposta da pergunta ${step + 1}`}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-cream-200 accent-rose-500 transition-all select-none hover:accent-rose-600"
              />

              <div className="mt-6 flex justify-between px-1 text-xs font-bold uppercase tracking-wide text-uni-text-400 select-none">
                <span className={cn('transition-colors duration-300', answers[step] < 45 ? 'text-rose-600' : '')}>
                  {currentQuestion.leftLabel}
                </span>
                <span className={cn('transition-colors duration-300', answers[step] > 55 ? 'text-rose-600' : '')}>
                  {currentQuestion.rightLabel}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-uni-text-400">
                <span>Mais para a esquerda</span>
                <span>No meio</span>
                <span>Mais para a direita</span>
              </div>

              <p className="mt-4 text-sm font-semibold text-rose-600">
                {getSelectionText(answers[step], currentQuestion)}
              </p>
              <p className="mt-2 text-xs font-medium text-uni-text-400">
                Dica: nao existe certo ou errado aqui. O objetivo e mapear seu momento atual.
              </p>
            </div>

            <div className="mt-4 flex w-full items-center gap-4 border-t border-cream-100 pt-8">
              <Button
                variant="ghost"
                className={cn('px-8', step === 0 ? 'invisible' : '')}
                onClick={() => setStep(step - 1)}
                disabled={submitting}
              >
                Voltar
              </Button>

              <Button
                className="h-14 flex-grow text-lg font-bold shadow-rose shadow-sm"
                onClick={handleNext}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : step === QUESTIONS.length - 1 ? (
                  'Ver meu perfil'
                ) : (
                  'Proxima pergunta'
                )}
              </Button>
            </div>
          </div>
        </Card>

        <p className="group mt-8 text-center text-xs italic text-uni-text-400">
          Sua resposta ajuda a UniHER a criar uma jornada personalizada para o seu perfil.
          <br />
          <span className="transition-colors group-hover:text-rose-500">
            A saude feminina e diversa e o seu cuidado tambem deve ser.
          </span>
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
