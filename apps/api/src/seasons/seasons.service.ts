import { Inject, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Player } from "../players/player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { SeasonResult } from "./season-result.entity";
import { SeasonRecap } from "./season-recap.entity";
import { SeasonRecapProseService } from "./season-recap-prose.service";
import { SessionsEventsService } from "../sessions/sessions.events";
import { CACHE_ADAPTER } from "../cache/cache.tokens";
import {
  CacheKeys,
  DEFAULT_TTL_MS,
  type CacheAdapter,
} from "../cache/cache-adapter.interface";
import { previousSeasonKey, seasonRange } from "./season.util";
import {
  computeRecap,
  type RecapRow,
  type SeasonRecapDto,
} from "./season.recap";

export type { SeasonRecapDto } from "./season.recap";

const STARTING_ELO = 1200;
// Soft reset: pull each player 70% of the way back to STARTING_ELO, keeping 30%
// of their deviation so some ranking carries into the new season. Same 30%
// carry-over applies to an un-popped jackpot. See CLAUDE.md "Season reset".
const RESET_KEEP_RATIO = 0.3;

function softResetElo(elo: number): number {
  return Math.round(STARTING_ELO + (elo - STARTING_ELO) * RESET_KEEP_RATIO);
}

export interface SeasonLatestDto {
  seasonKey: string;
  totalGames: number;
  available: boolean;
  recapVisible: boolean;
}

