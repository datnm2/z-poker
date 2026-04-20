import { Logger } from "@nestjs/common";
import type { Logger as TypeOrmLogger } from "typeorm";

// TypeORM logger that emits a structured warning for any query/transaction
// exceeding the slow threshold. Errors always logged; info/log/schema are muted.
export class SlowQueryLogger implements TypeOrmLogger {
  private readonly logger = new Logger("DB");

  logQuery(): void {}

  logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
    this.logger.error(
      JSON.stringify({
        event: "db.query_error",
        error: error instanceof Error ? error.message : error,
        query: truncate(query),
        params: safeParams(parameters),
      }),
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    this.logger.warn(
      JSON.stringify({
        event: "db.slow_query",
        durationMs: time,
        query: truncate(query),
        params: safeParams(parameters),
      }),
    );
  }

  logSchemaBuild(): void {}
  logMigration(): void {}
  log(): void {}
}

function truncate(s: string, max = 500): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function safeParams(params: unknown[] | undefined): unknown[] | undefined {
  if (!params) return undefined;
  return params.map((p) => {
    if (Array.isArray(p) && p.length > 20) return `[array len=${p.length}]`;
    if (typeof p === "string" && p.length > 200) return `${p.slice(0, 200)}…`;
    return p;
  });
}
