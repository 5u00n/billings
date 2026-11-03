import { borrowingSchema } from "./schema";
export type Statement = { sql: string; args?: any[] };
export interface LedgerStore {
  all(sql: string, args?: any[]): Promise<any[]>;
  batch(statements: Statement[]): Promise<void>;
  init(): Promise<void>;
}
export function sqliteStore(db: any): LedgerStore {
  return {
    async all(sql, args = []) {
      return db.prepare(sql).all(...args);
    },
    async batch(statements) {
      db.transaction(() => {
        for (const s of statements) db.prepare(s.sql).run(...(s.args || []));
      })();
    },
    async init() {
      db.transaction(() => borrowingSchema.forEach((sql) => db.exec(sql)))();
    },
  };
}
export function d1Store(db: any): LedgerStore {
  return {
    async all(sql, args = []) {
      return (
        (
          await db
            .prepare(sql)
            .bind(...args)
            .all()
        ).results || []
      );
    },
    async batch(statements) {
      if (statements.length)
        await db.batch(
          statements.map((s) => db.prepare(s.sql).bind(...(s.args || []))),
        );
    },
    async init() {
      await db.batch(borrowingSchema.map((sql) => db.prepare(sql)));
    },
  };
}
