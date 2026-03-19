import { QuizQuestion } from '@/types';

export const QUESTIONS: QuizQuestion[] = [
  {
    type: 'single',
    question: 'O que mais te trava no cuidado com sua saúde?',
    subtitle: '90% das colaboradoras se identificam com UM desses motivos',
    options: [
      { label: 'Falta de tempo', description: 'Minha rotina não para — nunca sobra espaço para mim' },
      { label: 'Fico adiando exames', description: 'Sei que preciso ir, mas sempre empurro para depois' },
      { label: 'Estresse e ansiedade constantes', description: 'Minha cabeça não desliga, difícil cuidar do corpo' },
      { label: 'Sono ruim, acordo cansada', description: 'Falta de sono afeta tudo na minha vida' },
      { label: 'Quero otimizar — já me cuido', description: 'Estou no caminho, mas posso ir mais longe' },
    ],
  },
  {
    type: 'multi',
    question: 'O que você quer transformar nos próximos 90 dias?',
    subtitle: 'Selecione todas as áreas que deseja melhorar',
    options: [
      { label: 'Saúde física e exames preventivos', description: '' },
      { label: 'Saúde mental e emocional', description: '' },
      { label: 'Qualidade do sono', description: '' },
      { label: 'Energia e disposição no trabalho', description: '' },
      { label: 'Alimentação e hábitos saudáveis', description: '' },
      { label: 'Equilíbrio vida pessoal e profissional', description: '' },
    ],
  },
  {
    type: 'scale',
    question: 'De 1 a 5, como você avalia sua saúde hoje?',
    subtitle: 'Sem julgamento. A maioria das mulheres marca 2 ou 3',
    options: ['Negligenciando', 'Pouca atenção', 'Razoável', 'Cuidando bem', 'Excelente'],
  },
  {
    type: 'single',
    question: 'O que te faz agir de verdade?',
    subtitle: 'Sua resposta define como o UniHER vai te desafiar',
    options: [
      { label: 'Competição', description: 'Me motivo superando colegas no ranking' },
      { label: 'Equipe', description: 'Rendo muito mais junto com outras pessoas' },
      { label: 'Metas pessoais', description: 'Meu maior rival sou eu mesma de ontem' },
      { label: 'Recompensas', description: 'Badges, pontos e prêmios me motivam muito' },
    ],
  },
  {
    type: 'single',
    question: 'Se pudesse mudar UMA coisa esta semana, qual seria?',
    subtitle: 'A IA do UniHER vai priorizar isso no seu plano',
    options: [
      { label: 'Fazer um exame que está atrasado', description: 'Dar o primeiro passo na prevenção' },
      { label: 'Melhorar minha qualidade do sono', description: 'Acordar com mais energia' },
      { label: 'Criar um hábito de movimento', description: 'Me mover mais durante o dia' },
      { label: 'Reduzir estresse e ansiedade', description: 'Encontrar momentos para desacelerar' },
      { label: 'Comer com mais consciência', description: 'Alimentação como cuidado real' },
      { label: 'Equilibrar vida pessoal e profissional', description: 'Mais tempo de qualidade para mim' },
    ],
  },
  {
    type: 'single',
    question: 'Última etapa: sua faixa etária',
    subtitle: 'Personaliza campanhas preventivas mais relevantes',
    options: [
      { label: '18 a 25 anos', description: '' },
      { label: '26 a 35 anos', description: '' },
      { label: '36 a 45 anos', description: '' },
      { label: '46 a 55 anos', description: '' },
      { label: '55 anos ou mais', description: '' },
      { label: 'Prefiro não informar', description: '' },
    ],
  },
];

export const DIMENSIONS = ['Prevenção', 'Sono', 'Energia', 'Saúde Mental', 'Hábitos', 'Engajamento'];
