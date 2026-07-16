import { describe, expect, it } from 'vitest';
import {
  PRIVACY_REVIEW_BODY,
  privacyReviewResponse,
} from '@/lib/privacy/api-response';
import {
  applyComplementarySuppression,
  protectMetric,
  protectTemporalPair,
  serializeProtectedMetricForCsv,
} from '@/lib/privacy/aggregate-suppression';
import type {
  AggregateCell,
  SuppressionConstraint,
} from '@/lib/privacy/aggregate-suppression';
import { SUPPRESSION_MESSAGE } from '@/types/privacy';

const suppressedMinimum = {
  status: 'suppressed',
  reason: 'minimum_cohort',
  message: 'Dados insuficientes para proteger a privacidade',
} as const;

function numericCell(
  id: string,
  value: number,
  distinctParticipants: number,
): AggregateCell<number> {
  return { id, ...protectMetric(value, distinctParticipants) };
}

function participants(...ids: string[]) {
  return new Set(ids);
}

function cellMap(cells: readonly AggregateCell<number>[]) {
  return new Map(cells.map((cell) => [cell.id, cell]));
}

function expectConstraintPrivacy(
  cells: readonly AggregateCell<number>[],
  constraints: readonly SuppressionConstraint[],
) {
  const protectedById = cellMap(cells);

  for (const constraint of constraints) {
    const unknowns = constraint.cellIds.filter(
      (cellId) => protectedById.get(cellId)?.status === 'suppressed',
    );
    expect(
      unknowns.length === 0 || unknowns.length >= 2,
      `${constraint.kind}:${constraint.id} deixou uma única incógnita`,
    ).toBe(true);
  }
}

