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
