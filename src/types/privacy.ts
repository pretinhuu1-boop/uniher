export const MINIMUM_PROTECTED_COHORT = 10 as const;
export const SUPPRESSION_MESSAGE =
  'Dados insuficientes para proteger a privacidade' as const;

export type SuppressionReason =
  | 'minimum_cohort'
  | 'complementary'
  | 'not_computable';

export type ProtectedMetric<T> =
  | { status: 'visible'; value: T }
  | {
      status: 'suppressed';
      reason: SuppressionReason;
      message: typeof SUPPRESSION_MESSAGE;
    };
