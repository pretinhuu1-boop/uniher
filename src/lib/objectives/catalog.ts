import type { PersonalObjectiveTemplate } from '@/types/objectives';

export const PERSONAL_OBJECTIVE_TEMPLATES = Object.freeze([
  {
    key: 'weekly-learning',
    title: 'Concluir uma leitura da jornada',
    description: 'Escolha um conteudo educativo aprovado e registre o avancao quando terminar.',
    cadence: 'Semanal',
  },
  {
    key: 'pause-routine',
    title: 'Criar uma pausa de cuidado',
    description: 'Reserve um momento simples para descanso, organizacao ou respiracao consciente.',
    cadence: 'Livre',
  },
  {
    key: 'agenda-review',
    title: 'Revisar meus lembretes pessoais',
    description: 'Confira sua agenda e deixe proximos cuidados organizados para voce mesma.',
    cadence: 'Mensal',
  },
] satisfies PersonalObjectiveTemplate[]);

const templatesByKey = new Map(PERSONAL_OBJECTIVE_TEMPLATES.map((template) => [template.key, template]));

export function listPersonalObjectiveTemplates(): PersonalObjectiveTemplate[] {
  return [...PERSONAL_OBJECTIVE_TEMPLATES];
}

export function getPersonalObjectiveTemplate(key: string): PersonalObjectiveTemplate | undefined {
  return templatesByKey.get(key);
}