describe('aggregate privacy kernel', () => {
  it('suppresses cohorts below 10 without retaining the hidden value', () => {
    expect(protectMetric(42, 9)).toEqual({
      status: 'suppressed',
      reason: 'minimum_cohort',
      message: 'Dados insuficientes para proteger a privacidade',
    });
    expect(protectMetric(42, 10)).toEqual({ status: 'visible', value: 42 });
    expect(JSON.stringify(protectMetric(86421, 9))).not.toContain('86421');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['fractional', 9.5],
    ['negative', -1],
    ['not-a-number', Number.NaN],
  ] as const)('fails closed for a %s participant count', (_label, count) => {
    expect(protectMetric(42, count)).toEqual(suppressedMinimum);
  });

  it('propagates complementary suppression across a 2x2 row and column graph until stable', () => {
    const cells = [
      numericCell('A', 86421, 9),
      numericCell('B', 20, 10),
      numericCell('C', 30, 10),
      numericCell('D', 40, 10),
      numericCell('row-1-total', 86441, 19),
      numericCell('row-2-total', 70, 20),
      numericCell('column-1-total', 86451, 19),
      numericCell('column-2-total', 60, 20),
    ];
    const constraints: SuppressionConstraint[] = [
      { id: 'row-1', kind: 'row', cellIds: ['A', 'B', 'row-1-total'] },
      { id: 'row-2', kind: 'row', cellIds: ['C', 'D', 'row-2-total'] },
      {
        id: 'column-1',
        kind: 'column',
        cellIds: ['A', 'C', 'column-1-total'],
      },
      {
        id: 'column-2',
        kind: 'column',
        cellIds: ['B', 'D', 'column-2-total'],
      },
    ];

    const result = applyComplementarySuppression(cells, constraints);
    const resultById = cellMap(result);

    expect(resultById.get('A')).toEqual({ id: 'A', ...suppressedMinimum });
    expect(resultById.get('B')).toEqual({
      id: 'B',
      status: 'suppressed',
      reason: 'complementary',
      message: SUPPRESSION_MESSAGE,
    });
    expect(resultById.get('D')?.status).toBe('suppressed');
    expect(resultById.get('B')).not.toHaveProperty('value');
    expect(JSON.stringify(resultById.get('B'))).not.toContain('20');
    expectConstraintPrivacy(result, constraints);

    expect(cells[1]).toEqual({ id: 'B', status: 'visible', value: 20 });
    for (const resultCell of result) {
      expect(resultCell).not.toBe(cells.find((cell) => cell.id === resultCell.id));
    }
  });

  it('does not add suppression when a row already has multiple primary-small cells', () => {
    const cells = [
      numericCell('small-a', 8, 8),
      numericCell('small-b', 9, 9),
      numericCell('row-total', 17, 17),
    ];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'small-row',
        kind: 'row',
        cellIds: ['small-a', 'small-b', 'row-total'],
      },
    ];

    const result = applyComplementarySuppression(cells, constraints);

    expect(result.filter((cell) => cell.status === 'suppressed')).toHaveLength(2);
    expect(cellMap(result).get('row-total')).toEqual({
      id: 'row-total',
      status: 'visible',
      value: 17,
    });
    expectConstraintPrivacy(result, constraints);
  });

  it('supports explicit total and time-series constraints', () => {
    const cells = [
      numericCell('department-small', 7, 7),
      numericCell('department-large', 12, 12),
      numericCell('company-total', 19, 19),
      numericCell('january', 10, 10),
      numericCell('february', 9, 9),
      numericCell('period-total', 19, 19),
    ];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'company-total-equation',
        kind: 'total',
        cellIds: ['department-small', 'department-large', 'company-total'],
      },
      {
        id: 'period-total-equation',
        kind: 'series',
        cellIds: ['january', 'february', 'period-total'],
      },
    ];

    const result = applyComplementarySuppression(cells, constraints);

    expectConstraintPrivacy(result, constraints);
    expect(
      result.filter((cell) => cell.status === 'suppressed').map((cell) => cell.id),
    ).toEqual(expect.arrayContaining(['department-small', 'february']));
  });

  it('protects both overlapping department equations and is independent of query order', () => {
    const cells = [
      numericCell('shared-small', 8, 8),
      numericCell('alpha-only', 12, 12),
      numericCell('alpha-total', 20, 20),
      numericCell('beta-only', 14, 14),
      numericCell('beta-total', 22, 22),
    ];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'alpha-department',
        kind: 'total',
        cellIds: ['shared-small', 'alpha-only', 'alpha-total'],
      },
      {
        id: 'beta-department',
        kind: 'total',
        cellIds: ['shared-small', 'beta-only', 'beta-total'],
      },
    ];

    const forward = applyComplementarySuppression(cells, constraints);
    const reversed = applyComplementarySuppression(
      [...cells].reverse(),
      [...constraints]
        .reverse()
        .map((constraint) => ({ ...constraint, cellIds: [...constraint.cellIds].reverse() })),
    );

    expect(forward).toEqual(reversed);
    expect(cellMap(forward).get('alpha-only')?.status).toBe('suppressed');
    expect(cellMap(forward).get('beta-only')?.status).toBe('suppressed');
    expectConstraintPrivacy(forward, constraints);
  });

  it('suppresses a second filtered view that drops from 10 participants to 9', () => {
    const baselineIds = participants('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10');
    const filteredIds = participants('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9');

    const result = protectTemporalPair(
      { value: 86421, participantIds: baselineIds },
      { value: 73125, participantIds: filteredIds },
    );

    expect(result.previous).toEqual(suppressedMinimum);
    expect(result.current).toEqual(suppressedMinimum);
    expect(result.delta).toEqual({
      status: 'suppressed',
      reason: 'not_computable',
      message: SUPPRESSION_MESSAGE,
    });
    expect(JSON.stringify(result)).not.toMatch(/86421|73125|p10/);
  });

  it('suppresses January with 10 participants versus February with 9', () => {
    const januaryIds = participants('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
    const februaryIds = participants('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i');

    const result = protectTemporalPair(
      { value: 10, participantIds: januaryIds },
      { value: 9, participantIds: februaryIds },
    );

    expect(result.previous.status).toBe('suppressed');
    expect(result.current.status).toBe('suppressed');
    expect(result.delta.status).toBe('suppressed');
    expect(JSON.stringify(result)).not.toMatch(/"value":10|"value":9/);
  });

  it('suppresses two valid 10-person months when their stable intersection is only 9', () => {
    const januaryIds = participants('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10');
    const februaryIds = participants('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p11');

    const result = protectTemporalPair(
      { value: 100, participantIds: januaryIds },
      { value: 120, participantIds: februaryIds },
    );

    expect(result.previous).toEqual(suppressedMinimum);
    expect(result.current).toEqual(suppressedMinimum);
    expect(result.delta).toEqual({
      status: 'suppressed',
      reason: 'not_computable',
      message: SUPPRESSION_MESSAGE,
    });
    expect(JSON.stringify(result)).not.toMatch(/"value":100|"value":120|p11/);
  });

  it('shows a stable 10-person temporal pair but never computes a Wave 1.1 delta', () => {
    const stableIds = participants('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10');

    expect(
      protectTemporalPair(
        { value: 42, participantIds: stableIds },
        { value: 47, participantIds: new Set(stableIds) },
      ),
    ).toEqual({
      previous: { status: 'visible', value: 42 },
      current: { status: 'visible', value: 47 },
      delta: {
        status: 'suppressed',
        reason: 'not_computable',
        message: SUPPRESSION_MESSAGE,
      },
    });
  });

  it('serializes a suppressed CSV cell as only the stable privacy message', () => {
    const csv = serializeProtectedMetricForCsv(protectMetric(86421, 9));

    expect(csv).toBe('Dados insuficientes para proteger a privacidade');
    expect(csv).not.toContain('86421');
  });
});

describe('privacy review response', () => {
  it('returns the stable unavailable body with private no-store headers', async () => {
    expect(PRIVACY_REVIEW_BODY).toEqual({
      status: 'unavailable',
      reason: 'privacy_review',
      message: 'Recurso temporariamente indisponível durante a revisão de privacidade.',
    });

    const response = privacyReviewResponse();

    expect(response.status).toBe(410);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
    expect(await response.json()).toEqual(PRIVACY_REVIEW_BODY);
  });

  it('allows a route to choose another unavailable status', () => {
    expect(privacyReviewResponse(423).status).toBe(423);
  });
});
