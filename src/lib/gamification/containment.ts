const legacyGamificationState = {
  status: 'under_review',
  reason: 'eligible_ledger_required',
  message: 'Pontuação e classificação estão em revisão.',
} as const;

export const LEGACY_GAMIFICATION_STATE = Object.freeze(legacyGamificationState);

const mutableSafeMissionActions = new Set(['read_content'] as const);

/** Keep the Set API but deny mutation, including Set.prototype calls on the Proxy. */
export const SAFE_MISSION_ACTIONS = Object.freeze(new Proxy(mutableSafeMissionActions, {
  get(target, property, receiver) {
    if (property === 'add' || property === 'delete' || property === 'clear') {
      return () => { throw new TypeError('SAFE_MISSION_ACTIONS is runtime immutable'); };
    }
    if (property === 'forEach') {
      return (
        callback: (value: 'read_content', key: 'read_content', set: ReadonlySet<'read_content'>) => void,
        thisArg?: unknown,
      ) => target.forEach((value, key) => callback.call(
        thisArg,
        value,
        key,
        receiver as ReadonlySet<'read_content'>,
      ));
    }
    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
})) as ReadonlySet<'read_content'>;

export const LEGACY_GAMIFICATION_NOTIFICATION_TYPES = Object.freeze([
  'badge',
  'level',
  'streak',
  'gamification',
  'reward',
] as const);

export const SAFE_GAMIFICATION_CONFIG_FIELDS = Object.freeze([
  'active_themes',
  'theme_order',
  'hearts_enabled',
  'hearts_per_day',
  'hearts_refill_hours',
] as const);

function normalizeProjectionKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

const FORBIDDEN_PROJECTION_KEYS = new Set([
  'password_hash',
  'points',
  'level',
  'league',
  'streak',
  'week_points',
  'points_spent',
  'xp',
  'xp_reward',
  'xp_earned',
  'user_xp_earned',
  'badges',
  'user_badges',
  'daily_xp_goal',
  'daily_xp_earned',
  'daily_xp_date',
  'pointsnextlevel',
  'achievementcount',
  'levelinfo',
  'pointsearned',
  'newpoints',
  'newlevel',
  'leveledup',
  'badgesunlocked',
  'currentleague',
  'weekpoints',
  'totalinleague',
].map(normalizeProjectionKey));

const FORBIDDEN_LESSON_PROJECTION_KEYS = new Set([
  ...FORBIDDEN_PROJECTION_KEYS,
  'point',
  'points',
  'points_spent',
  'week_points',
  'level',
  'xp',
  'xp_reward',
  'xp_earned',
  'user_xp_earned',
  'current_xp',
  'next_level_xp',
  'league',
  'rank',
  'ranking',
  'badge',
  'badges',
  'streak',
  'current_streak',
  'longest_streak',
  'streak_count',
  'streak_days',
  'reward',
  'rewards',
  'point_cost',
  'points_cost',
  'reward_point',
  'reward_points',
  'health_score',
  'health_scores',
  'dimension',
].map(normalizeProjectionKey));

const FORBIDDEN_LESSON_PROJECTION_PREFIXES = Object.freeze([
  'dailyxp',
] as const);
const MAX_LESSON_PROJECTION_DEPTH = 32;
const OMIT_LESSON_PROJECTION_VALUE = Symbol('omit-lesson-projection-value');

function isForbiddenLessonProjectionKey(key: string): boolean {
  const normalizedKey = normalizeProjectionKey(key);
  return FORBIDDEN_LESSON_PROJECTION_KEYS.has(normalizedKey) ||
    FORBIDDEN_LESSON_PROJECTION_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix));
}

function projectLessonValue(
  value: unknown,
  depth: number,
  ancestors: WeakSet<object>,
): unknown | typeof OMIT_LESSON_PROJECTION_VALUE {
  if (depth > MAX_LESSON_PROJECTION_DEPTH) return OMIT_LESSON_PROJECTION_VALUE;
  if (!value || typeof value !== 'object') return value;
  if (ancestors.has(value)) return OMIT_LESSON_PROJECTION_VALUE;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const projected: unknown[] = [];
      for (const child of value) {
        const safeChild = projectLessonValue(child, depth + 1, ancestors);
        if (safeChild !== OMIT_LESSON_PROJECTION_VALUE) projected.push(safeChild);
      }
      return projected;
    }

    const projected: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (isForbiddenLessonProjectionKey(key)) continue;
      const safeChild = projectLessonValue(child, depth + 1, ancestors);
      if (safeChild !== OMIT_LESSON_PROJECTION_VALUE) {
        Object.defineProperty(projected, key, {
          configurable: true,
          enumerable: true,
          value: safeChild,
          writable: true,
        });
      }
    }
    return projected;
  } finally {
    ancestors.delete(value);
  }
}

/** Immutable, fail-closed copy for educational lesson API projections. */
export function toSafeLessonProjection<T>(value: T): T {
  return projectLessonValue(value, 0, new WeakSet()) as T;
}

/** Fail-closed projection for authenticated/session responses. */
export function toSafeUserProjection<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSafeUserProjection(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;

  const projected: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PROJECTION_KEYS.has(normalizeProjectionKey(key))) continue;
    projected[key] = toSafeUserProjection(child);
  }
  return projected as T;
}

export function isLegacyGamificationNotification(type: string): boolean {
  return (LEGACY_GAMIFICATION_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export function pointFreeProgressResponse() {
  return {
    success: true,
    progressRecorded: true,
    gamification: LEGACY_GAMIFICATION_STATE,
  } as const;
}

export function legacyGamificationUnavailable(): never {
  throw new Error('Legacy gamification is unavailable');
}
