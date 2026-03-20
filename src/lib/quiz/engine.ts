import { ArchetypeKey } from '@/types/platform';

export interface QuizAnswer {
  questionId: number;
  value: number; // 0-100 or specific scale
}

export interface ArchetypeResult {
  key: ArchetypeKey;
  score: number;
  description: string;
  benefits: string[];
}

const ARCHETYPES: Record<ArchetypeKey, ArchetypeResult> = {
  guardia: {
    key: 'guardia',
    score: 0,
    description: 'Você é o pilar da estabilidade e tradição. Valoriza a segurança e o cuidado contínuo.',
    benefits: ['Roteiros de exames preventivos', 'Planejamento de longo prazo', 'Suporte à saúde física'],
  },
  protetora: {
    key: 'protetora',
    score: 0,
    description: 'Seu foco é o bem-estar coletivo e a segurança emocional. Cuida de si para cuidar dos outros.',
    benefits: ['Grupos de apoio', 'Saúde mental e emocional', 'Rede de autocuidado'],
  },
  guerreira: {
    key: 'guerreira',
    score: 0,
    description: 'Focada em resultados e superação. Busca desafios e alta performance na saúde.',
    benefits: ['Gamificação competitiva', 'Desafios de fitness', 'Metas de produtividade'],
  },
  equilibrista: {
    key: 'equilibrista',
    score: 0,
    description: 'Busca a harmonia entre vida pessoal, profissional e saúde.',
    benefits: ['Conciliação vida-trabalho', 'Mindfulness', 'Flexibilidade de rotina'],
  },
};

/**
 * Calcula o arquétipo com base nas respostas.
 * Esta é uma lógica simplificada para a fase 1.
 * @param answers Array de valores numéricos para cada pergunta
 */
export function calculateArchetype(answers: number[]): ArchetypeResult {
  // Exemplo de lógica: média ponderada por dimensão
  // Q1: Foco (0: Estabilidade, 100: Desafio) -> Guardiã vs Guerreira
  // Q2: Cuidado (0: Coletivo, 100: Individual) -> Protetora vs Equilibrista
  
  const stabilityVsChallenge = answers[0] || 50;
  const careVsBalance = answers[1] || 50;
  
  let result: ArchetypeKey = 'equilibrista';
  
  if (stabilityVsChallenge < 40 && careVsBalance < 50) result = 'guardia';
  else if (stabilityVsChallenge < 50 && careVsBalance >= 50) result = 'protetora';
  else if (stabilityVsChallenge >= 50 && careVsBalance < 50) result = 'guerreira';
  else result = 'equilibrista';

  return {
    ...ARCHETYPES[result],
    score: (stabilityVsChallenge + careVsBalance) / 2
  };
}

/**
 * Gera o Health Score inicial baseado nas dimensões do quiz.
 */
export function calculateInitialHealthScore(answers: number[]) {
  return [
    { dimension: 'Prevenção', score: answers[2] || 70 },
    { dimension: 'Sono', score: answers[3] || 60 },
    { dimension: 'Energia', score: answers[4] || 65 },
    { dimension: 'Saúde Mental', score: answers[5] || 75 },
    { dimension: 'Hábitos', score: (answers[4] + answers[5]) / 2 },
    { dimension: 'Engajamento', score: 100 }
  ];
}
