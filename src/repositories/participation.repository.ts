import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import {
  PARTICIPATION_ELIGIBILITY_VERSION,
  type EligibleParticipationEvent,
  type ParticipationErasureReceiptRow,
  type ParticipationEventRow,
  type ParticipationRevocationRow,
  type ParticipationSourceDomain,
} from '@/types/participation';

export type InsertParticipationEventInput = {
  eventKey: string;
  mutationId: string;
  companyId: string;
  userId: string;
  eventType: EligibleParticipationEvent;
  sourceDomain: ParticipationSourceDomain;
  sourceId: string;
  occurredAt: string;
};

export type InsertParticipationEventResult = {
  status: 'inserted' | 'duplicate';
  event: ParticipationEventRow;
};

export type RevokeParticipationEventInput = {
  eventId: string;
  companyId: string;
  actorId: string;
  reasonCode: 'source_reversed' | 'source_deleted' | 'eligibility_error' | 'user_erasure';
  revokedAt: string;
};

export type EraseParticipationInput = {
  userId: string;
  companyId: string;
  actorId: string;
  erasedAt: string;
};

export interface ParticipationRepository {
  insertEvent(input: InsertParticipationEventInput): InsertParticipationEventResult;
  listUserEvents(input: { userId: string; companyId: string; includeRevoked?: boolean }): ParticipationEventRow[];
  listRevocationsForUser(input: { userId: string; companyId: string }): ParticipationRevocationRow[];
  revokeEvent(input: RevokeParticipationEventInput): ParticipationRevocationRow;
  hardDeleteUserEventsInCurrentTransaction(input: EraseParticipationInput): ParticipationErasureReceiptRow;
  hardDeleteUserEvents(input: EraseParticipationInput): ParticipationErasureReceiptRow;
  listErasureReceipts(companyId: string): ParticipationErasureReceiptRow[];
}

function getEventByKey(database: Database.Database, eventKey: string): ParticipationEventRow {
  const row = database.prepare(`
    SELECT *
    FROM eligible_participation_events
    WHERE event_key = ?
  `).get(eventKey) as ParticipationEventRow | undefined;
  if (!row) throw new Error('Participation event was not persisted');
  return row;
}

export function createParticipationRepository(database: Database.Database): ParticipationRepository {
  return {
    insertEvent(input) {
      const id = nanoid();
      const result = database.prepare(`
        INSERT OR IGNORE INTO eligible_participation_events (
          id, event_key, mutation_id, company_id, user_id, event_type,
          source_domain, source_id, eligibility_version, metadata_json, occurred_at
        ) VALUES (
          @id, @eventKey, @mutationId, @companyId, @userId, @eventType,
          @sourceDomain, @sourceId, @eligibilityVersion, '{}', @occurredAt
        )
      `).run({
        ...input,
        id,
        eligibilityVersion: PARTICIPATION_ELIGIBILITY_VERSION,
      });
      return {
        status: result.changes === 0 ? 'duplicate' : 'inserted',
        event: getEventByKey(database, input.eventKey),
      };
    },

    listUserEvents(input) {
      const revokedFilter = input.includeRevoked
        ? ''
        : `AND NOT EXISTS (
            SELECT 1
            FROM eligible_participation_event_revocations r
            WHERE r.event_id = e.id
          )`;
      return database.prepare(`
        SELECT e.*
        FROM eligible_participation_events e
        WHERE e.user_id = @userId
          AND e.company_id = @companyId
          ${revokedFilter}
        ORDER BY e.occurred_at DESC, e.id DESC
      `).all(input) as ParticipationEventRow[];
    },

    listRevocationsForUser(input) {
      return database.prepare(`
        SELECT r.*
        FROM eligible_participation_event_revocations r
        JOIN eligible_participation_events e ON e.id = r.event_id
        WHERE e.user_id = @userId
          AND e.company_id = @companyId
        ORDER BY r.revoked_at DESC, r.id DESC
      `).all(input) as ParticipationRevocationRow[];
    },

    revokeEvent(input) {
      const event = database.prepare(`
        SELECT id
        FROM eligible_participation_events
        WHERE id = @eventId AND company_id = @companyId
      `).get(input) as { id: string } | undefined;
      if (!event) throw new Error('Participation event not found');

      const existing = database.prepare(`
        SELECT *
        FROM eligible_participation_event_revocations
        WHERE event_id = @eventId
        ORDER BY version DESC
        LIMIT 1
      `).get(input) as ParticipationRevocationRow | undefined;
      if (existing) return existing;

      const id = nanoid();
      database.prepare(`
        INSERT INTO eligible_participation_event_revocations (
          id, event_id, company_id, reason_code, actor_id, version, revoked_at
        ) VALUES (
          @id, @eventId, @companyId, @reasonCode, @actorId, 1, @revokedAt
        )
      `).run({ ...input, id });
      return database.prepare(`
        SELECT *
        FROM eligible_participation_event_revocations
        WHERE id = ?
      `).get(id) as ParticipationRevocationRow;
    },

    hardDeleteUserEventsInCurrentTransaction(input) {
        const countRow = database.prepare(`
          SELECT COUNT(*) AS count
          FROM eligible_participation_events
          WHERE user_id = @userId AND company_id = @companyId
        `).get(input) as { count: number };

        database.prepare(`
          DELETE FROM eligible_participation_events
          WHERE user_id = @userId AND company_id = @companyId
        `).run(input);

        const id = nanoid();
        database.prepare(`
          INSERT INTO participation_erasure_receipts (
            id, company_id, actor_id, event_count, erased_at
          ) VALUES (
            @id, @companyId, @actorId, @eventCount, @erasedAt
          )
        `).run({
          id,
          companyId: input.companyId,
          actorId: input.actorId,
          eventCount: countRow.count,
          erasedAt: input.erasedAt,
        });

        return database.prepare(`
          SELECT *
          FROM participation_erasure_receipts
          WHERE id = ?
        `).get(id) as ParticipationErasureReceiptRow;
    },

    hardDeleteUserEvents(input) {
      const erase = database.transaction(() => this.hardDeleteUserEventsInCurrentTransaction(input));
      return erase.immediate();
    },

    listErasureReceipts(companyId) {
      return database.prepare(`
        SELECT *
        FROM participation_erasure_receipts
        WHERE company_id = ?
        ORDER BY erased_at DESC, id DESC
      `).all(companyId) as ParticipationErasureReceiptRow[];
    },
  };
}
