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
   * Mirrors supabase/migrations/002_new_elo_formula.sql (group-average, K=64).
   */
  async calculateAndLock(sessionId: string): Promise<EloResult[]> {
    return this.dataSource.transaction(async (tx) => {
      const session = await tx.getRepository(Session).findOne({
        where: { id: sessionId },
      });
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
          'p.elo AS "elo"',
        ])
        .where("sp.session_id = :sessionId", { sessionId })
        .getRawMany<{ playerId: string; chipsEnd: number | null; elo: number }>();

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
        })),
        buyIn,
      );

      for (const result of results) {
        await tx
          .getRepository(SessionPlayer)
          .update(
            { sessionId, playerId: result.playerId },
            { eloBefore: result.eloBefore, eloAfter: result.eloAfter },
          );

        await tx
          .createQueryBuilder()
          .update(Player)
          .set({
            elo: () => `elo + ${result.change}`,
            gamesPlayed: () => `games_played + 1`,
          })
          .where("id = :id", { id: result.playerId })
          .execute();
      }

      await tx
        .getRepository(Session)
        .update({ id: sessionId }, { isLocked: true, lockedAt: new Date() });

      return results;
    });
  }
}
