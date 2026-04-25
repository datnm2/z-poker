import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Player } from "../players/player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { computeEloChanges, type EloOutput } from "./elo.math";

export type EloResult = EloOutput;

@Injectable()
export class EloService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Calculates Elo updates for a session, applies them, and locks the session.
   * Mirrors supabase/migrations/002_new_elo_formula.sql (group-average, K=70).
   */
  async calculateAndLock(sessionId: string): Promise<EloResult[]> {
    return this.dataSource.transaction(async (tx) => {
      // SELECT ... FOR UPDATE on the session row so concurrent /lock requests
      // serialize; only the first tx sees isLocked=false and writes ELO.
      const session = await tx
        .getRepository(Session)
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :id", { id: sessionId })
        .getOne();
      if (!session) throw new NotFoundException("Session not found");
      if (session.isLocked) {
        throw new BadRequestException("Session is already locked");
      }

      const rows = await tx
        .getRepository(SessionPlayer)
        .createQueryBuilder("sp")
        .innerJoin(Player, "p", "p.id = sp.player_id")
        .select([
          'sp.player_id AS "playerId"',
          'sp.chips_end AS "chipsEnd"',
          'sp.updated_at AS "updatedAt"',
          'p.elo AS "elo"',
          'p.current_streak AS "currentStreak"',
        ])
        .where("sp.session_id = :sessionId", { sessionId })
        .orderBy("sp.chips_end", "DESC", "NULLS LAST")
        .addOrderBy("sp.updated_at", "ASC")
        .getRawMany<{
          playerId: string;
          chipsEnd: number | null;
          updatedAt: Date;
          elo: number;
          currentStreak: number;
        }>();

      const numPlayers = rows.length;
      if (numPlayers < 2) {
        throw new BadRequestException("Need at least 2 players");
      }

      const buyIn = session.buyIn;
      const expectedChips = buyIn * numPlayers;

      if (rows.some((r) => r.chipsEnd === null)) {
        throw new BadRequestException("All players must have chips_end set");
      }

      const totalChips = rows.reduce((acc, r) => acc + (r.chipsEnd ?? 0), 0);
      if (totalChips !== expectedChips) {
        throw new BadRequestException(
          `Chip total mismatch: ${totalChips} vs expected ${expectedChips}`,
        );
      }

      const results = computeEloChanges(
        rows.map((r) => ({
          playerId: r.playerId,
          chipsEnd: r.chipsEnd as number,
          elo: Number(r.elo),
          currentStreak: Number(r.currentStreak ?? 0),
        })),
        buyIn,
      );

      // Batch update session_players in one query using unnest arrays
      const playerIds = results.map((r) => r.playerId);
      const eloBefores = results.map((r) => r.eloBefore);
      const eloAfters = results.map((r) => r.eloAfter);
      const changes = results.map((r) => r.change);
      const streakAfters = results.map((r) => r.streakAfter);
      const streakBonuses = results.map((r) => r.streakBonus);

      await tx.query(
        `UPDATE session_players sp
         SET elo_before = v.elo_before, elo_after = v.elo_after, streak_bonus = v.streak_bonus
         FROM (
           SELECT unnest($1::text[]) AS player_id,
                  unnest($2::int[]) AS elo_before,
                  unnest($3::int[]) AS elo_after,
                  unnest($4::int[]) AS streak_bonus
         ) v
         WHERE sp.session_id = $5 AND sp.player_id = v.player_id`,
        [playerIds, eloBefores, eloAfters, streakBonuses, sessionId],
      );

      // Lock player rows in id-sorted order first to avoid deadlocks when two
      // concurrent session locks touch overlapping players. Then batch update.
      await tx.query(
        `SELECT id FROM players WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
        [playerIds],
      );
      await tx.query(
        `UPDATE players p
         SET elo = p.elo + v.change,
             games_played = games_played + 1,
             current_streak = v.streak_after
         FROM (
           SELECT unnest($1::text[]) AS id,
                  unnest($2::int[]) AS change,
                  unnest($3::int[]) AS streak_after
         ) v
         WHERE p.id = v.id`,
        [playerIds, changes, streakAfters],
      );

      await tx
        .getRepository(Session)
        .update({ id: sessionId }, { isLocked: true, lockedAt: new Date() });

      return results;
    });
  }
}
