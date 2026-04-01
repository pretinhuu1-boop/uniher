'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';

export default function WelcomeColaboradoraPage() {
  const router = useRouter();

  const handleStartCheckin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniher-role', 'colaboradora');
    }
    router.push('/welcome-colaboradora/quiz');
  };

  const handleGoToPanel = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('uniher-skip-quiz', '1');
    }
    router.push('/colaboradora');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 p-6 font-body">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-br from-rose-50/50 via-cream-50 to-gold-50/20" />
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[60%] w-[60%] rounded-full bg-rose-100/30 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-center space-y-6 text-center lg:items-start lg:text-left">
          <span className="flex h-32 w-32 items-center justify-center rounded-full border border-border-2 bg-white p-6 shadow-xl">
            <Image
              src="/logo-uniher.png"
              alt="UniHER"
              width={96}
              height={96}
              priority
              className="object-contain"
              style={{ width: 96, height: 'auto' }}
            />
          </span>

          <h1 className="text-4xl font-bold leading-tight text-uni-text-900 md:text-5xl">
            Seu check-in de saude
            <br />
            <span className="italic text-rose-500">comeca aqui.</span>
          </h1>

          <p className="max-w-md text-lg text-uni-text-600">
            Voce ja entrou na sua conta. Agora responda 6 perguntas simples para a UniHER entender seu momento e montar uma jornada personalizada para voce.
          </p>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border-1 bg-white text-sm font-bold text-uni-text-700 shadow-md">
                S
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-uni-text-400">Saude</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border-1 bg-white text-sm font-bold text-uni-text-700 shadow-md">
                F
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-uni-text-400">Foco</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border-1 bg-white text-sm font-bold text-uni-text-700 shadow-md">
                E
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-uni-text-400">Energia</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card
            className="group flex cursor-pointer flex-col items-start gap-4 border-border-2 p-8 transition-all duration-300 hover:bg-rose-50/40"
            onClick={handleStartCheckin}
            variant="flat"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-green text-xl font-bold text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              +
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-uni-text-900 transition-colors group-hover:text-rose-700">
                Comecar meu check-in
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-uni-text-500">
                Voce vai arrastar uma balanca simples para mostrar como esta em cada tema. Leva cerca de 2 minutos.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-rose-500 transition-transform group-hover:translate-x-2">
              Responder agora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          <Card
            className="group flex cursor-pointer flex-col items-start gap-4 border-border-1 p-8 transition-all duration-300 hover:bg-cream-100/50"
            onClick={handleGoToPanel}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-200 text-xl font-bold text-gold-700 shadow-md transition-all duration-500 group-hover:scale-110">
              &gt;
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-uni-text-900">Ir para minha area</h2>
              <p className="mt-1 text-sm leading-relaxed text-uni-text-500">
                Se preferir, voce pode pular esta etapa agora e voltar depois para finalizar seu perfil de saude.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-uni-text-400 transition-all group-hover:translate-x-2 group-hover:text-gold-700">
              Abrir painel
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          <button
            type="button"
            onClick={handleGoToPanel}
            className="mx-auto flex w-fit items-center gap-1 pl-2 text-xs text-uni-text-400 transition-colors hover:text-rose-500 lg:mx-0"
          >
            Voltar para o painel
          </button>
        </div>
      </div>
    </main>
  );
}
