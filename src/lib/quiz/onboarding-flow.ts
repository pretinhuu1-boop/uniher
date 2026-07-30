export interface OnboardingQuizQuestion {
  id: number;
  title: string;
  helper: string;
  leftLabel: string;
  rightLabel: string;
  dim: string;
}

export const ONBOARDING_QUIZ_QUESTIONS: OnboardingQuizQuestion[] = [
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

export function getOnboardingQuizSelectionText(value: number, question: OnboardingQuizQuestion) {
  if (value <= 20) return `Muito mais perto de: ${question.leftLabel.toLowerCase()}`;
  if (value <= 40) return `Mais perto de: ${question.leftLabel.toLowerCase()}`;
  if (value < 60) return 'No meio da balanca';
  if (value < 80) return `Mais perto de: ${question.rightLabel.toLowerCase()}`;
  return `Muito mais perto de: ${question.rightLabel.toLowerCase()}`;
}
