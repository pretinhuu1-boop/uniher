import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken, type TokenPayload } from '@/lib/auth/jwt';
import { isTokenBlacklisted } from '@/lib/auth/token-blacklist';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { createCompanyModulesStore, isCompanyModuleEnabled } from '@/lib/modules/company-modules';

export type Nr1RuntimeEntitlementStatus =
  | 'enabled'
  | 'missing_auth'
  | 'missing_company'
  | 'role_not_allowed'
  | 'not_enabled';

export async function isNr1RuntimeEntitledForCompany(companyId: string | null | undefined): Promise<boolean> {
  if (!companyId) return false;

  await initDb();
  const module = createCompanyModulesStore(getReadDb()).getCompanyModule(companyId, 'nr1');
  return module ? isCompanyModuleEnabled(module) : false;
}

export async function getNr1RuntimeEntitlementForCurrentRequest(): Promise<Nr1RuntimeEntitlementStatus> {
  const token = await getAccessToken();
  if (!token || isTokenBlacklisted(token)) return 'missing_auth';

  try {
    const payload = await verifyAccessToken(token);
    if (!payload.companyId) return 'missing_company';
    if (payload.role !== 'colaboradora' && payload.role !== 'lideranca') return 'role_not_allowed';
    return (await isNr1RuntimeEntitledForCompany(payload.companyId)) ? 'enabled' : 'not_enabled';
  } catch {
    return 'missing_auth';
  }
}

export async function requireNr1RuntimeEntitlement(
  auth: Pick<TokenPayload, 'companyId'>,
): Promise<NextResponse | null> {
  if (!auth.companyId) {
    return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 });
  }

  if (await isNr1RuntimeEntitledForCompany(auth.companyId)) {
    return null;
  }

  return NextResponse.json(
    { error: 'Modulo NR-1 nao habilitado para esta empresa' },
    { status: 403 },
  );
}

export async function hasActiveNr1PsychosocialConsent(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  await initDb();
  try {
    const row = getReadDb().prepare(
      `SELECT 1
       FROM user_consents
       WHERE user_id = ?
         AND consent_type = 'nr1_psychosocial'
         AND granted = 1
         AND revoked_at IS NULL
       LIMIT 1`,
    ).get(userId);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function requireNr1PsychosocialConsent(
  userId: string | null | undefined,
): Promise<NextResponse | null> {
  if (await hasActiveNr1PsychosocialConsent(userId)) {
    return null;
  }

  return NextResponse.json(
    { error: 'Consentimento NR-1 pendente ou revogado' },
    { status: 403 },
  );
}
