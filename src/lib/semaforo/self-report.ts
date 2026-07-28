import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export const PERSONAL_SEMAFORO_CONSENT_VERSION = 'personal-semaforo-v1';
export const PERSONAL_SEMAFORO_RETENTION_DAYS = 180;

export const PERSONAL_SEMAFORO_DIMENSIONS = {
  prevention: {
    label: 'Prevenção',
    icon: 'ShieldCheck',
    prompt: 'Exames, sinais do corpo e cuidado preventivo.',
    greenGuide: 'Manter acompanhamento.',
    yellowGuide: 'Separar um momento para revisar pendências.',
    redGuide: 'Buscar apoio de confiança ou canal adequado.',
  },
  sleep: {
    label: 'Sono',
    icon: 'Moon',
    prompt: 'Descanso, qualidade do sono e recuperação.',
    greenGuide: 'Preservar sua rotina de descanso.',
    yellowGuide: 'Observar padrões antes de dormir.',
    redGuide: 'Reduzir carga e priorizar recuperação.',
  },
  energy: {
    label: 'Energia',
    icon: 'Battery',
    prompt: 'Disposição física e mental para o dia.',
    greenGuide: 'Seguir com pausas leves.',
    yellowGuide: 'Fazer uma pausa curta e beber água.',
    redGuide: 'Diminuir ritmo quando possível.',
  },
  mind: {
    label: 'Saúde mental',
    icon: 'HeartPulse',
    prompt: 'Emoções, foco e sensação de segurança.',
    greenGuide: 'Continuar seus rituais de cuidado.',
    yellowGuide: 'Registrar gatilhos e limites.',
    redGuide: 'Procurar suporte humano adequado.',
  },
  habits: {
    label: 'Hábitos',
    icon: 'Sprout',
    prompt: 'Rotina, alimentação, movimento e hidratação.',
    greenGuide: 'Repetir o que funcionou hoje.',
    yellowGuide: 'Escolher uma ação pequena para retomar.',
    redGuide: 'Simplificar o dia para um cuidado essencial.',
  },
  connection: {
    label: 'Conexão',
    icon: 'Sparkles',
    prompt: 'Vínculos, pertencimento e apoio percebido.',
    greenGuide: 'Valorizar a rede que está funcionando.',
    yellowGuide: 'Conversar com alguém de confiança.',
    redGuide: 'Evitar isolamento e pedir apoio seguro.',
  },
} as const;

export const PERSONAL_SEMAFORO_SIGNALS = {
  green: {
    label: 'Estou bem',
    tone: 'green',
    description: 'Registro privado de estabilidade no momento.',
  },
  yellow: {
    label: 'Preciso observar',
    tone: 'yellow',
    description: 'Registro privado de atenção pessoal, sem alerta automático.',
  },
  red: {
    label: 'Preciso de apoio',
    tone: 'red',
    description: 'Registro privado para autocuidado. Não gera laudo nem decisão ocupacional.',
  },
} as const;

export const PERSONAL_SEMAFORO_ENERGY = {
  low: 'Baixa',
  steady: 'Estável',
  high: 'Alta',
} as const;

export const semaforoSelfReportSchema = z.object({
  consentAccepted: z.literal(true),
  dimension: z.enum(['prevention', 'sleep', 'energy', 'mind', 'habits', 'connection']),
  signal: z.enum(['green', 'yellow', 'red']),
  energy: z.enum(['low', 'steady', 'high']),
  note: z.string().trim().max(500).optional().transform((value) => value || null),
}).strict();

export type PersonalSemaforoDimension = keyof typeof PERSONAL_SEMAFORO_DIMENSIONS;
export type PersonalSemaforoSignal = keyof typeof PERSONAL_SEMAFORO_SIGNALS;
export type PersonalSemaforoEnergy = keyof typeof PERSONAL_SEMAFORO_ENERGY;

interface ConsentRow {
  consent_version: string;
  accepted_at: string;
  revoked_at: string | null;
  retention_days: number;
}

interface EntryRow {
  id: string;
  dimension: PersonalSemaforoDimension;
  signal: PersonalSemaforoSignal;
  energy: PersonalSemaforoEnergy;
  note: string | null;
  consent_version: string;
  created_at: string;
  expires_at: string;
}

function activeConsent(db: Database.Database, userId: string): ConsentRow | undefined {
  return db.prepare(`
    SELECT consent_version, accepted_at, revoked_at, retention_days
    FROM personal_semaforo_consents
    WHERE user_id = ? AND revoked_at IS NULL
  `).get(userId) as ConsentRow | undefined;
}

