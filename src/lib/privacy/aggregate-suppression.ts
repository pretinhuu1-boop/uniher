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

// Operational cap for materializing untrusted temporal participant iterables.
const MAX_TEMPORAL_PARTICIPANT_IDS = 100_000;

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

function isValidIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeConstraints(
  constraints: readonly SuppressionConstraint[],
  knownCellIds: ReadonlySet<string>,
) {
  const constraintIds = new Set<string>();
  for (const constraint of constraints) {
    if (!isValidIdentifier(constraint.id)) {
      throw new Error(`Invalid privacy constraint id: ${JSON.stringify(constraint.id)}`);
    }
    if (constraintIds.has(constraint.id)) {
      throw new Error(`Duplicate privacy constraint: ${constraint.id}`);
    }
    constraintIds.add(constraint.id);
  }

  return constraints
    .map((constraint) => {
      const uniqueCellIds = [...new Set(constraint.cellIds)].sort(compareText);

      if (uniqueCellIds.length !== constraint.cellIds.length) {
        throw new Error(`Duplicate cell in privacy constraint: ${constraint.id}`);
      }

      if (uniqueCellIds.length < 2) {
        throw new Error(
          `Privacy constraint requires at least two unique cells: ${constraint.id}`,
        );
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
    if (!isValidIdentifier(cell.id)) {
      throw new Error(`Invalid aggregate cell id: ${JSON.stringify(cell.id)}`);
    }
    if (protectedById.has(cell.id)) {
      throw new Error(`Duplicate aggregate cell: ${cell.id}`);
    }
    protectedById.set(cell.id, cloneCell(cell));
  }

  const normalizedConstraints = normalizeConstraints(
    constraints,
    new Set(protectedById.keys()),
  );
  const connectedCellIds = new Map<string, Set<string>>(
    [...protectedById.keys()].map((cellId) => [cellId, new Set<string>()]),
  );

  for (const constraint of normalizedConstraints) {
    const [anchorId, ...relatedIds] = constraint.cellIds;
    if (anchorId === undefined) {
      throw new Error(`Privacy constraint has no anchor: ${constraint.id}`);
    }

    for (const relatedId of relatedIds) {
      connectedCellIds.get(anchorId)?.add(relatedId);
      connectedCellIds.get(relatedId)?.add(anchorId);
    }
  }

  const protectedComponentIds = new Set<string>();
  const pendingCellIds = [...protectedById.values()]
    .filter(
      (cell) =>
        cell.status === 'suppressed' &&
        (cell.reason === 'minimum_cohort' || cell.reason === 'complementary'),
    )
    .map((cell) => cell.id)
    .sort(compareText);

  for (let index = 0; index < pendingCellIds.length; index += 1) {
    const cellId = pendingCellIds[index];
    if (protectedComponentIds.has(cellId)) {
      continue;
    }

    protectedComponentIds.add(cellId);
    const neighbors = [...(connectedCellIds.get(cellId) ?? [])].sort(compareText);
    for (const neighborId of neighbors) {
      if (!protectedComponentIds.has(neighborId)) {
        pendingCellIds.push(neighborId);
      }
    }
  }

  return [...protectedById.values()]
    .map((cell) => {
      if (
        protectedComponentIds.has(cell.id) &&
        cell.status === 'visible'
      ) {
        return {
          id: cell.id,
          ...suppressedMetric<T>('complementary'),
        };
      }

      return cloneCell(cell);
    })
    .sort((left, right) => compareText(left.id, right.id));
}

function materializeParticipantIds(value: unknown): Set<string> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  try {
    const candidate = value as Partial<ReadonlySet<unknown>>;
    const declaredSize = candidate.size;
    if (
      typeof declaredSize !== 'number' ||
      !Number.isSafeInteger(declaredSize) ||
      declaredSize < 0 ||
      declaredSize > MAX_TEMPORAL_PARTICIPANT_IDS
    ) {
      return null;
    }
    if (
      typeof candidate.has !== 'function' ||
      typeof candidate[Symbol.iterator] !== 'function'
    ) {
      return null;
    }

    const participantIds = new Set<string>();
    let iteratedEntries = 0;
    for (const participantId of value as Iterable<unknown>) {
      iteratedEntries += 1;
      if (iteratedEntries > declaredSize) {
        return null;
      }
      if (
        typeof participantId !== 'string' ||
        participantId.trim().length === 0
      ) {
        return null;
      }
      participantIds.add(participantId);
    }

    if (
      iteratedEntries !== declaredSize ||
      participantIds.size !== declaredSize
    ) {
      return null;
    }

    return participantIds;
  } catch {
    return null;
  }
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
  const previousIds = materializeParticipantIds(previous?.participantIds);
  const currentIds = materializeParticipantIds(current?.participantIds);
  const stableCohortIsProtected =
    previousIds !== null &&
    currentIds !== null &&
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
  if (metric.status === 'suppressed') {
    return metric.message;
  }

  let text: string;
  try {
    text = String(metric.value);
  } catch {
    return SUPPRESSION_MESSAGE;
  }
  const neutralized =
    typeof metric.value !== 'number' && /^[\t\r\n=+\-@＝＋－＠]/.test(text)
      ? `'${text}`
      : text;
  const escaped = neutralized.replace(/"/g, '""');

  return /[",\r\n]/.test(neutralized) ? `"${escaped}"` : escaped;
}
