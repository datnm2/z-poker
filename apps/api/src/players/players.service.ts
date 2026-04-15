import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Player } from "./player.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { Session } from "../sessions/session.entity";
import type { AuthedUser } from "../auth/current-user.decorator";

export interface PlayerDto {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  gamesPlayed: number;
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

function toDto(p: Player): PlayerDto {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    domain: p.domain,
    elo: p.elo,
    gamesPlayed: p.gamesPlayed,
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
    return toDto(updated);
  }

  async listForDomain(domain: string): Promise<PlayerDto[]> {
    const rows = await this.players.find({
      where: { domain },
      order: { elo: "DESC" },
      take: 200,
    });
    return rows.map(toDto);
  }

  async getByIdForDomain(id: string, domain: string): Promise<PlayerWithRankDto> {
    const { entities, raw } = await this.players
      .createQueryBuilder("p")
      .addSelect(
        `(SELECT COUNT(*)::int + 1 FROM players p2 WHERE p2.domain = p.domain AND p2.elo > p.elo)`,
        "rank",
      )
      .where("p.id = :id AND p.domain = :domain", { id, domain })
      .getRawAndEntities();
    if (!entities.length) throw new NotFoundException("Player not found");
    return { ...toDto(entities[0]), rank: raw[0].rank as number };
  }

  async getHistory(
    playerId: string,
    domain: string,
    limit: number,
  ): Promise<PlayerHistoryEntryDto[]> {
    // Domain tenancy is enforced by the s.domain = :domain join condition below
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
        's.played_date AS "sPlayedDate"',
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
        sPlayedDate: string;
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
        playedDate:
          (r.sPlayedDate as unknown) instanceof Date
            ? (r.sPlayedDate as unknown as Date).toISOString().slice(0, 10)
            : String(r.sPlayedDate),
        buyIn: Number(r.sBuyIn),
        isLocked: r.sIsLocked,
        lockedAt: r.sLockedAt ? (r.sLockedAt instanceof Date ? r.sLockedAt : new Date(r.sLockedAt)).toISOString() : null,
      },
    }));
  }
}