@Injectable()
export class SeasonsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
    @InjectRepository(SeasonResult)
    private readonly seasonResults: Repository<SeasonResult>,
    @InjectRepository(SeasonRecap)
    private readonly seasonRecaps: Repository<SeasonRecap>,
    private readonly prose: SeasonRecapProseService,
    private readonly events: SessionsEventsService,
    @Inject(CACHE_ADAPTER) private readonly cache: CacheAdapter,
  ) {}

  async latest(domain: string, now = new Date()): Promise<SeasonLatestDto> {
    const seasonKey = previousSeasonKey(now);
    const closed =
      (await this.seasonResults.count({ where: { domain, seasonKey } })) > 0;
    const recapRow = await this.seasonRecaps.findOne({ where: { domain, seasonKey } });
    const totalGames = await this.countGamesInSeason(domain, seasonKey);
    // Visible by default unless an admin toggled it off. `available` gates both the
    // button and auto-open: only when the season was closed, has actual games, and
    // hasn't been hidden by an admin.
    const recapVisible = recapRow?.recapVisible ?? true;
    return {
      seasonKey,
      totalGames,
      available: closed && totalGames > 0 && recapVisible,
      recapVisible,
    };
  }

  private async countGamesInSeason(
    domain: string,
    seasonKey: string,
  ): Promise<number> {
    const { start, end } = seasonRange(seasonKey);
    const row = await this.dataSource
      .getRepository(Session)
      .createQueryBuilder("s")
      .select("COUNT(*)", "n")
      .where("s.domain = :domain", { domain })
      .andWhere("s.is_locked = true")
      .andWhere("s.locked_at >= :start AND s.locked_at <= :end", { start, end })
      .getRawOne<{ n: string }>();
    return Number(row?.n ?? 0);
  }

  async setRecapVisible(
    domain: string,
    seasonKey: string,
    visible: boolean,
  ): Promise<{ seasonKey: string; recapVisible: boolean }> {
    await this.seasonRecaps
      .createQueryBuilder()
      .insert()
      .into(SeasonRecap)
      .values({ domain, seasonKey, recapVisible: visible })
      .orUpdate(["recap_visible"], ["domain", "season_key"])
      .execute();
    await this.cache.del(CacheKeys.seasonRecap(domain, seasonKey));
    this.events.publish({ type: "season.reset", domain, seasonKey });
    return { seasonKey, recapVisible: visible };
  }

  // Pulls all locked session_players rows for a domain within the season range.
  private async loadRows(domain: string, seasonKey: string): Promise<RecapRow[]> {
    const { start, end } = seasonRange(seasonKey);
    return this.dataSource
      .getRepository(SessionPlayer)
      .createQueryBuilder("sp")
      .innerJoin(Session, "s", "s.id = sp.session_id")
      .innerJoin(Player, "p", "p.id = sp.player_id")
      .select([
        'sp.player_id AS "playerId"',
        'p.name AS "playerName"',
        'p.avatar_url AS "avatarUrl"',
        'sp.session_id AS "sessionId"',
        'sp.chips_end AS "chipsEnd"',
        's.buy_in AS "buyIn"',
        'sp.elo_before AS "eloBefore"',
        'sp.elo_after AS "eloAfter"',
        's.locked_at AS "lockedAt"',
        's.played_date AS "playedDate"',
      ])
      .where("s.domain = :domain", { domain })
      .andWhere("s.is_locked = true")
      .andWhere("sp.chips_end IS NOT NULL")
      .andWhere("s.locked_at >= :start AND s.locked_at <= :end", { start, end })
      .orderBy("s.locked_at", "ASC")
      .getRawMany<RecapRow>();
  }

  async getRecap(domain: string, seasonKey: string): Promise<SeasonRecapDto> {
    const cacheKey = CacheKeys.seasonRecap(domain, seasonKey);
    const hit = await this.cache.get<SeasonRecapDto>(cacheKey);
    if (hit !== undefined) return hit;

    const rows = await this.loadRows(domain, seasonKey);
    const recap = computeRecap(seasonKey, rows);
    const recapRow = await this.seasonRecaps.findOne({ where: { domain, seasonKey } });
    recap.prose = recapRow?.prose ?? null;
    await this.cache.set(cacheKey, recap, DEFAULT_TTL_MS);
    return recap;
  }

  /**
   * Closes a season for a domain: snapshots final standings into season_results,
   * then SOFT-resets all players — each player keeps 30% of their ELO deviation
   * from 1200 (and 30% of any un-popped jackpot); gamesPlayed + currentStreak
   * reset to 0. Idempotent — a second call for the same (domain, seasonKey) is a
   * no-op. Emits a `season.reset` SSE event.
   */
  async closeSeason(
    domain: string,
    seasonKey: string,
    personaId?: string | null,
  ): Promise<{ reset: number; alreadyClosed: boolean }> {
    const result = await this.dataSource.transaction(async (tx) => {
      const repo = tx.getRepository(SeasonResult);
      const existing = await repo.count({ where: { domain, seasonKey } });
      if (existing > 0) return { reset: 0, alreadyClosed: true };

      // Lock player rows for this domain, ordered for stable ranking + deadlock avoidance.
      const players = await tx
        .getRepository(Player)
        .createQueryBuilder("p")
        .setLock("pessimistic_write")
        .where("p.domain = :domain", { domain })
        .orderBy("p.elo", "DESC")
        .addOrderBy("p.id", "ASC")
        .getMany();

      if (players.length === 0) return { reset: 0, alreadyClosed: false };

      // In-season games-played per player (locked sessions in range).
      const { start, end } = seasonRange(seasonKey);
      const gameCounts = await tx
        .getRepository(SessionPlayer)
        .createQueryBuilder("sp")
        .innerJoin(Session, "s", "s.id = sp.session_id")
        .select("sp.player_id", "playerId")
        .addSelect("COUNT(DISTINCT sp.session_id)", "games")
        .where("s.domain = :domain", { domain })
        .andWhere("s.is_locked = true")
        .andWhere("s.locked_at >= :start AND s.locked_at <= :end", { start, end })
        .groupBy("sp.player_id")
        .getRawMany<{ playerId: string; games: string }>();
      const gamesByPlayer = new Map(gameCounts.map((g) => [g.playerId, Number(g.games)]));

      const snapshots = players.map((p, i) =>
        repo.create({
          domain,
          seasonKey,
          playerId: p.id,
          playerName: p.name,
          finalElo: p.elo,
          finalRank: i + 1,
          gamesPlayed: gamesByPlayer.get(p.id) ?? 0,
        }),
      );
      await repo.save(snapshots);

      // Soft reset per player: keep 30% of ELO deviation from 1200 and 30% of any
      // un-popped jackpot. gamesPlayed + currentStreak start fresh each season.
      const playerRepo = tx.getRepository(Player);
      for (const p of players) {
        await playerRepo.update(
          { id: p.id },
          {
            elo: softResetElo(p.elo),
            jackpot: Math.round(p.jackpot * RESET_KEEP_RATIO),
            gamesPlayed: 0,
            currentStreak: 0,
          },
        );
      }

      return { reset: players.length, alreadyClosed: false };
    });

    if (!result.alreadyClosed && result.reset > 0) {
      // Stats come from preserved session_players history, so we can compute the
      // recap + AI prose after the reset transaction has committed.
      const rows = await this.loadRows(domain, seasonKey);
      const recap = computeRecap(seasonKey, rows);
      const prose = await this.prose.generate(recap, personaId);
      await this.seasonRecaps.save(
        this.seasonRecaps.create({ domain, seasonKey, prose, recapVisible: true }),
      );

      await this.cache.del(CacheKeys.leaderboard(domain));
      await this.cache.delByPrefix(CacheKeys.profilePrefix(domain));
      await this.cache.del(CacheKeys.sessionsStats(domain));
      await this.cache.del(CacheKeys.seasonRecap(domain, seasonKey));
      this.events.publish({ type: "season.reset", domain, seasonKey });
    }

    return result;
  }
}
