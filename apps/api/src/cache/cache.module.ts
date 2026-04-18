import { Global, Module, type Provider } from "@nestjs/common";
import { CACHE_ADAPTER } from "./cache.tokens";
import { InMemoryCacheAdapter } from "./in-memory.adapter";
import { CacheInvalidationService } from "./cache-invalidation.service";
import type { CacheAdapter } from "./cache-adapter.interface";

const adapterProvider: Provider = {
  provide: CACHE_ADAPTER,
  useFactory: (): CacheAdapter => {
    const driver = process.env.CACHE_DRIVER ?? "memory";
    if (driver === "memory") return new InMemoryCacheAdapter();
    throw new Error(`Unknown CACHE_DRIVER: ${driver}`);
  },
};

@Global()
@Module({
  providers: [adapterProvider, CacheInvalidationService],
  exports: [CACHE_ADAPTER],
})
export class CacheModule {}
