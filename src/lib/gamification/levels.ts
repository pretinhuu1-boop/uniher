/** Level calculation: level = floor(sqrt(points / 100)) + 1, min 1 */
export function calcLevel(points: number): number {
  return Math.max(1, Math.floor(Math.sqrt(points / 100)) + 1);
}

/** Points needed to reach the next level from current points */
export function pointsToNextLevel(points: number): number {
  const currentLevel = calcLevel(points);
  const nextLevelPoints = Math.pow(currentLevel, 2) * 100;
  return Math.max(0, nextLevelPoints - points);
}

/** Min points for a given level */
export function pointsForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}
