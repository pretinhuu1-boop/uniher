import type Database from 'better-sqlite3';

type WriteOperation<T = unknown> = {
  execute: (db: Database.Database) => T;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

export class WriteQueue {
  private queue: WriteOperation[] = [];
  private processing = false;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  enqueue<T>(execute: (db: Database.Database) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as (db: Database.Database) => unknown,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const operation = this.queue.shift()!;
    try {
      const result = operation.execute(this.db);
      operation.resolve(result);
    } catch (error) {
      operation.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.processNext();
      }
    }
  }

  get pending(): number {
    return this.queue.length;
  }
}
