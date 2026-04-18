import { Injectable } from "@nestjs/common";
import type { CacheAdapter } from "./cache-adapter.interface";

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

@Injectable()
export class InMemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt =
      ttlMs !== undefined && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
