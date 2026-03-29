import type Database from 'better-sqlite3';

type WriteOperation<T = unknown> = {
  execute: (db: Database.Database) => T;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  retries: number;
  label?: string;
};

type DLQItem = {
  execute: (db: Database.Database) => unknown;
  error: string;
  enqueuedAt: number;
  failedAt: number;
  retries: number;
  label?: string;
};

const OPERATION_TIMEOUT = 10_000; // 10s max per operation
const DLQ_RETRY_INTERVAL = 30_000; // Retry DLQ every 30s
const DLQ_MAX_RETRIES = 3;

export class WriteQueue {
  private queue: WriteOperation[] = [];
  private processing = false;
  private db: Database.Database;
  private dlq: DLQItem[] = [];
  private dlqTimer: ReturnType<typeof setInterval> | null = null;
  private stats = { processed: 0, failed: 0, timedOut: 0, dlqRecovered: 0 };

  constructor(db: Database.Database) {
    this.db = db;
    this.startDLQWorker();
  }

  /** Enqueue a write operation with optional label for debugging */
  enqueue<T>(execute: (db: Database.Database) => T, label?: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as (db: Database.Database) => unknown,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
        retries: 0,
        label,
      });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const operation = this.queue.shift()!;

    // Check if operation waited too long in queue (stale)
    const waitTime = Date.now() - operation.enqueuedAt;
    if (waitTime > OPERATION_TIMEOUT * 2) {
      // Operation is too stale — reject and move on
      operation.reject(new Error(`Operation timed out in queue (waited ${waitTime}ms)`));
      this.stats.timedOut++;
      this.processing = false;
      this.processNext();
      return;
    }

    // Execute with timeout
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        this.stats.timedOut++;
        // Move to DLQ for retry
        this.addToDLQ(operation, 'Timeout after 10s');
        operation.reject(new Error('Write operation timed out (10s). Moved to retry queue.'));
        this.processing = false;
        this.processNext();
      }
    }, OPERATION_TIMEOUT);

    try {
      const result = operation.execute(this.db);
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        operation.resolve(result);
        this.stats.processed++;
      }
    } catch (error) {
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        const errMsg = error instanceof Error ? error.message : String(error);

        // Retryable errors go to DLQ
        if (this.isRetryable(errMsg) && operation.retries < DLQ_MAX_RETRIES) {
          this.addToDLQ(operation, errMsg);
          operation.reject(new Error(`Write failed: ${errMsg}. Queued for retry.`));
        } else {
          operation.reject(error instanceof Error ? error : new Error(String(error)));
        }
        this.stats.failed++;
      }
    } finally {
      if (completed) {
        this.processing = false;
        if (this.queue.length > 0) {
          // Use setImmediate/setTimeout to avoid stack overflow on long queues
          setTimeout(() => this.processNext(), 0);
        }
      }
    }
  }

  /** Check if error is retryable (DB busy, locked) */
  private isRetryable(errMsg: string): boolean {
    const retryable = ['SQLITE_BUSY', 'SQLITE_LOCKED', 'database is locked'];
    return retryable.some(r => errMsg.includes(r));
  }

  /** Add failed operation to Dead Letter Queue */
  private addToDLQ(op: WriteOperation, error: string): void {
    this.dlq.push({
      execute: op.execute,
      error,
      enqueuedAt: op.enqueuedAt,
      failedAt: Date.now(),
      retries: op.retries + 1,
      label: op.label,
    });
  }

  /** Background worker that retries DLQ items */
  private startDLQWorker(): void {
    this.dlqTimer = setInterval(() => {
      if (this.dlq.length === 0 || this.processing) return;

      const item = this.dlq.shift();
      if (!item) return;

      if (item.retries >= DLQ_MAX_RETRIES) {
        // Max retries reached — log and discard
        console.error(`[WriteQueue DLQ] Discarded after ${item.retries} retries: ${item.label || 'unknown'} — ${item.error}`);
        return;
      }

      // Re-enqueue with retry count
      this.queue.push({
        execute: item.execute,
        resolve: () => { this.stats.dlqRecovered++; },
        reject: (err) => {
          // If still fails, it'll be added back to DLQ by processNext
          console.warn(`[WriteQueue DLQ] Retry ${item.retries + 1} failed: ${err.message}`);
        },
        enqueuedAt: Date.now(),
        retries: item.retries,
        label: item.label ? `${item.label} (retry ${item.retries})` : undefined,
      });
      this.processNext();
    }, DLQ_RETRY_INTERVAL);
  }

  /** Number of operations waiting in main queue */
  get pending(): number {
    return this.queue.length;
  }

  /** Number of operations in dead letter queue */
  get dlqSize(): number {
    return this.dlq.length;
  }

  /** Queue statistics */
  getStats() {
    return {
      ...this.stats,
      pending: this.queue.length,
      dlqSize: this.dlq.length,
    };
  }

  /** Cleanup — stop DLQ worker */
  destroy(): void {
    if (this.dlqTimer) {
      clearInterval(this.dlqTimer);
      this.dlqTimer = null;
    }
  }
}
