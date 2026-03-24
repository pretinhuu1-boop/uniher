'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function WelcomeColaboradoraPage() {
  const router = useRouter();

  const handleStartCheckin = () => {
    // Para demo, o papel é setado localmente
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniher-role', 'colaboradora');
    }
    router.push('/welcome-colaboradora/quiz');
  };

  const handleGoToLogin = () => {
    router.push('/auth');
  };

  return (
    <main className="min-h-screen bg-cream-50 flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Visual background layers */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-50/50 via-cream-50 to-gold-50/20 pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-rose-100/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Brand Presence Column */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div 
            className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-border-2 animate-float cursor-pointer hover:scale-110 transition-transform duration-500"
            onClick={() => router.push('/')}
          >
            <Image src="/logo-uniher.png" alt="UniHER" width={48} height={40} priority className="object-contain" style={{ width: 48, height: 'auto' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-uni-text-900 leading-tight">
            Bem-vinda, <br />
            <span className="text-rose-500 italic">Colaboradora!</span>
          </h1>
          <p className="text-lg text-uni-text-600 max-w-md">
            Você é a protagonista da sua saúde. Já tem uma conta ou deseja fazer seu primeiro check-in de saúde?
          </p>
          <div className="flex items-center gap-6 pt-4 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md mb-2 border border-border-1 text-xl">🏥</div>
              <span className="text-[10px] font-bold uppercase text-uni-text-400 tracking-wider">Saúde</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md mb-2 border border-border-1 text-xl">🧘‍♀️</div>
              <span className="text-[10px] font-bold uppercase text-uni-text-400 tracking-wider">Foco</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md mb-2 border border-border-1 text-xl">⚡</div>
              <span className="text-[10px] font-bold uppercase text-uni-text-400 tracking-wider">Energia</span>
            </div>
          </div>
        </div>

        {/* Action Cards Column */}
        <div className="space-y-6 animate-fadeUp">
          {/* Check-in Card */}
          <Card 
            className="group p-8 flex flex-col items-start gap-4 cursor-pointer hover:bg-rose-50/40 transition-all duration-300 border-border-2 animate-fadeIn"
            onClick={handleStartCheckin}
            variant="flat"
          >
            <div className="w-12 h-12 rounded-xl bg-uni-green text-white flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              ✨
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-uni-text-900 group-hover:text-rose-700 transition-colors">Iniciar Check-in de Saúde</h2>
              <p className="text-sm text-uni-text-500 mt-1 leading-relaxed">
                Primeira vez? Descubra seu arquétipo de saúde e receba recomendações exclusivas e personalizadas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-rose-500 group-hover:translate-x-2 transition-transform">
              Começar agora 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          {/* Login Card */}
          <Card 
            className="group p-8 flex flex-col items-start gap-4 cursor-pointer hover:bg-cream-100/50 transition-all duration-300 border-border-1 animate-fadeIn"
            onClick={handleGoToLogin}
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-12 h-12 rounded-xl bg-gold-200 text-gold-700 flex items-center justify-center text-2xl shadow-md transform group-hover:scale-110 transition-all duration-500">
              🔑
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-uni-text-900">Já tenho uma conta</h2>
              <p className="text-sm text-uni-text-500 mt-1 leading-relaxed">
                Entre com seu email corporativo para acessar seus desafios, pontos e histórico.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-uni-text-400 group-hover:text-gold-700 group-hover:translate-x-2 transition-all">
              Acessar minha área
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          <button 
            type="button" 
            onClick={() => router.push('/welcome')}
            className="text-xs text-uni-text-400 hover:text-rose-500 transition-colors flex items-center gap-1 mx-auto lg:mx-0 w-fit pl-2"
          >
            ← Voltar para seleção de perfil
          </button>
        </div>
      </div>
    </main>
  );
}
