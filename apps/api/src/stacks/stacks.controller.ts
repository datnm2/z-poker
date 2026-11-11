import { Controller, Get, Inject } from "@nestjs/common";
import { StacksService, type StackLeaderboardEntryDto } from "./stacks.service";
import { CurrentUser, type AuthedUser } from "../auth/current-user.decorator";
import { CACHE_ADAPTER } from "../cache/cache.tokens";
import {
  CacheKeys,
  DEFAULT_TTL_MS,
  type CacheAdapter,
} from "../cache/cache-adapter.interface";

@Controller("stacks")
export class StacksController {
  constructor(
    private readonly stacks: StacksService,
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
  ) {}

  @Get("leaderboard")
  async leaderboard(@CurrentUser() user: AuthedUser) {
    // Lives under the player-stack prefix so StacksListener invalidation clears it.
    const key = `${CacheKeys.playerStackPrefix(user.domain)}__leaderboard`;
    const hit = await this.cache.get<StackLeaderboardEntryDto[]>(key);
    if (hit !== undefined) return hit;
    const fresh = await this.stacks.getLeaderboard(user.domain);
    await this.cache.set(key, fresh, DEFAULT_TTL_MS);
    return fresh;
  }
}