function mapEntry(row: EntryRow) {
  const dimension = PERSONAL_SEMAFORO_DIMENSIONS[row.dimension] ?? PERSONAL_SEMAFORO_DIMENSIONS.prevention;
  const guideKey = `${row.signal}Guide` as const;

  return {
    id: row.id,
    dimension: row.dimension,
    dimensionLabel: dimension.label,
    dimensionPrompt: dimension.prompt,
    icon: dimension.icon,
    signal: row.signal,
    signalLabel: PERSONAL_SEMAFORO_SIGNALS[row.signal].label,
    tone: PERSONAL_SEMAFORO_SIGNALS[row.signal].tone,
    guide: dimension[guideKey],
    energy: row.energy,
    energyLabel: PERSONAL_SEMAFORO_ENERGY[row.energy],
    note: row.note,
    consentVersion: row.consent_version,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function readPersonalSemaforoState(db: Database.Database, userId: string) {
  const consent = activeConsent(db, userId);
  const recentRows = db.prepare(`
    SELECT id, dimension, signal, energy, note, consent_version, created_at, expires_at
    FROM personal_semaforo_entries
    WHERE user_id = ?
      AND deleted_at IS NULL
      AND expires_at > datetime('now')
    ORDER BY created_at DESC, id DESC
    LIMIT 60
  `).all(userId) as EntryRow[];
  const latest = recentRows[0];
  const latestByDimension = new Map<PersonalSemaforoDimension, EntryRow>();
  for (const row of recentRows) {
    if (!latestByDimension.has(row.dimension)) latestByDimension.set(row.dimension, row);
  }

  return {
    status: 'private_self_report',
    diagnostic: false,
    companyVisible: false,
    consent: consent ? {
      accepted: true,
      version: consent.consent_version,
      acceptedAt: consent.accepted_at,
      retentionDays: consent.retention_days,
    } : {
      accepted: false,
      version: PERSONAL_SEMAFORO_CONSENT_VERSION,
      retentionDays: PERSONAL_SEMAFORO_RETENTION_DAYS,
    },
    options: {
      dimensions: PERSONAL_SEMAFORO_DIMENSIONS,
      signals: PERSONAL_SEMAFORO_SIGNALS,
      energy: PERSONAL_SEMAFORO_ENERGY,
    },
    dimensions: Object.entries(PERSONAL_SEMAFORO_DIMENSIONS).map(([key, meta]) => {
      const entry = latestByDimension.get(key as PersonalSemaforoDimension);
      return {
        id: key,
        ...meta,
        latest: entry ? mapEntry(entry) : null,
      };
    }),
    latest: latest ? mapEntry(latest) : null,
  };
}

export function listPersonalSemaforoHistory(
  db: Database.Database,
  userId: string,
  limit = 12,
) {
  const rows = db.prepare(`
    SELECT id, dimension, signal, energy, note, consent_version, created_at, expires_at
    FROM personal_semaforo_entries
    WHERE user_id = ?
      AND deleted_at IS NULL
      AND expires_at > datetime('now')
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(userId, Math.max(1, Math.min(limit, 50))) as EntryRow[];

  return {
    status: 'private_self_report_history',
    diagnostic: false,
    companyVisible: false,
    entries: rows.map(mapEntry),
    entriesByDimension: Object.keys(PERSONAL_SEMAFORO_DIMENSIONS).reduce((acc, dimension) => {
      acc[dimension] = rows
        .filter((row) => row.dimension === dimension)
        .map(mapEntry);
      return acc;
    }, {} as Record<string, ReturnType<typeof mapEntry>[]>),
  };
}

export function createPersonalSemaforoEntry(
  db: Database.Database,
  userId: string,
  input: z.infer<typeof semaforoSelfReportSchema>,
) {
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as
    | { company_id: string | null }
    | undefined;
  const now = new Date().toISOString();
  const id = nanoid();

  db.prepare(`
    INSERT INTO personal_semaforo_consents (
      user_id, consent_version, accepted_at, revoked_at, retention_days, updated_at
    ) VALUES (?, ?, datetime('now'), NULL, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      consent_version = excluded.consent_version,
      revoked_at = NULL,
      retention_days = excluded.retention_days,
      updated_at = datetime('now')
  `).run(userId, PERSONAL_SEMAFORO_CONSENT_VERSION, PERSONAL_SEMAFORO_RETENTION_DAYS);

  db.prepare(`
    INSERT INTO personal_semaforo_entries (
      id, user_id, company_id, dimension, signal, energy, note, consent_version, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, '+' || ? || ' days'))
  `).run(
    id,
    userId,
    user?.company_id ?? null,
    input.dimension,
    input.signal,
    input.energy,
    input.note,
    PERSONAL_SEMAFORO_CONSENT_VERSION,
    now,
    now,
    PERSONAL_SEMAFORO_RETENTION_DAYS,
  );

  return readPersonalSemaforoState(db, userId);
}

export function deletePersonalSemaforoData(db: Database.Database, userId: string) {
  const deleted = db.prepare(`
    DELETE FROM personal_semaforo_entries
    WHERE user_id = ?
  `).run(userId).changes;

  db.prepare(`
    UPDATE personal_semaforo_consents
    SET revoked_at = datetime('now'), updated_at = datetime('now')
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(userId);

  db.prepare(`
    INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned, created_at)
    VALUES (?, ?, 'personal_semaforo_deleted', 'personal_semaforo', ?, 0, datetime('now'))
  `).run(nanoid(), userId, String(deleted));

  return { success: true, deletedCount: deleted };
}
