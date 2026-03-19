import {
  CollaboratorHome,
  Badge,
  Challenge,
  SemaforoItem,
  NotificationItem,
} from '@/types/platform';

export const COLLABORATOR_HOME: CollaboratorHome = {
  greeting: 'Boa noite',
  userName: 'Ana Maria',
  date: 'quarta-feira, 11 de fevereiro',
  healthAlert: 'Seu semáforo de saúde indica 1 urgente e 2 atenção. Que tal cuidar agora?',
  examsPercent: 40,
  examsTotal: 5,
  contentViewed: 1,
  campaignsActive: 1,
  campaignsTotal: 3,
  streakDays: 12,
  level: 5,
  points: 2370,
  pointsNextLevel: 130,
  achievementCount: 2,
  engagementStats: {
    streakDays: 12,
    openRate: 33,
    actionsToday: 3,
  },
};

export const BADGES: Badge[] = [
  { id: 'b1', name: 'Iniciante Dedicada', description: 'Complete seu primeiro check-in de saúde', icon: '🔥', unlockedAt: '2026-02-08', points: 50 },
  { id: 'b2', name: 'Streak de 7 Dias', description: 'Mantenha uma sequência de 7 dias ativos', icon: '⚡', unlockedAt: '2026-02-05', points: 100 },
  { id: 'b3', name: 'Preventiva', description: 'Registre 3 exames em dia', icon: '💗', points: 150 },
  { id: 'b4', name: 'Streak de 30 Dias', description: 'Mantenha uma sequência de 30 dias ativos', icon: '🏆', points: 300 },
  { id: 'b5', name: 'Mestra da Saúde', description: 'Alcance nível 10', icon: '👑', points: 500 },
  { id: 'b6', name: 'Embaixadora', description: 'Convide 5 colegas para a plataforma', icon: '🌟', points: 200 },
  { id: 'b7', name: 'Campeã Rosa', description: 'Complete a campanha Outubro Rosa', icon: '🎀', points: 250 },
  { id: 'b8', name: 'Equilíbrio Zen', description: 'Mantenha todas as dimensões acima de 7', icon: '🧘', points: 400 },
  { id: 'b9', name: 'Maratonista', description: 'Complete 50 desafios', icon: '🏅', points: 500 },
];

export const CHALLENGES: Challenge[] = [
  { id: 'c1', title: 'Check-in Matinal', description: 'Faça seu check-in de saúde por 5 dias seguidos', progress: 3, total: 5, points: 75, status: 'active', category: 'Hábitos', deadline: '2026-02-15' },
  { id: 'c2', title: 'Hidratação Consciente', description: 'Registre 8 copos de água por dia durante 7 dias', progress: 4, total: 7, points: 100, status: 'active', category: 'Hábitos', deadline: '2026-02-20' },
  { id: 'c3', title: 'Mindfulness', description: 'Complete 3 sessões de meditação esta semana', progress: 1, total: 3, points: 80, status: 'active', category: 'Saúde Mental', deadline: '2026-02-14' },
  { id: 'c4', title: 'Exame em Dia', description: 'Agende e realize um exame preventivo', progress: 0, total: 1, points: 200, status: 'active', category: 'Prevenção' },
  { id: 'c5', title: 'Primeira Semana', description: 'Complete 7 dias na plataforma', progress: 7, total: 7, points: 50, status: 'completed', category: 'Onboarding' },
  { id: 'c6', title: 'Sono Reparador', description: 'Durma 8h por 5 noites', progress: 0, total: 5, points: 120, status: 'locked', category: 'Sono' },
];

export const SEMAFORO: SemaforoItem[] = [
  { dimension: 'Prevenção', status: 'red', score: 3.2, recommendation: 'Agende seus exames preventivos — você está com 2 exames atrasados', icon: '🩺' },
  { dimension: 'Sono', status: 'yellow', score: 5.8, recommendation: 'Sua média de sono está abaixo do ideal. Tente dormir antes das 23h', icon: '😴' },
  { dimension: 'Energia', status: 'yellow', score: 5.5, recommendation: 'Incorpore pausas de 5 minutos a cada 2 horas de trabalho', icon: '⚡' },
  { dimension: 'Saúde Mental', status: 'green', score: 7.2, recommendation: 'Continue com suas práticas de mindfulness!', icon: '🧠' },
  { dimension: 'Hábitos', status: 'green', score: 6.8, recommendation: 'Seus hábitos estão melhorando! Mantenha a hidratação', icon: '🥗' },
  { dimension: 'Engajamento', status: 'green', score: 8.1, recommendation: 'Excelente! Você está super engajada na plataforma', icon: '🎯' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', type: 'badge', title: 'Novo Badge Desbloqueado!', message: 'Iniciante Dedicada - +50 pontos!', timestamp: '2026-02-08T18:30:00', read: false },
  { id: 'n2', type: 'level', title: 'Subiu de Nível!', message: 'Você alcançou o nível 5! Continue cuidando de você.', timestamp: '2026-02-07T10:00:00', read: false },
  { id: 'n3', type: 'campaign', title: 'Nova Campanha!', message: 'Janeiro Branco - Saúde Mental começou. Participe!', timestamp: '2026-01-01T08:00:00', read: true },
  { id: 'n4', type: 'challenge', title: 'Desafio Completado!', message: 'Primeira Semana concluída. +50 pontos!', timestamp: '2026-01-22T16:00:00', read: true },
  { id: 'n5', type: 'alert', title: 'Exame Pendente', message: 'Você tem 2 exames atrasados. Agende agora!', timestamp: '2026-02-10T09:00:00', read: false },
];
