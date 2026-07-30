const FORBIDDEN_LEGACY_CONTENT_KEYS = new Set([
  'badge',
  'badges',
  'currentleague',
  'dailyxpbonus',
  'dailyxpearned',
  'dailyxpgoal',
  'league',
  'level',
  'pointsearned',
  'pointsspent',
  'rank',
  'ranking',
  'reward',
  'rewards',
  'streak',
  'weekpoints',
  'xp',
  'xpearned',
  'xpreward',
]);

const FORBIDDEN_LEGACY_CONTENT_TEXT =
  /ranking|leaderboard|liga semanal|loja de recompensas|recompensas dispon[ií]veis|comprar recompensa|resgatar|ganh[ae] pontos|ganhar pontos|pontos totais|xp ganho|\bXP\b|subir de n[ií]vel|classifica[cç][aã]o geral/i;

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function hasForbiddenLegacyLessonContent(value: unknown, depth = 0): boolean {
  if (depth > 50) return true;
  if (typeof value === 'string') {
    return FORBIDDEN_LEGACY_CONTENT_TEXT.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenLegacyLessonContent(item, depth + 1));
  }
  if (!value || typeof value !== 'object') return false;

  return Object.entries(value).some(([key, child]) => {
    const normalizedKey = normalizeKey(key);
    return FORBIDDEN_LEGACY_CONTENT_KEYS.has(normalizedKey)
      || normalizedKey.startsWith('dailyxp')
      || hasForbiddenLegacyLessonContent(child, depth + 1);
  });
}
