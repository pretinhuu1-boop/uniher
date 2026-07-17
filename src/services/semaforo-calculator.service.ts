import { SemaforoContainmentError } from '@/lib/semaforo/containment';

/**
 * Explicit quarantine boundary for the former health-score calculator.
 * Every entry point fails before database or repository access.
 */
export async function recalculateSemaforo(_userId: string): Promise<void> {
  throw new SemaforoContainmentError();
}

export async function recalculateCompanySemaforo(_companyId: string): Promise<number> {
  throw new SemaforoContainmentError();
}

export async function recalculateAllSemaforos(): Promise<number> {
  throw new SemaforoContainmentError();
}
