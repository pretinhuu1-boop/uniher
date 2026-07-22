export const SEMAFORO_REVIEW_STATE = Object.freeze({
  status: 'under_review',
  label: 'Em revisão',
  message: 'Estamos revisando este recurso para separar cuidado e gamificação.',
} as const);

export const SEMAFORO_PRIVATE_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const);

export class SemaforoContainmentError extends Error {
  readonly code = 'SEMAFORO_CONTAINED' as const;

  constructor() {
    super('Semáforo recalculation is contained during privacy review');
    this.name = 'SemaforoContainmentError';
  }
}
