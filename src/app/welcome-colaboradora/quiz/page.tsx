'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const QUESTIONS = [
  {
    id: 1,
    title: "O que mais motiva você no dia a dia?",
    leftLabel: "Estabilidade e Planos",
    rightLabel: "Desafios e Resultados",
    dim: "stability_vs_challenge"
  },
  {
    id: 2,
    title: "Como você prefere cuidar da sua saúde?",
    leftLabel: "Cuidado Coletivo",
    rightLabel: "Metas Individuais",
    dim: "care_vs_balance"
  },
  {
    id: 3,
    title: "Como está sua rotina de exames preventivos?",
    leftLabel: "Preciso de ajuda",
    rightLabel: "Tudo em dia",
    dim: "prevention"
  },
  {
    id: 4,
    title: "Como anda a qualidade do seu sono?",
    leftLabel: "Muitas interrupções",
    rightLabel: "Durmo muito bem",
    dim: "sleep"
  },
  {
    id: 5,
    title: "Seu nível de energia ao longo do dia é:",
    leftLabel: "Oscila bastante",
    rightLabel: "Sempre alto",
    dim: "energy"
  },
  {
    id: 6,
    title: "Como você lida com o estresse no trabalho?",
    leftLabel: "Afeta meu humor",
    rightLabel: "Lido com facilidade",
    dim: "mental"
  }
];

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(50));
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const currentQuestion = QUESTIONS[step];

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const updateAnswer = (val: number) => {
    const newAnswers = [...answers];
    newAnswers[step] = val;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const data = await res.json();
        setToast({ message: `Arquétipo ${data.archetype.key} identificado!`, type: 'success' });
        setTimeout(() => router.push('/colaboradora'), 2000);
      } else {
        setToast({ message: 'Erro ao processar o quiz.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Falha na conexão.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6 font-body overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-rose-100/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-gold-100/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-cream-200 rounded-full mb-12 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-rose-500 transition-all duration-700 ease-out" 
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>

        <Card className="w-full p-10 md:p-14 animate-fadeUp rounded-lg shadow-2xl bg-white/95 backdrop-blur-sm border-border-1 overflow-hidden">
          <div className="flex flex-col items-center text-center space-y-8">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">QUESTÃO {step + 1} DE {QUESTIONS.length}</span>
            <h2 className="text-3xl font-display font-bold text-uni-text-900 leading-tight min-h-[4rem]">{currentQuestion.title}</h2>
            
            <div className="w-full py-12 px-2">
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={answers[step]}
                onChange={e => updateAnswer(parseInt(e.target.value))}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-600 transition-all select-none"
              />
              <div className="flex justify-between mt-6 text-xs font-bold text-uni-text-400 select-none uppercase tracking-wide px-1">
                <span className={cn("transition-colors duration-300", answers[step] < 45 ? "text-rose-600" : "")}>{currentQuestion.leftLabel}</span>
                <span className={cn("transition-colors duration-300", answers[step] > 55 ? "text-rose-600" : "")}>{currentQuestion.rightLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full pt-8 border-t border-cream-100 mt-4">
              <Button 
                variant="ghost" 
                className={cn("px-8", step === 0 ? "invisible" : "")}
                onClick={() => setStep(step - 1)}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button 
                className="flex-grow h-14 text-lg font-bold shadow-rose shadow-sm"
                onClick={handleNext}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  step === QUESTIONS.length - 1 ? "Ver meu Arquétipo" : "Próxima Pergunta"
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Motivation note */}
        <p className="mt-8 text-xs text-uni-text-400 italic text-center animate-fadeIn group">
          Sua resposta ajuda a UniHER a criar uma jornada personalizada para o seu perfil. <br />
          <span className="group-hover:text-rose-500 transition-colors">A saúde feminina é diversa e o seu cuidado também deve ser.</span>
        </p>
      </div>

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
