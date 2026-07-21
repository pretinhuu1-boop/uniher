import { SemaforoContainmentError } from '@/lib/semaforo/containment';

export interface HealthScoreRow {
  id: string;
  user_id: string;
  dimension: string;
  score: number;
  status: string;
  recorded_at: string;
}

export interface DimensionSummary {
  dimension: string;
  score: number;
  status: string;
  icon: string;
}

export function getLatestHealthScores(_userId: string): DimensionSummary[] {
  throw new SemaforoContainmentError();
}

export function getHealthScoreHistory(
  _userId: string,
  _dimension: string,
  _days = 7,
): HealthScoreRow[] {
  throw new SemaforoContainmentError();
}

export function getCompanyHealthOverview(
  _companyId: string,
): { dimension: string; avg_score: number; status: string }[] {
  throw new SemaforoContainmentError();
}

export async function recordHealthScore(
  _userId: string,
  _dimension: string,
  _score: number
): Promise<HealthScoreRow> {
  throw new SemaforoContainmentError();
}
