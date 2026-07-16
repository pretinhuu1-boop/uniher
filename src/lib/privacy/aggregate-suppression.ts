import {
  MINIMUM_PROTECTED_COHORT,
  SUPPRESSION_MESSAGE,
} from '@/types/privacy';
import type {
  ProtectedMetric,
  SuppressionReason,
} from '@/types/privacy';

export type AggregateCell<T> = { id: string } & ProtectedMetric<T>;

export type SuppressionConstraintKind =
  | 'row'
  | 'column'
  | 'total'
  | 'series';

export interface SuppressionConstraint {
  id: string;
  kind: SuppressionConstraintKind;
  cellIds: readonly string[];
}

export interface TemporalMetricInput<T> {
  value: T;
  participantIds: ReadonlySet<string>;
}

export interface ProtectedTemporalPair<T> {
  previous: ProtectedMetric<T>;
  current: ProtectedMetric<T>;
  delta: ProtectedMetric<never>;
}

const CONSTRAINT_KIND_ORDER: Record<SuppressionConstraintKind, number> = {
  row: 0,
  column: 1,
  total: 2,
  series: 3,
};

function suppressedMetric<T>(reason: SuppressionReason): ProtectedMetric<T> {
  return {
    status: 'suppressed',
    reason,
    message: SUPPRESSION_MESSAGE,
  };
}

export function protectMetric<T>(
  value: T,
  distinctParticipants?: number | null,
): ProtectedMetric<T> {
  if (
    typeof distinctParticipants !== 'number' ||
    !Number.isInteger(distinctParticipants) ||
    distinctParticipants < MINIMUM_PROTECTED_COHORT
  ) {
    return suppressedMetric('minimum_cohort');
  }

  return { status: 'visible', value };
}

export function notComputableMetric<T = never>(): ProtectedMetric<T> {
  return suppressedMetric('not_computable');
}

function cloneCell<T>(cell: AggregateCell<T>): AggregateCell<T> {
  if (cell.status === 'visible') {
    return { id: cell.id, status: 'visible', value: cell.value };
  }

  return {
    id: cell.id,
    status: 'suppressed',
    reason: cell.reason,
    message: SUPPRESSION_MESSAGE,
  };
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeConstraints(
  constraints: readonly SuppressionConstraint[],
  knownCellIds: ReadonlySet<string>,
) {
  return constraints
    .map((constraint) => {
      const uniqueCellIds = [...new Set(constraint.cellIds)].sort(compareText);

      if (uniqueCellIds.length !== constraint.cellIds.length) {
        throw new Error(`Duplicate cell in privacy constraint: ${constraint.id}`);
      }

      for (const cellId of uniqueCellIds) {
        if (!knownCellIds.has(cellId)) {
          throw new Error(
            `Unknown cell ${cellId} in privacy constraint: ${constraint.id}`,
          );
        }
      }

      return { ...constraint, cellIds: uniqueCellIds };
    })
    .sort(
      (left, right) =>
        CONSTRAINT_KIND_ORDER[left.kind] - CONSTRAINT_KIND_ORDER[right.kind] ||
        compareText(left.id, right.id),
    );
}

export function applyComplementarySuppression<T>(
  cells: readonly AggregateCell<T>[],
  constraints: readonly SuppressionConstraint[],
): AggregateCell<T>[] {
  const protectedById = new Map<string, AggregateCell<T>>();

  for (const cell of cells) {
    if (protectedById.has(cell.id)) {
      throw new Error(`Duplicate aggregate cell: ${cell.id}`);
    }
    protectedById.set(cell.id, cloneCell(cell));
  }

  const normalizedConstraints = normalizeConstraints(
    constraints,
    new Set(protectedById.keys()),
  );

  let changed = true;
  while (changed) {
    changed = false;

    for (const constraint of normalizedConstraints) {
      const unknownCellIds = constraint.cellIds.filter(
        (cellId) => protectedById.get(cellId)?.status === 'suppressed',
      );

      if (unknownCellIds.length !== 1) {
        continue;
      }

      const complementaryId = constraint.cellIds.find(
        (cellId) => protectedById.get(cellId)?.status === 'visible',
      );

      if (!complementaryId) {
        throw new Error(
          `Privacy constraint cannot retain two unknowns: ${constraint.id}`,
        );
      }

      protectedById.set(complementaryId, {
        id: complementaryId,
        ...suppressedMetric('complementary'),
      });
      changed = true;
    }
  }

  return [...protectedById.values()]
    .sort((left, right) => compareText(left.id, right.id))
    .map(cloneCell);
}

function isParticipantSet(value: unknown): value is ReadonlySet<string> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ReadonlySet<string>>;
  return (
    typeof candidate.size === 'number' &&
    Number.isInteger(candidate.size) &&
    candidate.size >= 0 &&
    typeof candidate.has === 'function' &&
    typeof candidate[Symbol.iterator] === 'function'
  );
}

function stableIntersectionSize(
  previousIds: ReadonlySet<string>,
  currentIds: ReadonlySet<string>,
) {
  const [smaller, larger] =
    previousIds.size <= currentIds.size
      ? [previousIds, currentIds]
      : [currentIds, previousIds];
  let intersectionSize = 0;

  for (const participantId of smaller) {
    if (larger.has(participantId)) {
      intersectionSize += 1;
    }
  }

  return intersectionSize;
}

export function protectTemporalPair<T>(
  previous: TemporalMetricInput<T>,
  current: TemporalMetricInput<T>,
): ProtectedTemporalPair<T> {
  const previousIds = previous?.participantIds;
  const currentIds = current?.participantIds;
  const validParticipantSets =
    isParticipantSet(previousIds) && isParticipantSet(currentIds);
  const stableCohortIsProtected =
    validParticipantSets &&
    previousIds.size >= MINIMUM_PROTECTED_COHORT &&
    currentIds.size >= MINIMUM_PROTECTED_COHORT &&
    stableIntersectionSize(previousIds, currentIds) >=
      MINIMUM_PROTECTED_COHORT;

  if (!stableCohortIsProtected) {
    return {
      previous: suppressedMetric('minimum_cohort'),
      current: suppressedMetric('minimum_cohort'),
      delta: notComputableMetric(),
    };
  }

  return {
    previous: { status: 'visible', value: previous.value },
    current: { status: 'visible', value: current.value },
    delta: notComputableMetric(),
  };
}

export function serializeProtectedMetricForCsv<T>(
  metric: ProtectedMetric<T>,
): string {
  return metric.status === 'visible' ? String(metric.value) : metric.message;
}
