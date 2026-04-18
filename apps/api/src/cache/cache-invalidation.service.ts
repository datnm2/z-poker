import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { Subscription } from "rxjs";
import {
  SessionsEventsService,
  type SessionEvent,
} from "../sessions/sessions.events";
import { CACHE_ADAPTER } from "./cache.tokens";
import { CacheKeys, type CacheAdapter } from "./cache-adapter.interface";

@Injectable()
export class CacheInvalidationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private sub?: Subscription;

  constructor(
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
    private readonly events: SessionsEventsService,
  ) {}

  onModuleInit(): void {
    this.sub = this.events.events$.subscribe((e) => {
      this.handle(e).catch((err) =>
        this.logger.error(`invalidation failed for ${e.type}`, err),
      );
    });
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async handle(event: SessionEvent): Promise<void> {
    switch (event.type) {
      case "session.created": {
        const { domain } = event;
        await Promise.all([
          this.cache.del(CacheKeys.sessionsActive(domain)),
          this.cache.del(CacheKeys.sessionsStats(domain)),
        ]);
        return;
      }
      case "session.player_joined": {
        const { domain, sessionId } = event;
        await Promise.all([
          this.cache.del(CacheKeys.sessionsActive(domain)),
          this.cache.del(CacheKeys.sessionDetail(sessionId)),
        ]);
        return;
      }
      case "session.chips_updated": {
        await this.cache.del(CacheKeys.sessionDetail(event.sessionId));
        return;
      }
      case "session.locked": {
        const { domain, sessionId } = event;
        await Promise.all([
          this.cache.del(CacheKeys.leaderboard(domain)),
          this.cache.del(CacheKeys.sessionsActive(domain)),
          this.cache.del(CacheKeys.sessionsStats(domain)),
          this.cache.del(CacheKeys.sessionDetail(sessionId)),
          this.cache.delByPrefix(CacheKeys.profilePrefix(domain)),
          this.cache.delByPrefix(CacheKeys.profileHistoryPrefix(domain)),
          this.cache.delByPrefix(CacheKeys.sessionsHistoryPrefix(domain)),
        ]);
        return;
      }
      case "session.highlights_ready": {
        await this.cache.del(CacheKeys.sessionDetail(event.sessionId));
        return;
      }
    }
  }
}
