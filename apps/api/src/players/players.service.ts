import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Player } from "./player.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { Session } from "../sessions/session.entity";
import type { AuthedUser } from "../auth/current-user.decorator";
import { CACHE_ADAPTER } from "../cache/cache.tokens";
import {
  CacheKeys,
  DEFAULT_TTL_MS,
  type CacheAdapter,
} from "../cache/cache-adapter.interface";

export type GameResult = "W" | "L" | "T";

export interface PlayerDto {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  gamesPlayed: number;
  currentStreak: number;
  lastResults: GameResult[]; // last 5 locked-session results, newest first
  jackpot: number;
  avatarUrl: string | null;
  createdAt: string;
}

export interface PlayerWithRankDto extends PlayerDto {
  rank: number | null;
}

export interface PlayerHistoryEntryDto {
  id: string;
  sessionId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  session: {
    id: string;
    playedDate: string;
    buyIn: number;
    isLocked: boolean;
    lockedAt: string | null;
  };
}

function toDto(p: Player, lastResults: GameResult[] = []): PlayerDto {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    domain: p.domain,
    elo: p.elo,
    gamesPlayed: p.gamesPlayed,
    currentStreak: p.currentStreak,
    lastResults,
    jackpot: p.jackpot,
    avatarUrl: p.avatarUrl,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
    @InjectRepository(SessionPlayer)
    private readonly sessionPlayers: Repository<SessionPlayer>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
  ) {}

  async findOrCreateMe(user: AuthedUser, displayName: string): Promise<PlayerDto> {
    const existing = await this.players.findOne({ where: { id: user.userId } });
    if (existing) {
      // Keep avatar in sync on every login
      if (user.avatarUrl && existing.avatarUrl !== user.avatarUrl) {
        await this.players.update({ id: user.userId }, { avatarUrl: user.avatarUrl });
        existing.avatarUrl = user.avatarUrl;
      }
      return toDto(existing);
    }

    const created = this.players.create({
      id: user.userId,
      email: user.email,
      name: displayName || user.email,
      domain: user.domain,
      avatarUrl: user.avatarUrl ?? null,
    });
    await this.players.save(created);
    return toDto(created);
  }

  async updateMe(user: AuthedUser, name: string): Promise<PlayerDto> {
    await this.players.update({ id: user.userId }, { name });
    const updated = await this.players.findOne({ where: { id: user.userId } });
    if (!updated) throw new NotFoundException("Player not found");
    await this.cache.del(CacheKeys.profile(user.domain, user.userId));
    return toDto(updated);
  }

  async listForDomain(domain: string): Promise<PlayerDto[]> {
    const key = CacheKeys.leaderboard(domain);
    const hit = await this.cache.get<PlayerDto[]>(key);
    if (hit !== undefined) return hit;
    const rows = await this.players.find({
      where: { domain },
      order: { elo: "DESC" },
      take: 200,
    });
    const lastResultsByPlayer = await this.loadLastResults(rows.map((r) => r.id), domain);
    const fresh = rows.map((r) => toDto(r, lastResultsByPlayer.get(r.id) ?? []));
    await this.cache.set(key, fresh, DEFAULT_TTL_MS);
    return fresh;
  }

  private async loadLastResults(
    playerIds: string[],
    domain: string,
    perPlayer = 5,
  ): Promise<Map<string, GameResult[]>> {
    const out = new Map<string, GameResult[]>();
    if (!playerIds.length) return out;
    const rows = await this.sessionPlayers
      .createQueryBuilder("sp")
      .innerJoin(Session, "s", "s.id = sp.session_id")
      .select([
        'sp.player_id AS "playerId"',
        'sp.chips_end AS "chipsEnd"',
        's.buy_in AS "buyIn"',
        's.locked_at AS "lockedAt"',
      ])
      .where("sp.player_id IN (:...ids)", { ids: playerIds })
      .andWhere("s.domain = :domain", { domain })
      .andWhere("s.is_locked = true")
      .andWhere("sp.chips_end IS NOT NULL")
      .orderBy("s.locked_at", "DESC")
      .getRawMany<{ playerId: string; chipsEnd: number; buyIn: number; lockedAt: Date }>();

    for (const r of rows) {
      const list = out.get(r.playerId) ?? [];
      if (list.length >= perPlayer) continue;
      const chipsEnd = Number(r.chipsEnd);
      const buyIn = Number(r.buyIn);
      const result: GameResult = chipsEnd > buyIn ? "W" : chipsEnd < buyIn ? "L" : "T";
      list.push(result);
      out.set(r.playerId, list);
    }
    return out;
  }

  async getByIdForDomain(id: string, domain: string): Promise<PlayerWithRankDto> {
    const key = CacheKeys.profile(domain, id);
    const hit = await this.cache.get<PlayerWithRankDto>(key);
    if (hit !== undefined) return hit;
    const { entities, raw } = await this.players
      .createQueryBuilder("p")
      .addSelect(
        `(SELECT COUNT(*)::int + 1 FROM players p2 WHERE p2.domain = p.domain AND p2.elo > p.elo)`,
        "rank",
      )
      .where("p.id = :id AND p.domain = :domain", { id, domain })
      .getRawAndEntities();
    if (!entities.length) throw new NotFoundException("Player not found");
    const fresh: PlayerWithRankDto = {
      ...toDto(entities[0]),
      rank: raw[0].rank as number,
    };
    await this.cache.set(key, fresh, DEFAULT_TTL_MS);
    return fresh;
  }

  async getHistory(
    playerId: string,
    domain: string,
    limit: number,
  ): Promise<PlayerHistoryEntryDto[]> {
    const key = CacheKeys.profileHistory(domain, playerId, limit);
    const hit = await this.cache.get<PlayerHistoryEntryDto[]>(key);
    if (hit !== undefined) return hit;
    const fresh = await this.loadHistory(playerId, domain, limit);
    await this.cache.set(key, fresh, DEFAULT_TTL_MS);
    return fresh;
  }

  private async loadHistory(
    playerId: string,
    domain: string,
    limit: number,
  ): Promise<PlayerHistoryEntryDto[]> {
    const rows = await this.sessionPlayers
      .createQueryBuilder("sp")
      .innerJoin(Session, "s", "s.id = sp.session_id")
      .select([
        'sp.id AS "id"',
        'sp.session_id AS "sessionId"',
        'sp.chips_end AS "chipsEnd"',
        'sp.elo_before AS "eloBefore"',
        'sp.elo_after AS "eloAfter"',
        's.id AS "sId"',
        's.created_at AS "sCreatedAt"',
        's.buy_in AS "sBuyIn"',
        's.is_locked AS "sIsLocked"',
        's.locked_at AS "sLockedAt"',
      ])
      .where("sp.player_id = :playerId", { playerId })
      .andWhere("s.domain = :domain", { domain })
      .orderBy("sp.updated_at", "DESC")
      .limit(limit)
      .getRawMany<{
        id: string;
        sessionId: string;
        chipsEnd: number | null;
        eloBefore: number | null;
        eloAfter: number | null;
        sId: string;
        sCreatedAt: Date | string;
        sBuyIn: number;
        sIsLocked: boolean;
        sLockedAt: Date | null;
      }>();

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      chipsEnd: r.chipsEnd,
      eloBefore: r.eloBefore,
      eloAfter: r.eloAfter,
      session: {
        id: r.sId,
        playedDate: (r.sCreatedAt instanceof Date
          ? r.sCreatedAt
          : new Date(r.sCreatedAt)
        )
          .toISOString()
          .slice(0, 10),
        buyIn: Number(r.sBuyIn),
        isLocked: r.sIsLocked,
        lockedAt: r.sLockedAt ? (r.sLockedAt instanceof Date ? r.sLockedAt : new Date(r.sLockedAt)).toISOString() : null,
      },
    }));
  }
}
