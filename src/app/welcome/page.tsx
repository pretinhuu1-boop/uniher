'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface RoleCard {
  key: 'rh' | 'lideranca' | 'colaboradora';
  title: string;
  description: string;
  bullets: string[];
  icon: string;
  href: string;
  color: string;
}

const roles: RoleCard[] = [
  {
    key: 'rh',
    title: 'RH',
    description: 'Gerencie a saúde e bem-estar das colaboradoras da empresa.',
    bullets: ['Dashboard completo', 'Gestão de colaboradoras', 'Relatórios de engajamento'],
    icon: '📋',
    href: '/hr-onboarding',
    color: 'bg-rose-500',
  },
  {
    key: 'lideranca',
    title: 'Liderança',
    description: 'Acompanhe sua equipe e cuide da sua própria saúde.',
    bullets: ['Visão da equipe', 'Sua jornada pessoal', 'Engajamento do time'],
    icon: '👥',
    href: '/dashboard',
    color: 'bg-uni-green',
  },
  {
    key: 'colaboradora',
    title: 'Colaboradora',
    description: 'Cuide da sua saúde com acompanhamento personalizado.',
    bullets: ['Check-in de saúde', 'Campanhas e desafios', 'Recompensas exclusivas'],
    icon: '👤',
    href: '/welcome-colaboradora',
    color: 'bg-gold-200',
  },
];

export default function WelcomePage() {
  const router = useRouter();

  const handleSelect = (role: RoleCard) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniher-role', role.key);
    }
    router.push(role.href);
  };

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-body">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-full h-[60%] bg-gradient-to-br from-rose-100/30 to-transparent blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-100/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl z-10 flex flex-col items-center">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12 animate-float">
          <svg width="72" height="72" viewBox="0 0 36 36" fill="none" className="mb-4">
            <path d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z" fill="#F9EEF3" stroke="#C85C7E" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z" fill="#EAB8CB" stroke="#C85C7E" strokeWidth="0.9"/>
            <circle cx="18" cy="6" r="1.5" fill="#B8922A"/>
          </svg>
          <h1 className="text-4xl font-display font-bold text-uni-text-900 tracking-tight">Uni<span className="text-rose-500">HER</span></h1>
          <div className="w-12 h-1 bg-rose-500 rounded-full mt-2" />
        </div>

        <h2 className="text-2xl font-display font-bold text-uni-text-800 mb-10">Como você vai usar o app hoje?</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {roles.map((role, i) => (
            <Card 
              key={role.key}
              variant="flat"
              className={cn(
                "group p-8 flex flex-col items-center text-center gap-6 cursor-pointer hover:bg-white transition-all duration-500 border-border-1 h-full animate-fadeUp",
                `delay-[${i * 100}ms]`
              )}
              onClick={() => handleSelect(role)}
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                role.color,
                role.key === 'colaboradora' ? "text-gold-700" : "text-white"
              )}>
                {role.icon}
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-display font-bold text-uni-text-900">{role.title}</h3>
                <p className="text-sm text-uni-text-500 leading-relaxed min-h-[3rem]">
                  {role.description}
                </p>
              </div>

              <ul className="space-y-2 mt-4 flex-grow">
                {role.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs font-medium text-uni-text-600">
                    <span className={cn("w-1.5 h-1.5 rounded-full", role.color)} />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="pt-6 w-full flex justify-center">
                <div className="flex items-center gap-2 text-xs font-bold text-uni-text-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all">
                  Selecionar {role.title}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <footer className="mt-16 text-center">
          <p className="text-xs text-uni-text-400 leading-relaxed">
            Ao continuar, você concorda com nossa <a href="/privacidade" className="text-rose-500 font-bold hover:underline">política de privacidade</a> <br className="hidden sm:block" />
            e <a href="/termos" className="text-rose-500 font-bold hover:underline">termos de uso</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
