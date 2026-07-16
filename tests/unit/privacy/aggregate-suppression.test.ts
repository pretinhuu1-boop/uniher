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

  it('suppresses every value and total in a triangularly reconstructable component', () => {
    const cells = [
      numericCell('x', 8, 8),
      numericCell('y', 13, 13),
      numericCell('z', 17, 17),
      numericCell('txy', 21, 21),
      numericCell('txz', 25, 25),
      numericCell('tyz', 30, 30),
    ];
    const constraints: SuppressionConstraint[] = [
      { id: 'xy', kind: 'row', cellIds: ['x', 'y', 'txy'] },
      { id: 'xz', kind: 'column', cellIds: ['x', 'z', 'txz'] },
      { id: 'yz', kind: 'total', cellIds: ['y', 'z', 'tyz'] },
    ];

    const result = applyComplementarySuppression(cells, constraints);
    const resultById = cellMap(result);

    expect(result.every((cell) => cell.status === 'suppressed')).toBe(true);
    expect(resultById.get('x')).toEqual({ id: 'x', ...suppressedMinimum });
    for (const cellId of ['y', 'z', 'txy', 'txz', 'tyz']) {
      expect(resultById.get(cellId)).toEqual({
        id: cellId,
        status: 'suppressed',
        reason: 'complementary',
        message: SUPPRESSION_MESSAGE,
      });
    }
    expect(JSON.stringify(result)).not.toContain('"value"');
  });

  it('keeps a disconnected component visible when it has no primary suppression', () => {
    const cells = [
      numericCell('protected-small', 8, 8),
      numericCell('protected-peer', 12, 12),
      numericCell('protected-total', 20, 20),
      numericCell('safe-a', 11, 11),
      numericCell('safe-b', 14, 14),
      numericCell('safe-total', 25, 25),
    ];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'protected-component',
        kind: 'row',
        cellIds: ['protected-small', 'protected-peer', 'protected-total'],
      },
      {
        id: 'safe-component',
        kind: 'row',
        cellIds: ['safe-a', 'safe-b', 'safe-total'],
      },
    ];

    const result = applyComplementarySuppression(cells, constraints);
    const resultById = cellMap(result);

    expect(resultById.get('protected-peer')?.status).toBe('suppressed');
    expect(resultById.get('protected-total')?.status).toBe('suppressed');
    expect(resultById.get('safe-a')).toEqual({ id: 'safe-a', status: 'visible', value: 11 });
    expect(resultById.get('safe-b')).toEqual({ id: 'safe-b', status: 'visible', value: 14 });
    expect(resultById.get('safe-total')).toEqual({
      id: 'safe-total',
      status: 'visible',
      value: 25,
    });
    for (const resultCell of result) {
      expect(resultCell).not.toBe(cells.find((cell) => cell.id === resultCell.id));
    }
  });

  it('propagates a preexisting complementary suppression across overlapping constraints', () => {
    const cells: AggregateCell<number>[] = [
      {
        id: 'already-protected',
        status: 'suppressed',
        reason: 'complementary',
        message: SUPPRESSION_MESSAGE,
      },
      numericCell('visible-peer', 12, 12),
      numericCell('visible-total', 20, 20),
      numericCell('overlap-peer', 14, 14),
      numericCell('overlap-total', 34, 34),
    ];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'preexisting-complementary-row',
        kind: 'row',
        cellIds: ['already-protected', 'visible-peer', 'visible-total'],
      },
      {
        id: 'overlapping-complementary-column',
        kind: 'column',
        cellIds: ['visible-total', 'overlap-peer', 'overlap-total'],
      },
    ];

    const result = applyComplementarySuppression(cells, constraints);
    const permuted = applyComplementarySuppression(
      [...cells].reverse(),
      [...constraints]
        .reverse()
        .map((constraint) => ({ ...constraint, cellIds: [...constraint.cellIds].reverse() })),
    );
    const resultById = cellMap(result);

    expect(permuted).toEqual(result);
    expect(result.every((cell) => cell.status === 'suppressed')).toBe(true);
    expect(resultById.get('already-protected')).toEqual({
      id: 'already-protected',
      status: 'suppressed',
      reason: 'complementary',
      message: SUPPRESSION_MESSAGE,
    });
    for (const cellId of [
      'visible-peer',
      'visible-total',
      'overlap-peer',
      'overlap-total',
    ]) {
      expect(resultById.get(cellId)).toEqual({
        id: cellId,
        status: 'suppressed',
        reason: 'complementary',
        message: SUPPRESSION_MESSAGE,
      });
    }
    expect(JSON.stringify(result)).not.toContain('"value"');
    expectConstraintPrivacy(result, constraints);
  });

  it('suppresses the full row when it contains multiple primary-small cells', () => {
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

    expect(result.filter((cell) => cell.status === 'suppressed')).toHaveLength(3);
    expect(cellMap(result).get('row-total')).toEqual({
      id: 'row-total',
      status: 'suppressed',
      reason: 'complementary',
      message: SUPPRESSION_MESSAGE,
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

  it('rejects duplicate constraint IDs even when their kinds differ', () => {
    const cells = [
      numericCell('a', 10, 10),
      numericCell('b', 11, 11),
      numericCell('total', 21, 21),
    ];
    const constraints: SuppressionConstraint[] = [
      { id: 'duplicate', kind: 'row', cellIds: ['a', 'b', 'total'] },
      { id: 'duplicate', kind: 'column', cellIds: ['a', 'b', 'total'] },
    ];

    expect(() => applyComplementarySuppression(cells, constraints)).toThrow(
      'Duplicate privacy constraint: duplicate',
    );
  });

  it('rejects a singleton constraint that cannot retain two unknowns', () => {
    const cells = [numericCell('only-cell', 8, 8)];
    const constraints: SuppressionConstraint[] = [
      {
        id: 'impossible-singleton',
        kind: 'row',
        cellIds: ['only-cell'],
      },
    ];

    expect(() => applyComplementarySuppression(cells, constraints)).toThrow(
      'Privacy constraint requires at least two unique cells: impossible-singleton',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', ' \t '],
  ] as const)(
    'rejects a protected aggregate cell with a %s ID before graph construction',
    (_label, invalidCellId) => {
      const cells: AggregateCell<number>[] = [
        {
          id: invalidCellId,
          status: 'suppressed',
          reason: 'minimum_cohort',
          message: SUPPRESSION_MESSAGE,
        },
        numericCell('visible-peer', 12, 12),
        numericCell('visible-total', 20, 20),
      ];
      const constraints: SuppressionConstraint[] = [
        {
          id: 'invalid-cell-component',
          kind: 'row',
          cellIds: [invalidCellId, 'visible-peer', 'visible-total'],
        },
      ];

      expect(() => applyComplementarySuppression(cells, constraints)).toThrow(
        'Invalid aggregate cell id',
      );
    },
  );

  it.each([
    ['empty', ''],
    ['whitespace-only', ' \t '],
  ] as const)(
    'rejects a %s privacy constraint ID before sorting',
    (_label, invalidConstraintId) => {
      const cells = [
        numericCell('small', 8, 8),
        numericCell('peer', 12, 12),
        numericCell('total', 20, 20),
      ];
      const constraints: SuppressionConstraint[] = [
        {
          id: invalidConstraintId,
          kind: 'row',
          cellIds: ['small', 'peer', 'total'],
        },
      ];

      expect(() => applyComplementarySuppression(cells, constraints)).toThrow(
        'Invalid privacy constraint id',
      );
    },
  );

  it('returns the same protected component for every valid input permutation', () => {
    const cells = [
      numericCell('x', 8, 8),
      numericCell('y', 13, 13),
      numericCell('z', 17, 17),
      numericCell('txy', 21, 21),
      numericCell('txz', 25, 25),
      numericCell('tyz', 30, 30),
    ];
    const constraints: SuppressionConstraint[] = [
      { id: 'xy', kind: 'row', cellIds: ['x', 'y', 'txy'] },
      { id: 'xz', kind: 'column', cellIds: ['x', 'z', 'txz'] },
      { id: 'yz', kind: 'total', cellIds: ['y', 'z', 'tyz'] },
    ];

    const canonical = applyComplementarySuppression(cells, constraints);
    const permuted = applyComplementarySuppression(
      [...cells].reverse(),
      [...constraints]
        .reverse()
        .map((constraint) => ({ ...constraint, cellIds: [...constraint.cellIds].reverse() })),
    );

    expect(permuted).toEqual(canonical);
  });

  it('materializes participant IDs instead of trusting repeated set-like entries', () => {
    const repeatedIds = {
      size: 10,
      has: (participantId: string) => participantId === 'same-person',
      *[Symbol.iterator]() {
        for (let index = 0; index < 10; index += 1) {
          yield 'same-person';
        }
      },
    } as unknown as ReadonlySet<string>;

    const result = protectTemporalPair(
      { value: 86421, participantIds: repeatedIds },
      { value: 73125, participantIds: repeatedIds },
    );

    expect(result.previous).toEqual(suppressedMinimum);
    expect(result.current).toEqual(suppressedMinimum);
    expect(JSON.stringify(result)).not.toMatch(/86421|73125|same-person/);
  });

  it('stops materializing immediately after a set-like iterable exceeds its declared size', () => {
    let iteratorPulls = 0;
    const excessiveIds = {
      size: 10,
      has: () => true,
      *[Symbol.iterator]() {
        for (let index = 0; index < 1_000; index += 1) {
          iteratorPulls += 1;
          yield `p${index}`;
        }
      },
    } as unknown as ReadonlySet<string>;

    const result = protectTemporalPair(
      { value: 86421, participantIds: excessiveIds },
      {
        value: 73125,
        participantIds: participants(
          'p1',
          'p2',
          'p3',
          'p4',
          'p5',
          'p6',
          'p7',
          'p8',
          'p9',
          'p10',
        ),
      },
    );

    expect(result.previous).toEqual(suppressedMinimum);
    expect(result.current).toEqual(suppressedMinimum);
    expect(iteratorPulls).toBe(11);
  });

  it.each([
    ['an unsafe integer size', Number.MAX_SAFE_INTEGER + 1],
    ['a size above the operational limit', 100_001],
  ] as const)('rejects %s before pulling its iterator', (_label, declaredSize) => {
    let iteratorPulls = 0;
    const oversizedIds = {
      size: declaredSize,
      has: () => true,
      *[Symbol.iterator]() {
        iteratorPulls += 1;
        yield 'p1';
      },
    } as unknown as ReadonlySet<string>;

    const result = protectTemporalPair(
      { value: 86421, participantIds: oversizedIds },
      {
        value: 73125,
        participantIds: participants(
          'p1',
          'p2',
          'p3',
          'p4',
          'p5',
          'p6',
          'p7',
          'p8',
          'p9',
          'p10',
        ),
      },
    );

    expect(result.previous).toEqual(suppressedMinimum);
    expect(result.current).toEqual(suppressedMinimum);
    expect(iteratorPulls).toBe(0);
  });

  it('suppresses malformed participant elements without throwing', () => {
    const invalidIds = {
      size: 10,
      has: () => true,
      *[Symbol.iterator]() {
        for (let index = 0; index < 9; index += 1) {
          yield `p${index}`;
        }
        yield 123;
      },
    } as unknown as ReadonlySet<string>;

    expect(() =>
      protectTemporalPair(
        { value: 86421, participantIds: invalidIds },
        { value: 73125, participantIds: invalidIds },
      ),
    ).not.toThrow();
    expect(
      protectTemporalPair(
        { value: 86421, participantIds: invalidIds },
        { value: 73125, participantIds: invalidIds },
      ).previous,
    ).toEqual(suppressedMinimum);
  });

  it('suppresses participant iterables that throw during materialization', () => {
    const throwingIds = {
      size: 10,
      has: () => true,
      *[Symbol.iterator](): Generator<string> {
        yield 'p1';
        throw new Error('malformed participant iterator');
      },
    } as unknown as ReadonlySet<string>;

    expect(() =>
      protectTemporalPair(
        { value: 86421, participantIds: throwingIds },
        { value: 73125, participantIds: throwingIds },
      ),
    ).not.toThrow();
    expect(
      protectTemporalPair(
        { value: 86421, participantIds: throwingIds },
        { value: 73125, participantIds: throwingIds },
      ).current,
    ).toEqual(suppressedMinimum);
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

  it('escapes visible CSV text and neutralizes formula-leading strings', () => {
    expect(serializeProtectedMetricForCsv(protectMetric('alpha,beta', 10))).toBe(
      '"alpha,beta"',
    );
    expect(serializeProtectedMetricForCsv(protectMetric('alpha"beta', 10))).toBe(
      '"alpha""beta"',
    );
    expect(serializeProtectedMetricForCsv(protectMetric('line 1\nline 2', 10))).toBe(
      '"line 1\nline 2"',
    );
    expect(serializeProtectedMetricForCsv(protectMetric('line 1\rline 2', 10))).toBe(
      '"line 1\rline 2"',
    );
    expect(serializeProtectedMetricForCsv(protectMetric('=2+2', 10))).toBe("'=2+2");
    expect(serializeProtectedMetricForCsv(protectMetric('+SUM', 10))).toBe("'+SUM");
    expect(serializeProtectedMetricForCsv(protectMetric('-1+2', 10))).toBe("'-1+2");
    expect(serializeProtectedMetricForCsv(protectMetric('@SUM', 10))).toBe("'@SUM");
    expect(serializeProtectedMetricForCsv(protectMetric('=SUM(1,2)', 10))).toBe(
      '"\'=SUM(1,2)"',
    );
    expect(serializeProtectedMetricForCsv(protectMetric(42, 10))).toBe('42');
    expect(serializeProtectedMetricForCsv(protectMetric(-5, 10))).toBe('-5');
  });

  it.each([
    ['a boxed string', new String('=2+2'), "'=2+2"],
    ['an object with custom text', { toString: (): string => '+SUM' }, "'+SUM"],
  ] as const)('neutralizes formula-leading CSV text from %s', (_label, input, expected) => {
    expect(serializeProtectedMetricForCsv(protectMetric(input, 10))).toBe(expected);
  });

  it('fails closed when a visible CSV value cannot be converted to text', () => {
    const unstringifiableValue = {
      toString(): never {
        throw new Error('cannot stringify private value');
      },
    };

    expect(
      serializeProtectedMetricForCsv(protectMetric(unstringifiableValue, 10)),
    ).toBe(SUPPRESSION_MESSAGE);
  });

  it.each([
    ['TAB', '\t=2+2', "'\t=2+2"],
    ['CR', '\r=2+2', '"\'\r=2+2"'],
    ['LF', '\n=2+2', '"\'\n=2+2"'],
    ['fullwidth equals', '＝2+2', "'＝2+2"],
    ['fullwidth plus', '＋SUM', "'＋SUM"],
    ['fullwidth minus', '－1+2', "'－1+2"],
    ['fullwidth at', '＠SUM', "'＠SUM"],
  ] as const)(
    'neutralizes visible CSV text beginning with %s before escaping',
    (_label, input, expected) => {
      expect(serializeProtectedMetricForCsv(protectMetric(input, 10))).toBe(expected);
    },
  );
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
