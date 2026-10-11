import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, type EntityManager } from "typeorm";
import { Player } from "../players/player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import {
  calendarDaysBetween,
  computeEloChanges,
  computeInactivityPenalty,
  INACTIVITY_MIN_SESSION_PLAYERS,
  INACTIVITY_OPEN_SESSION_GRACE_HOURS,
  type EloOutput,
} from "./elo.math";

export type EloResult = EloOutput;

export interface AbsenceResult {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  missedSessions: number;
  inactivityLevel: number;
}

export interface LockResult {
  results: EloResult[];
  absences: AbsenceResult[];
}

interface LockedPlayerRow {
  id: string;
  elo: number;
  missedSessions: number;
  inactivityLevel: number;
  lastPlayedAt: Date | string | null;
}

@Injectable()
export class EloService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Calculates Elo updates for a session, applies them, and locks the session.
   * Mirrors supabase/migrations/002_new_elo_formula.sql (group-average, K=70).
   */
  async calculateAndLock(sessionId: string): Promise<LockResult> {
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
          'p.jackpot AS "jackpot"',
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
          jackpot: number;
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
          jackpot: Number(r.jackpot ?? 0),
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
      const jackpotAfters = results.map((r) => r.jackpotAfter);
      // Payout is recorded as a positive number when jackpotChange < 0
      const jackpotPaids = results.map((r) =>
        r.jackpotChange < 0 ? Math.abs(r.jackpotChange) : 0,
      );

      await tx.query(
        `UPDATE session_players sp
         SET elo_before = v.elo_before, elo_after = v.elo_after, streak_bonus = v.streak_bonus, jackpot_paid = v.jackpot_paid
         FROM (
           SELECT unnest($1::text[]) AS player_id,
                  unnest($2::int[]) AS elo_before,
                  unnest($3::int[]) AS elo_after,
                  unnest($4::int[]) AS streak_bonus,
                  unnest($5::int[]) AS jackpot_paid
         ) v
         WHERE sp.session_id = $6 AND sp.player_id = v.player_id`,
        [
          playerIds,
          eloBefores,
          eloAfters,
          streakBonuses,
          jackpotPaids,
          sessionId,
        ],
      );

      const lockedAt = new Date();

      // Lock player rows in id-sorted order first to avoid deadlocks when two
      // concurrent session locks touch overlapping players. Then batch update.
      const domainPlayers: LockedPlayerRow[] = await tx.query(
        `SELECT id,
                elo,
                missed_sessions AS "missedSessions",
                inactivity_level AS "inactivityLevel",
                last_played_at AS "lastPlayedAt"
         FROM players
         WHERE domain = $1 OR id = ANY($2::text[])
         ORDER BY id
         FOR UPDATE`,
        [session.domain, playerIds],
      );
      await tx.query(
        `UPDATE players p
         SET elo = p.elo + v.change,
             games_played = games_played + 1,
             current_streak = v.streak_after,
             jackpot = v.jackpot_after,
             last_played_at = $5::timestamptz,
             missed_sessions = 0,
             inactivity_level = 0
         FROM (
           SELECT unnest($1::text[]) AS id,
                  unnest($2::int[]) AS change,
                  unnest($3::int[]) AS streak_after,
                  unnest($4::int[]) AS jackpot_after
         ) v
         WHERE p.id = v.id`,
        [playerIds, changes, streakAfters, jackpotAfters, lockedAt],
      );

      const absences = await this.applyInactivityDecay(tx, {
        sessionId,
        domain: session.domain,
        lockedAt,
        numPlayers,
        participantIds: new Set(playerIds),
        domainPlayers,
      });

      await tx
        .getRepository(Session)
        .update({ id: sessionId }, { isLocked: true, lockedAt });

      return { results, absences };
    });
  }

  private async applyInactivityDecay(
    tx: EntityManager,
    ctx: {
      sessionId: string;
      domain: string;
      lockedAt: Date;
      numPlayers: number;
      participantIds: Set<string>;
      domainPlayers: LockedPlayerRow[];
    },
  ): Promise<AbsenceResult[]> {
    if (ctx.numPlayers < INACTIVITY_MIN_SESSION_PLAYERS) return [];

    const seatedRows: { playerId: string }[] = await tx.query(
      `SELECT sp.player_id AS "playerId"
       FROM session_players sp
       WHERE sp.session_id IN (
         SELECT s.id
         FROM sessions s
         JOIN session_players x ON x.session_id = s.id
         WHERE s.domain = $1::text
           AND s.is_locked = false
           AND s.id <> $2::uuid
           AND s.created_at >= $3::timestamptz - interval '${INACTIVITY_OPEN_SESSION_GRACE_HOURS} hours'
         GROUP BY s.id
         HAVING COUNT(*) >= $4::int
       )`,
      [
        ctx.domain,
        ctx.sessionId,
        ctx.lockedAt,
        INACTIVITY_MIN_SESSION_PLAYERS,
      ],
    );
    const seatedElsewhere = new Set(seatedRows.map((r) => r.playerId));

    const absences: AbsenceResult[] = [];
    for (const p of ctx.domainPlayers) {
      if (ctx.participantIds.has(p.id)) continue;
      if (seatedElsewhere.has(p.id)) continue;
      if (p.lastPlayedAt == null) continue;

      const eloBefore = Number(p.elo);
      const missedSessions = Number(p.missedSessions ?? 0) + 1;
      const daysAbsent = calendarDaysBetween(
        new Date(p.lastPlayedAt),
        ctx.lockedAt,
      );
      const out = computeInactivityPenalty({
        elo: eloBefore,
        missedSessions,
        daysAbsent,
        beatsCharged: Number(p.inactivityLevel ?? 0),
      });
      absences.push({
        playerId: p.id,
        eloBefore,
        eloAfter: out.eloAfter,
        change: out.eloAfter - eloBefore,
        missedSessions,
        inactivityLevel: out.beat,
      });
    }
    if (absences.length === 0) return absences;

    await tx.query(
      `UPDATE players p
       SET elo = v.elo_after,
           missed_sessions = v.missed_sessions,
           inactivity_level = v.inactivity_level
       FROM (
         SELECT unnest($1::text[]) AS id,
                unnest($2::int[]) AS elo_after,
                unnest($3::int[]) AS missed_sessions,
                unnest($4::int[]) AS inactivity_level
       ) v
       WHERE p.id = v.id`,
      [
        absences.map((a) => a.playerId),
        absences.map((a) => a.eloAfter),
        absences.map((a) => a.missedSessions),
        absences.map((a) => a.inactivityLevel),
      ],
    );

    const charged = absences.filter((a) => a.change < 0);
    if (charged.length > 0) {
      await tx.query(
        `INSERT INTO elo_adjustments
           (domain, player_id, type, amount, elo_before, elo_after,
            session_id, level, missed_sessions, created_at)
         SELECT $1::text, v.player_id, 'inactivity', v.amount, v.elo_before,
                v.elo_after, $2::uuid, v.level, v.missed_sessions, $3::timestamptz
         FROM (
           SELECT unnest($4::text[]) AS player_id,
                  unnest($5::int[]) AS amount,
                  unnest($6::int[]) AS elo_before,
                  unnest($7::int[]) AS elo_after,
                  unnest($8::int[]) AS level,
                  unnest($9::int[]) AS missed_sessions
         ) v`,
        [
          ctx.domain,
          ctx.sessionId,
          ctx.lockedAt,
          charged.map((a) => a.playerId),
          charged.map((a) => a.change),
          charged.map((a) => a.eloBefore),
          charged.map((a) => a.eloAfter),
          charged.map((a) => a.inactivityLevel),
          charged.map((a) => a.missedSessions),
        ],
      );
    }

    return absences;
  }
}
