import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { SessionsEventsService } from "../sessions/sessions.events";
import { CACHE_ADAPTER } from "../cache/cache.tokens";
import { CacheKeys, type CacheAdapter } from "../cache/cache-adapter.interface";
import { STACK_EVENT, type StackSessionLockedEvent } from "./stacks.events";
import { StacksService } from "./stacks.service";

@Injectable()
export class StacksListener {
  private readonly logger = new Logger(StacksListener.name);

  constructor(
    private readonly stacks: StacksService,
    private readonly events: SessionsEventsService,
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
  ) {}

  @OnEvent(STACK_EVENT.SESSION_LOCKED, { async: true })
  async onSessionLocked(e: StackSessionLockedEvent): Promise<void> {
    try {
      const playerIds = await this.stacks.applyPending(e.domain);
      await this.cache.delByPrefix(CacheKeys.playerStackPrefix(e.domain));
      if (playerIds.length) {
        this.events.publish({
          type: "player.stack_updated",
          domain: e.domain,
          sessionId: e.sessionId,
          playerIds,
        });
      }
    } catch (err) {
      // Pending rows stay NULL, so the next lock (or stack:rebuild) heals this.
      this.logger.error(`stack apply failed for session ${e.sessionId}`, err as Error);
    }
  }
}
