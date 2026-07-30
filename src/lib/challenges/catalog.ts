import type { CompanyChallengeCatalogItem } from '@/types/challenges';

const COMPANY_CHALLENGE_CATALOG = Object.freeze([
  {
    key: 'learning-sprint',
    title: 'Sprint de aprendizagem',
    description: 'Concluir conteudos educativos selecionados pela empresa para apoiar a rotina de aprendizagem.',
    mode: 'content_items',
    target: 3,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-12-31T23:59:59.999Z',
    isActive: true,
  },
  {
    key: 'focus-sessions',
    title: 'Sessoes de foco',
    description: 'Reservar momentos de foco para organizar prioridades de trabalho.',
    mode: 'sessions',
    target: 4,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-12-31T23:59:59.999Z',
    isActive: true,
  },
  {
    key: 'weekly-routine',
    title: 'Rotina semanal segura',
    description: 'Manter uma rotina simples de revisao semanal sem informar dados sensiveis.',
    mode: 'days',
    target: 5,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-12-31T23:59:59.999Z',
    isActive: true,
  },
] satisfies CompanyChallengeCatalogItem[]);

export function listCompanyChallengeCatalog(): CompanyChallengeCatalogItem[] {
  return COMPANY_CHALLENGE_CATALOG.map((challenge) => ({ ...challenge }));
}

export function getCompanyChallengeCatalogItem(key: string): CompanyChallengeCatalogItem | undefined {
  const challenge = COMPANY_CHALLENGE_CATALOG.find((item) => item.key === key);
  return challenge ? { ...challenge } : undefined;
}
