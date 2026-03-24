/**
 * GET /api/rh/onboarding-status — check RH onboarding completion status
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const GET = withRole('rh')(async (_req, context) => {
  await initDb();
  const db = getReadDb();
  const companyId = context.auth.companyId;
  const userId = context.auth.userId;

  if (!companyId) {
    return NextResponse.json({ isNewRH: true, steps: {} });
  }

  const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(userId) as any;

  // Step 1: Profile configured (has name)
  const profileDone = !!user?.name && user.name.trim().length > 0;

  // Step 2: Departments created
  const deptCount = (db.prepare('SELECT COUNT(*) as cnt FROM departments WHERE company_id = ?').get(companyId) as { cnt: number }).cnt;
  const departmentsDone = deptCount > 0;

  // Step 3: Invites sent
  const inviteCount = (db.prepare('SELECT COUNT(*) as cnt FROM invites WHERE company_id = ?').get(companyId) as { cnt: number }).cnt;
  const invitesDone = inviteCount > 0;

  // Step 4: Challenges created
  const challengeCount = (db.prepare(
    "SELECT COUNT(*) as cnt FROM challenges WHERE company_id = ?"
  ).get(companyId) as { cnt: number }).cnt;
  const challengesDone = challengeCount > 0;

  // Step 5: Company profile customized (has logo or colors)
  const company = db.prepare('SELECT logo_url, primary_color, trade_name FROM companies WHERE id = ?').get(companyId) as any;
  const companyProfileDone = !!(company?.logo_url || company?.primary_color || company?.trade_name);

  const steps = {
    profile: profileDone,
    departments: departmentsDone,
    invites: invitesDone,
    challenges: challengesDone,
    companyProfile: companyProfileDone,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;
  const isNewRH = completedCount < 3; // Consider "new" if fewer than 3 steps completed

  return NextResponse.json({
    isNewRH,
    completedCount,
    totalSteps: 5,
    steps,
  });
});
