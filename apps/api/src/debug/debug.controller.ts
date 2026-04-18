import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { CACHE_ADAPTER } from "../cache/cache.tokens";
import type { CacheAdapter } from "../cache/cache-adapter.interface";
import { DebugGuard } from "./debug.guard";

@ApiTags("debug")
@ApiBearerAuth()
@Public()
@UseGuards(DebugGuard)
@Controller("debug")
export class DebugController {
  constructor(
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
  ) {}

  @Get("cache")
  @ApiOperation({
    summary: "List all cache entries (keys + ttl + size)",
    description:
      "Auth: Bearer debug token, or ?token=, or X-Debug-Token header. Default token: zpoker-debug-2026 (override via DEBUG_TOKEN env).",
  })
  @ApiQuery({ name: "prefix", required: false })
  async listCache(@Query("prefix") prefix?: string) {
    if (!this.cache.list) {
      throw new NotFoundException("Current cache adapter does not support listing");
    }
    const entries = await this.cache.list(prefix);
    const totalSize = entries.reduce(
      (acc, e) => acc + (e.size > 0 ? e.size : 0),
      0,
    );
    return {
      driver: process.env.CACHE_DRIVER ?? "memory",
      count: entries.length,
      totalSize,
      entries,
    };
  }

  @Get("cache/entry")
  @ApiOperation({ summary: "Fetch raw cached value by key" })
  @ApiQuery({ name: "key", required: true })
  async getEntry(@Query("key") key: string) {
    if (!key) throw new NotFoundException("key is required");
    const value = await this.cache.get(key);
    if (value === undefined) throw new NotFoundException(`No cache for ${key}`);
    return { key, value };
  }
}
